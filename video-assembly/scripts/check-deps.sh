#!/usr/bin/env bash
# check-deps.sh — 前置就绪检查
# 用法: check-deps.sh [workspace_root]
# 输出 JSON: {"ok": true/false, "missing": [...]}
set -uo pipefail

WORKSPACE="${1:-}"
if [[ -z "$WORKSPACE" ]]; then
  WORKSPACE=$(etsy-stack workspace 2>/dev/null) || {
    echo '{"ok":false,"missing":["workspace"],"detail":"无法解析工作区根目录"}'
    exit 1
  }
fi

MISSING=()
DETAILS=()

# 1. FFmpeg
if ! command -v ffmpeg >/dev/null 2>&1; then
  MISSING+=("ffmpeg")
  DETAILS+=("FFmpeg 未安装。运行: brew install ffmpeg")
fi

# 2. ffprobe (通常随 ffmpeg 一起装)
if ! command -v ffprobe >/dev/null 2>&1; then
  MISSING+=("ffprobe")
  DETAILS+=("ffprobe 未安装。运行: brew install ffmpeg")
fi

# 3. CJK 字体
FONTFILE=""
CONFIG_FILE="$WORKSPACE/.video-assembly.yaml"
if [[ -f "$CONFIG_FILE" ]]; then
  FONTFILE=$(grep -E '^fontfile:' "$CONFIG_FILE" 2>/dev/null | sed 's/^fontfile:[[:space:]]*//' | tr -d '"' | tr -d "'")
fi

if [[ -z "$FONTFILE" ]]; then
  # 按优先级尝试
  for candidate in \
    "/Library/Fonts/NotoSansCJKsc-Regular.otf" \
    "$HOME/Library/Fonts/NotoSansCJKsc-Regular.otf" \
    "/System/Library/Fonts/STHeiti Light.ttc" \
    "/System/Library/Fonts/PingFang.ttc"; do
    if [[ -f "$candidate" ]]; then
      FONTFILE="$candidate"
      break
    fi
  done
fi

if [[ -z "$FONTFILE" || ! -f "$FONTFILE" ]]; then
  MISSING+=("fontfile")
  DETAILS+=("CJK 字体文件找不到。运行: brew install font-noto-sans-cjk-sc")
else
  echo "FONTFILE=$FONTFILE" >&2
fi

# 4. 音乐文件夹
MUSIC_DIR="$WORKSPACE/assets/music"
if [[ ! -d "$MUSIC_DIR" ]]; then
  MISSING+=("music_dir")
  DETAILS+=("音乐目录不存在: $MUSIC_DIR")
else
  MUSIC_COUNT=$(find "$MUSIC_DIR" -type f \( -name "*.mp3" -o -name "*.m4a" -o -name "*.wav" -o -name "*.aac" \) 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$MUSIC_COUNT" -eq 0 ]]; then
    MISSING+=("music_files")
    DETAILS+=("音乐文件夹是空的: $MUSIC_DIR")
  fi
fi

# 输出 JSON
if [[ ${#MISSING[@]} -eq 0 ]]; then
  echo '{"ok":true,"missing":[],"fontfile":"'"$FONTFILE"'","workspace":"'"$WORKSPACE"'"}'
else
  # 构造 JSON 数组
  MISSING_JSON=$(printf '"%s",' "${MISSING[@]}")
  MISSING_JSON="[${MISSING_JSON%,}]"
  DETAIL_JSON=$(printf '"%s",' "${DETAILS[@]}")
  DETAIL_JSON="[${DETAIL_JSON%,}]"
  echo '{"ok":false,"missing":'"$MISSING_JSON"',"details":'"$DETAIL_JSON"'}'
  exit 1
fi
