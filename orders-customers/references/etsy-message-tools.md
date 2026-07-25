# Etsy 客户消息：正式获取与真实发布

仅在目标销售平台是 **Etsy** 且需要读取或发送客户消息时使用。两个正式工具分别负责获取和发布：

| 动作 | 端点 | 语义 |
|---|---|---|
| 获取 | `POST /api/hermes/etsy/messages/get` | 获取唯一 customer 的正式双向文字消息 |
| 发布 | `POST /api/hermes/etsy/messages/publish` | 创建或重放一次真实 Etsy 文字发送任务 |

旧 `etsy-dm` 会话查询、回复草稿和订单消息端点已退役，**不得调用、不得降级回旧工具**。V1 只支持文字，不支持图片或附件。

访问地址、租户 ID 和鉴权令牌统一按 [`../../shared/backend-api-access.md`](../../shared/backend-api-access.md) 使用：URL 从 `$YANGGEDIANZHANG_API_BASE` 拼接，body 的 `tenantId` 使用 `$YANGGEDIANZHANG_TENANT_ID`，鉴权头使用 `Bearer $YANGGEDIANZHANG_HERMES_TOOL_TOKEN`。不要读取、打印或让用户提供这些变量的值。

## 1. 唯一定位 customer

两个工具都使用相同的 `selector`，且以下三项**必须恰好提供一项**：

```json
{"customerId":"C-2026-0001"}
{"orderNumber":"4079795776"}
{"trackingNumber":"TRACKING-NUMBER"}
```

- `customerId` 是 `Customers 客户`.`客户 ID`。
- `orderNumber` 从 `Orders 订单` 唯一解析到关联 customer。
- `trackingNumber` 从 `Orders 订单`.`跟踪号` 唯一解析到关联 customer。
- customer、订单或快递单号无法唯一解析时停止，不猜客户、不索要 Etsy 会话 ID。
- 同一个 customer 只属于一个销售平台；这里必须是 Etsy。服务端还会校验 Customers 中稳定的 `平台客户 ID` 与 Etsy 会话客户身份一致。

## 2. 获取正式消息

逻辑请求体（实际调用时必须让 shell 展开 `tenantId` 环境变量，不能把字面字符串
`"$YANGGEDIANZHANG_TENANT_ID"` 发给服务端）：

```json
{
  "tenantId": "$YANGGEDIANZHANG_TENANT_ID",
  "selector": {"orderNumber": "4079795776"},
  "limit": 50
}
```

`limit` 为 1–100，默认 50。返回 `hasMore=true` 时，把 `nextCursor` 原样放进下一次请求；不要解析或改写 cursor。只有明确需要限定某个已返回的会话时才带 `conversationId`。

每条 `message` 的关键字段：

- `direction=inbound`：客户发给店铺；`direction=outbound`：店铺发给客户。
- `sender` / `recipient`：双方身份。
- `content`：完整文字正文。
- `sentAt`：平台发送时间；`capturedAt`：系统采集时间。
- `externalMessageId`：Etsy 稳定消息 ID；不得用相同正文或相同时间自行去重。

获取结果可能为空；空结果不等于客户不存在，也不能据此编造会话内容。

正式消息没有按时间过期的 TTL；系统每个会话最多保留最近 100 条、每个租户最多保留最近
5000 条，达到容量后按稳定时间顺序淘汰最旧记录。这里的“长期保存”受这两个容量上限约束，
不能向用户承诺超过容量后仍保留被淘汰的旧消息。

## 3. 真实发布文字消息

发布不是草稿，也不会只填入回复框。调用后浏览器插件会在该租户 Etsy 登录态中执行真实发送。

授权规则：

- 用户已经给出明确收件目标、完整原文并要求发送：该请求本身就是授权，不重复确认。
- 正文由你起草或修改：先完整展示正文，取得用户明确确认后再发布。
- 不支持图片、附件或空正文；正文最多 4000 字符，超限整条拒绝，不截断。

逻辑请求体（`tenantId` 同样必须使用环境变量的实际值）：

```json
{
  "tenantId": "$YANGGEDIANZHANG_TENANT_ID",
  "selector": {"orderNumber": "4079795776"},
  "idempotencyKey": "稳定且仅代表这一次业务发送意图的非秘密键",
  "messageType": "text",
  "content": "完整消息正文"
}
```

同一业务发送意图从首次创建到查询最终状态，必须始终使用**相同 selector、相同完整正文和相同 `idempotencyKey`**：

- 同键同内容重放只返回同一 job，不重复发送。
- 同键换客户、会话或正文会冲突；修改后的新发送意图必须使用新键。
- 网络超时或暂时拿不到最终状态时，继续用原请求重放查询，绝不自行换键重投。
- `idempotencyKey` 必填、最多 200 字符；它不是鉴权凭据，不放 token 或客户隐私。

## 4. 发布结果判定

发布接口成功响应为 `{ "ok": true, "job": { ... } }`；同一请求重放时还可能带
`"deduped": true`。按 `job.status` 判定：

| `job.status` | 对外结论 | 后续动作 |
|---|---|---|
| `queued` | 已进入队列，尚未证明发送 | 用原请求和原幂等键查询 |
| `dispatched` | 已交给浏览器执行，尚未证明发送 | 用原请求和原幂等键查询 |
| `sent` | 仅当 `job` 同时带 `externalMessageId` 和 `platformSentAt` 才可报告已发送 | 报告真实成功结果 |
| `failed` | 已证明失败 | 报告失败；只有用户决定再次发送时才用新幂等键创建新意图 |
| `expired` | 未交付执行即过期 | 报告过期；只有用户决定再次发送时才用新幂等键创建新意图 |
| `result_unknown` | 发送结果未知，可能已经发出 | **停止，绝不自动重发**；提示用户先在 Etsy 会话核对 |

`queued`、`dispatched`、HTTP 201 或拿到 `jobId` 都不等于客户已经收到消息。没有
`job.status=sent + job.externalMessageId + job.platformSentAt` 的完整证据，禁止说“已发送”。

## 5. 错误与安全边界

- 只有实际请求返回的 JSON 错误码才可对用户报告；不要把文档里的可能性冒充实测。
- 客户、订单、快递单号或会话匹配不唯一时停止，禁止选“第一个”。
- 功能未启用、服务未生效、租户绑定缺失或插件能力不足时，如实报告并停止，不绕过门禁。
- 不在日志、回复或 Base 客服记录中暴露鉴权令牌；订单号等敏感标识在面向用户的总结中按既有脱敏规则展示。
- 发送成功后如需记录客服结果，将用户最终发送版本及结果摘要写入 `Orders 订单`.`客服记录`；不要把“创建 job”写成“已发送”。
