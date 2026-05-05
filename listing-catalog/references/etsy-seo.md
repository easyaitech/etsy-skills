# Etsy SEO 要点

> Etsy 的搜索算法对 Title / Tags / Materials / Category / Attributes 高度敏感。这份指南**不是**理论文章，是写每条 listing 时该核对的清单。

## Title（最重要）

**字符限制**：140 字符。理论上可以填满，但实际**前 60-70 字符权重最高**——重点关键词放最前。

**结构公式**（按优先级排列）：
```
[核心品类词] + [核心修饰词] + [次要属性] + [场景/受众] + [情感词]
```

例：
- ❌ "Beautiful Handmade Tea Cup" — 太泛，无 SEO 价值
- ✅ "Handmade Wood-Fired Tea Cup, Unglazed Ceramic Yunomi for Daily Tea Ritual, Earthy Tone Pottery Mug Gift"

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

**核心规则**：每个 tag ≤ 20 字符，可以是词组（"wood fired pottery"），不要单字（"tea"）。

**13 槽分配建议**：
- **3 个核心品类词**：`tea cup` / `tea pot` / `pottery mug`
- **3 个工艺/材质词**：`wood fired` / `unglazed ceramic` / `hand thrown`
- **3 个使用场景**：`daily tea ritual` / `morning tea` / `mindful drinking`
- **2 个礼物/受众词**：`tea lover gift` / `housewarming gift`
- **2 个风格/审美词**：`wabi sabi` / `minimal pottery` / `earthy decor`

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
段 3：使用场景（2-3 句）—— 它在生活里怎么被用、与什么搭配
段 4：规格 —— 尺寸、重量、容量（用 bullet point）
段 5：注意事项 —— 是否手洗、是否微波、定制规则、轻微差异说明（手作/烧窑差异）
段 6：政策 —— 处理时间、运输、退换货 → 引用 SHOP.md 原文，不要自己编
段 7：（可选）品牌 / About 钩子 —— 一句话引到关于你的故事，链接 About 页
```

**前两段权重最高**——Etsy 索引会重点看；同时也是买家最先看到的。

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

- 圣诞 / 情人节 / 母亲节 / 父亲节前 60 天，可以临时在 title 末尾加 "Christmas Gift"、"Mother's Day Gift" —— 跟 Etsy 的季节流量
- 大促期间（黑五、网一）的特殊 listing 用单独的草稿 SKU，不要污染主 listing 的标题

## SEO 自检清单（每条新 listing 写完都过一遍）

- [ ] Title 第一个词是品类核心词
- [ ] Title 包含 ≥1 个长尾关键词
- [ ] 13 tags 全部填满，无重复词
- [ ] 13 materials 全部填，是真材质
- [ ] Category 选到叶子节点
- [ ] Attributes 全部填
- [ ] Description 段 1-2 有故事感、不是参数堆砌
- [ ] Description 末尾政策段引用 SHOP.md
- [ ] 文案整体符合 BRAND.md 文案语调
- [ ] 无禁忌词（"premium"、"100% authentic"、"like 某品牌"）
- [ ] 视频已就位（每条 listing 必有 1 条视频）+ 视频 alt 已写
- [ ] 每张图都有 alt text，按图差异化、无 "Image of..." 前缀
