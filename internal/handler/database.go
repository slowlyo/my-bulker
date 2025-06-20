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

	// 验证并设置默认值
	req.Pagination.ValidateAndSetDefaults()
	req.Sorting.ValidateAndSetDefaults()

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

// 批量查询数据库列表
func (h *DatabaseHandler) BatchList(c *fiber.Ctx) error {
	var req struct {
		InstanceIDs []uint `json:"instance_ids"`
	}
	if err := c.BodyParser(&req); err != nil || len(req.InstanceIDs) == 0 {
		return response.Invalid(c, "参数错误")
	}
	db := database.GetDB()
	var dbs []model.Database
	if err := db.Where("instance_id IN ?", req.InstanceIDs).Find(&dbs).Error; err != nil {
		return response.Internal(c, "查询数据库失败")
	}
	// 查实例名
	var instances []model.Instance
	db.Model(&model.Instance{}).Where("id IN ?", req.InstanceIDs).Find(&instances)
	nameMap := map[uint]string{}
	for _, inst := range instances {
		nameMap[inst.ID] = inst.Name
	}
	// 组装
	var result []map[string]interface{}
	for _, db := range dbs {
		result = append(result, map[string]interface{}{
			"instance_id":   db.InstanceID,
			"instance_name": nameMap[db.InstanceID],
			"database_name": db.Name,
		})
	}
	return response.Success(c, result)
}
