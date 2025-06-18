package handler

import (
	"mysql-batch-tools/internal/model"
	"mysql-batch-tools/internal/pkg/database"
	"mysql-batch-tools/internal/pkg/response"
	"mysql-batch-tools/internal/service"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// QueryTaskHandler 查询任务处理器
type QueryTaskHandler struct {
	service *service.QueryTaskService
	creator *service.QueryTaskCreatorService
}

// NewQueryTaskHandler 创建查询任务处理器
func NewQueryTaskHandler() *QueryTaskHandler {
	return &QueryTaskHandler{
		service: service.NewQueryTaskService(database.GetDB()),
		creator: service.NewQueryTaskCreatorService(database.GetDB()),
	}
}

// Create 创建查询任务
func (h *QueryTaskHandler) Create(c *fiber.Ctx) error {
	var req model.CreateQueryTaskRequest

	// 解析请求体
	if err := c.BodyParser(&req); err != nil {
		return response.Invalid(c, "无效的请求参数")
	}

	// 手动验证请求参数
	if req.TaskName == "" {
		return response.Invalid(c, "任务名称不能为空")
	}
	if len(req.InstanceIDs) == 0 {
		return response.Invalid(c, "请选择至少一个实例")
	}
	if req.DatabaseMode != "include" && req.DatabaseMode != "exclude" {
		return response.Invalid(c, "数据库选择模式必须是 include 或 exclude")
	}
	if len(req.SelectedDBs) == 0 {
		return response.Invalid(c, "选中的数据库列表不能为空")
	}
	if req.SQLContent == "" {
		return response.Invalid(c, "SQL语句内容不能为空")
	}

	// 创建任务
	task, err := h.creator.Create(c.Context(), &req)
	if err != nil {
		return response.Internal(c, "创建查询任务失败: "+err.Error())
	}

	return response.Success(c, task)
}

// Get 获取查询任务详情
func (h *QueryTaskHandler) Get(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的任务ID")
	}

	task, err := h.service.Get(c.Context(), uint(id))
	if err != nil {
		return response.Internal(c, "获取查询任务详情失败")
	}

	if task == nil {
		return response.NotFound(c, "查询任务不存在")
	}

	return response.Success(c, task)
}

// List 获取查询任务列表
func (h *QueryTaskHandler) List(c *fiber.Ctx) error {
	var req model.QueryTaskListRequest

	// 解析查询参数
	if err := c.QueryParser(&req); err != nil {
		return response.Invalid(c, "无效的查询参数")
	}

	// 验证并设置默认值
	req.Pagination.ValidateAndSetDefaults()
	req.Sorting.ValidateAndSetDefaults()

	list, err := h.service.List(c.Context(), &req)
	if err != nil {
		return response.Internal(c, "获取查询任务列表失败")
	}

	return response.Success(c, list)
}

// GetSQLs 获取查询任务的SQL语句列表
func (h *QueryTaskHandler) GetSQLs(c *fiber.Ctx) error {
	taskIDStr := c.Params("taskId")
	taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的任务ID")
	}

	sqls, err := h.service.GetSQLs(c.Context(), uint(taskID))
	if err != nil {
		return response.Internal(c, "获取SQL语句列表失败")
	}

	return response.Success(c, sqls)
}
