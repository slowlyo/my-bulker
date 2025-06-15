package model

// CreateInstanceRequest 创建实例请求
type CreateInstanceRequest struct {
	Name     string         `json:"name" binding:"required,max=100"`
	Host     string         `json:"host" binding:"required,max=255"`
	Port     int            `json:"port" binding:"required,min=1,max=65535"`
	Username string         `json:"username" binding:"required,max=100"`
	Password string         `json:"password" binding:"required,max=255"`
	Params   InstanceParams `json:"params"`
	Remark   string         `json:"remark" binding:"max=500"`
}

// UpdateInstanceRequest 更新实例请求
type UpdateInstanceRequest struct {
	Name     string         `json:"name" binding:"required,max=100"`
	Host     string         `json:"host" binding:"required,max=255"`
	Port     int            `json:"port" binding:"required,min=1,max=65535"`
	Username string         `json:"username" binding:"required,max=100"`
	Password string         `json:"password" binding:"required,max=255"`
	Params   InstanceParams `json:"params"`
	Remark   string         `json:"remark" binding:"max=500"`
}

// InstanceResponse 实例响应
type InstanceResponse struct {
	ID        uint           `json:"id"`
	CreatedAt string         `json:"created_at"`
	UpdatedAt string         `json:"updated_at"`
	Name      string         `json:"name"`
	Host      string         `json:"host"`
	Port      int            `json:"port"`
	Username  string         `json:"username"`
	Password  string         `json:"password"`
	Version   string         `json:"version"`
	Params    InstanceParams `json:"params"`
	Remark    string         `json:"remark"`
}

// InstanceListResponse 实例列表响应
type InstanceListResponse struct {
	Total int64              `json:"total"`
	Items []InstanceResponse `json:"items"`
}
