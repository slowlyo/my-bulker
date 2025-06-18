package model

import (
	"time"

	"gorm.io/gorm"
)

// Database 数据库信息
type Database struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	InstanceID        uint   `gorm:"not null;comment:实例ID" json:"instance_id"`
	Name              string `gorm:"size:100;not null;comment:数据库名称" json:"name"`
	CharacterSet      string `gorm:"size:50;not null;default:utf8mb4;comment:字符集" json:"character_set"`
	Collation         string `gorm:"size:50;not null;default:utf8mb4_general_ci;comment:排序规则" json:"collation"`
	Size              int64  `gorm:"not null;default:0;comment:数据库大小(字节)" json:"size"`
	TableCount        int    `gorm:"not null;default:0;comment:表数量" json:"table_count"`
	MaxConnections    int    `gorm:"not null;default:100;comment:最大连接数" json:"max_connections"`
	ConnectionTimeout int    `gorm:"not null;default:30;comment:连接超时时间(秒)" json:"connection_timeout"`

	// 关联
	Instance Instance `gorm:"foreignKey:InstanceID" json:"instance,omitempty"`
}

// TableName 指定表名
func (Database) TableName() string {
	return "databases"
}
