package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"mysql-batch-tools/internal/model"
	"mysql-batch-tools/internal/pkg/database"
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
	return &QueryTaskRunService{db: db}
}

// ResetQueryTask 重置任务统计、执行状态和结果表（用于再次查询前）
func (s *QueryTaskRunService) ResetQueryTask(ctx context.Context, taskID uint) error {
	var task model.QueryTask
	if err := s.db.First(&task, taskID).Error; err != nil {
		return err
	}
	if task.Status == 2 || task.Status == 3 {
		// 1. 重置 executions
		s.db.Model(&model.QueryTaskExecution{}).Where("task_id = ?", taskID).Updates(map[string]interface{}{
			"status":         0,
			"error_message":  "",
			"result_count":   nil,
			"execution_time": nil,
			"started_at":     nil,
			"completed_at":   nil,
		})
		// 2. 重置 SQL 统计字段
		var sqls []model.QueryTaskSQL
		s.db.Where("task_id = ?", taskID).Find(&sqls)
		for _, sql := range sqls {
			s.db.Model(&model.QueryTaskSQL{}).Where("id = ?", sql.ID).Updates(map[string]interface{}{
				"completed_dbs":  0,
				"failed_dbs":     0,
				"completed_sqls": 0,
				"failed_sqls":    0,
				"started_at":     nil,
				"completed_at":   nil,
			})
			// 4. 清空结果表
			s.db.Exec("DELETE FROM `" + sql.ResultTableName + "`")
		}
		// 3. 重置任务统计字段
		s.db.Model(&model.QueryTask{}).Where("id = ?", taskID).Updates(map[string]interface{}{
			"completed_dbs":  0,
			"failed_dbs":     0,
			"completed_sqls": 0,
			"failed_sqls":    0,
			"started_at":     nil,
			"completed_at":   nil,
			"status":         0,
		})
	}
	return nil
}

// Run 执行查询任务（允许重复执行）
func (s *QueryTaskRunService) Run(ctx context.Context, taskID uint) error {
	_, concurrency, queryTimeoutSec := s.getSetting()
	// 1. 查询任务及SQL
	var task model.QueryTask
	if err := s.db.First(&task, taskID).Error; err != nil {
		return err
	}
	var sqls []model.QueryTaskSQL
	if err := s.db.Where("task_id = ?", taskID).Order("sql_order ASC").Find(&sqls).Error; err != nil {
		return err
	}
	// 2. 查询所有执行明细
	var executions []model.QueryTaskExecution
	if err := s.db.Where("task_id = ?", taskID).Find(&executions).Error; err != nil {
		return err
	}
	// 3. 查询所有实例信息
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
		return err
	}
	instMap := make(map[uint]*model.Instance)
	for i := range instances {
		instMap[instances[i].ID] = &instances[i]
	}
	startTime := time.Now()
	if task.StartedAt == nil {
		task.StartedAt = &startTime
		s.db.Model(&model.QueryTask{}).Where("id = ?", task.ID).Update("started_at", startTime)
	}
	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	// 连接池：key=instanceID+dbName，value=*gorm.DB
	dbConnPool := make(map[string]*gorm.DB)
	var poolMu sync.Mutex

	// 统计用channel和map (移到这里，在所有goroutine启动前初始化)
	type StatMsg struct {
		SQLID  uint
		Status int8
	}
	statCh := make(chan StatMsg, len(executions))
	statResult := struct {
		completedDBs int64
		failedDBs    int64
		sqlStats     map[uint]struct{ total, completed, failed int64 }
	}{
		sqlStats: make(map[uint]struct{ total, completed, failed int64 }),
	}

	doneCh := make(chan struct{})
	go func() {
		for msg := range statCh {
			if msg.Status == 2 {
				statResult.completedDBs++
			}
			if msg.Status == 3 {
				statResult.failedDBs++
			}
			stat := statResult.sqlStats[msg.SQLID]
			stat.total++
			if msg.Status == 2 {
				stat.completed++
			}
			if msg.Status == 3 {
				stat.failed++
			}
			statResult.sqlStats[msg.SQLID] = stat
		}
		doneCh <- struct{}{}
	}()

	// 4. 执行每条SQL在每个数据库 (改为直接遍历 executions)
	// 先记录SQL的started_at，因为executions的执行顺序是异步的
	for _, sql := range sqls {
		start := time.Now()
		s.db.Model(&model.QueryTaskSQL{}).Where("id = ?", sql.ID).Update("started_at", start)
	}

	// 定义结果缓冲区 (仍需保留，但填充逻辑在goroutine内)
	type resultBuffer struct {
		mu   sync.Mutex
		rows []map[string]interface{}
	}
	buffers := make(map[uint]*resultBuffer) // key: sqlID
	for _, sql := range sqls {
		buffers[sql.ID] = &resultBuffer{}
	}
	batchSize := 1000

	// 遍历所有执行明细，启动并发任务
	for i := range executions {
		e := &executions[i] // 获取当前执行记录的指针

		wg.Add(1)
		sem <- struct{}{} // 占用一个并发槽
		go func(exec *model.QueryTaskExecution, currentSQL model.QueryTaskSQL) {
			defer wg.Done()
			defer func() { <-sem }() // 释放并发槽

			inst := instMap[exec.InstanceID]
			if inst == nil {
				exec.Status = 3
				exec.ErrorMessage = "实例不存在"
				t := time.Now()
				exec.CompletedAt = &t
				s.db.Save(exec)
				statCh <- StatMsg{SQLID: exec.SQLID, Status: exec.Status}
				return
			}
			// 连接池key
			poolKey := fmt.Sprintf("%d_%s", exec.InstanceID, exec.DatabaseName)
			poolMu.Lock()
			dbConn, ok := dbConnPool[poolKey]
			poolMu.Unlock()
			var err error
			if !ok {
				dbConn, err = database.NewMySQLGormDB(inst, exec.DatabaseName, 5)
				if err != nil {
					exec.Status = 3
					exec.ErrorMessage = "连接数据库失败: " + err.Error()
					t := time.Now()
					exec.CompletedAt = &t
					s.db.Save(exec)
					statCh <- StatMsg{SQLID: exec.SQLID, Status: exec.Status}
					return
				}
				poolMu.Lock()
				dbConnPool[poolKey] = dbConn
				poolMu.Unlock()
			}
			queryDone := make(chan error, 1)
			var rows []map[string]interface{}
			go func() {
				queryDone <- dbConn.Raw(currentSQL.SQLContent).Scan(&rows).Error // 注意这里使用 currentSQL
			}()
			select {
			case err = <-queryDone:
				if err != nil {
					exec.Status = 3
					exec.ErrorMessage = "SQL执行失败: " + err.Error()
					t := time.Now()
					exec.CompletedAt = &t
					s.db.Save(exec)
					statCh <- StatMsg{SQLID: exec.SQLID, Status: exec.Status}
					return
				}
				// 成功
				// 收集结果并插入到结果表
				if len(rows) > 0 {
					// 字段名base64映射
					var schemaObj model.TableSchema
					_ = json.Unmarshal([]byte(currentSQL.ResultTableSchema), &schemaObj)
					b64Map := make(map[string]string)
					for _, f := range schemaObj.Fields {
						b64 := base64.RawURLEncoding.EncodeToString([]byte(f.Name))
						b64Map[f.Name] = b64
					}
					buf := buffers[currentSQL.ID] // 注意这里使用 currentSQL
					buf.mu.Lock()
					for _, row := range rows {
						insert := make(map[string]interface{})
						for k, v := range row {
							if b64, ok := b64Map[k]; ok {
								insert[b64] = v
							}
						}
						// 系统字段
						insert[base64.RawURLEncoding.EncodeToString([]byte("query_task_execution_instance_id"))] = exec.InstanceID
						insert[base64.RawURLEncoding.EncodeToString([]byte("query_task_execution_instance_name"))] = inst.Name
						insert[base64.RawURLEncoding.EncodeToString([]byte("query_task_execution_database_name"))] = exec.DatabaseName
						insert[base64.RawURLEncoding.EncodeToString([]byte("query_task_execution_error_message"))] = exec.ErrorMessage
						buf.rows = append(buf.rows, insert)
						if len(buf.rows) >= batchSize {
							s.db.Table(currentSQL.ResultTableName).CreateInBatches(buf.rows, batchSize) // 注意这里使用 currentSQL
							buf.rows = buf.rows[:0]
						}
					}
					buf.mu.Unlock()
				}
				exec.Status = 2
				exec.ErrorMessage = ""
				t := time.Now()
				exec.CompletedAt = &t
				s.db.Save(exec)
				statCh <- StatMsg{SQLID: exec.SQLID, Status: exec.Status}
			case <-time.After(time.Duration(queryTimeoutSec) * time.Second):
				exec.Status = 3
				exec.ErrorMessage = "SQL执行超时"
				t := time.Now()
				exec.CompletedAt = &t
				s.db.Save(exec)
				statCh <- StatMsg{SQLID: exec.SQLID, Status: exec.Status}
				return
			}
		}(e, s.findSQLByID(sqls, e.SQLID)) // 传入当前的 execution 和对应的 QueryTaskSQL
	}

	// 等待所有并发任务完成
	wg.Wait()
	fmt.Println("All worker goroutines finished. Closing stat channel.")

	// 关闭统计channel，等待统计完成
	close(statCh)
	<-doneCh
	fmt.Printf("Final aggregated stats: completedDBs=%d, failedDBs=%d, sqlStats=%+v\n",
		statResult.completedDBs, statResult.failedDBs, statResult.sqlStats)

	// SQL全部执行完后，插入剩余数据（遍历sqls，因为buffers是按sql.ID存储的）
	for _, sql := range sqls {
		buf := buffers[sql.ID]
		buf.mu.Lock()
		if len(buf.rows) > 0 {
			s.db.Table(sql.ResultTableName).CreateInBatches(buf.rows, batchSize)
			buf.rows = buf.rows[:0]
		}
		buf.mu.Unlock()
	}

	// 汇总任务统计 (去重统计数据库)
	dbSet := make(map[string]struct{})
	completedDBSet := make(map[string]struct{})
	failedDBSet := make(map[string]struct{})
	for _, exec := range executions {
		key := fmt.Sprintf("%d|%s", exec.InstanceID, exec.DatabaseName)
		dbSet[key] = struct{}{}
		if exec.Status == 2 {
			completedDBSet[key] = struct{}{}
		}
		if exec.Status == 3 {
			failedDBSet[key] = struct{}{}
		}
	}
	task.TotalDBs = len(dbSet)
	task.CompletedDBs = len(completedDBSet)
	task.FailedDBs = len(failedDBSet)
	// SQL统计仍按原逻辑
	totalCompletedSQLs := 0
	totalFailedSQLs := 0
	for _, stat := range statResult.sqlStats {
		if stat.total > 0 && stat.completed == stat.total {
			totalCompletedSQLs++
		} else if stat.failed > 0 {
			totalFailedSQLs++
		}
	}
	task.CompletedSQLs = totalCompletedSQLs
	task.FailedSQLs = totalFailedSQLs
	s.db.Save(&task)

	// 更新每条 SQL 的统计字段（新增）
	for _, sql := range sqls {
		if stat, ok := statResult.sqlStats[sql.ID]; ok {
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

	// 6. 任务完成时间
	t := time.Now()
	s.db.Model(&model.QueryTask{}).Where("id = ?", task.ID).Update("completed_at", t)
	task.CompletedAt = &t
	// 7. 更新任务状态为已完成
	task.Status = 2
	return s.db.Save(&task).Error
}

// findSQLByID 辅助函数，根据ID查找QueryTaskSQL (新增)
func (s *QueryTaskRunService) findSQLByID(sqls []model.QueryTaskSQL, sqlID uint) model.QueryTaskSQL {
	for _, sql := range sqls {
		if sql.ID == sqlID {
			return sql
		}
	}
	return model.QueryTaskSQL{}
}

// getSetting 获取任务执行相关设置（最大连接数、并发数、查询超时时间）
func (s *QueryTaskRunService) getSetting() (maxConn int, concurrency int, queryTimeoutSec int) {
	// 推荐默认值
	maxConn = 10         // 最大连接数
	concurrency = 10     // 并发数
	queryTimeoutSec = 60 // 查询超时时间（秒）
	return
}
