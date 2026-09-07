package appdata

import (
	"os"
	"path/filepath"
	"strings"
)

const appName = "my-bulker"

// IsMacAppBundle 判断可执行文件是否位于 macOS .app/Contents/MacOS 中。
// 安装到 /Applications 时该目录通常不可写，不能把 ./data 放在包内。
func IsMacAppBundle(exeDir string) bool {
	return strings.Contains(filepath.ToSlash(exeDir), ".app/Contents/MacOS")
}

// ResolveDesktopRoot 选择桌面端工作目录。
// .app 或可执行文件目录不可写时，退回到用户配置目录，保证 SQLite 能创建 ./data。
func ResolveDesktopRoot(exeDir, userConfigDir string, inMacBundle, exeDirWritable bool) string {
	// 绿色包：数据和可执行文件放一起，方便拷贝带走。
	if !inMacBundle && exeDirWritable {
		return exeDir
	}
	return filepath.Join(userConfigDir, appName)
}

// PrepareDesktopWorkingDir 把进程 cwd 切到桌面数据根目录。
// 现有 database.Init 使用 ./data，改 cwd 即可复用，不必改服务端路径逻辑。
func PrepareDesktopWorkingDir() error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	exe, err = filepath.EvalSymlinks(exe)
	if err != nil {
		return err
	}

	exeDir := filepath.Dir(exe)
	userConfigDir, err := os.UserConfigDir()
	if err != nil {
		return err
	}

	root := ResolveDesktopRoot(exeDir, userConfigDir, IsMacAppBundle(exeDir), dirWritable(exeDir))
	if err := os.MkdirAll(root, 0755); err != nil {
		return err
	}
	return os.Chdir(root)
}

// dirWritable 通过创建临时文件探测目录是否可写。
func dirWritable(dir string) bool {
	f, err := os.CreateTemp(dir, ".my-bulker-write-test-*")
	if err != nil {
		return false
	}
	name := f.Name()
	_ = f.Close()
	_ = os.Remove(name)
	return true
}
