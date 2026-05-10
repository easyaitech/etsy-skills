#!/usr/bin/env bash
# batch-assemble.sh — 批量装配入口（Mode B 完整流水线）
# 用法: batch-assemble.sh --clips-json FILE --workspace DIR --platform PLATFORM \
#                          --music-dir DIR --fontfile FILE [--limit N] [--exclude-json FILE]
# 输出: 每行一个 JSON 结果 (JSONL)，最后一行是汇总
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

CLIPS_FILE="" WORKSPACE="" PLATFORM="tiktok" MUSIC_DIR="" FONTFILE="" LIMIT=5 EXCLUDE_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clips-json) CLIPS_FILE="$2"; shift 2 ;;
    --workspace) WORKSPACE="$2"; shift 2 ;;
    --platform) PLATFORM="$2"; shift 2 ;;
    --music-dir) MUSIC_DIR="$2"; shift 2 ;;
    --fontfile) FONTFILE="$2"; shift 2 ;;
    --limit) LIMIT="$2"; shift 2 ;;
    --exclude-json) EXCLUDE_FILE="$2"; shift 2 ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

# 校验必填
for var in CLIPS_FILE WORKSPACE MUSIC_DIR FONTFILE; do
  eval "val=\$$var"
  if [[ -z "$val" ]]; then
    echo "错误: --$(echo $var | tr '[:upper:]' '[:lower:]' | tr '_' '-') 必填" >&2
    exit 1
  fi
done

# 生成组合
COMBINE_ARGS=("--clips-json" "$CLIPS_FILE" "--limit" "$LIMIT")
if [[ -n "$EXCLUDE_FILE" ]]; then
  COMBINE_ARGS+=("--exclude-json" "$EXCLUDE_FILE")
fi

COMBINATIONS=$("$SCRIPT_DIR/combine.sh" "${COMBINE_ARGS[@]}")

# 检查是否有错误
if echo "$COMBINATIONS" | head -1 | grep -q '"error"'; then
  echo "$COMBINATIONS"
  exit 0
fi

# 选择音乐文件（按 mood 目录或随机）
pick_music() {
  local mood_dir="$MUSIC_DIR/$1"
  if [[ -d "$mood_dir" ]]; then
    find "$mood_dir" -type f \( -name "*.mp3" -o -name "*.m4a" -o -name "*.wav" \) 2>/dev/null | shuf -n 1
  else
    find "$MUSIC_DIR" -type f \( -name "*.mp3" -o -name "*.m4a" -o -name "*.wav" \) 2>/dev/null | shuf -n 1
  fi
}

# 计数器
SUCCESS=0 SKIPPED=0 FAILED=0
OUTPUT_DIR="$WORKSPACE/output/video-assembly"

echo "$COMBINATIONS" | while IFS= read -r combo; do
  # 跳过错误行
  if echo "$combo" | grep -q '"error"'; then
    echo "$combo"
    continue
  fi

  # 解析组合
  HOOK_FILE=$(echo "$combo" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['hook_file'])")
  BODY_FILE=$(echo "$combo" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['body_file'])")
  CLOSE_FILE=$(echo "$combo" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['close_file'])")
  PRODUCT_ID=$(echo "$combo" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['product_id'])")
  HOOK_ID=$(echo "$combo" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['hook_clip_id'])")
  BODY_ID=$(echo "$combo" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['body_clip_id'])")
  CLOSE_ID=$(echo "$combo" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['close_clip_id'])")
  TOTAL_DUR=$(echo "$combo" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['total_duration'])")

  # 拼接绝对路径
  HOOK_ABS="$WORKSPACE/$HOOK_FILE"
  BODY_ABS="$WORKSPACE/$BODY_FILE"
  CLOSE_ABS="$WORKSPACE/$CLOSE_FILE"

  # 生成 job_id
  JOB_ID="vj-$(echo "${HOOK_ID}-${BODY_ID}-${CLOSE_ID}" | md5sum 2>/dev/null | cut -c1-8 || echo "${HOOK_ID:0:3}${BODY_ID:0:3}${CLOSE_ID:0:3}")"

  # 输出路径
  JOB_OUTPUT="$OUTPUT_DIR/$PRODUCT_ID/$JOB_ID.mp4"

  # 选音乐
  MUSIC=$(pick_music "")
  if [[ -z "$MUSIC" ]]; then
    echo '{"job_id":"'"$JOB_ID"'","ok":false,"error":"no_music","detail":"找不到音乐文件"}'
    FAILED=$((FAILED + 1))
    continue
  fi

  # 调用 assemble.sh
  RESULT=$("$SCRIPT_DIR/assemble.sh" \
    --hook "$HOOK_ABS" \
    --body "$BODY_ABS" \
    --close "$CLOSE_ABS" \
    --music "$MUSIC" \
    --output "$JOB_OUTPUT" \
    --text "" \
    --fontfile "$FONTFILE" \
    --platform "$PLATFORM")

  ASSEMBLE_RC=$?

  if [[ $ASSEMBLE_RC -eq 0 ]]; then
    # 成功：附加 job 元信息
    echo "$RESULT" | python3 -c "
import json, sys
r = json.load(sys.stdin)
r['job_id'] = '$JOB_ID'
r['hook_clip_id'] = '$HOOK_ID'
r['body_clip_id'] = '$BODY_ID'
r['close_clip_id'] = '$CLOSE_ID'
r['product_id'] = '$PRODUCT_ID'
r['platform'] = '$PLATFORM'
r['music_track'] = '$(basename "$MUSIC")'
print(json.dumps(r))
"
    SUCCESS=$((SUCCESS + 1))
  elif [[ $ASSEMBLE_RC -eq 2 ]]; then
    # 跳过（时长不合规）或 FFmpeg 失败
    echo "$RESULT" | python3 -c "
import json, sys
r = json.load(sys.stdin)
r['job_id'] = '$JOB_ID'
r['hook_clip_id'] = '$HOOK_ID'
r['body_clip_id'] = '$BODY_ID'
r['close_clip_id'] = '$CLOSE_ID'
print(json.dumps(r))
"
    if echo "$RESULT" | grep -q "duration_too"; then
      SKIPPED=$((SKIPPED + 1))
    else
      FAILED=$((FAILED + 1))
    fi
  fi
done

# 汇总（写到 stderr，不混入 JSONL）
echo '{"summary":true,"success":'"$SUCCESS"',"skipped":'"$SKIPPED"',"failed":'"$FAILED"'}' >&2
