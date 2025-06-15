# Tenant Tools

Multi-Database Batch SQL Execution and Schema Synchronization.

## 项目结构

```
.
├── internal/           # 内部包
│   ├── bootstrap/     # 应用初始化
│   ├── handler/       # HTTP 处理器
│   ├── middleware/    # 中间件
│   ├── pkg/          # 内部工具包
│   │   └── response/ # 响应处理
│   ├── router/       # 路由注册
│   └── service/      # 业务逻辑
├── build/            # 构建产物目录
├── main.go          # 应用入口
├── Makefile         # 构建脚本
└── README.md        # 项目文档
```

## 快速开始

### 环境要求

- Go 1.21 或更高版本
- Make 工具

### 安装依赖

```bash
make tidy
```

### 构建应用

```bash
make build
```

### 运行应用

```bash
make run
```

应用将在 http://localhost:3000 启动。

### 可用命令

- `make build` - 构建应用
- `make run` - 运行应用
- `make clean` - 清理构建产物
- `make tidy` - 整理依赖
- `make help` - 显示帮助信息

## API 接口

### 健康检查

```bash
curl http://localhost:3000/health
```

响应示例：
```json
{
    "code": 200,
    "message": "服务正常运行中 (v1.0.0)"
}
```

## 功能特性

- 多数据库支持
- 批量 SQL 执行
- 数据库模式同步
- RESTful API 接口
- 中间件支持
- 标准响应格式
- 优雅的项目结构
- 便捷的构建工具
