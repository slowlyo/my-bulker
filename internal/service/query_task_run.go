package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"my-bulker/internal/model"
	"my-bulker/internal/pkg/database"
	"strconv"
	"sync"
	"time"

	"gorm.io/gorm"
)

// QueryTaskRunService 查询任务运行服务
// 负责任务的实际执行逻辑，便于解耦和扩展
// 允许任务重复执行

type QueryTaskRunService struct {
	db *gorm.DB
}

func NewQueryTaskRunService(db *gorm.DB) *QueryTaskRunService {
	return &QueryTaskRunService{
		db: db,
	}
}

// ResetQueryTask 重置任务统计、执行状态和结果表（用于再次查询前）
func (s *QueryTaskRunService) ResetQueryTask(ctx context.Context, taskID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var task model.QueryTask
		if err := tx.First(&task, taskID).Error; err != nil {
			return err
		}

		// 只有在已完成或失败状态下才允许重置
		if task.Status != 2 && task.Status != 3 {
			return nil // 状态不合法，无需重置，直接返回成功
		}

		// 1. 重置 executions
		if err := tx.Model(&model.QueryTaskExecution{}).Where("task_id = ?", taskID).Updates(map[string]interface{}{
			"status":         0,
			"error_message":  "",
			"result_count":   nil,
			"execution_time": nil,
			"started_at":     nil,
			"completed_at":   nil,
		}).Error; err != nil {
			return err
		}

		// 2. 重置 SQL 统计字段并清空结果表
		var sqls []model.QueryTaskSQL
		if err := tx.Where("task_id = ?", taskID).Find(&sqls).Error; err != nil {
			return err
		}
		for _, sql := range sqls {
			if err := tx.Model(&model.QueryTaskSQL{}).Where("id = ?", sql.ID).Updates(map[string]interface{}{
				"completed_dbs":  0,
				"failed_dbs":     0,
				"completed_sqls": 0,
				"failed_sqls":    0,
				"started_at":     nil,
				"completed_at":   nil,
			}).Error; err != nil {
				return err
			}
			// 4. 清空结果表，使用 DELETE
			if err := tx.Exec("DELETE FROM `" + sql.ResultTableName + "`").Error; err != nil {
				return err
			}
		}

		// 3. 重置任务统计字段
		if err := tx.Model(&model.QueryTask{}).Where("id = ?", taskID).Updates(map[string]interface{}{
			"completed_dbs":  0,
			"failed_dbs":     0,
			"completed_sqls": 0,
			"failed_sqls":    0,
			"started_at":     nil,
			"completed_at":   nil,
			"status":         0,
		}).Error; err != nil {
			return err
		}

		return nil
	})
}

// statResult 定义了任务执行后的统计结果
type statResult struct {
	completedDBs map[string]struct{}
	failedDBs    map[string]struct{}
	sqlStats     map[uint]struct{ total, completed, failed int64 }
}

// Run 执行查询任务（允许重复执行）
func (s *QueryTaskRunService) Run(ctx context.Context, taskID uint) error {
	// 1. 准备任务所需的所有数据
	task, sqls, executions, instMap, err := s.prepareTaskData(taskID)
	if err != nil {
		return fmt.Errorf("准备任务数据失败: %w", err)
	}

	// 如果没有任何执行项，直接将任务标记为完成
	if len(executions) == 0 {
		log.Printf("任务 #%d 没有执行项，直接标记为完成。", taskID)
		t := time.Now()
		task.CompletedAt = &t
		task.Status = 2 // 2: 已完成
		return s.db.Save(task).Error
	}

	// 2. 获取相关设置
	maxConn, concurrency, queryTimeoutSec := s.getSetting()

	// 3. 并发执行所有SQL
	stats := s.executeSQLsConcurrently(ctx, task, sqls, executions, instMap, maxConn, concurrency, queryTimeoutSec)

	// 4. 聚合统计结果并更新数据库
	return s.aggregateAndSaveStats(task, sqls, executions, stats)
}

// prepareTaskData 从数据库加载任务执行所需的所有数据
func (s *QueryTaskRunService) prepareTaskData(taskID uint) (*model.QueryTask, []model.QueryTaskSQL, []model.QueryTaskExecution, map[uint]*model.Instance, error) {
	var task model.QueryTask
	if err := s.db.First(&task, taskID).Error; err != nil {
		return nil, nil, nil, nil, err
	}
	var sqls []model.QueryTaskSQL
	if err := s.db.Where("task_id = ?", taskID).Order("sql_order ASC").Find(&sqls).Error; err != nil {
		return nil, nil, nil, nil, err
	}
	var executions []model.QueryTaskExecution
	if err := s.db.Where("task_id = ?", taskID).Find(&executions).Error; err != nil {
		return nil, nil, nil, nil, err
	}
	instanceIDs := make(map[uint]struct{})
	for _, e := range executions {
		instanceIDs[e.InstanceID] = struct{}{}
	}
	ids := make([]uint, 0, len(instanceIDs))
	for id := range instanceIDs {
		ids = append(ids, id)
	}
	var instances []model.Instance
	if err := s.db.Where("id IN ?", ids).Find(&instances).Error; err != nil {
		return nil, nil, nil, nil, err
	}
	instMap := make(map[uint]*model.Instance)
	for i := range instances {
		instMap[instances[i].ID] = &instances[i]
	}
	return &task, sqls, executions, instMap, nil
}

// executeSQLsConcurrently 并发执行所有SQL查询，并返回统计结果
func (s *QueryTaskRunService) executeSQLsConcurrently(
	ctx context.Context,
	task *model.QueryTask,
	sqls []model.QueryTaskSQL,
	executions []model.QueryTaskExecution,
	instMap map[uint]*model.Instance,
	maxConn int,
	concurrency int,
	queryTimeoutSec int,
) *statResult {
	// 连接池：key=instanceID+dbName，value=*gorm.DB
	dbConnPool := make(map[string]*gorm.DB)
	var poolMu sync.Mutex

	// 任务结束时，延迟关闭所有在本次任务中创建的连接
	defer func() {
		poolMu.Lock()
		defer poolMu.Unlock()
		for _, dbConn := range dbConnPool {
			if sqlDB, err := dbConn.DB(); err == nil {
				sqlDB.Close()
			}
		}
	}()

	// 将 executions 按 SQL ID 分组，便于后续按序执行
	executionsBySQL := make(map[uint][]*model.QueryTaskExecution)
	for i := range executions {
		exec := &executions[i]
		executionsBySQL[exec.SQLID] = append(executionsBySQL[exec.SQLID], exec)
	}

	startTime := time.Now()
	if task.StartedAt == nil {
		task.StartedAt = &startTime
		s.db.Model(&model.QueryTask{}).Where("id = ?", task.ID).Update("started_at", startTime)
	}

	sem := make(chan struct{}, concurrency)

	type StatMsg struct {
		SQLID        uint
		InstanceID   uint
		DatabaseName string
		Status       int8
	}
	statCh := make(chan StatMsg, len(executions))
	// updateQueue 用于将已完成的 execution 存入队列，由后台 goroutine 定时批量更新到数据库
	updateQueue := make(chan *model.QueryTaskExecution, len(executions))
	stats := &statResult{
		completedDBs: make(map[string]struct{}),
		failedDBs:    make(map[string]struct{}),
		sqlStats:     make(map[uint]struct{ total, completed, failed int64 }),
	}

	// 启动一个 goroutine，用于定时批量更新 execution 状态，以提供实时进度
	var updateWg sync.WaitGroup
	updateWg.Add(1)
	go func() {
		defer updateWg.Done()
		ticker := time.NewTicker(1 * time.Second) // 每 1 秒更新一次
		defer ticker.Stop()
		buffer := make([]*model.QueryTaskExecution, 0, 100) // 缓冲区大小为 100

		flush := func() {
			if len(buffer) == 0 {
				return
			}
			if err := s.db.Transaction(func(tx *gorm.DB) error {
				for _, e := range buffer {
					if err := tx.Save(e).Error; err != nil {
						return err // 如果任何一个保存失败，则回滚整个事务
					}
				}
				return nil
			}); err != nil {
				log.Printf("ERROR: failed to batch update execution status: %v", err)
			}
			buffer = buffer[:0] // 清空缓冲区
		}

		for {
			select {
			case exec, ok := <-updateQueue:
				if !ok { // channel 已关闭
					flush()
					return
				}
				buffer = append(buffer, exec)
				if len(buffer) >= 100 {
					flush()
				}
			case <-ticker.C:
				flush()
			}
		}
	}()

	// 初始化SQL统计映射
	executionCountsPerSQL := make(map[uint]int64)
	for _, exec := range executions {
		executionCountsPerSQL[exec.SQLID]++
	}
	for sqlID, totalExecs := range executionCountsPerSQL {
		stats.sqlStats[sqlID] = struct{ total, completed, failed int64 }{total: totalExecs}
	}

	doneCh := make(chan struct{})
	go func() {
		for msg := range statCh {
			dbKey := fmt.Sprintf("%d|%s", msg.InstanceID, msg.DatabaseName)
			stat := stats.sqlStats[msg.SQLID]
			if msg.Status == 2 {
				stat.completed++
				stats.completedDBs[dbKey] = struct{}{}
				delete(stats.failedDBs, dbKey)
			}
			if msg.Status == 3 {
				stat.failed++
				if _, ok := stats.completedDBs[dbKey]; !ok {
					stats.failedDBs[dbKey] = struct{}{}
				}
			}
			stats.sqlStats[msg.SQLID] = stat
		}
		doneCh <- struct{}{}
	}()

	type resultBuffer struct {
		mu   sync.Mutex
		rows []map[string]interface{}
	}
	buffers := make(map[uint]*resultBuffer)
	for _, sql := range sqls {
		buffers[sql.ID] = &resultBuffer{}
	}
	batchSize := 1000

	// 按顺序执行每个 SQL
	for _, sql := range sqls {
		start := time.Now()
		s.db.Model(&model.QueryTaskSQL{}).Where("id = ?", sql.ID).Update("started_at", start)

		sqlExecutions := executionsBySQL[sql.ID]
		if len(sqlExecutions) == 0 {
			continue
		}

		var wg sync.WaitGroup
		wg.Add(len(sqlExecutions))

		for _, e := range sqlExecutions {
			sem <- struct{}{}
			go func(exec *model.QueryTaskExecution, currentSQL model.QueryTaskSQL) {
				defer wg.Done()
				defer func() { <-sem }()

				inst := instMap[exec.InstanceID]
				if inst == nil {
					exec.Status = 3
					exec.ErrorMessage = "实例不存在"
					t := time.Now()
					exec.CompletedAt = &t
					statCh <- StatMsg{SQLID: exec.SQLID, InstanceID: exec.InstanceID, DatabaseName: exec.DatabaseName, Status: exec.Status}
					updateQueue <- exec
					return
				}
				poolKey := fmt.Sprintf("%d_%s", exec.InstanceID, exec.DatabaseName)
				poolMu.Lock()
				dbConn, ok := dbConnPool[poolKey]
				poolMu.Unlock()
				var err error
				if !ok {
					dbConn, err = database.NewMySQLGormDB(inst, exec.DatabaseName, maxConn)
					if err != nil {
						exec.Status = 3
						exec.ErrorMessage = "连接数据库失败: " + err.Error()
						t := time.Now()
						exec.CompletedAt = &t
						statCh <- StatMsg{SQLID: exec.SQLID, InstanceID: exec.InstanceID, DatabaseName: exec.DatabaseName, Status: exec.Status}
						updateQueue <- exec
						return
					}
					poolMu.Lock()
					dbConnPool[poolKey] = dbConn
					poolMu.Unlock()
				}
				queryDone := make(chan error, 1)
				var rows []map[string]interface{}
				go func() {
					queryDone <- dbConn.Raw(currentSQL.SQLContent).Scan(&rows).Error
				}()
				select {
				case err = <-queryDone:
					if err != nil {
						exec.Status = 3
						exec.ErrorMessage = "SQL执行失败: " + err.Error()
						t := time.Now()
						exec.CompletedAt = &t
						statCh <- StatMsg{SQLID: exec.SQLID, InstanceID: exec.InstanceID, DatabaseName: exec.DatabaseName, Status: exec.Status}
						updateQueue <- exec
						return
					}
					if len(rows) > 0 {
						var schemaObj model.TableSchema
						_ = json.Unmarshal([]byte(currentSQL.ResultTableSchema), &schemaObj)
						b64Map := make(map[string]string)
						for _, f := range schemaObj.Fields {
							b64 := base64.RawURLEncoding.EncodeToString([]byte(f.Name))
							b64Map[f.Name] = b64
						}
						buf := buffers[currentSQL.ID]
						buf.mu.Lock()
						for _, row := range rows {
							insert := make(map[string]interface{})
							for k, v := range row {
								if b64, ok := b64Map[k]; ok {
									insert[b64] = v
								}
							}
							insert[base64.RawURLEncoding.EncodeToString([]byte("query_task_execution_instance_id"))] = exec.InstanceID
							insert[base64.RawURLEncoding.EncodeToString([]byte("query_task_execution_instance_name"))] = inst.Name
							insert[base64.RawURLEncoding.EncodeToString([]byte("query_task_execution_database_name"))] = exec.DatabaseName
							insert[base64.RawURLEncoding.EncodeToString([]byte("query_task_execution_error_message"))] = exec.ErrorMessage
							buf.rows = append(buf.rows, insert)
							if len(buf.rows) >= batchSize {
								s.db.Table(currentSQL.ResultTableName).CreateInBatches(buf.rows, batchSize)
								buf.rows = buf.rows[:0]
							}
						}
						buf.mu.Unlock()
					}
					exec.Status = 2
					exec.ErrorMessage = ""
					t := time.Now()
					exec.CompletedAt = &t
					statCh <- StatMsg{SQLID: exec.SQLID, InstanceID: exec.InstanceID, DatabaseName: exec.DatabaseName, Status: exec.Status}
					updateQueue <- exec
				case <-time.After(time.Duration(queryTimeoutSec) * time.Second):
					exec.Status = 3
					exec.ErrorMessage = "SQL执行超时"
					t := time.Now()
					exec.CompletedAt = &t
					statCh <- StatMsg{SQLID: exec.SQLID, InstanceID: exec.InstanceID, DatabaseName: exec.DatabaseName, Status: exec.Status}
					updateQueue <- exec
					return
				}
			}(e, sql)
		}
		// 等待当前 SQL 的所有 execution 完成
		wg.Wait()
	}

	close(statCh)
	close(updateQueue) // 所有 goroutine 执行完毕，关闭更新队列
	<-doneCh
	updateWg.Wait() // 等待最后的批量更新完成
	fmt.Printf("Final aggregated stats: completedDBs=%d, failedDBs=%d, sqlStats=%+v\n",
		len(stats.completedDBs), len(stats.failedDBs), stats.sqlStats)

	// SQL全部执行完后，插入剩余数据
	for _, sql := range sqls {
		buf := buffers[sql.ID]
		buf.mu.Lock()
		if len(buf.rows) > 0 {
			s.db.Table(sql.ResultTableName).CreateInBatches(buf.rows, 1000)
			buf.rows = buf.rows[:0]
		}
		buf.mu.Unlock()
	}

	return stats
}

// aggregateAndSaveStats 聚合最终的统计数据并保存到数据库
func (s *QueryTaskRunService) aggregateAndSaveStats(
	task *model.QueryTask,
	sqls []model.QueryTaskSQL,
	executions []model.QueryTaskExecution,
	stats *statResult,
) error {
	totalDBs := 0
	uniqueDBs := make(map[string]struct{})
	for _, e := range executions {
		key := fmt.Sprintf("%d|%s", e.InstanceID, e.DatabaseName)
		uniqueDBs[key] = struct{}{}
	}
	totalDBs = len(uniqueDBs)

	task.TotalDBs = totalDBs
	task.CompletedDBs = len(stats.completedDBs)
	task.FailedDBs = len(stats.failedDBs)

	totalCompletedSQLs := 0
	totalFailedSQLs := 0
	for _, stat := range stats.sqlStats {
		if stat.total > 0 && stat.completed == stat.total {
			totalCompletedSQLs++
		} else if stat.failed > 0 {
			totalFailedSQLs++
		}
	}
	task.CompletedSQLs = totalCompletedSQLs
	task.FailedSQLs = totalFailedSQLs
	s.db.Save(task)

	for _, sql := range sqls {
		if stat, ok := stats.sqlStats[sql.ID]; ok {
			updateFields := map[string]interface{}{
				"completed_dbs": stat.completed,
				"failed_dbs":    stat.failed,
			}
			if stat.total > 0 && stat.completed == stat.total {
				updateFields["completed_sqls"] = 1
			} else {
				updateFields["completed_sqls"] = 0
			}
			if stat.failed > 0 {
				updateFields["failed_sqls"] = 1
			} else {
				updateFields["failed_sqls"] = 0
			}
			if stat.completed+stat.failed == stat.total && stat.total > 0 {
				t := time.Now()
				updateFields["completed_at"] = t
			}
			s.db.Model(&model.QueryTaskSQL{}).Where("id = ?", sql.ID).Updates(updateFields)
		}
	}

	t := time.Now()
	s.db.Model(&model.QueryTask{}).Where("id = ?", task.ID).Update("completed_at", t)
	task.CompletedAt = &t
	task.Status = 2
	return s.db.Save(task).Error
}

// getSetting 获取任务执行相关设置（最大连接数、并发数、查询超时时间）
func (s *QueryTaskRunService) getSetting() (maxConn int, concurrency int, queryTimeoutSec int) {
	configSvc := NewConfigService()
	defaults := model.DefaultConfigValues

	// 获取最大连接数
	maxConnStr, err := configSvc.GetConfig("max_conn")
	if err == nil {
		if val, err := strconv.Atoi(maxConnStr); err == nil {
			maxConn = val
		} else {
			log.Printf("WARN: Could not parse max_conn '%s', using default %d. Error: %v", maxConnStr, defaults.MaxConn, err)
			maxConn = defaults.MaxConn
		}
	} else {
		maxConn = defaults.MaxConn
	}

	// 获取并发数
	concurrencyStr, err := configSvc.GetConfig("concurrency")
	if err == nil {
		if val, err := strconv.Atoi(concurrencyStr); err == nil {
			concurrency = val
		} else {
			log.Printf("WARN: Could not parse concurrency '%s', using default %d. Error: %v", concurrencyStr, defaults.Concurrency, err)
			concurrency = defaults.Concurrency
		}
	} else {
		concurrency = defaults.Concurrency
	}

	// 获取查询超时时间
	queryTimeoutSecStr, err := configSvc.GetConfig("query_timeout_sec")
	if err == nil {
		if val, err := strconv.Atoi(queryTimeoutSecStr); err == nil {
			queryTimeoutSec = val
		} else {
			log.Printf("WARN: Could not parse query_timeout_sec '%s', using default %d. Error: %v", queryTimeoutSecStr, defaults.QueryTimeoutSec, err)
			queryTimeoutSec = defaults.QueryTimeoutSec
		}
	} else {
		queryTimeoutSec = defaults.QueryTimeoutSec
	}

	return
}
