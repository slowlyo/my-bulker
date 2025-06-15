package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// Instance 数据库实例信息
type Instance struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Name     string         `gorm:"size:100;not null;comment:实例名称" json:"name"`
	Host     string         `gorm:"size:255;not null;comment:主机地址" json:"host"`
	Port     int            `gorm:"not null;comment:端口" json:"port"`
	Username string         `gorm:"size:100;not null;comment:用户名" json:"username"`
	Password string         `gorm:"size:255;not null;comment:密码" json:"password"`
	Version  string         `gorm:"size:50;comment:数据库版本" json:"version"`
	Params   InstanceParams `gorm:"type:text;comment:额外参数" json:"params"`
	Remark   string         `gorm:"size:500;comment:备注" json:"remark"`
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
