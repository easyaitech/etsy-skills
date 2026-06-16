---
name: orders-customers
description: 维护电商订单 + 客户的两份飞书 Base，并按目标销售平台配置支撑订单处理 / 履约检查 / 客服回复 / 客户标签运营。三种触发：(1) "建订单库 / 客户库"——建两个 Base；(2) "录订单 / 新订单 / 小红书订单 / 回头客 / 加备注"——读写 Base；(3) "回客户消息 / 处理差评 / 退货 / 售后 / VIP 群发"——按客服 SOP + BRAND.md 语调 + COMMERCE_PLATFORM.md 平台边界输出回复。Etsy 和小红书是内置平台 preset，其他平台必须先有平台配置。
layer: foundation
---

# 订单与客户 (Orders & Customers)

这个 skill 维护电商订单和客户的结构化数据（飞书 Base × 2）+ 支撑订单处理 / 履约检查 / 客服 / 客户运营。

**对外的实操接口**：飞书 Base（用 `lark-base` skill 操作）+ 工作区根目录的 BRAND.md / SHOP.md / COMMERCE_PLATFORM.md（用 `shop-foundation` 维护）。

> 共享引导（版本检查 / 工作区解析 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 依赖关系

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` | 文案语调 / 客服姿态 / 边界 | 写客服回复时严格遵守"应该说"、"避免说"、"原则"段（特别是处理差评的姿态原则） |
| `<workspace>/SHOP.md` | 处理时间 / 退换货 / 运输 / 定制政策 | 客服回复涉及承诺时引用 SHOP.md 原文，**绝不自编**（避免承诺与店铺政策冲突） |
| `<workspace>/COMMERCE_PLATFORM.md` | 目标销售平台、买家语言、订单客服边界、自动化边界 | 决定订单字段、回复语言、买家消息渠道和哪些动作不能代操作；非 Etsy / 小红书平台缺失时阻塞 |
| 商品 Base | 该订单包含的 SKU 详情 | 处理订单时按订单关联到 SKU（用 lark-base 跨表关联） |
| `references/order-fulfillment-sop.md` | 新订单到发货、签收跟进的阶段清单 | 新订单 / 待发货订单必须用它判断下一步、缺失证据和要写回的字段 |
| `references/order-handling.md` | 客服回复场景 SOP | 只用于买家消息、差评、退换货、感谢信等话术，不替代履约 SOP |
| `references/xiaohongshu-orders.md` | 小红书订单 / 履约 / 售后字段和边界 | 目标平台是小红书时必读；不要把 Etsy 订单号、username、ship-by 规则套给小红书 |

---

## 四种执行模式

### 模式 A：建库（首次建立两个 Base）

**进入条件**：项目下尚无对应的订单 Base 或客户 Base。

**执行步骤**：
1. 读 `references/base-schema.md`，了解订单 Base + 客户 Base 字段
2. 如果目标平台包含小红书，读 `references/xiaohongshu-orders.md`；创建 Base 时必须加建 `base-schema.md` 的“小红书字段”分组
3. 用 lark-base skill 创建两个 Base（建议同一个云空间目录下）：
   - `{店铺名}-订单库`
   - `{店铺名}-客户库`
4. 客户 Base 与订单 Base 建立**关联关系**（订单的 `客户` 字段 → 客户 Base 主键）
5. 落盘后告诉用户两个 Base 的链接 + 字段清单

> **不要硬塞无关字段**——通用核心字段必建；启用小红书时，小红书字段分组也必建但可以先为空；其他平台辅助字段后续按需补。

### 模式 B：录入 / 更新

**进入条件**：用户口述新订单 / 新客户 / 订单状态变更 / 给客户加标签。

**执行步骤**：
- 读 `references/base-schema.md` 确认字段语义
- 确认目标销售平台；目标平台是小红书时先读 `references/xiaohongshu-orders.md`
- 如果 `COMMERCE_PLATFORM.md` 缺失：
  - 目标平台是 Etsy → 可继续使用内置 Etsy preset，并说明这是内置 Etsy 规则
  - 目标平台是小红书 → 可继续使用内置小红书 preset，并说明这是内置小红书规则
  - 目标平台不是 Etsy / 小红书 → 停止并提示用户先建立 COMMERCE_PLATFORM.md
- 如果是新订单或订单状态进入 `待发货`，同时读 `references/order-fulfillment-sop.md`，输出当前 SOP 阶段、下一步、缺失证据和拟写回字段
- 用 lark-base 写入或更新对应行
- 涉及客户首次出现：先在客户 Base 建行，再在订单 Base 关联
- 涉及客户标签：参考 `references/customer-tags.md`，按统一标签体系打标，**不要随手发明新标签**（标签膨胀会让分群失效）

### 模式 C：客服 + 标签运营

**进入条件**：
- 写客服回复（询盘 / 投诉 / 退货 / 定制咨询 / 感谢信 / 节日问候）
- 处理差评
- 按标签筛选客户做分群运营（VIP 优先发货、回头客二次触达等）

**执行步骤**：
1. 先**查上下文**：从订单 Base 取该订单详情 + 客户 Base 取客户标签和历史
2. 读 BRAND.md（客服姿态 / 文案语调）+ SHOP.md（政策原文）+ COMMERCE_PLATFORM.md（平台买家语言 / 消息渠道 / 自动化边界）
3. 读 `references/order-handling.md`：按场景找 SOP（差评 / 退货 / 定制等）
4. 输出客服回复草稿（语言按目标平台配置；Etsy preset 默认英文，小红书 preset 默认中文），整篇展示给用户
5. 用户确认后，**用户自己**复制到目标平台后台 / 客服入口发送（本 skill 不替操作平台）
6. 落地：
   - 把回复要点 + 用户最终发出的版本回写到订单 Base 的"客服记录"字段
   - 如果该次互动反映客户特征（VIP、定制粉、投诉户），更新客户 Base 标签

### 模式 D：订单履约 SOP 检查

**进入条件**：
- 用户问某订单下一步 / 有没有漏 / 能不能发货
- 新订单需要从确认内容推进到制作、出货确认、打包、发货、签收跟进
- 订单 Base 的 `SOP 阶段`、确认照片、打包视频、跟踪号或评价跟进状态缺失

**执行步骤**：
1. 先查订单 Base、客户 Base、商品 Base，拿到订单状态、SKU、定制需求、承诺发货日、跟踪号和客户标签
2. 读 `references/order-fulfillment-sop.md`
3. 按 SOP 输出：
   - 当前阶段
   - 下一步动作
   - 缺失证据或字段（如确认照片、出货清单、打包视频、跟踪号、签收跟进日期）
   - 是否需要用户或买家确认
   - 拟写回订单 Base 的字段预览
4. 如果需要给买家发消息，再读 `references/order-handling.md`、BRAND.md、SHOP.md、COMMERCE_PLATFORM.md 起草平台对应语言的消息
5. 等用户确认后才写 Base；不要替用户在平台后台发消息、发货、退款或售后审核

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束。本 skill 特有禁区：

- **不替用户发平台消息 / 发货 / 退款 / 售后审核**：只产文案 + 维护 Base；真实操作由用户在平台后台、ERP 或专门平台 skill 执行
- **客户隐私**：邮箱、地址、订单号属敏感数据——Agent 输出里用脱敏写法（如 `订单 #****1234`），不要大段重复
- **改 Base 用 lark-base 的 diff 风格预览** → 等确认 → 落盘
- **客服回复**：用户自己复制到目标平台后台 / 客服入口发送；发出后用户最终版本回写到订单 Base 的"客服记录"字段

---

## 与 shop-foundation 的回流关系

客服处理过程中如果用户**纠正**了 Agent 的回复（"语气太冷"、"不该这么快道歉"），按 shop-foundation 的沉淀流程（`references/distillation-brand.md`）提示：

> 「这次的纠正反映客服姿态的偏好。要沉淀进 BRAND.md 文案语调段吗？」

如果用户提到"以后这种情况都这样处理"，可以提议沉淀成 SOP（未来的 playbook skill 范畴）；当前先记到客户 Base 的"客服备忘"字段，等 SOP skill 上线后批量整理。

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：客服回复的买家可见语言由 COMMERCE_PLATFORM.md 的「买家语言」决定；Etsy 内置 preset 默认英文，小红书内置 preset 默认中文。Base 字段标签中英混用（参考 schema 文件）。
