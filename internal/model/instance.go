package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// Instance 数据库实例信息
type Instance struct {
	ID        uint           `gorm:"primarykey;column:id" json:"id"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

	Name     string         `gorm:"size:100;not null;column:name;comment:实例名称" json:"name"`
	Host     string         `gorm:"size:255;not null;column:host;comment:主机地址" json:"host"`
	Port     int            `gorm:"not null;column:port;comment:端口" json:"port"`
	Username string         `gorm:"size:100;not null;column:username;comment:用户名" json:"username"`
	Password string         `gorm:"size:255;not null;column:password;comment:密码" json:"password"`
	Version  string         `gorm:"size:50;column:version;comment:数据库版本" json:"version"`
	Params   InstanceParams `gorm:"type:text;column:params;comment:额外参数" json:"params"`
	Remark   string         `gorm:"size:500;column:remark;comment:备注" json:"remark"`

	SyncInterval int        `gorm:"column:sync_interval;comment:同步间隔(分钟), 0表示禁用" json:"sync_interval"`
	LastSyncAt   *time.Time `gorm:"column:last_sync_at;comment:上次同步时间" json:"last_sync_at"`
}

// InstanceParams 实例额外参数
type InstanceParams []map[string]string

// Value 实现 driver.Valuer 接口
func (p InstanceParams) Value() (driver.Value, error) {
	return json.Marshal(p)
}

// Scan 实现 sql.Scanner 接口
func (p *InstanceParams) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, p)
}

// ExportInstancesRequest 导出实例请求
type ExportInstancesRequest struct {
	InstanceIDs []uint `json:"instance_ids"`
}

// ImportSummary 导入结果摘要
type ImportSummary struct {
	Succeeded int      `json:"succeeded"`
	Failed    int      `json:"failed"`
	Skipped   int      `json:"skipped"`
	Errors    []string `json:"errors"`
}
