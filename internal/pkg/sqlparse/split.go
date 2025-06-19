package sql_parse

import (
	"fmt"
	"regexp"
	"strings"
)

// SplitSQLStatements 拆分SQL语句，移除注释并按分号拆分（忽略字符串内分号）
func SplitSQLStatements(sqlContent string) ([]string, error) {
	// 移除注释
	sqlContent = removeComments(sqlContent)

	// 按分号拆分，但忽略字符串中的分号
	statements := splitSQLBySemicolon(sqlContent)

	// 过滤空语句
	var result []string
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt != "" {
			result = append(result, stmt)
		}
	}

	if len(result) == 0 {
		return nil, fmt.Errorf("未找到有效的SQL语句")
	}

	return result, nil
}

// removeComments 移除SQL注释
func removeComments(sql string) string {
	// 移除单行注释
	singleLineComment := regexp.MustCompile(`--.*$`)
	sql = singleLineComment.ReplaceAllString(sql, "")

	// 移除多行注释
	multiLineComment := regexp.MustCompile(`/\*.*?\*/`)
	sql = multiLineComment.ReplaceAllString(sql, "")

	return sql
}

// splitSQLBySemicolon 按分号拆分SQL，但忽略字符串中的分号
func splitSQLBySemicolon(sql string) []string {
	var statements []string
	var current strings.Builder
	var inString bool
	var stringChar byte

	for i := 0; i < len(sql); i++ {
		char := sql[i]

		if !inString && (char == '\'' || char == '"') {
			inString = true
			stringChar = char
			current.WriteByte(char)
		} else if inString && char == stringChar {
			// 检查是否为转义字符
			if i > 0 && sql[i-1] == '\\' {
				current.WriteByte(char)
			} else {
				inString = false
				current.WriteByte(char)
			}
		} else if !inString && char == ';' {
			statements = append(statements, current.String())
			current.Reset()
		} else {
			current.WriteByte(char)
		}
	}

	// 添加最后一个语句
	if current.Len() > 0 {
		statements = append(statements, current.String())
	}

	return statements
}
