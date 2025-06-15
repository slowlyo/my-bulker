import { defineConfig } from "@umijs/max";

export default defineConfig({
    antd: {},
    model: {},
    initialState: {},
    request: {},
    layout: {
        title: "Batch Tools",
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
            icon: "DatabaseOutlined",
        },
    ],

    npmClient: "pnpm",
    tailwindcss: {},
});
