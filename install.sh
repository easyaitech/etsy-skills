#!/usr/bin/env bash
# Etsy skill stack 安装 / 升级脚本
#
# ── 私有库（默认）：通过 gh CLI 引导 ────────────────────────────
#   gh auth login   # 一次性登录
#   gh api repos/easyaitech/etsy-skills/contents/install.sh \
#       -H 'Accept: application/vnd.github.raw' | bash
#   → 之后 install.sh 用 SSH (git@github.com:…) clone 仓库本体
#
# ── 已 clone 后本地升级 ────────────────────────────────────────
#   bash install.sh
#
# ── 公网 / 镜像（仓库变 public 时） ────────────────────────────
#   curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/main/install.sh | bash
#
# 环境变量（可选）：
#   ETSY_SKILLS_HOME    源码安装目录（默认 ~/.local/share/etsy-skills）
#   HERMES_SKILLS_DIR   Hermes 加载 skill 的目录（默认 ~/.hermes/skills）
#   ETSY_STACK_BIN      etsy-stack 命令的安装目录（默认 ~/.local/bin）
#   ETSY_SKILLS_REPO    Git 仓库 URL（默认 SSH: git@github.com:easyaitech/etsy-skills.git）
#                       如需 HTTPS+token：https://<TOKEN>@github.com/easyaitech/etsy-skills.git
#   ETSY_SKILLS_REF     要 checkout 的分支 / tag（默认 main）

set -euo pipefail

REPO_URL="${ETSY_SKILLS_REPO:-git@github.com:easyaitech/etsy-skills.git}"
REF="${ETSY_SKILLS_REF:-main}"
INSTALL_DIR="${ETSY_SKILLS_HOME:-$HOME/.local/share/etsy-skills}"
HERMES_SKILLS_DIR="${HERMES_SKILLS_DIR:-$HOME/.hermes/skills}"
BIN_DIR="${ETSY_STACK_BIN:-$HOME/.local/bin}"

log()   { printf "  %s\n" "$*"; }
ok()    { printf "✓ %s\n" "$*"; }
warn()  { printf "⚠️  %s\n" "$*" >&2; }
fail()  { printf "❌ %s\n" "$*" >&2; exit 1; }

command -v git >/dev/null || fail "未找到 git，请先安装"
command -v python3 >/dev/null || fail "未找到 python3，请先安装"

# ── 1. clone or pull ────────────────────────────────────────
if git -C "$INSTALL_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  log "更新源码：$INSTALL_DIR"
  git -C "$INSTALL_DIR" fetch --tags --quiet origin
  git -C "$INSTALL_DIR" checkout --quiet "$REF"
  git -C "$INSTALL_DIR" pull --ff-only --quiet
else
  log "Clone 仓库到：$INSTALL_DIR"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --quiet "$REPO_URL" "$INSTALL_DIR"
  git -C "$INSTALL_DIR" checkout --quiet "$REF"
fi

# ── 2. read manifest ─────────────────────────────────────────
MANIFEST="$INSTALL_DIR/etsy-stack.json"
[[ -f "$MANIFEST" ]] || fail "manifest 缺失：$MANIFEST"

mapfile -t SKILLS < <(python3 -c "
import json, sys
m = json.load(open('$MANIFEST'))
for s in m['skills']:
    print(s)
")
[[ ${#SKILLS[@]} -gt 0 ]] || fail "manifest.skills 为空"

# ── 3. symlink skills ────────────────────────────────────────
mkdir -p "$HERMES_SKILLS_DIR"
log "链接 skill → $HERMES_SKILLS_DIR"
for skill in "${SKILLS[@]}"; do
  src="$INSTALL_DIR/$skill"
  dst="$HERMES_SKILLS_DIR/$skill"
  if [[ ! -d "$src" ]]; then
    warn "$skill 在 manifest 中但目录不存在，跳过"
    continue
  fi
  if [[ -L "$dst" ]]; then
    rm "$dst"
  elif [[ -e "$dst" ]]; then
    backup="$dst.bak.$(date +%s)"
    warn "$dst 已存在且不是软链，备份到 $backup"
    mv "$dst" "$backup"
  fi
  ln -s "$src" "$dst"
  ok "$skill"
done

# ── 4. install etsy-stack CLI ───────────────────────────────
mkdir -p "$BIN_DIR"
chmod +x "$INSTALL_DIR/scripts/etsy-stack" "$INSTALL_DIR/scripts/check-update.sh"
ln -sfn "$INSTALL_DIR/scripts/etsy-stack" "$BIN_DIR/etsy-stack"
ok "命令安装到：$BIN_DIR/etsy-stack"

# ── 5. record installed version ─────────────────────────────
git -C "$INSTALL_DIR" describe --tags --always > "$INSTALL_DIR/.installed-version"
INSTALLED=$(cat "$INSTALL_DIR/.installed-version")

# 重置更新检查缓存，避免刚装完还提示有新版本
rm -f "${XDG_CACHE_HOME:-$HOME/.cache}/etsy-skills/last-check" \
      "${XDG_CACHE_HOME:-$HOME/.cache}/etsy-skills/latest-version"

# ── 6. final hint ────────────────────────────────────────────
echo ""
ok "安装完成（版本：$INSTALLED）"
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
echo "    etsy-stack version    # 当前版本"
echo "    etsy-stack check      # 立即检查更新"
echo "    etsy-stack update     # 拉最新版本"
echo "    etsy-stack list       # 列出已安装 skill"
