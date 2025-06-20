package model

import (
	"time"

	"gorm.io/gorm"
)

// Database 数据库信息
type Database struct {
	ID        uint           `gorm:"primarykey;column:id" json:"id"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

	InstanceID        uint   `gorm:"not null;column:instance_id;comment:实例ID" json:"instance_id"`
	Name              string `gorm:"size:100;not null;column:name;comment:数据库名称" json:"name"`
	CharacterSet      string `gorm:"size:50;not null;default:utf8mb4;column:character_set;comment:字符集" json:"character_set"`
	Collation         string `gorm:"size:50;not null;default:utf8mb4_general_ci;column:collation;comment:排序规则" json:"collation"`
	Size              int64  `gorm:"not null;default:0;column:size;comment:数据库大小(字节)" json:"size"`
	TableCount        int    `gorm:"not null;default:0;column:table_count;comment:表数量" json:"table_count"`
	MaxConnections    int    `gorm:"not null;default:100;column:max_connections;comment:最大连接数" json:"max_connections"`
	ConnectionTimeout int    `gorm:"not null;default:30;column:connection_timeout;comment:连接超时时间(秒)" json:"connection_timeout"`

	// 关联
	Instance Instance `gorm:"foreignKey:InstanceID" json:"instance,omitempty"`
}

// TableName 指定表名
func (Database) TableName() string {
	return "databases"
}
