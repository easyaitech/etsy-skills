---
name: trend-radar
description: 用唯一关键词 "Chinese" 追踪海外趋势升温信号。主数据源为 Google Trends 浏览器自动化 + Exolyt 已登录页面；SerpApi 只作 Google Trends 兜底。支持手动触发和 Hermes 每周 cron，输出落到 Etsy 工作区的 trend-radar/reports 与 trend-radar/data。只发现趋势，不做商品判断、内容生产或发布。
layer: application
---

# Trend Radar

这个 skill 只回答一个问题：

> 围绕唯一关键词 `Chinese`，最近在美国市场有没有正在升温的搜索或 TikTok 趋势？

它不判断能不能卖、不生成内容、不发布，也不扩展手写长尾关键词。长尾词只能来自数据源返回结果。

> 共享引导（版本检查 / 工作区解析 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)。

---

## 固定配置

| 项 | v0 固定值 |
|---|---|
| keyword | `Chinese` |
| Google geo | `US` |
| TikTok geo | `US` |
| Google windows | past 7 days + past 30 days |
| TikTok source | Exolyt 已登录页面 |
| Google fallback | SerpApi Google Trends API |
| 输出位置 | `<workspace>/trend-radar/reports/YYYY-MM-DD.md` + `<workspace>/trend-radar/data/YYYY-MM-DD.json` |

不要主动加入 `Chinese gift`、`Chinese culture`、`Chinese aesthetic` 等长尾种子。它们只能在 Google Trends 或 Exolyt 返回后进入结果。

---

## 前置检查

每次运行前：

1. 读 `../shared/preamble.md` 并解析工作区根。
2. 检查 `<workspace>/trend-radar/` 是否存在；不存在时创建以下目录：
   - `trend-radar/reports/`
   - `trend-radar/data/`
   - `trend-radar/raw/google-trends/`
   - `trend-radar/raw/exolyt/`
3. 不要把 SerpApi key 写入任何文件。需要 fallback 时只读环境变量 `SERPAPI_KEY` 或 Hermes secret store。
4. 如果 Exolyt 页面未登录，停下让用户在浏览器里登录；不要索要密码。

---

## 模式 A：手动跑一次趋势雷达

**触发条件**：
- 用户说"跑 trend-radar"、"查 Chinese 趋势"、"手动跑一次趋势雷达"。

**步骤**：

优先调用仓库统一入口：

```bash
scripts/trend-radar-run
```

这条命令会自动完成：

1. 解析工作区根并创建输出目录。
2. 跑 Google Trends 浏览器采集；失败时用 SerpApi fallback（如果 `SERPAPI_KEY` 存在）。
3. 跑 Exolyt 浏览器采集；如果登录态失效，输出 `login_required`，不伪造数据。
4. 聚合 raw evidence，生成：
   - `<workspace>/trend-radar/reports/YYYY-MM-DD.md`
   - `<workspace>/trend-radar/data/YYYY-MM-DD.json`

需要首次登录 Exolyt 时：

```bash
scripts/trend-radar-run --headed-exolyt
```

需要显式指定工作区时：

```bash
scripts/trend-radar-run --workspace /absolute/path/to/etsy-workspace
```

底层细节见：
- Google Trends：[`references/browser-google-trends.md`](references/browser-google-trends.md)
- Exolyt：[`references/exolyt-flow.md`](references/exolyt-flow.md)
- SerpApi fallback：[`references/serpapi-fallback.md`](references/serpapi-fallback.md)
- 输出 schema：[`references/output-schema.md`](references/output-schema.md)

---

## 模式 B：围绕本周结果复跑 / 追加证据

**触发条件**：
- 用户说"复查上次 trend-radar"、"给某个信号追加证据"、"再验证一下这个趋势"。

**步骤**：

1. 读取最近一份 `<workspace>/trend-radar/data/*.json`。
2. 只对已有 `Rising` 和 `Watch` 项补证据，不新增手写关键词。
3. 如果候选来自 Google，就去 Exolyt 找交叉证据；如果来自 Exolyt，就去 Google Trends 找交叉证据。
4. 更新对应 candidate 的 `verification_status`：
   - `confirmed`：Google + Exolyt 都出现
   - `search_led`：只 Google Trends 出现
   - `social_led`：只 Exolyt 出现
   - `weak`：只有单源、且无明确增长
5. 生成一份新的报告和 JSON，不覆盖旧文件。

---

## 模式 C：配置 Hermes 每周 cron

**触发条件**：
- 用户说"每周自动跑一次"、"配置 Hermes cron"、"定时跑 trend-radar"。

**步骤**：

1. 读 [`references/hermes-cron.md`](references/hermes-cron.md)。
2. 确认 Hermes cron 的环境里有：
   - `ETSY_WORKSPACE`
   - `SERPAPI_KEY`（仅 fallback 用）
   - 已登录 Exolyt 的浏览器 profile 或可访问导出入口
3. 展示 cron 将写入的固定目录：
   - `<workspace>/trend-radar/reports/`
   - `<workspace>/trend-radar/data/`
   - `<workspace>/trend-radar/raw/`
4. 用户确认后，这个确认视为 shared preamble 中的 Hermes cron 输出授权；后续 cron 只能追加新的时间戳文件，不能覆盖旧文件或修改其他业务文件。
5. Hermes cron / AutoCLI 只需要调用：
   ```bash
   scripts/trend-radar-run --workspace "$ETSY_WORKSPACE"
   ```
6. 建议频率：每周一次，美国市场，固定关键词 `Chinese`。
7. cron 输出仍落到工作区，不发内容、不发布到平台。

---

## 信号分档

| 档位 | 条件 |
|---|---|
| Rising | 有明确增长信号，且至少有一个可复核来源 |
| Watch | 有相关信号，但增长弱、证据少或只出现一次 |
| Ignore | 噪音、无增长、与 `Chinese` 语义弱相关、或明显是平台/工具误判 |

交叉验证标签：

| 标签 | 含义 |
|---|---|
| `confirmed` | Google Trends 与 Exolyt 都出现 |
| `search_led` | 只在 Google Trends 出现 |
| `social_led` | 只在 Exolyt 出现 |
| `weak` | 单源弱信号 |

---

## 硬性规则

- 永远只从 `Chinese` 起步。
- 不手写长尾关键词作为搜索种子。
- 不把 TikTok 官方 Creative Center 作为主源。
- 不编造浏览量、增长率或搜索量。
- 没有证据 URL、截图路径、导出文件路径或原始 JSON 的信号不能进 `Rising`。
- `Breakout`、百分比增长、rank、trend score 等值必须原样记录来源，不自行换算。
- IP、影视、游戏、明星、商标相关趋势只记录为 `risk_hint`，不判断可用性。
- 输出必须保留英文原始热词；中文解释只能作为备注。
- 每条 `Rising` 或 `Watch` 至少写一句 `why_it_matters`，说明为什么值得下次复查。

---

## 输出口径

最终回复用户时只说：

1. 报告路径。
2. JSON 路径。
3. 本次 Rising / Watch / Ignore 数量。
4. 如果某个主源失败，说明失败源与 fallback 情况。

不要在本 skill 里继续推荐产品、写社媒内容或调用 `pinterest-autopin`。
