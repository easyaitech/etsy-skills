# 输出 Schema 说明

Trend Radar 每次运行输出一份 Markdown 报告和一份 JSON。Markdown 给人看，JSON 给后续 skill 接力。

## JSON 顶层字段

```json
{
  "run_date": "YYYY-MM-DD",
  "keyword": "Chinese",
  "geo": "US",
  "windows": ["7d", "30d"],
  "sources_used": [],
  "source_failures": [],
  "candidates": []
}
```

## Candidate 字段

```json
{
  "id": "YYYY-MM-DD-slug",
  "label": "原始热词或 hashtag",
  "bucket": "rising | watch | ignore",
  "verification_status": "confirmed | search_led | social_led | weak",
  "sources": ["google_trends_browser", "exolyt"],
  "signals": [
    {
      "source": "google_trends_browser",
      "window": "7d",
      "signal_type": "related_query",
      "growth": "Breakout",
      "evidence": "URL 或 raw 文件路径"
    }
  ],
  "related_terms": [],
  "why_it_matters": "",
  "risk_hint": "",
  "notes": ""
}
```

## 分档规则

`Rising`：
- 有明确增长信号。
- 有可复核 evidence。
- 不是明显噪音。

`Watch`：
- 只有单源证据，或增长弱。
- 有潜力但需要下周复查。

`Ignore`：
- 无增长。
- 与 `Chinese` 关系太弱。
- 明显是地名、无关人物、工具误判或一次性噪音。

## 去重规则

- 大小写归一，但保留原始 label。
- `#chinesefood` 和 `chinese food` 可合并到同一候选，related_terms 保留两个原文。
- Google query 与 Exolyt hashtag 语义相同时合并，并把 `verification_status` 升为 `confirmed`。
- 不要为了合并而过度解释；不确定时保留两条，放 `Watch`。
