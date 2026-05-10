#!/usr/bin/env bash
# combine.sh — 生成兼容组合候选列表
# 用法: combine.sh --clips-json FILE [--exclude-json FILE] [--limit N]
# 输入: clips JSON 数组文件 (从 Feishu Base 导出)
# 输出: 组合候选列表 (JSONL)
#
# clips JSON 格式:
# [{"clip_id":"c1","stage":"hook","product_id":"p1","compatible_with":[],"approved":true}, ...]
#
# exclude JSON 格式 (已生成的三元组):
# [{"hook":"c1","body":"c2","close":"c3"}, ...]
set -uo pipefail

CLIPS_FILE="" EXCLUDE_FILE="" LIMIT=10

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clips-json) CLIPS_FILE="$2"; shift 2 ;;
    --exclude-json) EXCLUDE_FILE="$2"; shift 2 ;;
    --limit) LIMIT="$2"; shift 2 ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$CLIPS_FILE" || ! -f "$CLIPS_FILE" ]]; then
  echo "错误: --clips-json 文件不存在" >&2
  exit 1
fi

# 用 python3 做组合逻辑（shell 做笛卡尔积太痛苦）
python3 - "$CLIPS_FILE" "${EXCLUDE_FILE:-}" "$LIMIT" <<'PYTHON'
import json
import sys
import itertools

clips_file = sys.argv[1]
exclude_file = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else ""
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10

with open(clips_file) as f:
    clips = json.load(f)

# 按 stage 分组，只取 approved
hooks = [c for c in clips if c.get("stage") == "hook" and c.get("approved", False)]
bodies = [c for c in clips if c.get("stage") == "body" and c.get("approved", False)]
closes = [c for c in clips if c.get("stage") == "close" and c.get("approved", False)]

if not hooks:
    print(json.dumps({"error": "no_hooks", "detail": "没有 approved 的 hook 片段"}))
    sys.exit(0)
if not bodies:
    print(json.dumps({"error": "no_bodies", "detail": "没有 approved 的 body 片段"}))
    sys.exit(0)
if not closes:
    print(json.dumps({"error": "no_closes", "detail": "没有 approved 的 close 片段"}))
    sys.exit(0)

# 加载已生成的组合用于去重
excluded = set()
if exclude_file:
    try:
        with open(exclude_file) as f:
            for item in json.load(f):
                excluded.add((item["hook"], item["body"], item["close"]))
    except (FileNotFoundError, json.JSONDecodeError):
        pass

def is_compatible(clip_a, clip_b):
    """检查两个片段是否兼容"""
    # 必须是同一产品
    if clip_a.get("product_id") != clip_b.get("product_id"):
        return False
    # compatible_with 为空 = 同产品全兼容
    compat_a = clip_a.get("compatible_with", [])
    compat_b = clip_b.get("compatible_with", [])
    if compat_a and clip_b["clip_id"] not in compat_a:
        return False
    if compat_b and clip_a["clip_id"] not in compat_b:
        return False
    return True

# 生成兼容组合
count = 0
for h, b, c in itertools.product(hooks, bodies, closes):
    if count >= limit:
        break
    # 同产品检查
    if h["product_id"] != b["product_id"] or b["product_id"] != c["product_id"]:
        continue
    # 兼容性检查
    if not is_compatible(h, b):
        continue
    if not is_compatible(b, c):
        continue
    if not is_compatible(h, c):
        continue
    # 去重
    triple = (h["clip_id"], b["clip_id"], c["clip_id"])
    if triple in excluded:
        continue
    # 输出
    combo = {
        "hook_clip_id": h["clip_id"],
        "body_clip_id": b["clip_id"],
        "close_clip_id": c["clip_id"],
        "product_id": h["product_id"],
        "hook_file": h.get("file_path", ""),
        "body_file": b.get("file_path", ""),
        "close_file": c.get("file_path", ""),
        "hook_duration": h.get("duration_sec", 0),
        "body_duration": b.get("duration_sec", 0),
        "close_duration": c.get("duration_sec", 0),
        "total_duration": (h.get("duration_sec", 0) + b.get("duration_sec", 0) + c.get("duration_sec", 0)),
    }
    print(json.dumps(combo))
    count += 1

if count == 0:
    print(json.dumps({"error": "no_combinations", "detail": "无可用组合（全部已生成或不兼容）"}))
PYTHON
