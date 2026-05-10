#!/usr/bin/env bash
# scan-clips.sh — 扫描目录中的视频片段，输出元数据
# 用法: scan-clips.sh <clips_dir> [workspace_root]
# 输出: 每行一个 JSON 对象 (JSONL)
set -uo pipefail

CLIPS_DIR="${1:-}"
WORKSPACE="${2:-}"

if [[ -z "$CLIPS_DIR" ]]; then
  echo "用法: scan-clips.sh <clips_dir> [workspace_root]" >&2
  exit 1
fi

if [[ -z "$WORKSPACE" ]]; then
  WORKSPACE=$(etsy-stack workspace 2>/dev/null) || WORKSPACE=""
fi

# 确保 clips_dir 是绝对路径
if [[ "$CLIPS_DIR" != /* ]]; then
  if [[ -n "$WORKSPACE" ]]; then
    CLIPS_DIR="$WORKSPACE/$CLIPS_DIR"
  else
    CLIPS_DIR="$(pwd)/$CLIPS_DIR"
  fi
fi

if [[ ! -d "$CLIPS_DIR" ]]; then
  echo "错误: 目录不存在: $CLIPS_DIR" >&2
  exit 1
fi

# 扫描视频文件
find "$CLIPS_DIR" -type f \( -name "*.mp4" -o -name "*.mov" -o -name "*.avi" -o -name "*.mkv" \) -print0 | \
while IFS= read -r -d '' file; do
  # 获取时长
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$file" 2>/dev/null)
  if [[ -z "$duration" ]]; then
    duration="0"
  fi
  # 取整到 1 位小数
  duration=$(printf "%.1f" "$duration")

  # 获取分辨率
  resolution=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$file" 2>/dev/null)
  width=$(echo "$resolution" | cut -d',' -f1)
  height=$(echo "$resolution" | cut -d',' -f2)

  # 获取帧数（用于 AI 标签时提取代表帧）
  frame_count=$(ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of csv=p=0 "$file" 2>/dev/null)
  if [[ -z "$frame_count" || "$frame_count" == "N/A" ]]; then
    frame_count="0"
  fi

  # 计算工作区相对路径
  rel_path="$file"
  if [[ -n "$WORKSPACE" && "$file" == "$WORKSPACE"/* ]]; then
    rel_path="${file#$WORKSPACE/}"
  fi

  # 文件名（无扩展名）
  basename_noext=$(basename "$file" | sed 's/\.[^.]*$//')

  # 输出 JSONL
  printf '{"file":"%s","rel_path":"%s","name":"%s","duration_sec":%s,"width":%s,"height":%s,"frames":%s}\n' \
    "$file" "$rel_path" "$basename_noext" "$duration" "${width:-0}" "${height:-0}" "${frame_count:-0}"
done
