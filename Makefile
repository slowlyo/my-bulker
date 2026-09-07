# 应用名称
APP_NAME = my-bulker
APP_VERSION ?= v1.0.0

# 构建参数
BUILD_DIR = build
MAIN_FILE = .

# 默认目标
.PHONY: all
all: build

# 构建应用
.PHONY: build
build:
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@go build -ldflags "-X my-bulker/internal/pkg/appmeta.Version=$(APP_VERSION)" -o $(BUILD_DIR)/$(APP_NAME) $(MAIN_FILE)
	@echo "Build complete: $(BUILD_DIR)/$(APP_NAME)"

# 构建前端
.PHONY: build-ui
build-ui:
	@echo "Building UI..."
	@cd ui && APP_VERSION="$(APP_VERSION)" pnpm build

# 构建桌面端（Wails）。Linux 若仅有 webkit2gtk-4.1，由脚本自动加 webkit2_41 标签。
.PHONY: build-desktop
build-desktop:
	@APP_VERSION="$(APP_VERSION)" ./scripts/build-desktop.sh

# 运行应用
.PHONY: run
run:
	@echo "Running $(APP_NAME)..."
	@go run -ldflags "-X my-bulker/internal/pkg/appmeta.Version=$(APP_VERSION)" $(MAIN_FILE)

# 运行前端
.PHONY: run-ui
run-ui:
	@echo "Running UI..."
	@cd ui && APP_VERSION="$(APP_VERSION)" pnpm dev

# 开发模式：同时启动前后端
.PHONY: dev
dev:
	@echo "Starting backend and frontend in development mode..."
	@which air > /dev/null 2>&1 && (air &) || (go run -ldflags "-X my-bulker/internal/pkg/appmeta.Version=$(APP_VERSION)" $(MAIN_FILE) &) \
	&& (cd ui && pnpm install && APP_VERSION="$(APP_VERSION)" pnpm dev)

# 清理构建产物
.PHONY: clean
clean:
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)/bin $(BUILD_DIR)/$(APP_NAME) $(BUILD_DIR)/$(APP_NAME).exe $(BUILD_DIR)/main
	@go clean
	@echo "Clean complete"

# 整理依赖。Wails 入口使用 desktop tag，tidy 必须带上，否则会丢掉该依赖。
.PHONY: tidy
tidy:
	@echo "Tidying dependencies..."
	@GOFLAGS='-tags=desktop' go mod tidy
	@echo "Tidy complete"

# 显示帮助信息
.PHONY: help
help:
	@echo "Available commands:"
	@echo "Backend commands:"
	@echo "  make build  - Build the backend application"
	@echo "  make run    - Run the backend service"
	@echo "  make clean  - Clean build artifacts"
	@echo "  make tidy   - Tidy backend dependencies"
	@echo ""
	@echo "Frontend commands:"
	@echo "  make build-ui  - Build the frontend application"
	@echo "  make run-ui    - Run the frontend development server"
	@echo ""
	@echo "Desktop commands:"
	@echo "  make build-desktop - Build the Wails desktop app (needs wails CLI)"
	@echo ""
	@echo "Common commands:"
	@echo "  make dev    - Start both backend and frontend for development"
	@echo ""
	@echo "  make help   - Show this help message"
