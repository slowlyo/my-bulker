package service

import (
	"context"
	"fmt"
	"time"

	"my-bulker/internal/model"

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
		IsFavorite:    task.IsFavorite,
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
	if req.IsFavorite != nil {
		query = query.Where("is_favorite = ?", *req.IsFavorite)
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
			IsFavorite:    task.IsFavorite,
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
			StartedAt:         "",
			CompletedAt:       "",
		}
		if sql.StartedAt != nil {
			items[i].StartedAt = sql.StartedAt.Format(time.RFC3339)
		}
		if sql.CompletedAt != nil {
			items[i].CompletedAt = sql.CompletedAt.Format(time.RFC3339)
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

// GetExecutionStats 获取任务执行统计信息（高效聚合版，db/sql都只查一次）
func (s *QueryTaskService) GetExecutionStats(ctx context.Context, taskID uint) (map[string]interface{}, error) {
	// 1. DB维度统计（一次聚合）
	type dbStat struct {
		Total     int64
		Completed int64
		Failed    int64
		Pending   int64
	}
	var dbStats dbStat
	s.db.Raw(`
		SELECT COUNT(*) AS total,
		SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS completed,
		SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) AS failed,
		SUM(CASE WHEN status IN (0,1) THEN 1 ELSE 0 END) AS pending
		FROM query_task_executions WHERE task_id = ?
	`, taskID).Scan(&dbStats)

	// 2. SQL维度统计（一次聚合+Go处理）
	type sqlAgg struct {
		SQLID     uint
		Total     int64
		Completed int64
		Failed    int64
	}
	var sqlAggs []sqlAgg
	s.db.Raw(`
		SELECT sql_id AS sql_id,
		COUNT(*) AS total,
		SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS completed,
		SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) AS failed
		FROM query_task_executions WHERE task_id = ? GROUP BY sql_id
	`, taskID).Scan(&sqlAggs)
	totalSQL := int64(len(sqlAggs))
	completedSQL := int64(0)
	failedSQL := int64(0)
	pendingSQL := int64(0)
	for _, agg := range sqlAggs {
		if agg.Total > 0 && agg.Completed == agg.Total {
			completedSQL++
		} else if agg.Failed > 0 {
			failedSQL++
		} else {
			pendingSQL++
		}
	}

	return map[string]interface{}{
		"db": map[string]int64{
			"total":     dbStats.Total,
			"completed": dbStats.Completed,
			"failed":    dbStats.Failed,
			"pending":   dbStats.Pending,
		},
		"sql": map[string]int64{
			"total":     totalSQL,
			"completed": completedSQL,
			"failed":    failedSQL,
			"pending":   pendingSQL,
		},
	}, nil
}

// ToggleFavoriteStatus 切换任务的常用状态
func (s *QueryTaskService) ToggleFavoriteStatus(ctx context.Context, taskID uint) error {
	var task model.QueryTask
	if err := s.db.WithContext(ctx).First(&task, taskID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("任务不存在")
		}
		return err
	}

	// 切换状态
	return s.db.WithContext(ctx).Model(&task).Update("is_favorite", !task.IsFavorite).Error
}

// BatchDeleteTasks 批量删除任务及其所有相关数据
func (s *QueryTaskService) BatchDeleteTasks(ctx context.Context, taskIDs []uint) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 查找所有要删除任务的SQL记录，以获取结果表名
		var sqls []model.QueryTaskSQL
		if err := tx.Where("task_id IN ?", taskIDs).Find(&sqls).Error; err != nil {
			return fmt.Errorf("查找任务SQL失败: %w", err)
		}

		// 2. 删除所有相关的执行记录
		if err := tx.Where("task_id IN ?", taskIDs).Delete(&model.QueryTaskExecution{}).Error; err != nil {
			return fmt.Errorf("删除任务执行记录失败: %w", err)
		}

		// 3. 删除所有相关的SQL记录
		if err := tx.Where("task_id IN ?", taskIDs).Delete(&model.QueryTaskSQL{}).Error; err != nil {
			return fmt.Errorf("删除任务SQL记录失败: %w", err)
		}

		// 4. 删除任务记录本身
		if err := tx.Where("id IN ?", taskIDs).Delete(&model.QueryTask{}).Error; err != nil {
			return fmt.Errorf("删除任务记录失败: %w", err)
		}

		// 5. 最后，在事务中删除所有结果表
		for _, sql := range sqls {
			if sql.ResultTableName != "" {
				if err := tx.Exec("DROP TABLE IF EXISTS `" + sql.ResultTableName + "`").Error; err != nil {
					return fmt.Errorf("删除结果表 %s 失败: %w", sql.ResultTableName, err)
				}
			}
		}

		return nil
	})
}
