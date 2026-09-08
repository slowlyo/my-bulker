package handler

import (
	"my-bulker/internal/pkg/response"
	"my-bulker/internal/service"

	"github.com/gofiber/fiber/v2"
)

// UpdateHandler 对外提供应用版本检测能力。
type UpdateHandler struct {
	service *service.UpdateService
}

// NewUpdateHandler 创建共享缓存的版本检测处理器。
func NewUpdateHandler() *UpdateHandler {
	return &UpdateHandler{
		service: service.NewUpdateService(),
	}
}

// Check 查询适用于当前构建的最新版本与下载资产。
func (h *UpdateHandler) Check(c *fiber.Ctx) error {
	info, err := h.service.Check(c.UserContext())
	// GitHub 不可用时沿用统一响应结构，并保留友好的具体原因。
	if err != nil {
		return response.Error(c, fiber.StatusServiceUnavailable, err.Error())
	}
	return response.Success(c, info)
}
