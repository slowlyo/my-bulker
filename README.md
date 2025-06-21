# My Bulker

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
├── ui/               # 前端项目
│   ├── src/         # 源代码
│   │   ├── components/  # 组件
│   │   ├── pages/      # 页面
│   │   ├── services/   # API 服务
│   │   ├── utils/      # 工具函数
│   │   └── types/      # 类型定义
│   ├── .umirc.ts    # UmiJS 配置
│   ├── package.json # 依赖配置
│   └── tsconfig.json # TypeScript 配置
├── build/            # 构建产物目录
├── main.go          # 应用入口
├── Makefile         # 构建脚本
└── README.md        # 项目文档
```

## 快速开始

### 后端环境要求

- Go 1.21 或更高版本
- Make 工具

### 前端环境要求

- Node.js 16 或更高版本
- pnpm 包管理器

### 安装依赖

后端依赖：
```bash
make tidy
```

前端依赖：
```bash
cd ui
pnpm install
```

### 构建应用

构建后端：
```bash
make build
```

构建前端：
```bash
make build-ui
```

### 运行应用

运行后端服务：
```bash
make run
```

运行前端开发服务：
```bash
make run-ui
```

应用将在以下地址启动：
- 后端 API: http://localhost:3000
- 前端界面: http://localhost:8000

### 可用命令

后端命令：
- `make build` - 构建后端应用
- `make run` - 运行后端服务
- `make clean` - 清理构建产物
- `make tidy` - 整理后端依赖
- `make help` - 显示帮助信息

前端命令：
- `make build-ui` - 构建前端应用
- `make run-ui` - 启动前端开发服务器
- `cd ui && pnpm test` - 运行前端测试
- `pnpm dev` - 启动开发服务器
- `pnpm build` - 构建生产版本
- `pnpm test` - 运行测试
- `pnpm lint` - 运行代码检查

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

### 后端特性
- 多数据库支持
- 批量 SQL 执行
- 数据库模式同步
- RESTful API 接口
- 中间件支持
- 标准响应格式
- 优雅的项目结构
- 便捷的构建工具

#### 主要依赖
- [Fiber](https://github.com/gofiber/fiber) - 高性能 Web 框架
- [UUID](https://github.com/google/uuid) - UUID 生成
- [Brotli](https://github.com/andybalholm/brotli) - 压缩支持
- [FastHTTP](https://github.com/valyala/fasthttp) - 高性能 HTTP 客户端

### 前端特性
- 基于 UmiJS 的现代化前端框架
- TypeScript 类型支持
- Tailwind CSS 样式系统
- 响应式设计
- 组件化开发
- 统一的代码规范
- 完整的开发工具链

#### 主要依赖
- [UmiJS Max](https://umijs.org/) - 企业级前端应用框架
- [Ant Design](https://ant.design/) - 企业级 UI 设计语言和 React 组件库
- [Ant Design Pro Components](https://procomponents.ant.design/) - 高级组件库
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
