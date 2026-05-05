#!/usr/bin/env bash
# 静默检查 etsy-stack 是否有新版本。
# - 24 小时缓存：避免每次 skill 激活都打 GitHub
# - 只在"有更新可用"时输出一行提示到 stdout，否则 silent
# - 任何错误（无网 / 仓库异常）都吞掉，不打扰当前任务
# - 缓存命中且无更新时只跑一个 stat —— 5 个 skill 的启动开销控制在最低

set -uo pipefail

INSTALL_DIR="${ETSY_SKILLS_HOME:-$HOME/.local/share/etsy-skills}"
CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/etsy-skills"
LAST_CHECK="$CACHE_DIR/last-check"
LATEST_CACHE="$CACHE_DIR/latest-version"
TTL_SECONDS=86400  # 24h

mkdir -p "$CACHE_DIR" 2>/dev/null || exit 0

emit_if_behind() {
  local latest="$1"
  [[ -n "$latest" ]] || return 0
  # 只有真要 emit 的时候才验 git + 算 current —— 避免污染热路径
  git -C "$INSTALL_DIR" rev-parse --git-dir >/dev/null 2>&1 || return 0
  local current
  current=$(git -C "$INSTALL_DIR" describe --tags --always 2>/dev/null || echo "unknown")
  if [[ "$latest" != "$current" ]]; then
    echo "💡 Etsy stack 有新版本：$current → $latest（运行 \`etsy-stack update\` 升级）"
  fi
}

# 缓存有效 → 直接吃缓存。这是 5x/激活的高频路径，处理要尽量短
if [[ -f "$LAST_CHECK" ]]; then
  last_ts=$(stat -f %m "$LAST_CHECK" 2>/dev/null || stat -c %Y "$LAST_CHECK" 2>/dev/null || echo 0)
  if (( $(date +%s) - last_ts < TTL_SECONDS )); then
    [[ -f "$LATEST_CACHE" ]] && emit_if_behind "$(cat "$LATEST_CACHE")"
    exit 0
  fi
fi

# 缓存过期 / 不存在 → 重新拉。这一支 24h 一次，可以多花点
git -C "$INSTALL_DIR" rev-parse --git-dir >/dev/null 2>&1 || exit 0

latest=$(git -C "$INSTALL_DIR" ls-remote --tags --refs origin 2>/dev/null \
  | sed 's,.*/,,' \
  | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
  | sort -V \
  | tail -n1)

if [[ -z "$latest" ]]; then
  if git -C "$INSTALL_DIR" fetch --quiet origin main 2>/dev/null; then
    ahead=$(git -C "$INSTALL_DIR" rev-list HEAD..origin/main --count 2>/dev/null || echo 0)
    if [[ "$ahead" -gt 0 ]]; then
      head_short=$(git -C "$INSTALL_DIR" rev-parse --short origin/main 2>/dev/null || echo "")
      latest="main@$head_short (+$ahead commits)"
    fi
  fi
fi

# 写缓存（即使 latest 为空也写时间戳，避免反复重试网络）
touch "$LAST_CHECK"
echo "$latest" > "$LATEST_CACHE"

emit_if_behind "$latest"
