#!/usr/bin/env bash
set -euo pipefail

# 本地/CI 共用的桌面端构建入口：先保证 ui/dist，再交给 Wails。
# 额外参数会原样传给 `wails build`，例如 `-platform windows/amd64`。

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

APP_VERSION="${APP_VERSION:-v1.0.0}"
SKIP_UI="${SKIP_UI:-0}"

if ! command -v wails >/dev/null 2>&1; then
  echo "wails CLI 未安装。执行: go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0" >&2
  exit 1
fi

if [[ "$SKIP_UI" != "1" ]]; then
  make build-ui
fi

if [[ ! -d ui/dist ]]; then
  echo "ui/dist 不存在，无法嵌入前端。请先执行 make build-ui" >&2
  exit 1
fi

extra_args=()
# 仅当系统没有 4.0 开发包、只有 4.1 时才打 webkit2_41，避免在 22.04 上误链 4.1。
if [[ "$(uname -s)" == "Linux" ]] && command -v pkg-config >/dev/null 2>&1; then
  if pkg-config --exists webkit2gtk-4.1 && ! pkg-config --exists webkit2gtk-4.0; then
    extra_args+=(-tags webkit2_41)
  fi
fi

# embed 只对 Windows 有意义：把 WebView2 引导程序打进 exe，绿色包更完整。
if [[ "${RUNNER_OS:-}" == "Windows" || "$(uname -s)" == MINGW* || "$(uname -s)" == MSYS* || "$(uname -s)" == CYGWIN* ]]; then
  extra_args+=(-webview2 embed)
fi

exec wails build \
  -skipbindings \
  -ldflags "-X my-bulker/internal/pkg/appmeta.Version=${APP_VERSION}" \
  "${extra_args[@]}" \
  "$@"
