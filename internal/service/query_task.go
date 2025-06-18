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
