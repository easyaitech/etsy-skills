# Etsy Agent 工具统一契约

对 Agent 只暴露五个稳定工具：

| 工具 | 用途 | 副作用 |
|---|---|---|
| `etsy_listings_get` | 读取公开或店主后台 Listing | 只读 |
| `etsy_customer_messages_get` | 获取唯一客户的双向消息 | 只读 |
| `etsy_customer_messages_publish` | 真实发布一条已授权文字消息 | 对外写 |
| `get_etsy_orders` | 跨 New / Completed 读取订单 | 只读 |
| `get_etsy_stats` | 按日期、Listing、指标和流量来源读取已采集的 Stats 历史 | 只读 |

每个工具从 stdin 接收一个 JSON 对象，stdout 只返回一个最终 JSON 对象。运行时自动注入
API 地址、tenant 和鉴权；Agent 输入中禁止出现 `tenantId`、token、requestId、operationId。
示例：

```bash
printf '%s' '{"orderNumbers":["1234567890"]}' | get_etsy_orders
# 等价的统一入口：
printf '%s' '{"orderNumbers":["1234567890"]}' | ecommerce-stack tool get_etsy_orders
```

Stats 示例：

```bash
printf '%s' '{"from":"2026-07-01","to":"2026-07-07","dimensions":["listing","traffic_source"],"metrics":["visits","orders"]}' | get_etsy_stats
```

`get_etsy_stats` 只读取 Stats 菜单已提交的可信历史，第一版不包含独立 Etsy Ads 后台，也不会
推断页面未提供的 `流量来源 × Listing` 交叉归因。`partial` 的 `gaps` 必须明确告诉店主，缺失项
不得解释为零。

所有工具的最终信封一致：

- `schemaVersion=etsy-agent-tool/v1`
- `tool`
- `ok`
- `outcome=complete|partial|failed|unknown`
- `data`
- `completeness.status/truncated/nextCursor`
- `errors[].code/message/retryable/safeToRetry/actionRequired`

Agent 只解释这个最终信封，不展示或要求用户处理内部 pending、requestId、operationId、轮询、
tenant 或鉴权。`partial` 可以使用已有证据，但必须说明缺口；`failed` 不得用 Base 或用户口述
补成平台事实；`unknown` 且 `safeToRetry=false` 的写操作禁止自动重发，只能核对状态。

工具实现是 ECS 端点外的薄适配器。它只做输入规范化、运行时身份注入、隐藏传输轮询和统一
最终信封；租户隔离、状态机、队列、浏览器会话和平台动作仍由 ECS / 浏览器插件负责。
