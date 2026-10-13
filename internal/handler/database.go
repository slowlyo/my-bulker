package handler

import (
	"my-bulker/internal/model"
	"my-bulker/internal/pkg/database"
	"my-bulker/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
)

// DatabaseHandler 数据库处理器
type DatabaseHandler struct{}

// NewDatabaseHandler 创建数据库处理器
func NewDatabaseHandler() *DatabaseHandler {
	return &DatabaseHandler{}
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
