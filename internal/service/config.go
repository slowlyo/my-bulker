package service

import (
	"my-bulker/internal/model"
	"my-bulker/internal/pkg/database"
	"sync"

	"gorm.io/gorm"
)

type ConfigService struct {
	cache sync.Map // map[string]string
}

var configServiceInstance *ConfigService
var configOnce sync.Once

// NewConfigService 单例
func NewConfigService() *ConfigService {
	configOnce.Do(func() {
		configServiceInstance = &ConfigService{}
	})
	return configServiceInstance
}

// GetConfig 获取配置，优先查缓存
func (s *ConfigService) GetConfig(key string) (string, error) {
	if v, ok := s.cache.Load(key); ok {
		return v.(string), nil
	}
	db := database.GetDB()
	var cfg model.Config
	err := db.First(&cfg, "c_key = ?", key).Error
	if err != nil {
		return "", err
	}
	s.cache.Store(key, cfg.CValue)
	return cfg.CValue, nil
}

// SetConfig 设置配置，写库并更新缓存
func (s *ConfigService) SetConfig(key, value string) error {
	db := database.GetDB()
	cfg := model.Config{CKey: key, CValue: value}
	err := db.Save(&cfg).Error
	if err != nil {
		return err
	}
	s.cache.Store(key, value)
	return nil
}

// BatchSetConfig 批量保存配置
func (s *ConfigService) BatchSetConfig(configs []model.Config) error {
	db := database.GetDB()
	return db.Transaction(func(tx *gorm.DB) error {
		for _, cfg := range configs {
			if err := tx.Save(&cfg).Error; err != nil {
				return err
			}
			s.cache.Store(cfg.CKey, cfg.CValue)
		}
		return nil
	})
}

// InitDefaultConfigs 初始化默认配置到缓存和数据库
func (s *ConfigService) InitDefaultConfigs() error {
	db := database.GetDB()
	for k, v := range model.DefaultConfigValues.ToMap() {
		var cfg model.Config
		err := db.First(&cfg, "c_key = ?", k).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				cfg = model.Config{CKey: k, CValue: v}
				if err := db.Create(&cfg).Error; err != nil {
					return err
				}
				s.cache.Store(k, v)
			} else {
				return err
			}
		} else {
			s.cache.Store(k, cfg.CValue)
		}
	}
	return nil
}

// BatchGetConfig 批量获取配置
func (s *ConfigService) BatchGetConfig(keys []string) ([]model.Config, error) {
	if len(keys) == 0 {
		return nil, nil
	}
	configs := make([]model.Config, 0, len(keys))
	db := database.GetDB()
	if err := db.Where("c_key IN ?", keys).Find(&configs).Error; err != nil {
		return nil, err
	}
	// 补全未设置项（用默认值）
	defaultMap := model.DefaultConfigValues.ToMap()
	for _, k := range keys {
		found := false
		for _, c := range configs {
			if c.CKey == k {
				found = true
				break
			}
		}
		if !found {
			configs = append(configs, model.Config{CKey: k, CValue: defaultMap[k]})
		}
	}
	return configs, nil
}
