# Google Trends 浏览器自动化

目标：用浏览器页面本身抓取 `Chinese` 在美国市场的 rising related queries / topics。优先使用页面可见数据或导出 CSV，不解析隐藏接口。

## 可执行脚本

```bash
node trend-radar/scripts/browser-google-trends.mjs \
  --keyword Chinese \
  --geo US \
  --out-dir "$WORKSPACE/trend-radar/raw/google-trends/YYYY-MM-DD"
```

可选：

```bash
--profile-dir "$WORKSPACE/.cache/trend-radar/google-profile"
--headed true
```

脚本会打开 Google Trends 页面，保存：

```text
google-trends-summary.json
7d/normalized.json
7d/page-text.txt
7d/screenshot.png
30d/normalized.json
30d/page-text.txt
30d/screenshot.png
```

如果页面网络里捕获到 related searches 数据，还会保存 `related-*.json` 并生成 normalized entries；如果捕获不到，仍保存页面文本和截图供人工复核。

## 固定参数

| 项 | 值 |
|---|---|
| URL | `https://trends.google.com/trends/explore` |
| keyword | `Chinese` |
| geo | `US` |
| windows | `now 7-d` + `today 1-m` |
| category | All categories |
| search type | Web Search |
| language | English UI |

## 推荐流程

1. 打开 Google Trends Explore。
2. 设置地区为 United States。
3. 输入 keyword `Chinese`。
4. 分别设置时间：
   - Past 7 days
   - Past 30 days
5. 读取以下模块：
   - Interest over time：只记录走势摘要，不需要逐点抄数据。
   - Related topics：切换到 Rising。
   - Related queries：切换到 Rising。
6. 如果页面提供下载按钮，优先下载 CSV 到：
   - `<workspace>/trend-radar/raw/google-trends/YYYY-MM-DD-7d/`
   - `<workspace>/trend-radar/raw/google-trends/YYYY-MM-DD-30d/`
7. 如果下载不稳定，直接从页面可见表格复制前 10-25 条。

## 记录字段

每条 query/topic 至少记录：

```text
source = google_trends_browser
window = 7d 或 30d
type = related_query 或 related_topic
label = 原文
growth = 原文，如 Breakout / +250%
rank = 如果页面有
evidence = 页面 URL、CSV 路径或截图路径
captured_at = ISO 时间
```

## 常见失败与处理

| 问题 | 处理 |
|---|---|
| Cookie 弹窗 | 关闭后继续，使用固定浏览器 profile 降低重复出现 |
| 页面语言不是英文 | 切换到英文 UI 或只记录原页面英文热词 |
| 页面改版导致按钮找不到 | 放弃 DOM 精确路径，改用人工可见表格复制 |
| 验证码 / 异常流量 | 停止 Google 主路径，改用 SerpApi fallback |
| 没有 Rising 数据 | 记录为无结果，不要编造 |

## 稳定性原则

- 低频运行：手动 + 每周 cron，避免高频触发风控。
- 固定一个浏览器 profile。
- 固定 US、固定 keyword，减少页面路径分支。
- 优先保留原始 CSV / 截图 / 页面 URL，便于人工复核。
