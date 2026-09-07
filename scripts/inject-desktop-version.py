#!/usr/bin/env python3
"""将桌面端规范化版本号写入 wails.json。"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path


def parse_numeric_semver(version_str: str) -> str:
    """提取纯数字段的语义化版本号（如 0.1.8-beta.1 提取为 0.1.8）。
    
    Windows 资源编译器（winres 等）要求 ProductVersion / FileVersion 为纯数字版本号点分段。
    若传入空或不合规格式，则安全回退为 0.0.0。
    """
    cleaned = version_str.strip()
    if cleaned.startswith("v") or cleaned.startswith("V"):
        cleaned = cleaned[1:]

    # 匹配主版本.次版本.修订版本数字部分
    match = re.match(r"^(\d+)(?:\.(\d+))?(?:\.(\d+))?", cleaned)
    if not match:
        # 非数字开头版本，回退默认版本
        return "0.0.0"

    major = match.group(1) or "0"
    minor = match.group(2) or "0"
    patch = match.group(3) or "0"
    return f"{major}.{minor}.{patch}"


def inject_version(wails_json_path: Path, product_version: str) -> None:
    """读取指定路径的 wails.json 并更新 info.productVersion 字段。
    
    显式使用 utf-8 编码读写，避免在 Windows 默认编码（如 cp1252/gbk）下处理中文注释时报错。
    """
    if not wails_json_path.is_file():
        # 文件不存在时无法注入
        raise FileNotFoundError(f"未找到配置文件: {wails_json_path}")

    content = wails_json_path.read_text(encoding="utf-8")
    data = json.loads(content)

    if not isinstance(data, dict):
        # 顶层必须为 json 字典结构
        raise ValueError(f"{wails_json_path} 内容格式错误，必须为 JSON 对象")

    info = data.setdefault("info", {})
    if not isinstance(info, dict):
        # 兼容性处理：若 info 原先非 dict 则重置为 dict
        info = {}
        data["info"] = info

    info["productVersion"] = product_version

    # 写回文件，显式 utf-8 编码，保留非 ASCII 字符（如中文说明）
    wails_json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    """解析命令行参数。"""
    parser = argparse.ArgumentParser(description="注入规范化的 productVersion 到 wails.json")
    parser.add_argument(
        "--file",
        default="wails.json",
        help="wails.json 文件路径（默认: wails.json）",
    )
    parser.add_argument(
        "--version",
        default=os.environ.get("APP_VERSION", ""),
        help="原始版本字符串（如 v0.1.8-beta.1），默认读取环境变量 APP_VERSION",
    )
    return parser.parse_args()


def main() -> int:
    """程序入口：解析版本号并注入 wails.json。"""
    args = parse_args()
    raw_version = args.version or "0.0.0"
    product_version = parse_numeric_semver(raw_version)
    target_path = Path(args.file)

    inject_version(target_path, product_version)
    print(f"productVersion={product_version} (raw={raw_version})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
