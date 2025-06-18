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
        title: "Batch Tools",
    },
    history: {
        type: "hash",
    },
    proxy: {
        "/api": {
            target: "http://localhost:3000/",
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
    ],

    npmClient: "pnpm",
    tailwindcss: {},
});
