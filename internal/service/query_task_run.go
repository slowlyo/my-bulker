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
	// 4. 执行每条SQL在每个数据库
	type resultBuffer struct {
		mu   sync.Mutex
		rows []map[string]interface{}
	}
	buffers := make(map[uint]*resultBuffer) // key: sqlID
	for _, sql := range sqls {
		buffers[sql.ID] = &resultBuffer{}
	}
	batchSize := 1000
	for _, sql := range sqls {
		completedDBs := 0
		failedDBs := 0
		for i := range executions {
			e := &executions[i]
			if e.SQLID != sql.ID {
				continue
			}
			wg.Add(1)
			sem <- struct{}{} // 占用一个并发槽
			go func(e *model.QueryTaskExecution) {
				defer wg.Done()
				defer func() { <-sem }() // 释放并发槽
				inst := instMap[e.InstanceID]
				if inst == nil {
					e.Status = 3
					e.ErrorMessage = "实例不存在"
					t := time.Now()
					e.CompletedAt = &t
					s.db.Save(e)
					return
				}
				// 连接池key
				poolKey := fmt.Sprintf("%d_%s", e.InstanceID, e.DatabaseName)
				poolMu.Lock()
				dbConn, ok := dbConnPool[poolKey]
				poolMu.Unlock()
				var err error
				if !ok {
					dbConn, err = database.NewMySQLGormDB(inst, e.DatabaseName, 5)
					if err != nil {
						e.Status = 3
						e.ErrorMessage = "连接数据库失败: " + err.Error()
						t := time.Now()
						e.CompletedAt = &t
						s.db.Save(e)
						return
					}
					poolMu.Lock()
					dbConnPool[poolKey] = dbConn
					poolMu.Unlock()
				}
				queryDone := make(chan error, 1)
				var rows []map[string]interface{}
				go func() {
					queryDone <- dbConn.Raw(sql.SQLContent).Scan(&rows).Error
				}()
				select {
				case err = <-queryDone:
					if err != nil {
						e.Status = 3
						e.ErrorMessage = "SQL执行失败: " + err.Error()
						t := time.Now()
						e.CompletedAt = &t
						s.db.Save(e)
						return
					}
					// 成功
					// 收集结果并插入到结果表
					if len(rows) > 0 {
						// 字段名base64映射
						var schemaObj model.TableSchema
						_ = json.Unmarshal([]byte(sql.ResultTableSchema), &schemaObj)
						b64Map := make(map[string]string)
						for _, f := range schemaObj.Fields {
							b64 := base64.RawURLEncoding.EncodeToString([]byte(f.Name))
							b64Map[f.Name] = b64
						}
						buf := buffers[sql.ID]
						buf.mu.Lock()
						for _, row := range rows {
							insert := make(map[string]interface{})
							for k, v := range row {
								if b64, ok := b64Map[k]; ok {
									insert[b64] = v
								}
							}
							// 系统字段
							insert[base64.RawURLEncoding.EncodeToString([]byte("query_task_execution_instance_id"))] = e.InstanceID
							insert[base64.RawURLEncoding.EncodeToString([]byte("query_task_execution_instance_name"))] = inst.Name
							insert[base64.RawURLEncoding.EncodeToString([]byte("query_task_execution_database_name"))] = e.DatabaseName
							insert[base64.RawURLEncoding.EncodeToString([]byte("query_task_execution_error_message"))] = e.ErrorMessage
							buf.rows = append(buf.rows, insert)
							if len(buf.rows) >= batchSize {
								s.db.Table(sql.ResultTableName).CreateInBatches(buf.rows, batchSize)
								buf.rows = buf.rows[:0]
							}
						}
						buf.mu.Unlock()
					}
					e.Status = 2
					e.ErrorMessage = ""
					t := time.Now()
					e.CompletedAt = &t
					s.db.Save(e)
				case <-time.After(time.Duration(queryTimeoutSec) * time.Second):
					e.Status = 3
					e.ErrorMessage = "SQL执行超时"
					t := time.Now()
					e.CompletedAt = &t
					s.db.Save(e)
					return
				}
			}(e)
		}
		wg.Wait()
		// SQL完成时间
		t := time.Now()
		s.db.Model(&model.QueryTaskSQL{}).Where("id = ?", sql.ID).Update("completed_at", t)
		// 更新SQL统计
		s.db.Model(&model.QueryTaskSQL{}).Where("id = ?", sql.ID).
			Updates(map[string]interface{}{
				"completed_dbs": completedDBs,
				"failed_dbs":    failedDBs,
			})
	}
	// SQL全部执行完后，插入剩余数据
	for _, sql := range sqls {
		buf := buffers[sql.ID]
		buf.mu.Lock()
		if len(buf.rows) > 0 {
			s.db.Table(sql.ResultTableName).CreateInBatches(buf.rows, batchSize)
			buf.rows = buf.rows[:0]
		}
		buf.mu.Unlock()
	}
	// 5. 汇总任务统计
	totalCompletedDBs := 0
	totalFailedDBs := 0
	totalCompletedSQLs := 0
	totalFailedSQLs := 0
	for _, sql := range sqls {
		var ssql model.QueryTaskSQL
		s.db.First(&ssql, sql.ID)
		totalCompletedDBs += ssql.CompletedDBs
		totalFailedDBs += ssql.FailedDBs
		if ssql.CompletedDBs == ssql.TotalDBs {
			totalCompletedSQLs++
		}
		if ssql.FailedDBs > 0 {
			totalFailedSQLs++
		}
	}
	s.db.Model(&model.QueryTask{}).Where("id = ?", task.ID).
		Updates(map[string]interface{}{
			"completed_dbs":  totalCompletedDBs,
			"failed_dbs":     totalFailedDBs,
			"completed_sqls": totalCompletedSQLs,
			"failed_sqls":    totalFailedSQLs,
		})
	// 6. 任务完成时间
	t := time.Now()
	s.db.Model(&model.QueryTask{}).Where("id = ?", task.ID).Update("completed_at", t)
	task.CompletedAt = &t
	// 7. 更新任务状态为已完成
	task.Status = 2
	return s.db.Save(&task).Error
}

// getSetting 获取任务执行相关设置（最大连接数、并发数、查询超时时间）
func (s *QueryTaskRunService) getSetting() (maxConn int, concurrency int, queryTimeoutSec int) {
	// 推荐默认值
	maxConn = 10         // 最大连接数
	concurrency = 5      // 并发数
	queryTimeoutSec = 60 // 查询超时时间（秒）
	return
}
