package model

import (
	"fmt"
)

// Config 配置信息表，仅包含键值
// c_key 为主键

type Config struct {
	CKey   string `gorm:"primaryKey;size:100;column:c_key;comment:配置键" json:"c_key"`
	CValue string `gorm:"type:text;not null;column:c_value;comment:配置值" json:"c_value"`
}

func (Config) TableName() string {
	return "configs"
}

// DefaultConfig 配置结构体
// 字段名与配置项一一对应

type DefaultConfig struct {
	MaxConn         int
	Concurrency     int
	QueryTimeoutSec int
}

// DefaultConfigValues 默认配置实例
var DefaultConfigValues = DefaultConfig{
	MaxConn:         100,
	Concurrency:     50,
	QueryTimeoutSec: 300,
}

// ToMap 转为 map[string]string
func (c DefaultConfig) ToMap() map[string]string {
	return map[string]string{
		"max_conn":          fmt.Sprintf("%d", c.MaxConn),
		"concurrency":       fmt.Sprintf("%d", c.Concurrency),
		"query_timeout_sec": fmt.Sprintf("%d", c.QueryTimeoutSec),
	}
}
