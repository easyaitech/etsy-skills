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
    google-trends-US.json       # 当天数据（带 run 元数据包装）
    google-trends-chinese-US.json
    pinterest-trends-US.json
    pinterest-chinese-US.json
    erank-trend-buzz-US.json
    google-trends-screenshot.png
    google-trends-snapshot.html
    fit-report.md               # 当天趋势结合点人工判断报告
    fit-report.json             # 结构化报告，供后续 handoff
  latest.json                   # 最新结果的完整副本
  latest-fit-report.md          # 最新人工判断报告副本
```

## 下游消费

`business-knowledge` 检查 `outputs/trend-radar/latest.json`：
- 如果 `generated_at` 在本周内 → 自动引用为 evidence
- 如果缺失或过期 → SKIP，不阻塞

`fit-report.json` 不自动进入 Marketing Brief。人工确认后，后续流程再把确认项交给 `business-knowledge`。

## Fit Report Output（`fit-report.json`）

```jsonc
{
  "generated_at": "2026-05-18T12:00:00.000Z",
  "date": "2026-05-18",
  "geo": "US",
  "schema_version": "1.0",
  "trend_sources": ["google-trends", "pinterest-chinese"],
  "business_context": {
    "brand": "found",
    "shop": "found",
    "brand_marketing": "found",
    "marketing_platform": "found",
    "product_cache": "found",
    "product_count": 12
  },
  "summary": {
    "adopt": 3,
    "watch": 5,
    "reject": 12,
    "total": 20
  },
  "items": [
    {
      "keyword": "Chinese name meaning",
      "normalized_keyword": "chinese name meaning",
      "decision": "可做",
      "confidence": "high",
      "human_decision": null,
      "human_decision_at": null,
      "evidence": [
        {
          "keyword": "Chinese name meaning",
          "source": "google-trends-chinese",
          "geo": "US",
          "rank": 1,
          "growth_label": "+5,000%",
          "category": "Gifts",
          "captured_at": "2026-05-18T12:00:00Z",
          "trend_url": "https://example.com"
        }
      ],
      "candidate_products": [
        {
          "sku": "BM-001",
          "category": "Bookmark",
          "title": "Custom Chinese Calligraphy Bookmark",
          "reason": "关键词与 Bookmark / SKU 文案有重合"
        }
      ],
      "reasons": {
        "brand_shop_fit": "关键词与品牌/店铺/营销基座文本有语义重合。",
        "product_fit": "命中 1 个候选 SKU / 品类。",
        "marketing_scene_fit": "可进入人工判断，看是否归属到现有营销场景。",
        "platform_fit": "趋势证据来自 google-trends-chinese，平台方向需人工确认。"
      },
      "suggested_angle": "围绕「Chinese name meaning」找一个现有 SKU 的自然营销切入点。",
      "boundaries": [],
      "explanation_source": "deterministic"
    }
  ]
}
```

## Exit Codes

| Code | 含义 | 场景 |
|------|------|------|
| 0 | 成功 | 正常输出 |
| 1 | 用法错误 | 参数缺失、未知数据源、不支持的 geo |
| 2 | 配置/工作区错误 | 找不到工作区 |
| 3 | 网络错误 | 浏览器启动失败、页面加载超时 |
| 4 | 解析错误 | CAPTCHA、selector 失败、0 条结果 |
