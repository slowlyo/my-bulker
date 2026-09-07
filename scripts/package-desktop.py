#!/usr/bin/env python3
"""把 Wails build/bin 产物打成带 desktop 前缀的压缩包。"""

from __future__ import annotations

import argparse
import shutil
import sys
import tarfile
import zipfile
from pathlib import Path


def parse_args() -> argparse.Namespace:
    """解析平台、架构和输出路径。"""
    parser = argparse.ArgumentParser(description="Package Wails desktop artifacts")
    parser.add_argument("platform", choices=("windows", "darwin", "linux"))
    parser.add_argument("arch", help="amd64 / arm64 / universal")
    parser.add_argument(
        "-o",
        "--output",
        help="输出压缩包路径。默认写到 ./release-desktop/",
    )
    parser.add_argument(
        "--bin-dir",
        default="build/bin",
        help="Wails 输出目录",
    )
    return parser.parse_args()


def must_exist(path: Path, kind: str) -> Path:
    """确认 Wails 产物存在，缺失时带上目录列表方便排查。"""
    ok = path.is_dir() if kind == "dir" else path.is_file()
    if not ok:
        listing = []
        parent = path.parent
        if parent.exists():
            listing = [p.name for p in parent.iterdir()]
        raise SystemExit(f"未找到 {path}；目录内容: {listing}")
    return path


def add_readme(stage: Path, repo_root: Path) -> None:
    """把 README 打进压缩包，和现有服务端发布包保持一致。"""
    readme = repo_root / "README.md"
    if readme.is_file():
        shutil.copy2(readme, stage / "README.md")


def zip_dir(source: Path, archive: Path) -> None:
    """打包 Windows / macOS 桌面目录为 zip。"""
    archive.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in source.rglob("*"):
            zf.write(item, item.relative_to(source))


def tar_dir(source: Path, archive: Path) -> None:
    """打包 Linux 桌面目录为 tar.gz。"""
    archive.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive, "w:gz") as tf:
        for item in source.iterdir():
            tf.add(item, arcname=item.name)


def main() -> int:
    """按平台收集 Wails 产物并写成 Release 资产。"""
    args = parse_args()
    repo_root = Path.cwd()
    bin_dir = Path(args.bin_dir)
    must_exist(bin_dir, "dir")

    default_dir = repo_root / "release-desktop"
    if args.platform == "windows":
        archive = Path(args.output or default_dir / f"my-bulker-desktop-windows-{args.arch}.zip")
        exe = must_exist(bin_dir / "my-bulker-desktop.exe", "file")
        stage = archive.parent / f".stage-{archive.stem}"
        if stage.exists():
            shutil.rmtree(stage)
        stage.mkdir(parents=True)
        shutil.copy2(exe, stage / exe.name)
        add_readme(stage, repo_root)
        zip_dir(stage, archive)
        shutil.rmtree(stage)
    elif args.platform == "darwin":
        archive = Path(args.output or default_dir / f"my-bulker-desktop-darwin-{args.arch}.zip")
        app = must_exist(bin_dir / "my-bulker-desktop.app", "dir")
        stage = archive.parent / f".stage-{archive.stem}"
        if stage.exists():
            shutil.rmtree(stage)
        stage.mkdir(parents=True)
        shutil.copytree(app, stage / app.name)
        add_readme(stage, repo_root)
        zip_dir(stage, archive)
        shutil.rmtree(stage)
    else:
        archive = Path(args.output or default_dir / f"my-bulker-desktop-linux-{args.arch}.tar.gz")
        binary = must_exist(bin_dir / "my-bulker-desktop", "file")
        stage = archive.parent / f".stage-{archive.stem}"
        if stage.exists():
            shutil.rmtree(stage)
        stage.mkdir(parents=True)
        shutil.copy2(binary, stage / binary.name)
        add_readme(stage, repo_root)
        tar_dir(stage, archive)
        shutil.rmtree(stage)

    print(f"Packaged {archive}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
