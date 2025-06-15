package router

import (
	"mysql-batch-tools/internal/handler"
	"mysql-batch-tools/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

// Register 注册所有路由
func Register(app *fiber.App) {
	// 初始化处理器
	health := handler.NewHealth()
	instanceHandler := handler.NewInstanceHandler()

	// 全局中间件
	app.Use(middleware.CORS())

	// 健康检查路由
	app.Get("/health", health.Check)

	// API 路由组
	api := app.Group("/api")
	{
		// 实例管理
		instances := api.Group("/instances")
		{
			instances.Post("", instanceHandler.Create)                         // 创建实例
			instances.Put("/:id", instanceHandler.Update)                      // 更新实例
			instances.Delete("/:id", instanceHandler.Delete)                   // 删除实例
			instances.Get("/:id", instanceHandler.Get)                         // 获取实例
			instances.Get("", instanceHandler.List)                            // 获取实例列表
			instances.Post("/test-connection", instanceHandler.TestConnection) // 测试连接
		}
	}
}
