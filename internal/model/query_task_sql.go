package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// QueryTaskSQL 查询任务SQL
type QueryTaskSQL struct {
	ID        uint           `gorm:"primarykey;column:id" json:"id"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

	TaskID            uint       `gorm:"not null;column:task_id;comment:任务ID" json:"task_id"`
	SQLContent        string     `gorm:"type:text;not null;column:sql_content;comment:SQL语句内容" json:"sql_content"`
	SQLOrder          int        `gorm:"not null;column:sql_order;comment:SQL执行顺序" json:"sql_order"`
	ResultTableName   string     `gorm:"size:100;not null;column:result_table_name;comment:结果集表名" json:"result_table_name"`
	ResultTableSchema string     `gorm:"type:text;not null;column:result_table_schema;comment:结果集表结构(JSON格式)" json:"result_table_schema"`
	TotalDBs          int        `gorm:"not null;default:0;column:total_dbs;comment:数据库总数" json:"total_dbs"`
	CompletedDBs      int        `gorm:"not null;default:0;column:completed_dbs;comment:已完成数据库数" json:"completed_dbs"`
	FailedDBs         int        `gorm:"not null;default:0;column:failed_dbs;comment:失败数据库数" json:"failed_dbs"`
	CompletedSQLs     int        `gorm:"not null;default:0;column:completed_sqls;comment:已完成SQL数" json:"completed_sqls"`
	FailedSQLs        int        `gorm:"not null;default:0;column:failed_sqls;comment:失败SQL数" json:"failed_sqls"`
	StartedAt         *time.Time `gorm:"column:started_at;comment:开始执行时间" json:"started_at"`
	CompletedAt       *time.Time `gorm:"column:completed_at;comment:完成时间" json:"completed_at"`

	// 关联
	Task       QueryTask            `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	Executions []QueryTaskExecution `gorm:"foreignKey:SQLID" json:"executions,omitempty"`
}

// TableName 指定表名
func (QueryTaskSQL) TableName() string {
	return "query_task_sqls"
}

// TableSchema 表结构定义
type TableSchema struct {
	Fields []TableField `json:"fields"` // 字段列表
}

// TableField 表字段定义
type TableField struct {
	Name    string `json:"name"`    // 字段名
	Type    string `json:"type"`    // 字段类型
	Comment string `json:"comment"` // 字段注释
}

// Value 实现 driver.Valuer 接口
func (s TableSchema) Value() (driver.Value, error) {
	return json.Marshal(s)
}

// Scan 实现 sql.Scanner 接口
func (s *TableSchema) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, s)
}
