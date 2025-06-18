package service

import (
	"context"

	"mysql-batch-tools/internal/model"

	"gorm.io/gorm"
)

// TableService 表服务
type TableService struct {
	db *gorm.DB
}

// NewTableService 创建表服务
func NewTableService(db *gorm.DB) *TableService {
	return &TableService{db: db}
}

// Get 获取表详情
func (s *TableService) Get(ctx context.Context, id uint) (*model.Table, error) {
	var table model.Table
	if err := s.db.Preload("Database").Preload("Indexes").First(&table, id).Error; err != nil {
		return nil, err
	}

	return &table, nil
}
