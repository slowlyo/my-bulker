package database

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"mysql-batch-tools/internal/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
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
		db, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
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
		if err := db.AutoMigrate(&model.Instance{}); err != nil {
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
