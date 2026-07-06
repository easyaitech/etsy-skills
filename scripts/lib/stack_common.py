"""list / doctor 共享逻辑：manifest 加载 + 托管集合 + 非托管条目枚举。

单一事实源，避免 `list` 和 `doctor` 对「什么算 stack 托管」产生分歧
（两者若不一致，非托管扫描会漏报或误报）。经 PYTHONPATH=$INSTALL_DIR/scripts/lib 导入。
"""
import json
import os


def load_manifest(install_dir):
    with open(os.path.join(install_dir, "etsy-stack.json"), encoding="utf-8") as f:
        return json.load(f)


def managed_set(manifest):
    """manifest 里的 skill 加上 shared/ —— 都是 stack 自己铺的软链。"""
    return set(manifest["skills"]) | {"shared"}


def find_extras(hermes_dir, managed):
    """技能目录里 manifest 之外的条目（agent 自建或历史遗留），已排序、跳过点开头。"""
    extras = []
    if os.path.isdir(hermes_dir):
        for name in sorted(os.listdir(hermes_dir)):
            if name in managed or name.startswith("."):
                continue
            extras.append(name)
    return extras
