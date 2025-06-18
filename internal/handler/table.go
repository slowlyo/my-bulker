package handler

import (
	"mysql-batch-tools/internal/pkg/database"
	"mysql-batch-tools/internal/pkg/response"
	"mysql-batch-tools/internal/service"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// TableHandler 表处理器
type TableHandler struct {
	service *service.TableService
}

// NewTableHandler 创建表处理器
func NewTableHandler() *TableHandler {
	return &TableHandler{
		service: service.NewTableService(database.GetDB()),
	}
}

// Get 获取表详情
func (h *TableHandler) Get(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的表ID")
	}

	table, err := h.service.Get(c.Context(), uint(id))
	if err != nil {
		return response.Internal(c, "获取表详情失败")
	}

	return response.Success(c, table)
}
