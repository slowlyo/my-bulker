package model

// Pagination 分页参数
type Pagination struct {
	Page     int `query:"page" json:"page"`          // 页码
	PageSize int `query:"pageSize" json:"page_size"` // 每页大小
}

// ValidateAndSetDefaults 验证并设置默认值
func (p *Pagination) ValidateAndSetDefaults() {
	// 设置默认值
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PageSize < 1 {
		p.PageSize = 10
	}
	// 限制最大页大小
	if p.PageSize > 100 {
		p.PageSize = 100
	}
}

// GetOffset 获取偏移量
func (p *Pagination) GetOffset() int {
	return (p.Page - 1) * p.PageSize
}

// GetLimit 获取限制数量
func (p *Pagination) GetLimit() int {
	return p.PageSize
}

// Sorting 排序参数
type Sorting struct {
	SortField string `query:"sort_field" json:"sort_field"` // 排序字段
	SortOrder string `query:"sort_order" json:"sort_order"` // 排序方向：asc, desc
}

// ValidateAndSetDefaults 验证并设置默认值
func (s *Sorting) ValidateAndSetDefaults() {
	// 设置默认排序
	if s.SortField == "" {
		s.SortField = "updated_at"
	}
	if s.SortOrder == "" {
		s.SortOrder = "desc"
	}
	// 验证排序方向
	if s.SortOrder != "asc" && s.SortOrder != "desc" {
		s.SortOrder = "desc"
	}
}

// GetSortClause 获取排序子句
func (s *Sorting) GetSortClause() string {
	return s.SortField + " " + s.SortOrder
}

// Option 通用选项类型
type Option struct {
	Value interface{} `json:"value"` // 选项值
	Label string      `json:"label"` // 选项标签
}
