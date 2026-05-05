#!/usr/bin/env bash
# Etsy skill stack 安装 / 升级脚本
#
# ── 推荐（钉死版本）─────────────────────────────────────────────
#   curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.0/install.sh | bash
#
# ── 最新主线 ────────────────────────────────────────────────────
#   curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/main/install.sh | bash
#
# ── 已 clone 后本地升级 ────────────────────────────────────────
#   bash install.sh    或    etsy-stack update
#
# ── 谨慎模式（先看再跑） ───────────────────────────────────────
#   curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.0/install.sh -o install.sh
#   less install.sh   # 自查一遍
#   bash install.sh
#
# 环境变量（可选）：
#   ETSY_SKILLS_HOME    源码安装目录（默认 ~/.local/share/etsy-skills）
#   HERMES_SKILLS_DIR   Hermes 加载 skill 的目录（默认 ~/.hermes/skills）
#   ETSY_STACK_BIN      etsy-stack 命令的安装目录（默认 ~/.local/bin）
#   ETSY_SKILLS_REPO    Git 仓库 URL（默认 HTTPS：https://github.com/easyaitech/etsy-skills.git）
#                       开发者可改成 SSH：git@github.com:easyaitech/etsy-skills.git
#   ETSY_SKILLS_REF     要 checkout 的分支 / tag（默认 main；推荐传具体 tag 如 v0.1.0）

set -euo pipefail

REPO_URL="${ETSY_SKILLS_REPO:-https://github.com/easyaitech/etsy-skills.git}"
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
  ln -sfn "$src" "$dst"
  ok "$skill"
done

mkdir -p "$BIN_DIR"
chmod +x "$INSTALL_DIR/scripts/etsy-stack" "$INSTALL_DIR/scripts/check-update.sh"
ln -sfn "$INSTALL_DIR/scripts/etsy-stack" "$BIN_DIR/etsy-stack"
ok "命令安装到：$BIN_DIR/etsy-stack"

INSTALLED=$(git -C "$INSTALL_DIR" describe --tags --always)

# 清掉旧 stack 留下的更新检查缓存：current 现在直接从 git 推导，但缓存里可能还
# 留着上一次的 latest，不清的话会立刻误报"有新版本"
ETSY_CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/etsy-skills"
rm -f "$ETSY_CACHE_DIR/last-check" "$ETSY_CACHE_DIR/latest-version"

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
