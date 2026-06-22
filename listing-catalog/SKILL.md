---
name: listing-catalog
description: 维护电商商品目录（店铺总 Base 内商品 / SKU 表）+ 按目标销售平台配置撰写商品页 / listing 文案。三种触发：(1) "建商品库 / 商品目录 / listing 表 / SKU 表"——在店铺总 Base 内建表；(2) "写 listing / 上新文案 / 商品标题 / 产品描述 / 平台 SEO / 小红书商品页"——按 BRAND.md 语调 + COMMERCE_PLATFORM.md 平台规则写文案；(3) "改 SKU / 调价 / 调库存"——读写表。Etsy 和小红书是内置平台 preset，其他平台必须先有平台配置。
layer: foundation
---

# 商品目录 (Listing Catalog)

这个 skill 维护电商商品目录（结构化数据 → 店铺总 Base 内商品 / SKU 表）+ 按目标销售平台撰写商品页 / listing 文案。

**对外的实操接口**：店铺总 Base 内的 `Products 商品` 表（用 `lark-base` skill 操作；架构见 `../shared/store-base-architecture.md`）+ 工作区根目录的 BRAND.md / SHOP.md / COMMERCE_PLATFORM.md（用 `shop-foundation` skill 维护）。

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 依赖关系（写 listing 前必读）

任何商品页 / listing 文案写作都必须参考以下文件（按存在性读取）：

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` | 文案语调 / 视觉原则 / 品牌定位 | 标题、描述、标签的语气与措辞——"应该说"、"避免说"、"原则"段都要遵守 |
| `<workspace>/SHOP.md` | 处理时间 / 运输方式 / 退换货 / 定制政策 | 描述或客服相关政策段引用 SHOP.md 原文，不要自行编造 |
| `<workspace>/COMMERCE_PLATFORM.md` | 目标销售平台、买家语言、标题/描述/tag/媒体/订单规则 | 决定输出语言、字段、长度、平台枚举和自动化边界；非 Etsy / 小红书平台缺失时阻塞 |
| 店铺总 Base 的 SKU 行 | 成本、变体、库存、关键词、平台商品 ID、商品级故事 / 分享链接 | 写商品页时先查 `Products 商品` 表（商品级与 SKU 级字段同表）；写完后回写平台商品 ID、状态、上线日 |

**写 listing 之前**永远先：
1. 读 BRAND.md（如不存在，提示用户先用 shop-foundation 建立——这是品牌一致性的根）
2. 读 SHOP.md（同上）
3. 读 COMMERCE_PLATFORM.md（目标平台不是 Etsy / 小红书且缺失时，先停下补配置）
4. 从 Base 取该 SKU 的字段（用 lark-base 查询）

如果 BRAND.md / SHOP.md 缺失，在写商品页前主动提示用户："在写文案之前，建议先建立 BRAND.md 和 SHOP.md。否则文案的语调和政策口径会缺乏锚点。要先建吗？"

如果 COMMERCE_PLATFORM.md 缺失：
- 目标平台是 Etsy → 可继续使用内置 Etsy preset，并说明"这次按内置 Etsy 规则跑；建议后续用 shop-foundation 建 COMMERCE_PLATFORM.md 固化配置"。
- 目标平台是小红书 → 可继续使用内置小红书 preset，并说明"这次按内置小红书规则跑；建议后续用 shop-foundation 建 COMMERCE_PLATFORM.md 固化配置"。
- 目标平台不是 Etsy / 小红书 → 停止并提示用户先建立 COMMERCE_PLATFORM.md。不要把 Etsy 或小红书规则套到淘宝、天猫、抖店、Amazon、Shopify 等平台。

---

## 三种执行模式

### 模式 A：建表（首次建立商品 / SKU 表）

**进入条件**：
- 用户明确说要建商品库 / 商品目录 / listing 表 / SKU 表
- 店铺总 Base 尚未配置 `products`（`Products 商品`，商品 + SKU 合并）表
- 或已有表但 schema 不齐，要补字段

**执行步骤**：
1. 读 `../shared/store-base-architecture.md` 和 `references/base-schema.md`，了解 one-shop-one-base 与推荐字段集
2. 如果目标平台包含小红书，读 `references/xiaohongshu-commerce.md`；创建表时必须加建 `base-schema.md` 的“小红书字段”分组
3. 解析工作区根并读取 `<workspace>/docs/store-base.md`：
   - 若店铺总 Base 已存在：在其中创建或补齐 `Products 商品` 表
   - 若店铺总 Base 不存在：先向用户展示店铺总 Base 方案和表清单，等确认后再创建 `{店铺名}-运营中枢`
   - 迁移期若发现旧独立商品数据源，可作为 legacy fallback 查询，但新写入优先进入店铺总 Base
4. 按 schema 逐字段配置（核心字段必建；小红书字段在启用小红书平台时必建；其他辅助字段视用户需要）
5. `Products 商品` 表必须保留原 SKU 字段作为业务主键；如需要内部稳定 ID，新增 `内部 ID` 字段，不要因迁移重命名 SKU
6. 落盘后告诉用户 Base 链接 + 表清单 + 字段清单 + 可选的下一步（"导入第一条 SKU 试试")

> **不要硬塞无关字段**——通用核心字段必建；启用小红书时，小红书字段分组也必建但可以先为空；其他平台辅助字段后续按需补。

### 模式 B：写商品页 / listing 文案

**进入条件**：
- 用户要写新商品页 / listing 文案 / 上新 / 重写某条商品标题或描述 / 调整 tags 或平台关键词

**执行步骤**：
1. 按 `references/input-checklist.md` 盘点用户已给的输入；**缺必填项一次性问全**，不要边写边追问。**预期售价**建议永远提供（定价语境）。**礼物倾向**是 **Etsy 专属必填**——目标平台（由 COMMERCE_PLATFORM.md 或用户目标确定）是 Etsy 时才收集，决定 step 5.5 是走完整问还是 Q2-Q5 全跳过；**非 Etsy 平台不收集礼物倾向、不跑 step 5.5**。Etsy 下预期售价还兼任 step 5.5 客单价档分流
2. 确认目标 SKU（如果是新品，先在 Base 里建一行记录基础信息；如果是改既有 listing，用 lark-base 查现有行）
3. 确认目标销售平台。读 BRAND.md（语调 / 定位 / 视觉关键词作为关键词源头）+ SHOP.md（政策段 + 礼盒服务字段）+ COMMERCE_PLATFORM.md（平台配置）
4. 按平台选择规则来源：
   - **Etsy**：读 `references/etsy-seo.md`，理解 Etsy 标题 / 标签 / 描述 / materials / category 的 SEO 规则
   - **小红书**：读 `references/xiaohongshu-commerce.md`，理解 SPU / SPL / SPV / ITEM 分层、商品图、描述、特色、属性、FAQ、使用指南、图文详情、条码、重量、原产国、价格、库存、上下架和审核状态字段
   - **其他已配置平台**：只使用 COMMERCE_PLATFORM.md 对应平台章节里的标题、描述、关键词、属性、媒体和合规规则；配置没写的限制视为未知，向用户确认，不自行补全
   - **其他未配置平台**：停止，引导用户先用 `shop-foundation` 建立该平台配置
5. **(可选) eRank 预调研** — 任一命中即主动提示用户去 eRank 调研：① 用户提到有 eRank 账号；② 新品类首品；③ 主推 SKU；④ 单价 ≥ $50；⑤ 用户主动要求"调研 / 看竞品 / 做 SEO"。命中 → 读 `references/erank-research.md`，按节点 ② 向用户发问。低价值 SKU（重复款 / 变体 / 低价位）或用户跳过 → 直接进 step 5.5（沿用 step 1 的"可选项缺失不必停下"规则）
5.5. **(Etsy 专属，Etsy 下强制；非 Etsy 平台整段跳过) 礼物场景调研** — **仅当目标平台是 Etsy 时执行**。礼物 / 节日维度是 Etsy 搜索流量大头、是 Etsy SEO 的输入模块，不套用到小红书或其他平台（小红书走内容种草模型，无礼物 tag 槽位）。注册见 [`../shared/platform-config.md`](../shared/platform-config.md) § 内置平台 preset · Etsy。目标平台是 Etsy 时读 `references/gift-scenario.md`，按客单价档运行：
   - **< $20**：走轻问法，只问 Q1（礼物倾向）；其余自动从 holiday-calendar.md 命中节日生成 3 个纯节日词
   - **$20-$50**：完整 5 问（Q1 礼物倾向 / Q2 受众类型 / Q3 场景 / Q4 节日时机 / Q5 受众画像）；Q1=自购为主时 Q2-Q5 跳过
   - **≥ $50**：完整 5 问 + 生成长尾语义短语（仅供 title / description 段 3，不进 tag）
   - 跑完后产出 4 类礼物词库（受众词 / 场景词 / 节日词 / 包装服务词）+ BRAND.md 三条硬过滤后的「过滤掉的候选词」清单
   - **非 Etsy 平台（小红书及其他已配置平台）**：跳过本环节——不收集礼物倾向、不问 5 问、不产礼物词库、不查 holiday-calendar，直接进 step 5.6
5.6. **(可选) Knowledge Cards 检索** — 读 [`references/business-knowledge-lookup.md`](references/business-knowledge-lookup.md) 和 [`../business-knowledge/references/knowledge-card-lookup.md`](../business-knowledge/references/knowledge-card-lookup.md)，按 `scenario: listing` 检索店铺总 Base 内 `Knowledge Cards 知识卡片` 表：
   - 输入只使用已知事实：SKU、品类、材质、价格档、SEO 关键词、目标受众；**Etsy 平台**还含 step 5.5 生成的礼物词库 / 节日 / 场景（非 Etsy 平台 step 5.5 未运行，无此项）；不要为了检索补编 SKU 信息
   - `max_cards: 3`
   - Base 不存在、为空、不可读或无命中 → **静默 SKIP**，继续原 listing 流程；只有用户问“有没有查知识库”时才说明跳过原因
   - 有命中 → 在草稿前展示「可参考知识卡片」小节，逐条标明来源、记录日期、可用处、本次采用 yes/no/partial、原因和边界；不得静默采用
   - **`方法论` 卡（`卡片类型 = 方法论`）必须读 `知识页链接`，并在 step 7 把其清单 / 模板 / 正反例应用到草稿**——卡面一句话只是指针，不是交付物；其余类型（`趋势` / `选品` / `定位` / `观察`）只在选中卡需要细节时才读，不要为了检索把所有 wiki 都读一遍
   - 命中 `方法论` 卡时，「可参考知识卡片」小节要额外列出实际套用了 wiki 的哪些清单 / 模板 / 开头规则（`playbook_applied`），不能只报标题
6. 读 `assets/listing-template.md`：标准 listing 文案结构
7. 输出草稿：平台商品标题 + 商品描述（含分段）+ 平台关键词 / tags + 平台属性 / materials + 类目建议
   - Etsy：13 tag / 13 material 严格守恒，礼物槽数与客单价档对应；展示与写入 Base 时都用一行英文文本，tag / material 之间用半角逗号 `,` 分隔，方便复制到 Etsy 后台
   - Etsy：Sustainability / Occasion / Holiday 必须从 Etsy 后台字段选项中选择；不要自行编写新值。不确定或只是泛泛适合作礼物时留空
   - Etsy：title 公式 `[核心品类词] + [核心修饰词] + [礼物维度] + [次要属性] + [情感词]`，礼物维度槽优先级：节日词 > 受众词 > 场景词；自购为主 SKU 留空
   - Etsy：description 段 3 双小段（使用语境 + 礼物语境，按 etsy-seo.md § Description）
   - 非 Etsy：字段数量、字段名、输出语言、分隔符、类目/属性枚举只按 COMMERCE_PLATFORM.md；没有配置就标注未知并向用户确认
   - 如果跑了 eRank 节点 ③，title 词序参考竞品模式
   - 如果 step 5.6 命中卡片，先展示「可参考知识卡片」小节，再展示 listing 草稿；listing 正文只采用标为 yes / partial 的卡片，不采用 no 的卡片
   - **若 step 5.6 命中 `方法论` 卡**：按其 `知识页链接` wiki 正文把 SOP 真正落到草稿，而不只是展示卡片——把 wiki 的标题自检清单当作 title 的**审查闸**（草稿生成后逐条过，不过就改），把 wiki 的描述开头规则（如「先场景 / 问题切入、参数后置」）当作 description 的**开头结构**。与平台 SEO 硬规则冲突时按 [`references/business-knowledge-lookup.md`](references/business-knowledge-lookup.md) § Conflict priority：平台规则（本 title 公式、etsy-seo.md 等）为准，方法论卡的差异写法（如「收礼人 / 场景更靠前」的词序）降为 **A/B 候选**展示给用户，不强行覆盖既有公式
8. **整篇展示**给用户，等用户确认或调整。同时展示「过滤掉的候选词」清单，方便用户判断是否要纠正 BRAND.md
9. 用户确认后：
   - 把文案写入店铺总 Base 的 `Products 商品` 对应行（商品级与 SKU 级字段同表；通过 lark-base 更新）
   - 如果 step 5.6 有采用 yes / partial 的 Knowledge Cards，best-effort 回写 `引用次数 += 1` / `最后引用日期 = today`；失败不阻塞 listing 写入，但要简短告诉用户统计字段未能更新
   - 提醒用户去目标平台后台贴上线；若 COMMERCE_PLATFORM.md 明确允许 API / ERP 发布，也必须按对应平台 skill 或人工确认流程执行
   - 如果跑了 eRank 节点 ⑤ 之前的环节，顺带提醒用户去 eRank 做定价对标（节点 ⑤）
   - 不要替用户在平台后台真实上架（平台后台操作不在本 skill 默认范围）
10. **(可选) 反向触发图像产出** — listing 文案写入 Base 后，如果该 SKU 还没有 `商品/{SKU}_shoot-brief.md`，且也没成品图（**下方涉及的「4 类礼物词库」仅 Etsy 适用**——非 Etsy 平台 step 5.5 未运行，现传时只给 description 段 3 + `Products 商品` 表该 SKU 行，下游 skill 走其「无礼物词库」的常规分支）：
    - 提示用户："文案定了，刚生成的 4 类礼物词库 + Mood 新鲜可用。下一步图怎么办？① 出 shoot brief 去拍（assets-library 模式 D）② 不拍直接 AI 合成（image-synth 模式 A）③ 都跳过（之后再说）"
    - **选 ①** → invoke `assets-library` 进入模式 D，**调用方现传** 4 类礼物词库（受众 / 场景 / 节日 / 包装）+ description 段 3 in-memory，让模式 D 直接用，不走 Base 反推。assets-library 模式 D step 11 还会再追问"要不要直接 AI 合成"，用户可在那里继续接 image-synth
    - **选 ②** → invoke `image-synth` 进入模式 A，**调用方现传** 4 类礼物词库 + description 段 3 + `Products 商品` 表中该 SKU 行 in-memory；目标槽位由 image-synth 在盘点输入时跟用户对齐；不预先建 brief 文件
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

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束。本 skill 特有禁区：

- **不替用户上架或发买家消息**：只产文案 + 维护 Base；真实发布遵守 COMMERCE_PLATFORM.md 的自动化边界，默认由用户在平台后台手动复制
- **新增 SKU 不要自动估价**：成本 / 售价让用户确认；可基于 Base 历史给"参考区间"，但不替用户拍板
- **改 Base 用 lark-base 的 diff 风格预览** → 等确认 → 落盘

---

## 与 shop-foundation 的回流关系

写 listing 过程中如果用户**纠正**了文案，且纠正反映品牌偏好（"这文案太冷了"），不要自己改——按 shop-foundation 的沉淀流程（`../shop-foundation/references/distillation-brand.md`）提示用户：

> 「这次的纠正背后好像是一条文案语调原则。你想沉淀进 BRAND.md 吗？沉淀完我用新原则重写这条 listing。」

让纠正流回 BRAND.md，下次所有 listing 都受益。

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：商品页输出语言由 COMMERCE_PLATFORM.md 的「买家语言」决定；Etsy 内置 preset 默认英文。Base 字段标签中英混用（schema 文件里给规范）。
