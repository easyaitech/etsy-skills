# Pin Composition（怎么把 SKU + 素材 + BRAND 写成一条 pin）

模式 B 的核心 reference。读完 BRAND.md / SHOP.md / 商品 Base / 素材索引 Base 之后，按这里的规则产出 pin 内容。支持单图 pin 和轮播 pin（carousel，2-5 张图）。

---

## 输入清单（缺必填项一次性问全）

| 输入 | 必填 | 来源 / 默认 |
|---|---|---|
| 目标 SKU | ✅ | 用户给 |
| 目标 board | ✅ | 用户给（必须是 Pinterest 后台已建好的 board，且已加进 Pin Queue Base 的 `Board (Pinterest)` 单选选项） |
| 指定素材 | ❌ | 用户给具体素材 ID；可给 1 张（单图 pin）或 2-5 张（轮播 pin）。不给就从素材索引 Base 的「Pinterest 候选」视图列出该 SKU 的候选让用户挑 |
| 创意主题（一句话） | ❌ | 用户给；不给就从 SKU 标题 + 素材文件名推一个，让用户改 |

### 多图选择要点

- 用户给了多张素材（或从候选里挑了多张）→ 自动设为轮播 pin
- 用户只给 1 张 → 单图 pin
- **轮播 pin 限制 2-5 张**（Pinterest 上限）。用户选超过 5 张时提示拆分为多条 pin
- **顺序由用户决定**：列出用户选择的素材，让用户确认或调整展示顺序。第一张是封面图（Pinterest feed 里默认展示第一张）
- 发布顺序落到 `image 路径` 的行顺序；`关联素材` 只是追溯，不作为排序来源
- 每张素材都必须通过授权校验（同单图流程）

---

## 内容产出规则

### 0. Pin Queue 行结构

一条草稿只写入一行 Pin Queue 记录：

- `pin 类型`：1 张图写 `单图`；2-5 张图写 `轮播`
- `image 路径`：每行一张 processed 图片，行顺序就是 carousel 展示顺序
- `Alt Text (EN)`：每张图一段，中间用独占一行的 `---` 分隔
- `图片数量`：写入图片行数（如字段已建）
- `封面图`：写入第一张 processed 路径或预览链接（如字段已建）

不要因为轮播有多张图就拆成多条 Pin Queue 记录。多张图发布后也只对应一个 Pinterest pin URL。

### 1. Link

- 默认 = 商品 Base 该 SKU 行的 `分享链接`
  - `分享链接`：Etsy 后台或线上 listing 复制出的可分享链接，是商品型 pin 的唯一 link source
  - `Etsy Listing ID`：只做商品追溯和上线校验，不用于临时拼 URL
- 如商品 Base 的 `状态 ≠ 在售`、`Etsy Listing ID` 为空或 `分享链接` 为空：**中止排队**，提示用户先上线 listing 并补齐 `分享链接`
- 不允许指向非自家域名（防误发引流到第三方）
- 轮播 pin 共用同一个 link（所有图片指向同一 listing）

### 2. Board

- 严格用 Pin Queue Base `Board (Pinterest)` 单选字段里的现有选项；不允许临时新增（避免拼写漂移让 Pinterest-autopin 找不到）
- 如用户要的 board 不在选项里：先停下，提示用户去 Pinterest 后台建好 board → 把名字加进 Pin Queue Base 单选选项 → 再来排队

### 3. Title (EN)

**硬性约束**：
- ≤ 100 字符（Pinterest 上限是 100，超出会被截）
- 英文
- 不要 ALL CAPS
- 不要堆 hashtag（hashtag 在 description 里放）
- 第一个词承担最强 SEO（Pinterest 搜索权重前置）

**风格约束**：
- 严格遵守 BRAND.md § 文案语调（"应该说" / "避免说" / "原则"）
- 优先用 SKU 标题里已经验证过的关键词（商品 Base `SEO 关键词` 字段是源头）
- Pinterest 用户搜索习惯偏"场景词 + 物品词"（"morning slow tea cup"），不偏"参数词"（"260ml ceramic mug"）——所以即便 listing title 偏参数化，pin title 要往场景化转

**模板**（仅作起点，不要硬套）：

```
{场景词} {核心物品词} — {一行风格补充}
```

例：
```
Morning Mist Tea Cup — handmade ceramic for slow mornings
Hand-thrown matcha bowl for quiet rituals
```

**反例**（违反 BRAND 文案语调时常见）：
- ❌ `BEST Handmade Ceramic Mug! Buy Now!!! 🔥🔥🔥`（堆叹号、ALL CAPS、堆 emoji——多数 BRAND 都禁）
- ❌ `260ml Stoneware Mug, Glazed, Microwave Safe`（堆参数，不是 Pinterest 风格）

轮播 pin 的 title 描述整组图片的主题，不要只描述第一张。

### 4. Description (EN)

**硬性约束**：
- 200-500 字符（Pinterest 推荐区间，超过 500 会被截尾）
- 英文
- 末尾可以放 2-3 个 hashtag（Pinterest hashtag 弱搜索权重，主要做语义聚类——`#slowliving #handmadeceramics #teaceremony`）
- **不要重复 SHOP.md 政策**（处理时间 / 退换货 / 运输）——pin 不是 listing 页，政策放在 link 那边的 listing 描述里就够了

**风格约束**：
- 严格遵守 BRAND.md § 文案语调
- 一段叙述（不要分点），有节奏，可以用一个具体使用场景做钩子
- 不要叫卖式 CTA（"Shop now!" "Don't miss out!"）——Pinterest 用户讨厌这个；如要引导可以用更软的（"See more in the linked shop."）

**模板**（仅作起点）：

```
{一两句场景钩子}. {产品的一两个细节，呼应 BRAND 视觉/工艺原则}. {引导句，可省}.

{hashtag1} {hashtag2} {hashtag3}
```

例：

```
A small ceramic cup for the quiet first sip of the day. Wheel-thrown by hand, glazed in a sage I mixed last spring — every cup carries a slightly different shade. See the full collection in the linked shop.

#slowliving #handmadeceramics #teaceremony
```

轮播 pin 的 description 可以提及"swipe to see more"或"see the details up close"来引导用户左右滑动，但不要太生硬。

### 5. Alt Text (EN)——每图独立

**硬性约束**：
- 描述**该张图里看到了什么**，不复制 title
- 每张 ≤ 500 字符（Pinterest 上限 500）
- 英文
- 不要堆 hashtag

**风格约束**：
- 客观、具体——颜色、材质、构图、光线
- 服务两类受众：屏幕阅读器用户（无障碍）+ Pinterest 视觉搜索的 ML（SEO）

**单图 pin 示例**：

```
A pale sage green ceramic teacup on a linen cloth, photographed in soft morning light from above. Steam rises faintly from the rim.
```

**轮播 pin 示例**（3 张图，写入 Pin Queue Base 时用 `---` 分隔）：

```
A pale sage green ceramic teacup on a linen cloth, photographed in soft morning light from above. Steam rises faintly from the rim.
---
Close-up of the cup's glazed rim showing the sage green gradient and fine crackle pattern under natural side light.
---
Three cups arranged on a wooden shelf, each showing a slightly different shade of sage green. Warm afternoon light from a window on the left.
```

**轮播 alt text 写作要点**：
- 每张图的 alt text 独立描述该张图，不假设用户看过其他图
- 不要写"第 1 张"、"第 2 张"这样的序号——屏幕阅读器用户知道自己在哪张
- 如果多张图拍的是同一个产品的不同角度，alt text 应强调每张的**差异**（角度、细节、场景），不要复制粘贴改几个词

---

## BRAND 一致性自检（出草稿后、给用户看前自做一遍）

逐项过：

- [ ] title / description 用词没踩 BRAND「避免说」清单
- [ ] 整体语调与 BRAND「文案语调 § 应该说」吻合
- [ ] 选用的素材不违反 BRAND「视觉原则 § 视觉禁区」
- [ ] 没有自编 SHOP 没说过的政策事实
- [ ] （轮播 pin）每张图的 alt text 都独立且不互相抄

不通过 → 不要给用户看草稿，先自己改对再给。

---

## 渠道特有手感（Pinterest 与 listing 文案的差异）

这一段是本 skill 自己的"半沉淀区"——比 BRAND.md 渠道无关原则更细，但还没具体到要每条记录。如果用户在模式 B 的纠正反复指向某个 Pinterest 特有偏好，按 SKILL.md § 与其他 skill 的协作 / 回流 提示用户：

- 如果是 BRAND 普适的 → 走 shop-foundation 的 distillation-brand.md 沉淀进 BRAND.md
- 如果是 Pinterest 渠道特有的 → 加到这里下面的「渠道沉淀」段

### 渠道沉淀（启动时空，用着用着补）

<!-- 用户纠正反映 Pinterest 渠道特有偏好时追加在这里。每条格式：日期 + 一句原则 + 来源。例：
- 2026-05-12: pin description 第一句必须是场景钩子，不要先讲产品参数。来源：用户纠正 PIN-20260512-002。
-->

（暂无）
