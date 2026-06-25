#!/usr/bin/env bash
# 电商 skill stack 安装 / 升级脚本（兼容旧 etsy-stack 安装路径）
#
# ── 推荐（钉死版本）─────────────────────────────────────────────
#   curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.0/install.sh | bash
#
# ── 最新主线 ────────────────────────────────────────────────────
#   curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/main/install.sh | bash
#
# ── 已 clone 后本地升级 ────────────────────────────────────────
#   bash install.sh    或    ecommerce-stack update（旧命令 etsy-stack update 兼容）
#
# ── 谨慎模式（先看再跑） ───────────────────────────────────────
#   curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.0/install.sh -o install.sh
#   less install.sh   # 自查一遍
#   bash install.sh
#
# 环境变量（可选）：
#   ECOMMERCE_SKILLS_HOME  源码安装目录（默认 ~/.local/share/etsy-skills，保留旧路径避免破坏升级）
#   HERMES_SKILLS_DIR      Hermes 加载 skill 的目录（默认 ~/.hermes/skills）
#   ECOMMERCE_STACK_BIN    ecommerce-stack / etsy-stack 命令的安装目录（默认 ~/.local/bin）
#   ECOMMERCE_SKILLS_REPO  Git 仓库 URL（默认 HTTPS：https://github.com/easyaitech/etsy-skills.git）
#                          开发者可改成 SSH：git@github.com:easyaitech/etsy-skills.git
#   ECOMMERCE_SKILLS_REF   要 checkout 的分支 / tag（默认 main；推荐传具体 tag 如 v0.1.0）
#
# 旧变量 ETSY_SKILLS_HOME / ETSY_STACK_BIN / ETSY_SKILLS_REPO / ETSY_SKILLS_REF 继续兼容。

set -euo pipefail

REPO_URL="${ECOMMERCE_SKILLS_REPO:-${ETSY_SKILLS_REPO:-https://github.com/easyaitech/etsy-skills.git}}"
REF="${ECOMMERCE_SKILLS_REF:-${ETSY_SKILLS_REF:-main}}"
INSTALL_DIR="${ECOMMERCE_SKILLS_HOME:-${ETSY_SKILLS_HOME:-$HOME/.local/share/etsy-skills}}"
HERMES_SKILLS_DIR="${HERMES_SKILLS_DIR:-${HERMES_HOME:-$HOME/.hermes}/skills}"
BIN_DIR="${ECOMMERCE_STACK_BIN:-${ETSY_STACK_BIN:-$HOME/.local/bin}}"

log()   { printf "  %s\n" "$*"; }
ok()    { printf "✓ %s\n" "$*"; }
warn()  { printf "⚠️  %s\n" "$*" >&2; }
fail()  { printf "❌ %s\n" "$*" >&2; exit 1; }

command -v git >/dev/null || fail "未找到 git，请先安装"
command -v python3 >/dev/null || fail "未找到 python3，请先安装"

if git -C "$INSTALL_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  log "更新源码：$INSTALL_DIR"
  git -C "$INSTALL_DIR" fetch --tags --quiet origin
  git -C "$INSTALL_DIR" checkout --quiet "$REF"
  # 只在 HEAD 是分支（非 detached）时才 ff-merge —— REF 是 tag 时不能 pull
  if git -C "$INSTALL_DIR" symbolic-ref --quiet HEAD >/dev/null; then
    git -C "$INSTALL_DIR" merge --ff-only --quiet "@{u}" 2>/dev/null \
      || warn "本地分支与远端 $REF 已分叉，跳过 ff-merge（请人工 git rebase / reset）"
  fi
else
  log "Clone 仓库到：$INSTALL_DIR"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --quiet "$REPO_URL" "$INSTALL_DIR"
  git -C "$INSTALL_DIR" checkout --quiet "$REF"
fi

MANIFEST="$INSTALL_DIR/etsy-stack.json"
[[ -f "$MANIFEST" ]] || fail "manifest 缺失：$MANIFEST"

SKILLS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && SKILLS+=("$line")
done < <(MANIFEST="$MANIFEST" python3 -c '
import json, os
m = json.load(open(os.environ["MANIFEST"]))
for s in m["skills"]:
    print(s)
')
[[ ${#SKILLS[@]} -gt 0 ]] || fail "manifest.skills 为空"

mkdir -p "$HERMES_SKILLS_DIR"
INSTALL_DIR="$INSTALL_DIR" HERMES_SKILLS_DIR="$HERMES_SKILLS_DIR" MANIFEST="$MANIFEST" python3 - <<'PY'
import json
import os

install_dir = os.path.realpath(os.environ["INSTALL_DIR"])
hermes_dir = os.environ["HERMES_SKILLS_DIR"]
with open(os.environ["MANIFEST"], encoding="utf-8") as f:
    active = set(json.load(f)["skills"])
retired = {"photo-style"}

if os.path.isdir(hermes_dir):
    for name in os.listdir(hermes_dir):
        path = os.path.join(hermes_dir, name)
        if name == "shared" or name in active or name not in retired or not os.path.islink(path):
            continue
        target = os.path.realpath(path)
        if target == install_dir or target.startswith(install_dir + os.sep):
            os.unlink(path)
            print(f"✓ 移除已废弃 skill 链接：{name}")
PY
log "链接 skill → $HERMES_SKILLS_DIR"
for skill in "${SKILLS[@]}"; do
  src="$INSTALL_DIR/$skill"
  dst="$HERMES_SKILLS_DIR/$skill"
  if [[ ! -d "$src" ]]; then
    warn "$skill 在 manifest 中但目录不存在，跳过"
    continue
  fi
  # 非软链的真实文件 / 目录先备份，避免误覆盖用户内容
  if [[ -e "$dst" && ! -L "$dst" ]]; then
    backup="$dst.bak.$(date +%s)"
    warn "$dst 已存在且不是软链，备份到 $backup"
    mv "$dst" "$backup"
  fi
  mkdir -p "$(dirname "$dst")"
  ln -sfn "$src" "$dst"
  ok "$skill"
done

# 共享文件（非 skill 但各 skill 引用）
_shared_src="$INSTALL_DIR/shared"
_shared_dst="$HERMES_SKILLS_DIR/shared"
if [[ -d "$_shared_src" ]]; then
  if [[ -e "$_shared_dst" && ! -L "$_shared_dst" ]]; then
    backup="$_shared_dst.bak.$(date +%s)"
    warn "$_shared_dst 已存在且不是软链，备份到 $backup"
    mv "$_shared_dst" "$backup"
  fi
  ln -sfn "$_shared_src" "$_shared_dst"
  ok "shared"
fi

mkdir -p "$BIN_DIR"
chmod +x "$INSTALL_DIR/scripts/etsy-stack" "$INSTALL_DIR/scripts/check-update.sh"
ln -sfn "$INSTALL_DIR/scripts/etsy-stack" "$BIN_DIR/ecommerce-stack"
ln -sfn "$INSTALL_DIR/scripts/etsy-stack" "$BIN_DIR/etsy-stack"
ok "命令安装到：$BIN_DIR/ecommerce-stack（兼容旧命令：$BIN_DIR/etsy-stack）"

_retired_photo_style="$BIN_DIR/photo-style"
if [[ -L "$_retired_photo_style" ]]; then
  _retired_target="$(readlink "$_retired_photo_style" || true)"
  case "$_retired_target" in
    "$INSTALL_DIR"/photo-style/*)
      rm -f "$_retired_photo_style"
      ok "移除已废弃命令：$_retired_photo_style"
      ;;
  esac
fi

# trend-radar: 安装 Node 依赖 + Playwright chromium + CLI 链接
_TR_SCRIPTS="$INSTALL_DIR/trend-radar/scripts"
if [[ -f "$_TR_SCRIPTS/package.json" ]]; then
  log "安装 trend-radar 依赖…"
  if command -v npm >/dev/null; then
    ( cd "$_TR_SCRIPTS" && npm install --no-fund --no-audit --quiet 2>&1 ) || warn "trend-radar npm install 失败"
    ( cd "$_TR_SCRIPTS" && npx playwright install --with-deps chromium 2>&1 ) || warn "Playwright chromium 安装失败"
    chmod +x "$_TR_SCRIPTS/trend-fetch"
    ln -sfn "$_TR_SCRIPTS/trend-fetch" "$BIN_DIR/trend-fetch"
    ok "trend-fetch 命令安装到：$BIN_DIR/trend-fetch"
  else
    warn "未找到 npm，跳过 trend-radar 安装（trend-fetch 不可用）"
  fi
fi

log "Pinterest 发布已迁移到 yanggedianzhang 服务器控制面 + 现有浏览器插件；跳过旧本地 Pinterest-autopin 工具同步"

INSTALLED=$(git -C "$INSTALL_DIR" describe --tags --always)

# 清掉旧 stack 留下的更新检查缓存：current 现在直接从 git 推导，但缓存里可能还
# 留着上一次的 latest，不清的话会立刻误报"有新版本"。glob 顺手清掉历史命名
# （latest-version → latest-tag / latest-main）
for _cache_dir in \
  "${ECOMMERCE_STACK_CACHE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/ecommerce-skills}" \
  "${XDG_CACHE_HOME:-$HOME/.cache}/etsy-skills"
do
  rm -f "$_cache_dir/last-check" "$_cache_dir"/latest-* 2>/dev/null || true
done

echo ""
ok "安装完成（版本：${INSTALLED}）"
echo ""
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    warn "$BIN_DIR 不在 PATH 里，加一行到你的 shell 配置（zsh: ~/.zshrc，bash: ~/.bashrc）："
    echo "    export PATH=\"$BIN_DIR:\$PATH\""
    echo ""
    ;;
esac
echo "常用命令："
echo "    ecommerce-stack version    # 当前版本"
echo "    ecommerce-stack check      # 立即检查更新"
echo "    ecommerce-stack update     # 拉最新版本"
echo "    ecommerce-stack list       # 列出已安装 skill"
echo "    ecommerce-stack ai-cleaner # 查看 / 安装 AI 发布图清理工具"
echo "    etsy-stack ...             # 旧命令仍可用"
