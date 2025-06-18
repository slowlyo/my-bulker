package service

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"mysql-batch-tools/internal/model"

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
	sqlStatements, err := s.splitSQLStatements(req.SQLContent)
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

			// 推断表结构
			tableSchema := s.inferTableSchema(sqlContent)

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

// splitSQLStatements 拆分SQL语句
func (s *QueryTaskCreatorService) splitSQLStatements(sqlContent string) ([]string, error) {
	// 移除注释
	sqlContent = s.removeComments(sqlContent)

	// 按分号拆分，但忽略字符串中的分号
	statements := s.splitSQLBySemicolon(sqlContent)

	// 过滤空语句
	var result []string
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt != "" {
			result = append(result, stmt)
		}
	}

	if len(result) == 0 {
		return nil, fmt.Errorf("未找到有效的SQL语句")
	}

	return result, nil
}

// removeComments 移除SQL注释
func (s *QueryTaskCreatorService) removeComments(sql string) string {
	// 移除单行注释
	singleLineComment := regexp.MustCompile(`--.*$`)
	sql = singleLineComment.ReplaceAllString(sql, "")

	// 移除多行注释
	multiLineComment := regexp.MustCompile(`/\*.*?\*/`)
	sql = multiLineComment.ReplaceAllString(sql, "")

	return sql
}

// splitSQLBySemicolon 按分号拆分SQL，但忽略字符串中的分号
func (s *QueryTaskCreatorService) splitSQLBySemicolon(sql string) []string {
	var statements []string
	var current strings.Builder
	var inString bool
	var stringChar byte

	for i := 0; i < len(sql); i++ {
		char := sql[i]

		if !inString && (char == '\'' || char == '"') {
			inString = true
			stringChar = char
			current.WriteByte(char)
		} else if inString && char == stringChar {
			// 检查是否为转义字符
			if i > 0 && sql[i-1] == '\\' {
				current.WriteByte(char)
			} else {
				inString = false
				current.WriteByte(char)
			}
		} else if !inString && char == ';' {
			statements = append(statements, current.String())
			current.Reset()
		} else {
			current.WriteByte(char)
		}
	}

	// 添加最后一个语句
	if current.Len() > 0 {
		statements = append(statements, current.String())
	}

	return statements
}

// generateResultTableName 生成结果表名
func (s *QueryTaskCreatorService) generateResultTableName(taskID uint, sqlOrder int) string {
	return fmt.Sprintf("task_%d_sql_%d_result", taskID, sqlOrder)
}

// inferTableSchema 推断表结构
func (s *QueryTaskCreatorService) inferTableSchema(sqlContent string) string {
	// 简化的表结构推断
	// 这里可以根据SQL类型返回不同的默认结构
	// 对于SELECT语句，可以尝试解析字段信息
	// 目前返回一个通用的表结构模板

	sqlUpper := strings.ToUpper(strings.TrimSpace(sqlContent))

	if strings.HasPrefix(sqlUpper, "SELECT") {
		// SELECT语句：尝试解析字段
		return s.inferSelectTableSchema(sqlContent)
	} else {
		// 其他语句：返回通用结构
		return s.getGenericTableSchema()
	}
}

// inferSelectTableSchema 推断SELECT语句的表结构
func (s *QueryTaskCreatorService) inferSelectTableSchema(sqlContent string) string {
	// 简化的SELECT字段解析
	// 这里可以实现更复杂的SQL解析逻辑

	// 提取SELECT和FROM之间的内容
	selectIndex := strings.Index(strings.ToUpper(sqlContent), "SELECT")
	fromIndex := strings.Index(strings.ToUpper(sqlContent), "FROM")

	if selectIndex == -1 || fromIndex == -1 || fromIndex <= selectIndex {
		return s.getGenericTableSchema()
	}

	selectClause := sqlContent[selectIndex+6 : fromIndex]
	fields := strings.Split(selectClause, ",")

	var tableFields []model.TableField
	for i, field := range fields {
		field = strings.TrimSpace(field)
		if field == "" {
			continue
		}

		// 提取字段名（去除别名）
		fieldName := field
		if asIndex := strings.Index(strings.ToUpper(field), " AS "); asIndex != -1 {
			fieldName = strings.TrimSpace(field[:asIndex])
		}

		// 如果字段名包含表名，只取字段部分
		if dotIndex := strings.LastIndex(fieldName, "."); dotIndex != -1 {
			fieldName = fieldName[dotIndex+1:]
		}

		// 去除引号
		fieldName = strings.Trim(fieldName, "`\"'")

		if fieldName == "" {
			fieldName = fmt.Sprintf("field_%d", i+1)
		}

		tableFields = append(tableFields, model.TableField{
			Name:    fieldName,
			Type:    "TEXT", // 默认类型
			Comment: fmt.Sprintf("字段 %d", i+1),
		})
	}

	if len(tableFields) == 0 {
		return s.getGenericTableSchema()
	}

	schema := model.TableSchema{Fields: tableFields}
	schemaJSON, err := schema.Value()
	if err != nil {
		return s.getGenericTableSchema()
	}

	// 将字节数组转换为字符串
	if bytes, ok := schemaJSON.([]byte); ok {
		return string(bytes)
	}

	return s.getGenericTableSchema()
}

// getGenericTableSchema 获取通用表结构
func (s *QueryTaskCreatorService) getGenericTableSchema() string {
	schema := model.TableSchema{
		Fields: []model.TableField{
			{
				Name:    "result",
				Type:    "TEXT",
				Comment: "查询结果",
			},
		},
	}
	schemaJSON, err := schema.Value()
	if err != nil {
		// 如果序列化失败，返回一个简单的JSON字符串
		return `{"fields":[{"name":"result","type":"TEXT","comment":"查询结果"}]}`
	}

	// 将字节数组转换为字符串
	if bytes, ok := schemaJSON.([]byte); ok {
		return string(bytes)
	}

	// 如果类型转换失败，返回默认JSON字符串
	return `{"fields":[{"name":"result","type":"TEXT","comment":"查询结果"}]}`
}
