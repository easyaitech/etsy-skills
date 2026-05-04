# 文件命名约定

> 一致命名是资产库的根本秩序。每次归档新素材都按这套规则走，不要随手起名。

## 总原则

1. **英文 + 数字 + 短横线 / 下划线**——避免中文（飞书路径里中文不稳定，跨平台传递易乱码）
2. **日期开头**用 `YYYY-MM-DD` 格式（不要 `2026.5.5` 或 `20260505`）——按字母排序自然按时间排
3. **小写为主**，专有名词（SKU 编号、品牌缩写）保持其惯例（SKU 全大写）
4. **不要空格**——用 `-` 连接词

## 各类素材命名公式

### 摄影原图（raw/）

```
{YYYY-MM-DD}_{SKU}_{shot-context}_{seq}.{ext}
```

例：
```
2026-05-05_TEACUP-001_morning-light_001.jpg
2026-05-05_TEACUP-001_morning-light_002.jpg
2026-05-05_POT-007_studio_001.jpg
```

字段含义：
- `YYYY-MM-DD`：拍摄日期
- `SKU`：商品编号（与商品 Base 主键一致）
- `shot-context`：拍摄情境短语（`morning-light` / `studio` / `outdoor` / `top-down` 等）—— 让你扫一眼文件名就知道是什么类型的图
- `seq`：序号 `001` `002` `003`...（同一拍摄情境下的连号）

### 摄影成图（edited/）

```
{SKU}_{usage}_{seq}.{ext}
```

例：
```
TEACUP-001_listing-cover_01.jpg     ← Etsy 主图
TEACUP-001_listing-detail_01.jpg    ← Etsy 详情图
TEACUP-001_listing-detail_02.jpg
TEACUP-001_social-square_01.jpg     ← 社媒方图
```

字段含义：
- `usage`：用途（`listing-cover` / `listing-detail` / `social-square` / `social-portrait` / `banner` 等）
- 不带日期——成图是"当前最新版"；如果重做，旧版进 `edited/_archive/` 保留可追溯性

### 场景图（scene/）

```
{SKU}_scene_{location}_{seq}.{ext}
```

例：
```
TEACUP-001_scene_kitchen-window_01.jpg
TEACUP-001_scene_handheld_01.jpg
```

### 视频（视频/）

视频文件命名加两个特有字段：**比例**（9x16 / 1x1 / 16x9）+ **时长**（秒）。

母版（`edited/`，未压缩、最高画质）：

```
{YYYY-MM-DD}_{SKU-or-batch}_{purpose}_master.{ext}
```

派生平台版本（如归档到 `8. 发布物/{平台}/`）：

```
{YYYY-MM-DD}_{SKU-or-batch}_{purpose}_{platform}_{aspect}_{duration}s_v{NN}.{ext}
```

例：
```
2026-05-05_TEACUP-001_unboxing_master.mp4              ← 母版
2026-05-05_TEACUP-001_unboxing_reels_9x16_30s_v01.mp4  ← Instagram Reels 版
2026-05-05_TEACUP-001_unboxing_pinterest_1x1_15s_v01.mp4
```

附属物（BGM、字幕 SRT、封面图）放视频同目录的 `_assets/` 子文件夹，命名锚定主视频文件名。

### 视觉模板（视觉模板/）

```
{template-purpose}_{variant}.{ext}
```

例：
```
listing-cover_minimal-white.psd
listing-cover_natural-textured.psd
shop-banner_2026-spring.psd
social_square_quote-frame.psd
```

模板文件名重点是**用途 + 变体**——日期不重要，因为模板是长期复用的。

### Logo & 品牌标识

```
logo_{variant}_{format}.{ext}
```

例：
```
logo_primary_transparent.png
logo_primary_white.png
logo_monochrome_black.svg
logo_horizontal_color.svg
```

### 受限 / 定制素材

按订单号归档，命名同摄影原图但加 `customer-` 前缀：

```
customer-ORDER-2026-001_reference_01.jpg
customer-ORDER-2026-001_reference_02.jpg
```

> ⚠️ 客户提供的素材有版权 / 隐私问题，**只在受限目录使用**，不要复制到公开摄影目录。

## 不该出现的命名

- ❌ `IMG_3847.JPG`（相机原始名 — 没有任何信息量，归档前一定要重命名）
- ❌ `茶杯-成图-最终版-真的最终版.jpg`（中文 + "最终版" 这种不可信形容词）
- ❌ `tea cup nice photo.jpg`（空格 + 主观词）
- ❌ `final-v3.psd`（没有 SKU / 用途上下文，找不回来）
- ❌ 全大写文件名（除 SKU 外）

## 改名时机

**归档时必须改名**——不要"先放着回头改"，回头永远不会改。如果用户上传的是相机原始名，让 Agent 给改名建议，**用户确认后**用 lark-drive 改。

## 多变体处理

同一 SKU 拍多组不同情境（早晨 / 棚拍 / 手持），用 `shot-context` 字段区分。**不要建一堆子目录**（`raw/morning-light/` `raw/studio/`...）——子目录爆炸比文件名爆炸难维护。

## 与素材索引 Base 的关联

文件名是物理层的"短标识"，[素材索引 Base](asset-index-base-schema.md) 是语义层。归档时两层都要写：物理文件按上面的命名公式起名落盘，Base 一行的"文件名"字段填同一个文件名，"文件链接"字段填飞书云空间链接，再补素材类型 / 关联 SKU / 用途等多维标签。

商品 Base 与素材的关联走 Base 关联字段（详见 [asset-types.md § 与 listing-catalog 的协作](asset-types.md#与-listing-catalog-的协作)），不在文件层维护。
