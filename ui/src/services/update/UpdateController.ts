import { request } from "@umijs/max";
import type { UpdateCheckResponse } from "./typings";

// 获取后端识别的运行环境、最新版本和可下载资产。
export async function checkForUpdates() {
  return request<UpdateCheckResponse>("/api/updates/check", {
    method: "GET",
  });
}
