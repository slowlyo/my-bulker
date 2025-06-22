package database

import (
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"my-bulker/internal/model"

	"github.com/glebarez/sqlite"
	_ "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	db   *gorm.DB
	once sync.Once
)

// Init 初始化数据库连接
func Init() error {
	var initErr error
	once.Do(func() {
		// 确保 data 目录存在
		if err := os.MkdirAll("./data", 0755); err != nil {
			initErr = err
			return
		}

		// 连接数据库
		dbPath := filepath.Join("./data", "app.db")
		var err error
		db, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Error), // 开启 SQL 日志
		})
		if err != nil {
			initErr = fmt.Errorf("failed to connect database: %v", err)
			return
		}

		// 获取底层的 sqlDB
		sqlDB, err := db.DB()
		if err != nil {
			initErr = fmt.Errorf("failed to get database instance: %v", err)
			return
		}

		// 设置连接池
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)

		// 启用 WAL 模式
		if err := db.Exec("PRAGMA journal_mode=WAL;").Error; err != nil {
			initErr = fmt.Errorf("failed to enable WAL mode: %v", err)
			return
		}

		// 设置 WAL 相关优化参数
		if err := db.Exec("PRAGMA synchronous=NORMAL;").Error; err != nil {
			initErr = fmt.Errorf("failed to set synchronous mode: %v", err)
			return
		}

		if err := db.Exec("PRAGMA busy_timeout=5000;").Error; err != nil {
			initErr = fmt.Errorf("failed to set busy timeout: %v", err)
			return
		}

		if err := db.Exec("PRAGMA cache_size=-2000;").Error; err != nil {
			initErr = fmt.Errorf("failed to set cache size: %v", err)
			return
		}

		// 自动迁移数据库结构
		// 注意：按照依赖关系顺序进行迁移
		if err := db.AutoMigrate(
			&model.Instance{},           // 实例表（无依赖）
			&model.Database{},           // 数据库表（依赖 Instance）
			&model.QueryTask{},          // 查询任务表（无依赖）
			&model.QueryTaskSQL{},       // 查询任务SQL表（依赖 QueryTask）
			&model.QueryTaskExecution{}, // 任务执行表（依赖 QueryTask、QueryTaskSQL、Instance）
			&model.Config{},             // 配置表（无依赖）
		); err != nil {
			initErr = fmt.Errorf("failed to migrate database: %v", err)
			return
		}
	})

	return initErr
}

// GetDB 获取数据库连接实例
func GetDB() *gorm.DB {
	return db
}

// buildDSN 构建MySQL数据源名称 (DSN)
func buildDSN(instance *model.Instance, dbName string) string {
	// 基础DSN
	baseDSN := fmt.Sprintf("%s:%s@tcp(%s:%d)/",
		instance.Username,
		instance.Password,
		instance.Host,
		instance.Port,
	)
	// 数据库名称
	if dbName != "" {
		baseDSN += dbName
	}
	// 固定参数
	dsn := baseDSN + "?charset=utf8mb4&parseTime=True&loc=Local"

	// 添加额外参数
	if len(instance.Params) > 0 {
		extraParams := make([]string, 0, len(instance.Params))
		for _, paramMap := range instance.Params {
			for key, value := range paramMap {
				extraParams = append(extraParams, fmt.Sprintf("%s=%s", url.QueryEscape(key), url.QueryEscape(value)))
			}
		}
		dsn += "&" + strings.Join(extraParams, "&")
	}

	return dsn
}

// NewMySQLDB 根据实例信息创建 MySQL sql.DB 连接
func NewMySQLDB(instance *model.Instance) (*sql.DB, error) {
	dsn := buildDSN(instance, "") // 不指定数据库
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("连接数据库失败 [%s]: %v", instance.Name, err)
	}
	// 设置连接超时
	db.SetConnMaxLifetime(time.Second * 5)
	return db, nil
}

// NewMySQLGormDB 根据实例信息创建 MySQL gorm.DB 连接
func NewMySQLGormDB(instance *model.Instance, dbName string, maxConn int) (*gorm.DB, error) {
	dsn := buildDSN(instance, dbName)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxIdleConns(maxConn)
	sqlDB.SetMaxOpenConns(maxConn)
	return db, nil
}
