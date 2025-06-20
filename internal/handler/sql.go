package handler

import (
	"mysql-batch-tools/internal/pkg/response"
	"mysql-batch-tools/internal/pkg/sql_parse"
	"strings"

	"github.com/gofiber/fiber/v2"
	"vitess.io/vitess/go/vt/sqlparser"
)

// SQLHandler SQL相关接口
type SQLHandler struct{}

func NewSQLHandler() *SQLHandler {
	return &SQLHandler{}
}

// Validate 校验SQL合法性（支持多条）
func (h *SQLHandler) Validate(c *fiber.Ctx) error {
	var req struct {
		SQL string `json:"sql"`
	}
	if err := c.BodyParser(&req); err != nil || req.SQL == "" {
		return response.Invalid(c, "参数错误")
	}
	stmts, err := sql_parse.SplitSQLStatements(req.SQL)
	if err != nil {
		return response.Success(c, fiber.Map{
			"valid": false,
			"error": err.Error(),
		})
	}
	parser, _ := sqlparser.New(sqlparser.Options{})
	for _, stmt := range stmts {
		if strings.TrimSpace(stmt) == "" {
			continue
		}
		_, err := parser.Parse(stmt)
		if err != nil {
			return response.Success(c, fiber.Map{
				"valid": false,
				"error": err.Error(),
			})
		}
	}
	return response.Success(c, fiber.Map{
		"valid": true,
	})
}
