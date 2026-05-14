# Hermes 每周 Cron

目标：每周自动跑一次 `trend-radar`，输出仍落在 Etsy 工作区，不发布内容。

## 推荐频率

```text
每周一次
市场：US
关键词：Chinese
窗口：7d + 30d
```

具体 cron 表达式按 Hermes UI / 配置格式填写。建议选择美国时间周一早上，方便看上一周趋势。

## 必需环境

Hermes cron 环境需要能访问：

```text
ETSY_WORKSPACE=/absolute/path/to/etsy-workspace
SERPAPI_KEY=...
```

`SERPAPI_KEY` 仅用于 Google Trends 浏览器自动化失败时兜底。不要写进 repo、报告或 JSON。

## 登录态

Exolyt 需要已登录浏览器 profile。cron 运行前确认：

1. Hermes 使用的浏览器 profile 已登录 Exolyt。
2. Exolyt 账号权限至少能查看 `#chinese` 的 related hashtags 或趋势页。
3. 如果登录态失效，cron 本次报告应写 `source_failures`，不要尝试处理账号密码。

## Cron 输出

配置 cron 时，必须先让用户确认以下固定写入范围。确认后，每周运行可以直接追加新的时间戳文件，不需要每次再等人工确认。

每次 cron 生成：

```text
<workspace>/trend-radar/reports/YYYY-MM-DD.md
<workspace>/trend-radar/data/YYYY-MM-DD.json
<workspace>/trend-radar/raw/...
```

cron 优先调用统一入口：

```bash
cd /path/to/etsy-skills
scripts/trend-radar-run --workspace "$ETSY_WORKSPACE"
```

首次配置 Exolyt 登录态时，用：

```bash
scripts/trend-radar-run --workspace "$ETSY_WORKSPACE" --headed-exolyt
```

底层采集命令（通常不需要直接调用）：

```bash
node trend-radar/scripts/browser-google-trends.mjs \
  --keyword Chinese \
  --geo US \
  --out-dir "$ETSY_WORKSPACE/trend-radar/raw/google-trends/$(date +%F)" \
  --profile-dir "$ETSY_WORKSPACE/.cache/trend-radar/google-profile"

node trend-radar/scripts/browser-exolyt.mjs \
  --keyword Chinese \
  --out-dir "$ETSY_WORKSPACE/trend-radar/raw/exolyt/$(date +%F)" \
  --profile-dir "$ETSY_WORKSPACE/.cache/trend-radar/exolyt-profile"
```

如果同一天已存在文件，追加运行序号：

```text
YYYY-MM-DD-02.md
YYYY-MM-DD-02.json
```

## 失败策略

| 失败源 | 处理 |
|---|---|
| Google Trends 浏览器失败 | 用 SerpApi fallback |
| SerpApi 也失败 | 只保留 Exolyt 结果，记录 source_failures |
| Exolyt 未登录 | 只保留 Google 结果，记录 source_failures |
| 两个主源都失败 | 生成失败报告，不输出候选 |

cron 不重试超过一次，避免触发风控或浪费 API 成本。
