package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"

	"mysql-batch-tools/internal/model"
	"mysql-batch-tools/internal/pkg/database"
	"mysql-batch-tools/internal/pkg/sql_parse"

	"gorm.io/gorm"
)

// QueryTaskCreatorService 查询任务创建服务
type QueryTaskCreatorService struct {
	db *gorm.DB
}

// NewQueryTaskCreatorService 创建查询任务创建服务
func NewQueryTaskCreatorService(db *gorm.DB) *QueryTaskCreatorService {
	return &QueryTaskCreatorService{db: db}
}

// Create 创建查询任务
func (s *QueryTaskCreatorService) Create(ctx context.Context, req *model.CreateQueryTaskRequest) (*model.QueryTask, error) {
	// 检查任务名称是否已存在
	if s.checkTaskNameExists(req.TaskName) {
		return nil, fmt.Errorf("任务名称已存在")
	}

	// 确定目标数据库列表
	targetDBs, err := s.determineTargetDatabases(req.DatabaseMode, req.SelectedDBs, req.InstanceIDs)
	if err != nil {
		return nil, fmt.Errorf("确定目标数据库失败: %v", err)
	}

	// 拆分SQL语句
	sqlStatements, err := sql_parse.SplitSQLStatements(req.SQLContent)
	if err != nil {
		return nil, fmt.Errorf("SQL语句拆分失败: %v", err)
	}

	// 使用事务创建任务和SQL语句
	var task *model.QueryTask
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// 创建任务
		task = &model.QueryTask{
			TaskName:      req.TaskName,
			Description:   req.Description,
			Status:        0, // 待执行
			TotalDBs:      len(targetDBs),
			CompletedDBs:  0,
			FailedDBs:     0,
			TotalSQLs:     len(sqlStatements),
			CompletedSQLs: 0,
			FailedSQLs:    0,
		}

		// 将目标数据库列表转换为JSON字符串
		databasesJSON, err := targetDBs.Value()
		if err != nil {
			return fmt.Errorf("序列化数据库列表失败: %v", err)
		}

		// 将字节数组转换为字符串
		if bytes, ok := databasesJSON.([]byte); ok {
			task.Databases = string(bytes)
		} else {
			return fmt.Errorf("数据库列表序列化结果类型错误")
		}

		if err := tx.Create(task).Error; err != nil {
			return fmt.Errorf("创建任务失败: %v", err)
		}

		// 创建SQL语句记录
		for i, sqlContent := range sqlStatements {
			// 生成结果表名
			resultTableName := s.generateResultTableName(task.ID, i+1)

			// 获取推断字段名，优先用请求参数第一个实例和数据库
			var headers []string
			if len(targetDBs) > 0 {
				headers = s.inferTableSchemaWithInstance(sqlContent, targetDBs[0].InstanceID, targetDBs[0].DatabaseName)
			} else {
				headers = sql_parse.DetectResultHeaders(sqlContent)
			}
			tableFields := []model.TableField{
				{Name: "query_task_execution_id", Type: "UINT", Comment: "主键ID"},
				{Name: "query_task_execution_instance_id", Type: "UINT", Comment: "实例ID"},
				{Name: "query_task_execution_instance_name", Type: "TEXT", Comment: "实例名称"},
				{Name: "query_task_execution_database_name", Type: "TEXT", Comment: "数据库名称"},
				{Name: "query_task_execution_error_message", Type: "TEXT", Comment: "错误信息"},
			}
			for i, h := range headers {
				if h == "" {
					h = "field_" + fmt.Sprint(i+1)
				}
				tableFields = append(tableFields, model.TableField{
					Name:    h,
					Type:    "TEXT",
					Comment: "查询字段",
				})
			}
			schema := model.TableSchema{Fields: tableFields}
			schemaJSON, _ := schema.Value()
			tableSchema := ""
			if bytes, ok := schemaJSON.([]byte); ok {
				tableSchema = string(bytes)
			} else {
				tableSchema = `{"fields":[{"name":"result","type":"TEXT","comment":"查询结果"}]}`
			}

			fmt.Println()
			fmt.Println()
			fmt.Println()
			fmt.Println(tableSchema)
			fmt.Println()
			fmt.Println()

			// 解析表结构字段
			var schemaObj model.TableSchema
			_ = json.Unmarshal([]byte(tableSchema), &schemaObj)
			// 构建建表SQL
			var cols []string
			for _, f := range schemaObj.Fields {
				b64 := base64.RawURLEncoding.EncodeToString([]byte(f.Name))
				if f.Name == "query_task_execution_id" {
					cols = append(cols, fmt.Sprintf("`%s` INTEGER PRIMARY KEY AUTOINCREMENT", b64))
				} else {
					typeStr := f.Type
					if typeStr == "" {
						typeStr = "TEXT"
					}
					cols = append(cols, fmt.Sprintf("`%s` %s", b64, typeStr))
				}
			}
			createTableSQL := fmt.Sprintf("CREATE TABLE IF NOT EXISTS `%s` (%s)", resultTableName, strings.Join(cols, ", "))
			if err := tx.Exec(createTableSQL).Error; err != nil {
				return fmt.Errorf("建表失败: %v", err)
			}

			sqlRecord := &model.QueryTaskSQL{
				TaskID:            task.ID,
				SQLContent:        strings.TrimSpace(sqlContent),
				SQLOrder:          i + 1,
				ResultTableName:   resultTableName,
				ResultTableSchema: tableSchema,
				TotalDBs:          len(targetDBs),
				CompletedDBs:      0,
				FailedDBs:         0,
			}

			if err := tx.Create(sqlRecord).Error; err != nil {
				return fmt.Errorf("创建SQL记录失败: %v", err)
			}

			// 新增：为每个目标数据库创建执行明细
			var executions []model.QueryTaskExecution
			for _, db := range targetDBs {
				executions = append(executions, model.QueryTaskExecution{
					TaskID:       task.ID,
					SQLID:        sqlRecord.ID,
					InstanceID:   db.InstanceID,
					DatabaseName: db.DatabaseName,
					Status:       0, // 待执行
				})
			}
			if len(executions) > 0 {
				if err := tx.Create(&executions).Error; err != nil {
					return fmt.Errorf("创建SQL执行明细失败: %v", err)
				}
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return task, nil
}

// checkTaskNameExists 检查任务名称是否已存在
func (s *QueryTaskCreatorService) checkTaskNameExists(taskName string) bool {
	var count int64
	s.db.Model(&model.QueryTask{}).Where("task_name = ?", taskName).Count(&count)
	return count > 0
}

// determineTargetDatabases 确定目标数据库列表
func (s *QueryTaskCreatorService) determineTargetDatabases(mode string, selectedDBs model.TaskDatabases, instanceIDs []uint) (model.TaskDatabases, error) {
	if mode == "include" {
		// 包含模式：直接使用选中的数据库，但需要填充实例名称
		return s.fillInstanceNames(selectedDBs), nil
	} else if mode == "exclude" {
		// 排除模式：获取指定实例的所有数据库，排除选中的数据库
		var allDBs []model.Database
		if err := s.db.Where("instance_id IN ?", instanceIDs).Find(&allDBs).Error; err != nil {
			return nil, fmt.Errorf("获取数据库列表失败: %v", err)
		}

		// 创建排除集合
		excludeSet := make(map[string]bool)
		for _, db := range selectedDBs {
			key := fmt.Sprintf("%d_%s", db.InstanceID, db.DatabaseName)
			excludeSet[key] = true
		}

		// 过滤出未被排除的数据库
		var targetDBs model.TaskDatabases
		for _, db := range allDBs {
			key := fmt.Sprintf("%d_%s", db.InstanceID, db.Name)
			if !excludeSet[key] {
				targetDBs = append(targetDBs, model.TaskDatabase{
					InstanceID:   db.InstanceID,
					DatabaseName: db.Name,
				})
			}
		}

		return s.fillInstanceNames(targetDBs), nil
	}

	return nil, fmt.Errorf("无效的数据库选择模式: %s", mode)
}

// fillInstanceNames 填充实例名称
func (s *QueryTaskCreatorService) fillInstanceNames(databases model.TaskDatabases) model.TaskDatabases {
	if len(databases) == 0 {
		return databases
	}

	// 收集所有实例ID
	instanceIDs := make([]uint, 0, len(databases))
	instanceIDSet := make(map[uint]bool)
	for _, db := range databases {
		if !instanceIDSet[db.InstanceID] {
			instanceIDs = append(instanceIDs, db.InstanceID)
			instanceIDSet[db.InstanceID] = true
		}
	}

	// 批量查询实例信息
	var instances []model.Instance
	if err := s.db.Where("id IN ?", instanceIDs).Find(&instances).Error; err != nil {
		// 如果查询失败，返回原始数据
		return databases
	}

	// 创建实例ID到名称的映射
	instanceNameMap := make(map[uint]string)
	for _, instance := range instances {
		instanceNameMap[instance.ID] = instance.Name
	}

	// 填充实例名称
	for i := range databases {
		if name, exists := instanceNameMap[databases[i].InstanceID]; exists {
			databases[i].InstanceName = name
		} else {
			databases[i].InstanceName = fmt.Sprintf("实例%d", databases[i].InstanceID)
		}
	}

	return databases
}

// generateResultTableName 生成结果表名
func (s *QueryTaskCreatorService) generateResultTableName(taskID uint, sqlOrder int) string {
	return fmt.Sprintf("task_%d_sql_%d_result", taskID, sqlOrder)
}

// inferTableSchemaWithInstance 推断表结构
func (s *QueryTaskCreatorService) inferTableSchemaWithInstance(sqlContent string, instanceID uint, dbName string) []string {
	headers := sql_parse.DetectResultHeaders(sqlContent)
	needRealCols := false
	for _, h := range headers {
		if strings.Contains(h, "*") {
			needRealCols = true
			break
		}
	}
	if needRealCols && instanceID > 0 && dbName != "" {
		var instance model.Instance
		if err := s.db.First(&instance, instanceID).Error; err == nil {
			dbConn, err := database.NewMySQLGormDB(&instance, dbName, 2)
			if err == nil {
				sqlToExec := sqlContent
				if !strings.Contains(strings.ToLower(sqlContent), "limit ") {
					sqlToExec = sqlContent + " LIMIT 1"
				}
				rows, err := dbConn.Raw(sqlToExec).Rows()
				if err == nil {
					cols, err2 := rows.Columns()
					if err2 == nil && len(cols) > 0 {
						headers = []string{}
						for _, c := range cols {
							headers = append(headers, c)
						}
					}
					rows.Close()
				}
			}
		}
	}
	return headers
}
