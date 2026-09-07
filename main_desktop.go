//go:build desktop

package main

import (
	"fmt"
	"log"
	"my-bulker/internal/bootstrap"
	"my-bulker/internal/pkg/appdata"
	"my-bulker/internal/pkg/appmeta"

	"github.com/gofiber/fiber/v2/middleware/adaptor"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

func main() {
	// 桌面入口与服务端入口互斥，仅在 wails build（desktop tag）时参与编译。
	if err := runDesktop(); err != nil {
		log.Fatal(err)
	}
}

// runDesktop 用 Wails 窗口托管现有 Fiber 应用。
// 走 AssetServer Handler 而不是再 Listen 端口，避免和本机 Web 服务抢 9092，也省掉反向代理。
func runDesktop() error {
	if err := appdata.PrepareDesktopWorkingDir(); err != nil {
		return fmt.Errorf("prepare desktop data dir: %w", err)
	}

	fiberApp := bootstrap.NewApp(frontendFS)
	title := fmt.Sprintf("My Bulker %s", appmeta.DisplayVersion())

	return wails.Run(&options.App{
		Title:            title,
		Width:            1280,
		Height:           840,
		MinWidth:         960,
		MinHeight:        640,
		BackgroundColour: &options.RGBA{R: 245, G: 245, B: 245, A: 1},
		AssetServer: &assetserver.Options{
			// Fiber 已嵌入并托管 ui/dist 与 /api，WebView 的请求原样交给它。
			Handler: adaptor.FiberApp(fiberApp),
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
		},
		Mac: &mac.Options{
			TitleBar:             mac.TitleBarDefault(),
			WebviewIsTransparent: false,
			About: &mac.AboutInfo{
				Title:   "My Bulker",
				Message: appmeta.DisplayVersion(),
			},
		},
		Linux: &linux.Options{
			WindowIsTranslucent: false,
		},
	})
}
