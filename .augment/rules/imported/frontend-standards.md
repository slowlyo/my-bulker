---
type: "always_apply"
---

# Frontend Standards

> 注意：这是唯一的前端规范文档，所有前端相关的规范都应该在这里维护，不允许创建新的规则文件。

## 技术栈

- 框架：UmiJS Max
- 语言：TypeScript
- 样式：Tailwind CSS（强制使用）
- 包管理器：pnpm
- UI 组件：Ant Design
- 高级组件：Ant Design Pro Components

## 项目结构

```
ui/
├── src/
│   ├── components/  # 可复用组件
│   ├── pages/      # 页面组件
│   ├── services/   # API 服务
│   ├── utils/      # 工具函数
│   └── types/      # 类型定义
├── .umirc.ts       # UmiJS 配置
├── package.json    # 依赖配置
└── tsconfig.json   # TypeScript 配置
```

## 开发规范

### 组件开发
- 使用函数式组件和 Hooks
- 为 props 实现 TypeScript 类型
- 遵循原子设计原则
- 保持组件小巧和专注
- 使用 Tailwind CSS 进行样式设计
- ProTable 组件规范：
  - 禁止使用 headerTitle 属性
  - 表格不需要 title

### 状态管理
- 使用 React Hooks 管理本地状态
- 实现适当的错误处理
- 遵循不可变状态模式
- 使用 TypeScript 确保类型安全

### API 集成
- 在 service 文件中集中管理 API 调用
- 为 API 响应使用 TypeScript 接口
- 实现适当的错误处理
- 使用环境变量管理 API 端点

### 样式规范
- 强制使用 Tailwind CSS 进行样式开发，禁止使用其他 CSS 方案
- 使用 Tailwind CSS 工具类
- 遵循移动优先的响应式设计
- 保持一致的间距和排版
- 使用 CSS 变量管理主题值

### 测试规范
- 为组件编写单元测试
- 测试 API 集成
- 为关键流程实现 E2E 测试
- 保持良好的测试覆盖率

### 性能优化
- 实现代码分割
- 优化打包大小
- 使用适当的缓存策略
- 监控和优化渲染性能

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint
```

## 最佳实践

1. 组件设计
   - 保持组件职责单一
   - 使用 TypeScript 类型
   - 添加适当的注释
   - 遵循命名规范

2. 状态管理
   - 合理使用状态
   - 避免状态冗余
   - 使用适当的 Hook
   - 处理边界情况

3. 样式管理
   - 强制使用 Tailwind 类，禁止使用其他样式方案
   - 保持样式一致性
   - 避免内联样式
   - 使用主题变量
   - 优先使用 Tailwind 内置类，避免自定义样式

4. 错误处理
   - 实现错误边界
   - 提供用户反馈
   - 记录错误日志
   - 优雅降级

5. 性能考虑
   - 使用 React.memo
   - 实现虚拟列表
   - 优化重渲染
   - 使用性能分析工具
