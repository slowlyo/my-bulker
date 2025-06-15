# 应用名称
APP_NAME = mysql-tenant-tools

# 构建参数
BUILD_DIR = build
MAIN_FILE = main.go

# 默认目标
.PHONY: all
all: build

# 构建应用
.PHONY: build
build:
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(APP_NAME) $(MAIN_FILE)
	@echo "Build complete: $(BUILD_DIR)/$(APP_NAME)"

# 构建前端
.PHONY: build-ui
build-ui:
	@echo "Building UI..."
	@cd ui && pnpm build

# 运行应用
.PHONY: run
run:
	@echo "Running $(APP_NAME)..."
	@go run $(MAIN_FILE)

# 运行前端
.PHONY: run-ui
run-ui:
	@echo "Running UI..."
	@cd ui && pnpm dev

# 清理构建产物
.PHONY: clean
clean:
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@go clean
	@echo "Clean complete"

# 整理依赖
.PHONY: tidy
tidy:
	@echo "Tidying dependencies..."
	@go mod tidy
	@echo "Tidy complete"

# 显示帮助信息
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make build  - Build the application"
	@echo "  make run    - Run the application"
	@echo "  make clean  - Clean build artifacts"
	@echo "  make tidy   - Tidy dependencies"
	@echo "  make help   - Show this help message" 