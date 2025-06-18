package handler

import (
	"mysql-batch-tools/internal/model"
	"mysql-batch-tools/internal/pkg/database"
	"mysql-batch-tools/internal/pkg/response"
	"mysql-batch-tools/internal/service"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// DatabaseHandler 数据库处理器
type DatabaseHandler struct {
	service *service.DatabaseService
}

// NewDatabaseHandler 创建数据库处理器
func NewDatabaseHandler() *DatabaseHandler {
	return &DatabaseHandler{
		service: service.NewDatabaseService(database.GetDB()),
	}
}

// List 获取数据库列表
func (h *DatabaseHandler) List(c *fiber.Ctx) error {
	var req model.DatabaseListRequest

	// 解析查询参数
	if err := c.QueryParser(&req); err != nil {
		return response.Invalid(c, "无效的查询参数")
	}

	// 处理实例ID参数
	if instanceIDStr := c.Query("instance_id"); instanceIDStr != "" {
		if instanceID, err := strconv.ParseUint(instanceIDStr, 10, 32); err == nil {
			req.InstanceID = uint(instanceID)
		}
	}

	list, err := h.service.List(c.Context(), &req)
	if err != nil {
		return response.Internal(c, "获取数据库列表失败")
	}

	return response.Success(c, list)
}

// Get 获取数据库详情
func (h *DatabaseHandler) Get(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的数据库ID")
	}

	db, err := h.service.Get(c.Context(), uint(id))
	if err != nil {
		return response.Internal(c, "获取数据库详情失败")
	}

	return response.Success(c, db)
}
