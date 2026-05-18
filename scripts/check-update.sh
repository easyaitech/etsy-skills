#!/usr/bin/env bash
# 静默检查 etsy-stack 是否有新版本。
# - 两条提示路径：远端有新 tag、或者用户跟 main 但 main 比当前 HEAD 还领先（未发版的 commit）
# - 24 小时缓存：避免每次 skill 激活都打 GitHub
# - 只在"有更新可用"时输出一行提示到 stdout，否则 silent
# - 任何错误（无网 / 仓库异常）都吞掉，不打扰当前任务
# - 缓存命中时不打 GitHub —— 5 个 skill 的启动开销控制在最低

set -uo pipefail

INSTALL_DIR="${ETSY_SKILLS_HOME:-$HOME/.local/share/etsy-skills}"
CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/etsy-skills"
LAST_CHECK="$CACHE_DIR/last-check"
LATEST_TAG="$CACHE_DIR/latest-tag"
LATEST_MAIN="$CACHE_DIR/latest-main"
TTL_SECONDS=86400  # 24h

mkdir -p "$CACHE_DIR" 2>/dev/null || exit 0

emit_if_behind() {
  local latest_tag="$1"
  local latest_main="$2"
  # 只有真要 emit 的时候才验 git + 算 current —— 避免污染热路径
  git -C "$INSTALL_DIR" rev-parse --git-dir >/dev/null 2>&1 || return 0

  local current
  current=$(git -C "$INSTALL_DIR" describe --tags --always 2>/dev/null || echo "unknown")
  local re='^v[0-9]+\.[0-9]+\.[0-9]+$'

  # 1) tag bump：钉死在 tag 上 + 远端有更新的 tag → 优先提示这个（最有意义的版本号变化）
  if [[ "$current" =~ $re && "$latest_tag" =~ $re ]]; then
    local newest
    newest=$(printf '%s\n%s\n' "$current" "$latest_tag" | sort -V | tail -n1)
    if [[ "$newest" == "$latest_tag" && "$newest" != "$current" ]]; then
      echo "💡 Etsy stack 有新版本：${current} → ${latest_tag}（运行 \`etsy-stack update\` 升级）"
      return 0
    fi
  fi

  # 2) main 推进：tag 没动，但用户在跟 main 走，且 origin/main 比当前 HEAD 领先
  #    detached HEAD（用户显式钉了 tag / commit）和别的分支（dev 自己的工作分支）都不打扰
  [[ -n "$latest_main" ]] || return 0
  local current_branch
  current_branch=$(git -C "$INSTALL_DIR" symbolic-ref --short --quiet HEAD 2>/dev/null) || return 0
  [[ "$current_branch" == "main" ]] || return 0
  if ! git -C "$INSTALL_DIR" merge-base --is-ancestor "$latest_main" HEAD 2>/dev/null; then
    local ahead short
    ahead=$(git -C "$INSTALL_DIR" rev-list "HEAD..$latest_main" --count 2>/dev/null || echo 0)
    short=$(git -C "$INSTALL_DIR" rev-parse --short "$latest_main" 2>/dev/null || echo "")
    if [[ "$ahead" -gt 0 ]]; then
      echo "💡 Etsy stack main 比当前快 ${ahead} 个 commit（${current} → main@${short}，运行 \`etsy-stack update\` 拉取）"
    fi
  fi
}

# 缓存有效 → 直接吃缓存。这是 5x/激活的高频路径，处理要尽量短
if [[ -f "$LAST_CHECK" ]]; then
  # GNU 在前（Linux）；BSD/Mac 走 fallback。反过来在 Linux 上 stat -f 会被解析成
  # "按文件系统 stat 文件 %m" —— stdout 吐出多行 File:/ID:/... 污染 last_ts，
  # 配合 set -u 直接让缓存命中路径崩掉（5 个 skill 串行激活，后 4 个静默 abort）
  last_ts=$(stat -c %Y "$LAST_CHECK" 2>/dev/null || stat -f %m "$LAST_CHECK" 2>/dev/null || echo 0)
  if (( $(date +%s) - last_ts < TTL_SECONDS )); then
    cached_tag=""; cached_main=""
    [[ -f "$LATEST_TAG" ]] && cached_tag=$(cat "$LATEST_TAG")
    [[ -f "$LATEST_MAIN" ]] && cached_main=$(cat "$LATEST_MAIN")
    emit_if_behind "$cached_tag" "$cached_main"
    exit 0
  fi
fi

# 缓存过期 / 不存在 → 重新拉。这一支 24h 一次，可以多花点
git -C "$INSTALL_DIR" rev-parse --git-dir >/dev/null 2>&1 || exit 0

latest_tag=$(git -C "$INSTALL_DIR" ls-remote --tags --refs origin 2>/dev/null \
  | sed 's,.*/,,' \
  | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
  | sort -V \
  | tail -n1)

latest_main=""
if git -C "$INSTALL_DIR" fetch --quiet origin main 2>/dev/null; then
  latest_main=$(git -C "$INSTALL_DIR" rev-parse origin/main 2>/dev/null || echo "")
fi

# 写缓存（即使 latest_tag / latest_main 都为空也写时间戳，避免反复重试网络）
touch "$LAST_CHECK"
echo "$latest_tag"  > "$LATEST_TAG"
echo "$latest_main" > "$LATEST_MAIN"

emit_if_behind "$latest_tag" "$latest_main"
