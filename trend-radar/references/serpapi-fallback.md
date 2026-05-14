# SerpApi Google Trends Fallback

SerpApi 只在 Google Trends 浏览器自动化失败时使用。不要把 SerpApi key 写入仓库或工作区文件。

## 环境变量

Hermes 或本地 shell 里设置：

```bash
export SERPAPI_KEY="..."
```

本仓不保存真实 key。

## 调用范围

只调用 Google Trends：

```text
engine=google_trends
q=Chinese
geo=US
date=now 7-d / today 1-m
data_type=RELATED_QUERIES 或 RELATED_TOPICS
```

## 脚本

可使用本 skill 自带脚本：

```bash
python3 trend-radar/scripts/fetch-serpapi-google-trends.py \
  --keyword Chinese \
  --geo US \
  --date "now 7-d" \
  --data-type RELATED_QUERIES \
  --out "$WORKSPACE/trend-radar/raw/google-trends/YYYY-MM-DD-7d-related-queries.json"
```

同一日期窗口建议拉四份：

```text
7d RELATED_QUERIES
7d RELATED_TOPICS
30d RELATED_QUERIES
30d RELATED_TOPICS
```

## 记录规则

- `source` 写 `serpapi_google_trends`。
- `raw_path` 写 JSON 文件路径。
- SerpApi 返回的 `Breakout`、百分比、rank 原样保留，不自行换算。
- 如果浏览器自动化成功，不需要额外调用 SerpApi，避免成本浪费。
