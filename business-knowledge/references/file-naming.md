# File Naming Rules

workspace 知识库文件名必须稳定、可 grep、跨环境安全。

## 目录结构

```text
<workspace>/knowledge/
  raw/YYYY-WW/
    source-links.md
    notes.md
    screenshots/
  weekly/YYYY-WW.md
  wiki/{topic-slug}.md
  briefs/YYYY-WW/{safe-slug}-marketing-brief.md
```

## Safe slug

文件名只使用 lowercase ASCII slug：

1. 转小写。
2. 空格、下划线、斜杠和连续标点转 `-`。
3. 移除路径危险字符：`/ \ : * ? " < > | # % & { } [ ]`。
4. 移除 emoji 和不可见字符。
5. 连续 `-` 合并为一个。
6. 去掉开头 / 结尾的 `-`。
7. 最长 80 字符；超长截断到词边界。
8. 如果结果为空，用 `{type}-{YYYYMMDD}-{hash6}`，`hash6` 取原始输入的 SHA-1 前 6 位。
9. 如果同一目录下已存在同名文件，在 slug 后追加 `-v2`、`-v3`，不要覆盖旧文件。

保留原始 SKU / 品类 / 标题到 markdown 正文，不要靠文件名保存完整业务信息。

## Examples

| 原始输入 | 文件名 slug |
|---|---|
| `SKU-001` | `sku-001` |
| `Wedding / Garden Bride` | `wedding-garden-bride` |
| `Mother's Day & Personalized Gifts` | `mother-s-day-personalized-gifts` |
| `高客单 定制礼物` | `brief-20260516-a1b2c3`，正文保留原文 |

中文主题 wiki 可用人工给定英文 slug，例如 `婚礼礼物` -> `wedding-gifts.md`。
