package bootstrap

import (
	"log"
	"my-bulker/internal/pkg/database"
	"my-bulker/internal/router"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

// NewApp 创建应用实例
func NewApp() *fiber.App {
	// 初始化数据库
	if err := database.Init(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// 创建 Fiber 应用实例
	app := fiber.New(fiber.Config{
		AppName: "my-bulker v1.0.0",
	})

	// 添加全局中间件
	app.Use(recover.New())
	app.Use(logger.New())

	// 注册路由
	router.Register(app)

	return app
}
