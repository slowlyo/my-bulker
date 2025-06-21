package router

import (
	"my-bulker/internal/handler"
	"my-bulker/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

// Register 注册所有路由
func Register(app *fiber.App) {
	// 初始化处理器
	health := handler.NewHealth()
	instanceHandler := handler.NewInstanceHandler()
	databaseHandler := handler.NewDatabaseHandler()
	queryTaskHandler := handler.NewQueryTaskHandler()
	sqlHandler := handler.NewSQLHandler()
	configHandler := handler.NewConfigHandler()
	dashboardHandler := handler.NewDashboardHandler()

	// 全局中间件
	app.Use(middleware.CORS())

	// 健康检查路由
	app.Get("/health", health.Check)

	// API 路由组
	api := app.Group("/api")
	{
		api.Get("/dashboard/stats", dashboardHandler.GetStats) // 仪表盘统计
		// 实例管理
		instances := api.Group("/instances")
		{
			instances.Post("/export", instanceHandler.ExportInstances)         // 导出实例配置
			instances.Post("/import", instanceHandler.ImportInstances)         // 导入实例配置
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
			databases.Get("", databaseHandler.List)                  // 获取数据库列表
			databases.Get("/:id", databaseHandler.Get)               // 获取数据库详情
			databases.Post("/batch-list", databaseHandler.BatchList) // 批量查询数据库
		}

		// 查询任务管理
		queryTasks := api.Group("/query-tasks")
		{
			queryTasks.Post("", queryTaskHandler.Create)                                   // 创建查询任务
			queryTasks.Delete("", queryTaskHandler.BatchDeleteTasks)                       // 批量删除任务
			queryTasks.Get("", queryTaskHandler.List)                                      // 获取查询任务列表
			queryTasks.Get("/:id", queryTaskHandler.Get)                                   // 获取查询任务详情
			queryTasks.Post("/:id/toggle-favorite", queryTaskHandler.ToggleFavoriteStatus) // 切换常用状态
			queryTasks.Get("/:taskId/sqls", queryTaskHandler.GetSQLs)                      // 获取查询任务SQL语句列表
			queryTasks.Get(":taskId/sqls/executions", queryTaskHandler.GetSQLExecutions)   // 获取SQL执行明细
			queryTasks.Post(":id/run", queryTaskHandler.Run)                               // 运行查询任务
			queryTasks.Get("/sqls/:sqlId/results", queryTaskHandler.GetSQLResult)          // 查询SQL结果表
			queryTasks.Get("/sqls/:sqlId/export", queryTaskHandler.ExportSQLResult)        // 导出SQL结果表
			queryTasks.Get(":taskId/execution-stats", queryTaskHandler.GetExecutionStats)  // 查询任务执行统计
		}

		api.Post("/sql/validate", sqlHandler.Validate) // SQL合法性校验

		// 配置管理
		api.Get("/configs/get", configHandler.GetConfig)              // 获取配置
		api.Post("/configs/set", configHandler.SetConfig)             // 保存配置
		api.Post("/configs/save", configHandler.SaveConfigs)          // 批量保存配置
		api.Post("/configs/batch-get", configHandler.BatchGetConfigs) // 批量获取配置
	}
}
