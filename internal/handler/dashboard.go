package handler

import (
	"my-bulker/internal/pkg/database"
	"my-bulker/internal/pkg/response"
	"my-bulker/internal/service"

	"github.com/gofiber/fiber/v2"
)

// DashboardHandler 仪表盘处理器
type DashboardHandler struct {
	service *service.DashboardService
}

// NewDashboardHandler 创建仪表盘处理器
func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{
		service: service.NewDashboardService(database.GetDB()),
	}
}

// GetStats 获取仪表盘统计信息
func (h *DashboardHandler) GetStats(c *fiber.Ctx) error {
	stats, err := h.service.GetStats(c.Context())
	if err != nil {
		return response.Internal(c, "获取统计数据失败: "+err.Error())
	}
	return response.Success(c, stats)
}
