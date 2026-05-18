# 输出 Schema — trend-radar

## Run Output（`latest.json` / `YYYY-MM-DD/<source>.json`）

每次运行输出一个 JSON 文件，包含 run 元数据和 items 数组。

```jsonc
{
  "generated_at": "2026-05-18T12:00:00.000Z",  // ISO 8601，运行时间
  "source": "google-trends",                     // 数据源名称
  "geo": "US",                                   // 地区代码
  "item_count": 20,                              // items 数组长度
  "schema_version": "1.0",                       // schema 版本号
  "evidence": {
    "screenshot": "/path/to/google-trends-screenshot.png",
    "html_snapshot": "/path/to/google-trends-snapshot.html"
  },
  "items": [
    // TrendItem[]，见下方
  ]
}
```

## TrendItem

```jsonc
{
  "keyword": "summer dress",              // 关键词原文
  "source": "google-trends",              // 来源
  "geo": "US",                            // 地区
  "rank": 1,                              // 排名（从 1 开始）
  "growth_label": "+5,000%",              // 增长标签（原文）
  "category": "Fashion",                  // Google Trends 分类
  "captured_at": "2026-05-18T12:00:00Z",  // 采集时间
  "trend_url": "https://trends.google.com/trends/explore?q=summer+dress&geo=US"
}
```

## 文件存储

```
<workspace>/outputs/trend-radar/
  2026-05-18/
    google-trends.json          # 当天数据（带 run 元数据包装）
    google-trends-screenshot.png
    google-trends-snapshot.html
  latest.json                   # 最新结果的完整副本
```

## 下游消费

`business-knowledge` 检查 `outputs/trend-radar/latest.json`：
- 如果 `generated_at` 在本周内 → 自动引用为 evidence
- 如果缺失或过期 → SKIP，不阻塞

## Exit Codes

| Code | 含义 | 场景 |
|------|------|------|
| 0 | 成功 | 正常输出 |
| 1 | 用法错误 | 参数缺失、未知数据源、不支持的 geo |
| 2 | 配置/工作区错误 | 找不到工作区 |
| 3 | 网络错误 | 浏览器启动失败、页面加载超时 |
| 4 | 解析错误 | CAPTCHA、selector 失败、0 条结果 |
