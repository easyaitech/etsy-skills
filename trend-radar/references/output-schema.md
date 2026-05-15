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
  "meaning_zh": "这个词组是什么意思",
  "user_intent_zh": "用户搜索这个词背后的需求",
  "calligraphy_fit_zh": "和中国书法字周边的结合点",
  "fit_level": "high | medium | low | unknown",
  "suggested_chinese_text": ["福", "静"],
  "next_step_zh": "下一步怎么验证或使用",
  "risk_hint": "",
  "notes": ""
}
```

## 语义解读字段

每个 candidate 必须包含三段可读解释：

| 字段 | 说明 |
|---|---|
| `meaning_zh` | 这个英文词组/hashtag 大概是什么意思；不确定时明确写需要二次搜索确认 |
| `user_intent_zh` | 用户为什么搜它，背后的需求是什么 |
| `calligraphy_fit_zh` | 它和中国书法字周边怎么结合，或为什么不适合结合 |
| `fit_level` | `high` / `medium` / `low` / `unknown` |
| `suggested_chinese_text` | 可考虑的汉字或短语，只给公共文化表达，不给商业 IP 名称 |
| `next_step_zh` | 下一步动作：进入机会评估、保持观察、忽略、或二次搜索 |

注意：这些字段是趋势解读，不是最终商品建议。涉及影视、游戏、明星、商标时，只能写风险提示，不要直接建议用商业名称做商品标题。

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
