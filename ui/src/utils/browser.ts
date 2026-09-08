/**
 * 在系统默认浏览器或新标签页中打开外部链接
 * 
 * 桌面端环境下优先通过 Wails 提供的运行时或底层 IPC 协议唤起操作系统默认浏览器，
 * 避免在桌面内嵌 WebView 中直接跳转；纯浏览器 Web 环境下回退至原生新标签页打开。
 * 
 * @param url 需要打开的目标网址
 */
export const openExternalLink = (url: string) => {
    // 桌面端环境：优先调用 Wails 标准运行时 API
    if (typeof (window as any)?.runtime?.BrowserOpenURL === "function") {
        (window as any).runtime.BrowserOpenURL(url);
        return;
    }
    // 桌面端环境：兼容 Wails 底层 IPC 派发通道
    if (typeof (window as any)?.WailsInvoke === "function") {
        (window as any).WailsInvoke("BO:" + url);
        return;
    }
    // 浏览器 Web 环境：回退至新标签页打开
    window.open(url, "_blank", "noreferrer");
};
