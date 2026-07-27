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

| 业务入口 / 最终 `tool` | 何时使用 | 执行位置 | Base / 登录态 |
|---|---|---|---|
| `etsy_listing_public_read` | 公开 Listing URL、竞品、公开批量、公开 Shop 枚举 | ECS 调独立 Apify Actor | 不依赖 Base；不使用店主浏览器 |
| `etsy_listing_admin_read` | 店主明确要求读取自己后台编辑器里的完整配置 | ECS 编排租户浏览器插件 | 不依赖 Base；使用已授权 Etsy 登录态 |

公开页面与卖家后台暴露的字段差异很大，二者不得互相伪装：

- 公开结果不能声称覆盖卖家后台配置。
- Base 记录不能声称是当前 Etsy 页面。
- 后台结果不能拿来做公开 URL 大批量抓取。

## 路由判定

| 用户请求 | 必须走 |
|---|---|
| “读取这个 Etsy Listing URL” | public `single` |
| “读取这批公开 Listing URL” | public `batch` |
| “读取这个公开 Etsy 店铺的 Listing” | public `shop` |
| “读取我后台这条 Listing / 看编辑器配置” | admin `single` |
| “读取我后台这几条 Listing” | admin `batch` |
| “读取我后台店铺的 Listing” | admin `shop` |

不确定是不是店主自己的后台时，默认 public；只有店主明确要求后台配置才使用 admin。
公开批量读取**禁止**调用绑定店主 Etsy 账号的浏览器插件。

## Agent 输入

```json
{"scope":"single","fields":"public","urls":["https://www.etsy.com/listing/123/example"]}
{"scope":"batch","fields":"seller_admin","urls":["https://www.etsy.com/listing/123/example"]}
{"scope":"shop","fields":"public","shopUrl":"https://www.etsy.com/shop/example","maxItems":30}
```

Agent 不执行本文下方的 HTTP start/result；薄适配器会隐藏它们，只返回统一最终信封。

### 可选：`acceptCachedWithinMs`（这次问题能接受多旧的数据）

后端会把每次读到的 listing 存下来。加上这个字段（毫秒），就允许它在**这批 listing 全都有够新的
已存结果**时直接给你，不再真的去爬。**不传 = 照常真的去读**，这是默认。

```json
{"scope":"single","fields":"seller_admin","urls":["https://www.etsy.com/listing/123/x"],"acceptCachedWithinMs":600000}
```

为什么由你声明而不是后端定：listing 是**平台的快照**，不是店主的账本。「这个 listing 现在什么价」
和「我上次给它写的标题是啥」对新鲜度的要求差着数量级，只有你知道这次是哪一种。

**什么时候该传**：店主在连续问同一批 listing（改标题、对比几条、按你上一条回复继续追问）时，几分钟
的窗口能省掉大量等待——公开读最长要等 320 秒，后台读条目间还要随机等 3~8 秒，**且滚动 24 小时只有
30 条配额**，重复爬同一个 listing 就是从配额里再买一遍。

**什么时候不该传**：店主问的是「现在」「此刻」「刚改完生效没有」，或你要据此做承诺性陈述。这类问题
的正确答案只能来自一次真实读取。

**拿到缓存结果后**：`results[i].capturedAt` 是那次抓取的真实时刻，`results[i].source.fromCache=true`
表示这条来自已存结果。**照它说话**——可以说「几分钟前看到的是…」，不能说成「现在是…」。

`scope=shop` 传了也不会生效：整店是枚举，已存结果里有哪几条取决于历史读过什么，证明不了「这就是
全店」。

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

## Public read

端点：

- start：`POST /api/hermes/etsy/listings/public-read`
- result：`POST /api/hermes/etsy/listings/public-read/result`

### 输入

- `single`：`urls` 只传 1 个公开 Listing URL。
- `batch`：`urls` 传 1–100 个公开 Listing URL。
- `shop`：标准输入传 `shopUrl` + `maxItems`（1–100）。
- 支持 Etsy `https` Listing / Shop URL、已支持的店铺子域名和地区路径；不要替用户猜
  Listing ID 或修造一个不存在的 URL。
- 工具层若给出 `urls[0] + shop{url,maxItems}` 或 Markdown 包裹链接，后端可兼容；重复
  URL / limit 必须一致，冲突时不要替用户选择一个值。

限制：

- 单次最多 100 条。
- 每租户最多 2 个并发调用。
- 滚动 24 小时默认最多 300 条。
- 数量较大时仍走 Apify，不得为了提速改用店主插件。

### 一次逻辑调用

start 返回 `202 pending` 时，按 `retryAfterMs` 调 result，body 传当前
`tenantId + requestId`；最长等待 320 秒，直到拿到非 202 的最终结果或明确错误。

`requestId`、pending 和内部轮询只属于传输层：

- 不把它们当 Listing 结果回复用户。
- 不让用户手动开启第二次重复抓取。
- 只返回最终 `etsy-listing-read/v1` 或明确失败。

## Admin read

内部端点：

- start：`POST /api/hermes/etsy/listings/admin-read`
- result：`POST /api/hermes/etsy/listings/admin-read/result`

两者同样由 `etsy_listings_get` 适配器隐藏，Agent 不处理 requestId 或 pending。

### 输入

- `single`：`listingIds` 只传 1 个店主自有数字 Listing ID。
- `batch`：`listingIds` 传 1–10 个唯一的店主自有数字 Listing ID。
- `shop`：标准输入传根级 `maxItems`（1–10）；兼容飞书工具层的
  `shop{maxItems}`。两处都存在时必须一致。

限制与风控：

- 单次最多 10 条。
- 滚动 24 小时最多 30 条。
- 插件顺序读取，条目间随机等待 3–8 秒。
- 只有店主明确发起时才调用；不得定时、巡检或预抓。
- 遇到登录失效、Challenge、429、额度耗尽或插件错误立即停止；不换 public 伪装后台
  成功，不自动重投制造重复页面访问。

后台回执由 ECS 和插件负责缓存、确认与清理。Hermes 不实现队列，不保存浏览器结果，
也不接管插件会话。

## 最终结构：`etsy-listing-read/v1`

批次顶层至少包含：

| 字段 | 含义 |
|---|---|
| `tool` | `etsy_listing_public_read` 或 `etsy_listing_admin_read` |
| `mode` | `single` / `batch` / `shop` |
| `requestedCount` / `resultCount` | 接受请求数 / 返回结果数 |
| `truncated` | 受 `maxItems` 截断 |
| `results` | 每条 Listing 的版本化结果 |
| `errors` | 批次级错误 |

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

## 只读与巡检边界

- 两个工具都只读：不写 Etsy，不写 Base，不发布。
- Listing 自动巡检已暂停；不得创建 cron、Alarm、定时扫描或后台自动流量。
- 现有 Base 核对代码、接口和历史数据保留；只有用户明确触发对应旧流程时才使用。
- 读取工具不因 Base 未配置而失败，也不自动把结果同步回 Base。
