package handler

import (
	"mysql-tenant-tools/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
)

// Health 健康检查处理器
type Health struct{}

// NewHealth 创建健康检查处理器实例
func NewHealth() *Health {
	return &Health{}
}

// Check 健康检查
func (h *Health) Check(c *fiber.Ctx) error {
	return response.Ok(c, "服务正常运行中 (v1.0.0)")
}
