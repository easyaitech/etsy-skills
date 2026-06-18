---
name: trend-radar
description: 每周自动采集 Google Trends 和 Pinterest Trends 上的热门关键词，并生成趋势 × 店铺/品牌/商品的 fit report 供人工判断。触发条件：(1) 用户说"看看这周什么热门 / 抓一下趋势"；(2) 用户说"找趋势和现有商品/店铺的结合点"；(3) 定期自动运行（每周一次）；(4) business-knowledge 整理周报时检查 latest.json。
layer: utility-input
---

# Trend Radar（趋势热词采集）

**分层定位**：`trend-radar` 是 **utility / input layer** — 它不属于基座层也不属于应用层，而是为后续营销判断提供自动化外部输入。它分两步：

1. 把易碎网页上的趋势信号稳定转换成结构化 JSON。
2. 读取当天所有趋势源 JSON + 店铺/品牌/商品上下文，生成人工确认用的 fit report。

```text
外部网站（Google Trends / Pinterest Trends）
  → trend-radar（采集 + 结构化）
  → outputs/trend-radar/YYYY-MM-DD/*.json
  → trend-radar fit-report（寻找结合点，不直接执行动作）
  → 客观趋势 / 可审计洞察自动沉淀进 business-knowledge
  → 需要落地执行的行动项交给人工确认
```

> 共享引导（版本检查 / 工作区解析 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 定位和边界

- 采集模式只做**采集和结构化**，不做分析、排序、推荐
- fit-report 模式只做**趋势 × 业务上下文的结合点判断**，不直接生成 Marketing Brief
- 结构化趋势 JSON / fit report 是第一输出；每周自动任务可以把客观趋势事实和可审计洞察直接写入 business-knowledge / 知识卡片 Base
- 但任何需要落地执行的动作（改商品 Base、写 Pin Queue、改 Listing、生成素材、发布内容、SEO 调整）都不能自动执行，必须作为建议等待人工确认
- 商品信息通过 `<workspace>/.cache/trend-radar/business-context/product-catalog.json` 读取，不在 Node CLI 里直连飞书 Base
- 下游（business-knowledge）缺失时 SKIP，不阻塞本 skill
- 本 skill 缺失时，下游也 SKIP — 遵循 dependency-protocol

## 使用方式

```bash
# 获取 Google Trends 通用热词 Top 50（默认 US）
trend-fetch google-trends

# 获取与 Chinese 相关的 Google Trends rising/top queries（默认 US）
trend-fetch google-trends-chinese

# 获取 Pinterest Trends 月度通用热词（默认 US）
trend-fetch pinterest-trends

# 获取 Pinterest Trends 月度 Chinese 过滤热词（默认 US）
trend-fetch pinterest-chinese

# 获取 eRank Trend Buzz 上 Etsy / US / Last 30 Days 关键词（默认 US）
trend-fetch erank-trend-buzz

# 指定地区
trend-fetch google-trends --geo GB

# 读取当天所有趋势源，生成趋势结合点报告
trend-fetch fit-report

# 指定日期 / 地区 / 最大分析数量
trend-fetch fit-report --date 2026-05-18 --geo US --max-items 50
```

Pinterest 未登录公开页可能只返回预览条目；如果要采集完整列表，可把已登录浏览器 profile 路径放到 `PINTEREST_TRENDS_PROFILE`，runner 会用该 profile 打开 Trends 页面。

eRank Trend Buzz 来自会员域名；未登录/免费态可能只返回有限预览，完整列表依赖账号权限。如果要复用已登录状态，把 eRank 的 Playwright profile 路径放到 `ERANK_TREND_BUZZ_PROFILE`，或用 `ERANK_TREND_BUZZ_CDP_PORT` 连接一枚已登录的本机浏览器。

## 输出

结构化 JSON 存储在 `<workspace>/outputs/trend-radar/`，详见 [`references/output-schema.md`](references/output-schema.md)。

fit report 生成：

```text
<workspace>/outputs/trend-radar/YYYY-MM-DD/fit-report.md
<workspace>/outputs/trend-radar/YYYY-MM-DD/fit-report.json
<workspace>/outputs/trend-radar/latest-fit-report.md
```

完整规则见 [`references/fit-report.md`](references/fit-report.md)。

## 技术栈

- Playwright（headless chromium）做浏览器自动化
- TypeScript + tsx 执行
- 独立 package.json（不污染 repo 根目录）

## 数据源

| Source | 状态 | 说明 |
|--------|------|------|
| google-trends | v0.1 ✅ | Google Trends trending now（过去 7 天上升最快，Top 50） |
| google-trends-chinese | v0.2 ✅ | Google Trends 中与 Chinese 相关的 rising/top queries + topics（过去 7 天，Top 50，需 SERPAPI_KEY） |
| pinterest-trends | v0.3 ✅ | Pinterest Trends 月度通用关键词（`trendsPreset=1`，Top 50，未登录时可能只有预览条目） |
| pinterest-chinese | v0.4 ✅ | Pinterest Trends 月度 Chinese 过滤关键词（`keywordsToInclude=chinese`，Top 50，未登录时可能只有预览条目） |
| erank-trend-buzz | v0.5 ✅ | eRank Trend Buzz 的 Etsy / Last 30 Days 关键词（免费态可能只有预览，完整列表依赖账号权限） |

添加新数据源：见 [`references/source-guide.md`](references/source-guide.md)。
