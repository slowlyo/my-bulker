package main

import (
	"log"
	"poly-db/internal/bootstrap"
)

func main() {
	// 创建应用实例
	app := bootstrap.NewApp()

	// 启动服务器
	log.Fatal(app.Listen(":3000"))
}
