---
name: listing-catalog
description: 维护 Etsy 商品目录（飞书 Base）+ 撰写 listing 文案。三种触发：(1) "建商品库 / 商品目录 / listing 表 / SKU 表"——建 Base；(2) "写 listing / 上新文案 / Etsy SEO / 产品描述"——按 BRAND.md 语调 + Etsy SEO 写文案；(3) "改 SKU / 调价 / 调库存"——读写 Base。
---

# 商品目录 (Listing Catalog)

这个 skill 维护 Etsy 商品目录（结构化数据 → 飞书 Base）+ 撰写 Etsy listing 文案。

**对外的实操接口**：飞书 Base（用 `lark-base` skill 操作）+ 项目根目录的 BRAND.md / SHOP.md（用 `shop-foundation` skill 维护）。

---

## 依赖关系（写 listing 前必读）

任何 listing 文案写作都必须参考以下文件（按存在性读取）：

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `./BRAND.md` | 文案语调 / 视觉原则 / 品牌定位 | 标题、描述、标签的语气与措辞——"应该说"、"避免说"、"原则"段都要遵守 |
| `./SHOP.md` | 处理时间 / 运输方式 / 退换货 / 定制政策 | 描述末尾的政策段引用 SHOP.md 原文，不要自行编造 |
| 飞书 Base 商品行 | 成本、变体、库存、SEO 关键词 | 写 listing 时先查 SKU 行；写完后回写 listing_id、状态、上线日 |

**写 listing 之前**永远先：
1. 读 BRAND.md（如不存在，提示用户先用 shop-foundation 建立——这是品牌一致性的根）
2. 读 SHOP.md（同上）
3. 从 Base 取该 SKU 的字段（用 lark-base 查询）

如果 BRAND.md / SHOP.md 缺失，在写 listing 前主动提示用户："在写文案之前，建议先建立 BRAND.md 和 SHOP.md。否则文案的语调和政策口径会缺乏锚点。要先建吗？"

---

## 三种执行模式

### 模式 A：建库（首次建立商品 Base）

**进入条件**：
- 用户明确说要建商品库 / 商品目录 / listing 表
- 项目下尚无对应的飞书 Base
- 或已有 Base 但 schema 不齐，要补字段

**执行步骤**：
1. 读 `references/base-schema.md`，了解推荐字段集
2. 用 lark-base skill 创建 Base 和"商品" 表
3. 按 schema 逐字段配置（核心字段必建，辅助字段视用户需要）
4. 落盘后告诉用户 Base 链接 + 字段清单 + 可选的下一步（"导入第一条 SKU 试试")

> **不要硬塞所有字段**——先建核心 8-10 个，让用户用着；后续按需补字段比一开始全建更稳。

### 模式 B：写 listing 文案

**进入条件**：
- 用户要写新 listing 文案 / 上新 / 重写某条 listing 的 title 或 description / 调整 tags

**执行步骤**：
1. 按 `references/input-checklist.md` 盘点用户已给的输入；**缺必填项一次性问全**，不要边写边追问
2. 确认目标 SKU（如果是新品，先在 Base 里建一行记录基础信息；如果是改既有 listing，用 lark-base 查现有行）
3. 读 BRAND.md（语调 / 定位 / 视觉关键词作为 SEO 词库的源头）+ SHOP.md（政策段）
4. 读 `references/etsy-seo.md`：理解 Etsy 标题 / 标签 / 描述 / materials / category 的 SEO 规则
5. 读 `assets/listing-template.md`：标准 listing 文案结构
6. 输出草稿：title + description（含分段）+ tags（13 个槽）+ materials（13 个槽）+ category 建议
7. **整篇展示**给用户，等用户确认或调整
8. 用户确认后：
   - 把文案写入 Base 该 SKU 对应行（通过 lark-base 更新）
   - 提醒用户去 Etsy 后台贴上线
   - 不要替用户上 Etsy（Etsy 后台操作不在本 skill 范围）

### 模式 C：查询 / 更新现有商品

**进入条件**：
- 用户要看 / 改某 SKU 的字段（价格、库存、状态、变体、SEO 关键词等）
- 或要批量查询（"哪些 SKU 缺货"、"哪些是上新预备")

**执行步骤**：
直接调用 `lark-base` skill 操作。本 skill 不重复实现 Base CRUD，只在以下场景介入：
- 字段语义不清时引用 `references/base-schema.md`
- 需要按品牌一致性校验改动（如改标题/描述）时，按"模式 B"流程跑

---

## 写入前的硬性约束

通用协议见 shop-foundation §写入前的硬性约束。本 skill 特有禁区：

- **不替用户上 Etsy**：只产文案 + 维护 Base；上 Etsy 是用户在后台手动复制（涉及登录态、平台合规）
- **新增 SKU 不要自动估价**：成本 / 售价让用户确认；可基于 Base 历史给"参考区间"，但不替用户拍板
- **改 Base 用 lark-base 的 diff 风格预览** → 等确认 → 落盘

---

## 与 shop-foundation 的回流关系

写 listing 过程中如果用户**纠正**了文案，且纠正反映品牌偏好（"这文案太冷了"），不要自己改——按 shop-foundation 的沉淀流程（`references/distillation-brand.md`）提示用户：

> 「这次的纠正背后好像是一条文案语调原则。你想沉淀进 BRAND.md 吗？沉淀完我用新原则重写这条 listing。」

让纠正流回 BRAND.md，下次所有 listing 都受益。

---

## 工作语言

通用规则见 shop-foundation §工作语言。本 skill 特有：listing 文案输出（title / description / tags / materials / category）为**英文**（Etsy 海外平台）；Base 字段标签中英混用（schema 文件里给规范）。
