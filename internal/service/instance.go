package service

import (
	"database/sql"
	"errors"
	"fmt"
	"mysql-batch-tools/internal/model"
	"mysql-batch-tools/internal/pkg/database"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var (
	ErrInstanceNameExists = errors.New("实例名称已存在")
	ErrConnectionFailed   = errors.New("数据库连接失败")
)

// InstanceService 实例服务
type InstanceService struct{}

// NewInstanceService 创建实例服务
func NewInstanceService() *InstanceService {
	return &InstanceService{}
}

// checkNameExists 检查实例名称是否存在
func (s *InstanceService) checkNameExists(name string, excludeID uint) bool {
	var count int64
	query := database.GetDB().Model(&model.Instance{}).Where("name = ?", name)
	if excludeID > 0 {
		query = query.Where("id != ?", excludeID)
	}
	query.Count(&count)
	return count > 0
}

// Create 创建实例
func (s *InstanceService) Create(req *model.CreateInstanceRequest) (*model.Instance, error) {
	// 检查名称是否已存在
	if s.checkNameExists(req.Name, 0) {
		return nil, ErrInstanceNameExists
	}

	// 获取数据库版本
	version, err := s.getMySQLVersion(req.Host, req.Port, req.Username, req.Password)
	if err != nil {
		return nil, err
	}

	instance := &model.Instance{
		Name:     req.Name,
		Host:     req.Host,
		Port:     req.Port,
		Username: req.Username,
		Password: req.Password,
		Params:   req.Params,
		Remark:   req.Remark,
		Version:  version,
	}

	if err := database.GetDB().Create(instance).Error; err != nil {
		return nil, err
	}

	return instance, nil
}

// Update 更新实例
func (s *InstanceService) Update(id uint, req *model.UpdateInstanceRequest) (*model.Instance, error) {
	// 检查名称是否已存在（排除当前实例）
	if s.checkNameExists(req.Name, id) {
		return nil, ErrInstanceNameExists
	}

	instance := &model.Instance{}
	if err := database.GetDB().First(instance, id).Error; err != nil {
		return nil, err
	}

	// 如果连接信息发生变化，重新获取版本
	if instance.Host != req.Host || instance.Port != req.Port ||
		instance.Username != req.Username || instance.Password != req.Password {
		version, err := s.getMySQLVersion(req.Host, req.Port, req.Username, req.Password)
		if err != nil {
			return nil, err
		}
		instance.Version = version
	}

	instance.Name = req.Name
	instance.Host = req.Host
	instance.Port = req.Port
	instance.Username = req.Username
	instance.Password = req.Password
	instance.Params = req.Params
	instance.Remark = req.Remark

	if err := database.GetDB().Save(instance).Error; err != nil {
		return nil, err
	}

	return instance, nil
}

// Delete 删除实例
func (s *InstanceService) Delete(id uint) error {
	return database.GetDB().Delete(&model.Instance{}, id).Error
}

// Get 获取实例
func (s *InstanceService) Get(id uint) (*model.Instance, error) {
	instance := &model.Instance{}
	if err := database.GetDB().First(instance, id).Error; err != nil {
		return nil, err
	}
	return instance, nil
}

// List 获取实例列表
func (s *InstanceService) List(page, pageSize int) (*model.InstanceListResponse, error) {
	var total int64
	var instances []model.Instance

	// 获取总数
	if err := database.GetDB().Model(&model.Instance{}).Count(&total).Error; err != nil {
		return nil, err
	}

	// 获取分页数据
	if err := database.GetDB().Offset((page - 1) * pageSize).Limit(pageSize).Find(&instances).Error; err != nil {
		return nil, err
	}

	// 转换为响应格式
	items := make([]model.InstanceResponse, len(instances))
	for i, instance := range instances {
		items[i] = model.InstanceResponse{
			ID:        instance.ID,
			CreatedAt: instance.CreatedAt.Format(time.RFC3339),
			UpdatedAt: instance.UpdatedAt.Format(time.RFC3339),
			Name:      instance.Name,
			Host:      instance.Host,
			Port:      instance.Port,
			Username:  instance.Username,
			Password:  instance.Password,
			Version:   instance.Version,
			Params:    instance.Params,
			Remark:    instance.Remark,
		}
	}

	return &model.InstanceListResponse{
		Total: total,
		Items: items,
	}, nil
}

// TestConnection 测试数据库连接
func (s *InstanceService) TestConnection(host string, port int, username, password string) error {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?charset=utf8mb4&parseTime=True&loc=Local",
		username, password, host, port)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrConnectionFailed, err)
	}
	defer db.Close()

	// 设置连接超时
	db.SetConnMaxLifetime(time.Second * 5)

	// 测试连接
	if err := db.Ping(); err != nil {
		return fmt.Errorf("%w: %v", ErrConnectionFailed, err)
	}

	return nil
}

// getMySQLVersion 获取MySQL版本
func (s *InstanceService) getMySQLVersion(host string, port int, username, password string) (string, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?charset=utf8mb4&parseTime=True&loc=Local",
		username, password, host, port)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrConnectionFailed, err)
	}
	defer db.Close()

	// 设置连接超时
	db.SetConnMaxLifetime(time.Second * 5)

	var version string
	err = db.QueryRow("SELECT VERSION()").Scan(&version)
	if err != nil {
		return "", fmt.Errorf("获取版本失败: %v", err)
	}

	return version, nil
}
