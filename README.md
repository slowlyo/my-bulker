# My Bulker: 多数据库批量SQL执行与模式同步工具

`My Bulker` 是一个现代化的 Web 应用，旨在帮助开发者和数据库管理员轻松管理多个数据库实例，实现批量 SQL 执行和数据库模式的同步。

## ✨ 核心功能

- **多数据库实例管理**：在一个地方连接和管理所有数据库，支持 MySQL。
- **批量 SQL 执行**：一次向多个数据库或多个 schema 执行 SQL 查询。
- **历史与结果追溯**：保存每次的执行任务历史，方便回溯和审计。
- **配置导入与导出**：轻松备份和迁移您的数据库连接配置。
- **Web 化界面**：通过现代、直观的 Web UI 进行所有操作。

## 🚀 如何运行 (推荐使用 Docker)

本项目已完全容器化，您无需在本地安装 Go 或 Node.js 环境。

### 环境要求

- [Docker](https://www.docker.com/products/docker-desktop/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 启动步骤

1.  **克隆项目**:
    ```bash
    git clone https://github.com/slowlyo/my-bulker.git
    cd my-bulker
    ```

2.  **启动服务**:
    ```bash
    docker-compose up --build -d
    ```
    这个命令会：
    - 在后台构建并启动应用容器。
    - 第一次启动时会自动构建前端和后端，可能需要几分钟。

3.  **访问应用**:
    构建完成后，打开浏览器访问: **http://localhost:9092**

### 管理服务

- **停止服务**: `docker-compose down`
- **查看日志**: `docker-compose logs -f`

## 🛠️ 技术栈

- **后端**: Go, Fiber (高性能 Web 框架)
- **前端**: UmiJS, Ant Design Pro, Tailwind CSS
- **数据库**: GORM (ORM), SQLite (默认元数据存储)

## 📸 应用预览

todo ...