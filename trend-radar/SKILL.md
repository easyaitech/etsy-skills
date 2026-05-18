---
name: trend-radar
description: 每周自动采集 Google Trends 和 Pinterest Trends 上的热门关键词，输出结构化 JSON 供 business-knowledge 及其他下游 skill 消费。触发条件：(1) 用户说"看看这周什么热门 / 抓一下趋势"；(2) 定期自动运行（每周一次）；(3) business-knowledge 整理周报时检查 latest.json。
layer: utility-input
---

# Trend Radar（趋势热词采集）

**分层定位**：`trend-radar` 是 **utility / input layer** — 它不属于基座层也不属于应用层，而是为基座层（特别是 `business-knowledge`）提供自动化的外部数据输入。它的唯一职责是把易碎网页上的趋势信号稳定转换成结构化 JSON。

```text
外部网站（Google Trends / Pinterest Trends）
  → trend-radar（采集 + 结构化）
  → outputs/trend-radar/latest.json
  → business-knowledge（消费为 Knowledge Cards evidence）
```

> 共享引导（版本检查 / 工作区解析 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 定位和边界

- 只做**采集和结构化**，不做分析、排序、推荐
- 输出是 JSON 文件，不直接写飞书 Base（v0.2 加 `--push-base` 可选）
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

# 指定地区
trend-fetch google-trends --geo GB
```

Pinterest 未登录公开页可能只返回预览条目；如果要采集完整列表，可把已登录浏览器 profile 路径放到 `PINTEREST_TRENDS_PROFILE`，runner 会用该 profile 打开 Trends 页面。

## 输出

结构化 JSON 存储在 `<workspace>/outputs/trend-radar/`，详见 [`references/output-schema.md`](references/output-schema.md)。

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

添加新数据源：见 [`references/source-guide.md`](references/source-guide.md)。
