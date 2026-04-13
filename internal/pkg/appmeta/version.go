package appmeta

const defaultVersion = "v1.0.0"

var Version = defaultVersion

// DisplayVersion 返回应用展示版本
func DisplayVersion() string {
	// 构建未注入版本时继续使用默认值，避免界面和接口出现空版本号
	if Version == "" {
		return defaultVersion
	}

	return Version
}
