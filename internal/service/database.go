package service

import (
	"context"
	"time"

	"mysql-batch-tools/internal/model"

	"gorm.io/gorm"
)

// DatabaseService 数据库服务
type DatabaseService struct {
	db *gorm.DB
}

// NewDatabaseService 创建数据库服务
func NewDatabaseService(db *gorm.DB) *DatabaseService {
	return &DatabaseService{db: db}
}

// List 获取数据库列表
func (s *DatabaseService) List(ctx context.Context, req *model.DatabaseListRequest) (*model.DatabaseListResponse, error) {
	var total int64
	var databases []model.Database

	query := s.db.Model(&model.Database{}).Preload("Instance")

	// 应用过滤条件
	if req.Name != "" {
		query = query.Where("name LIKE ?", "%"+req.Name+"%")
	}
	if req.InstanceID > 0 {
		query = query.Where("instance_id = ?", req.InstanceID)
	}

	// 应用排序条件
	if req.SortField != "" {
		query = query.Order(req.Sorting.GetSortClause())
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// 获取分页数据
	if err := query.Offset(req.Pagination.GetOffset()).Limit(req.Pagination.GetLimit()).Find(&databases).Error; err != nil {
		return nil, err
	}

	// 转换为响应格式
	items := make([]model.DatabaseResponse, len(databases))
	for i, db := range databases {
		items[i] = model.DatabaseResponse{
			ID:                db.ID,
			CreatedAt:         db.CreatedAt.Format(time.RFC3339),
			UpdatedAt:         db.UpdatedAt.Format(time.RFC3339),
			Name:              db.Name,
			InstanceID:        db.InstanceID,
			CharacterSet:      db.CharacterSet,
			Collation:         db.Collation,
			Size:              db.Size,
			TableCount:        db.TableCount,
			MaxConnections:    db.MaxConnections,
			ConnectionTimeout: db.ConnectionTimeout,
			Instance: model.InstanceBasicInfo{
				ID:   db.Instance.ID,
				Name: db.Instance.Name,
			},
		}
	}

	return &model.DatabaseListResponse{
		Total: total,
		Items: items,
	}, nil
}

// Get 获取数据库详情
func (s *DatabaseService) Get(ctx context.Context, id uint) (*model.DatabaseResponse, error) {
	var db model.Database
	if err := s.db.Preload("Instance").First(&db, id).Error; err != nil {
		return nil, err
	}

	// 转换为响应格式
	return &model.DatabaseResponse{
		ID:                db.ID,
		CreatedAt:         db.CreatedAt.Format(time.RFC3339),
		UpdatedAt:         db.UpdatedAt.Format(time.RFC3339),
		Name:              db.Name,
		InstanceID:        db.InstanceID,
		CharacterSet:      db.CharacterSet,
		Collation:         db.Collation,
		Size:              db.Size,
		TableCount:        db.TableCount,
		MaxConnections:    db.MaxConnections,
		ConnectionTimeout: db.ConnectionTimeout,
		Instance: model.InstanceBasicInfo{
			ID:   db.Instance.ID,
			Name: db.Instance.Name,
		},
	}, nil
}
