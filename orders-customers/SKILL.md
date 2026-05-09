---
name: orders-customers
description: 维护 Etsy 订单 + 客户的两份飞书 Base，并支撑订单处理 / 客服回复 / 客户标签运营。三种触发：(1) "建订单库 / 客户库"——建两个 Base；(2) "录订单 / 新订单 / 回头客 / 加备注"——读写 Base；(3) "回客户消息 / 处理差评 / 退货 / VIP 群发"——按客服 SOP + BRAND.md 语调输出回复 + 维护客户标签。
layer: foundation
---

# 订单与客户 (Orders & Customers)

这个 skill 维护 Etsy 订单和客户的结构化数据（飞书 Base × 2）+ 支撑订单处理 / 客服 / 客户运营。

**对外的实操接口**：飞书 Base（用 `lark-base` skill 操作）+ 工作区根目录的 BRAND.md / SHOP.md（用 `shop-foundation` 维护）。

> 共享引导（版本检查 / 工作区解析 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 依赖关系

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` | 文案语调 / 客服姿态 / 边界 | 写客服回复时严格遵守"应该说"、"避免说"、"原则"段（特别是处理差评的姿态原则） |
| `<workspace>/SHOP.md` | 处理时间 / 退换货 / 运输 / 定制政策 | 客服回复涉及承诺时引用 SHOP.md 原文，**绝不自编**（避免承诺与店铺政策冲突） |
| 商品 Base | 该订单包含的 SKU 详情 | 处理订单时按订单关联到 SKU（用 lark-base 跨表关联） |

---

## 三种执行模式

### 模式 A：建库（首次建立两个 Base）

**进入条件**：项目下尚无对应的订单 Base 或客户 Base。

**执行步骤**：
1. 读 `references/base-schema.md`，了解订单 Base + 客户 Base 字段
2. 用 lark-base skill 创建两个 Base（建议同一个云空间目录下）：
   - `{店铺名}-订单库`
   - `{店铺名}-客户库`
3. 客户 Base 与订单 Base 建立**关联关系**（订单的 `客户` 字段 → 客户 Base 主键）
4. 落盘后告诉用户两个 Base 的链接 + 字段清单

> **不要硬塞所有字段**——先建核心字段让用户用，辅助字段用着用着补。

### 模式 B：录入 / 更新

**进入条件**：用户口述新订单 / 新客户 / 订单状态变更 / 给客户加标签。

**执行步骤**：
- 读 `references/base-schema.md` 确认字段语义
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
2. 读 BRAND.md（客服姿态 / 文案语调）+ SHOP.md（政策原文）
3. 读 `references/order-handling.md`：按场景找 SOP（差评 / 退货 / 定制等）
4. 输出客服回复草稿（英文，给海外买家看），整篇展示给用户
5. 用户确认后，**用户自己**复制到 Etsy 后台发送（本 skill 不替操作 Etsy）
6. 落地：
   - 把回复要点 + 用户最终发出的版本回写到订单 Base 的"客服记录"字段
   - 如果该次互动反映客户特征（VIP、定制粉、投诉户），更新客户 Base 标签

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束。本 skill 特有禁区：

- **不替用户发 Etsy 消息**：只产文案 + 维护 Base；发消息是用户在 Etsy 后台手动操作
- **客户隐私**：邮箱、地址、订单号属敏感数据——Agent 输出里用脱敏写法（如 `订单 #****1234`），不要大段重复
- **改 Base 用 lark-base 的 diff 风格预览** → 等确认 → 落盘
- **客服回复**：用户自己复制到 Etsy 后台发送；发出后用户最终版本回写到订单 Base 的"客服记录"字段

---

## 与 shop-foundation 的回流关系

客服处理过程中如果用户**纠正**了 Agent 的回复（"语气太冷"、"不该这么快道歉"），按 shop-foundation 的沉淀流程（`references/distillation-brand.md`）提示：

> 「这次的纠正反映客服姿态的偏好。要沉淀进 BRAND.md 文案语调段吗？」

如果用户提到"以后这种情况都这样处理"，可以提议沉淀成 SOP（未来的 playbook skill 范畴）；当前先记到客户 Base 的"客服备忘"字段，等 SOP skill 上线后批量整理。

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：客服回复（发给海外买家）为**英文**；Base 字段标签中英混用（参考 schema 文件）。
