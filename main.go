package main

import (
	"embed"
	"flag"
	"fmt"
	"log"
	"my-bulker/internal/bootstrap"
	"os"
	"strconv"
)

//go:embed all:ui/dist
var frontendFS embed.FS

func main() {
	// 定义一个命令行 flag 来接收端口号
	portFlag := flag.Int("port", 9092, "Port to run the application on")
	flag.Parse()

	// 优先从环境变量 PORT 读取端口号，如果不存在则使用 flag 的值
	port := *portFlag
	if portStr, ok := os.LookupEnv("PORT"); ok {
		if p, err := strconv.Atoi(portStr); err == nil {
			port = p
		} else {
			log.Printf("Invalid PORT environment variable '%s', fallback to flag/default value.", portStr)
		}
	}

	app := bootstrap.NewApp(frontendFS)

	// 使用最终确定的端口号
	addr := fmt.Sprintf(":%d", port)
	log.Printf("Starting server on %s", addr)
	log.Fatal(app.Listen(addr))
}
