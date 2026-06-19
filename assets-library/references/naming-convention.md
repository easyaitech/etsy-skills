# 文件命名约定

> 文件夹扁平化后（6 个一级文件夹，无子目录），文件名是在文件夹视图里快速识别素材的**唯一线索**。成品层每次归档都按这套规则走。

## 两阶段命名（重要）

dump（模式 B1）和 promote（模式 B2）对命名的严格度不同：

| 阶段 | 物理位置 | 命名要求 |
|---|---|---|
| **dump（B1）** | `待处理/` | **接受保留相机原始名**（`IMG_3847.JPG` / `DSCF0123.RAF`），不强制改名 |
| **promote（B2）** | `商品/` / `品牌/` / `客户/` / `工作室/` / `营销/` | **强制按公式命名**——成品命名进 Base，影响后续检索与可追溯性 |

## 总原则

1. **英文 + 数字 + 短横线 / 下划线**——避免中文（飞书路径里中文不稳定，跨平台传递易乱码）
2. **日期开头**用 `YYYY-MM-DD` 格式（不要 `2026.5.5` 或 `20260505`）——按字母排序自然按时间排
3. **小写为主**，专有名词（SKU 编号、品牌缩写）保持其惯例（SKU 全大写）
4. **不要空格**——用 `-` 连接词
5. **商品类素材必须包含 SKU 编号**——没有子目录提供上下文后，SKU 是最重要的识别线索

## 各类素材命名公式

### 商品摄影原图（商品/，raw 阶段）

> 已知 SKU 的零散补拍。集中 shoot 的整批原片先进 `待处理/`，保留相机原始名即可。

```
{YYYY-MM-DD}_{SKU}_{shot-context}_{seq}.{ext}
```

例：
```
2026-05-05_TEACUP-001_morning-light_001.jpg
2026-05-05_TEACUP-001_morning-light_002.jpg
```

### 商品摄影成图（商品/，edited 阶段）

```
{SKU}_{usage}_{seq}.{ext}
```

例：
```
TEACUP-001_listing-cover_01.jpg     ← Etsy 主图
TEACUP-001_listing-detail_01.jpg    ← Etsy 详情图
TEACUP-001_listing-lifestyle_01.jpg ← Etsy 场景图
```

### 商品场景图（商品/）

```
{SKU}_scene_{location}_{seq}.{ext}
```

例：
```
TEACUP-001_scene_kitchen-window_01.jpg
TEACUP-001_scene_handheld_01.jpg
```

### 视频（商品/）

母版（最高画质 / 未压缩 / 未加平台字幕）：

```
{YYYY-MM-DD}_{SKU-or-batch}_{purpose}_master.{ext}
```

例：
```
2026-05-05_TEACUP-001_unboxing_master.mp4
```

> 面向 Reels / TikTok / Shorts / Pinterest video pin / 广告投放的派生平台版本，走下方 `营销/` 命名公式。

### 营销素材（营销/）

社媒、广告、邮件、活动页等发布路径版本：

```
{YYYY-MM-DD}_{SKU-or-campaign}_{channel}_{asset-purpose}_{aspect}_v{NN}.{ext}
```

例：
```
2026-05-05_TEACUP-001_pinterest_pin_2x3_v01.jpg
2026-05-05_TEACUP-001_instagram-post_gift-guide_4x5_v01.jpg
2026-05-05_summer-sale_email-banner_16x9_v01.png
2026-05-05_TEACUP-001_reels_process_9x16_30s_v01.mp4
```

> 如果只是产品原始摄影或 Etsy listing 图，仍放 `商品/`。只有已经按社交媒体、广告、邮件、活动页等营销路径加工过的成品 / 母版，才放 `营销/`。

### 品牌素材（品牌/）

Logo：
```
logo_{variant}_{format}.{ext}
```

模板：
```
{template-purpose}_{variant}.{ext}
```

例：
```
logo_primary_transparent.png
logo_monochrome_black.svg
listing-cover_minimal-white.psd
shop-banner_2026-spring.psd
```

### 客户素材（客户/）

```
customer-{ORDER}_{type}_{seq}.{ext}
```

例：
```
customer-ORDER-2026-001_reference_01.jpg
customer-ORDER-2026-001_ugc_01.jpg
```

> 客户素材有版权/隐私问题，归入 `客户/` 文件夹，不要复制到其他文件夹。

### 工作室素材（工作室/）

```
studio_{subject}_{seq}.{ext}
```

例：
```
studio_workshop-overview_01.jpg
studio_making-process_01.jpg
studio_raw-material_01.jpg
```

## 不该出现的命名（指 promote 后的成品，待处理/ 不受此约束）

- ❌ `IMG_3847.JPG`（相机原始名——成品禁用，但 `待处理/` 里接受）
- ❌ `茶杯-成图-最终版-真的最终版.jpg`（中文 + "最终版"不可信形容词）
- ❌ `tea cup nice photo.jpg`（空格 + 主观词）
- ❌ `final-v3.psd`（没有 SKU / 用途上下文）
- ❌ 全大写文件名（除 SKU 外）

## 改名时机

- **dump 到 待处理/**：不改名，保留相机原始名。批量改名收益太低
- **promote 到对应文件夹**：**必须按公式改名**——成品命名进 Base，影响后续可追溯性。如果原片是相机原始名，让 Agent 给改名建议，**用户确认后**用 lark-drive 改名 + 移动

## 多变体处理

同一 SKU 拍多组不同情境（早晨 / 棚拍 / 手持），用 `shot-context` 字段区分。全部放在同一个 `商品/` 文件夹中。

## 与 `Assets 素材池` 表的关联

文件名是物理层的"短标识"，[`Assets 素材池` 表](asset-index-base-schema.md) 是语义层。**dump（B1）不录 Base，promote（B2）才录**：promote 时把成品文件按公式命名 + 移入对应文件夹 + 录入 Base 一行（"文件名" + "文件链接" + 素材类型 / 关联 SKU / 用途等）。
