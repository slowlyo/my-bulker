package handler

import (
	"fmt"
	"mysql-batch-tools/internal/model"
	"mysql-batch-tools/internal/pkg/response"
	"mysql-batch-tools/internal/service"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// InstanceHandler 实例处理器
type InstanceHandler struct {
	service *service.InstanceService
}

// NewInstanceHandler 创建实例处理器
func NewInstanceHandler() *InstanceHandler {
	return &InstanceHandler{
		service: service.NewInstanceService(),
	}
}

// Create 创建实例
func (h *InstanceHandler) Create(c *fiber.Ctx) error {
	var req model.CreateInstanceRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Invalid(c, "无效的请求数据")
	}

	instance, err := h.service.Create(&req)
	if err != nil {
		if err == service.ErrInstanceNameExists {
			return response.Invalid(c, "实例名称已存在")
		}
		return response.Internal(c, "创建实例失败")
	}

	return response.Custom(c, response.CodeSuccess, "创建实例成功", instance)
}

// Update 更新实例
func (h *InstanceHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的实例ID")
	}

	var req model.UpdateInstanceRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Invalid(c, "无效的请求数据")
	}

	instance, err := h.service.Update(uint(id), &req)
	if err != nil {
		if err == service.ErrInstanceNameExists {
			return response.Invalid(c, "实例名称已存在")
		}
		return response.Internal(c, "更新实例失败")
	}

	return response.Custom(c, response.CodeSuccess, "更新实例成功", instance)
}

// Delete 删除实例
func (h *InstanceHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的实例ID")
	}

	if err := h.service.Delete(uint(id)); err != nil {
		return response.Internal(c, "删除实例失败")
	}

	return response.Success(c, nil)
}

// Get 获取实例
func (h *InstanceHandler) Get(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的实例ID")
	}

	instance, err := h.service.Get(uint(id))
	if err != nil {
		return response.Internal(c, "获取实例失败")
	}

	return response.Custom(c, response.CodeSuccess, "获取实例成功", instance)
}

// List 获取实例列表
func (h *InstanceHandler) List(c *fiber.Ctx) error {
	var req model.InstanceListRequest

	// 解析查询参数
	if err := c.QueryParser(&req); err != nil {
		return response.Invalid(c, "无效的查询参数")
	}

	list, err := h.service.List(&req)
	if err != nil {
		return response.Internal(c, "获取实例列表失败")
	}

	return response.Success(c, list)
}

// TestConnection 测试数据库连接
func (h *InstanceHandler) TestConnection(c *fiber.Ctx) error {
	var req struct {
		Host     string `json:"host"`
		Port     int    `json:"port"`
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return response.Invalid(c, "无效的请求数据")
	}

	if err := h.service.TestConnection(req.Host, req.Port, req.Username, req.Password); err != nil {
		return response.Invalid(c, err.Error())
	}

	return response.Success(c, nil)
}

// Options 获取实例选项
func (h *InstanceHandler) Options(c *fiber.Ctx) error {
	options, err := h.service.GetOptions()
	if err != nil {
		return response.Internal(c, "获取实例选项失败")
	}

	return response.Success(c, options)
}

// SyncDatabases 同步数据库信息
func (h *InstanceHandler) SyncDatabases(c *fiber.Ctx) error {
	var req model.SyncDatabasesRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Invalid(c, "无效的请求数据")
	}

	if err := h.service.SyncDatabases(req.InstanceIDs); err != nil {
		return response.Internal(c, fmt.Sprintf("同步数据库失败: %v", err))
	}

	return response.Success(c, nil)
}
