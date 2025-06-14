import { defineConfig } from "@umijs/max";

export default defineConfig({
  antd: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: "Poly DB",
  },
  routes: [
    {
      path: "/",
      redirect: "/home",
    },
    {
      name: "首页",
      path: "/home",
      component: "./Home",
      icon: "HomeOutlined",
    },
  ],

  npmClient: "pnpm",
  tailwindcss: {},
});
