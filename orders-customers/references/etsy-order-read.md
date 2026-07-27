# Etsy 订单统一读取

Etsy 订单只调用 `get_etsy_orders`，不按 New / Completed 拆成两个 Agent 工具。分类页只是
内部扫描来源，不能直接等同于订单业务状态。

## 什么时候必须用它

**Base 里查不到的订单事实，到这里查，不要让用户自己去 Etsy 后台翻。**

`Orders 订单` / `Customers 客户` 两张表按设计**不保存完整收货地址、门牌和电话**（见
[`base-schema.md`](base-schema.md) §隐私 与 [`platforms/etsy.md`](platforms/etsy.md) 第 9 项），
只留 `收件地区` 这种国家 / 州 / 城市级信息。所以「Base 里只有 US / 某某市」是这条规则的
正常结果，**不是数据缺失，也不是查不到**——完整地址是平台事实，用本工具现查。

现查不等于必然拿到：只有本次返回里确实带了该字段，才能用它回答；没带就按下面
`missingFields` 那条处理，不要拿 Base 的地区级信息冒充完整地址。

用户问到下列任何一项，先调本工具，再回答：

| 用户问的 | 结果里的字段 |
|---|---|
| 完整收货地址 / 寄到哪 / 门牌 / 邮编 | `fullAddress` |
| 收件电话 | `phone` |
| 收件国家 / 地区 | `destination` |
| 买家叫什么 | `buyerName` |
| 这单买了什么 / 数量 | `items[]` |
| 定制内容 / 刻什么字 / 是不是礼物 | `customizationText` |
| 订单金额 | `totalText` |
| 下单日 / 承诺发货日 | `orderDateText` / `shipByText` |
| 运输方式 | `shippingMethod` |
| 快递单号 | `trackingNumber` |

拿不到时的正确说法是「这次没读到」。结果里给了原因就逐字转述，没给就直说工具这次没给原因、
**不要自己补一个**（原因是否存在见下面 §覆盖与缺口）。无论如何都**不是**「系统里没有这个
信息」，更不是让用户自己去 Etsy 后台的 Shipping 页面看——那是本工具的职责。

隐私边界（脱敏规则的适用范围要分清，否则会走到另一个极端——店主问自己的订单地址却拿不到）。
本节是 [`../SKILL.md`](../SKILL.md) §写入前的硬性约束「客户隐私」那条的例外细则，两处一致：

- **店主本人为发货 / 打单 / 核对地址而问**：完整展示 `fullAddress` / `phone` 原文。这是本
  工具存在的理由，不脱敏、不打码、不改写。
- **要写进 Base、要发给买家、要放进对外文案或分享给第三方**：按 skill 的脱敏约定处理
  （如 `订单 #****1234`），不大段重复地址。
- **一律不回写 Base**：现查到的完整地址 / 电话只用于当次回答和打单，回写会违反上面那条
  隐私规则。

输入使用业务语义：

```json
{"orderNumbers":["1234567890"]}
{"scope":"active"}
{"scope":"delivered"}
{"scope":"all","cursor":"上次结果返回的不透明游标"}
```

- `orderNumbers` 存在时先查 New，再只为仍缺失的订单查 Completed；调用方不用判断 Tab。
- 精确查单或列表扫描返回 `nextCursor` 时，下一次沿用相同 `orderNumbers` / `scope` 并传回
  `cursor`；游标已绑定当前租户且会过期，不能拼装或跨租户复用。
- `active` 是未送达订单，包括待发货、已发货和运输中；`delivered` 是已送达；`all`
  同时扫描两个内部适配器并按订单号去重。
- 未传 `orderNumbers` 和 `scope` 时默认 `active`。
- Agent 不传 `tenantId`、bucket、requestId 或 operationId。

## 结果字段

每个订单的业务字段见上表；`orderNumber` 恒有，其余字段**只在这次真读到时才出现**。

状态三件套必须分开解释，不能互相顶替：

- `fulfillmentStatus`：`unfulfilled|fulfilled|unknown`
- `deliveryStatus`：`pre_transit|in_transit|delivered|unknown`
- `platformBucket`：`new|completed`
- `sourceTab` / `sourceTabs`：本次在哪些页面看到，只是诊断 evidence
- `evidence[].statusText`：平台页面状态原文

`missingFields[]` 是本次**没读到**的字段名（例如出现 `fullAddress` = 这一单的地址这次没读
出来）。它说的是本次读取的缺口，**不是**「这一单没有这项信息」——不得据此告诉用户平台上
没有地址、没有买家名。正确处置是按原条件重读一次，或把范围缩到该订单号再读。

“已经发货但物流尚未送达”可以同时是 `fulfillmentStatus=fulfilled`、
`deliveryStatus=in_transit`、`platformBucket=new`，这不是冲突。只有页面明确给出
Delivered 证据才能判断送达。

同一订单跨来源重复时按订单号合并；同字段不同值进入 `conflicts` 并把结果标 `partial`，
不得静默覆盖。`notFound=true` 只有所需来源完整扫描后才可信；覆盖不完整时是
`outcome=partial`、`notFound=false`，不得告诉用户“没有这个订单”。

## 覆盖与缺口

`coverage[].reason` **有值时**说的就是为什么没读全，以那里的原文为准。它是可选的：`partial`
也可能只由 `conflicts` 或送达状态判不了触发，那时整个返回里没有任何 reason——**没有就别推断
一个**。`errors[].code` 和 `coverage[].reason` 都必须逐字复述，不得换成另一个「更好懂」的
真实码。`errors[].ownerHint` 有值时可以直接念给店主。

这是独立只读路径：不写 Etsy、不写 Base、不触发历史 `orders-capture`，也不点击订单控件。
登录失效、Challenge、429、分页上限或选择器漂移都必须作为覆盖缺口返回。
