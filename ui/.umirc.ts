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
            name: "系统配置",
            path: "/config",
            component: "./Config",
            icon: "SettingOutlined",
        },
    ],

    npmClient: "pnpm",
    tailwindcss: {},
});
