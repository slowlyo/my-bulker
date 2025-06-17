package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// TableIndex 表索引信息
type TableIndex struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	TableID uint   `gorm:"not null;comment:表ID" json:"table_id"`
	Name    string `gorm:"size:100;not null;comment:索引名称" json:"name"`
	Type    string `gorm:"size:20;not null;comment:索引类型：PRIMARY、UNIQUE、INDEX、FULLTEXT" json:"type"`
	Method  string `gorm:"size:20;not null;default:BTREE;comment:索引方法：BTREE、HASH等" json:"method"`
	Columns string `gorm:"type:text;not null;comment:索引字段(JSON格式，包含字段名和排序方式)" json:"columns"`
	Comment string `gorm:"size:500;comment:索引注释" json:"comment"`

	// 关联
	Table Table `gorm:"foreignKey:TableID" json:"table,omitempty"`
}

// TableName 指定表名
func (TableIndex) TableName() string {
	return "table_indexes"
}

// IndexColumns 索引字段结构
type IndexColumns []struct {
	Name  string `json:"name"`  // 字段名
	Order string `json:"order"` // 排序方式：ASC/DESC
}

// Value 实现 driver.Valuer 接口
func (c IndexColumns) Value() (driver.Value, error) {
	return json.Marshal(c)
}

// Scan 实现 sql.Scanner 接口
func (c *IndexColumns) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, c)
}
