# Business Knowledge Lookup for Listings

本文件只定义 `listing-catalog` 如何消费 Knowledge Cards。通用协议以 [`../../business-knowledge/references/knowledge-card-lookup.md`](../../business-knowledge/references/knowledge-card-lookup.md) 为准。

## Dependency level

Knowledge Cards 对 listing 是 `SKIP`：

- 店铺总 Base 或 `Knowledge Cards 知识卡片` 表不存在：静默跳过。
- `Knowledge Cards 知识卡片` 表为空或不可读：静默跳过。
- 没有 active / watch 且适用 `listing` 的卡片：静默跳过。
- 检索失败不能阻塞 title / description / tags / materials 生成。

只有用户明确问“有没有查知识库 / 为什么没用知识卡片”时，才说明跳过原因。

## Lookup timing

在模式 B step 5.5 礼物场景调研之后、step 6 读取 listing template 之前执行。

原因：

- step 5.5 之后已经有价格档、礼物词库、目标受众、节日和场景。
- step 6/7 之前还没开始生成最终文案，卡片可以影响角度，但不会覆盖 BRAND.md / SHOP.md / 平台 SEO 规则。

## Input mapping

传给 canonical contract 的字段：

```text
scenario: listing
sku_context:
  sku: `Products 商品` 表或用户输入的 SKU
  category: 中文产品名 / 类目、`Products 商品` 表 品类
  materials: 关键参数、Materials 候选
  price_range: < $20 / $20-$50 / >= $50
  gift_words: step 5.5 的受众词 / 场景词 / 节日词 / 包装服务词
  seo_keywords: 平台 SEO 词库（如 eRank / etsy-seo 候选）、`Products 商品` 表 SEO 关键词
  target_audience: step 5.5 Q2 / Q5
marketing_context:
  channels: 目标平台 listing
  campaign_goal: write listing copy
  season_or_event: step 5.5 Q4 或 holiday-calendar 命中节日
max_cards: 3
```

只填已知字段。不要为了提高命中率编造材质、受众、节日或 SKU 事实。

> `gift_words` / `target_audience` / `season_or_event` 来自 step 5.5，**仅 Etsy 平台有**；非 Etsy 平台 step 5.5 跳过，这些字段缺省，按「只填已知字段」处理即可（其余 SKU / 品类 / 材质 / 价格档 / SEO 关键词照常）。

## Conflict priority

```text
BRAND.md / SHOP.md
  -> 平台政策与平台 SEO 规则（如 etsy-seo.md）
  -> current user instruction
  -> gift-scenario.md
  -> Knowledge Cards
```

Knowledge Cards 只能提供角度和措辞参考，不能覆盖品牌红线、店铺政策、平台 SEO 硬规则或用户当前明确要求。用户当前要求如果和品牌 / 店铺 / 平台硬约束冲突，按硬约束处理。

## Display in draft

如果有命中，在 listing 草稿之前展示：

```text
可参考知识卡片：
1. {title}（{card_type}）
   来源：{source}（{recorded_date}）
   可用处：{suggested_use}
   本次采用：yes/no/partial，{why}
   边界：{boundary}
```

展示规则：

- `yes`：明确影响 title、description、tag 或 angle。
- `partial`：只采用部分角度，或只用于避免错误方向。
- `no`：查到了但本次不用，必须说明原因。

listing 正文只能使用 `yes` / `partial` 卡片。`no` 卡片只展示为 rejected context。

## 方法论卡：读 wiki 并应用（执行型，不止提醒）

`卡片类型 = 方法论` 的卡片不是“看一眼标题就过”的提醒卡——它背后的 `知识页链接` wiki 才是交付物。命中方法论卡时：

1. **必读 wiki**：读 `知识页链接` 指向的 `<workspace>/knowledge/wiki/*.md` 正文，取其判断清单、改写模板、正反例和开头规则。
2. **落到草稿（step 7）**：
   - **Title**：用 wiki 的标题自检清单当**审查闸**——草稿标题生成后逐条过；不通过就改写后再展示。
   - **Description**：用 wiki 的开头规则当**结构约束**（如先写场景 / 问题、参数后置），而不是把材质尺寸堆在开头。
3. **冲突处理**：wiki 是运营启发，**不覆盖**本文件 § Conflict priority 里更高优先级的项（BRAND.md / SHOP.md / 平台 SEO 硬规则 / 用户当前明确要求）。当 wiki 写法与平台硬规则冲突（例如 wiki 倾向“收礼人 / 场景更靠前”，而 etsy-seo.md title 公式是品类词在前），以平台规则为准，把 wiki 写法作为 **A/B 候选**展示给用户判断，不擅自替换既有标题。
4. **展示**：「可参考知识卡片」小节里，方法论卡要写出 `playbook_applied`——实际套用了哪些清单 / 模板 / 开头规则，让用户看到知识落进了产出。

> 这是把 wiki 从“挂在卡片后面没人读”变成“真正驱动写作”的关键。趋势 / 选品 / 定位卡不走这套，一句话摘要够用。

## Usage counters

用户确认 listing 草稿后，对 `yes` / `partial` 卡片 best-effort 更新：

- `引用次数 += 1`
- `最后引用日期 = today`

统计回写失败不阻塞 `Products 商品` 表写入，也不改变 listing 输出。只在最终回复里简短说明“Knowledge Cards 统计字段未能更新”。
