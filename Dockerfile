# Stage 1: Build the frontend assets
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# 配置npm镜像源加速
RUN npm config set registry https://registry.npmmirror.com

# Install pnpm
RUN npm install -g pnpm

# Copy package management files for the frontend
COPY ui/package.json ui/pnpm-lock.yaml* ./ui/
RUN cd ui && pnpm install

# Copy the rest of the frontend source code
COPY ui/ ./ui/

# Remove dist folder
RUN rm -rf ui/dist

# Build the frontend
RUN cd ui && pnpm build

# Stage 2: Build the Go backend
FROM golang:1.24 AS builder
WORKDIR /app

# 配置Go模块代理加速下载
ENV GOPROXY=https://goproxy.cn,direct
ENV GOSUMDB=sum.golang.google.cn

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
RUN CGO_ENABLED=0 GOOS=linux go build -v -o /app/my-bulker .

# Stage 3: Create the final, minimal production image
FROM alpine:latest
WORKDIR /app

# 配置阿里云镜像源加速包安装
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk --no-cache add ca-certificates tzdata

# Copy the built Go binary from the builder stage
COPY --from=builder /app/my-bulker .

# The frontend assets are now embedded in the Go binary,
# so this copy step is no longer necessary.
# COPY --from=frontend-builder /app/ui/dist ./ui/dist

# Expose the port the application will run on
EXPOSE 9092

# Set the command to run the application
CMD ["./my-bulker"] 