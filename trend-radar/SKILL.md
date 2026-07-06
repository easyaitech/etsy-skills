---
name: trend-radar
description: 读取「管理员趋势采集插件」已采集并上收到 ECS trend-radar 服务的各平台热词（Pinterest Trends / eRank Trend Buzz / Google Trends 等），并生成趋势 × 店铺/品牌/商品的 fit report 供人工判断。触发条件：(1) 用户说"看看这周什么热门 / 抓一下趋势"；(2) 用户说"找趋势和现有商品/店铺的结合点"；(3) 定期自动运行（每周一次）；(4) business-knowledge 整理周报时检查 latest.json。
layer: utility-input
---

# Trend Radar（趋势热词分析）

**分层定位**：`trend-radar` 是 **utility / input layer** — 它不属于基座层也不属于应用层，而是为后续营销判断提供自动化外部输入。

**采集已上收，本 skill 不再本机抓取网页**：热词采集由**管理员趋势采集插件**（`admin-trend-extension`，装在运营方浏览器里）用登录态在各平台采集，回传到 ECS 上的 **trend-radar 服务**。本 skill 只做两步：

1. `trend-fetch pull`：从 trend-radar 服务拉取插件已采好的最新各平台热词，落成当天的结构化 per-source JSON。
2. `trend-fetch fit-report`：读取当天所有趋势源 JSON + 店铺/品牌/商品上下文，生成人工确认用的 fit report。

```text
外部网站（Pinterest Trends / eRank Trend Buzz / Google Trends …）
  → 管理员趋势采集插件（运营方登录态浏览器，自动采集+回传）
  → ECS trend-radar 服务（结构化存储 + /latest 提供）
  → trend-fetch pull（拉取到本工作区）
  → outputs/trend-radar/YYYY-MM-DD/*.json
  → trend-fetch fit-report（寻找结合点，不直接执行动作）
  → 客观趋势 / 可审计洞察自动沉淀进 business-knowledge
  → 需要落地执行的行动项交给人工确认
```

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 定位和边界

- pull 模式只做**从服务读取 + 结构化落盘**，不做本机网页抓取、不做分析/排序/推荐
- fit-report 模式只做**趋势 × 业务上下文的结合点判断**，不直接生成 Marketing Brief
- 结构化趋势 JSON / fit report 是第一输出；每周自动任务可以把客观趋势事实和可审计洞察直接写入 business-knowledge / `Knowledge Cards 知识卡片` 表
- 但任何需要落地执行的动作（改 `Products 商品` 表、写 `社媒发布队列` 表、改 Listing、生成素材、发布内容、SEO 调整）都不能自动执行，必须作为建议等待人工确认
- 商品信息通过 `<workspace>/.cache/trend-radar/business-context/product-catalog.json` 读取，不在 Node CLI 里直连飞书 Base
- 下游（business-knowledge）缺失时 SKIP，不阻塞本 skill
- 本 skill 缺失时，下游也 SKIP — 遵循 dependency-protocol
- **采集与登录态的归属**：采集所需的各平台登录态、浏览器自动化、失败重试都在**管理员采集插件**侧（不再是本机 `SERPAPI_KEY` / Playwright profile / CDP）。本 skill 只需要能访问 trend-radar 服务的 `TREND_RADAR_TOKEN`。若 `pull` 报「服务暂无数据」，是采集插件本周还没跑成，不是本 skill 的问题——见下方「排查」。

## 使用方式

```bash
# 从 trend-radar 服务拉取插件已采集的最新各平台热词（默认 US），落成当天 per-source JSON
trend-fetch pull

# 指定地区
trend-fetch pull --geo GB

# 读取当天所有趋势源，生成趋势结合点报告
trend-fetch fit-report

# 指定日期 / 地区 / 最大分析数量
trend-fetch fit-report --date 2026-05-18 --geo US --max-items 50
```

典型每周流程就是先 `trend-fetch pull` 再 `trend-fetch fit-report`。

### 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `TREND_RADAR_TOKEN` | ✅ | 访问 trend-radar 服务的 bearer（与采集插件、周报服务用的是同一个 token） |
| `TREND_RADAR_BASE_URL` | 否 | 服务地址，默认 `https://yanggedianzhang.com/trend-radar`（nginx 只放行该前缀代理到服务） |

### 排查：`pull` 说「服务暂无数据」

说明**管理员趋势采集插件本周还没成功采集**，不是本 skill 的问题：

- 确认插件已加载：运营方那台电脑的 chrome://extensions 里「养个店长管理员趋势采集」已启用，且最近重新加载过。
- 确认三个平台在该浏览器里保持登录（Pinterest / eRank 会员 / Google）。
- 插件每 3 小时、以及每次加载/重启后约 1 分钟会自动补采一次；也可在插件选项页手动点「采集全部待处理任务」。
- 服务端按 7 天新鲜度门控：本周已采过时不会重复采。

## 输出

结构化 JSON 存储在 `<workspace>/outputs/trend-radar/`，详见 [`references/output-schema.md`](references/output-schema.md)。

- `outputs/trend-radar/YYYY-MM-DD/<source>-<GEO>.json`：`pull` 落的各平台热词（fit-report 的输入）
- `outputs/trend-radar/latest.json`：`pull` 落的服务端合并总览（含 revision / runs / 跨平台合并 items），供 business-knowledge 等下游取用

fit report 生成：

```text
<workspace>/outputs/trend-radar/YYYY-MM-DD/fit-report.md
<workspace>/outputs/trend-radar/YYYY-MM-DD/fit-report.json
<workspace>/outputs/trend-radar/latest-fit-report.md
```

完整规则见 [`references/fit-report.md`](references/fit-report.md)。

## 技术栈

- 纯 HTTP（Node 全局 `fetch`）从 trend-radar 服务读取，无浏览器自动化依赖
- TypeScript + tsx 执行
- 独立 package.json（不污染 repo 根目录）

## 数据源

采集由管理员趋势采集插件完成，具体覆盖哪些平台以服务端 `/latest` 返回的 `runs[]` 为准。当前插件采集的平台：

| Source | 说明 |
|--------|------|
| pinterest-trends | Pinterest Trends 通用关键词（`trendsPreset=1`，需 Pinterest 登录态才能拿到完整列表） |
| erank-trend-buzz | eRank Trend Buzz 的 Etsy / Last 30 Days 关键词（需 eRank 会员登录态） |
| google-trends | Google Trends trending now（过去 7 天上升最快；内容偏新闻/体育，对 Etsy 参考价值有限） |

> 想调整采集哪些平台，改的是**管理员采集插件**与 trend-radar 服务的任务配置，不在本 skill。本 skill 会 `pull` 到服务上实际存在的全部平台。
