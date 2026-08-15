# Etsy Agent 工具统一契约

对 Agent 只暴露十一个稳定工具；清单以 [`etsy-stack.json`](../etsy-stack.json) 的
`agentTools` 为安装发布源：

| 工具 | 用途 | 副作用 |
|---|---|---|
| `etsy_listings_get` | 读取公开或店主后台 Listing | 只读 |
| `etsy_customer_messages_get` | 获取唯一客户的双向消息 | 只读 |
| `etsy_customer_messages_publish` | 真实发布一条已授权文字消息（可附最多 3 张图片） | 对外写 |
| `get_etsy_orders` | 跨 New / Completed 读取订单 | 只读 |
| `get_etsy_stats` | 按日期、Listing、指标和流量来源读取已采集的 Stats 历史 | 只读 |
| `describe_etsy_stats` | 发现实际可用日期、维度、指标、Listing、缺口和排除范围 | 只读 |
| `summarize_etsy_stats` | 做有界排名、趋势、汇总和等长上期比较 | 只读 |
| `get_etsy_ads` | 读取独立 Etsy Ads 后台的逐日 campaign / Listing 指标、归因订单和设置快照 | 只读 |
| `etsy_order_sop_get` | 查询订单 SOP 清单、步骤与当前进度，可按合同补发清单卡片 | 只读 / 可选发卡 |
| `etsy_order_sop_update` | 按步骤标记订单 SOP 完成或撤销，并刷新既有卡片 | 内部写 |
| `etsy_order_sop_propose_flow_change` | 提交 SOP 流程变更提议；仅店主确认卡可使其生效 | 提议写 |

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
printf '%s' '{"sections":["date_range","metrics","listings","gaps"]}' | describe_etsy_stats
printf '%s' '{"from":"2026-07-01","to":"2026-07-07","dimension":"listing","metrics":[{"key":"views","aggregation":"sum"}],"groupBy":["listing"],"sort":{"metric":"views","direction":"desc"}}' | summarize_etsy_stats
printf '%s' '{"from":"2026-07-01","to":"2026-07-07","sections":["campaign","listings","attributed_orders","settings"]}' | get_etsy_ads
```

Stats 工具选择规则：

- 不知道有哪些数据、日期或指标：先用 `describe_etsy_stats`。
- 需要逐条原始事实或继续 `esq1_` 分页：用 `get_etsy_stats`。
- 需要排名、趋势、汇总或 previous-period 比较：用 `summarize_etsy_stats`。

三个 Stats 工具只读取 Stats 菜单已提交的可信历史，不会推断页面未提供的
`流量来源 × Listing` 交叉归因。独立 Ads 数据必须用 `get_etsy_ads`：其中 campaign /
listings 是逐日口径，attributed_orders 是采集时页面显示的滚动 30 天归因，settings 是采集
时刻状态，不能统称为“昨日”。`partial` 的 `gaps` 必须明确告诉店主，缺失项
不得解释为零；质量问题是已采集事实之间的矛盾，不会覆盖原始值。

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
