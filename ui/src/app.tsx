// 运行时配置
import Logo from "./components/Logo";
import { APP_VERSION } from "./constants";
import { openExternalLink } from "./utils/browser";
import { GithubOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { history } from "@umijs/max";
import { Button, Tooltip } from "antd";

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
export async function getInitialState(): Promise<{ name: string }> {
    return { name: "" };
}

// 渲染全局页脚信息，提供版权说明与开源项目跳转
const renderAppFooter = () => {
    return (
        <footer className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-4 select-none">
            <span>Powered by Slowlyo</span>
            <span className="text-slate-300">|</span>
            <a
                href="https://github.com/slowlyo/my-bulker"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                    // 阻止默认页面跳转，通过系统浏览器安全打开
                    e.preventDefault();
                    openExternalLink("https://github.com/slowlyo/my-bulker");
                }}
                className="text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
                <GithubOutlined />
                my-bulker
            </a>
        </footer>
    );
};

// 配置全局布局与交互主题
export const layout = () => {
    return {
        logo: <Logo size={20} />,
        menu: {
            locale: false,
        },
        siderWidth: 208,
        pageTitleRender: false,
        // 禁用侧边栏底部默认折叠按钮与附加链接，保持侧边栏极简
        collapsedButtonRender: false,
        links: [],
        // 自定义侧边栏头部渲染，支持展开与折叠态的不同展示形态
        menuHeaderRender: (logo: React.ReactNode, title: React.ReactNode, props?: any) => {
            // 侧栏收起折叠态：仅展示品牌图标以保持视觉对齐
            if (props?.collapsed) {
                return (
                    <div
                        className="flex items-center justify-center w-full py-2 cursor-pointer select-none"
                        onClick={() => history.push("/home")}
                    >
                        <Logo size={28} className="shadow-xs" />
                    </div>
                );
            }

            // 侧栏展开态：仅展示品牌徽标与应用名称，避免版本号过长导致标题换行
            return (
                <div
                    className="flex items-center gap-2.5 px-1 py-1 cursor-pointer select-none"
                    onClick={() => history.push("/home")}
                >
                    <Logo size={28} className="shrink-0 shadow-xs" />
                    <span className="font-semibold text-sm text-slate-900 tracking-tight leading-tight whitespace-nowrap">
                        My Bulker
                    </span>
                </div>
            );
        },
        // 侧边栏底部展示版本号，保持顶部标题整洁且在折叠态优雅降级
        menuFooterRender: (props?: any) => {
            if (props?.collapsed) {
                return (
                    <div className="py-2.5 flex justify-center items-center select-none">
                        <Tooltip title={`版本 ${APP_VERSION}`} placement="right">
                            <span className="text-[10px] text-slate-400 font-mono px-1 py-0.5 rounded bg-slate-50 cursor-default">
                                {APP_VERSION.split('-')[0]}
                            </span>
                        </Tooltip>
                    </div>
                );
            }

            return (
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 select-none">
                    <span className="text-slate-400">版本</span>
                    <Tooltip title={APP_VERSION} placement="top">
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono leading-tight truncate max-w-[130px] cursor-default">
                            {APP_VERSION}
                        </span>
                    </Tooltip>
                </div>
            );
        },
        // 顶栏右侧操作区，提供全局快速入口
        actionsRender: (props: any) => {
            // 移动端环境下仅保留外部代码库跳转以精简排版
            if (props?.isMobile) {
                return [
                    <a
                        key="github"
                        href="https://github.com/slowlyo/my-bulker"
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                            // 阻止默认页面跳转，通过系统浏览器安全打开
                            e.preventDefault();
                            openExternalLink("https://github.com/slowlyo/my-bulker");
                        }}
                        className="text-slate-500 hover:text-slate-900 transition-colors px-2 py-1 flex items-center cursor-pointer"
                    >
                        <GithubOutlined className="text-base" />
                    </a>,
                ];
            }

            // 桌面端提供快速查询启动按钮与 GitHub 链接
            return [
                <Button
                    key="quick-query"
                    type="primary"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={() => history.push("/query-task")}
                    className="!h-7 !px-2.5 !text-xs !rounded-md flex items-center gap-1 shadow-xs"
                >
                    快速查询
                </Button>,
                <Tooltip key="github" title="查看 GitHub 仓库">
                    <a
                        href="https://github.com/slowlyo/my-bulker"
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                            // 阻止默认页面跳转，通过系统浏览器安全打开
                            e.preventDefault();
                            openExternalLink("https://github.com/slowlyo/my-bulker");
                        }}
                        className="text-slate-500 hover:text-slate-900 transition-colors p-1.5 rounded-md hover:bg-slate-100 flex items-center cursor-pointer"
                    >
                        <GithubOutlined className="text-base" />
                    </a>
                </Tooltip>,
            ];
        },
        // 采用标准控制台浅灰背景(#f1f5f9)，拉开与纯白侧边栏(#ffffff)及卡片的视觉对比度
        token: {
            bgLayout: "#f1f5f9",
            header: {
                colorBgHeader: "#ffffff",
                colorHeaderTitle: "#0f172a",
                colorMenuItemDivider: "transparent",
                colorBorderBottom: "transparent",
                colorSplit: "transparent",
                colorTextMenu: "#475569",
                colorTextMenuHover: "#1677ff",
                colorTextMenuSelected: "#1677ff",
                colorBgMenuItemSelected: "#e6f4ff",
                heightLayoutHeader: 52,
            },
            sider: {
                // 纯白侧边栏搭配清晰边框，与页面背景色形成明确层级
                colorMenuBackground: "#ffffff",
                colorMenuItemDivider: "#f1f5f9",
                colorBorderRight: "#e2e8f0",
                colorTextMenu: "#334155",
                colorTextMenuHover: "#1677ff",
                colorTextMenuSelected: "#1677ff",
                colorBgMenuItemHover: "#f1f5f9",
                colorBgMenuItemSelected: "#e6f4ff",
                colorTextMenuItemHover: "#1677ff",
            },
            pageContainer: {
                paddingBlockPageContainerContent: 16,
                paddingInlinePageContainerContent: 20,
                colorBgPageContainer: "transparent",
            },
        },
        footerRender: () => renderAppFooter(),
    };
};
