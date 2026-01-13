package model

import (
	"time"

	"gorm.io/gorm"
)

// DbDocTask 数据库文档生成任务
type DbDocTask struct {
	ID        uint           `gorm:"primarykey;column:id" json:"id"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

	TaskName     string     `gorm:"size:100;not null;column:task_name;comment:任务名称" json:"task_name"`
	InstanceID   uint       `gorm:"not null;column:instance_id;comment:实例ID" json:"instance_id"`
	DatabaseID   uint       `gorm:"not null;column:database_id;comment:数据库ID" json:"database_id"`
	Database     string     `gorm:"size:100;not null;column:database;comment:数据库名称" json:"database"`
	OutputPath   string     `gorm:"size:1024;not null;column:output_path;comment:生成的目标路径(多个路径用逗号分隔)" json:"output_path"`
	Config       string     `gorm:"type:text;column:config;comment:配置信息(JSON)" json:"config"`
	SyncInterval int        `gorm:"not null;default:0;column:sync_interval;comment:同步间隔(分钟)" json:"sync_interval"`
	IsEnable     bool       `gorm:"not null;default:false;column:is_enable;comment:是否启用定时" json:"is_enable"`
	LastRunAt    *time.Time `gorm:"column:last_run_at;comment:最后运行时间" json:"last_run_at"`
	LastStatus   int        `gorm:"not null;default:0;column:last_status;comment:最后运行状态(0:未运行, 1:成功, 2:失败)" json:"last_status"`
	LastError    string     `gorm:"type:text;column:last_error;comment:最后错误信息" json:"last_error"`

	// 关联
	Instance Instance `gorm:"foreignKey:InstanceID" json:"instance,omitempty"`
}

// TableName 指定表名
func (DbDocTask) TableName() string {
	return "db_doc_tasks"
}
