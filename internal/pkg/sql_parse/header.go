package sql_parse

import (
	"fmt"
	"strings"
)

// DetectResultHeaders 检测 SQL 执行结果应包含的表头（字段名）
func DetectResultHeaders(sql string) []string {
	sql = trimSQLTerminator(sql)
	sqlUpper := strings.ToUpper(sql)
	statementKeyword := detectResultStatementKeyword(sql)
	// 系统性语句
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW TABLES") {
		return []string{"Tables_in_xxx"} // 可根据当前库名动态生成
	}
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW DATABASES") {
		return []string{"Database"}
	}
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW INDEX") {
		return []string{"Table", "Non_unique", "Key_name", "Seq_in_index", "Column_name", "Collation", "Cardinality", "Sub_part", "Packed", "Null", "Index_type", "Comment", "Index_comment", "Visible", "Expression"}
	}
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW PROCESSLIST") {
		return []string{"Id", "User", "Host", "db", "Command", "Time", "State", "Info"}
	}
	if statementKeyword == "SHOW" && (strings.HasPrefix(sqlUpper, "SHOW VARIABLES") || strings.HasPrefix(sqlUpper, "SHOW STATUS")) {
		return []string{"Variable_name", "Value"}
	}
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW ENGINES") {
		return []string{"Engine", "Support", "Comment", "Transactions", "XA", "Savepoints"}
	}
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW CREATE TABLE") {
		return []string{"Table", "Create Table"}
	}
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW GRANTS") {
		return []string{"Grants for user"}
	}
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW WARNINGS") {
		return []string{"Level", "Code", "Message"}
	}
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW ERRORS") {
		return []string{"Level", "Code", "Message"}
	}
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW EVENTS") {
		return []string{"Db", "Name", "Definer", "Time zone", "Type", "Execute at", "Interval value", "Interval field", "Starts", "Ends", "Status", "Originator", "character_set_client", "collation_connection", "Database Collation"}
	}
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW TRIGGERS") {
		return []string{"Trigger", "Event", "Table", "Statement", "Timing", "Created", "sql_mode", "Definer", "character_set_client", "collation_connection", "Database Collation"}
	}
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW PROCEDURE STATUS") {
		return []string{"Db", "Name", "Type", "Definer", "Modified", "Created", "Security_type", "Comment", "character_set_client", "collation_connection", "Database Collation"}
	}
	if statementKeyword == "SHOW" && strings.HasPrefix(sqlUpper, "SHOW FUNCTION STATUS") {
		return []string{"Db", "Name", "Type", "Definer", "Modified", "Created", "Security_type", "Comment", "character_set_client", "collation_connection", "Database Collation"}
	}
	if statementKeyword == "SHOW" && (strings.HasPrefix(sqlUpper, "SHOW COLUMNS") || strings.HasPrefix(sqlUpper, "SHOW FIELDS")) {
		return []string{"Field", "Type", "Null", "Key", "Default", "Extra"}
	}
	if statementKeyword == "EXPLAIN" && strings.HasPrefix(sqlUpper, "EXPLAIN") {
		return []string{"id", "select_type", "table", "partitions", "type", "possible_keys", "key", "key_len", "ref", "rows", "filtered", "Extra"}
	}
	if statementKeyword == "DESC" || statementKeyword == "DESCRIBE" {
		return []string{"Field", "Type", "Null", "Key", "Default", "Extra"}
	}
	if statementKeyword == "SELECT" {
		// 只有真正返回结果集的查询语句才推导字段，避免误把 DML 的子查询当结果表结构。
		if headers, ok := extractSelectExpressions(sql); ok {
			return headers
		}
	}
	// 其他类型默认返回 result，兼容写操作和无法推断字段的场景。
	return []string{"result"}
}

// EnsureUniqueHeaders 规范化并去重字段名，避免结果表建表时出现重复列。
func EnsureUniqueHeaders(headers []string) []string {
	result := make([]string, 0, len(headers))
	used := make(map[string]struct{}, len(headers))
	counts := make(map[string]int, len(headers))

	for i, header := range headers {
		base := strings.TrimSpace(header)
		// 空字段名退回为顺序占位列，避免生成非法结构。
		if base == "" {
			base = fmt.Sprintf("field_%d", i+1)
		}

		counts[base]++
		name := base
		// 重名时追加顺序后缀，保证每个结果列唯一。
		if _, exists := used[name]; exists {
			for suffix := counts[base]; ; suffix++ {
				candidate := fmt.Sprintf("%s_%d", base, suffix)
				if _, duplicated := used[candidate]; duplicated {
					continue
				}
				name = candidate
				break
			}
		}

		used[name] = struct{}{}
		result = append(result, name)
	}

	return result
}

// detectResultStatementKeyword 识别最外层主语句类型，避免把 DML 子查询当查询结果处理。
func detectResultStatementKeyword(sql string) string {
	keyword := strings.ToUpper(firstKeyword(sql))
	if keyword != "WITH" {
		return keyword
	}

	withIndex := findTopLevelKeyword(sql, "WITH", 0)
	if withIndex < 0 {
		return keyword
	}

	if nextKeyword := findFirstTopLevelKeyword(sql, withIndex+len("WITH"), "SELECT", "INSERT", "UPDATE", "DELETE", "REPLACE"); nextKeyword != "" {
		return nextKeyword
	}

	return keyword
}

// findFirstTopLevelKeyword 返回起始位置之后最先出现的最外层关键字。
func findFirstTopLevelKeyword(sql string, start int, keywords ...string) string {
	matchedKeyword := ""
	matchedIndex := -1

	for _, keyword := range keywords {
		index := findTopLevelKeyword(sql, keyword, start)
		// 只保留最早命中的关键字，保证 WITH 场景取到真实主语句。
		if index >= 0 && (matchedIndex == -1 || index < matchedIndex) {
			matchedIndex = index
			matchedKeyword = strings.ToUpper(keyword)
		}
	}

	return matchedKeyword
}

// extractSelectExpressions 提取最外层 SELECT 的字段列表。
func extractSelectExpressions(sql string) ([]string, bool) {
	selectList, ok := findOuterSelectList(sql)
	if !ok {
		return nil, false
	}

	items := splitTopLevelComma(selectList)
	if len(items) == 0 {
		return nil, false
	}

	headers := make([]string, 0, len(items))
	for _, item := range items {
		header := normalizeSelectHeader(item)
		if header == "" {
			return nil, false
		}
		headers = append(headers, header)
	}

	return headers, true
}

// findOuterSelectList 找出最外层 SELECT 与 FROM 之间的字段片段。
func findOuterSelectList(sql string) (string, bool) {
	selectIndex := findTopLevelKeyword(sql, "SELECT", 0)
	if selectIndex < 0 {
		return "", false
	}

	start := skipLeadingSpaces(sql, selectIndex+len("SELECT"))
	fromIndex := findTopLevelKeyword(sql, "FROM", start)
	if fromIndex < 0 {
		return strings.TrimSpace(sql[start:]), strings.TrimSpace(sql[start:]) != ""
	}

	selectList := strings.TrimSpace(sql[start:fromIndex])
	return selectList, selectList != ""
}

// splitTopLevelComma 按最外层逗号拆分字段列表。
func splitTopLevelComma(sql string) []string {
	items := make([]string, 0)
	start := 0
	depth := 0
	inSingleQuote := false
	inDoubleQuote := false
	inBacktick := false

	for i := 0; i < len(sql); i++ {
		char := sql[i]

		if !inDoubleQuote && !inBacktick && char == '\'' && !isEscaped(sql, i) {
			inSingleQuote = !inSingleQuote
			continue
		}
		if !inSingleQuote && !inBacktick && char == '"' && !isEscaped(sql, i) {
			inDoubleQuote = !inDoubleQuote
			continue
		}
		if !inSingleQuote && !inDoubleQuote && char == '`' {
			inBacktick = !inBacktick
			continue
		}
		if inSingleQuote || inDoubleQuote || inBacktick {
			continue
		}

		switch char {
		case '(':
			depth++
		case ')':
			if depth > 0 {
				depth--
			}
		case ',':
			if depth == 0 {
				items = append(items, strings.TrimSpace(sql[start:i]))
				start = i + 1
			}
		}
	}

	items = append(items, strings.TrimSpace(sql[start:]))
	result := make([]string, 0, len(items))
	for _, item := range items {
		if item != "" {
			result = append(result, item)
		}
	}

	return result
}

// normalizeSelectHeader 将字段表达式转换成展示表头。
func normalizeSelectHeader(expr string) string {
	expr = strings.TrimSpace(expr)
	if expr == "" {
		return ""
	}

	if alias := extractAlias(expr); alias != "" {
		return alias
	}

	if expr == "*" {
		return expr
	}

	if isQuotedLiteral(expr) {
		return unquoteSQLString(expr)
	}

	if isQuotedIdentifier(expr) {
		return strings.Trim(expr, "`")
	}

	// 简单列引用统一退化为真实列名，避免 schema 与数据库返回列名不一致。
	if columnName := extractSimpleColumnName(expr); columnName != "" {
		return columnName
	}

	return normalizeExpression(expr)
}

// extractAlias 提取显式别名。
func extractAlias(expr string) string {
	asIndex := findTopLevelKeyword(expr, "AS", 0)
	if asIndex < 0 {
		return ""
	}

	alias := strings.TrimSpace(expr[asIndex+len("AS"):])
	if alias == "" {
		return ""
	}
	return alias
}

// extractSimpleColumnName 提取简单列引用的真实列名，忽略表名前缀。
func extractSimpleColumnName(expr string) string {
	if expr == "" || !strings.Contains(expr, ".") {
		return ""
	}

	// 只有纯标识符链才允许裁剪，表达式和字面量仍走原有逻辑。
	if strings.ContainsAny(expr, " +-*/%<>=!(),\"'") {
		return ""
	}

	parts := strings.Split(expr, ".")
	if len(parts) < 2 {
		return ""
	}

	for _, part := range parts {
		part = strings.TrimSpace(strings.Trim(part, "`"))
		// 任一段为空都说明不是合法列引用，直接放弃裁剪。
		if part == "" {
			return ""
		}
	}

	return strings.TrimSpace(strings.Trim(parts[len(parts)-1], "`"))
}

// NormalizeResultHeaderName 归一化结果字段名，优先返回数据库实际列名风格。
func NormalizeResultHeaderName(name string) string {
	if columnName := extractSimpleColumnName(strings.TrimSpace(name)); columnName != "" {
		return columnName
	}
	return strings.TrimSpace(name)
}

// normalizeExpression 规范化表达式展示文本。
func normalizeExpression(expr string) string {
	expr = normalizeOperatorSpacing(expr)
	expr = normalizeFunctionName(expr)
	return expr
}

// normalizeFunctionName 统一函数名大小写，避免展示风格不一致。
func normalizeFunctionName(expr string) string {
	openParen := strings.IndexByte(expr, '(')
	if openParen <= 0 || !strings.HasSuffix(expr, ")") {
		return expr
	}

	name := strings.TrimSpace(expr[:openParen])
	if name == "" || strings.ContainsAny(name, " .+-*/%<>=!") {
		return expr
	}

	return strings.ToLower(name) + expr[openParen:]
}

// normalizeOperatorSpacing 为常见运算符补齐空格，提升可读性。
func normalizeOperatorSpacing(expr string) string {
	var builder strings.Builder
	inSingleQuote := false
	inDoubleQuote := false
	inBacktick := false

	for i := 0; i < len(expr); i++ {
		char := expr[i]

		if !inDoubleQuote && !inBacktick && char == '\'' && !isEscaped(expr, i) {
			inSingleQuote = !inSingleQuote
			builder.WriteByte(char)
			continue
		}
		if !inSingleQuote && !inBacktick && char == '"' && !isEscaped(expr, i) {
			inDoubleQuote = !inDoubleQuote
			builder.WriteByte(char)
			continue
		}
		if !inSingleQuote && !inDoubleQuote && char == '`' {
			inBacktick = !inBacktick
			builder.WriteByte(char)
			continue
		}
		if inSingleQuote || inDoubleQuote || inBacktick {
			builder.WriteByte(char)
			continue
		}

		if strings.ContainsRune("+-*/%", rune(char)) {
			writeSpacedOperator(&builder, char)
			continue
		}
		builder.WriteByte(char)
	}

	return strings.Join(strings.Fields(builder.String()), " ")
}

// writeSpacedOperator 按需写入两侧空格，避免连续运算符被粘连。
func writeSpacedOperator(builder *strings.Builder, operator byte) {
	current := builder.String()
	if len(current) > 0 && current[len(current)-1] != ' ' {
		builder.WriteByte(' ')
	}
	builder.WriteByte(operator)
	builder.WriteByte(' ')
}

// findTopLevelKeyword 在最外层结构中查找关键字位置。
func findTopLevelKeyword(sql string, keyword string, start int) int {
	depth := 0
	inSingleQuote := false
	inDoubleQuote := false
	inBacktick := false
	inLineComment := false
	inBlockCommentDepth := 0
	upperKeyword := strings.ToUpper(keyword)

	for i := start; i < len(sql); i++ {
		char := sql[i]

		if inLineComment {
			if char == '\n' || char == '\r' {
				inLineComment = false
			}
			continue
		}
		if inBlockCommentDepth > 0 {
			if char == '/' && i+1 < len(sql) && sql[i+1] == '*' {
				inBlockCommentDepth++
				i++
				continue
			}
			if char == '*' && i+1 < len(sql) && sql[i+1] == '/' {
				inBlockCommentDepth--
				i++
			}
			continue
		}

		if !inSingleQuote && !inDoubleQuote && !inBacktick {
			if char == '-' && i+1 < len(sql) && sql[i+1] == '-' {
				inLineComment = true
				i++
				continue
			}
			if char == '/' && i+1 < len(sql) && sql[i+1] == '*' {
				inBlockCommentDepth = 1
				i++
				continue
			}
		}

		if !inDoubleQuote && !inBacktick && char == '\'' && !isEscaped(sql, i) {
			inSingleQuote = !inSingleQuote
			continue
		}
		if !inSingleQuote && !inBacktick && char == '"' && !isEscaped(sql, i) {
			inDoubleQuote = !inDoubleQuote
			continue
		}
		if !inSingleQuote && !inDoubleQuote && char == '`' {
			inBacktick = !inBacktick
			continue
		}
		if inSingleQuote || inDoubleQuote || inBacktick {
			continue
		}

		switch char {
		case '(':
			depth++
			continue
		case ')':
			if depth > 0 {
				depth--
			}
			continue
		}
		if depth != 0 {
			continue
		}

		if matchesKeywordAt(sql, upperKeyword, i) {
			return i
		}
	}

	return -1
}

// hasTopLevelKeyword 判断最外层是否包含指定关键字。
func hasTopLevelKeyword(sql string, keyword string) bool {
	return findTopLevelKeyword(sql, keyword, 0) >= 0
}

// matchesKeywordAt 判断指定位置是否完整匹配关键字。
func matchesKeywordAt(sql string, keyword string, index int) bool {
	if index < 0 || index+len(keyword) > len(sql) {
		return false
	}
	if !strings.EqualFold(sql[index:index+len(keyword)], keyword) {
		return false
	}
	if index > 0 && isIdentifierChar(sql[index-1]) {
		return false
	}
	if index+len(keyword) < len(sql) && isIdentifierChar(sql[index+len(keyword)]) {
		return false
	}
	return true
}

// skipLeadingSpaces 跳过起始空白字符。
func skipLeadingSpaces(sql string, start int) int {
	for start < len(sql) && isSQLSpace(sql[start]) {
		start++
	}
	return start
}

// isSQLSpace 判断字符是否为空白。
func isSQLSpace(char byte) bool {
	return char == ' ' || char == '\t' || char == '\n' || char == '\r'
}

// isIdentifierChar 判断字符是否可作为标识符的一部分。
func isIdentifierChar(char byte) bool {
	return char == '_' || char == '$' ||
		(char >= 'a' && char <= 'z') ||
		(char >= 'A' && char <= 'Z') ||
		(char >= '0' && char <= '9')
}

// isEscaped 判断当前位置字符是否被反斜杠转义。
func isEscaped(sql string, index int) bool {
	backslashCount := 0
	for i := index - 1; i >= 0 && sql[i] == '\\'; i-- {
		backslashCount++
	}
	return backslashCount%2 == 1
}

// isQuotedLiteral 判断表达式是否为字符串字面量。
func isQuotedLiteral(expr string) bool {
	return len(expr) >= 2 &&
		((expr[0] == '\'' && expr[len(expr)-1] == '\'') ||
			(expr[0] == '"' && expr[len(expr)-1] == '"'))
}

// isQuotedIdentifier 判断表达式是否为反引号包裹的标识符。
func isQuotedIdentifier(expr string) bool {
	return len(expr) >= 2 && expr[0] == '`' && expr[len(expr)-1] == '`'
}

// unquoteSQLString 去掉 SQL 字符串外层引号。
func unquoteSQLString(expr string) string {
	if len(expr) < 2 {
		return expr
	}
	return expr[1 : len(expr)-1]
}
