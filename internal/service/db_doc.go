package service

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"my-bulker/internal/model"
	"my-bulker/internal/pkg/database"

	"gorm.io/gorm"
)

// DbDocService 数据库文档服务
type DbDocService struct {
	db *gorm.DB
}

// NewDbDocService 创建数据库文档服务
func NewDbDocService(db *gorm.DB) *DbDocService {
	return &DbDocService{db: db}
}

// CreateTask 创建任务
func (s *DbDocService) CreateTask(req *model.DbDocTaskRequest) (*model.DbDocTask, error) {
	task := &model.DbDocTask{
		TaskName:     req.TaskName,
		InstanceID:   req.InstanceID,
		DatabaseID:   req.DatabaseID,
		Database:     req.Database,
		OutputPath:   req.OutputPath,
		Config:       req.Config,
		SyncInterval: req.SyncInterval,
		IsEnable:     req.IsEnable,
	}

	if err := s.db.Create(task).Error; err != nil {
		return nil, err
	}

	return task, nil
}

// UpdateTask 更新任务
func (s *DbDocService) UpdateTask(id uint, req *model.DbDocTaskRequest) (*model.DbDocTask, error) {
	var task model.DbDocTask
	if err := s.db.First(&task, id).Error; err != nil {
		return nil, err
	}

	task.TaskName = req.TaskName
	task.InstanceID = req.InstanceID
	task.DatabaseID = req.DatabaseID
	task.Database = req.Database
	task.OutputPath = req.OutputPath
	task.SyncInterval = req.SyncInterval
	task.IsEnable = req.IsEnable

	if err := s.db.Save(&task).Error; err != nil {
		return nil, err
	}

	return &task, nil
}

// DeleteTask 删除任务
func (s *DbDocService) DeleteTask(id uint) error {
	return s.db.Delete(&model.DbDocTask{}, id).Error
}

// GetTask 获取任务详情
func (s *DbDocService) GetTask(id uint) (*model.DbDocTask, error) {
	var task model.DbDocTask
	if err := s.db.Preload("Instance").First(&task, id).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

// ListTasks 获取任务列表
func (s *DbDocService) ListTasks(req *model.DbDocTaskListRequest) ([]model.DbDocTask, int64, error) {
	var tasks []model.DbDocTask
	var total int64

	query := s.db.Model(&model.DbDocTask{}).Preload("Instance")
	if req.TaskName != "" {
		query = query.Where("task_name LIKE ?", "%"+req.TaskName+"%")
	}

	if req.InstanceID > 0 {
		query = query.Where("instance_id = ?", req.InstanceID)
	}

	if req.IsEnable != nil {
		query = query.Where("is_enable = ?", *req.IsEnable)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Offset(req.Pagination.GetOffset()).Limit(req.Pagination.GetLimit()).Order("id DESC").Find(&tasks).Error; err != nil {
		return nil, 0, err
	}

	return tasks, total, nil
}

// RunTask 手动运行任务
func (s *DbDocService) RunTask(id uint) error {
	task, err := s.GetTask(id)
	if err != nil {
		return err
	}

	// 更新状态为运行中 (这里可以简单处理，因为生成通常很快)
	now := time.Now()
	task.LastRunAt = &now

	err = s.GenerateDoc(task)
	if err != nil {
		task.LastStatus = 2
		task.LastError = err.Error()
	} else {
		task.LastStatus = 1
		task.LastError = ""
	}

	return s.db.Save(task).Error
}

// GenerateDoc 生成文档的核心逻辑
func (s *DbDocService) GenerateDoc(task *model.DbDocTask) error {
	// 1. 获取实例连接
	targetDB, err := database.NewMySQLGormDB(&task.Instance, task.Database, 10)
	if err != nil {
		return fmt.Errorf("连接数据库失败: %v", err)
	}

	// 2. 获取所有表及其描述
	type TableInfo struct {
		TableName    string `gorm:"column:TABLE_NAME"`
		TableComment string `gorm:"column:TABLE_COMMENT"`
	}
	var tables []TableInfo
	err = targetDB.Raw(`
		SELECT TABLE_NAME, TABLE_COMMENT 
		FROM information_schema.TABLES 
		WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
	`, task.Database).Scan(&tables).Error
	if err != nil {
		return fmt.Errorf("获取表列表失败: %v", err)
	}

	// 3. 批量获取所有表的字段信息
	type ColumnInfo struct {
		TableName     string  `gorm:"column:TABLE_NAME"`
		ColumnName    string  `gorm:"column:COLUMN_NAME"`
		ColumnType    string  `gorm:"column:COLUMN_TYPE"`
		IsNullable    string  `gorm:"column:IS_NULLABLE"`
		ColumnDefault *string `gorm:"column:COLUMN_DEFAULT"`
		ColumnComment string  `gorm:"column:COLUMN_COMMENT"`
	}
	var allColumns []ColumnInfo
	err = targetDB.Raw(`
		SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
		FROM information_schema.COLUMNS
		WHERE TABLE_SCHEMA = ?
		ORDER BY TABLE_NAME, ORDINAL_POSITION
	`, task.Database).Scan(&allColumns).Error
	if err != nil {
		return fmt.Errorf("批量获取字段信息失败: %v", err)
	}

	// 按表名对字段进行分组
	columnsByTable := make(map[string][]ColumnInfo)
	for _, col := range allColumns {
		columnsByTable[col.TableName] = append(columnsByTable[col.TableName], col)
	}

	// 4. 批量获取所有表的索引信息
	type IndexInfo struct {
		TableName  string `gorm:"column:TABLE_NAME"`
		IndexName  string `gorm:"column:INDEX_NAME"`
		NonUnique  int    `gorm:"column:NON_UNIQUE"`
		ColumnName string `gorm:"column:COLUMN_NAME"`
	}
	var allIndexes []IndexInfo
	err = targetDB.Raw(`
		SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, COLUMN_NAME
		FROM information_schema.STATISTICS
		WHERE TABLE_SCHEMA = ?
		ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
	`, task.Database).Scan(&allIndexes).Error
	if err != nil {
		return fmt.Errorf("批量获取索引信息失败: %v", err)
	}

	// 按表名对索引进行分组
	indexesByTable := make(map[string]map[string][]string) // TableName -> IndexName -> [ColumnNames]
	indexUniqueness := make(map[string]map[string]bool)    // TableName -> IndexName -> IsUnique
	for _, idx := range allIndexes {
		if _, ok := indexesByTable[idx.TableName]; !ok {
			indexesByTable[idx.TableName] = make(map[string][]string)
			indexUniqueness[idx.TableName] = make(map[string]bool)
		}
		indexesByTable[idx.TableName][idx.IndexName] = append(indexesByTable[idx.TableName][idx.IndexName], idx.ColumnName)
		indexUniqueness[idx.TableName][idx.IndexName] = idx.NonUnique == 0
	}

	// 5. 构建 Markdown 内容
	mdContent := fmt.Sprintf("# 数据库文档: %s\n\n", task.Database)
	mdContent += fmt.Sprintf("- 生成时间: %s\n", time.Now().Format("2006-01-02 15:04:05"))
	mdContent += fmt.Sprintf("- 数据库名称: %s\n", task.Database)
	mdContent += fmt.Sprintf("- 实例地址: %s:%d\n\n", task.Instance.Host, task.Instance.Port)

	mdContent += "## 目录\n\n"
	for _, table := range tables {
		comment := table.TableComment
		if comment == "" {
			comment = "无描述"
		}
		mdContent += fmt.Sprintf("- [%s (%s)](#%s)\n", table.TableName, comment, table.TableName)
	}
	mdContent += "\n---\n\n"

	for _, table := range tables {
		mdContent += fmt.Sprintf("### <a name=\"%s\"></a> %s\n\n", table.TableName, table.TableName)
		if table.TableComment != "" {
			mdContent += fmt.Sprintf("**表描述**: %s\n\n", table.TableComment)
		}

		mdContent += "#### 字段信息\n\n"
		mdContent += "| 字段名 | 类型 | 允许为空 | 默认值 | 备注 |\n"
		mdContent += "| :--- | :--- | :--- | :--- | :--- |\n"

		columns := columnsByTable[table.TableName]
		for _, col := range columns {
			defVal := "-"
			if col.ColumnDefault != nil {
				defVal = *col.ColumnDefault
			}
			comment := col.ColumnComment
			if comment == "" {
				comment = "-"
			}
			mdContent += fmt.Sprintf("| %s | %s | %s | %s | %s |\n",
				col.ColumnName, col.ColumnType, col.IsNullable, defVal, comment)
		}
		mdContent += "\n"

		// 补充索引信息
		mdContent += "#### 索引信息\n\n"
		mdContent += "| 索引名 | 唯一性 | 包含字段 |\n"
		mdContent += "| :--- | :--- | :--- |\n"
		tableIndexes := indexesByTable[table.TableName]
		if len(tableIndexes) == 0 {
			mdContent += "| - | - | - |\n"
		} else {
			for idxName, cols := range tableIndexes {
				unique := "普通索引"
				if idxName == "PRIMARY" {
					unique = "主键"
				} else if indexUniqueness[table.TableName][idxName] {
					unique = "唯一索引"
				}
				mdContent += fmt.Sprintf("| %s | %s | %s |\n",
					idxName, unique, fmt.Sprintf("`%s`", fmt.Sprintf("%v", cols)))
			}
		}
		mdContent += "\n"
	}

	// 6. 写入文件
	outputPath := task.OutputPath
	if !filepath.IsAbs(outputPath) {
		// 如果不是绝对路径，可以根据需求处理，这里假设是相对于当前目录
		absPath, _ := filepath.Abs(outputPath)
		outputPath = absPath
	}

	// 确保目录存在
	dir := filepath.Dir(outputPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("创建目录失败: %v", err)
	}

	// 写入文件
	err = os.WriteFile(outputPath, []byte(mdContent), 0644)
	if err != nil {
		return fmt.Errorf("写入文件失败: %v", err)
	}

	return nil
}

// GetEnabledTasks 获取所有启用的定时任务
func (s *DbDocService) GetEnabledTasks() ([]model.DbDocTask, error) {
	var tasks []model.DbDocTask
	err := s.db.Preload("Instance").Where("is_enable = ?", true).Where("sync_interval > 0").Find(&tasks).Error
	return tasks, err
}
