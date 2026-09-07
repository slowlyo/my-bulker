package main

import "embed"

// 服务端与桌面端共用同一份前端产物。
//
//go:embed all:ui/dist
var frontendFS embed.FS
