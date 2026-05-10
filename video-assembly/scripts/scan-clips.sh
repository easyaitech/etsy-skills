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

find "$CLIPS_DIR" -type f \( -name "*.mp4" -o -name "*.mov" -o -name "*.avi" -o -name "*.mkv" \) -print0 | \
while IFS= read -r -d '' file; do
  # Single ffprobe call for all metadata
  probe=$(ffprobe -v error -select_streams v:0 \
    -show_entries format=duration:stream=width,height,nb_frames \
    -of json "$file" 2>/dev/null)

  # Compute relative path
  rel_path="$file"
  if [[ -n "$WORKSPACE" && "$file" == "$WORKSPACE"/* ]]; then
    rel_path="${file#$WORKSPACE/}"
  fi

  # Use python3 for safe JSON output (handles filenames with quotes/backslashes)
  echo "$probe" | FILEPATH="$file" REL_PATH="$rel_path" python3 -c "
import json, sys, os
data = json.load(sys.stdin)
fmt = data.get('format', {})
streams = data.get('streams', [{}])
s = streams[0] if streams else {}
duration = float(fmt.get('duration', 0))
width = int(s.get('width', 0))
height = int(s.get('height', 0))
frames = int(s.get('nb_frames', 0)) if s.get('nb_frames', 'N/A') != 'N/A' else 0
filepath = os.environ['FILEPATH']
rel_path = os.environ['REL_PATH']
name = os.path.splitext(os.path.basename(filepath))[0]
print(json.dumps({
    'file': filepath,
    'rel_path': rel_path,
    'name': name,
    'duration_sec': round(duration, 1),
    'width': width,
    'height': height,
    'frames': frames
}))
"
done
