---
type: "always_apply"
---

# Backend Standards

> 注意：这是唯一的后端规范文档，所有后端相关的规范都应该在这里维护，不允许创建新的规则文件。

## 技术栈

- 语言：Go 1.21+
- Web 框架：Fiber
- 数据库：SQLite (GORM)
- 构建工具：Make
- 依赖管理：Go Modules

## 项目结构

```
.
├── internal/           # 内部包
│   ├── bootstrap/     # 应用初始化
│   ├── handler/       # HTTP 处理器
│   ├── middleware/    # 中间件
│   ├── model/        # 数据模型
│   ├── pkg/          # 内部工具包
│   ├── router/       # 路由注册
│   └── service/      # 业务逻辑
├── build/            # 构建产物目录
├── main.go          # 应用入口
└── Makefile         # 构建脚本
```

## 开发规范

### 代码组织
- 遵循 Go 标准项目布局
- 使用 internal 包保护内部代码
- 按功能模块组织代码
- 保持包的精简和专注

### API 设计
- 遵循 RESTful 设计原则
- 使用标准 HTTP 方法
- 实现统一的响应格式
- 提供清晰的 API 文档

### 错误处理
- 使用自定义错误类型
- 实现统一的错误处理
- 提供有意义的错误信息
- 记录详细的错误日志

### 数据库操作
- 使用 GORM 进行数据库操作
- 实现事务管理
- 优化查询性能
- 处理并发访问

### 中间件使用
- 实现必要的中间件
- 保持中间件简洁
- 注意中间件顺序
- 处理跨域问题

### 测试规范
- 编写单元测试
- 实现集成测试
- 使用测试覆盖率工具
- 模拟外部依赖

## 开发命令

```bash
# 安装依赖
make tidy

# 构建应用
make build

# 运行服务
make run

# 清理构建产物
make clean

# 显示帮助信息
make help
```

### 编译检查规范

- **重要：不要运行/编译用户的程序**
- 只进行代码编译检查，不执行实际运行
- 专注于代码实现和问题解决

## 最佳实践

1. 代码风格
   - 遵循 Go 代码规范
   - 使用 gofmt 格式化代码
   - 添加必要的注释
   - 保持代码简洁

2. 错误处理
   - 检查所有错误
   - 提供上下文信息
   - 使用错误包装
   - 实现优雅降级

3. 性能优化
   - 使用连接池
   - 实现缓存策略
   - 优化数据库查询
   - 监控性能指标

4. 安全性
   - 验证输入数据
   - 防止 SQL 注入
   - 实现访问控制
   - 保护敏感信息

5. 日志管理
   - 使用结构化日志
   - 记录关键信息
   - 实现日志轮转
   - 区分日志级别

## 响应格式

所有 API 响应应遵循以下格式：

```json
{
    "code": 200,           // HTTP 状态码
    "message": "success",  // 响应消息
    "data": {             // 响应数据（可选）
        // 具体数据
    }
}
```

### Response 包使用说明

Response 包提供了统一的响应处理功能，位于 [internal/pkg/response/response.go](mdc:internal/pkg/response/response.go)。

#### 状态码常量
```go
const (
    CodeSuccess  = 200 // 成功
    CodeError    = 400 // 通用错误
    CodeInvalid  = 400 // 参数无效
    CodeAuth     = 401 // 认证错误
    CodeForbid   = 403 // 权限错误
    CodeNotFound = 404 // 资源不存在
    CodeConflict = 409 // 资源冲突
    CodeTimeout  = 408 // 超时错误
    CodeInternal = 500 // 内部错误
)
```

#### 响应函数
- `Ok(c *fiber.Ctx, message string)` - 成功响应，无数据
- `Fail(c *fiber.Ctx, message string)` - 失败响应
- `Success(c *fiber.Ctx, data interface{})` - 成功响应，带数据
- `Error(c *fiber.Ctx, code int, message string)` - 错误响应
- `Page(c *fiber.Ctx, total int64, page, pageSize int, list interface{})` - 分页响应
- `List(c *fiber.Ctx, list interface{})` - 列表响应
- `Invalid(c *fiber.Ctx, message string)` - 参数无效响应
- `Auth(c *fiber.Ctx, message string)` - 认证错误响应
- `Forbid(c *fiber.Ctx, message string)` - 权限错误响应
- `NotFound(c *fiber.Ctx, message string)` - 资源不存在响应
- `Conflict(c *fiber.Ctx, message string)` - 资源冲突响应
- `Timeout(c *fiber.Ctx, message string)` - 超时错误响应
- `Internal(c *fiber.Ctx, message string)` - 内部错误响应
- `Custom(c *fiber.Ctx, code int, message string, data interface{})` - 自定义响应

#### 使用示例
```go
// 成功响应
return response.Success(c, data)

// 错误响应
return response.Error(c, response.CodeNotFound, "资源不存在")

// 分页响应
return response.Page(c, total, page, pageSize, list)
```

## 路由规范

1. 路由前缀
   - API 路由统一使用 `/api` 前缀
   - 版本控制使用 `/v1` 等子路径

2. 路由命名
   - 使用小写字母
   - 使用连字符分隔
   - 保持语义清晰
   - 遵循 RESTful 风格

3. HTTP 方法
   - GET：查询操作
   - POST：创建操作
   - PUT：更新操作
   - DELETE：删除操作

4. 路由参数
   - 路径参数：`/api/v1/instances/:id`
   - 查询参数：`/api/v1/instances?page=1&size=10`
   - 请求体：JSON 格式

### Router 包使用说明

Router 包提供了路由注册功能，位于 [internal/router/router.go](mdc:internal/router/router.go)。

#### 路由注册
```go
func Register(app *fiber.App) {
    // 初始化处理器
    health := handler.NewHealth()
    instanceHandler := handler.NewInstanceHandler()

    // 全局中间件
    app.Use(middleware.CORS())

    // 健康检查路由
    app.Get("/health", health.Check)

    // API 路由组
    api := app.Group("/api")
    {
        // 实例管理
        instances := api.Group("/instances")
        {
            instances.Post("", instanceHandler.Create)       // 创建实例
            instances.Put("/:id", instanceHandler.Update)    // 更新实例
            instances.Delete("/:id", instanceHandler.Delete) // 删除实例
            instances.Get("/:id", instanceHandler.Get)       // 获取实例
            instances.Get("", instanceHandler.List)          // 获取实例列表
        }
    }
}
```

#### 路由注册步骤
1. 初始化处理器
2. 注册全局中间件
3. 注册基础路由（如健康检查）
4. 创建 API 路由组
5. 在路由组中注册具体的 API 路由

#### 最佳实践
- 使用路由组组织相关路由
- 为每个路由添加注释说明
- 遵循 RESTful 设计原则
- 保持路由结构清晰

## 数据库规范

1. 表设计
   - 使用有意义的表名
   - 实现软删除
   - 添加时间戳
   - 使用适当的索引

2. 字段规范
   - 使用有意义的字段名
   - 选择合适的数据类型
   - 添加必要的约束
   - 使用注释说明

3. 查询优化
   - 使用索引
   - 避免全表扫描
   - 优化连接查询
   - 使用适当的缓存

4. 事务处理
   - 保持事务简短
   - 处理死锁
   - 实现回滚机制
   - 注意并发控制
