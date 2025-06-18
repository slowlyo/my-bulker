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
	databaseHandler := handler.NewDatabaseHandler()
	queryTaskHandler := handler.NewQueryTaskHandler()

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
			instances.Get("/options", instanceHandler.Options)                 // 获取实例选项
			instances.Post("/test-connection", instanceHandler.TestConnection) // 测试连接
			instances.Post("/sync-databases", instanceHandler.SyncDatabases)   // 同步数据库
			instances.Post("", instanceHandler.Create)                         // 创建实例
			instances.Put("/:id", instanceHandler.Update)                      // 更新实例
			instances.Delete("/:id", instanceHandler.Delete)                   // 删除实例
			instances.Get("/:id", instanceHandler.Get)                         // 获取实例
			instances.Get("", instanceHandler.List)                            // 获取实例列表
		}

		// 数据库管理
		databases := api.Group("/databases")
		{
			databases.Get("", databaseHandler.List)    // 获取数据库列表
			databases.Get("/:id", databaseHandler.Get) // 获取数据库详情
		}

		// 查询任务管理
		queryTasks := api.Group("/query-tasks")
		{
			queryTasks.Post("", queryTaskHandler.Create)              // 创建查询任务
			queryTasks.Get("", queryTaskHandler.List)                 // 获取查询任务列表
			queryTasks.Get("/:id", queryTaskHandler.Get)              // 获取查询任务详情
			queryTasks.Get("/:taskId/sqls", queryTaskHandler.GetSQLs) // 获取查询任务SQL语句列表
		}
	}
}
