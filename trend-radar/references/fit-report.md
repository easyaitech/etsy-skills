# Fit Report — 趋势结合点报告

`fit-report` 是 `trend-radar` 的第二步：

```text
fetch trends
  -> source JSONs
  -> fit-report
  -> human decision
  -> later Marketing Brief
```

它回答的问题是：

> 这个趋势词和现有店铺、品牌、营销策略、商品信息有没有自然结合点？

它不回答：

> 现在应该卖什么？

## 命令

```bash
trend-fetch fit-report
trend-fetch fit-report --date 2026-05-18
trend-fetch fit-report --date 2026-05-18 --geo US --max-items 50
```

## 输入

### 1. 当天趋势源 JSON

读取：

```text
<workspace>/outputs/trend-radar/YYYY-MM-DD/*-{geo}.json
```

示例：

```text
<workspace>/outputs/trend-radar/2026-05-18/google-trends-US.json
<workspace>/outputs/trend-radar/2026-05-18/google-trends-chinese-US.json
<workspace>/outputs/trend-radar/2026-05-18/pinterest-trends-US.json
<workspace>/outputs/trend-radar/2026-05-18/pinterest-chinese-US.json
```

不读 `latest.json`，因为 `latest.json` 只代表最后一次 source 输出，不代表完整周报。

### 2. 业务上下文文件

读取：

```text
<workspace>/BRAND.md
<workspace>/SHOP.md
<workspace>/BRAND_MARKETING.md
<workspace>/MARKETING_PLATFORM.md
```

缺失时继续，但报告必须标出 missing，并降低判断信心。

### 3. 商品上下文缓存

读取：

```text
<workspace>/.cache/trend-radar/business-context/product-catalog.json
```

v1 不在 Node CLI 中直接连接飞书 Base。商品 Base 由人工导出、Hermes 前置步骤，或未来专门 refresh 命令写入本地缓存。

支持两种形态：

```json
[
  {
    "SKU": "BM-001",
    "品类": "Bookmark",
    "Title (EN)": "Custom Chinese Calligraphy Bookmark",
    "Description (EN)": "Personalized name meaning birthday gift",
    "Tags": ["custom bookmark", "name meaning"],
    "SEO 关键词": ["Chinese name meaning gift"],
    "状态": "草稿"
  }
]
```

或：

```json
{
  "products": [
    {
      "SKU": "BM-001",
      "品类": "Bookmark"
    }
  ]
}
```

缺失时继续，但报告必须写：

```text
Product context cache missing: SKU-level matching skipped.
```

## 判断流程

```text
trend source JSONs
  -> merge + dedupe
  -> deterministic fit prefilter
       - source freshness
       - keyword/category overlap
       - business context present/missing
       - product context overlap
       - obvious reject flags
  -> deterministic explanation
       - explain reasons
       - suggest one-line angle
       - cite business context fields used
       - cannot upgrade deterministic reject
  -> fit-report.md/json
```

v1 使用规则解释，不调用 LLM。未来如接入 LLM，它也只能补理由和角度，不能把规则判定的 `不做` 升级成 `可做`。

## 去重规则

按 normalized keyword 去重：

- lowercase
- trim whitespace
- collapse repeated whitespace
- keep original keyword strings in evidence
- do not stem or translate terms

如果同一关键词在 Google 和 Pinterest 都出现，报告里只出现一个趋势 section，但保留多个 source evidence。

## 决策值

| Decision | 含义 |
|---|---|
| `可做` | 有自然商品/业务上下文匹配，且风险低 |
| `观察` | 相关但证据不足，或缺商品/平台/场景信息 |
| `不做` | 热但不相关、牵强、风险高，或缺少可承接事实 |

热点不是任务。`不做` 是正常输出。

## 输出

```text
<workspace>/outputs/trend-radar/YYYY-MM-DD/fit-report.md
<workspace>/outputs/trend-radar/YYYY-MM-DD/fit-report.json
<workspace>/outputs/trend-radar/latest-fit-report.md
```

Markdown 给人看和勾选：

```markdown
- Human decision:
  - [ ] adopt
  - [ ] watch
  - [ ] reject
```

JSON 给后续 handoff：

```json
{
  "keyword": "Chinese name meaning",
  "decision": "可做",
  "confidence": "high",
  "human_decision": null,
  "human_decision_at": null
}
```

v1 不写回人工确认结果。后续要生成 Marketing Brief 时，再实现单独确认/写回流程。

## 失败行为

| 场景 | 行为 |
|---|---|
| 找不到工作区 | exit 2 |
| 找不到日期目录 | exit 4 |
| 没有该日期/地区的趋势源 JSON | exit 4 |
| source JSON 解析失败 | exit 4，并指出文件路径 |
| 商品缓存缺失 | 继续，标记 SKU-level matching skipped |
| 基座文件缺失 | 继续，标记 missing |
| 写报告失败 | 非零退出，不更新 latest-fit-report |
