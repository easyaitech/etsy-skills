#!/usr/bin/env bash
# batch-assemble.sh — 批量装配入口（Mode B 完整流水线）
# 用法: batch-assemble.sh --clips-json FILE --workspace DIR --platform PLATFORM \
#                          --music-dir DIR --fontfile FILE [--limit N] [--exclude-json FILE]
# 输出: 每行一个 JSON 结果 (JSONL)，汇总写到 stderr
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

for var in CLIPS_FILE WORKSPACE MUSIC_DIR FONTFILE; do
  if [[ -z "${!var}" ]]; then
    echo "错误: --$(echo "$var" | tr '[:upper:]' '[:lower:]' | tr '_' '-') 必填" >&2
    exit 1
  fi
done

COMBINE_ARGS=("--clips-json" "$CLIPS_FILE" "--limit" "$LIMIT")
if [[ -n "$EXCLUDE_FILE" ]]; then
  COMBINE_ARGS+=("--exclude-json" "$EXCLUDE_FILE")
fi

COMBINATIONS=$("$SCRIPT_DIR/combine.sh" "${COMBINE_ARGS[@]}")

if echo "$COMBINATIONS" | head -1 | grep -q '"error"'; then
  echo "$COMBINATIONS"
  exit 0
fi

pick_music() {
  local mood_dir="$MUSIC_DIR/$1"
  if [[ -d "$mood_dir" ]]; then
    find "$mood_dir" -type f \( -name "*.mp3" -o -name "*.m4a" -o -name "*.wav" \) 2>/dev/null | shuf -n 1
  else
    find "$MUSIC_DIR" -type f \( -name "*.mp3" -o -name "*.m4a" -o -name "*.wav" \) 2>/dev/null | shuf -n 1
  fi
}

SUCCESS=0 SKIPPED=0 FAILED=0
OUTPUT_DIR="$WORKSPACE/output/video-assembly"

while IFS= read -r combo; do
  if echo "$combo" | grep -q '"error"'; then
    echo "$combo"
    continue
  fi

  # Single python3 call to parse all fields
  IFS=$'\t' read -r HOOK_FILE BODY_FILE CLOSE_FILE PRODUCT_ID HOOK_ID BODY_ID CLOSE_ID TOTAL_DUR \
    < <(echo "$combo" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('\t'.join([d['hook_file'], d['body_file'], d['close_file'], d['product_id'],
  d['hook_clip_id'], d['body_clip_id'], d['close_clip_id'], str(d['total_duration'])]))
")

  HOOK_ABS="$WORKSPACE/$HOOK_FILE"
  BODY_ABS="$WORKSPACE/$BODY_FILE"
  CLOSE_ABS="$WORKSPACE/$CLOSE_FILE"

  JOB_ID="vj-$(printf '%s' "${HOOK_ID}-${BODY_ID}-${CLOSE_ID}" | md5 2>/dev/null | cut -c1-8 || printf '%s' "${HOOK_ID}-${BODY_ID}-${CLOSE_ID}" | md5sum 2>/dev/null | cut -c1-8 || echo "${HOOK_ID:0:3}${BODY_ID:0:3}${CLOSE_ID:0:3}")"

  JOB_OUTPUT="$OUTPUT_DIR/$PRODUCT_ID/$JOB_ID.mp4"

  MUSIC=$(pick_music "")
  if [[ -z "$MUSIC" ]]; then
    python3 -c "import json; print(json.dumps({'job_id':'$JOB_ID','ok':False,'error':'no_music','detail':'找不到音乐文件'}))"
    FAILED=$((FAILED + 1))
    continue
  fi

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

  # Augment result with job metadata safely via env vars
  AUGMENTED=$(echo "$RESULT" | JOB_ID="$JOB_ID" HOOK_ID="$HOOK_ID" BODY_ID="$BODY_ID" \
    CLOSE_ID="$CLOSE_ID" PRODUCT_ID="$PRODUCT_ID" PLATFORM="$PLATFORM" \
    MUSIC_TRACK="$(basename "$MUSIC")" python3 -c "
import json, sys, os
r = json.load(sys.stdin)
r['job_id'] = os.environ['JOB_ID']
r['hook_clip_id'] = os.environ['HOOK_ID']
r['body_clip_id'] = os.environ['BODY_ID']
r['close_clip_id'] = os.environ['CLOSE_ID']
r['product_id'] = os.environ['PRODUCT_ID']
r['platform'] = os.environ['PLATFORM']
r['music_track'] = os.environ['MUSIC_TRACK']
print(json.dumps(r))
")

  echo "$AUGMENTED"

  if [[ $ASSEMBLE_RC -eq 0 ]]; then
    SUCCESS=$((SUCCESS + 1))
  elif [[ $ASSEMBLE_RC -eq 2 ]]; then
    if echo "$RESULT" | grep -q "duration_too"; then
      SKIPPED=$((SKIPPED + 1))
    else
      FAILED=$((FAILED + 1))
    fi
  fi
done < <(echo "$COMBINATIONS")

echo '{"summary":true,"success":'"$SUCCESS"',"skipped":'"$SKIPPED"',"failed":'"$FAILED"'}' >&2
