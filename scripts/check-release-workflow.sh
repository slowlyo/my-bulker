#!/usr/bin/env bash
set -euo pipefail

# 静态检查 release.yml：桌面 job、产物命名、原有服务端矩阵都还在。

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
wf="$root/.github/workflows/release.yml"

if [[ ! -f "$wf" ]]; then
  echo "缺少 $wf" >&2
  exit 1
fi

python3 - "$wf" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()

required = [
    ("服务端 linux 矩阵", r"goos:\s*\[linux,\s*windows,\s*darwin\]"),
    ("服务端 arch 矩阵", r"goarch:\s*\[amd64,\s*arm64\]"),
    ("桌面 job", r"build-desktop:"),
    ("Windows 桌面平台", r"wails_platform:\s*windows/amd64"),
    ("macOS 桌面包", r"wails_platform:\s*darwin/"),
    ("Linux 桌面包", r"wails_platform:\s*linux/amd64"),
    ("Wails CLI", r"github.com/wailsapp/wails/v2/cmd/wails"),
    ("桌面产物前缀", r"my-bulker-desktop-"),
    ("Release 上传", r"softprops/action-gh-release"),
    ("服务端 ldflags 版本", r"appmeta\.Version"),
    ("静态检查 job", r"lint-workflow:"),
    ("桌面依赖服务端 job", r"needs:\s*\[build,\s*build-desktop\]"),
]

failed = False
for name, pattern in required:
    if re.search(pattern, text) is None:
        print(f"MISSING: {name} ({pattern})")
        failed = True

if "CGO_ENABLED=0" not in text:
    print("MISSING: 服务端仍应 CGO_ENABLED=0")
    failed = True

if failed:
    sys.exit(1)

print("release.yml static checks passed")
PY
