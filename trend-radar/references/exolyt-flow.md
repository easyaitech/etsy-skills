# Exolyt 采集流程

目标：用已登录 Exolyt 页面追踪 TikTok 上 `Chinese` / `#chinese` 相关的 hashtag、增长和热度信号。

## 可执行脚本

```bash
node trend-radar/scripts/browser-exolyt.mjs \
  --keyword Chinese \
  --out-dir "$WORKSPACE/trend-radar/raw/exolyt/YYYY-MM-DD"
```

可选：

```bash
--profile-dir "$WORKSPACE/.cache/trend-radar/exolyt-profile"
--headed true
```

首次使用建议加 `--headed true`，在弹出的浏览器里确认 Exolyt 已登录。脚本会保存：

```text
exolyt-browser.json
page-text.txt
screenshot.png
```

脚本会尝试打开 Exolyt 首页、hashtag 页面与搜索页，并从页面文本中抽取 hashtag-like terms。由于 Exolyt 是第三方站点，页面结构可能变化；如果抽不到 growth 字段，仍保留截图与页面文本作为 raw evidence。

## 固定参数

| 项 | 值 |
|---|---|
| keyword | `Chinese` |
| hashtag | `#chinese` |
| market | US 优先 |
| source | Exolyt 已登录页面 |

## 推荐流程

1. 打开 Exolyt。
2. 搜索 `Chinese` 或 `#chinese`。
3. 记录以下页面里可见的数据：
   - hashtag overview
   - related hashtags
   - historical growth / growth chart
   - today hot / rising hashtags（如账号权限可见）
   - top videos / examples（只记录 URL 与标题摘要，不下载视频）
4. 如果 Exolyt 支持导出 CSV/Excel，导出到：
   - `<workspace>/trend-radar/raw/exolyt/YYYY-MM-DD/`
5. 如果无法导出，保存页面 URL，并把可见表格整理进报告。

## 记录字段

每条 hashtag 至少记录：

```text
source = exolyt
label = 原始 hashtag 或 keyword
growth = 页面原文，如 growth score / delta / trend status
related_terms = Exolyt 返回的相关 hashtag
evidence = Exolyt URL、CSV 路径或截图路径
captured_at = ISO 时间
```

## 失败与降级

| 问题 | 处理 |
|---|---|
| 未登录 | 让用户在浏览器登录；不要索要账号密码 |
| 权限不足 | 记录可见数据；不可见字段不要猜 |
| 没有导出能力 | 用页面 URL + 可见表格摘要 |
| 搜不到 `#chinese` | 记录 no_result，不能换成长尾关键词 |

## 注意

- Exolyt 是 TikTok 侧主源，但仍是第三方数据，不等同 TikTok 内部数据。
- 单个爆款视频不能直接算 Rising，必须有 related hashtag、增长曲线、hot/rising 标记或多条热视频支持。
