---
name: shop-foundation
description: 建立和维护电商店铺的五份元基础设施文件：BRAND.md（品牌原则）+ SHOP.md（店铺事实）+ COMMERCE_PLATFORM.md（销售平台配置）+ BRAND_MARKETING.md（品牌营销策略）+ MARKETING_PLATFORM.md（内容平台策略）。触发条件：(1) "建立品牌底座 / 品牌定位 / 店铺信息 / 电商平台配置 / 销售平台规则 / 营销策略 / 平台策略 / 内容策略"等打底请求；(2) 用户纠正 Agent 输出反映品牌偏好（→ BRAND.md 沉淀）、店铺事实变更（→ SHOP.md 更新）、销售平台规则变更（→ COMMERCE_PLATFORM.md 更新）、营销方向调整（→ BRAND_MARKETING.md 沉淀）或内容平台规范变更（→ MARKETING_PLATFORM.md 更新），主动提示。
layer: foundation
---

# Shop Foundation（店铺底座）

这个 skill 维护电商店铺的五份**元基础设施**文件：

| 文件 | 性质 | 内容 | 维护节奏 |
|---|---|---|---|
| `BRAND.md` | 主观、原则级 | 品牌定位 / 价值主张 / 视觉原则 / 文案语调 | 月级，靠"沉淀"长出来 |
| `SHOP.md` | 客观、事实级 | 店铺名 / 政策 / 处理时间 / About / Announcement / 节假日 | 季度级，事实变更直接更新 |
| `COMMERCE_PLATFORM.md` | 半客观、配置级 | 销售平台 / 市场 / 语言 / 商品页限制 / 媒体规则 / 订单客服边界 | 平台变更时更新 |
| `BRAND_MARKETING.md` | 主观、策略级 | 营销定位锚点 / 目标人群 / 情感触点 / 场景矩阵 / 形象铁律 / 红线 | 季度级，靠"沉淀"长出来 |
| `MARKETING_PLATFORM.md` | 半客观、执行级 | 各平台（Pinterest / TikTok / Instagram …）的用户心理 / 内容规范 / 配比 / 投入节奏 | 月级，平台策略变更直接更新 |

五份文件的层次关系：

```
BRAND.md（我们是谁）
  └── BRAND_MARKETING.md（我们对谁说、说什么、怎么说）
        └── MARKETING_PLATFORM.md（在哪个平台、用什么形式说）
SHOP.md（店铺事实）
COMMERCE_PLATFORM.md（销售平台规则）
```

下游所有具体行动都应从这五份文件推导——错一条会污染所有下游。读取契约详见 §被下游 skill 引用的契约。

---

## 启动检查（每次激活）

读 [`shared/preamble.md`](../shared/preamble.md)，按其中步骤执行版本检查与工作区解析。

### 基座文件完整性检查

版本检查之后，再做一次**基座文件完整性检查**：

1. 先解析工作区根（`ecommerce-stack workspace`，旧命令 `etsy-stack workspace` 兼容）；如果解析失败则跳过本检查（等用户触发任务时再处理）
2. 检查工作区根下是否存在以下 5 份文件：`BRAND.md`、`SHOP.md`、`COMMERCE_PLATFORM.md`、`BRAND_MARKETING.md`、`MARKETING_PLATFORM.md`
3. 如果全部存在 → 静默通过
4. 如果有缺失 → **主动提醒用户**，措辞示例：

> 「发现你的工作区缺少以下基座文件：COMMERCE_PLATFORM.md、BRAND_MARKETING.md、MARKETING_PLATFORM.md。
> COMMERCE_PLATFORM.md 定义销售平台规则（在哪卖、用什么语言、商品页和订单有什么限制）；BRAND_MARKETING.md 定义营销策略；MARKETING_PLATFORM.md 定义内容平台执行规范。
> 要现在建立吗？我会按访谈模式逐步引导你。」

注意：
- 只提醒缺失的文件，已存在的不重复提及
- BRAND_MARKETING.md 的前置条件是 BRAND.md 已存在；MARKETING_PLATFORM.md 的前置条件是 BRAND_MARKETING.md 已存在；COMMERCE_PLATFORM.md 的前置条件是 SHOP.md 已存在。如果前置文件也缺失，按依赖顺序建议（先建前置文件）
- 提醒一次即可；如果用户说「以后再说」，不要在后续对话中反复催促

---

## 模式识别

开始任务前先识别：

1. **目标文件**：BRAND.md / SHOP.md / COMMERCE_PLATFORM.md / BRAND_MARKETING.md / MARKETING_PLATFORM.md？
   - 品牌身份、定位、视觉、语调 → BRAND.md
   - 店铺事实、政策、运营 → SHOP.md
   - 销售平台、市场、语言、商品页规则、媒体限制、订单客服边界 → COMMERCE_PLATFORM.md
   - 营销策略、人群、触点、场景、红线 → BRAND_MARKETING.md
   - 某平台的具体规范、配比、投入节奏 → MARKETING_PLATFORM.md
2. **执行模式**：访谈（冷启动 / 完善）还是沉淀更新？

用一句话告诉用户你识别到了什么场景、接下来打算怎么做（不要直接抛问题）。例如：

- 「我看到你想建立品牌底座。我会按四个维度（定位、价值主张、视觉、文案）逐个聊。我们从『品牌定位』开始？」
- 「我看到你想搭建店铺信息档案。SHOP.md 是事实档案——我会按几个块快速过一遍：基础信息、政策、About、节假日。先从基础信息开始？」
- 「我看到你想把技能包适配多个电商平台。COMMERCE_PLATFORM.md 是销售平台配置——我会先把默认平台、语言、商品页规则、媒体规则、订单客服边界对齐。先从默认销售平台开始？」
- 「我看到你想建立营销策略。我会按六个维度（定位锚点、人群、触点、场景、形象、红线）逐个聊。我们从『核心定位锚点』开始？」
- 「我看到你想定义平台内容策略。我会按平台优先级逐个过——每个平台聊：用户心理、内容规范、配比、红线、投入节奏。先从你的主战场开始？」
- 「我注意到你刚才的纠正背后好像是一条文案语调原则。要不要沉淀进 BRAND.md？我先草拟一条给你看。」
- 「我注意到你刚才说的处理时间和 SHOP.md 里写的不一致。要把 SHOP.md 更新成你刚才说的吗？」
- 「我注意到你刚才说的平台标题长度 / tag 数量 / 主图限制和 COMMERCE_PLATFORM.md 不一致。要把销售平台配置更新成你刚才说的吗？」
- 「我注意到你刚才对营销方向的调整好像影响了人群优先级。要不要同步更新 BRAND_MARKETING.md？」
- 「我注意到你刚才对 Pinterest 规范的纠正。要把 MARKETING_PLATFORM.md 里 Pinterest 章节更新一下吗？」

### 模式 A：访谈（冷启动 / 完善）

**进入条件**：
- 用户明确说要建立、搭建、完善 BRAND.md / SHOP.md / COMMERCE_PLATFORM.md / BRAND_MARKETING.md / MARKETING_PLATFORM.md
- 用户描述相关工作而工作区根目录不存在对应文件
- 文件已存在但用户希望补充某个空白部分

**执行步骤**：
- 若目标是 **BRAND.md** → 读 `references/interview-brand.md`，按四维度逐个深挖
- 若目标是 **SHOP.md** → 读 `references/interview-shop.md`，按几个事实块快速过
- 若目标是 **COMMERCE_PLATFORM.md** → 读 [`../shared/platform-config.md`](../shared/platform-config.md) 和 `assets/COMMERCE_PLATFORM_template.md`，按默认平台、语言货币、商品页规则、媒体规则、订单客服边界、合规红线访谈；Etsy / 小红书可先按内置 preset 生成章节，其他平台必须由用户确认规则来源
- 若目标是 **BRAND_MARKETING.md** → 读 `references/interview-brand-marketing.md`，按六维度逐个深挖（前置条件：BRAND.md 须已存在）
- 若目标是 **MARKETING_PLATFORM.md** → 读 `references/interview-marketing-platform.md`，按平台优先级逐个过（前置条件：BRAND_MARKETING.md 须已存在）

五者共同要求：
- **访谈体验参考 office-hours，但不照搬其产品诊断内容**：一轮访谈 = 先框定当前维度和目标产物 → 只问一个主问题 → 根据用户回答追问 1-2 个具体例子 / 反面边界 / 取舍原因 → 回放总结并等用户校准 → 再进入下一维度。不要一次把参考问题全抛给用户。
- **单轮只保留一个用户输入点**：即使目标产物缺三块信息，也不要用"先回答 1/2/3"或连续问号压给用户。先问最容易回答的一个问题，等用户开口后再按缺口追问下一块。
- **问题要有推进感**：每轮都说明这个问题会决定文档里的哪一段，用户才知道自己在帮什么东西定型。
- **追问有上限**：主观文件（BRAND / BRAND_MARKETING / MARKETING_PLATFORM）可以像 office-hours 一样追具体、追反例、追取舍；用户仍答得浅时留 TODO，后续真实任务再沉淀。事实文件（SHOP / COMMERCE_PLATFORM）只核对字段和来源，不把事实强行抽象成原则。
- **回放必须暴露取舍**：总结时同时说清楚"这意味着我们会写 X，不写 Y / 避免 Z"；如果出现冲突，列出冲突让用户选，不替用户拍板。
- 全部访谈完成后，按对应模板（`assets/BRAND_template.md` / `assets/SHOP_template.md` / `assets/COMMERCE_PLATFORM_template.md` / `assets/BRAND_MARKETING_template.md` / `assets/MARKETING_PLATFORM_template.md`）渲染成完整草稿
- **整篇展示**给用户，等待确认后再落盘
- 落盘时初始化"修订日志"第一条：`{date}: 初始建立（来源：完整访谈）`

如果是"完善"已有文件：先读现有内容，识别哪些部分稀薄或留有 TODO，再针对性访谈，不要把已经填好的部分推倒重来。

### 模式 B：沉淀更新

**进入条件**：
- 用户对 Agent 之前的输出（设计稿、文案、客服回复、listing、规划等）做出纠正、否定或调整
- 且不只是单点错误（错别字、价格写错），而是反映**品牌偏好**或**店铺事实变更**

**四种分支**：

| 反馈类型 | 目标文件 | 执行流程 |
|---|---|---|
| 品牌偏好（"不像我们""我们品牌应该"） | BRAND.md | 读 `references/distillation-brand.md`，三步：识别 → 抽象 → 归位 |
| 店铺事实变更（"现在处理时间改成 5 天了""退换货改了"） | SHOP.md | 读 `references/update-shop.md`，直接事实更新（无需抽象） |
| 销售平台规则变更（"小红书标题上限是 20 字""这个平台不能自动发客服消息""淘宝主图不能有这些字"） | COMMERCE_PLATFORM.md | 直接定位到对应平台章节更新；缺平台章节时先按模板新增平台 |
| 营销方向调整（"这个人群不对""我们不做这个场景""红线要加一条"） | BRAND_MARKETING.md | 参照 `references/distillation-brand.md` 同样的三步流程，归位到营销策略对应章节 |
| 平台规范变更（"Pinterest 配比改一下""TikTok 不做这个了""加一个新平台"） | MARKETING_PLATFORM.md | 直接定位到对应平台章节更新（规范级变更无需抽象） |

**主动开口问，永远先问、不要静默写入**——示例话术见上方 §模式识别。

---

## 抽象层级原则（仅适用 BRAND.md）

这是 BRAND.md 最关键的判断力。底座保持精炼、不沦为琐碎清单的关键，是把"具体反馈"提升到"普适原则"。

| 维度 | 允许的颗粒度 | ✅ 该保留 | ❌ 太琐碎 |
|---|---|---|---|
| 品牌定位 | 原则级 | "为追求慢生活仪式感的都市女性提供日常茶器" | "30 岁白领，月收入两万以上" |
| 价值主张 | 原则级 | "以匠人手作对抗工业化的同质感" | "产品都是手工做的" |
| 视觉原则 | **可到具体设计令牌** | "主色 #5A6F4A 沉静橄榄绿；低饱和自然色系" | （视觉维度无禁区，可具体） |
| 文案语调 | 原则级 | "像友人分享，温和克制；可文气但不古板" | "开头必须用'亲'"、"少用感叹号" |

> **标点/格式偏好不入底座**："少用感叹号""多用句号""三段一空行"这类标点级偏好应被吸收进更高一级原则（如"温和克制""短句留白"），自然推导即可，不要单独沉淀为原则。**避免词清单例外**——"避免说"列表里可以列具体禁用词（如"亲""绝绝子"），这条规则只针对标点和格式。

抽象的小诀窍——当用户说"这个不对"时，往**深层原因**追问一层。具体追问示例与抽象方法见 `references/distillation-brand.md`。

> **SHOP.md 不需要抽象**——它就是事实档案。"处理时间 5 天"就是 5 天，不要尝试抽象成"高效响应原则"。

---

## 文件结构

### BRAND.md 骨架（四段）
完整模板见 `assets/BRAND_template.md`。

1. **品牌定位**——一句话身份 + 目标用户画像 + 原则
2. **价值主张**——核心价值 + 与众不同 + 原则 + 边界
3. **视觉原则**——整体气质 + 色彩 + 排版/构图 + 原则 + 视觉禁区（此段允许具体）
4. **文案语调**——人格 + 应该说 / 避免说 + 原则

> **概念边界**：「定位 § 一句话身份」回答**结构上**你和别家有何不同（产品形态、客群、工艺、价位）；「价值主张 § 与众不同」回答客户**为什么应该**选你（说服理由、感受）。

### SHOP.md 骨架（六段）
完整模板见 `assets/SHOP_template.md`。

1. **店铺基础**——店铺名 / 平台店铺 URL / 主理人 / 地址 / 注册时间 / 主营品类 / 价位 / 主要市场 / 货币
2. **运营政策**——处理时间 / 运输方式与时长 / 退换货 / 定制
3. **About 页面文本**（线上原文备份）
4. **Shop Announcement / Greeting Message**（线上文本备份 + 季节版本）
5. **节假日工作日历**（停发日期、促销活动参与情况）
6. **合规边界**（不卖什么品类、IP 红线、税务设置）

### COMMERCE_PLATFORM.md 骨架（按销售平台分章）
完整模板见 `assets/COMMERCE_PLATFORM_template.md`，详细契约见 [`../shared/platform-config.md`](../shared/platform-config.md)。

1. **平台总览**——平台 / 状态 / 市场 / 买家语言 / 货币 / 发布方式
2. **默认平台**——默认商品发布平台、默认客服发生地、默认引流平台
3. **平台基础配置**——商品 ID 字段、分享链接字段、自动化边界
4. **商品页规则**——标题 / 描述 / 关键词 / 属性 / 价格
5. **媒体规则**——主图 / 详情图 / 视频 / alt text
6. **订单与客服规则**——订单号、买家标识、发货承诺、客服发送方式、售后
7. **合规红线**——禁售品、IP、功效承诺、广告法或平台政策

### BRAND_MARKETING.md 骨架（六段）
完整模板见 `assets/BRAND_MARKETING_template.md`。

1. **核心定位锚点**——买家视角的根本价值 + 关键人生时刻
2. **我们对谁说话**——P1/P2/P3 目标人群 + 反向排除 + 主理人背书定位
3. **我们说话是为了什么**——情感触点矩阵 + 触点间区分 + 留痕原则
4. **我们说话的"场景"在哪里**——场景表（场景 × 人群 × Listing × 关键词）+ 特殊场景要求
5. **我们呈现什么样的形象**——视觉调性铁律 + 视觉资产圣经 + 文字调性铁律
6. **什么内容我们坚决不做**——违反即销毁的红线清单

> **与 BRAND.md 的边界**：BRAND.md 定义"我们是谁"（身份、价值观、视觉、语调），BRAND_MARKETING.md 定义"我们怎么做营销"（对谁说、说什么、用什么场景、什么绝不做）。两者有交叉（如视觉和调性），但 BRAND_MARKETING.md 是营销执行层面的具体化，不替代 BRAND.md 的品牌原则。

### MARKETING_PLATFORM.md 骨架（按平台分章）
完整模板见 `assets/MARKETING_PLATFORM_template.md`。

每个平台一章，章节结构固定：
1. **用户心理模式**——她在做什么 / 想要什么 / 相信什么 / 警惕什么
2. **内容规范**——视觉/视频规范 + 核心矛盾解答 + 文字规范
3. **内容方向与配比**——类型 × 占比
4. **平台专属红线**
5. **投入节奏**——频率 / 投流策略 / 启动时机
6. **脚本模板**（仅视频平台）——标准视频时间线结构

> **与 BRAND_MARKETING.md 的边界**：BRAND_MARKETING.md 定义跨平台通用原则（人群、触点、场景、红线），MARKETING_PLATFORM.md 定义各平台特有的执行规范。如果某条规范在所有平台都一样，它属于 BRAND_MARKETING.md，不属于这里。

五份文件末尾均追加 **修订日志**，每次更新追加一行：日期 / 改动摘要 / 来源。

---

## 被下游 skill 引用的契约

`listing-catalog` / `orders-customers` / `assets-library` / `pinterest-autopin` 等下游 skill 写文案、客服、做内容前都应读相关基座文件。各 skill 用法不同，但通用契约是：

- **BRAND.md**：决定**怎么说**（语调 / 风格 / 视觉 / 客服姿态 / 边界）。下游严格遵守"应该说"、"避免说"、"原则"段；不替品牌补充原则
- **SHOP.md**：决定**说什么事实**（处理时间 / 运输 / 退换货 / 定制政策 / 节假日 / 合规）。下游引用原文，**绝不自编**事实
- **COMMERCE_PLATFORM.md**：决定**在哪个销售平台怎么卖**（市场 / 买家语言 / 标题长度 / tag 数量 / 图片视频规则 / 订单与客服边界）。下游必须先确认目标平台；非 Etsy / 小红书平台没有配置时不能套内置 preset
- **BRAND_MARKETING.md**：决定**对谁说、说什么**（人群优先级 / 情感触点 / 场景 / 营销红线）。下游做内容时必须能归属到本文件的场景和触点；不发无归属的内容
- **MARKETING_PLATFORM.md**：决定**在各平台怎么做**（规范 / 配比 / 红线 / 节奏）。下游在特定平台创作内容时遵守对应章节的规范

读取范围建议：
- 写商品页 / listing / 客服 → BRAND.md + SHOP.md + COMMERCE_PLATFORM.md
- 做营销内容（Pin / 视频 / 帖子）→ 五份按需读取；商品型内容必须读 COMMERCE_PLATFORM.md，纯品牌内容可只读 BRAND / BRAND_MARKETING / MARKETING_PLATFORM
- 做某平台的具体内容 → BRAND_MARKETING.md + MARKETING_PLATFORM.md 对应章节

下游 skill 在自己的"依赖关系"里只需说明"本 skill 怎么用这几份文件"，不必复述上面这条。

---

## 写入前的硬性约束（四文件共用）

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束。本 skill 追加：

- 落盘时**同步**更新顶部 `最后更新：YYYY-MM-DD` 字段为今天日期
- 完成后用一句话告诉用户改了哪部分，并确认修订日志已更新

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 追加：文件内容、修订日志均使用中文。SHOP.md 的「About 页面文本 / Shop Announcement / Greeting Message」例外——这几段是给海外买家看的，原文为英文，按线上保留即可。
