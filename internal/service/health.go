package service

// HealthService 健康检查服务
type HealthService struct{}

// NewHealthService 创建健康检查服务实例
func NewHealthService() *HealthService {
	return &HealthService{}
}

// GetStatus 获取服务状态
func (s *HealthService) GetStatus() map[string]interface{} {
	return map[string]interface{}{
		"status":  "ok",
		"version": "1.0.0",
	}
}
