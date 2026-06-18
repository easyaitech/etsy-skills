# trend-radar 本地运行注意事项

## 双语解析补丁 (2026-05-18)

`pinterest.ts` 的 `parseSearchTrendTable` 和 `parseSpotlight` 原只识别英文表头（`Keywords`、`View the full list` 等），当浏览器 locale 不是 en-US 时页面返回中文表头（`关键词》、`查看全部趋势》 等），导致返回 0 条。

**已本地修改**：
`$HOME/.local/share/etsy-skills/trend-radar/scripts/sources/pinterest.ts`

修改：
- `isNoiseLine()` 增加中文：`关键词`、`搜索量`、`每周变化`、`每月变化`、`每年变化`、`查看全部趋势`、`搜索趋势`、`热门趋势`、`购物趋势》、`主编精选」
- `parseSearchTrendTable()` 起始锚点增加 `关键词》fallback；终止增加 `查看全部趋势` / `主编精选`
- `parseSpotlight()` 起始增加 `热门趋势》fallback；终止增加 `购物趋势` / `搜索趋势`

> 上游 `etsy-skills` 更新会覆盖此补丁。更新后备份在 `.hermes/backups/trend-radar-bilingual-patch-*/`。

## Chrome profile 复制陷阱

### 1. 运行时 rsync 不完整
Chrome 的 `Cookies` 是 SQLite，运行时复制会得到不一致版本。必须先 kill Chrome 再 rsync。

### 2. 跨版本加密不兼容
Playwright 内置 Chromium 无法解密系统 Chrome 的 cookies (macOS AES GCM)。需传 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指向系统 Chrome。

### 3. Headless 无代理
Playwright headless 不继承 shell HTTP_PROXY。访问 Pinterest 如需代理，需在 Playwright 代码里传 `--proxy-server`。
