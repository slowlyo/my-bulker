package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"runtime"
	"strings"
	"sync"
	"time"

	"my-bulker/internal/pkg/appmeta"

	"golang.org/x/mod/semver"
)

const (
	githubReleasesAPI = "https://api.github.com/repos/slowlyo/my-bulker/releases"
	updateCacheTTL    = 10 * time.Minute
)

// UpdateAsset 描述可直接下载的发布资产。
type UpdateAsset struct {
	Name        string `json:"name"`
	DownloadURL string `json:"download_url"`
	Size        int64  `json:"size"`
	Recommended bool   `json:"recommended"`
}

// UpdateInfo 汇总当前版本、目标版本和运行环境对应的下载信息。
type UpdateInfo struct {
	CurrentVersion  string        `json:"current_version"`
	LatestVersion   string        `json:"latest_version"`
	UpdateAvailable bool          `json:"update_available"`
	IncludePreview  bool          `json:"include_preview"`
	RuntimeMode     string        `json:"runtime_mode"`
	OS              string        `json:"os"`
	Arch            string        `json:"arch"`
	ReleaseURL      string        `json:"release_url"`
	PublishedAt     time.Time     `json:"published_at"`
	CheckedAt       time.Time     `json:"checked_at"`
	Recommended     *UpdateAsset  `json:"recommended_asset,omitempty"`
	Assets          []UpdateAsset `json:"assets"`
}

type githubRelease struct {
	TagName     string        `json:"tag_name"`
	HTMLURL     string        `json:"html_url"`
	Draft       bool          `json:"draft"`
	Prerelease  bool          `json:"prerelease"`
	PublishedAt time.Time     `json:"published_at"`
	Assets      []githubAsset `json:"assets"`
}

type githubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

type updateCacheEntry struct {
	info      UpdateInfo
	expiresAt time.Time
}

// UpdateService 负责查询 GitHub Releases，并短时缓存成功结果。
type UpdateService struct {
	client  *http.Client
	apiURL  string
	now     func() time.Time
	mu      sync.Mutex
	entries map[bool]updateCacheEntry
}

// NewUpdateService 创建使用公开 GitHub API 的版本检测服务。
func NewUpdateService() *UpdateService {
	return &UpdateService{
		client:  &http.Client{Timeout: 8 * time.Second},
		apiURL:  githubReleasesAPI,
		now:     time.Now,
		entries: make(map[bool]updateCacheEntry),
	}
}

// Check 根据当前版本通道查询更新，并返回最匹配当前构建的资产。
func (s *UpdateService) Check(ctx context.Context) (UpdateInfo, error) {
	currentVersion := appmeta.DisplayVersion()
	includePreview := semver.IsValid(currentVersion) && semver.Prerelease(currentVersion) != ""
	now := s.now()

	s.mu.Lock()
	defer s.mu.Unlock()

	// 缓存仍有效时直接复用，避免配置页刷新反复消耗 GitHub 匿名额度。
	if entry, ok := s.entries[includePreview]; ok && now.Before(entry.expiresAt) {
		return entry.info, nil
	}

	release, err := s.fetchRelease(ctx, includePreview)
	// 外部 API 不可用时不缓存失败，使用户恢复网络后可以立即重试。
	if err != nil {
		return UpdateInfo{}, err
	}

	info := buildUpdateInfo(currentVersion, includePreview, release, now)
	s.entries[includePreview] = updateCacheEntry{
		info:      info,
		expiresAt: now.Add(updateCacheTTL),
	}
	return info, nil
}

// fetchRelease 按版本通道读取稳定版或包含预发布版的最高语义版本。
func (s *UpdateService) fetchRelease(ctx context.Context, includePreview bool) (githubRelease, error) {
	// 稳定版使用 GitHub latest 接口，天然排除草稿和预发布版本。
	if !includePreview {
		var release githubRelease
		if err := s.fetchJSON(ctx, s.apiURL+"/latest", &release); err != nil {
			return githubRelease{}, err
		}
		return release, nil
	}

	var releases []githubRelease
	if err := s.fetchJSON(ctx, s.apiURL+"?per_page=30", &releases); err != nil {
		return githubRelease{}, err
	}

	var selected githubRelease
	for _, release := range releases {
		// 草稿不可供用户下载，无效标签也无法进行可靠的语义版本比较。
		if release.Draft || !semver.IsValid(release.TagName) {
			continue
		}
		// 首个有效版本或更高版本成为候选，稳定版与预发布版统一比较。
		if selected.TagName == "" || semver.Compare(release.TagName, selected.TagName) > 0 {
			selected = release
		}
	}
	// 列表中没有有效发布时明确报错，避免把空版本展示为“已是最新”。
	if selected.TagName == "" {
		return githubRelease{}, errors.New("GitHub 暂无可用版本")
	}
	return selected, nil
}

// fetchJSON 请求 GitHub API，并把常见网络和限流错误转换为中文提示。
func (s *UpdateService) fetchJSON(ctx context.Context, url string, target any) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	// URL 来自服务内部常量；构造失败说明配置本身无效。
	if err != nil {
		return fmt.Errorf("创建版本检测请求失败: %w", err)
	}
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("User-Agent", "my-bulker-update-checker")
	request.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	response, err := s.client.Do(request)
	// 超时与主动取消需要单独提示，便于用户区分无网和服务异常。
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return errors.New("检查更新超时，请确认网络后重试")
		}
		return errors.New("无法连接 GitHub，请确认网络后重试")
	}
	defer response.Body.Close()

	// 匿名 API 达到额度时给出可执行提示，不要求用户配置令牌。
	if response.StatusCode == http.StatusForbidden || response.StatusCode == http.StatusTooManyRequests {
		return errors.New("GitHub API 请求受限，请稍后重试")
	}
	// 其他非成功状态不解析响应体，避免把 GitHub 错误结构误当发布数据。
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("GitHub API 暂不可用（状态码 %d）", response.StatusCode)
	}
	if err := json.NewDecoder(response.Body).Decode(target); err != nil {
		return errors.New("GitHub 返回的数据无法解析")
	}
	return nil
}

// buildUpdateInfo 计算更新状态，并标记与当前构建类型、平台和架构完全匹配的资产。
func buildUpdateInfo(currentVersion string, includePreview bool, release githubRelease, checkedAt time.Time) UpdateInfo {
	expectedName := expectedAssetName(appmeta.RuntimeMode, runtime.GOOS, runtime.GOARCH)
	assets := make([]UpdateAsset, 0, len(release.Assets))
	var recommended *UpdateAsset

	for _, asset := range release.Assets {
		// 仅返回本应用的压缩包，过滤校验文件或未来附加的发布材料。
		if !strings.HasPrefix(asset.Name, "my-bulker-") {
			continue
		}
		item := UpdateAsset{
			Name:        asset.Name,
			DownloadURL: asset.BrowserDownloadURL,
			Size:        asset.Size,
			Recommended: asset.Name == expectedName,
		}
		assets = append(assets, item)
		// 精确匹配仅应出现一次；复制值可避免指向后续循环变量。
		if item.Recommended {
			selected := item
			recommended = &selected
		}
	}

	updateAvailable := semver.IsValid(currentVersion) &&
		semver.IsValid(release.TagName) &&
		semver.Compare(release.TagName, currentVersion) > 0

	return UpdateInfo{
		CurrentVersion:  currentVersion,
		LatestVersion:   release.TagName,
		UpdateAvailable: updateAvailable,
		IncludePreview:  includePreview,
		RuntimeMode:     appmeta.RuntimeMode,
		OS:              runtime.GOOS,
		Arch:            runtime.GOARCH,
		ReleaseURL:      release.HTMLURL,
		PublishedAt:     release.PublishedAt,
		CheckedAt:       checkedAt,
		Recommended:     recommended,
		Assets:          assets,
	}
}

// expectedAssetName 按发布工作流的命名规则生成当前运行环境的目标资产名。
func expectedAssetName(mode, goos, goarch string) string {
	extension := ".tar.gz"
	// Windows 发布包使用 zip，其余平台使用 tar.gz。
	if goos == "windows" {
		extension = ".zip"
	}

	// 桌面版使用 desktop 前缀，macOS 发布的是同时支持两种架构的 universal zip。
	if mode == "desktop" {
		if goos == "darwin" {
			return "my-bulker-desktop-darwin-universal.zip"
		}
		return fmt.Sprintf("my-bulker-desktop-%s-%s%s", goos, goarch, extension)
	}
	return fmt.Sprintf("my-bulker-%s-%s%s", goos, goarch, extension)
}
