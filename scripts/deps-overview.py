#!/usr/bin/env python3
"""按需打印全 stack 依赖总览(读 frontmatter,只输出到 stdout,不落盘)。

用途:大汇总矩阵已删除(降级信息唯一真源 = 各 skill 的「依赖关系」表),
维护者要跨 skill 总览时跑本脚本。按模式细分的 BLOCK/DEGRADE/SKIP 等级
仍以各 SKILL.md 的表为准,这里只聚合 frontmatter 的层归属与 depends-on。
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_validator():
    spec = importlib.util.spec_from_file_location(
        "validate_frontmatter", ROOT / "scripts" / "validate-frontmatter.py"
    )
    if spec is None or spec.loader is None:
        print("无法加载 validate-frontmatter.py", file=sys.stderr)
        raise SystemExit(1)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    validator = load_validator()
    by_layer: dict[str, list[tuple[str, list[str]]]] = {}

    for skill_dir in validator.skill_dirs(ROOT):
        parsed = validator.parse_frontmatter(
            (skill_dir / "SKILL.md").read_text(encoding="utf-8")
        )
        if parsed is None:
            print(f"!! {skill_dir.name}: 缺 frontmatter", file=sys.stderr)
            continue
        layer = str(parsed.get("layer", "(缺 layer)"))
        by_layer.setdefault(layer, []).append((skill_dir.name, validator.get_depends_on(parsed)))

    ordered = list(validator.LAYERS)
    for layer in ordered + sorted(set(by_layer) - set(ordered)):
        print(f"\n== {layer} ==")
        for name, deps in sorted(by_layer[layer]):
            print(f"  {name}" + (f"  -> {', '.join(deps)}" if deps else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
