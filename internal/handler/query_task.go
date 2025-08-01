package handler

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"my-bulker/internal/model"
	"my-bulker/internal/pkg/database"
	"my-bulker/internal/pkg/response"
	"my-bulker/internal/service"
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

// GetSQLExecutions 获取任务下所有SQL及其执行明细
func (h *QueryTaskHandler) GetSQLExecutions(c *fiber.Ctx) error {
	taskIDStr := c.Params("taskId")
	taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的任务ID")
	}

	// 查询所有SQL
	sqls, err := h.service.GetSQLsWithExecutions(c.Context(), uint(taskID))
	if err != nil {
		return response.Internal(c, "获取SQL执行明细失败")
	}

	return response.Success(c, sqls)
}

// Run 运行查询任务
func (h *QueryTaskHandler) Run(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的任务ID")
	}
	db := database.GetDB()
	// 先查任务状态
	var task model.QueryTask
	if err := db.First(&task, id).Error; err != nil {
		return response.Internal(c, "查询任务失败: "+err.Error())
	}
	if task.Status == 2 || task.Status == 3 {
		runService := service.NewQueryTaskRunService(db)
		if err := runService.ResetQueryTask(c.Context(), uint(id)); err != nil {
			return response.Internal(c, "重置任务失败: "+err.Error())
		}
	}
	// 立即将任务状态设为执行中
	if err := db.Model(&model.QueryTask{}).Where("id = ?", id).Update("status", 1).Error; err != nil {
		return response.Internal(c, "更新任务状态失败: "+err.Error())
	}
	// 异步执行任务
	go func(taskID uint) {
		runService := service.NewQueryTaskRunService(db)
		_ = runService.Run(context.Background(), uint(taskID))
	}(uint(id))
	return response.Ok(c, "任务已开始执行")
}

// GetSQLResult 查询SQL结果表
func (h *QueryTaskHandler) GetSQLResult(c *fiber.Ctx) error {
	sqlIDStr := c.Params("sqlId")
	sqlID, err := strconv.ParseUint(sqlIDStr, 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的SQL ID")
	}
	// 可选参数
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 20
	}

	db := database.GetDB()
	// 查找SQL记录，获取表名和schema
	var sqlRec model.QueryTaskSQL
	if err := db.First(&sqlRec, sqlID).Error; err != nil {
		return response.NotFound(c, "SQL记录不存在")
	}
	tableName := sqlRec.ResultTableName
	schema := sqlRec.ResultTableSchema

	// 构建查询
	query := db.Table(tableName)
	// 通用字段模糊筛选
	for k, v := range c.Queries() {
		if k == "page" || k == "page_size" || k == "order_by" || k == "order" {
			continue
		}
		if v != "" {
			query = query.Where("`"+encodeB64(k)+"` LIKE ?", "%"+v+"%")
		}
	}
	// 排序
	orderBy := c.Query("order_by")
	order := c.Query("order")
	if orderBy != "" && (order == "ascend" || order == "descend") {
		orderStr := "ASC"
		if order == "descend" {
			orderStr = "DESC"
		}
		query = query.Order("`" + encodeB64(orderBy) + "` " + orderStr)
	}
	var total int64
	query.Count(&total)
	var rows []map[string]interface{}
	query.Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows)

	// 字段名解码
	var schemaObj model.TableSchema
	_ = json.Unmarshal([]byte(schema), &schemaObj)
	b64Map := map[string]string{}
	for _, f := range schemaObj.Fields {
		b64Map[encodeB64(f.Name)] = f.Name
	}
	for i := range rows {
		for k, v := range rows[i] {
			if orig, ok := b64Map[k]; ok {
				rows[i][orig] = v
				if orig != k {
					delete(rows[i], k)
				}
			}
		}
	}
	return response.Success(c, map[string]interface{}{
		"total":  total,
		"items":  rows,
		"schema": schema,
	})
}

// ExportSQLResult 导出SQL结果表为CSV
func (h *QueryTaskHandler) ExportSQLResult(c *fiber.Ctx) error {
	sqlIDStr := c.Params("sqlId")
	sqlID, err := strconv.ParseUint(sqlIDStr, 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的SQL ID")
	}

	db := database.GetDB()
	// 查找SQL记录，获取表名和schema
	var sqlRec model.QueryTaskSQL
	if err := db.First(&sqlRec, sqlID).Error; err != nil {
		return response.NotFound(c, "SQL记录不存在")
	}
	tableName := sqlRec.ResultTableName
	schemaStr := sqlRec.ResultTableSchema

	// 解析 schema
	var schemaObj model.TableSchema
	if err := json.Unmarshal([]byte(schemaStr), &schemaObj); err != nil {
		return response.Internal(c, "解析表结构失败: "+err.Error())
	}

	// 构建查询
	query := db.Table(tableName)

	// 应用通用字段模糊筛选
	for k, v := range c.Queries() {
		if k == "page" || k == "page_size" || k == "order_by" || k == "order" {
			continue
		}
		if v != "" {
			query = query.Where("`"+encodeB64(k)+"` LIKE ?", "%"+v+"%")
		}
	}

	// 应用排序
	orderBy := c.Query("order_by")
	order := c.Query("order")
	if orderBy != "" && (order == "ascend" || order == "descend") {
		orderStr := "ASC"
		if order == "descend" {
			orderStr = "DESC"
		}
		query = query.Order("`" + encodeB64(orderBy) + "` " + orderStr)
	}

	// 获取所有行，不分页
	var rows []map[string]interface{}
	if err := query.Find(&rows).Error; err != nil {
		return response.Internal(c, "查询数据库失败: "+err.Error())
	}

	// 字段名解码映射
	b64Map := map[string]string{}
	for _, f := range schemaObj.Fields {
		b64Map[encodeB64(f.Name)] = f.Name
	}

	// 创建CSV
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// 写入BOM头，防止Excel打开中文乱码
	buf.WriteString("\xEF\xBB\xBF")

	// 写入表头
	headers := make([]string, len(schemaObj.Fields))
	for i, f := range schemaObj.Fields {
		headers[i] = f.Name
	}
	if err := writer.Write(headers); err != nil {
		return response.Internal(c, "写入CSV表头失败: "+err.Error())
	}

	// 写入数据行
	record := make([]string, len(schemaObj.Fields))
	for _, row := range rows {
		// 解码行数据
		decodedRow := make(map[string]interface{})
		for k, v := range row {
			if orig, ok := b64Map[k]; ok {
				decodedRow[orig] = v
			}
		}

		// 按表头顺序填充记录
		for i, field := range schemaObj.Fields {
			if val, ok := decodedRow[field.Name]; ok {
				record[i] = fmt.Sprintf("%v", val)
			} else {
				record[i] = ""
			}
		}
		if err := writer.Write(record); err != nil {
			return response.Internal(c, "写入CSV行数据失败: "+err.Error())
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return response.Internal(c, "刷新CSV写入器失败: "+err.Error())
	}

	// 设置响应头并发送文件
	fileName := fmt.Sprintf("task_%d_sql_%d_results.csv", sqlRec.TaskID, sqlRec.ID)
	c.Set(fiber.HeaderContentDisposition, "attachment; filename="+fileName)
	c.Set(fiber.HeaderContentType, "text/csv")

	return c.Send(buf.Bytes())
}

// encodeB64 base64编码字段名
func encodeB64(s string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(s))
}

// GetExecutionStats 获取任务执行统计信息
func (h *QueryTaskHandler) GetExecutionStats(c *fiber.Ctx) error {
	taskIDStr := c.Params("taskId")
	taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的任务ID")
	}
	stats, err := h.service.GetExecutionStats(c.Context(), uint(taskID))
	if err != nil {
		return response.Internal(c, "获取执行统计失败")
	}
	return response.Success(c, stats)
}

// ToggleFavoriteStatus 切换任务常用状态
func (h *QueryTaskHandler) ToggleFavoriteStatus(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		return response.Invalid(c, "无效的任务ID")
	}

	if err := h.service.ToggleFavoriteStatus(c.Context(), uint(id)); err != nil {
		return response.Internal(c, "切换常用状态失败: "+err.Error())
	}

	return response.Ok(c, "切换成功")
}

// BatchDeleteTasksRequest 批量删除任务请求
type BatchDeleteTasksRequest struct {
	TaskIDs []uint `json:"task_ids"`
}

// BatchDeleteTasks 批量删除任务
func (h *QueryTaskHandler) BatchDeleteTasks(c *fiber.Ctx) error {
	var req BatchDeleteTasksRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Invalid(c, "无效的请求参数")
	}

	if len(req.TaskIDs) == 0 {
		return response.Invalid(c, "任务ID列表不能为空")
	}

	if err := h.service.BatchDeleteTasks(c.Context(), req.TaskIDs); err != nil {
		return response.Internal(c, "批量删除任务失败: "+err.Error())
	}

	return response.Ok(c, "批量删除成功")
}
