# Etsy SEO 要点

> Etsy 的搜索算法对 Title / Tags / Materials / Category / Attributes 高度敏感。这份指南**不是**理论文章，是写每条 listing 时该核对的清单。

## Title（最重要）

> 📊 若上下文中已有 eRank 节点 ② 关键词词库 / 节点 ③ 竞品 title 列表，按它们驱动选词与词序。
> 📊 step 5.5（[gift-scenario.md](gift-scenario.md)）跑完后必有礼物词库，按客单价档喂入下面公式的「礼物维度」槽。

**字符限制**：140 字符。理论上可以填满，但实际**前 60-70 字符权重最高**——重点关键词放最前。

**结构公式**（按优先级排列）：
```
[核心品类词] + [核心修饰词] + [礼物维度] + [次要属性] + [情感词]
```

「礼物维度」槽位（从原第 4 位提到第 3 位，理由：礼物搜索意图是 Etsy 流量大头，应当在 title 前 60-70 字符权重区出现）：
- 优先级：节日词（命中且距 ≤ 60 天）> 受众词 > 场景词
- 自购为主（Q1=A）：本槽位**留空**，公式回退为 4 段（核心品类 + 核心修饰 + 次要属性 + 情感）
- 高客单档可放长尾语义短语（`for the friend who measures their mornings in tea`），但要算 title 字符预算

例：
- ❌ "Beautiful Handmade Tea Cup" — 太泛，无 SEO 价值
- ✅ "Handmade Wood-Fired Tea Cup, Mother's Day Gift for Tea Lover, Unglazed Ceramic Yunomi for Daily Ritual" — 礼物维度（Mother's Day Gift for Tea Lover）在第 3 位，权重区
- ✅ 高客单变体："Hand-Thrown Yunomi Tea Cup, A Quiet Gift for Someone Who Loves Their Morning Ritual, Wood-Fired Pottery Mug" — 长尾语义短语在第 3 位

**核心检查点**：
- [ ] 第一个词是品类核心词（"Tea Cup", "Teapot", "Ceramic Bowl"）
- [ ] 包含至少 1 个高频长尾词（"wood-fired", "unglazed", "yunomi"——这些买家会搜的）
- [ ] 不堆砌、不全大写、不滥用标点
- [ ] 与 BRAND.md 文案语调一致（手作感语境下 "Handmade" / "Hand-thrown" 比 "Premium" / "Luxury" 合适）

**禁忌**：
- 标题里写"100% Authentic"、"Best Quality"——空话，无 SEO 价值还显廉价
- 全大写或大量惊叹号——违反 BRAND.md 文案语调（如有）
- 标题与 description 第一段一字不差——浪费曝光机会

## Tags（13 个槽，全部填满）

> 📊 若上下文中已有 eRank 节点 ② 词库，按下面公式从词库挑词；节点 ④ 的竞品 tag 用于挑词后做差集验证。
> 📊 step 5.5（[gift-scenario.md](gift-scenario.md)）跑完后必有礼物词库，按客单价档分配下面的「礼物槽」。

**核心规则**：每个 tag ≤ 20 字符（**这是 Etsy 硬上限**——比 20 字符长的词只能进 title / description，不能进 tag），可以是词组（"wood fired pottery"），不要单字（"tea"）。Etsy 总槽位 = **13**，硬守恒不超不缺。

**13 槽按客单价档分配**（礼物槽数从「使用场景」槽位移而来，**不动品类 / 工艺槽**）：

| 档位 | 价格 | 品类 | 工艺/材质 | 使用场景 | **礼物** | 风格审美 | 合计 |
|---|---|---|---|---|---|---|---|
| 低 | < $20 | 3 | 3 | 2 | **3**（节日为主）| 2 | 13 |
| 中 | $20-$50 | 3 | 3 | 1 | **4**（节日 + 受众）| 2 | 13 |
| 高 | ≥ $50 | 3 | 3 | 2 | **3**（受众 + 场景，少节日大词）| 2 | 13 |

**每组的具体填法**：

- **3 个核心品类词**：`tea cup` / `tea pot` / `pottery mug`
- **3 个工艺/材质词**：`wood fired` / `unglazed ceramic` / `hand thrown`
- **使用场景（1-2 个，按档位）**：`daily tea ritual` / `morning tea` / `mindful drinking`
- **礼物（3-4 个，按档位）**——来自 step 5.5 礼物词库，分类参考：
  - **节日词**：`mothers day gift` / `christmas gift` / `birthday gift` / `graduation gift`
  - **受众词**：`gift for mom` / `gift for tea lover` / `gift for her` / `gift for him`
  - **场景词**：`housewarming gift` / `wedding gift` / `anniversary gift`
- **2 个风格/审美词**：`wabi sabi` / `minimal pottery` / `earthy decor`

**< $20 自购为主 SKU 的特殊处理**：低价档礼物槽 3 个全填节日词（自动查 [holiday-calendar.md](holiday-calendar.md) 命中）；如果 0 命中，则礼物槽回退为「使用场景」槽（场景=2 → 5），不空着

**禁忌**：
- 重复关键词（"tea cup" 占两槽是浪费）
- 单字 tag（"ceramic" 单独无意义，要"ceramic mug"）
- 拼错 / 大小写不规范
- 蹭品牌或 IP（"like muji"、"Hermes style"——Etsy 会下架）

## Materials（13 个槽）

**用途**：让买家在 "Materials" 筛选器里能找到你。

填法：
- 物理材质：`stoneware clay`、`porcelain`、`unglazed ceramic`、`natural ash glaze`
- 不是把 tags 复制过来——materials 只填材质事实

**禁忌**：写 "love"、"hand thrown"——这些不是材质。

## Category（必选）

Etsy 类目层级深，认真选最贴切的叶子节点：
- `Home & Living > Kitchen & Dining > Drink & Barware > Mugs > Tea Cups`
- 选错类目 → 错配受众，转化暴跌

## Attributes（按类目变化）

不同类目下 Etsy 提供不同 attributes（容量、风格、产地等），**全部填**。每填一个就多一个被筛中的机会。

## Description

**结构推荐**：

```
段 1：开场（1-2 句）—— 用 BRAND.md 文案语调写"为什么这件东西存在"或"它解决什么"
段 2：物件本身（3-5 句）—— 用了什么材质、工艺特征、感官细节
段 3：使用 + 礼物场景（4-6 句，分两个小段）

  使用语境（2-3 句）：它在生活里怎么被用、与什么搭配、谁的日常用得
  上它（一人独饮、办公茶歇、晨间冥想、客厅会客等）

  礼物语境（2-3 句，仅当礼物倾向 ≠ 自购为主时填）：适合送给谁（受众
  + 关系）、什么场合（场景 + 节日，如有命中），以及这件物在收礼人手
  里产生什么微小的日常变化（具体到一种用法或一个时刻，避免 "perfect
  gift" 这类空话）

段 4：规格 —— 尺寸、重量、容量（用 bullet point）
段 5：注意事项 —— 是否手洗、是否微波、定制规则、轻微差异说明（手作/烧窑差异）
段 6：政策 —— 处理时间、运输、退换货 → 引用 SHOP.md 原文，不要自己编
段 7：（可选）品牌 / About 钩子 —— 一句话引到关于你的故事，链接 About 页
```

**前两段权重最高**——Etsy 索引会重点看；同时也是买家最先看到的。

**段 3 礼物语境的写法要点**（仅在 step 5.5 Q1 ≠ 自购为主时启用）：
- 长度 2-3 句，**不能盖过段 2**——礼物是关系维度，不替代物的维度
- 受众 + 关系来自 step 5.5 Q2/Q5；场景来自 Q3；节日来自 Q4（仅当节日距上架日 ≤ 30 天时命名节日）
- 高客单档可融入礼物词库里的长尾语义短语（如 "for the friend who measures their mornings in tea"），低客单档保持精炼
- 禁忌：堆 SEO 词（"a perfect christmas gift for mom dad sister wife"——人话不会这样讲），用空话（"the perfect gift"，参考 step 5.5 BRAND.md 三条硬过滤规则）

**Description 禁忌**：
- 复制粘贴 title 当首句
- 罗列功能不讲故事
- 用 SHOP.md 之外的政策口径（"我们 24 小时发货"——而 SHOP.md 写的是 3 天）
- 加买家不该看的词（"代发"、"OEM"、"批发欢迎" —— 这是 toC 平台，不要 toB 词汇）

## Image / Video Alt Text

Etsy 后台支持给每张图和视频写 alt text。**双重收益**：

- **无障碍**：屏幕阅读器读给视障买家
- **图搜 SEO**：Google 图搜 / Etsy 图索引会读 alt 文本去匹配查询

**写 alt 的规则**：

- 长度 ≤ 125 字符（屏幕阅读器一口气能念完的长度）
- 描述**画面里看得到的东西** + 1–2 个核心 SEO 词，自然成句，不堆词
- 不要以 "Image of..." / "Photo of..." 开头——屏幕阅读器已经知道这是图
- 一条 listing 的多张图，alt 不要全一样——按图差异化（主图、细节图、场景图、规格图各自有侧重）

**例**（一条柴烧茶杯 listing）：

- 主图：`Wood-fired ceramic tea cup with earthy unglazed exterior, held in two hands over a wooden tray`
- 细节图：`Close-up of natural ash glaze drip on the rim of a handmade yunomi cup`
- 场景图：`Unglazed pottery tea cup beside a small teapot on a linen mat, morning tea ritual`

视频 alt 同理：一句话描述视频里**主要发生什么**（"Hands rotating a wood-fired tea cup to show the ash glaze pattern around the rim"），不要把整条文案塞进去。

存放位置：Base 的 `图片 Alt (EN)` / `视频 Alt (EN)` 字段（每行一张图 / 一条视频，与图片顺序对齐）。

## 季节性 / 节日 / 大促

> 节日维度是 step 5.5（[gift-scenario.md](gift-scenario.md)）的输出。本节给的是 **Etsy 索引时的提前期规则**，与 holiday-calendar.md 的提前期规则同源。

**提前期规则**（节日距上架日 X 天）：

| 窗口 | 节日词进入位置 | 理由 |
|---|---|---|
| **90 天**起 | tags 槽（按客单价档分配的礼物槽之一） | tags 是 SEO 索引输入，需要给 Etsy 算法更长的攒权重时间 |
| **60 天**起 | title 礼物维度槽（公式第 3 位） | title 是用户可见文本，太早加节日词显廉价（5 月还卖"圣诞礼物"） |
| **30 天**内 | description 段 3 礼物语境强化（命名节日 + 包装服务） | 临门一脚的转化文案 |

节日命中查询走 [holiday-calendar.md](holiday-calendar.md)；step 5.5 Q4 调用时按「计划上架日」（默认 today）反查 90 天窗口。

- **大促期间**（黑五 / 网一 / Prime Day）的特殊 listing 用单独的草稿 SKU，不要污染主 listing 的标题
- **节日 0 命中**不打断流程——记录「无节日命中」，礼物槽回退到受众词 / 场景词
- **跨节日**（如 Mother's Day + Graduation Season 5 月同时窗口）：title 只能塞 1 个节日词（字符预算），按距离最近的节日选；tags 可以同时塞两个节日词（13 槽充裕）

## SEO 自检清单（每条新 listing 写完都过一遍）

- [ ] Title 第一个词是品类核心词
- [ ] Title 包含 ≥1 个长尾关键词
- [ ] Title 第 3 位是礼物维度词（除非自购为主 SKU 留空）
- [ ] 13 tags 全部填满，无重复词，礼物槽数符合客单价档（< $20: 3 / $20-$50: 4 / ≥ $50: 3）
- [ ] 13 materials 全部填，是真材质
- [ ] Category 选到叶子节点
- [ ] Attributes 全部填
- [ ] Description 段 1-2 有故事感、不是参数堆砌
- [ ] Description 段 3 含礼物语境小段（如非自购 SKU），且通过 BRAND.md 三条硬过滤
- [ ] Description 末尾政策段引用 SHOP.md
- [ ] 文案整体符合 BRAND.md 文案语调
- [ ] 无禁忌词（"premium"、"100% authentic"、"perfect gift"、"adorable"、"like 某品牌"）
- [ ] 节日命中如有，提前期规则正确（tag ≥ 90 天 / title ≥ 60 天 / description 强化 ≥ 30 天）
- [ ] 视频已就位（每条 listing 必有 1 条视频）+ 视频 alt 已写
- [ ] 每张图都有 alt text，按图差异化、无 "Image of..." 前缀
