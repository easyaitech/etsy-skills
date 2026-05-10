#!/usr/bin/env bash
# extract-frames.sh — 从视频片段提取代表帧（用于 AI 标签建议）
# 用法: extract-frames.sh <video_file> <output_dir> [num_frames]
# 输出: 提取的帧文件路径列表 (JSONL)
set -uo pipefail

VIDEO="${1:-}"
OUTPUT_DIR="${2:-}"
NUM_FRAMES="${3:-3}"

if [[ -z "$VIDEO" || -z "$OUTPUT_DIR" ]]; then
  echo "用法: extract-frames.sh <video_file> <output_dir> [num_frames=3]" >&2
  exit 1
fi

if [[ ! -f "$VIDEO" ]]; then
  echo "错误: 视频文件不存在: $VIDEO" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# 获取总帧数
TOTAL_FRAMES=$(ffprobe -v error -count_packets -select_streams v:0 \
  -show_entries stream=nb_read_packets -of csv=p=0 "$VIDEO" 2>/dev/null)

if [[ -z "$TOTAL_FRAMES" || "$TOTAL_FRAMES" == "N/A" || "$TOTAL_FRAMES" -eq 0 ]]; then
  # fallback: 用时长 * fps 估算
  DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO" 2>/dev/null)
  FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$VIDEO" 2>/dev/null)
  if [[ -n "$DURATION" && -n "$FPS" ]]; then
    # r_frame_rate 格式如 "30/1"
    FPS_NUM=$(echo "$FPS" | cut -d'/' -f1)
    FPS_DEN=$(echo "$FPS" | cut -d'/' -f2)
    TOTAL_FRAMES=$(python3 -c "import math; print(math.ceil(${DURATION} * ${FPS_NUM} / ${FPS_DEN:-1}))")
  else
    TOTAL_FRAMES=90
  fi
fi

# 基于文件名生成前缀
BASENAME=$(basename "$VIDEO" | sed 's/\.[^.]*$//')

# 构造 select 表达式：提取首帧、中帧、尾帧（或均匀分布）
if [[ "$NUM_FRAMES" -eq 3 ]]; then
  MID=$((TOTAL_FRAMES / 2))
  END=$((TOTAL_FRAMES - 1))
  SELECT="eq(n\\,0)+eq(n\\,$MID)+eq(n\\,$END)"
else
  # 均匀分布
  INTERVAL=$((TOTAL_FRAMES / (NUM_FRAMES + 1)))
  SELECT=""
  for i in $(seq 1 "$NUM_FRAMES"); do
    FRAME_N=$((INTERVAL * i))
    if [[ -n "$SELECT" ]]; then SELECT="${SELECT}+"; fi
    SELECT="${SELECT}eq(n\\,$FRAME_N)"
  done
fi

# 提取帧
ffmpeg -i "$VIDEO" \
  -vf "select='$SELECT'" \
  -vsync vfr \
  -frames:v "$NUM_FRAMES" \
  -q:v 2 \
  "$OUTPUT_DIR/${BASENAME}_frame_%02d.jpg" 2>/dev/null

# 输出结果
FRAMES=()
for f in "$OUTPUT_DIR/${BASENAME}_frame_"*.jpg; do
  if [[ -f "$f" ]]; then
    FRAMES+=("$f")
    echo "$f"
  fi
done

if [[ ${#FRAMES[@]} -eq 0 ]]; then
  echo "错误: 未能提取帧" >&2
  exit 1
fi
