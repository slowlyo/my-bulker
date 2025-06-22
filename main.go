package main

import (
	"embed"
	"log"
	"my-bulker/internal/bootstrap"
)

//go:embed all:ui/dist
var frontendFS embed.FS

func main() {
	app := bootstrap.NewApp(frontendFS)
	log.Fatal(app.Listen(":9092"))
}
