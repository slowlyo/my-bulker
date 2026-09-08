import { defineConfig } from "@umijs/max";

const appVersion = process.env.APP_VERSION || "v1.0.0";

export default defineConfig({
    antd: {
        configProvider: {},
        theme: {
            token: {
                // 保留 antd 经典科技蓝主题色，提供清爽的高亮与选中交互
                colorPrimary: "#1677ff",
                // 适度加大全局圆角尺寸，提升整体精致感与现代感
                borderRadius: 8,
                borderRadiusLG: 12,
                borderRadiusSM: 6,
                borderRadiusXS: 4,
                colorBgContainer: "#ffffff",
                // 主边框采用标准中性灰 slate-200（#e2e8f0），清晰且不深重
                colorBorder: "#e2e8f0",
                // 次级边框与表格行线条采用更柔和的微灰
                colorBorderSecondary: "#edf0f4",
                // 内部分割线采用柔和微灰
                colorSplit: "#edf0f4",
            },
            components: {
                // 卡片内置边框与圆角设置
                Card: {
                    colorBorderSecondary: "#e2e8f0",
                    borderRadiusLG: 12,
                },
                // 表格边框与圆角
                Table: {
                    colorBorderSecondary: "#edf0f4",
                    borderRadius: 8,
                },
                // 按钮圆角微调
                Button: {
                    borderRadius: 8,
                    borderRadiusSM: 6,
                },
                // 输入框圆角微调
                Input: {
                    borderRadius: 8,
                },
                // 下拉选择器圆角
                Select: {
                    borderRadius: 8,
                },
                // 弹窗与抽屉容器圆角
                Modal: {
                    borderRadiusLG: 14,
                },
                Drawer: {
                    borderRadiusLG: 14,
                },
            },
        },
    },
    model: {},
    initialState: {},
    request: {},
    layout: {
        title: "My Bulker",
    },
    favicons: [ "mysql.png" ],
    hash: true,
    history: {
        type: "hash",
    },
    proxy: {
        "/api": {
            target: "http://localhost:9092/",
            changeOrigin: true,
        },
    },
    define: {
        __APP_VERSION__: appVersion,
    },
    routes: [
        {
            path: "/",
            redirect: "/home",
        },
        {
            name: "主页",
            path: "/home",
            component: "./Home",
            icon: "HomeOutlined",
        },
        {
            name: "实例",
            path: "/instance",
            component: "./Instance",
            icon: "ClusterOutlined",
        },
        {
            name: "数据库",
            path: "/database",
            component: "./Database",
            icon: "DatabaseOutlined",
        },
        {
            name: "查询",
            path: "/query-task",
            component: "./QueryTask",
            icon: "PlayCircleOutlined",
        },
        {
            name: "查询任务详情",
            path: "/query-task/detail/:id",
            component: "./QueryTask/Detail",
            hideInMenu: true,
        },
        {
            name: "文档生成",
            path: "/db-doc",
            component: "./DbDoc",
            icon: "FileTextOutlined",
        },

        // 始终保持系统配置在最后
        {
            name: "系统配置",
            path: "/config",
            component: "./Config",
            icon: "SettingOutlined",
        },
    ],

    npmClient: "pnpm",
    tailwindcss: {},
    mako: {},
});
