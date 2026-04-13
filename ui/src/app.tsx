// 运行时配置
import { DefaultFooter } from "@ant-design/pro-components";
import Logo from "./components/Logo";
import { APP_VERSION } from "./constants";
import { GithubOutlined } from "@ant-design/icons";

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
export async function getInitialState(): Promise<{ name: string }> {
    return { name: "" };
}

// 渲染全局页脚信息
const renderAppFooter = (collapsed?: boolean, isMobile?: boolean) => {
    const siderOffset = isMobile ? 0 : (collapsed ? 64 : 160) / 2;
    const versionHref =
        typeof window === "undefined" ? "#/" : window.location.href;

    return (
        <DefaultFooter
            className="border-t border-gray-200/80 pt-4"
            style={{
                marginBlockStart: 0,
                marginBlockEnd: 24,
                paddingInline: 24,
                transform: `translateX(-${siderOffset}px)`,
            }}
            links={[
                {
                    key: "version",
                    title: `Version ${APP_VERSION}`,
                    href: versionHref,
                },
                {
                    key: "github",
                    title: (
                        <>
                            <GithubOutlined style={{ marginRight: 8, marginLeft: 12 }} />
                            my-bulker
                        </>
                    ),
                    href: "https://github.com/slowlyo/my-bulker",
                    blankTarget: true,
                },
            ]}
            copyright={"Powered by Slowlyo"}
        />
    );
};

// 配置全局布局
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
        footerRender: ({ collapsed, isMobile }) =>
            renderAppFooter(collapsed, isMobile),
    };
};
