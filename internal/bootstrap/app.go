package bootstrap

import (
	"mysql-tenant-tools/internal/router"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

// NewApp 创建应用实例
func NewApp() *fiber.App {
	// 创建 Fiber 应用实例
	app := fiber.New(fiber.Config{
		AppName: "mysql-tenant-tools v1.0.0",
	})

	// 添加全局中间件
	app.Use(recover.New())
	app.Use(logger.New())

	// 注册路由
	router.Register(app)

	return app
}
