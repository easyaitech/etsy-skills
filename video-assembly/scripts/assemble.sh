#!/usr/bin/env bash
# assemble.sh — 单条视频装配（FFmpeg 参数化调用）
# 用法: assemble.sh --hook FILE --body FILE --close FILE --music FILE \
#                    --output FILE --text TEXT --fontfile FILE \
#                    --platform PLATFORM [--thumb FILE]
# 退出码: 0=成功, 1=参数错误, 2=FFmpeg失败
set -uo pipefail

# 解析参数
HOOK="" BODY="" CLOSE="" MUSIC="" OUTPUT="" TEXT="" FONTFILE="" PLATFORM="tiktok" THUMB=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --hook) HOOK="$2"; shift 2 ;;
    --body) BODY="$2"; shift 2 ;;
    --close) CLOSE="$2"; shift 2 ;;
    --music) MUSIC="$2"; shift 2 ;;
    --output) OUTPUT="$2"; shift 2 ;;
    --text) TEXT="$2"; shift 2 ;;
    --fontfile) FONTFILE="$2"; shift 2 ;;
    --platform) PLATFORM="$2"; shift 2 ;;
    --thumb) THUMB="$2"; shift 2 ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

# 校验必填参数
for var_name in HOOK BODY CLOSE MUSIC OUTPUT FONTFILE; do
  eval "val=\$$var_name"
  if [[ -z "$val" ]]; then
    echo "错误: --$(echo $var_name | tr '[:upper:]' '[:lower:]') 必填" >&2
    exit 1
  fi
done

# 校验文件存在
for file_var in HOOK BODY CLOSE MUSIC FONTFILE; do
  eval "val=\$$file_var"
  if [[ ! -f "$val" ]]; then
    echo "错误: 文件不存在: $val (--$(echo $file_var | tr '[:upper:]' '[:lower:]'))" >&2
    exit 1
  fi
done

# 计算各片段时长
hook_dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$HOOK" 2>/dev/null)
body_dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$BODY" 2>/dev/null)
close_dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$CLOSE" 2>/dev/null)

total_dur=$(echo "$hook_dur + $body_dur + $close_dur" | bc 2>/dev/null)
if [[ -z "$total_dur" ]]; then
  total_dur=$(python3 -c "print(${hook_dur:-0} + ${body_dur:-0} + ${close_dur:-0})")
fi

# 总时长校验护栏
total_int=$(printf "%.0f" "$total_dur")
if [[ "$total_int" -lt 10 ]]; then
  echo '{"ok":false,"error":"duration_too_short","total_sec":'"$total_dur"',"detail":"总时长 < 10s，跳过"}'
  exit 2
fi
if [[ "$total_int" -gt 60 ]]; then
  echo '{"ok":false,"error":"duration_too_long","total_sec":'"$total_dur"',"detail":"总时长 > 60s，跳过"}'
  exit 2
fi

# 平台安全区 y 坐标
case "$PLATFORM" in
  tiktok)    SAFE_Y="h*0.75" ;;
  instagram) SAFE_Y="h*0.78" ;;
  pinterest) SAFE_Y="h*0.85" ;;
  *)         SAFE_Y="h*0.75" ;;
esac

# 计算音乐淡出起始点 (总时长 - 2s)
fade_start=$(echo "$total_dur - 2" | bc 2>/dev/null)
if [[ -z "$fade_start" ]]; then
  fade_start=$(python3 -c "print(max(0, ${total_dur} - 2))")
fi

# 转义 drawtext 文本（冒号和单引号）
ESCAPED_TEXT=$(echo "$TEXT" | sed "s/:/\\\\:/g" | sed "s/'/'\\\\''/g")

# 确保输出目录存在
mkdir -p "$(dirname "$OUTPUT")"

# 构造 filter_complex
FILTER="[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];\
[1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];\
[2:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v2];\
[v0][v1][v2]concat=n=3:v=1:a=0[vout]"

# 如果有文案叠加
if [[ -n "$TEXT" ]]; then
  FILTER="${FILTER};[vout]drawtext=text='${ESCAPED_TEXT}':fontfile='${FONTFILE}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=${SAFE_Y}[vfinal]"
  MAP_VIDEO="[vfinal]"
else
  MAP_VIDEO="[vout]"
fi

# 执行 FFmpeg（参数化，非字符串拼接）
ffmpeg \
  -i "$HOOK" \
  -i "$BODY" \
  -i "$CLOSE" \
  -i "$MUSIC" \
  -filter_complex "$FILTER" \
  -map "$MAP_VIDEO" \
  -map 3:a \
  -shortest \
  -af "afade=t=out:st=${fade_start}:d=2" \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 128k \
  -y "$OUTPUT" 2>/tmp/ffmpeg-stderr-$$.log

FFMPEG_RC=$?

if [[ $FFMPEG_RC -ne 0 ]]; then
  STDERR=$(cat /tmp/ffmpeg-stderr-$$.log | tail -5 | tr '\n' ' ' | sed 's/"/\\"/g')
  rm -f /tmp/ffmpeg-stderr-$$.log
  echo '{"ok":false,"error":"ffmpeg_failed","exit_code":'"$FFMPEG_RC"',"stderr":"'"$STDERR"'"}'
  exit 2
fi

rm -f /tmp/ffmpeg-stderr-$$.log

# 生成 thumbnail
THUMB_PATH="${THUMB:-${OUTPUT%.*}_thumb.jpg}"
ffmpeg -i "$OUTPUT" -vframes 1 -q:v 2 -y "$THUMB_PATH" 2>/dev/null

# 输出成功 JSON
OUTPUT_SIZE=$(stat -f%z "$OUTPUT" 2>/dev/null || stat --printf="%s" "$OUTPUT" 2>/dev/null || echo "0")
echo '{"ok":true,"output":"'"$OUTPUT"'","thumb":"'"$THUMB_PATH"'","duration_sec":'"$total_dur"',"size_bytes":'"$OUTPUT_SIZE"'}'
