package bootstrap

import (
	"embed"
	"io/fs"
	"log"
	"my-bulker/internal/pkg/database"
	"my-bulker/internal/pkg/scheduler"
	"my-bulker/internal/router"
	"my-bulker/internal/service"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

// NewApp 创建应用实例
func NewApp(frontendFS embed.FS) *fiber.App {
	// 初始化数据库
	if err := database.Init(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// 启动调度服务
	simpleSchedulerSvc := service.NewSimpleSchedulerService()
	go simpleSchedulerSvc.Start()

	// 启动通用调度器
	go scheduler.Start()
	// defer simpleSchedulerSvc.Stop() // Graceful shutdown should be handled.

	// 创建 Fiber 应用实例
	app := fiber.New(fiber.Config{
		AppName: "my-bulker v1.0.0",
	})

	// 添加全局中间件
	app.Use(recover.New())
	app.Use(logger.New())

	// 注册路由
	router.Register(app)

	// 配置静态文件服务，从嵌入的文件系统中提供服务
	subFS, err := fs.Sub(frontendFS, "ui/dist")
	if err != nil {
		log.Fatalf("Failed to create sub filesystem: %v", err)
	}
	app.Use("/", filesystem.New(filesystem.Config{
		Root: http.FS(subFS),
	}))

	return app
}
