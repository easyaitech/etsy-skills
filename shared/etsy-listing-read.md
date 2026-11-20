# Etsy Listing 只读工具契约

本文件是跨 skill 的 Etsy Listing 读取单一事实源。它只规定 Hermes 如何选择入口、
传什么、怎样解释最终结果；工具实现、凭据、队列、插件会话和限流状态都在
`yanggedianzhang` ECS 控制面。

通用地址、租户身份、令牌引用和错误判据见
[`backend-api-access.md`](backend-api-access.md)。本文不复制鉴权实现。

## 一个 Agent 入口、两个内部来源

Agent 统一调用 `etsy_listings_get`，通过 `fields=public|seller_admin` 明确来源。以下两个名字
只用于解释 ECS 内部 transport / 原始 Listing 批次，不再作为 Agent 可选工具：
正式适配器只访问 `/api/hermes/etsy/tools/listings/get` 及其内部 result 路径。

本店商品使用 `fields=seller_admin`（批次名 `etsy_listing_admin_read`），控制面按该店授权的官方接口读取。调用不依赖 Base。浏览器插件可作为部分店铺的 API 执行端，此时也只请求官方 API。禁止为补字段打开后台页面或改走公开抓取。公开来源 `etsy_listing_public_read` 已停用。

支持 single、batch、shop。按工具 schema 提供商品 URL 或本店清单范围，查看返回的数量及截断标记。要核对当下数据传 `acceptCachedWithinMs: 0`。缓存只证明 capturedAt 时的事实。

## 租户身份与访问

`tenantId` 由工具运行时注入，不属于 Agent input。不要向店主索要，不要自行拼接，也不要用
Etsy 店铺名、用户名、Base token 或公开 URL 代替。裸店铺名可能返回
`UNAUTHORIZED`；只有实际读到该 JSON 错误时，才按
[`backend-api-access.md`](backend-api-access.md) 的公共闸门表处理。

调用时只引用：

- `$YANGGEDIANZHANG_API_BASE`
- `$YANGGEDIANZHANG_TENANT_ID`
- `$YANGGEDIANZHANG_HERMES_TOOL_TOKEN`

令牌不得读取、打印、记录或回显。

## 官方结果

直接解释工具最终返回的 `etsy-listing-read/v1` 商品。遇到未授权、授权失效、429 或服务错误，报告实际原因。工具不写 Etsy。后台路由已经读取到值时，产品服务按本店平台商品 ID 回写；详情读取和整店核对的字段范围见[商品目录](../listing-catalog/SKILL.md)。

每条结果按以下区域解释：

| 区域 | 含义 | 消费规则 |
|---|---|---|
| `source` | URL、Listing ID、是否认证、executor | 回复时保留来源边界 |
| `data` | 有真实 evidence 的标准字段 | 可用于分析与优化 |
| `evidence` | 字段来自哪个 source path / presence | 需要核证时引用 |
| `unknown` / `raw` | 已获取但当前未映射的原始字段 + 原因 | 不静默丢弃；不要自行猜映射 |
| `unavailable` | 上游没有暴露 | 不补空值 |
| `excluded` | 因隐私、追踪、大小或范围主动排除 | 不尝试绕过 |
| `errors` | 条目级失败与 retryability | 如实呈现 |
| `completeness` | 上述区域的计数和整体状态 | 与限制一起解释 |

`completeness.status=complete` 表示本次抓取没有条目级失败，不表示每个后台控件都已映射。
后台出现大量 typeahead / variation / admin DOM `unknown` 是显式覆盖，不是静默遗漏。
`partial` 可以使用已有 `data`，但必须同时说明 unavailable / excluded；`failed` 不能拿
Base 或用户口述补成成功。

页面存在的字段不得静默遗漏：任何已获得来源值都必须进入 `data/evidence`、
`unknown/raw`、`unavailable`、`excluded` 或 `errors`。禁止伪造空值。

## 下游消费

### 读取 / 分析

回复至少说明：

1. 读的是 public 还是 admin；
2. `requestedCount / resultCount / truncated`；
3. 实际获得的关键 `data`；
4. `unknown / unavailable / excluded / errors` 的数量和业务影响；
5. 失败时下一步，而不是把内部资料冒充线上结果。

### 优化现有 Etsy Listing

- 先完成对应 live read，再把真实 `data` 作为线上事实基线。
- Base 是内部目录、草稿与历史上下文；与 live data 不同时，分别标注，不自动覆盖任何
  一边。
- 只根据已捕获字段提出建议；unknown 不自行补含义。
- live read 失败时，停止“基于当前页面”的优化结论。可以在用户同意后基于 Base 或其
  提供的文本另起草稿，但必须明确那不是当前 Etsy 页面核对。

### 未来工作流

Listing 优化、跨平台组装和批量修改计划都引用本契约读取数据。真正修改 Etsy、批量写入
或跨平台发布必须由另一个独立写工具与确认流程完成。

## 巡检和写入

每周商品核对由产品服务调度。店长不创建额外定时任务。商品表里的价格、库存和时间以回写后的值为准；读到工具结果仅证明读取成功。缺失字段保留原值，店内成本、SKU、报关值独立维护。
