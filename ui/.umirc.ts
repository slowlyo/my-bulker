import { defineConfig } from "@umijs/max";

const appVersion = process.env.APP_VERSION || "v1.0.0";

export default defineConfig({
    antd: {
        configProvider: {},
        theme: {
            token: {
                // 保留 antd 经典科技蓝主题色，提供清爽的高亮与选中交互
                colorPrimary: "#1677ff",
                borderRadius: 6,
                colorBgContainer: "#ffffff",
                colorBorder: "#edf0f4",
                colorBorderSecondary: "#edf0f4",
                colorSplit: "#f6f8fa",
            },
            components: {
                // 统一样式库内置 Card 与 Table 的柔和边框颜色
                Card: {
                    colorBorderSecondary: "#edf0f4",
                },
                Table: {
                    colorBorderSecondary: "#edf0f4",
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
