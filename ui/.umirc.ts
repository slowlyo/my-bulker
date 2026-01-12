import { defineConfig } from "@umijs/max";

export default defineConfig({
    antd: {
        configProvider: {},
        theme: {
            token: {
                colorPrimary: "#1677ff",
                borderRadius: 8,
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
            name: "查询任务",
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
