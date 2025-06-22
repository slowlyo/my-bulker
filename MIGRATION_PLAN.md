# Wails 迁移计划文档 (Migration Plan)

本文档旨在为将现有的 `my-bulker` 项目（基于 Go Fiber + UmiJS）迁移到 Wails v2 桌面应用提供一个清晰、分阶段的行动计划和技术指南。

## 1. 核心目标与原则

- **最终目标**: 将项目改造为一个高性能、跨平台的桌面应用程序。
- **框架选型**: 使用 **Wails v2**，以确保稳定性、成熟的生态和丰富的文档支持。
- **通信方式**: 废弃原有的 HTTP API 模式，全面转向 Wails v2 原生的 **Go 函数绑定模式**，以获得极致的性能和安全性。
- **数据库方案**: 替换依赖 CGO 的 `mattn/go-sqlite3` 驱动，采用纯 Go 实现的 **`modernc.org/sqlite`** 驱动，从根本上解决跨平台编译的难题。
- **开发语言**: 始终使用中文进行交流和注释。

---

## 2. 迁移阶段规划

### 阶段一：项目初始化与环境设置 (Phase 1: Initialization & Setup)

*此阶段的目标是搭建好 Wails 项目的基础环境，并将现有代码平稳迁移到新结构中。*

1.  **安装 Wails CLI**: 确保开发环境中已安装最新版的 Wails v2 命令行工具。
2.  **初始化 Wails 项目**:
    -   在当前项目外部执行 `wails init -n my-bulker -t umi` 命令，创建一个基于 UmiJS 模板的新 Wails 项目。
3.  **迁移后端代码**:
    -   将现有 Go 项目的 `internal/` 目录、`go.mod` 和 `go.sum` 文件整体移动到新创建的 `my-bulker` 项目根目录下。
    -   删除 Wails 模板生成的默认 `go.mod`。
4.  **替换数据库驱动**:
    -   进入项目根目录，执行 `go get modernc.org/sqlite` 和 `go mod tidy`。
    -   修改 GORM 初始化代码，将 `import _ "github.com/mattn/go-sqlite3"` 替换为 `import _ "modernc.org/sqlite"`。
5.  **迁移前端代码**:
    -   将现有 `ui/` 目录下的所有文件（`src`, `.umirc.ts`, `package.json` 等）移动到 Wails 项目的 `frontend/` 目录下，**完全替换**掉模板默认的前端文件。
6.  **配置 `wails.json`**:
    -   修改 `wails.json`，确保 `frontend:install` 设置为 `pnpm install`，`frontend:build` 设置为 `pnpm build`。

### 阶段二：后端改造 (Phase 2: Backend Refactoring)

*此阶段的核心是将基于 Fiber 的 HTTP 服务模式，转变为 Wails 的 Go 函数绑定模式。*

1.  **创建 Wails 应用实例 (`app.go`)**:
    -   在项目根目录创建一个新的 `app.go` 文件。
    -   在其中定义一个 `App` 结构体，作为 Wails 应用的核心，负责管理状态和暴露方法。
2.  **适配启动逻辑 (`OnStartup`)**:
    -   将 `internal/bootstrap/bootstrap.go` 中的数据库连接、服务初始化等逻辑迁移到 `App` 结构体的 `OnStartup` 生命周期钩子方法中。
    -   **关键**: 修改数据库文件路径，使用 `os.UserConfigDir()` 获取平台标准的应用数据目录，确保数据持久化位置的正确性。
3.  **重构应用入口 (`main.go`)**:
    -   彻底重写 `main.go`，移除所有 `fiber` 相关代码。
    -   新的 `main.go` 将负责创建 `App` 实例，并在 `wails.Run()` 的配置中将其绑定。
4.  **改造 Handler 层**:
    -   将 `internal/handler/` 中的所有 HTTP 处理器方法，重构为 `App` 结构体的方法。
    -   移除 `fiber.Ctx` 参数。所有前端数据通过函数参数直接传递。
    -   **注意**: 之前依赖中间件传递的上下文信息（如用户信息），现在需要作为显式参数传递。
5.  **清理废弃代码**:
    -   安全删除 `internal/router/` 目录。
    -   清理 `internal/middleware` 中不再需要的中间件（如 CORS）。

### 阶段三：前端集成 (Phase 3: Frontend Integration)

*此阶段的目标是让前端放弃 HTTP 请求，转而使用 Wails 提供的 JS-Go 调用方式。*

1.  **安装 Wails JS 模块**:
    -   在 `frontend/` 目录下运行 `pnpm install`。
2.  **重构 Service 层**:
    -   修改 `frontend/src/services/` 中的所有 API 请求逻辑。
    -   移除所有 `fetch` 或 `axios` 调用。
    -   使用 Wails 运行时提供的函数（如 `window.go.main.App.YourGoMethod(args)`）直接调用后端 Go 方法。
3.  **处理 Runtime 加载时机**:
    -   在 UmiJS 的主入口（如 `src/app.ts`）中，监听 `wails:ready` 事件。确保所有对 Go 函数的调用都在此事件触发后执行。
4.  **验证静态资源路径**:
    -   检查 `.umirc.ts` 配置，确保 `publicPath` 设置为 `'./'`，以保证所有资源在打包后使用相对路径。
5.  **开发模式联调**:
    -   在项目根目录运行 `wails dev`，进行前后端联调测试，确保所有功能正常。

### 阶段四：构建与收尾 (Phase 4: Build & Finalization)

*此阶段完成最终的构建、测试和清理工作。*

1.  **更新构建脚本 (`Makefile`)**:
    -   修改根目录的 `Makefile`，移除旧的命令，替换为 `wails dev` 和 `wails build` 等新命令。
2.  **配置应用图标**:
    -   根据 Wails 官方文档，在项目根目录创建 `build/appicon.png` 文件。
    -   推荐使用 `1024x1024` 像素的 PNG 图片，以确保在所有平台上都能生成高质量的图标。Wails 会在构建时自动处理转换。
3.  **执行生产构建**:
    -   运行 `wails build` 命令，为各目标平台（Windows, macOS, Linux）生成可执行文件。
4.  **最终测试**:
    -   对生成的可执行文件进行全面的功能和兼容性测试。
5.  **项目清理**:
    -   删除所有迁移过程中产生的临时文件和不再需要的旧代码，保持项目整洁。

---

## 3. CI/CD 自动化构建 (CI/CD with GitHub Actions)

*为了实现标准化、自动化的跨平台构建与发布流程，我们将使用 GitHub Actions。这能够确保每次发布时都遵循统一的步骤，并自动将构建产物发布到 GitHub Releases。*

1.  **核心目标**:
    -   **触发条件**: 当一个新的版本标签（例如 `v1.2.4`）被推送到 GitHub 仓库时，自动触发构建和发布流程。
    -   **跨平台构建**: 自动为 Windows、macOS (universal) 和 Linux 三大平台并行构建应用程序。
    -   **自动发布**: 将构建好的各平台可执行文件压缩打包，并自动上传到对应版本的 GitHub Release 中，为[应用更新策略](#4-应用更新策略-application-update-strategy)提供稳定可靠的更新源。

2.  **实现方案**:
    -   **工作流文件**: 在项目根目录下创建 `.github/workflows/release.yml` 文件来定义工作流。
    -   **构建 Action**: 主要利用社区验证过的 `dAppServer/wails-build-action` 来简化 Wails 的构建配置。
    -   **版本注入**: 在构建命令中，通过 `-ldflags` 将 Git 标签名动态注入到 Go 程序中，作为应用的版本号。
    -   **发布 Action**: 使用 `softprops/action-gh-release` 等工具，在工作流的最后一步创建 Release 并将所有平台的构建产物作为附件上传。

3.  **参考资料**:
    -   Wails 官方文档: [使用 Github Actions 进行跨平台构建](https://wails.io/zh-Hans/docs/guides/crossplatform-build)

---

## 4. 应用更新策略 (Application Update Strategy)

*Wails 自身不提供自动更新机制，因此我们需要自行设计一套简单有效的更新提醒流程。*

1.  **版本管理**:
    -   遵循 **语义化版本 (SemVer)** 规范（如 `v1.2.3`）。
    -   应用版本号将通过 Go 的 `-ldflags` 在编译时注入，确保应用内部能获取到准确的版本号。

2.  **更新源**:
    -   将 **GitHub Releases** 作为唯一的更新发布源。每次发布新版时，将编译好的各平台应用包作为 Assets 上传。

3.  **更新检查流程**:
    -   **后端**:
        -   在 `App` 结构体中新增一个 `CheckForUpdate() (*UpdateInfo, error)` 方法。
        -   该方法会在应用启动时异步调用 GitHub API，获取项目最新的 Release 信息。
        -   通过对比当前应用版本号和最新 Release 的 `tag_name`，判断是否有新版本。
        -   `UpdateInfo` 结构体将包含新版本号、发布说明和各平台的下载链接。
    -   **前端**:
        -   应用启动后，自动调用后端的 `CheckForUpdate` 方法。
        -   如果检测到新版本，弹出一个非阻塞的模态框（Modal）或通知，展示新版本的更新日志。
        -   提供一个明确的 "下载更新" 按钮，点击后使用系统默认浏览器打开对应的 GitHub Release 页面或直接的资源下载链接。

4.  **Makefile 集成**:
    -   修改 `wails build` 命令，添加 `-ldflags` 参数来动态注入版本号（例如，使用 Git 标签）。
    -   示例: `go build -ldflags="-X main.version=$(git describe --tags --abbrev=0)"`。

---

## 5. 潜在风险与应对策略 (Risks & Mitigations)

-   **风险点**: **有状态应用的并发安全问题**。
    -   **描述**: `App` 实例是长期存在的单例，其内部共享状态可能引发数据竞争。
    -   **策略**: 对 `App` 结构体中所有可能被并发访问的字段（如缓存、配置），必须使用 `sync.Mutex` 等同步原语进行保护。

-   **风险点**: **数据库文件路径不确定**。
    -   **描述**: 硬编码数据库路径会导致在不同系统或环境下数据丢失。
    -   **策略**: 在 `OnStartup` 中使用 `os.UserConfigDir()` 来构造一个平台无关的、标准的应用数据存储路径。

-   **风险点**: **Wails Runtime 加载时序问题**。
    -   **描述**: 前端在 `window.go` 对象就绪前调用后端方法将导致失败。
    -   **策略**: 必须通过监听 `wails:ready` 事件来确保所有后端调用都在 Wails 环境准备好之后发生。

-   **风险点**: **请求上下文 `context` 的消失**。
    -   **描述**: 原先依赖 `fiber.Ctx` 传递的元数据（如追踪ID、用户信息）将不再可用。
    -   **策略**: 将这些数据改为函数的显式参数，由前端在每次调用时传递。对需要超时的长任务，可在 Go 方法中添加 `context.Context` 参数。 