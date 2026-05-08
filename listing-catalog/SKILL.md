---
name: listing-catalog
description: 维护 Etsy 商品目录（飞书 Base）+ 撰写 listing 文案。三种触发：(1) "建商品库 / 商品目录 / listing 表 / SKU 表"——建 Base；(2) "写 listing / 上新文案 / Etsy SEO / 产品描述"——按 BRAND.md 语调 + Etsy SEO 写文案；(3) "改 SKU / 调价 / 调库存"——读写 Base。
---

# 商品目录 (Listing Catalog)

这个 skill 维护 Etsy 商品目录（结构化数据 → 飞书 Base）+ 撰写 Etsy listing 文案。

**对外的实操接口**：飞书 Base（用 `lark-base` skill 操作）+ 工作区根目录的 BRAND.md / SHOP.md（用 `shop-foundation` skill 维护）。

> 「工作区根」指 `etsy-stack workspace` 解析出的绝对路径——见 shop-foundation §工作区路径解析。本 skill 读写 BRAND.md / SHOP.md 之前必须先调一次该命令；解析失败按 shop-foundation 的指引停下问用户，不要猜路径。

---

## 启动检查（每次激活）

开始向用户输出之前，**静默**执行一次：

```
bash ~/.local/share/etsy-skills/scripts/check-update.sh
```

脚本自带 24h 缓存，重复调用没成本。如果它打印了一行 `💡 …` 提示，把它**原样**附在你最终回复的最后一行；没输出就当无事发生。**不要**解读、不要展开、不要主动建议立刻升级。

如果脚本不存在（用户没装 stack 或自己挪了位置），跳过这一步，不要报错。

---

## 依赖关系（写 listing 前必读）

任何 listing 文案写作都必须参考以下文件（按存在性读取）：

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` | 文案语调 / 视觉原则 / 品牌定位 | 标题、描述、标签的语气与措辞——"应该说"、"避免说"、"原则"段都要遵守 |
| `<workspace>/SHOP.md` | 处理时间 / 运输方式 / 退换货 / 定制政策 | 描述末尾的政策段引用 SHOP.md 原文，不要自行编造 |
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
1. 按 `references/input-checklist.md` 盘点用户已给的输入；**缺必填项一次性问全**，不要边写边追问。**预期售价**与**礼物倾向**是必填——前者决定 step 5.5 客单价档，后者决定 step 5.5 是走完整问还是 Q2-Q5 全跳过
2. 确认目标 SKU（如果是新品，先在 Base 里建一行记录基础信息；如果是改既有 listing，用 lark-base 查现有行）
3. 读 BRAND.md（语调 / 定位 / 视觉关键词作为 SEO 词库的源头）+ SHOP.md（政策段 + 礼盒服务字段）
4. 读 `references/etsy-seo.md`：理解 Etsy 标题 / 标签 / 描述 / materials / category 的 SEO 规则
5. **(可选) eRank 预调研** — 任一命中即主动提示用户去 eRank 调研：① 用户提到有 eRank 账号；② 新品类首品；③ 主推 SKU；④ 单价 ≥ $50；⑤ 用户主动要求"调研 / 看竞品 / 做 SEO"。命中 → 读 `references/erank-research.md`，按节点 ② 向用户发问。低价值 SKU（重复款 / 变体 / 低价位）或用户跳过 → 直接进 step 5.5（沿用 step 1 的"可选项缺失不必停下"规则）
5.5. **(强制) 礼物场景调研** — 读 `references/gift-scenario.md`，按客单价档运行：
   - **< $20**：走轻问法，只问 Q1（礼物倾向）；其余自动从 holiday-calendar.md 命中节日生成 3 个纯节日词
   - **$20-$50**：完整 5 问（Q1 礼物倾向 / Q2 受众类型 / Q3 场景 / Q4 节日时机 / Q5 受众画像）；Q1=自购为主时 Q2-Q5 跳过
   - **≥ $50**：完整 5 问 + 生成长尾语义短语（仅供 title / description 段 3，不进 tag）
   - 跑完后产出 4 类礼物词库（受众词 / 场景词 / 节日词 / 包装服务词）+ BRAND.md 三条硬过滤后的「过滤掉的候选词」清单
6. 读 `assets/listing-template.md`：标准 listing 文案结构
7. 输出草稿：title + description（含分段）+ tags（13 个槽，按客单价档礼物槽数 3/4/3）+ materials（13 个槽）+ category 建议
   - 13 tag 严格守恒，礼物槽数与客单价档对应；其余非礼物槽如有 eRank 词库优先用，否则按 etsy-seo.md 规则 LLM 填
   - title 公式 `[核心品类词] + [核心修饰词] + [礼物维度] + [次要属性] + [情感词]`，礼物维度槽优先级：节日词 > 受众词 > 场景词；自购为主 SKU 留空
   - description 段 3 双小段（使用语境 + 礼物语境，按 etsy-seo.md § Description）
   - 如果跑了 eRank 节点 ③，title 词序参考竞品模式
8. **整篇展示**给用户，等用户确认或调整。同时展示「过滤掉的候选词」清单，方便用户判断是否要纠正 BRAND.md
9. 用户确认后：
   - 把文案写入 Base 该 SKU 对应行（通过 lark-base 更新）
   - 提醒用户去 Etsy 后台贴上线
   - 如果跑了 eRank 节点 ⑤ 之前的环节，顺带提醒用户去 eRank 做定价对标（节点 ⑤）
   - 不要替用户上 Etsy（Etsy 后台操作不在本 skill 范围）
10. **(可选) 反向触发图像产出** — listing 文案写入 Base 后，如果该 SKU 还没有 `商品/{SKU}_shoot-brief.md`，且也没成品图：
    - 提示用户："文案定了，刚生成的 4 类礼物词库 + Mood 新鲜可用。下一步图怎么办？① 出 shoot brief 去拍（assets-library 模式 D）② 不拍直接 AI 合成（image-synth 模式 A）③ 都跳过（之后再说）"
    - **选 ①** → invoke `assets-library` 进入模式 D，**调用方现传** 4 类礼物词库（受众 / 场景 / 节日 / 包装）+ description 段 3 in-memory，让模式 D 直接用，不走 Base 反推。assets-library 模式 D step 11 还会再追问"要不要直接 AI 合成"，用户可在那里继续接 image-synth
    - **选 ②** → invoke `image-synth` 进入模式 A，**调用方现传** 4 类礼物词库 + description 段 3 + 商品 Base 该 SKU 行 in-memory；目标槽位由 image-synth 在盘点输入时跟用户对齐；不预先建 brief 文件
    - **选 ③** → 静默跳过（不阻塞）；用户后续主动 invoke 任一下游 skill 都能正常工作
    - 节奏：本步是 step 9 完成后**同一 turn 内** agent 主动追问的可选环节，不是 step 9 的子步骤；用户回应后才 invoke 下一个 skill

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
