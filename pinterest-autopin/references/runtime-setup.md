# Runtime Setup（首次接入 Pinterest）

只在 SKILL.md 模式 A 触发。装一次，后续模式 B / C 都复用。

---

## 路径约定

| 角色 | 路径 | 是否进 git |
|---|---|---|
| Pinterest-autopin 工具源码 | `~/code/etsy-skills/tools/Pinterest-autopin/` | 否（在 etsy-skills 仓库的 `.gitignore` 加 `tools/`） |
| Chrome profile（含 Pinterest 登录态） | `~/.config/pinterest-autopin/chrome-profile/` | 否（在用户家目录，独立于仓库） |
| 运行时 request.json | `<workspace>/.cache/pinterest-autopin/runtime/{pin_id}.json` | 否（`.cache/` 应进工作区 `.gitignore`） |
| 处理后图片 | `<workspace>/.cache/pinterest-autopin/processed/{原始文件名}` | 否（同在 `.cache/` 下） |

> `<workspace>` = `etsy-stack workspace` 解析出的根目录（`$ETSY_WORKSPACE` 或向上找到的 `.etsy-workspace` 标记所在目录）。SKILL.md §对外的实操接口已说明契约。

三层分离的理由：
- **工具源码**——可随时删了重 clone，不丢数据。`$HOME` 路径在 Hermes profile 隔离下落到 profile HOME 是预期行为
- **登录态**——独立于工具与工作区，跨工作区复用同一个 Pinterest 账号登录
- **runtime 数据**——按工作区隔离。多店铺切换时，每个店铺的 pin 历史互不污染；工作区被打包/迁移时 runtime 跟着走

---

## 安装步骤

按顺序执行，遇错停下问用户：

### 1. 前置环境检查

执行命令检查（`terminal` 工具）：

```bash
node --version      # 期望 ≥ 18
npm --version       # 期望 ≥ 9
python3 --version   # 期望 ≥ 3.10
exiftool -ver       # 图片元数据清理
jpegoptim --version # JPEG 无损压缩
optipng --version   # PNG 无损压缩
```

前三个任一缺失：告诉用户去装（`brew install node python@3.12`）。
后三个任一缺失：告诉用户 `brew install exiftool jpegoptim optipng`（图片处理流程必需——见 `image-processing.md`）。
不替用户装系统级依赖。

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
- "给 SKU TEACUP-001 出一条 pin 试试"（进入模式 B，单图或轮播都可以）
```
