package model

import "time"

// DatabaseListRequest 数据库列表请求
type DatabaseListRequest struct {
	Pagination `query:""` // 嵌入分页参数
	Name       string     `query:"name" json:"name"`               // 数据库名称（模糊查询）
	InstanceID uint       `query:"instance_id" json:"instance_id"` // 所属实例ID
}

// DatabaseResponse 数据库响应
type DatabaseResponse struct {
	ID           uint      `json:"id"`            // 数据库ID
	Name         string    `json:"name"`          // 数据库名称
	InstanceID   uint      `json:"instance_id"`   // 所属实例ID
	InstanceName string    `json:"instance_name"` // 所属实例名称
	Size         int64     `json:"size"`          // 数据库大小（字节）
	TableCount   int       `json:"table_count"`   // 表数量
	UpdatedAt    time.Time `json:"updated_at"`    // 最后同步时间
}

// DatabaseListResponse 数据库列表响应
type DatabaseListResponse struct {
	Total int64              `json:"total"` // 总数
	Items []DatabaseResponse `json:"items"` // 列表项
}
