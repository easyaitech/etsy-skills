# 输出落盘约定

> SKILL.md step 9 / 10 引用本文档。生成的图先落本地 `.cache/`，**不**直接进飞书云空间——飞书云空间是 assets-library 的辖区。
>
> 与 pinterest-autopin runtime 落 `<workspace>/.cache/pinterest-autopin/runtime/` 同构：按工作区隔离 + 跟着工作区一起迁移。

---

## 目录结构

```
<workspace>/.cache/image-synth/
├── ai_raw/                                ← 待用户决定的生成图（步骤 9 落盘点）
│   └── {YYYY-MM-DD}/                      ← 按日期分桶（防止单目录膨胀）
│       ├── {标签ID}_{SKU}_{seq}.png       ← 主候选（QA 通过 / 用户选"留 ai_raw"）
│       ├── {标签ID}_{SKU}_{seq}.json      ← sidecar 元数据（同名 .json）
│       ├── {标签ID}_{SKU}_{seq}_attempt-1.png  ← QA 重试候选（仅 QA 失败 3 轮停下时存在）
│       └── ...
├── promoted/                              ← 用户选"入库"且 assets-library promote 成功后从 ai_raw/ 移入；7 天回滚窗口
│   └── {YYYY-MM-DD}/...
└── retired/                               ← 用户选"丢弃"时从 ai_raw/ 移入（非真删，7 天回滚窗口）
    └── {YYYY-MM-DD}/...
```

> `promoted/` 和 `retired/` 都不自动清——给用户 7 天回滚窗口；后续清理由用户决策。工作区是 git 仓库时记得 `.cache/` 进 `.gitignore`（README.md 已说）。

---

## 文件命名

```
{标签ID}_{SKU}_{seq}.png
```

- `{标签ID}`：模式 A 用 Etsy 槽位 ID（取值见 [`assets-library/references/etsy-listing-photo-slots.md § 3`](../../assets-library/references/etsy-listing-photo-slots.md#3-槽位-id-与素材索引-base-用途标签-字段对齐)）；模式 B 用渠道值（取值见 [`assets-library/references/asset-index-base-schema.md` § 用途标签](../../assets-library/references/asset-index-base-schema.md) 渠道段，如 `Pinterest` / `Instagram Posts` / `Instagram Reels` / 等）。**直接用词汇表原值**（含中文 / 空格也无所谓——本地 fs 都接受），不做小写化转写。
- `{SKU}`：商品 Base SKU；用户没指定 SKU（如做品牌物料图）用 `general`
- `{seq}`：当日同标签 + 同 SKU 的序号，从 `001` 开始

例：
- `hero_TEACUP-001_001.png`（模式 A）
- `Pinterest_TEACUP-001_001.png`（模式 B）

### QA 重试候选

QA 自动重试每轮生成一张图。**只有 3 轮全失败、停下让用户挑**时，三张候选都保留，加 `_attempt-N` 后缀供用户挑选：

```
hero_TEACUP-001_001_attempt-1.png
hero_TEACUP-001_001_attempt-2.png
hero_TEACUP-001_001_attempt-3.png
```

QA 一次性通过时不存 attempt 文件，直接落正式名。用户从 attempts 中选某一张留 `.cache/` 时：选中的改回正式名（去掉 `_attempt-N`），其余移到 `retired/`。

---

## sidecar `.json`

每张生成图必有同名 sidecar，用于追溯 + 重生 + 入库时透传给 assets-library。

### Schema

```json
{
  "version": 1,
  "generated_at": "2026-05-08T14:32:08+08:00",
  "mode": "A",
  "label_id": "hero",
  "sku": "TEACUP-001",
  "seq": 1,

  "input": {
    "brief_source": "shoot-brief-md | reverse-trigger-in-memory | user-verbal",
    "brief_path": "<workspace>/素材库/商品/TEACUP-001_shoot-brief.md",
    "reference_images": ["/path/to/raw/IMG_1234.JPG"]
  },

  "vocabulary": {
    "anchor": { "subject": "...", "material": "...", "color": "...", "proportion": "...", "logo": "...", "texture": "..." },
    "shot_spec": { "angle": "...", "background": "...", "subject_placement": "..." },
    "mood": { "整体气质": "...", "光线": "...", "配色": "...", "道具白名单": ["..."], "后期方向": "..." },
    "negative": ["no plastic appearance", "no industrial cold lighting", "..."],
    "format": { "aspect_ratio": "4:3", "resolution": "2700x2025" }
  },

  "final_prompt": "Product: ... \n\nNegative: ...",

  "qa": {
    "attempts": 1,
    "result": "PASS",
    "checks": [
      { "name": "商品形态保持", "result": "PASS" },
      { "name": "文字可读性", "result": "SKIPPED", "reason": "no text in image" },
      { "name": "视觉禁区扫描", "result": "PASS" },
      { "name": "hero 主图规范", "result": "PASS" }
    ]
  },

  "user_decision": "promoted | kept-in-cache | discarded",
  "promoted_to": "https://飞书云空间/.../商品/TEACUP-001_AI-hero_001.png",
  "promoted_at": "2026-05-08T14:35:12+08:00"
}
```

### 字段说明

- **生成时填**：`version` / `generated_at` / `mode` / `label_id` / `sku` / `seq` / `input` / `vocabulary` / `final_prompt` / `qa`
- **三选一时回填**：`user_decision`；选"入库"时同步填 `promoted_to` + `promoted_at`
- **键名英文 camelCase**；值视情况——`vocabulary.mood` 内部保留中文键名（与 BRAND.md / shoot-brief.md 字段对齐，避免无谓中英映射）。其余顶层字段全英文

---

## promote 入库时的字段透传

用户三选一选"入库"时，本 skill 调 `assets-library` 模式 B2 promote 流程，**现传** sidecar `.json` 内容 + 派生的 promote 参数：

| 派生字段 | assets-library 用法 |
|---|---|
| `input.reference_images[]` | 关联实拍图（B2 promote 时可选填进 Base 备注作"参考原片"）|
| `label_id` | 素材索引 Base **用途标签**字段值——直接对应（hero / Pinterest / 等，源自 schema 词汇表）|
| `sku` | **关联 SKU** 字段 |
| `final_prompt`（截前 200 字符）| 素材索引 Base **备注**字段以 `[AI 合成] {prompt 摘要}` 前缀写入 |
| `mode` + `label_id` | 模式 A 电商 / listing 图上传到 `商品/`；模式 B 社媒 / 营销图上传到 `营销/`。按 assets-library 命名公式命名 |

---

## 入库 / 丢弃后的本地副本

| 用户决定 | `.cache/.../ai_raw/{date}/` 本地文件去向 |
|---|---|
| **入库** + assets-library promote 成功 | 移到 `.cache/image-synth/promoted/{date}/`（图 + sidecar 同迁），给 7 天回滚窗口 |
| **入库** 但 promote 失败 | 留在 `ai_raw/` 等用户决定下一步（重试 / 改入库目录 / 丢弃）|
| **留 ai_raw** | 留在 `ai_raw/`，不入索引 |
| **丢弃** | 移到 `.cache/image-synth/retired/{date}/`（非真删，7 天回滚窗口）|

`promoted/` 和 `retired/` 都由用户人工清理——本 skill 不自动清。
