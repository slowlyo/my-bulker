package router

import (
	"mysql-tenant-tools/internal/handler"
	"mysql-tenant-tools/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

// Register 注册所有路由
func Register(app *fiber.App) {
	// 初始化处理器
	health := handler.NewHealth()

	// 全局中间件
	app.Use(middleware.CORS())

	// 健康检查路由
	app.Get("/health", health.Check)

	// API 路由组
	app.Group("/api")
	// TODO: 添加更多 API 路由
}
