package sql_parse

import (
	"fmt"
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

// removeComments 移除SQL注释（仅在字符串外移除 -- 和 /* */，字符串内内容保留）
func removeComments(sql string) string {
	var out strings.Builder
	inSingle, inDouble := false, false
	inLineComment, inBlockComment := false, false
	length := len(sql)
	for i := 0; i < length; i++ {
		c := sql[i]
		// 进入单行注释
		if !inSingle && !inDouble && !inBlockComment && c == '-' && i+1 < length && sql[i+1] == '-' {
			inLineComment = true
			i++ // 跳过下一个'-'
			continue
		}
		// 进入多行注释
		if !inSingle && !inDouble && !inLineComment && c == '/' && i+1 < length && sql[i+1] == '*' {
			inBlockComment = true
			i++ // 跳过下一个'*'
			continue
		}
		// 退出单行注释
		if inLineComment && (c == '\n' || c == '\r') {
			inLineComment = false
			out.WriteByte(c)
			continue
		}
		// 退出多行注释
		if inBlockComment && c == '*' && i+1 < length && sql[i+1] == '/' {
			inBlockComment = false
			i++ // 跳过下一个'/'
			continue
		}
		if inLineComment || inBlockComment {
			continue // 注释内容直接跳过
		}
		// 字符串状态切换
		if !inDouble && c == '\'' {
			if inSingle && i > 0 && sql[i-1] != '\\' {
				inSingle = false
			} else if !inSingle {
				inSingle = true
			}
		} else if !inSingle && c == '"' {
			if inDouble && i > 0 && sql[i-1] != '\\' {
				inDouble = false
			} else if !inDouble {
				inDouble = true
			}
		}
		out.WriteByte(c)
	}
	return out.String()
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
