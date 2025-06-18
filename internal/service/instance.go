package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"mysql-batch-tools/internal/model"
	"mysql-batch-tools/internal/pkg/database"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/sync/errgroup"
	"gorm.io/gorm"
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

	// 确定要使用的密码（如果请求中密码为空，则使用原密码）
	passwordToUse := req.Password
	if passwordToUse == "" {
		passwordToUse = instance.Password
	}

	// 如果连接信息发生变化，重新获取版本
	if instance.Host != req.Host || instance.Port != req.Port ||
		instance.Username != req.Username || instance.Password != passwordToUse {
		version, err := s.getMySQLVersion(req.Host, req.Port, req.Username, passwordToUse)
		if err != nil {
			return nil, err
		}
		instance.Version = version
	}

	instance.Name = req.Name
	instance.Host = req.Host
	instance.Port = req.Port
	instance.Username = req.Username
	// 只有当密码不为空时才更新密码
	if req.Password != "" {
		instance.Password = req.Password
	}
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
func (s *InstanceService) Get(id uint) (*model.InstanceResponse, error) {
	instance := &model.Instance{}
	if err := database.GetDB().First(instance, id).Error; err != nil {
		return nil, err
	}

	// 转换为响应格式
	return &model.InstanceResponse{
		ID:        instance.ID,
		CreatedAt: instance.CreatedAt.Format(time.RFC3339),
		UpdatedAt: instance.UpdatedAt.Format(time.RFC3339),
		Name:      instance.Name,
		Host:      instance.Host,
		Port:      instance.Port,
		Username:  instance.Username,
		Version:   instance.Version,
		Params:    instance.Params,
		Remark:    instance.Remark,
	}, nil
}

// List 获取实例列表
func (s *InstanceService) List(req *model.InstanceListRequest) (*model.InstanceListResponse, error) {
	var total int64
	var instances []model.Instance

	// 验证并设置分页默认值
	req.ValidateAndSetDefaults()

	// 构建查询条件
	query := database.GetDB().Model(&model.Instance{})

	// 添加筛选条件
	if req.Name != "" {
		query = query.Where("name LIKE ?", "%"+req.Name+"%")
	}
	if req.Host != "" {
		query = query.Where("host LIKE ?", "%"+req.Host+"%")
	}
	if req.Username != "" {
		query = query.Where("username LIKE ?", "%"+req.Username+"%")
	}
	if req.Remark != "" {
		query = query.Where("remark LIKE ?", "%"+req.Remark+"%")
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// 获取分页数据
	if err := query.
		Offset(req.GetOffset()).
		Limit(req.GetLimit()).
		Order("updated_at DESC").
		Find(&instances).Error; err != nil {
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

// getMySQLConnection 获取 MySQL 数据库连接
func (s *InstanceService) getMySQLConnection(instance *model.Instance) (*sql.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?charset=utf8mb4&parseTime=True&loc=Local",
		instance.Username, instance.Password, instance.Host, instance.Port)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("连接数据库失败 [%s]: %v", instance.Name, err)
	}

	// 设置连接超时
	db.SetConnMaxLifetime(time.Second * 5)

	return db, nil
}

// SyncDatabases 同步数据库信息
func (s *InstanceService) SyncDatabases(instanceIDs []uint) error {
	// 获取所有指定的实例
	var instances []model.Instance
	if err := database.GetDB().Find(&instances, instanceIDs).Error; err != nil {
		return fmt.Errorf("获取实例失败: %v", err)
	}

	// 使用 errgroup 进行并发处理
	g, _ := errgroup.WithContext(context.Background())
	sem := make(chan struct{}, 5) // 限制最大并发数为5

	for _, instance := range instances {
		instance := instance // 创建副本避免闭包问题
		g.Go(func() error {
			sem <- struct{}{}        // 获取信号量
			defer func() { <-sem }() // 释放信号量

			// 连接数据库
			db, err := s.getMySQLConnection(&instance)
			if err != nil {
				return err
			}
			defer db.Close()

			// 开始事务
			tx := database.GetDB().Begin()
			if tx.Error != nil {
				return fmt.Errorf("开始事务失败 [%s]: %v", instance.Name, tx.Error)
			}

			// 同步数据库信息
			if err := s.syncDatabases(tx, db, instance.ID); err != nil {
				tx.Rollback()
				return fmt.Errorf("同步数据库失败 [%s]: %v", instance.Name, err)
			}

			// 提交事务
			if err := tx.Commit().Error; err != nil {
				return fmt.Errorf("提交事务失败 [%s]: %v", instance.Name, err)
			}

			return nil
		})
	}

	// 等待所有任务完成
	if err := g.Wait(); err != nil {
		return err
	}

	return nil
}

// syncDatabases 同步单个实例的数据库信息
func (s *InstanceService) syncDatabases(tx *gorm.DB, db *sql.DB, instanceID uint) error {
	// 一次性获取所有数据库信息
	rows, err := db.Query(`
		SELECT 
			s.SCHEMA_NAME,
			s.DEFAULT_CHARACTER_SET_NAME,
			s.DEFAULT_COLLATION_NAME,
			COALESCE(SUM(t.data_length + t.index_length), 0) as size,
			COUNT(t.TABLE_NAME) as table_count
		FROM information_schema.SCHEMATA s
		LEFT JOIN information_schema.TABLES t ON s.SCHEMA_NAME = t.TABLE_SCHEMA
		WHERE s.SCHEMA_NAME NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
		GROUP BY s.SCHEMA_NAME, s.DEFAULT_CHARACTER_SET_NAME, s.DEFAULT_COLLATION_NAME
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	// 批量准备数据库记录
	var databases []model.Database
	for rows.Next() {
		var dbName, charset, collation string
		var size int64
		var tableCount int
		if err := rows.Scan(&dbName, &charset, &collation, &size, &tableCount); err != nil {
			return err
		}

		databases = append(databases, model.Database{
			InstanceID:   instanceID,
			Name:         dbName,
			CharacterSet: charset,
			Collation:    collation,
			Size:         size,
			TableCount:   tableCount,
		})
	}

	if err := rows.Err(); err != nil {
		return err
	}

	// 获取当前数据库ID列表
	var currentDBIDs []uint
	if err := tx.Model(&model.Database{}).Where("instance_id = ?", instanceID).Pluck("id", &currentDBIDs).Error; err != nil {
		return err
	}

	// 硬删除当前实例下的所有相关数据
	if len(currentDBIDs) > 0 {
		// 删除数据库
		if err := tx.Unscoped().Where("id IN (?)", currentDBIDs).Delete(&model.Database{}).Error; err != nil {
			return err
		}
	}

	// 批量创建数据库记录
	for _, db := range databases {
		if err := tx.Create(&db).Error; err != nil {
			return err
		}
	}

	return nil
}

// TestConnection 测试数据库连接
func (s *InstanceService) TestConnection(host string, port int, username, password string) error {
	instance := &model.Instance{
		Host:     host,
		Port:     port,
		Username: username,
		Password: password,
	}

	db, err := s.getMySQLConnection(instance)
	if err != nil {
		return err
	}
	defer db.Close()

	// 测试连接
	if err := db.Ping(); err != nil {
		return fmt.Errorf("%w: %v", ErrConnectionFailed, err)
	}

	return nil
}

// getMySQLVersion 获取MySQL版本
func (s *InstanceService) getMySQLVersion(host string, port int, username, password string) (string, error) {
	instance := &model.Instance{
		Host:     host,
		Port:     port,
		Username: username,
		Password: password,
	}

	db, err := s.getMySQLConnection(instance)
	if err != nil {
		return "", err
	}
	defer db.Close()

	var version string
	err = db.QueryRow("SELECT VERSION()").Scan(&version)
	if err != nil {
		return "", fmt.Errorf("获取版本失败: %v", err)
	}

	return version, nil
}

// GetOptions 获取实例选项列表
func (s *InstanceService) GetOptions() ([]model.Option, error) {
	var instances []model.Instance

	// 获取所有实例，只选择需要的字段
	if err := database.GetDB().
		Select("id, name").
		Order("name ASC").
		Find(&instances).Error; err != nil {
		return nil, err
	}

	// 转换为选项格式
	options := make([]model.Option, len(instances))
	for i, instance := range instances {
		options[i] = model.Option{
			Value: instance.ID,
			Label: instance.Name,
		}
	}

	return options, nil
}
