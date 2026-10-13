# Stage 1: Build the frontend assets
# 前端产物与架构无关，固定在构建机原生平台编译，避免多架构构建时走 QEMU 模拟
FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend-builder
WORKDIR /app
ARG APP_VERSION=v1.0.0
# 国内构建可传 --build-arg NPM_REGISTRY=https://registry.npmmirror.com
ARG NPM_REGISTRY=https://registry.npmjs.org

RUN npm config set registry "${NPM_REGISTRY}"

# Install pnpm
RUN npm install -g pnpm

# Copy package management files for the frontend
COPY ui/package.json ui/pnpm-lock.yaml* ./ui/
# pnpm 10+ 默认拦截依赖 install 脚本，Docker 非交互环境需显式放行
RUN cd ui && pnpm install --config.dangerouslyAllowAllBuilds=true

# Copy the rest of the frontend source code
COPY ui/ ./ui/

# Remove dist folder
RUN rm -rf ui/dist

# Build the frontend
RUN cd ui && APP_VERSION="${APP_VERSION}" pnpm build

# Stage 2: Build the Go backend
# Go 原生交叉编译（CGO 关闭），同样固定在构建机原生平台运行
FROM --platform=$BUILDPLATFORM golang:1.24 AS builder
WORKDIR /app
ARG APP_VERSION=v1.0.0
ARG TARGETOS
ARG TARGETARCH
# 国内构建可传 --build-arg GOPROXY=https://goproxy.cn,direct
ARG GOPROXY=https://proxy.golang.org,direct
ENV GOPROXY=${GOPROXY}

# Copy go module files and download dependencies
COPY go.mod go.sum ./
RUN go mod download -x

# Copy the built frontend assets from the frontend-builder stage
# This is necessary for the Go 'embed' directive to work.
COPY --from=frontend-builder /app/ui/dist ./ui/dist

# Copy the rest of the source code
COPY . .

# Build the Go application, disabling CGO for a static binary
# This makes it compatible with the minimal alpine base image
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -v -ldflags="-X my-bulker/internal/pkg/appmeta.Version=${APP_VERSION}" -o /app/my-bulker .

# Stage 3: Create the final, minimal production image
FROM alpine:latest
WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

# Copy the built Go binary from the builder stage
COPY --from=builder /app/my-bulker .

# The frontend assets are now embedded in the Go binary,
# so this copy step is no longer necessary.
# COPY --from=frontend-builder /app/ui/dist ./ui/dist

# Expose the port the application will run on
EXPOSE 9092

# Set the command to run the application
CMD ["./my-bulker"] 
