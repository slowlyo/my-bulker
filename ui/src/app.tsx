// 运行时配置
import { Button } from "antd";
import Logo from "./components/Logo";
import { GithubOutlined } from "@ant-design/icons";

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
export async function getInitialState(): Promise<{ name: string }> {
    return { name: "" };
}

export const layout = () => {
    return {
        logo: <Logo />,
        menu: {
            locale: false,
            // loading: true,
        },
        collapsedButtonRender: () => <></>,
        // loading: true,
        siderWidth: 160,
        pageTitleRender: false,
        token: {
            bgLayout: "linear-gradient(115deg, white, #f5f5f5 30%)",
            sider: {
                colorMenuBackground:
                    "linear-gradient(180deg, white, #f5f5f5 70%)",
                colorMenuItemDivider: "transparent",
            },
        },
        links: [
            <Button
                icon={<GithubOutlined />}
                type="link"
                onClick={() =>
                    window.open("https://github.com/slowlyo/mysql-batch-tools")
                }
            >
                slowlyo
            </Button>,
        ],
    };
};
