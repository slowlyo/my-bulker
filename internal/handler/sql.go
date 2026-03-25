package handler

import (
	"my-bulker/internal/pkg/response"
	"my-bulker/internal/pkg/sql_parse"

	"github.com/gofiber/fiber/v2"
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
	for _, stmt := range stmts {
		if err := sql_parse.ValidateStatement(stmt); err != nil {
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
