package service

import (
	"mysql-batch-tools/internal/model"
	"mysql-batch-tools/internal/pkg/database"
)

// DatabaseService 数据库服务
type DatabaseService struct{}

// NewDatabaseService 创建数据库服务
func NewDatabaseService() *DatabaseService {
	return &DatabaseService{}
}

// List 获取数据库列表
func (s *DatabaseService) List(req *model.DatabaseListRequest) (*model.DatabaseListResponse, error) {
	var total int64
	var databases []model.Database

	// 验证并设置分页默认值
	req.ValidateAndSetDefaults()

	// 构建查询条件
	query := database.GetDB().Model(&model.Database{}).
		Joins("LEFT JOIN instances ON databases.instance_id = instances.id")

	// 添加筛选条件
	if req.Name != "" {
		query = query.Where("databases.name LIKE ?", "%"+req.Name+"%")
	}
	if req.InstanceID > 0 {
		query = query.Where("databases.instance_id = ?", req.InstanceID)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// 获取分页数据
	if err := query.
		Select("databases.*, instances.name as instance_name").
		Offset(req.GetOffset()).
		Limit(req.GetLimit()).
		Order("databases.updated_at DESC").
		Find(&databases).Error; err != nil {
		return nil, err
	}

	// 转换为响应格式
	items := make([]model.DatabaseResponse, len(databases))
	for i, db := range databases {
		items[i] = model.DatabaseResponse{
			ID:           db.ID,
			Name:         db.Name,
			InstanceID:   db.InstanceID,
			InstanceName: db.Instance.Name, // 通过关联获取实例名称
			Size:         db.Size,
			TableCount:   db.TableCount,
			UpdatedAt:    db.UpdatedAt,
		}
	}

	return &model.DatabaseListResponse{
		Total: total,
		Items: items,
	}, nil
}
