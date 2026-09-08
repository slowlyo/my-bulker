export interface UpdateAsset {
  name: string;
  download_url: string;
  size: number;
  recommended: boolean;
}

export interface UpdateInfo {
  current_version: string;
  latest_version: string;
  update_available: boolean;
  include_preview: boolean;
  runtime_mode: "desktop" | "server";
  os: string;
  arch: string;
  release_url: string;
  published_at: string;
  checked_at: string;
  recommended_asset?: UpdateAsset;
  assets: UpdateAsset[];
}

export interface UpdateCheckResponse {
  code: number;
  message: string;
  data?: UpdateInfo;
}
