---
seed_id: etsy-title-desc-gift-conversion
卡片类型: 方法论
标题: Etsy 标题/描述去 AI 味 · 目标人群优先 · 场景转化
适用场景: [listing]
关键词标签: [Etsy title, keyword stuffing, recipient-first, gift conversion, description opener]
建议动作: 写或审 Etsy title 时用 §4 自检清单当审查闸；写 description 时用 §5/§6 的「场景先行、参数后置」当开头结构。
禁用场景: 仅适用礼物/收礼人驱动的 listing；纯功能/工业/批发/自用品类的标题不要硬套「收礼人优先」。不替代平台 SEO 硬规则与字符限制。
applicability:
  platform: etsy
  locale: en
  scope: gift-oriented listings (recipient / occasion driven)
---

> **这是一份「起步种子」，不是圣经。** 它是平台无关品牌的通用 Etsy 礼物型写作方法论，由 stack 公共包发出、`init` 时拷进你的 workspace。**拷进来后它就归你**——请按你的品类、买家、平台阶段和后台数据自由删改。下面的示例是占位用的通用礼物品类，不是任何具体店铺的 SKU；替换成你自己的。

# Etsy 标题与描述：去 AI 味、目标人群优先

## 1. 核心结论

Etsy listing 不应写成「AI 为搜索引擎生成的关键词清单」。Etsy 不是纯搜索引擎，也是人在逛的礼物市场：

- **Title 负责点击**：让买家一眼认出「这是给谁 / 什么场景 / 什么关系」的礼物，再说明产品是什么。
- **Description 前半负责转化**：先进场景，后讲参数。
- **Tags 负责补搜索覆盖**：承接 title 放不下的次要关键词。
- **Materials / specs 负责信任**：放后面。

不要把所有 SEO 压到标题里。旧式标题常把品类+材质+功能+用途+gift 场景全塞进去——词太多、重复多（photo/box/gift/custom 反复出现）、语气机械像 AI 生成，买家扫一眼不知道该不该点。

## 2. 标题：目标人群优先，而不是产品属性优先

**不推荐**（只描述产品属性，没说送谁、为什么、有什么意义）：

```text
Perfume Bottle Green Leaf Accents
```

**更推荐**（目标人群 / 送礼关系优先）：

```text
Custom Mother of the Bride Perfume Bottle, Personalized Wedding Gift from Daughter
```

前几词已明确：目标人群（Mother of the Bride）、产品（Perfume Bottle）、关系和场景（Wedding Gift from Daughter）。买家能迅速判断「我是不是正在找这个」。

## 3. 标题模板

通用结构：

```text
[目标收礼人 / 场景] + [商品形态] + [一个核心定制或情绪价值]
```

英文落地：

```text
Custom [Recipient / Occasion] [Product], Personalized [Meaning / Gift Angle]
```

通用占位示例（换成你自己的品类）：

```text
New Home Housewarming Candle, Personalized First Home Gift for Couple
Teacher Appreciation Keychain, Custom End of Year Gift from Student
Pet Memorial Portrait Print, Personalized Keepsake Gift for Dog Mom
```

是否替换现有 title，结合 eRank / Etsy 后台表现 / 人工判断，不要只因一条观点就自动改。

## 4. 标题自检清单（写完逐条过；当审查闸用）

- 前 5–7 个英文词里，能否看出目标人群、场景或核心产品？
- 是否避免了 photo / box / gift / custom 这类词无意义重复？
- 是否只保留 1–3 个最核心的礼物入口？
- 是否没有把 teacher / parents / friend / wedding / birthday / graduation 全塞进标题？
- 是否像真人卖家写给真人买家，而不是 AI 把关键词拼起来？
- 次要场景是否已放进 tags / description，而不是硬塞 title？

## 5. Description：开头先进入场景，不先讲参数

老外会认真看 description，但不喜欢官方模板感。

**不推荐开头**（像参数表，无法激发购买想象）：

```text
This product is made of brass. The size is 2.7 cm by 2.8 cm...
```

**推荐开头**（用场景问题或关系问题切入）：

```text
Looking for a small housewarming gift that feels personal, quiet, and easy to keep?
```

```text
Need a meaningful gift for a teacher, parent, or friend who appreciates something personal rather than ordinary decor?
```

然后再说明产品如何满足这个场景。

## 6. Description 写作三条

1. **开头不要先介绍产品参数**：先问一个问题，或直接写买家的送礼场景，让买家进入「我是否需要这份礼物」的情境。
2. **多用短句、短段**：可用 bullet、空行、少量分隔符；风格要克制，不做廉价促销感、不堆 emoji。
3. **写感觉，不只写参数**：规格/材质/尺寸放后面（第 4 段以后）。前半段先写：什么时候送、适合送谁、收礼人会如何使用或保存、这份定制表达什么心意、为什么它不是普通装饰品。

## 7. 应用边界

- 可采用「目标人群优先」标题策略，可把 description 开头改成场景问题，可用更短 title 做 A/B 候选。
- **不应**机械套用「所有标题必须 14 个词以内」——Etsy 官方限制是 140 字符；14 词只作「不要冗长堆词」的可读性提醒。
- **不应**为了显口语而牺牲品牌克制感——语气仍按你的 BRAND.md。
- **不应**承诺 luck / magic / healing 等功效。
- 与平台 SEO 硬规则（如 platforms/etsy.md 的 title 公式）冲突时，平台规则为准，本页写法降为 **A/B 候选**，不强行覆盖。

## 8. 给下游 Agent 的使用方式

`listing-catalog` 写 Etsy listing 命中本卡（`卡片类型 = 方法论`）时：

- **Title**：用 §4 自检清单当审查闸——草稿生成后逐条过，不通过就改。
- **Tags**：承接 title 放不下的次要 gift 场景。
- **Description**：用 §5 / §6 当开头结构——先场景/问题，参数后置。
- **Review**：标题读起来像关键词清单，先改成真人可扫读版本。

本页不自动改任何 SKU；只作写作和审稿参考。
