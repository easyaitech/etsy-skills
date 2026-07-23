---
name: orders-customers
description: 维护电商订单 + 客户两张表（默认位于店铺总 Base 内），并按目标销售平台配置支撑订单处理 / 履约检查 / 客服回复 / 客户标签运营。四种触发：(1) "建订单库 / 客户库"——在店铺总 Base 建表；(2) "录订单 / 新订单 / 小红书订单 / 回头客 / 加备注"——读写 Base；(3) "回客户消息 / 处理差评 / 退货 / 售后 / VIP 群发 / 给某订单的买家发消息 / 按订单号发站内信 / 催评价"——按客服 SOP + BRAND.md 语调 + COMMERCE_PLATFORM.md 平台边界输出回复；Etsy 站内信定稿后可经服务器工具填入回复框（已有会话）或按订单号定位买家代发（主动触达，见 references/etsy-order-message-tool.md）；(4) "这单下一步 / 能不能发货 / 有没有漏 / 履约检查 / 签收跟进 / 复购触达"——按履约 SOP 输出阶段与缺口。多平台架构：每个销售平台一个 preset（见 references/platforms/platform-presets.md），Etsy 和小红书是内置 preset，亚马逊等其他平台需先在 COMMERCE_PLATFORM.md 配置 + 新增对应 preset。
layer: foundation
---

# 订单与客户 (Orders & Customers)

这个 skill 维护电商订单和客户的结构化数据（店铺总 Base 内的 `Orders 订单` / `Customers 客户` 两张表）+ 支撑订单处理 / 履约检查 / 客服 / 客户运营。

**对外的实操接口**：店铺总 Base 内表（用 `lark-base` skill 操作；架构见 `../shared/store-base-architecture.md`；养个店长 Hermes 飞书直聊 runtime 无 lark-cli 时，Base 只读查询走后端 `POST /api/hermes/bitable/record-search` 端点，访问约定见 `../shared/backend-api-access.md`）+ 工作区根目录的 BRAND.md / SHOP.md / COMMERCE_PLATFORM.md（用 `shop-foundation` 维护）。

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 依赖关系

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` | 文案语调 / 客服姿态 / 边界 | 写客服回复时严格遵守"应该说"、"避免说"、"原则"段（特别是处理差评的姿态原则） |
| `<workspace>/SHOP.md` | 处理时间 / 退换货 / 运输 / 定制政策 | 客服回复涉及承诺时引用 SHOP.md 原文，**绝不自编**（避免承诺与店铺政策冲突） |
| `<workspace>/COMMERCE_PLATFORM.md` | 目标销售平台、买家语言、订单客服边界、自动化边界 | 决定订单字段、回复语言、买家消息渠道和哪些动作不能代操作；非内置 preset 平台缺失时阻塞 |
| `Products 商品` 表 | 该订单包含的 SKU 详情 | 处理订单时按订单关联到 SKU（用 lark-base 跨表关联） |
| `logistics-tracking` skill（`track` 命令） | 包裹物流状态 / 签收事实 | 跟踪号录入后交它纳入跟踪；**签收 / delivered 状态以它为准**，不要自己猜或去承运商网页查（会撞号）。履约 SOP 的签收评价、30 天复购触达都依赖它给的签收事实 |
| `references/platforms/platform-presets.md` | 多平台架构与 preset 契约 | 决定读哪个平台 preset、加新平台怎么扩；核心流程平台中性，差异都在 preset |
| `references/order-fulfillment-sop.md` | 新订单到发货、签收跟进的阶段清单 | 新订单 / 待发货订单必须用它判断下一步、缺失证据和要写回的字段 |
| `references/order-handling.md` | 客服回复场景 SOP（平台中性骨架） | 只用于买家消息、差评、退换货、感谢信等话术，不替代履约 SOP；买家语言 / 措辞 / 平台特例看目标平台 preset |
| `references/etsy-reply-draft-tool.md` | Etsy 站内信「飞书定稿 → 插件填入回复框」服务器工具 | 仅目标平台 Etsy、且在飞书对话里给店主定稿**已有会话的回复**时读；读会话上下文 + 定稿后暂存草稿由插件填入，**只填入不发送** |
| `references/etsy-order-message-tool.md` | 给**特定订单的买家**发 Etsy 站内信「飞书定稿 → 插件按订单号定位 → 代发」服务器工具 | 仅目标平台 Etsy、且店主要求**主动给某订单买家发消息**（引导评价 / 延迟告知等）时读；**只要有订单号就能发，不需要买家会话信息**；店主逐字确认后**真实代发** |
| `references/platforms/<platform>.md` | 目标平台 preset（订单号 / 买家语言 / 承诺发货来源 / 消息边界 / 标签阈值） | 每次处理订单 / 客服前读对应平台 preset；内置 `platforms/etsy.md` / `platforms/xiaohongshu.md`，其他平台缺 preset 时阻塞 |

---

## 多平台架构

这个 skill 的核心流程**平台中性**：`SKILL.md` 的模式、`order-handling.md` 的客服骨架、`order-fulfillment-sop.md` 的履约阶段、`base-schema.md` 的通用字段、`customer-tags.md` 的标签体系——对任何平台都一样。任何平台特有的东西（买家语言、订单号 / 买家标识解析、承诺发货时间来源、消息 / 售后入口、消息媒体限制、平台专属字段、价值标签阈值、自动化边界）都放在**该平台的 preset** `references/platforms/<platform>.md`。

- 内置 preset：[`etsy.md`](references/platforms/etsy.md)、[`xiaohongshu.md`](references/platforms/xiaohongshu.md)。Etsy 不是隐性默认平台——它和小红书、亚马逊一样只是一个 preset。
- 每次任务先按 `COMMERCE_PLATFORM.md` 的「目标销售平台」解析出 preset（多平台并行时先和用户确认这次处理哪个平台），preset 优先级高于核心流程的中性默认。
- 加亚马逊等新平台 = 在 `COMMERCE_PLATFORM.md` 配置 + 新增一个 `references/platforms/<platform>.md`（照 [`references/platforms/platform-presets.md`](references/platforms/platform-presets.md) 的 12 项契约）+ 按需在 `base-schema.md` 追加平台字段组 / 平台专属视图——**不改流程逻辑文件**（SKILL / order-handling / order-fulfillment-sop）；`base-schema.md` 是唯一按平台增长的核心文件，但只增量、不改通用部分。
- 非内置 preset 平台缺配置时按 `../shared/dependency-protocol.md` 走 **BLOCK**，不要拿 Etsy / 小红书规则硬套。

---

## 四种执行模式

### 模式 A：建表（首次建立订单 / 客户表）

**进入条件**：项目下尚无对应的 `Orders 订单` 表或 `Customers 客户` 表。

**执行步骤**：
1. 读 `../shared/store-base-architecture.md` 和 `references/base-schema.md`，了解店铺总 Base + 订单 / 客户表字段
2. 按 `COMMERCE_PLATFORM.md` 的目标平台读对应 preset（`references/platforms/<platform>.md`，见 [`references/platforms/platform-presets.md`](references/platforms/platform-presets.md)）；如果该平台有专属字段组（如小红书），创建表时必须一并加建 `base-schema.md` 的对应「平台专属字段组」
3. 解析工作区根并读取 `<workspace>/docs/store-base.md`：
   - 若店铺总 Base 已存在：在其中创建或补齐 `Orders 订单` / `Customers 客户` 表
   - 若店铺总 Base 不存在：先展示 one-shop-one-base 方案，等用户确认后再创建 `{店铺名}-运营中枢`
   - 迁移期若发现旧独立订单 / 客户数据源，可作为 legacy fallback 查询，但新写入优先进入店铺总 Base
4. 客户表与订单表建立**关联关系**（订单的 `客户` 字段 → `Customers 客户` 主键）
5. 按下方“默认视图字段”分别设置 `Orders 订单` / `Customers 客户` 的默认 Grid View
6. 落盘后告诉用户店铺总 Base 链接、表名、字段清单和默认视图设置

> **不要硬塞无关字段**——通用核心字段必建；启用某平台且其 preset 定义了「平台专属字段组」时，该组也必建但可以先为空（如小红书字段组）；其他平台辅助字段后续按需补。

### `Orders 订单` / `Customers 客户` 默认视图字段

建表、补字段或整理字段时，默认视图只服务人日常处理订单和客户；平台原始字段、核算字段、自动化状态字段默认隐藏，按履约 / 财务 / 排障另开视图。

已有表若使用 `平台`、`客户名称`、`总金额 (HKD)`、`Etsy Username`、`主要地址国家` 等本地别名，按对应规范字段处理；整理视图不为了统一命名而重命名字段。

`Orders 订单` 默认人读视图：`订单号`、`销售平台`、`平台订单号`、`客户`、`下单日`、`状态`、`SKU 列表`、`总金额`、`运输方式`、`承诺发货日`、`跟踪号`、`快递公司`、`收件地区`、`定制需求`、`客服记录`、`备注`。

`Orders 订单` 履约视图：`订单号`、`销售平台`、`客户`、`状态`、`SOP 阶段`、`买家确认状态`、`出货清单`、`确认照片链接`、`承诺发货日`、`发货日期`、`跟踪号`、`快递公司`、`签收日期`、`签收评价消息状态`、`30天复购消息状态`。

`Orders 订单` 默认隐藏但保留：`平台包裹 ID`、`平台订单状态`、`订单币种`、`核算币种`、`订单汇率`、`总金额(核算币种)`、`实际运费成本`、`平台字段 JSON`、小红书订单 / 包裹 / SKU / 收件 / 物流 / 售后原始字段、`openAddressId`、拆单 / 海关 / 售后 JSON，以及只给 cron / SOP 自动化读取的提醒状态字段。

`Customers 客户` 默认人读视图：`客户 ID`、`销售平台`、`平台用户名 / 昵称`、`名称`、`首次下单日`、`订单数`、`累计金额`、`客户标签`、`主要地址国家 / 地区`、`偏好备忘`、`最近互动日`、`客服备忘`。

`Customers 客户` 默认隐藏但保留：`平台客户 ID`、`首次接触渠道`、任何平台原始买家 ID / 同步字段 / 隐私字段。需要分群或排障时再放入专用视图。

### 模式 B：录入 / 更新

**进入条件**：用户口述新订单 / 新客户 / 订单状态变更 / 给客户加标签。

**执行步骤**：
- 读 `references/base-schema.md` 确认字段语义
- 确认目标销售平台并读对应 preset（`references/platforms/<platform>.md`）——订单号 / 买家标识怎么解析、承诺发货时间从哪取，都按 preset，不要跨平台套字段名
- 如果 `COMMERCE_PLATFORM.md` 缺失（按 [`references/platforms/platform-presets.md`](references/platforms/platform-presets.md) §preset 解析）：
  - 目标平台是 Etsy / 小红书 → 用内置 preset，并说明这是内置 {平台} 规则
  - 目标平台不是内置 preset → 停止并提示用户先建立 COMMERCE_PLATFORM.md + 该平台 preset
- 如果是新订单或订单状态进入 `待发货`，同时读 `references/order-fulfillment-sop.md`，输出当前 SOP 阶段、下一步、缺失证据和拟写回字段
- 用 lark-base 写入或更新对应行——**本 turn 内先落库拿到成功返回，再对用户说"已录入 / 已改"**（遵守 [`../shared/store-base-architecture.md`](../shared/store-base-architecture.md) §Base 写穿不变量；只在对话里答应、Base 没动 = 没做完）；写完带一句回执，**回执必须含一条可点击的飞书 Base 链接**（优先深链到该订单 / 客户记录，方便用户点进去核对；不暴露原始 ID），写失败如实说明
- 涉及客户首次出现：先在 `Customers 客户` 表建行，再在 `Orders 订单` 表关联
- 涉及客户标签：参考 `references/customer-tags.md`，按统一标签体系打标，**不要随手发明新标签**（标签膨胀会让分群失效）

### 模式 C：客服 + 标签运营

**进入条件**：
- 写客服回复（询盘 / 投诉 / 退货 / 定制咨询 / 感谢信 / 节日问候）
- 处理差评
- 按标签筛选客户做分群运营（VIP 优先发货、回头客二次触达等）

**执行步骤**：
1. 先**查上下文**：从 `Orders 订单` 表取该订单详情 + `Customers 客户` 表取客户标签和历史
2. 读 BRAND.md（客服姿态 / 文案语调）+ SHOP.md（政策原文）+ COMMERCE_PLATFORM.md（平台买家语言 / 消息渠道 / 自动化边界）
3. 读 `references/order-handling.md`：按场景找 SOP（差评 / 退货 / 定制等）
4. 输出客服回复草稿（买家语言按目标平台 preset 的「买家语言」，最终以 COMMERCE_PLATFORM.md 为准），整篇展示给用户
5. 用户确认后，**用户自己**复制到目标平台后台 / 客服入口发送（本 skill 不替操作平台）。**Etsy 站内信在飞书对话里定稿时有两个例外**（都以用户逐字确认文本为唯一人工闸，未定稿不得暂存）：
   - **回复已有会话** → [`references/etsy-reply-draft-tool.md`](references/etsy-reply-draft-tool.md)：草稿自动填进 Etsy 回复框，省掉复制粘贴，**发送仍由用户手动点击**
   - **主动给某订单的买家发消息**（引导评价 / 告知延迟等）→ [`references/etsy-order-message-tool.md`](references/etsy-order-message-tool.md)：用户给订单号，插件按订单号在订单页定位买家并**代为发送**。**只要拿到订单号就能发——不要向用户索要买家会话信息 / 会话 id**
6. 落地（**回写要真正落进 Base，不是只在对话里记下**——遵守 [`../shared/store-base-architecture.md`](../shared/store-base-architecture.md) §Base 写穿不变量）：
   - 把回复要点 + 用户最终发出的版本回写到 `Orders 订单` 表的"客服记录"字段；用 lark-base 写入拿到成功返回后带一句回执（**含可点击的飞书 Base 链接**，优先深链到该订单记录）
   - 如果该次互动反映客户特征（VIP、定制粉、投诉户），更新 `Customers 客户` 表标签

### 模式 D：订单履约 SOP 检查

**进入条件**：
- 用户问某订单下一步 / 有没有漏 / 能不能发货
- 新订单需要从确认内容推进到制作、出货确认、打包、发货、签收跟进
- `Orders 订单` 表的 `SOP 阶段`、确认照片、跟踪号或 `签收评价消息状态` 缺失；`打包视频` 只有在本单明确要求留证/用户要求/已选择录制社媒素材时才作为缺口

**执行步骤**：
1. 先查 `Orders 订单` 表、`Customers 客户` 表、`Products 商品` 表，拿到订单状态、SKU、定制需求、承诺发货日、跟踪号和客户标签
2. 读 `references/order-fulfillment-sop.md` + 目标平台 preset（`references/platforms/<platform>.md`，承诺发货时间来源按 preset）
3. **签收状态以 `logistics-tracking` 为准**：涉及"是否已签收 / delivered"时用 `track` 查询（见 `../logistics-tracking`），不要自己猜或去承运商网页查；签收事实驱动签收评价、30 天复购两个触点
4. 按 SOP 输出：
   - 当前阶段
   - 下一步动作
   - 缺失证据或字段（如确认照片、出货清单、跟踪号、签收跟进日期；打包视频仅在本单明确要求时列为缺口）
   - 是否需要用户或买家确认
   - 拟写回 `Orders 订单` 表的字段预览
5. 如果需要给买家发消息，再读 `references/order-handling.md`、BRAND.md、SHOP.md、目标平台 preset 起草对应买家语言的消息
6. 等用户确认后才写 Base；不要替用户在平台后台发消息、发货、退款或售后审核

> **关于"主动消息"的触达机制（别误解）**：本 skill 是**请求触发**的，不在后台驻留定时器。四类主动消息（下单确认 / 临期发货提醒 / 签收评价 / 30 天复购）落地方式是——把待办状态字段写进 `Orders 订单` 表，让对应记录进入 `base-schema.md` 的待办视图（`临期/超期待发` / `待发货` / `待签收跟进` / `待复购触达`）。真正的"到点触达"靠两条之一：① 运营每天看这些视图按待办处理；② 配了 Hermes cron 时，由 cron 定时扫视图把到期项推给运营核查（cron 例外见 `../shared/preamble.md`）。skill 本身只负责把订单放进正确的待办视图 + 出草稿，**不承诺自己会在未来某刻自动发出**。

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束，**Base 写穿不变量**见 [`../shared/store-base-architecture.md`](../shared/store-base-architecture.md)（改动没真正写进 Base 不算完成，落库与确认同 turn 收口，写完带回执）。本 skill 特有禁区：

- **不替用户发平台消息 / 发货 / 退款 / 售后审核**：只产文案 + 维护 Base；真实操作由用户在平台后台、ERP 或专门平台 skill 执行。两个**仅限 Etsy 站内信**的例外，都要求用户在飞书里**逐字确认过文本**（那次确认是唯一人工闸）：① `references/etsy-reply-draft-tool.md` 的「填入回复框」不是发送，发送归用户；② `references/etsy-order-message-tool.md` 按订单号给买家发消息**是真实代发**——未经用户确认文本绝不调用，超时 / 报错绝不盲目重投（宁可漏发也不双发）
- **客户隐私**：邮箱、地址、订单号属敏感数据——Agent 输出里用脱敏写法（如 `订单 #****1234`），不要大段重复
- **改 Base 用 lark-base 的 diff 风格预览** → 等确认 → 落盘 → 回执；不要只在对话里报改动而不写 Base
- **客服回复**：用户自己复制到目标平台后台 / 客服入口发送；发出后用户最终版本回写到 `Orders 订单` 表的"客服记录"字段

---

## 与 shop-foundation 的回流关系

客服处理过程中如果用户**纠正**了 Agent 的回复（"语气太冷"、"不该这么快道歉"），按 shop-foundation 的沉淀流程（`../shop-foundation/references/distillation-brand.md`）提示：

> 「这次的纠正反映客服姿态的偏好。要沉淀进 BRAND.md 文案语调段吗？」

如果用户提到"以后这种情况都这样处理"，可以提议沉淀成 SOP（未来的 playbook skill 范畴）；当前先记到 `Customers 客户` 表的"客服备忘"字段，等 SOP skill 上线后批量整理。

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：客服回复的买家可见语言由 COMMERCE_PLATFORM.md 的「买家语言」决定，缺配置时回退到目标平台 preset 的「买家语言」默认值（Etsy 英文 / 小红书中文 / 其他平台见各自 preset）。Base 字段标签中英混用（参考 schema 文件）。
