package main

import (
	"log"
	"my-bulker/internal/bootstrap"
)

func main() {
	app := bootstrap.NewApp()
	log.Fatal(app.Listen(":3000"))
}
