package sql_parse

import (
	"fmt"
	"strings"
)

var sqlKeywordsNeedClause = map[string]string{
	"INSERT": "INTO",
	"UPDATE": "SET",
	"DELETE": "FROM",
}

// ValidateStatement 校验单条 SQL 的基础结构是否合法。
func ValidateStatement(sql string) error {
	sql = trimSQLTerminator(sql)
	if sql == "" {
		return fmt.Errorf("SQL 不能为空")
	}

	// 先确保括号、字符串、注释结构完整，避免明显的半截 SQL 通过。
	if err := validateSQLStructure(sql); err != nil {
		return err
	}

	keyword := strings.ToUpper(firstKeyword(sql))
	switch keyword {
	case "", "SHOW", "DESC", "DESCRIBE", "EXPLAIN", "CREATE", "ALTER", "DROP", "TRUNCATE", "RENAME", "USE", "CALL", "BEGIN", "START", "COMMIT", "ROLLBACK", "SET":
		return nil
	case "SELECT":
		if _, ok := extractSelectExpressions(sql); !ok {
			return fmt.Errorf("SELECT 语句格式不正确")
		}
		return nil
	case "WITH":
		if hasTopLevelKeyword(sql, "SELECT") {
			if _, ok := extractSelectExpressions(sql); !ok {
				return fmt.Errorf("WITH 查询格式不正确")
			}
		}
		return nil
	default:
		requiredKeyword, ok := sqlKeywordsNeedClause[keyword]
		if !ok {
			return nil
		}
		// 对常见 DML 做最小必要校验，避免误报过多。
		if !hasTopLevelKeyword(sql, requiredKeyword) {
			return fmt.Errorf("%s 语句缺少 %s", keyword, requiredKeyword)
		}
		return nil
	}
}

// validateSQLStructure 校验 SQL 的引号、注释和括号是否闭合。
func validateSQLStructure(sql string) error {
	depth := 0
	inSingleQuote := false
	inDoubleQuote := false
	inBacktick := false
	inLineComment := false
	inBlockCommentDepth := 0

	for i := 0; i < len(sql); i++ {
		char := sql[i]

		// 单行注释遇到换行后结束。
		if inLineComment {
			if char == '\n' || char == '\r' {
				inLineComment = false
			}
			continue
		}

		// 多行注释支持嵌套，和现有拆分逻辑保持一致。
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
			// 仅在字符串外识别注释开始。
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

		// 只有未转义的引号才切换状态。
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

		// 只统计字符串外层级，避免子表达式误判。
		switch char {
		case '(':
			depth++
		case ')':
			depth--
			if depth < 0 {
				return fmt.Errorf("SQL 括号不匹配")
			}
		}
	}

	if inSingleQuote || inDoubleQuote || inBacktick {
		return fmt.Errorf("SQL 存在未闭合的引号")
	}
	if inLineComment || inBlockCommentDepth > 0 {
		return fmt.Errorf("SQL 注释未闭合")
	}
	if depth != 0 {
		return fmt.Errorf("SQL 括号不匹配")
	}

	return nil
}

// firstKeyword 提取 SQL 的首个关键字。
func firstKeyword(sql string) string {
	start := skipLeadingSpaces(sql, 0)
	end := start
	for end < len(sql) && isIdentifierChar(sql[end]) {
		end++
	}
	return sql[start:end]
}

// trimSQLTerminator 清理结尾分号和空白字符。
func trimSQLTerminator(sql string) string {
	sql = strings.TrimSpace(sql)
	for strings.HasSuffix(sql, ";") {
		sql = strings.TrimSpace(strings.TrimSuffix(sql, ";"))
	}
	return sql
}
