package model

import (
	"time"

	"gorm.io/gorm"
)

// QueryTaskExecution 任务执行记录
type QueryTaskExecution struct {
	ID        uint           `gorm:"primarykey;column:id" json:"id"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

	TaskID        uint       `gorm:"not null;column:task_id;comment:任务ID" json:"task_id"`
	SQLID         uint       `gorm:"not null;column:sql_id;comment:SQL语句ID" json:"sql_id"`
	InstanceID    uint       `gorm:"not null;column:instance_id;comment:实例ID" json:"instance_id"`
	DatabaseName  string     `gorm:"size:100;not null;column:database_name;comment:数据库名称" json:"database_name"`
	Status        int8       `gorm:"not null;default:0;column:status;comment:执行状态：0-待执行，1-执行中，2-已完成，3-失败" json:"status"`
	ErrorMessage  string     `gorm:"type:text;column:error_message;comment:错误信息" json:"error_message"`
	ResultCount   *int       `gorm:"column:result_count;comment:结果集行数" json:"result_count"`
	ExecutionTime *int       `gorm:"column:execution_time;comment:执行时间(毫秒)" json:"execution_time"`
	StartedAt     *time.Time `gorm:"column:started_at;comment:开始执行时间" json:"started_at"`
	CompletedAt   *time.Time `gorm:"column:completed_at;comment:完成时间" json:"completed_at"`

	// 关联
	Task     QueryTask    `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	SQL      QueryTaskSQL `gorm:"foreignKey:SQLID" json:"sql,omitempty"`
	Instance Instance     `gorm:"foreignKey:InstanceID" json:"instance,omitempty"`
}

// TableName 指定表名
func (QueryTaskExecution) TableName() string {
	return "query_task_executions"
}
