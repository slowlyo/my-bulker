package model

import (
	"time"

	"gorm.io/gorm"
)

// Table 表信息
type Table struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	DatabaseID   uint   `gorm:"not null;comment:数据库ID" json:"database_id"`
	Name         string `gorm:"size:100;not null;comment:表名" json:"name"`
	Comment      string `gorm:"size:500;comment:表注释" json:"comment"`
	Engine       string `gorm:"size:50;not null;default:InnoDB;comment:存储引擎" json:"engine"`
	CharacterSet string `gorm:"size:50;not null;default:utf8mb4;comment:字符集" json:"character_set"`
	Collation    string `gorm:"size:50;not null;default:utf8mb4_general_ci;comment:排序规则" json:"collation"`
	RowCount     int64  `gorm:"not null;default:0;comment:行数" json:"row_count"`
	Size         int64  `gorm:"not null;default:0;comment:表大小(字节)" json:"size"`
	IndexSize    int64  `gorm:"not null;default:0;comment:索引大小(字节)" json:"index_size"`

	// 关联
	Database Database     `gorm:"foreignKey:DatabaseID" json:"database,omitempty"`
	Indexes  []TableIndex `gorm:"foreignKey:TableID" json:"indexes,omitempty"`
}

// TableName 指定表名
func (Table) TableName() string {
	return "tables"
}
