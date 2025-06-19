package sql_parse

import (
	"strings"

	"vitess.io/vitess/go/vt/sqlparser"
)

// DetectResultHeaders 检测 SQL 执行结果应包含的表头（字段名）
func DetectResultHeaders(sql string) []string {
	sql = strings.TrimSpace(sql)
	sqlUpper := strings.ToUpper(sql)
	parser, err := sqlparser.New(sqlparser.Options{})
	if err == nil {
		stmt, err := parser.Parse(sql)
		if err == nil {
			if sel, ok := stmt.(*sqlparser.Select); ok {
				headers := make([]string, 0, len(sel.SelectExprs.Exprs))
				for _, expr := range sel.SelectExprs.Exprs {
					switch e := expr.(type) {
					case *sqlparser.AliasedExpr:
						if !e.As.IsEmpty() {
							headers = append(headers, e.As.String())
						} else {
							headers = append(headers, sqlparser.String(e.Expr))
						}
					case *sqlparser.StarExpr:
						headers = append(headers, "*")
					}
				}
				return headers
			}
		}
	}
	// 系统性语句
	if strings.HasPrefix(sqlUpper, "SHOW TABLES") {
		return []string{"Tables_in_xxx"} // 可根据当前库名动态生成
	}
	if strings.HasPrefix(sqlUpper, "SHOW DATABASES") {
		return []string{"Database"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW INDEX") {
		return []string{"Table", "Non_unique", "Key_name", "Seq_in_index", "Column_name", "Collation", "Cardinality", "Sub_part", "Packed", "Null", "Index_type", "Comment", "Index_comment", "Visible", "Expression"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW PROCESSLIST") {
		return []string{"Id", "User", "Host", "db", "Command", "Time", "State", "Info"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW VARIABLES") || strings.HasPrefix(sqlUpper, "SHOW STATUS") {
		return []string{"Variable_name", "Value"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW ENGINES") {
		return []string{"Engine", "Support", "Comment", "Transactions", "XA", "Savepoints"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW CREATE TABLE") {
		return []string{"Table", "Create Table"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW GRANTS") {
		return []string{"Grants for user"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW WARNINGS") {
		return []string{"Level", "Code", "Message"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW ERRORS") {
		return []string{"Level", "Code", "Message"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW EVENTS") {
		return []string{"Db", "Name", "Definer", "Time zone", "Type", "Execute at", "Interval value", "Interval field", "Starts", "Ends", "Status", "Originator", "character_set_client", "collation_connection", "Database Collation"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW TRIGGERS") {
		return []string{"Trigger", "Event", "Table", "Statement", "Timing", "Created", "sql_mode", "Definer", "character_set_client", "collation_connection", "Database Collation"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW PROCEDURE STATUS") {
		return []string{"Db", "Name", "Type", "Definer", "Modified", "Created", "Security_type", "Comment", "character_set_client", "collation_connection", "Database Collation"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW FUNCTION STATUS") {
		return []string{"Db", "Name", "Type", "Definer", "Modified", "Created", "Security_type", "Comment", "character_set_client", "collation_connection", "Database Collation"}
	}
	if strings.HasPrefix(sqlUpper, "SHOW COLUMNS") || strings.HasPrefix(sqlUpper, "SHOW FIELDS") {
		return []string{"Field", "Type", "Null", "Key", "Default", "Extra"}
	}
	if strings.HasPrefix(sqlUpper, "EXPLAIN") {
		return []string{"id", "select_type", "table", "partitions", "type", "possible_keys", "key", "key_len", "ref", "rows", "filtered", "Extra"}
	}
	if strings.HasPrefix(sqlUpper, "DESC") || strings.HasPrefix(sqlUpper, "DESCRIBE") {
		return []string{"Field", "Type", "Null", "Key", "Default", "Extra"}
	}
	// 其他类型默认返回 result
	return []string{"result"}
}
