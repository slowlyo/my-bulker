package service

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"runtime"
	"sync/atomic"
	"testing"
	"time"

	"my-bulker/internal/pkg/appmeta"
)

// TestUpdateServiceCheckPreview 验证预发布版本选择最高版本、匹配资产并复用缓存。
func TestUpdateServiceCheckPreview(t *testing.T) {
	originalVersion := appmeta.Version
	appmeta.Version = "v0.1.8-beta.1"
	t.Cleanup(func() {
		appmeta.Version = originalVersion
	})

	var requests atomic.Int32
	expectedAsset := expectedAssetName(appmeta.RuntimeMode, runtime.GOOS, runtime.GOARCH)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		// 预发布通道必须读取列表，才能同时比较稳定版和预发布版。
		if r.URL.Path != "/" || r.URL.Query().Get("per_page") != "30" {
			t.Fatalf("unexpected request: %s", r.URL.String())
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `[
			{"tag_name":"v0.1.7","html_url":"stable","published_at":"2026-05-19T09:44:02Z","assets":[]},
			{"tag_name":"v9.0.0","draft":true,"html_url":"draft","published_at":"2026-09-08T00:00:00Z","assets":[]},
			{"tag_name":"v0.1.8-beta.4","prerelease":true,"html_url":"preview","published_at":"2026-09-08T01:02:25Z","assets":[
				{"name":%q,"browser_download_url":"https://example.com/download","size":1024}
			]}
		]`, expectedAsset)
	}))
	defer server.Close()

	now := time.Date(2026, 9, 8, 1, 4, 0, 0, time.UTC)
	updateService := &UpdateService{
		client:  server.Client(),
		apiURL:  server.URL,
		now:     func() time.Time { return now },
		entries: make(map[bool]updateCacheEntry),
	}

	first, err := updateService.Check(context.Background())
	if err != nil {
		t.Fatalf("first check failed: %v", err)
	}
	second, err := updateService.Check(context.Background())
	if err != nil {
		t.Fatalf("cached check failed: %v", err)
	}

	if !first.IncludePreview || !first.UpdateAvailable {
		t.Fatalf("expected preview update, got %+v", first)
	}
	if first.LatestVersion != "v0.1.8-beta.4" {
		t.Fatalf("unexpected latest version: %s", first.LatestVersion)
	}
	if first.Recommended == nil || first.Recommended.Name != expectedAsset {
		t.Fatalf("unexpected recommended asset: %+v", first.Recommended)
	}
	if second.CheckedAt != now || requests.Load() != 1 {
		t.Fatalf("cache was not reused, requests=%d", requests.Load())
	}
}

// TestUpdateServiceCheckStable 验证稳定版本仅调用 GitHub latest 接口。
func TestUpdateServiceCheckStable(t *testing.T) {
	originalVersion := appmeta.Version
	appmeta.Version = "v0.1.7"
	t.Cleanup(func() {
		appmeta.Version = originalVersion
	})

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 稳定通道由 latest 接口排除所有预发布版本。
		if r.URL.Path != "/latest" {
			t.Fatalf("unexpected request path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{
			"tag_name":"v0.1.8",
			"html_url":"https://example.com/release",
			"published_at":"2026-09-08T01:02:25Z",
			"assets":[]
		}`)
	}))
	defer server.Close()

	updateService := &UpdateService{
		client:  server.Client(),
		apiURL:  server.URL,
		now:     time.Now,
		entries: make(map[bool]updateCacheEntry),
	}
	info, err := updateService.Check(context.Background())
	if err != nil {
		t.Fatalf("check failed: %v", err)
	}
	if info.IncludePreview || !info.UpdateAvailable || info.LatestVersion != "v0.1.8" {
		t.Fatalf("unexpected stable update info: %+v", info)
	}
}

// TestUpdateServiceRateLimit 验证匿名 GitHub API 限流会返回友好提示。
func TestUpdateServiceRateLimit(t *testing.T) {
	originalVersion := appmeta.Version
	appmeta.Version = "v0.1.7"
	t.Cleanup(func() {
		appmeta.Version = originalVersion
	})

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()

	updateService := &UpdateService{
		client:  server.Client(),
		apiURL:  server.URL,
		now:     time.Now,
		entries: make(map[bool]updateCacheEntry),
	}
	_, err := updateService.Check(context.Background())
	if err == nil || err.Error() != "GitHub API 请求受限，请稍后重试" {
		t.Fatalf("unexpected error: %v", err)
	}
}

// TestExpectedAssetName 验证服务端与桌面端的发布资产命名规则。
func TestExpectedAssetName(t *testing.T) {
	tests := []struct {
		name     string
		mode     string
		goos     string
		goarch   string
		expected string
	}{
		{
			name:     "server windows arm64",
			mode:     "server",
			goos:     "windows",
			goarch:   "arm64",
			expected: "my-bulker-windows-arm64.zip",
		},
		{
			name:     "desktop darwin universal",
			mode:     "desktop",
			goos:     "darwin",
			goarch:   "arm64",
			expected: "my-bulker-desktop-darwin-universal.zip",
		},
		{
			name:     "desktop linux amd64",
			mode:     "desktop",
			goos:     "linux",
			goarch:   "amd64",
			expected: "my-bulker-desktop-linux-amd64.tar.gz",
		},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			actual := expectedAssetName(test.mode, test.goos, test.goarch)
			if actual != test.expected {
				t.Fatalf("expected %s, got %s", test.expected, actual)
			}
		})
	}
}
