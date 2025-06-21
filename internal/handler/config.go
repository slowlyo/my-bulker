package handler

import (
	"my-bulker/internal/model"
	"my-bulker/internal/pkg/response"
	"my-bulker/internal/service"

	"github.com/gofiber/fiber/v2"
)

type ConfigHandler struct {
	service *service.ConfigService
}

func NewConfigHandler() *ConfigHandler {
	return &ConfigHandler{
		service: service.NewConfigService(),
	}
}

// GetConfig 获取配置
func (h *ConfigHandler) GetConfig(c *fiber.Ctx) error {
	key := c.Query("key")
	if key == "" {
		return response.Invalid(c, "缺少 key 参数")
	}
	val, err := h.service.GetConfig(key)
	if err != nil {
		return response.NotFound(c, "配置不存在")
	}
	return response.Success(c, fiber.Map{"c_key": key, "c_value": val})
}

// SetConfig 设置配置
func (h *ConfigHandler) SetConfig(c *fiber.Ctx) error {
	var req struct {
		CKey   string `json:"c_key"`
		CValue string `json:"c_value"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Invalid(c, "无效的请求数据")
	}
	if req.CKey == "" {
		return response.Invalid(c, "c_key 不能为空")
	}
	if err := h.service.SetConfig(req.CKey, req.CValue); err != nil {
		return response.Internal(c, "保存配置失败")
	}
	return response.Ok(c, "保存成功")
}

// SaveConfigs 批量保存配置
func (h *ConfigHandler) SaveConfigs(c *fiber.Ctx) error {
	var req []struct {
		CKey   string `json:"c_key"`
		CValue string `json:"c_value"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Invalid(c, "无效的请求数据")
	}
	if len(req) == 0 {
		return response.Invalid(c, "请求数据不能为空")
	}
	configs := make([]model.Config, 0, len(req))
	for _, item := range req {
		if item.CKey == "" {
			return response.Invalid(c, "c_key 不能为空")
		}
		configs = append(configs, model.Config{CKey: item.CKey, CValue: item.CValue})
	}
	if err := h.service.BatchSetConfig(configs); err != nil {
		return response.Internal(c, "批量保存配置失败")
	}
	return response.Ok(c, "批量保存成功")
}

// BatchGetConfigs 批量获取配置
func (h *ConfigHandler) BatchGetConfigs(c *fiber.Ctx) error {
	var req struct {
		Keys []string `json:"keys"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Invalid(c, "无效的请求数据")
	}
	if len(req.Keys) == 0 {
		return response.Invalid(c, "keys 不能为空")
	}
	configs, err := h.service.BatchGetConfig(req.Keys)
	if err != nil {
		return response.Internal(c, "批量获取配置失败")
	}
	return response.Success(c, configs)
}
