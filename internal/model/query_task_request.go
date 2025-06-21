package model

import "time"

// QueryTaskListRequest 查询任务列表请求
type QueryTaskListRequest struct {
	Pagination `query:""` // 嵌入分页参数
	Sorting    `query:""` // 嵌入排序参数
	TaskName   string     `query:"task_name" json:"task_name"` // 任务名称（模糊查询）
	Status     *int8      `query:"status" json:"status"`       // 任务状态
	IsFavorite *bool      `query:"is_favorite" json:"is_favorite"`
}

// CreateQueryTaskRequest 创建查询任务请求
type CreateQueryTaskRequest struct {
	TaskName     string        `json:"task_name" validate:"required"`                           // 任务名称
	Description  string        `json:"description"`                                             // 任务描述
	InstanceIDs  []uint        `json:"instance_ids" validate:"required,min=1"`                  // 实例ID列表
	DatabaseMode string        `json:"database_mode" validate:"required,oneof=include exclude"` // 数据库选择模式：include-包含，exclude-排除
	SelectedDBs  TaskDatabases `json:"selected_dbs" validate:"required"`                        // 选中的数据库列表
	SQLContent   string        `json:"sql_content" validate:"required"`                         // SQL语句内容（字符串，系统自动拆分）
}

// QueryTaskResponse 查询任务响应
type QueryTaskResponse struct {
	ID            uint       `json:"id"`
	CreatedAt     string     `json:"created_at"`
	UpdatedAt     string     `json:"updated_at"`
	TaskName      string     `json:"task_name"`
	Databases     string     `json:"databases"`
	Status        int8       `json:"status"`
	TotalDBs      int        `json:"total_dbs"`
	CompletedDBs  int        `json:"completed_dbs"`
	FailedDBs     int        `json:"failed_dbs"`
	TotalSQLs     int        `json:"total_sqls"`
	CompletedSQLs int        `json:"completed_sqls"`
	FailedSQLs    int        `json:"failed_sqls"`
	StartedAt     *time.Time `json:"started_at"`
	CompletedAt   *time.Time `json:"completed_at"`
	Description   string     `json:"description"`
	IsFavorite    bool       `json:"is_favorite"`
}

// QueryTaskListResponse 查询任务列表响应
type QueryTaskListResponse struct {
	Total int64               `json:"total"` // 总数
	Items []QueryTaskResponse `json:"items"` // 列表项
}

// QueryTaskSQLResponse 查询任务SQL响应
type QueryTaskSQLResponse struct {
	ID                uint   `json:"id"`
	CreatedAt         string `json:"created_at"`
	UpdatedAt         string `json:"updated_at"`
	TaskID            uint   `json:"task_id"`
	SQLContent        string `json:"sql_content"`
	SQLOrder          int    `json:"sql_order"`
	ResultTableName   string `json:"result_table_name"`
	ResultTableSchema string `json:"result_table_schema"`
	TotalDBs          int    `json:"total_dbs"`
	CompletedDBs      int    `json:"completed_dbs"`
	FailedDBs         int    `json:"failed_dbs"`
	StartedAt         string `json:"started_at"`
	CompletedAt       string `json:"completed_at"`
}

// QueryTaskSQLListResponse 查询任务SQL列表响应
type QueryTaskSQLListResponse struct {
	Total int64                  `json:"total"` // 总数
	Items []QueryTaskSQLResponse `json:"items"` // 列表项
}
