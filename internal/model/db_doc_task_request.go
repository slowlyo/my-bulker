package model

// DbDocTaskRequest 数据库文档生成任务请求
type DbDocTaskRequest struct {
	TaskName     string `json:"task_name" validate:"required"`
	InstanceID   uint   `json:"instance_id" validate:"required"`
	DatabaseID   uint   `json:"database_id" validate:"required"`
	Database     string `json:"database" validate:"required"`
	OutputPath   string `json:"output_path" validate:"required"`
	Config       string `json:"config"`
	SyncInterval int    `json:"sync_interval"`
	IsEnable     bool   `json:"is_enable"`
}

// DbDocTaskListRequest 列表查询请求
type DbDocTaskListRequest struct {
	Pagination
	Sorting
	TaskName   string `query:"task_name"`
	InstanceID uint   `query:"instance_id"`
	IsEnable   *bool  `query:"is_enable"`
}

// DbDocTaskResponse 数据库文档生成任务响应
type DbDocTaskResponse struct {
	ID           uint      `json:"id"`
	CreatedAt    string    `json:"created_at"`
	UpdatedAt    string    `json:"updated_at"`
	TaskName     string    `json:"task_name"`
	InstanceID   uint      `json:"instance_id"`
	DatabaseID   uint      `json:"database_id"`
	Database     string    `json:"database"`
	OutputPath   string    `json:"output_path"`
	Config       string    `json:"config"`
	SyncInterval int       `json:"sync_interval"`
	IsEnable     bool      `json:"is_enable"`
	LastRunAt    string    `json:"last_run_at"`
	LastStatus   int       `json:"last_status"`
	LastError    string    `json:"last_error"`
	Instance     *Instance `json:"instance,omitempty"`
}
