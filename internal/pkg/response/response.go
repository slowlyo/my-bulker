package response

import (
	"github.com/gofiber/fiber/v2"
)

// 业务状态码常量（使用 HTTP 状态码）
const (
	CodeSuccess  = fiber.StatusOK                  // 200 成功
	CodeError    = fiber.StatusBadRequest          // 400 通用错误
	CodeInvalid  = fiber.StatusBadRequest          // 400 参数无效
	CodeAuth     = fiber.StatusUnauthorized        // 401 认证错误
	CodeForbid   = fiber.StatusForbidden           // 403 权限错误
	CodeNotFound = fiber.StatusNotFound            // 404 资源不存在
	CodeConflict = fiber.StatusConflict            // 409 资源冲突
	CodeTimeout  = fiber.StatusRequestTimeout      // 408 超时错误
	CodeInternal = fiber.StatusInternalServerError // 500 内部错误
)

// Response 标准响应结构
type Response struct {
	Code    int         `json:"code"`           // 业务状态码（HTTP 状态码）
	Message string      `json:"message"`        // 提示信息
	Data    interface{} `json:"data,omitempty"` // 响应数据
}

// PageResponse 分页响应结构
type PageResponse struct {
	Total    int64       `json:"total"`    // 总记录数
	Page     int         `json:"page"`     // 当前页码
	PageSize int         `json:"pageSize"` // 每页大小
	List     interface{} `json:"list"`     // 数据列表
}

// Ok 成功响应
func Ok(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusOK).JSON(Response{
		Code:    CodeSuccess,
		Message: message,
	})
}

// Fail 失败响应
func Fail(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusOK).JSON(Response{
		Code:    CodeError,
		Message: message,
	})
}

// Success 成功响应
func Success(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusOK).JSON(Response{
		Code:    CodeSuccess,
		Message: "success",
		Data:    data,
	})
}

// Error 错误响应
func Error(c *fiber.Ctx, code int, message string) error {
	return c.Status(fiber.StatusOK).JSON(Response{
		Code:    code,
		Message: message,
	})
}

// Page 分页响应
func Page(c *fiber.Ctx, total int64, page, pageSize int, list interface{}) error {
	return c.Status(fiber.StatusOK).JSON(Response{
		Code:    CodeSuccess,
		Message: "success",
		Data: PageResponse{
			Total:    total,
			Page:     page,
			PageSize: pageSize,
			List:     list,
		},
	})
}

// List 列表响应
func List(c *fiber.Ctx, list interface{}) error {
	return c.Status(fiber.StatusOK).JSON(Response{
		Code:    CodeSuccess,
		Message: "success",
		Data:    list,
	})
}

// Invalid 参数无效响应
func Invalid(c *fiber.Ctx, message string) error {
	return Error(c, CodeInvalid, message)
}

// Auth 认证错误响应
func Auth(c *fiber.Ctx, message string) error {
	return Error(c, CodeAuth, message)
}

// Forbid 权限错误响应
func Forbid(c *fiber.Ctx, message string) error {
	return Error(c, CodeForbid, message)
}

// NotFound 资源不存在响应
func NotFound(c *fiber.Ctx, message string) error {
	return Error(c, CodeNotFound, message)
}

// Conflict 资源冲突响应
func Conflict(c *fiber.Ctx, message string) error {
	return Error(c, CodeConflict, message)
}

// Timeout 超时错误响应
func Timeout(c *fiber.Ctx, message string) error {
	return Error(c, CodeTimeout, message)
}

// Internal 内部错误响应
func Internal(c *fiber.Ctx, message string) error {
	return Error(c, CodeInternal, message)
}

// Custom 自定义响应
func Custom(c *fiber.Ctx, code int, message string, data interface{}) error {
	return c.Status(fiber.StatusOK).JSON(Response{
		Code:    code,
		Message: message,
		Data:    data,
	})
}
