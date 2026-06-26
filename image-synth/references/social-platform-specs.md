# 社媒平台规范

> SKILL.md 模式 B step 3 引用本文档拿目标平台的尺寸 / 安全区 / 文字规范，填进 shot-spec + format 词库。
>
> 列主流跨境平台 + Pinterest / IG + 小红书。具体平台策略如已写入 MARKETING_PLATFORM.md，以工作区配置优先。

---

## Pinterest pin

| 维度 | 值 |
|---|---|
| 长宽比 | **2:3**（标准 pin）|
| 推荐分辨率 | **1000 × 1500** |
| 最大分辨率 | 2000 × 3000（再大被压缩）|
| 长 pin 上限 | 1:2.1（超过会被截断）|
| 文字密度 | ≤ 30% 画面（Pinterest 不喜欢 text-heavy 图）|
| 安全区 | 顶 / 底 / 左 / 右各留 5% 给 hover UI 不挡 |
| 视觉权重重心 | 上 1/3 是用户首视区——核心信息 / 商品主体放这里 |
| 文字位置建议 | 上 1/3 大字标题，底 1/3 副标题；中间留给商品图 |
| 特殊约束 | 透明背景被自动加白底；底部带 Pinterest 自家叠层（"Save"按钮）所以 ≤ 8% 底部不放关键内容 |

**shot-spec 填法**：
```
Composition: vertical 2:3 portrait, subject in upper-center third with breathing room top and bottom for text overlay zones, clear focal point on product, soft contextual environment around it.
```

**format 填法**：
```
Format: 2:3 aspect ratio, 1000x1500 resolution, photorealistic with poster-style clarity (must read at thumbnail size).
```

---

## Instagram post（feed）

| 维度 | 值 |
|---|---|
| 长宽比 | **1:1**（方图，最稳）/ 4:5（竖图，feed 占地最大）|
| 推荐分辨率 | **1080 × 1080**（方）/ 1080 × 1350（竖 4:5）|
| 文字密度 | ≤ 20%（IG 算法对文字密集图不友好）|
| 安全区 | 整图都安全，但底部 10% 可能被装饰元素遮（如多图轮播指示点）|
| 视觉权重重心 | 中央——IG 用户在 feed 流主要看图心 |
| 特殊约束 | 多图轮播 carousel 第一张是钩子，单独考虑构图；故事性 carousel 走完整叙事弧线（本 skill 当前一次只出 1 张，多图由用户重复触发） |

**shot-spec 填法**：
```
Composition: square 1:1, subject centered, balanced negative space on all four sides, magazine-quality composition.
```

---

## Instagram Story / Reel cover

| 维度 | 值 |
|---|---|
| 长宽比 | **9:16**（全屏竖）|
| 推荐分辨率 | **1080 × 1920** |
| 文字密度 | ≤ 25%（Story 用户停留时间短，要快速读完）|
| 安全区 | **顶 15% + 底 15% 留给 IG UI**（user header / sticker 区）——核心内容必须落在中间 70% 高度 |
| 视觉权重重心 | 中央偏上 1/3 |
| 特殊约束 | 用户用拇指刷，所以最关键钩子（标题 / 主体）必须在前 1 秒看到 = 中央偏上 |

**shot-spec 填法**：
```
Composition: vertical 9:16, subject centered in middle 70% of frame (avoid top 15% and bottom 15% for IG UI overlay zones), bold focal point that reads in under 2 seconds.
```

---

## 小红书图文 / 商品种草图

| 维度 | 值 |
|---|---|
| 长宽比 | **3:4**（竖图优先）/ 1:1（方图备选）|
| 推荐分辨率 | **750 × 1000** 或按商品 preset 使用 800 × 800 |
| 文字密度 | ≤ 25%，商品主体和标题都要在缩略图可读 |
| 安全区 | 顶 / 底 / 左 / 右各留 8%；底部不放关键信息 |
| 视觉权重重心 | 中央偏上；首图承担封面角色 |
| 特殊约束 | 商品型图片同时遵守 `listing-catalog/references/platforms/xiaohongshu.md` 的商品图 / 使用指南图 / 图文详情图规则 |

**shot-spec 填法**：
```
Composition: vertical 3:4 portrait, product centered slightly above middle, clean lifestyle context, cover-like first image with readable Chinese headline area and no important details near edges.
```

**format 填法**：
```
Format: 3:4 aspect ratio, 750x1000 resolution, mobile-first product note cover, sharp readable Chinese text if text overlay is requested.
```

---

## Twitter / X post

| 维度 | 值 |
|---|---|
| 长宽比 | **16:9** |
| 推荐分辨率 | 1600 × 900 |
| 文字密度 | ≤ 20% |
| 安全区 | 整图安全；timeline 默认裁切到 16:9 不变 |
| 视觉权重重心 | 中央 |

---

## Facebook post

| 维度 | 值 |
|---|---|
| 长宽比 | **1.91:1**（OG image 标准）|
| 推荐分辨率 | 1200 × 628 |
| 文字密度 | ≤ 20%（FB 早年 20% rule 已废除，但仍是审美下限）|
| 安全区 | 整图安全 |
| 视觉权重重心 | 中央偏左（西方阅读顺序）|

---

## 节日营销图 / 通用社媒分享 banner（自定义）

用户没有指定具体平台时（如群发 banner / 邮件头图 / 通用分享图）的兜底方案：

| 维度 | 默认值 |
|---|---|
| 长宽比 | 1.91:1（OG / 通用分享标准）|
| 推荐分辨率 | 1200 × 628 |
| 文字密度 | ≤ 30% |
| 安全区 | 整图安全 |

**shot-spec 填法**：跟 Facebook 同。如果有更具体的渠道，回 SKILL.md step 2 反问用户改用具体平台规格。

---

## 自定义尺寸（用户给 W × H）

用户直接给 `1920 × 1080` / `2400 × 800` / 等具体尺寸时，按长宽比挑默认 shot-spec：

| 长宽比 | shot-spec 默认 |
|---|---|
| ≥ 16:9（横）| `subject on left third, breathing space on right` |
| 1:1 | `centered with equal margins` |
| ≤ 9:16（竖）| `subject in vertical center, top and bottom breathing space` |

format 段直接传用户给的 W × H。如果有更具体的渠道，建议反问用户改用具体平台规格。

---

## 跨平台共用规则

无论哪个平台：

- **文字必须 vision 可读**：参考 [qa-gates.md § 文字可读性](qa-gates.md#check-1--文字可读性条件检) — 字号占图最长边 ≥ 3%（建议 ≥ 8%）
- **不要在边缘 5% 范围放关键信息**——任何平台都可能轻微裁切
- **CTA / 标题用对比色**——白底黑字 / 黑底白字 / 品牌主色配高对比辅色（具体配色取自 BRAND.md）
- **避免渐变文字 / 衬线小字**——Pinterest / IG 缩略图下都模糊

---

## 修订历史

| 版本 | 日期 | 改动 |
|---|---|---|
| v1 | 2026-05-07 | 初版：Pinterest / Instagram (post & Story) / Twitter / Facebook + 通用 OG / 自定义尺寸 |
| v2 | 2026-06-16 | 增加小红书图文 / 商品种草图默认规格入口 |
