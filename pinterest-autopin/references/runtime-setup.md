# Runtime Setup（首次接入 Pinterest）

只在 SKILL.md 模式 A 触发。装一次，后续模式 B / C 都复用。

---

## 路径约定

| 角色 | 路径 | 是否进 git |
|---|---|---|
| Pinterest-autopin 工具源码 | `~/code/etsy-skills/tools/Pinterest-autopin/` | 否（在 etsy-skills 仓库的 `.gitignore` 加 `tools/`） |
| Chrome profile（含 Pinterest 登录态） | `~/.config/pinterest-autopin/chrome-profile/` | 否（在用户家目录，独立于仓库） |
| 运行时 request.json | `~/code/etsy-skills/tools/Pinterest-autopin/runtime/{pin_id}.json` | 否 |

理由：源码与登录态分离——工具可以随时删了重 clone，不丢登录态；登录态在家目录便于跨 worktree 复用。

---

## 安装步骤

按顺序执行，遇错停下问用户：

### 1. 前置环境检查

执行命令检查（`terminal` 工具）：

```bash
node --version    # 期望 ≥ 18
npm --version     # 期望 ≥ 9
python3 --version # 期望 ≥ 3.10
```

任一缺失：告诉用户去装（`brew install node python@3.12`），不替用户装系统级依赖。

### 2. clone Pinterest-autopin

```bash
mkdir -p ~/code/etsy-skills/tools
cd ~/code/etsy-skills/tools && git clone https://github.com/easyaitech/Pinterest-autopin.git
```

如果目标目录已存在：先 `git status` 看是否有本地改动；干净就 `git pull`，有改动就停下问用户。

### 3. 装依赖

```bash
cd ~/code/etsy-skills/tools/Pinterest-autopin
npm install
python3 -m playwright install chromium
```

`playwright install chromium` 会下载几百 MB Chromium，第一次较慢——告诉用户预计 1-3 分钟。

### 4. 准备 Chrome profile 目录

```bash
mkdir -p ~/.config/pinterest-autopin/chrome-profile
```

### 5. 登录 Pinterest（人工）

执行：

```bash
cd ~/code/etsy-skills/tools/Pinterest-autopin
npm run pin:check-login -- --chrome-profile ~/.config/pinterest-autopin/chrome-profile
```

这会弹出一个 Chrome 窗口。**让用户自己在窗口里完成 Pinterest 登录**（邮箱密码、Google SSO、双因素验证都由用户手动操作；本 skill 不替用户输任何凭据）。

登录完成后用户关掉窗口，命令应输出 `{"ok": true, "loggedIn": true}` 类似 JSON。

如果输出 `loggedIn: false`：让用户重跑一次确认登录确实成功；可能 Pinterest 弹了二次验证用户没注意。

### 6. 加 .gitignore

确认 `~/code/etsy-skills/.gitignore`（或在工具仓自身的 `.gitignore`）包含：

```
tools/
```

如果没有就追加。这一步**写入 `.gitignore` 前要展示给用户确认**（仓库根目录文件改动按通用写入协议处理）。

---

## 故障排查

### Playwright chromium 下载失败

国内网络常见。用户需要配代理或用镜像，本 skill 不替决策——告诉用户两条路：

```bash
# 方案 A：走代理
HTTPS_PROXY=http://127.0.0.1:7890 python3 -m playwright install chromium

# 方案 B：用淘宝镜像
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright python3 -m playwright install chromium
```

### `pin:check-login` 报"profile locked"

之前的 Chrome 进程没退干净。让用户：

```bash
pkill -f "chrome-profile" 2>/dev/null
```

然后重跑。

### Pinterest 弹了人机验证

不替用户过验证（违反 user_privacy 中"never bypass CAPTCHA"）。让用户在弹出的 Chrome 窗口里自己完成。

---

## 输出给用户的"安装完成"清单

模式 A 全部完成后，用一个块告诉用户：

```
Pinterest-autopin 已就绪：

工具路径：~/code/etsy-skills/tools/Pinterest-autopin/
Chrome profile：~/.config/pinterest-autopin/chrome-profile/
Pin Queue Base：{Base 链接}
登录状态：已登录（Pinterest 账号 {email/username}）

下一步可以：
- "给 SKU TEACUP-001 出一条 pin 试试"（进入模式 B）
```
