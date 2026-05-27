# Pinterest 登录/CDP/Profile 运行时排查指南

## 症状与诊断

### 症状 A：check-login 报 SingletonLock

```
Failed to create a ProcessSingleton for your profile directory
```

**不要误判为未登录。** 这意味着该 profile 已被其他 Chrome 进程占用。检查 CDP：

```bash
curl -sS --max-time 2 http://127.0.0.1:9222/json/version
curl -sS --max-time 2 http://127.0.0.1:9222/json/list
```

如果看到 Pinterest/FuBlessings 页面，**账号其实是已登录的**。

**解决方案**：走 CDP 路径：

```bash
cd ~/code/etsy-skills/tools/Pinterest-autopin
python3 tools/pinterest_publish_pin.py \
  --mode check-login \
  --no-default-chrome-profile \
  --creation-url 'https://ads.pinterest.com/ads/create/'
```

### 症状 B：CDP 报 `/json/version/` 400

```
Unexpected status 400 when connecting to http://127.0.0.1:9222/json/version/
This does not look like a DevTools server, try connecting via ws://.
```

**原因**：`publish_playwright.js` 的 `resolveBrowserEndpointUrl()` 返回了 `http://127.0.0.1:9222` 而不是 `/json/version` 里的 `webSocketDebuggerUrl`（ws:// 协议）。

**修复**（2026-05-18 已本地补丁）：

```javascript
// publish_playwright.js resolveBrowserEndpointUrl()
const endpointUrl = payload.webSocketDebuggerUrl;  // 返回 ws://127.0.0.1:9222/devtools/browser/...
```

### 症状 C：pinterest-chinese/pinterest-trends 返回 0 条结果

排查清单：

1. **页面表头语言不匹配**：trend-radar 解析器原只识别英文表头 `Keywords`，但中文 locale 下是 `关键词`。已本地补丁 `pinterest.ts` 增加双语支持。

2. **Chrome profile 复制不完整**：Chrome 运行时 `rsync` 复制的 `Cookies` SQLite 文件是不一致版本。**必须先 `pkill Chrome`，等 3-5 秒再复制。**

3. **Headless Chromium 无法解密系统 Chrome cookies**：macOS AES GCM 加密与 keychain 绑定。`launchPersistentContext` 必须用系统 Chrome `executablePath`。

4. **未登录 vs 无数据**：用 CDP（9222）打开 live Chrome 确认页面确实有数据——不是登录/权限问题。2026-05-18 确认 `chinese` 过滤下页面有 50+ 条含 chinese 的关键词。

## Profile 复制安全流程

```bash
PROFILE="$HOME/.config/pinterest-autopin/chrome-profile"
TREND_PROFILE="$HOME/.config/pinterest-autopin/chrome-profile-trend-radar"

# 1. 完全关闭 Chrome
pkill -9 "Google Chrome"
sleep 5

# 2. 清理锁文件
rm -f "$PROFILE/SingletonLock" "$PROFILE/SingletonCookie" "$PROFILE/DevToolsActivePort"

# 3. 复制
rsync -a --exclude 'Singleton*' --exclude 'DevToolsActivePort' \
  --exclude 'Crashpad' --exclude '*/TransportSecurity' \
  "$PROFILE/" "$TREND_PROFILE/"

# 4. 用系统 Chrome executable 验证
PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
PINTEREST_TRENDS_PROFILE="$TREND_PROFILE" trend-fetch pinterest-chinese --geo US
```

## CDP 快速验证

```python
import json, urllib.request
# 确认 page 内容
tabs=json.loads(urllib.request.urlopen('http://127.0.0.1:9222/json/list').read())
for t in tabs:
    if 'pinterest' in t.get('url',''):
        print(t['url'], t['title'])
```

## 2026-05-18 验证结果

- **FuBlessings 已登录 Pinterest**：个人主页 `jp.pinterest.com/FuBlessings/`
- **Ads 创建页可用**：`ads.pinterest.com/advertiser/549770375970/ads/create/`
- **Pinterest Trends 有数据**：US + `chinese` 过滤下有 50+ 条关键词（chinese food recipes, chinese dragon, chinese tattoo 等）
- **trend-radar 失败原因**：解析器表头语言不匹配 + headless Chrome cookies 解密不兼容
- **publish_playwright.js CDP 修复**：备份在 `.hermes/backups/pinterest-login-fix-20260518-200253/`
