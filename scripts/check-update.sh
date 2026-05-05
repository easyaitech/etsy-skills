#!/usr/bin/env bash
# 静默检查 etsy-stack 是否有新版本。
# - 24 小时缓存：避免每次 skill 激活都打 GitHub
# - 只在"有更新可用"时输出一行提示到 stdout，否则 silent
# - 任何错误（无网 / 仓库异常）都吞掉，不打扰当前任务

set -uo pipefail

INSTALL_DIR="${ETSY_SKILLS_HOME:-$HOME/.local/share/etsy-skills}"
CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/etsy-skills"
LAST_CHECK="$CACHE_DIR/last-check"
LATEST_CACHE="$CACHE_DIR/latest-version"
TTL_SECONDS=86400  # 24h

# 不是 git 安装（zip 解压 / 其他来源）就不检查
git -C "$INSTALL_DIR" rev-parse --git-dir >/dev/null 2>&1 || exit 0

mkdir -p "$CACHE_DIR" 2>/dev/null || exit 0

if [[ -s "$INSTALL_DIR/.installed-version" ]]; then
  current=$(cat "$INSTALL_DIR/.installed-version")
else
  current="unknown"
fi

emit_if_behind() {
  local latest="$1"
  if [[ -n "$latest" && "$latest" != "$current" ]]; then
    echo "💡 Etsy stack 有新版本：$current → $latest（运行 \`etsy-stack update\` 升级）"
  fi
}

# ── 缓存有效，直接用缓存值 ──────────────────────────────────
if [[ -f "$LAST_CHECK" ]]; then
  last_ts=$(stat -f %m "$LAST_CHECK" 2>/dev/null || stat -c %Y "$LAST_CHECK" 2>/dev/null || echo 0)
  now=$(date +%s)
  if (( now - last_ts < TTL_SECONDS )); then
    [[ -f "$LATEST_CACHE" ]] && emit_if_behind "$(cat "$LATEST_CACHE")"
    exit 0
  fi
fi

# ── 拉远端最新 tag（优先）或 main commit 数（fallback） ───
latest=$(git -C "$INSTALL_DIR" ls-remote --tags --refs origin 2>/dev/null \
  | awk -F/ '{print $NF}' \
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

# 写缓存（即使没拿到 latest 也写时间戳，避免反复重试）
touch "$LAST_CHECK"
echo "$latest" > "$LATEST_CACHE"

emit_if_behind "$latest"
