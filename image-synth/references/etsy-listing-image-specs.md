# Etsy listing 成图规范

> SKILL.md 模式 A + qa-gates.md Check 4（hero 特检）引用本文档。
>
> 与 [`assets-library/references/etsy-listing-photo-slots.md`](../../assets-library/references/etsy-listing-photo-slots.md) 分工：slots.md 讲**构图语义**（10 槽位的拍法 / 道具 / 模特 / 常见错误）；本文档只讲**成图硬规则**（Etsy 平台参数 / 主图特殊要求 / 长宽比与分辨率阈值）。

---

## Etsy 平台硬规则（所有 listing 图片通用）

| 维度 | 规则 |
|---|---|
| 文件大小 | ≤ 5 MB（超出 Etsy 后台拒收）|
| 推荐尺寸 | **2700 × 2025**（4:3）|
| 最大尺寸 | 3000 × 2250 |
| 最小尺寸 | 不低于 **1000 × 750**（更小 thumbnail 模糊）|
| 格式 | JPG / PNG / GIF（PNG 透明背景被 Etsy 自动加白底）|
| 数量 | 上限 10 张图 + 1 段视频 |
| 颜色空间 | sRGB（CMYK 被 Etsy 转换会偏色）|

**Etsy 政策禁区**（所有 listing 图都不能含）：

- ❌ 水印 / 网站 URL 叠层（违反 Etsy 政策）
- ❌ 价格标签（含 "$X"、"50% OFF"）
- ❌ 库存图（stock photo / 网络抓图——违反原创精神）
- ❌ 直接含品牌 Logo 的修图（除非是自家品牌 Logo 已烙在产品上）
- ❌ 未授权的客户人脸（GDPR / 肖像权）
- ❌ 与商品无关的元素（如其他平台的水印、不同 SKU 的图）

> 这些禁区在 image-synth 的 negative prompt 通用兜底段已强制加入（见 [prompt-vocabulary.md § negative 通用兜底](prompt-vocabulary.md#通用兜底始终加)）。

---

## hero 槽位（主图）特殊硬规则

主图是 listing 唯一一张会出现在 Etsy 搜索结果 + 类目列表 + 收藏夹 thumbnail 的图。规范远比其他槽位严格。

| 维度 | 硬规则 | 失败影响 |
|---|---|---|
| 长宽比 | **≥ 4:3**（横构图）；竖图被搜索结果裁切上下 | 搜索缩略图主体被裁，转化塌方 |
| 主体居中 | 主体几何中心偏离画面中心 ≤ 10% 宽高 | 搜索缩略图自动裁切（接近正方形）会切掉边缘主体 |
| 背景 | 接近白底（HSV 中 V > 90% 且 S < 10%）；纯白 / 米白 / 浅灰均可 | 杂乱背景在缩略图下显得 thumbnail 拥挤、点击率下降 |
| 主体占比 | 30% – 70% 画面（不能太小看不清，也不能撑满无留白）| 太小：缩略图不识别；太满：详情页打开像 zoom-in，违和 |
| 文字叠层 | **不允许**（除非品牌 Logo 烙在产品上）| 违反 Etsy 政策 + 缩略图文字读不清 |
| 阴影 | 允许产品柔和投影（subtle product shadow），但不允许大面积装饰性阴影 | 大阴影像 Photoshop 痕迹，破坏专业感 |

**hero 与其他槽位的关键差别**：hero 是"卖商品"，其他槽位是"补充信息"——所以 hero 必须最干净、最直接、最像产品摄影目录页。

> Check 4 hero 槽位特检（[qa-gates.md § Check 4](qa-gates.md#check-4--hero-槽位特检仅-hero)）按本表的 4 项主条目（长宽比 / 主体居中 / 背景 / 无水印）做硬验。

---

## 其他槽位的成图硬规则

各槽位的输出硬规则（长宽比 / 分辨率下限）速查表。**构图语义 / 道具 / 模特 / 物料 / 取材**等规则见 [`etsy-listing-photo-slots.md § 2 — 10 槽位社区语义`](../../assets-library/references/etsy-listing-photo-slots.md#2-10-槽位社区语义)；本文档不重复。

| 槽位 | 长宽比 | 分辨率下限 |
|---|---|---|
| detail（5/6/7）| 1:1 | 2000 × 2000 |
| lifestyle（8）| 4:3 / 3:2 / 1:1 | 2400 × 1800 |
| scale（3）| 1:1 | 2000 × 2000 |
| size-chart（4）| 4:3 | 2400 × 1800 |
| packaging（9）| 1:1 / 4:3 | 2400 × 1800 |
| brand-story（10）| 4:3 | 2400 × 1800 |
| variation（2）| 1:1（网格）| 2400 × 2400 |
| context / comparison | 由用户挑 | 1500 × 1500 |

---

## 与 hero QA 的对接

[qa-gates.md § Check 4](qa-gates.md#check-4--hero-槽位特检仅-hero) 的 4 项硬验，每项对应本文档"hero 槽位特殊硬规则"表的一条：

| QA Check 4 项 | 对应本文档规则 |
|---|---|
| 主体居中 | 主体几何中心偏离 ≤ 10% |
| 背景接近白底 | HSV 中 V > 90% 且 S < 10% |
| 长宽比 ≥ 4:3 | 长宽比 ≥ 4:3 |
| 无水印 | 文字叠层不允许 + 政策禁区 |

QA 不通过时按 qa-gates.md § Check 4 的 prompt 调整规则重生。

---

## 修订历史

| 版本 | 日期 | 改动 |
|---|---|---|
| v1 | 2026-05-07 | 初版：Etsy 平台硬规则 + hero 主图特殊规则 + 6 槽位成图建议 + 与 hero QA 的对接 |
