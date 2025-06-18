package model

// InstanceBasicInfo 实例基本信息
type InstanceBasicInfo struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

// DatabaseListRequest 数据库列表请求
type DatabaseListRequest struct {
	Pagination `query:""` // 嵌入分页参数
	Sorting    `query:""` // 嵌入排序参数
	Name       string     `query:"name" json:"name"`               // 数据库名称（模糊查询）
	InstanceID uint       `query:"instance_id" json:"instance_id"` // 实例ID
}

// DatabaseResponse 数据库响应
type DatabaseResponse struct {
	ID                uint              `json:"id"`
	CreatedAt         string            `json:"created_at"`
	UpdatedAt         string            `json:"updated_at"`
	Name              string            `json:"name"`
	InstanceID        uint              `json:"instance_id"`
	CharacterSet      string            `json:"character_set"`
	Collation         string            `json:"collation"`
	Size              int64             `json:"size"`
	TableCount        int               `json:"table_count"`
	MaxConnections    int               `json:"max_connections"`
	ConnectionTimeout int               `json:"connection_timeout"`
	Instance          InstanceBasicInfo `json:"instance"`
}

// DatabaseListResponse 数据库列表响应
type DatabaseListResponse struct {
	Total int64              `json:"total"` // 总数
	Items []DatabaseResponse `json:"items"` // 列表项
}
