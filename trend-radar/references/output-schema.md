# 输出 Schema — trend-radar

## Run Output（`YYYY-MM-DD/<source>-<GEO>.json`）

`trend-fetch pull` 为每个平台输出一个 JSON 文件，包含 run 元数据和 items 数组。数据由管理员采集插件采集、经 trend-radar 服务 `/latest` 拉取而来（不再本机抓取，故 evidence 里不再有截图/快照路径）。

```jsonc
{
  "generated_at": "2026-05-18T12:00:00.000Z",  // ISO 8601，该平台在服务端的采集时间
  "source": "erank-trend-buzz",                  // 数据源名称
  "geo": "US",                                   // 地区代码
  "item_count": 20,                              // items 数组长度
  "schema_version": "1.0",                       // schema 版本号
  "evidence": {
    "collected_by": "admin-trend-extension",     // 采集方（管理员趋势采集插件）
    "via": "trend-radar-service /latest",         // 拉取来源
    "revision": "47626f29746da71d"                // 服务端本轮数据 revision
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
    pinterest-trends-US.json    # 当天各平台数据（带 run 元数据包装），由 pull 落盘
    erank-trend-buzz-US.json
    google-trends-US.json
    fit-report.md               # 当天趋势结合点人工判断报告
    fit-report.json             # 结构化报告，供后续 handoff
  latest.json                   # pull 落的服务端合并总览（revision / runs / 跨平台合并 items）
  latest-fit-report.md          # 最新人工判断报告副本
```

> 具体有哪几个 `<source>-<GEO>.json` 取决于管理员采集插件本周实际采到的平台（以服务端 `/latest` 的 `runs[]` 为准），不是固定五个。

## 下游消费

`business-knowledge` 模式 A（Weekly Intake）按 [`business-knowledge/references/trend-radar-intake.md`](../../business-knowledge/references/trend-radar-intake.md) 消费本周采集：

- **新鲜度闸**：`latest.json.generated_at` 在本周内 → 纳入；缺失或过期 → SKIP，不阻塞。
- **选词主依据**：`latest-fit-report.md`（+ 同日 `{date}/fit-report.json` 的结构化 `items[]`，有则优先）里 `decision ∈ {可做, 观察}` 且有 `candidate_products` 结合点的热词 → 映射成 `Knowledge Cards`（`适用场景=listing`、热词进 `关键词标签`、设 `过期提醒日期`）。沉淀后 listing-catalog step 5.6 按现有 lookup 自动浮出作参考。
- **证据**：每个词的 `growth_label` / `rank` / `trend_url` 从 fit-report item 的 `evidence[]` 取。`latest.json` 现为服务端合并总览（含跨平台合并 `items[].evidence[]`），可作参考，但选词证据仍以 fit-report 为准。

`fit-report.json` 不自动进入 Marketing Brief / Base。人工确认后（或在 business-knowledge 写卡前的 diff 预览处确认），后续流程再把确认项交给 `business-knowledge`。

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
          "sku": "NK-001",
          "category": "Necklace",
          "title": "Personalized Name Necklace",
          "reason": "关键词与 Necklace / SKU 文案有重合"
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
| 1 | 用法错误 | 参数缺失、未知命令 |
| 2 | 配置/工作区错误 | 找不到工作区、未配置 `TREND_RADAR_TOKEN` |
| 3 | 网络/服务错误 | 连不上 trend-radar 服务、鉴权失败（401/403）、非 2xx |
| 4 | 无数据 | 服务端本周暂无该 geo 的热词（采集插件还没跑成） |
