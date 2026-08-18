---
name: orders-customers
description: 维护电商订单 + 客户两张表（默认位于店铺总 Base 内），并按内置 Etsy preset 支撑订单处理 / 履约检查 / 客服回复 / 客户标签运营。四种触发：(1) "建订单库 / 客户库"——在店铺总 Base 建表；(2) "录订单 / 新订单 / 小红书订单 / 回头客 / 加备注"——读写 Base；(3) "回客户消息 / 处理差评 / 退货 / 售后 / VIP 群发 / 给某订单的买家发消息 / 按订单号或快递单号发站内信 / 催评价"——按客服 SOP + BRAND.md 语调 + 内置 Etsy preset 平台边界输出回复；Etsy 客户消息统一通过正式获取与真实发布工具处理，可按客户 ID、订单号、快递单号或 Etsy 数字买家 ID 定位，也可不指名道姓列最近来往会话（见 references/etsy-message-tools.md）；(4) "这单下一步 / 能不能发货 / 有没有漏 / 履约检查 / 签收跟进 / 复购触达"——按履约 SOP 输出阶段与缺口；"这单寄到哪 / 完整收货地址 / 门牌 / 邮编 / 收件电话 / 买家叫什么"这类平台事实，Etsy 用 `get_etsy_orders` 现查（见 references/etsy-order-read.md），Base 按隐私规则本就不存完整地址。销售平台固定 Etsy，规则以内置 Etsy preset 为准（见 references/platforms/platform-presets.md）；小红书 preset 封存（产品决策 2026-07-24），仅未来解封后启用。
layer: foundation
---

# 订单与客户 (Orders & Customers)

这个 skill 维护电商订单和客户的结构化数据（店铺总 Base 内的 `Orders 订单` / `Customers 客户` 两张表）+ 支撑订单处理 / 履约检查 / 客服 / 客户运营。

**对外的实操接口**：店铺总 Base 内表（用 `lark-base` skill 操作；架构见 `../shared/store-base-architecture.md`；养个店长 Hermes 飞书直聊 runtime 无 lark-cli 时，Base 只读查询走后端 `POST /api/hermes/bitable/record-search` 端点，访问约定见 `../shared/backend-api-access.md`）+ 工作区根目录的 BRAND.md / SHOP.md（用 `shop-foundation` 维护）。

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 依赖关系

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` | 文案语调 / 客服姿态 / 边界 | 写客服回复时严格遵守"应该说"、"避免说"、"原则"段（特别是处理差评的姿态原则） |
| `<workspace>/SHOP.md` | 处理时间 / 退换货 / 运输 / 定制政策 | 客服回复涉及承诺时引用 SHOP.md 原文，**绝不自编**（避免承诺与店铺政策冲突） |
| [`../shared/platform-config.md`](../shared/platform-config.md) | 销售平台契约（固定 Etsy）与内置 preset 索引 | 平台固定 Etsy：订单字段、回复语言、买家消息渠道和哪些动作不能代操作一律以内置 Etsy preset 为准 |
| `Products 商品` 表 | 该订单包含的 SKU 详情 | 处理订单时按订单关联到 SKU（用 lark-base 跨表关联） |
| `logistics-tracking` skill（`track` 命令） | 包裹物流状态 / 签收事实 | 跟踪号录入后交它纳入跟踪；**签收 / delivered 状态以它为准**，不要自己猜或去承运商网页查（会撞号）。履约 SOP 的签收评价、30 天复购触达都依赖它给的签收事实 |
| `references/platforms/platform-presets.md` | preset 契约与索引 | 销售平台固定 Etsy，直接用 `platforms/etsy.md`；核心流程平台中性，平台差异都在 preset |
| `references/order-fulfillment-sop.md` | 新订单到发货、签收跟进的阶段清单 | 新订单 / 待发货订单必须用它判断下一步、缺失证据和要写回的字段 |
| `references/order-handling.md` | 客服回复场景 SOP（平台中性骨架） | 只用于买家消息、差评、退换货、感谢信等话术，不替代履约 SOP；买家语言 / 措辞 / 平台特例看目标平台 preset |
| `references/etsy-message-tools.md` | Etsy 客户消息正式获取与真实发布工具 | 仅目标平台 Etsy 且需要读取或发送客户消息时读；按 `customerId`、订单号、快递单号或 Etsy 数字买家 ID 唯一定位 customer（还没下单的潜在客户走合成身份 `etsy-buyer:<数字ID>`，读和发都可用），获取完整双向文字消息或真实发送文字消息；"最近有谁来问 / 谁在等我回复"这类不指名道姓的问题用 `scope="recent"` 列表模式 |
| `references/etsy-order-read.md` | Etsy 当前订单事实统一读取 | 目标平台 Etsy 且要查当前订单、履约或送达状态时读；统一调用 `get_etsy_orders`，New / Completed 只作内部证据来源。**Base 按隐私规则不存的完整收货地址 / 门牌 / 邮编 / 收件电话也在这里现查**（`fullAddress` / `phone`），不要因为 Base 里只有国家或城市就说查不到 |
| `references/platforms/etsy.md` | Etsy preset（订单号 / 买家语言 / 承诺发货来源 / 消息边界 / 标签阈值） | 每次处理订单 / 客服前读；`platforms/xiaohongshu.md` 已封存（产品决策 2026-07-24），仅未来解封后启用 |

---

## 平台 preset 架构

这个 skill 的核心流程**平台中性**：`SKILL.md` 的模式、`order-handling.md` 的客服骨架、`order-fulfillment-sop.md` 的履约阶段、`base-schema.md` 的通用字段、`customer-tags.md` 的标签体系——对任何平台都一样。任何平台特有的东西（买家语言、订单号 / 买家标识解析、承诺发货时间来源、消息 / 售后入口、消息媒体限制、平台专属字段、价值标签阈值、自动化边界）都放在**该平台的 preset** `references/platforms/<platform>.md`。

- 内置 preset：[`etsy.md`](references/platforms/etsy.md)（唯一启用）、[`xiaohongshu.md`](references/platforms/xiaohongshu.md)（封存，产品决策 2026-07-24，仅未来解封后启用）。
- 销售平台固定 Etsy（契约见 [`../shared/platform-config.md`](../shared/platform-config.md)）：每次任务直接用内置 Etsy preset，无需确认目标平台；preset 优先级高于核心流程的中性默认。
- 未来真要开放新平台时按 [`references/platforms/platform-presets.md`](references/platforms/platform-presets.md) 的 12 项契约接入；当前不为多平台做任何预留设计。

---

## 四种执行模式

### 模式 A：建表（首次建立订单 / 客户表）

**进入条件**：项目下尚无对应的 `Orders 订单` 表或 `Customers 客户` 表。

**执行步骤**：
1. 读 `../shared/store-base-architecture.md` 和 `references/base-schema.md`，了解店铺总 Base + 订单 / 客户表字段
2. 读内置 Etsy preset（[`references/platforms/etsy.md`](references/platforms/etsy.md)，见 [`references/platforms/platform-presets.md`](references/platforms/platform-presets.md)）；Etsy 无平台专属字段组，通用核心字段即可（见 preset 契约 #4）
3. 解析工作区根并读取 `<workspace>/docs/store-base.md`：
   - 若店铺总 Base 已存在：在其中创建或补齐 `Orders 订单` / `Customers 客户` 表
   - 若店铺总 Base 不存在：先展示 one-shop-one-base 方案，等用户确认后再创建 `{店铺名}-运营中枢`
   - 迁移期若发现旧独立订单 / 客户数据源，可作为 legacy fallback 查询，但新写入优先进入店铺总 Base
4. 客户表与订单表建立**关联关系**（订单的 `客户` 字段 → `Customers 客户` 主键）
5. 按下方“默认视图字段”分别设置 `Orders 订单` / `Customers 客户` 的默认 Grid View
6. 落盘后告诉用户店铺总 Base 链接、表名、字段清单和默认视图设置

> **不要硬塞无关字段**——通用核心字段必建；小红书字段组仅在未来小红书解封启用时必建（当前封存，见 [`../shared/platform-config.md`](../shared/platform-config.md)），辅助字段按需补。

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
- 读内置 Etsy preset（`references/platforms/etsy.md`）——订单号 / 买家标识怎么解析、承诺发货时间从哪取，都按 preset，不要跨平台套字段名
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
1. 先**查上下文**：从 `Orders 订单` 表取该订单详情 + `Customers 客户` 表取客户标签和历史；目标平台是 Etsy 时，再按 [`references/etsy-message-tools.md`](references/etsy-message-tools.md) 调正式获取工具读取该 customer 的双向消息，不能只凭订单客服记录起草回复
2. 读 BRAND.md（客服姿态 / 文案语调）+ SHOP.md（政策原文）；平台买家语言 / 消息渠道 / 自动化边界按内置 Etsy preset（`references/platforms/etsy.md`）
3. 读 `references/order-handling.md`：按场景找 SOP（差评 / 退货 / 定制等）
4. 输出客服回复草稿（买家语言默认英文，按内置 Etsy preset 的「买家语言」），整篇展示给用户
5. 用户确认后，**用户自己**复制到目标平台后台 / 客服入口发送（本 skill 不替操作平台）。Etsy 是唯一例外：按 [`references/etsy-message-tools.md`](references/etsy-message-tools.md) 调正式发布工具**真实发送**。⚠️ 调用发布工具**不等于发出去了**：后端会把最终稿做成一张**店主确认卡**发到店主飞书（逐字正文 + 图片 + 确认/修改/取消三个按钮），店主点「确认发送」才真的发。拿到 `status=awaiting_confirmation` 就告诉店主去点那张卡并结束本轮，绝不能说成已发送、也不要换幂等键再提交一次（见该文档 §4.1）。用户已经给出明确收件目标和完整原文并要求发送时，该请求本身就是授权，不重复确认；如果正文由你起草或修改，必须先完整展示并取得明确确认。可用 `customerId`、订单号、快递单号或 Etsy 数字买家 ID 定位（潜在客户没下过单也照常可发，见该文档），不向用户索要 Etsy 会话 ID。**买家一句话没说过、直接下单的，也能主动给他发**：这类买家在 Etsy 上根本没有会话，`get` 给不出 `conversationId`——改用 `selector` 按订单号且**整个不传 `conversationId`**，系统会从那张订单发起第一条会话（只支持纯文字，见该文档 §4）。绝不要因为「取不到会话 ID」就告诉店主发不了，也不要让店主自己去 Etsy 手动发。
6. 落地（**回写要真正落进 Base，不是只在对话里记下**——遵守 [`../shared/store-base-architecture.md`](../shared/store-base-architecture.md) §Base 写穿不变量）：
   - 把回复要点 + 用户最终发出的版本回写到 `Orders 订单` 表的"客服记录"字段；用 lark-base 写入拿到成功返回后带一句回执（**含可点击的飞书 Base 链接**，优先深链到该订单记录）
   - 如果该次互动反映客户特征（VIP、定制粉、投诉户），更新 `Customers 客户` 表标签

### 模式 D：订单履约 SOP 检查

**进入条件**：
- 用户问某订单下一步 / 有没有漏 / 能不能发货
- 新订单需要从确认内容推进到制作、出货确认、打包、发货、签收跟进
- `Orders 订单` 表的 `SOP 阶段`、确认照片、跟踪号或 `签收评价消息状态` 缺失；`打包视频` 只有在本单明确要求留证/用户要求/已选择录制社媒素材时才作为缺口

**执行步骤**：
1. 先查 `Orders 订单` 表、`Customers 客户` 表、`Products 商品` 表，拿到内部记录；目标平台是 Etsy 时再读 `references/etsy-order-read.md` 并调用 `get_etsy_orders` 获取当前平台事实。Base 与 Etsy 不一致时显式报告差异，不拿 Base 代替线上状态
2. 读 `references/order-fulfillment-sop.md` + 内置 Etsy preset（`references/platforms/etsy.md`，承诺发货时间来源按 preset）
3. **签收状态以 `logistics-tracking` 为准**：涉及"是否已签收 / delivered"时用 `track` 查询（见 `../logistics-tracking`），不要自己猜或去承运商网页查；签收事实驱动签收评价、30 天复购两个触点
4. 按 SOP 输出：
   - 当前阶段
   - 下一步动作
   - 缺失证据或字段（如确认照片、出货清单、跟踪号、签收跟进日期；打包视频仅在本单明确要求时列为缺口）
   - 是否需要用户或买家确认
   - 拟写回 `Orders 订单` 表的字段预览
5. 如果需要给买家发消息，再读 `references/order-handling.md`、BRAND.md、SHOP.md、内置 Etsy preset 起草英文消息
6. 等用户确认后才写 Base；不要替用户在平台后台退款或做售后审核。Etsy 有两项正式工具例外：文字消息按 [`references/etsy-message-tools.md`](references/etsy-message-tools.md) 处理；店主明确要求录入发货时，逐项核实订单号、承运商、跟踪号和发货日期后调用 `etsy_order_shipment_submit`。submit 只建任务并发店主确认卡，拿到 `awaiting_confirmation` 就停止并提示店主点卡，不能说成 Etsy 已完成发货。其余平台发货与消息仍由用户自行操作

> **关于"主动消息"的触达机制（别误解）**：本 skill 是**请求触发**的，不在后台驻留定时器。四类主动消息（下单确认 / 临期发货提醒 / 签收评价 / 30 天复购）落地方式是——把待办状态字段写进 `Orders 订单` 表，让对应记录进入 `base-schema.md` 的待办视图（`临期/超期待发` / `待发货` / `待签收跟进` / `待复购触达`）。真正的"到点触达"靠两条之一：① 运营每天看这些视图按待办处理；② 配了 Hermes cron 时，由 cron 定时扫视图把到期项推给运营核查（cron 例外见 `../shared/preamble.md`）。skill 本身只负责把订单放进正确的待办视图 + 出草稿，**不承诺自己会在未来某刻自动发出**。

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束，**Base 写穿不变量**见 [`../shared/store-base-architecture.md`](../shared/store-base-architecture.md)（改动没真正写进 Base 不算完成，落库与确认同 turn 收口，写完带回执）。本 skill 特有禁区：

- **不替用户做未受控的平台消息 / 发货 / 退款 / 售后审核**：只产文案 + 维护 Base；真实操作由用户在平台后台、ERP 或专门平台 skill 执行。Etsy 有且只有两项确认卡受控例外：① [`references/etsy-message-tools.md`](references/etsy-message-tools.md) 的正式消息工具；② `etsy_order_shipment_submit` 发货录入工具。两者拿到 `awaiting_confirmation` 都只代表确认卡已创建，不代表消息已发送或订单已完成发货；必须等待店主点卡。消息工具同一发送意图始终复用同一个幂等键查询状态，`queued` / `dispatched` 不得声称已发送，`result_unknown` 绝不自动重发。退款与售后审核没有例外。
- **客户隐私**：邮箱、地址、订单号属敏感数据——Agent 输出里用脱敏写法（如 `订单 #****1234`），不要大段重复。**唯一例外**：店主本人为发货 / 打单 / 核对地址而问自己订单的收件信息时，完整展示现查到的 `fullAddress` / `phone` 原文，不脱敏、不打码（脱敏到店主自己都用不了，就是把工具作废）；写进 Base、发给买家、放进对外文案或分享给第三方时，仍按脱敏写法。现查到的完整地址 / 电话**一律不回写 Base**（Base 只存 `收件地区`，见 [`references/base-schema.md`](references/base-schema.md)）。详见 [`references/etsy-order-read.md`](references/etsy-order-read.md) §隐私边界
- **改 Base 用 lark-base 的 diff 风格预览** → 等确认 → 落盘 → 回执；不要只在对话里报改动而不写 Base
- **客服回复**：除 Etsy 正式发布工具外，用户自己复制到目标平台后台 / 客服入口发送；Etsy 按新工具真实发送。发出后把用户最终版本回写到 `Orders 订单` 表的"客服记录"字段

---

## 与 shop-foundation 的回流关系

客服处理过程中如果用户**纠正**了 Agent 的回复（"语气太冷"、"不该这么快道歉"），按 shop-foundation 的沉淀流程（`../shop-foundation/references/distillation-brand.md`）提示：

> 「这次的纠正反映客服姿态的偏好。要沉淀进 BRAND.md 文案语调段吗？」

如果用户提到"以后这种情况都这样处理"，可以提议沉淀成 SOP（未来的 playbook skill 范畴）；当前先记到 `Customers 客户` 表的"客服备忘"字段，等 SOP skill 上线后批量整理。

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：客服回复的买家可见语言默认英文（Etsy），以内置 Etsy preset 的「买家语言」为准。Base 字段标签中英混用（参考 schema 文件）。
