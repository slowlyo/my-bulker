package handler

import (
	"my-bulker/internal/model"
	"my-bulker/internal/pkg/database"
	"my-bulker/internal/pkg/response"
	"my-bulker/internal/service"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// DbDocHandler 数据库文档处理
type DbDocHandler struct {
	svc *service.DbDocService
}

// NewDbDocHandler 创建数据库文档处理
func NewDbDocHandler() *DbDocHandler {
	return &DbDocHandler{
		svc: service.NewDbDocService(database.GetDB()),
	}
}

// Create 创建任务
func (h *DbDocHandler) Create(c *fiber.Ctx) error {
	req := new(model.DbDocTaskRequest)
	if err := c.BodyParser(req); err != nil {
		return response.Invalid(c, err.Error())
	}

	task, err := h.svc.CreateTask(req)
	if err != nil {
		return response.Internal(c, err.Error())
	}

	return response.Success(c, task)
}

// Update 更新任务
func (h *DbDocHandler) Update(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	req := new(model.DbDocTaskRequest)
	if err := c.BodyParser(req); err != nil {
		return response.Invalid(c, err.Error())
	}

	task, err := h.svc.UpdateTask(uint(id), req)
	if err != nil {
		return response.Internal(c, err.Error())
	}

	return response.Success(c, task)
}

// Delete 删除任务
func (h *DbDocHandler) Delete(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	if err := h.svc.DeleteTask(uint(id)); err != nil {
		return response.Internal(c, err.Error())
	}

	return response.Ok(c, "success")
}

// Get 获取详情
func (h *DbDocHandler) Get(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	task, err := h.svc.GetTask(uint(id))
	if err != nil {
		return response.Internal(c, err.Error())
	}

	// 转换为响应格式
	resp := h.convertToResponse(task)
	return response.Success(c, resp)
}

// List 获取列表
func (h *DbDocHandler) List(c *fiber.Ctx) error {
	req := new(model.DbDocTaskListRequest)
	if err := c.QueryParser(req); err != nil {
		return response.Invalid(c, err.Error())
	}
	req.Pagination.ValidateAndSetDefaults()
	tasks, total, err := h.svc.ListTasks(req)
	if err != nil {
		return response.Internal(c, err.Error())
	}

	items := make([]model.DbDocTaskResponse, len(tasks))
	for i, task := range tasks {
		items[i] = h.convertToResponse(&task)
	}

	return response.Success(c, fiber.Map{
		"total": total,
		"items": items,
	})
}

// Run 运行任务
func (h *DbDocHandler) Run(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	if err := h.svc.RunTask(uint(id)); err != nil {
		return response.Internal(c, err.Error())
	}

	return response.Ok(c, "success")
}

// convertToResponse 转换为响应格式
func (h *DbDocHandler) convertToResponse(task *model.DbDocTask) model.DbDocTaskResponse {
	lastRunAt := ""
	if task.LastRunAt != nil {
		lastRunAt = task.LastRunAt.Format(time.RFC3339)
	}
	return model.DbDocTaskResponse{
		ID:           task.ID,
		CreatedAt:    task.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    task.UpdatedAt.Format(time.RFC3339),
		TaskName:     task.TaskName,
		InstanceID:   task.InstanceID,
		DatabaseID:   task.DatabaseID,
		Database:     task.Database,
		OutputPath:   task.OutputPath,
		Config:       task.Config,
		SyncInterval: task.SyncInterval,
		IsEnable:     task.IsEnable,
		LastRunAt:    lastRunAt,
		LastStatus:   task.LastStatus,
		LastError:    task.LastError,
		Instance:     &task.Instance,
	}
}
