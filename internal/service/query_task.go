package service

import (
	"context"
	"time"

	"mysql-batch-tools/internal/model"

	"gorm.io/gorm"
)

// QueryTaskService 查询任务服务
type QueryTaskService struct {
	db *gorm.DB
}

// NewQueryTaskService 创建查询任务服务
func NewQueryTaskService(db *gorm.DB) *QueryTaskService {
	return &QueryTaskService{db: db}
}

// Get 获取查询任务详情
func (s *QueryTaskService) Get(ctx context.Context, id uint) (*model.QueryTaskResponse, error) {
	var task model.QueryTask

	if err := s.db.First(&task, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	// 转换为响应格式
	response := &model.QueryTaskResponse{
		ID:            task.ID,
		CreatedAt:     task.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     task.UpdatedAt.Format(time.RFC3339),
		TaskName:      task.TaskName,
		Databases:     task.Databases,
		Status:        task.Status,
		TotalDBs:      task.TotalDBs,
		CompletedDBs:  task.CompletedDBs,
		FailedDBs:     task.FailedDBs,
		TotalSQLs:     task.TotalSQLs,
		CompletedSQLs: task.CompletedSQLs,
		FailedSQLs:    task.FailedSQLs,
		StartedAt:     task.StartedAt,
		CompletedAt:   task.CompletedAt,
		Description:   task.Description,
	}

	return response, nil
}

// List 获取查询任务列表
func (s *QueryTaskService) List(ctx context.Context, req *model.QueryTaskListRequest) (*model.QueryTaskListResponse, error) {
	var total int64
	var tasks []model.QueryTask

	query := s.db.Model(&model.QueryTask{})

	// 应用过滤条件
	if req.TaskName != "" {
		query = query.Where("task_name LIKE ?", "%"+req.TaskName+"%")
	}
	if req.Status != nil {
		query = query.Where("status = ?", *req.Status)
	}

	// 应用排序条件
	if req.SortField != "" {
		query = query.Order(req.Sorting.GetSortClause())
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// 获取分页数据
	if err := query.Offset(req.Pagination.GetOffset()).Limit(req.Pagination.GetLimit()).Find(&tasks).Error; err != nil {
		return nil, err
	}

	// 转换为响应格式
	items := make([]model.QueryTaskResponse, len(tasks))
	for i, task := range tasks {
		items[i] = model.QueryTaskResponse{
			ID:            task.ID,
			CreatedAt:     task.CreatedAt.Format(time.RFC3339),
			UpdatedAt:     task.UpdatedAt.Format(time.RFC3339),
			TaskName:      task.TaskName,
			Databases:     task.Databases,
			Status:        task.Status,
			TotalDBs:      task.TotalDBs,
			CompletedDBs:  task.CompletedDBs,
			FailedDBs:     task.FailedDBs,
			TotalSQLs:     task.TotalSQLs,
			CompletedSQLs: task.CompletedSQLs,
			FailedSQLs:    task.FailedSQLs,
			StartedAt:     task.StartedAt,
			CompletedAt:   task.CompletedAt,
			Description:   task.Description,
		}
	}

	return &model.QueryTaskListResponse{
		Total: total,
		Items: items,
	}, nil
}

// GetSQLs 获取查询任务的SQL语句列表
func (s *QueryTaskService) GetSQLs(ctx context.Context, taskID uint) (*model.QueryTaskSQLListResponse, error) {
	var sqls []model.QueryTaskSQL

	if err := s.db.Where("task_id = ?", taskID).Order("sql_order ASC").Find(&sqls).Error; err != nil {
		return nil, err
	}

	// 转换为响应格式
	items := make([]model.QueryTaskSQLResponse, len(sqls))
	for i, sql := range sqls {
		items[i] = model.QueryTaskSQLResponse{
			ID:                sql.ID,
			CreatedAt:         sql.CreatedAt.Format(time.RFC3339),
			UpdatedAt:         sql.UpdatedAt.Format(time.RFC3339),
			TaskID:            sql.TaskID,
			SQLContent:        sql.SQLContent,
			SQLOrder:          sql.SQLOrder,
			ResultTableName:   sql.ResultTableName,
			ResultTableSchema: sql.ResultTableSchema,
			TotalDBs:          sql.TotalDBs,
			CompletedDBs:      sql.CompletedDBs,
			FailedDBs:         sql.FailedDBs,
			StartedAt:         sql.StartedAt,
			CompletedAt:       sql.CompletedAt,
		}
	}

	return &model.QueryTaskSQLListResponse{
		Total: int64(len(items)),
		Items: items,
	}, nil
}

// GetSQLsWithExecutions 获取任务下所有SQL及其执行明细
func (s *QueryTaskService) GetSQLsWithExecutions(ctx context.Context, taskID uint) ([]map[string]interface{}, error) {
	var sqls []model.QueryTaskSQL
	if err := s.db.Where("task_id = ?", taskID).Order("sql_order ASC").Find(&sqls).Error; err != nil {
		return nil, err
	}

	// 一次性查出所有 executions
	var allExecutions []model.QueryTaskExecution
	s.db.Where("sql_id IN ?", getSQLIDs(sqls)).Order("id ASC").Find(&allExecutions)

	// 收集所有 instance_id
	instanceIDSet := make(map[uint]struct{})
	for _, e := range allExecutions {
		instanceIDSet[e.InstanceID] = struct{}{}
	}
	ids := make([]uint, 0, len(instanceIDSet))
	for id := range instanceIDSet {
		ids = append(ids, id)
	}
	// 一次性查实例名
	var instances []model.Instance
	nameMap := make(map[uint]string)
	if len(ids) > 0 {
		s.db.Model(&model.Instance{}).Where("id IN ?", ids).Find(&instances)
		for _, inst := range instances {
			nameMap[inst.ID] = inst.Name
		}
	}

	// 按 sql_id 分组
	grouped := make(map[uint][]map[string]interface{})
	for _, e := range allExecutions {
		m := map[string]interface{}{
			"id":             e.ID,
			"created_at":     e.CreatedAt,
			"updated_at":     e.UpdatedAt,
			"task_id":        e.TaskID,
			"sql_id":         e.SQLID,
			"instance_id":    e.InstanceID,
			"database_name":  e.DatabaseName,
			"status":         e.Status,
			"error_message":  e.ErrorMessage,
			"result_count":   e.ResultCount,
			"execution_time": e.ExecutionTime,
			"started_at":     e.StartedAt,
			"completed_at":   e.CompletedAt,
			"instance_name":  nameMap[e.InstanceID],
		}
		grouped[e.SQLID] = append(grouped[e.SQLID], m)
	}

	result := make([]map[string]interface{}, len(sqls))
	for i, sql := range sqls {
		result[i] = map[string]interface{}{
			"id":          sql.ID,
			"sql_order":   sql.SQLOrder,
			"sql_content": sql.SQLContent,
			"executions":  grouped[sql.ID],
		}
	}
	return result, nil
}

// getSQLIDs 辅助函数
func getSQLIDs(sqls []model.QueryTaskSQL) []uint {
	ids := make([]uint, 0, len(sqls))
	for _, s := range sqls {
		ids = append(ids, s.ID)
	}
	return ids
}
