package model

// CreateInstanceRequest 创建实例请求
type CreateInstanceRequest struct {
	Name     string         `json:"name" validate:"required"`     // 实例名称
	Host     string         `json:"host" validate:"required"`     // 主机地址
	Port     int            `json:"port" validate:"required"`     // 端口
	Username string         `json:"username" validate:"required"` // 用户名
	Password string         `json:"password" validate:"required"` // 密码
	Params   InstanceParams `json:"params"`                       // 额外参数
	Remark   string         `json:"remark"`                       // 备注
}

// UpdateInstanceRequest 更新实例请求
type UpdateInstanceRequest struct {
	Name     string         `json:"name" validate:"required"`     // 实例名称
	Host     string         `json:"host" validate:"required"`     // 主机地址
	Port     int            `json:"port" validate:"required"`     // 端口
	Username string         `json:"username" validate:"required"` // 用户名
	Password string         `json:"password" validate:"required"` // 密码
	Params   InstanceParams `json:"params"`                       // 额外参数
	Remark   string         `json:"remark"`                       // 备注
}

// InstanceResponse 实例响应
type InstanceResponse struct {
	ID        uint           `json:"id"`         // 实例ID
	CreatedAt string         `json:"created_at"` // 创建时间
	UpdatedAt string         `json:"updated_at"` // 更新时间
	Name      string         `json:"name"`       // 实例名称
	Host      string         `json:"host"`       // 主机地址
	Port      int            `json:"port"`       // 端口
	Username  string         `json:"username"`   // 用户名
	Password  string         `json:"password"`   // 密码
	Version   string         `json:"version"`    // 数据库版本
	Params    InstanceParams `json:"params"`     // 额外参数
	Remark    string         `json:"remark"`     // 备注
}

// InstanceListRequest 实例列表请求
type InstanceListRequest struct {
	Pagination `query:""` // 嵌入分页参数
	Name       string     `query:"name" json:"name"`         // 实例名称（模糊查询）
	Host       string     `query:"host" json:"host"`         // 主机地址（模糊查询）
	Username   string     `query:"username" json:"username"` // 用户名（模糊查询）
	Remark     string     `query:"remark" json:"remark"`     // 备注（模糊查询）
}

// InstanceListResponse 实例列表响应
type InstanceListResponse struct {
	Total int64              `json:"total"` // 总数
	Items []InstanceResponse `json:"items"` // 列表项
}
