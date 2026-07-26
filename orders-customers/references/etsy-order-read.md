# Etsy 订单统一读取

Etsy 订单只调用 `get_etsy_orders`，不按 New / Completed 拆成两个 Agent 工具。分类页只是
内部扫描来源，不能直接等同于订单业务状态。

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

结果必须分开解释：

- `fulfillmentStatus`：`unfulfilled|fulfilled|unknown`
- `deliveryStatus`：`pre_transit|in_transit|delivered|unknown`
- `platformBucket`：`new|completed`
- `sourceTab` / `sourceTabs`：本次在哪些页面看到，只是诊断 evidence
- `evidence[].statusText`：平台页面状态原文

“已经发货但物流尚未送达”可以同时是 `fulfillmentStatus=fulfilled`、
`deliveryStatus=in_transit`、`platformBucket=new`，这不是冲突。只有页面明确给出
Delivered 证据才能判断送达。

同一订单跨来源重复时按订单号合并；同字段不同值进入 `conflicts` 并把结果标 `partial`，
不得静默覆盖。`notFound=true` 只有所需来源完整扫描后才可信；覆盖不完整时是
`outcome=partial`、`notFound=false`，不得告诉用户“没有这个订单”。

这是独立只读路径：不写 Etsy、不写 Base、不触发历史 `orders-capture`，也不点击订单控件。
登录失效、Challenge、429、分页上限或选择器漂移都必须作为覆盖缺口返回。
