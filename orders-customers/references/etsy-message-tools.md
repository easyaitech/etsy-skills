# Etsy 客户消息：正式获取与真实发布

仅在目标销售平台是 **Etsy** 且需要读取或发送客户消息时使用。两个正式 Agent 工具分别负责获取和发布：

| 动作 | Agent 工具 | 语义 |
|---|---|---|
| 获取 | `etsy_customer_messages_get` | 按 selector 获取唯一 customer 的正式双向文字消息，或按 `scope="recent"` 列出最近有来往的会话 |
| 发布 | `etsy_customer_messages_publish` | 把最终稿送去**店主确认卡**；店主点确认后才真实发送 |

旧 `etsy-dm` 会话查询、回复草稿和订单消息端点已退役，**不得调用、不得降级回旧工具**。发布支持文字正文 + 可选图片附件（`imageAssetUrls`，见 §4）；纯图片、无文字的消息不支持。

运行时按 [`../../shared/etsy-agent-tools.md`](../../shared/etsy-agent-tools.md) 自动注入地址、租户和鉴权。Agent 输入不得带 `tenantId` 或 token，也不要读取、打印或让用户提供这些值。

后端版本要求：发送前的**店主确认卡**（§4.1）需后端 >= v0.6.49.0——这是发送链路上唯一的人工闸，不可绕过、也没有关掉它的开关；`platform_customer_id`、`scope="recent"` 与潜在客户合成身份需后端 >= v0.6.20.0；`customer_id` 接受 `etsy-buyer:…` 与潜在客户真实发送需 >= v0.6.21.6；图片附件（`imageAssetUrls`）需后端 >= v0.6.48.0，且店主浏览器插件 >= 0.5.140——插件版本不足时带图发布会得到 426 `BROWSER_TOOL_UPGRADE_REQUIRED`，如实告知店主等插件自动更新后再发，不要降级成只发文字。

## 1. 唯一定位 customer

两个工具都使用相同的 `selector`，且以下四项**必须恰好提供一项**：

```json
{"type":"customer_id","value":"C-2026-0001"}
{"type":"order_number","value":"ORDER-NUMBER"}
{"type":"tracking_number","value":"TRACKING-NUMBER"}
{"type":"platform_customer_id","value":"911046840"}
```

- `customer_id` 接受两种值：`Customers 客户`.`客户 ID`（形如 `C-2026-0001`），以及系统给潜在客户的合成身份（形如 `etsy-buyer:911046840`，获取结果里怎么给的就怎么用回来）。Etsy 数字买家 ID 或买家昵称**不是** customer_id，拿它们查会得到 404 `CUSTOMER_SELECTOR_NOT_FOUND`。
- `order_number` 从 `Orders 订单` 唯一解析到关联 customer。
- `tracking_number` 从 `Orders 订单`.`跟踪号` 唯一解析到关联 customer。
- `platform_customer_id` 是 Etsy 数字买家 ID（只收纯数字；买家主页 URL 里那串字母 slug 不是它）。服务端先按 `Customers 客户`.`平台客户 ID` 反查档案；查不到**不报错**——那是还没下过单的潜在客户，自动落到合成身份 `etsy-buyer:<数字ID>`，获取和发送共用这条回退。
- customer、订单或快递单号无法唯一解析时停止，不猜客户、不索要 Etsy 会话 ID。
- 同一个 customer 只属于一个销售平台；这里必须是 Etsy。服务端还会校验会话身份与 selector 解析结果一致。

## 2. 获取正式消息

Agent 输入：

```json
{
  "selector": {"type":"order_number","value":"ORDER-NUMBER"},
  "limit": 50
}
```

`limit` 为 1–100，默认 50。`completeness.truncated=true` 时，把 `completeness.nextCursor` 原样放进下一次请求的 `cursor`；不要解析或改写 cursor。只有明确需要限定某个已返回的会话时才带 `conversationId`。

返回的 `data` 顶层是 `customerId`、`isProspect`、`messageCount`、`conversations`：

- **消息在 `data.conversations[].messages[]` 里，`data` 顶层没有 `messages` 这个键**。要条数一律读 `data.messageCount`——`len(data.get('messages', []))` 恒得 0 且不报错，会把一次成功读取谎报成「没有消息」。
- `messageCount` 是本页条数；`truncated=true` 时还有下一页，别把本页条数当成总数。
- `isProspect=true` 表示这位买家在 Base 客户表里**还没有档案**（多半是先来问、还没下单的潜在客户，他的 `customerId` 形如 `etsy-buyer:911046840`，是系统给的临时身份、不是店里的客户编号）。这时只能说「Etsy 上叫 X 的买家」，不许说成店里的客户、也不许说他下过单；名字只用 `platformDisplayName`（Etsy 上显示的名字）。他之后真下了单，同一条会话会自动改绑到真客户档案上、历史消息跟着走，不需要也不允许替他在 Customers 表建档。

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

## 3. 最近来往列表（scope="recent"）

用户问「最近有谁来问」「有没有新客户咨询」「谁在等我回复」这类**不指名道姓**的问题时，用同一个获取工具的列表模式。**不要**为了回答这类问题猜几个订单号挨个查——猜不到潜在客户，也答不出总数。

Agent 输入（不带 `selector`；`selector` 与 `scope` 必须恰好提供一项，同时给或都不给都会被拒）：

```json
{"scope":"recent","limit":20}
```

`limit` 可选，整数 1–50，默认 20。返回的 `data`：

- `scope="recent"`、`conversationCount`（本页条数）、`totalConversationCount`（会话总数）、`conversations` 按最后一次来往从新到旧。
- 每条会话认得出是谁、看得出最后一件事，但不展开正文：`conversationId`、`customerId`、`isProspect`、`platformCustomerId`、`customerName`（有档案才有）、`platformDisplayName`、`messageCount`、`lastMessage`，可能还有 `latestEvent`（图片这类没有正文的最新事件）。
- 时间字段二选一，**不能混为一谈**：`lastActivityAt` 是平台侧最后一次来往时间；没有平台时间的会话只有 `lastSyncedAt`（我们最后一次同步到它的时间），不能当作买家的活动时间转述。
- `truncated=true` 表示还有更多会话没列出；这个模式没有 cursor，调大 `limit` 再查一次。
- 要看某条会话的完整正文，拿返回的 `customerId`（含 `etsy-buyer:…`）按 §2 再查一次。

## 4. 真实发布文字消息

发布不是草稿，也不会只填入回复框；但它**也不会当场把消息发出去**——见 §4.1 的店主确认卡。
店主在卡上点「确认发送」之后，浏览器插件才会在该租户 Etsy 登录态中执行真实发送。

授权规则：

- 用户已经给出明确收件目标、完整原文并要求发送：该请求本身就是授权，不重复确认。
- 正文由你起草或修改：先完整展示正文，取得用户明确确认后再发布。
- 正文不能为空；最多 4000 字符，超限整条拒绝，不截断。图片以 `imageAssetUrls` 作为附件随文字一起发（见下），纯图片、无文字的消息不支持。带图发送前必须跟用户确认要发哪几张图。
- 正文里的定制文字必须逐字取自订单「定制需求」工具返回原文（简繁形态也不能私换）。按订单号 /
  跟踪号发送时后端会逐字校验：与该单定制文字相近但不一致的中文会被 400 `CUSTOM_TEXT_MISMATCH`
  拒发，返回附 `orderCustomizationText` 原文——照原文改对重发即可，不是后端故障（真实事故
  2026-08-07：「和光频临」被凭记忆写成「和光同塵」）。

### 4.1 发送前的店主确认卡（唯一的人工闸，绕不过去）

调用本工具**不等于发出去了**。后端会把你提交的最终文案与图片原样做成一张飞书卡片发给店主：
逐字正文、每一张附件图、收件人与订单号，加上三个按钮「确认发送 / 我要修改 / 取消不发」。
任务停在 `awaiting_confirmation`，**店主点了「确认发送」才进队列、插件才领得到**。

拿到 `data.status="awaiting_confirmation"` 时你要做的事，只有一件：

- 用自己的话告诉店主「最终稿已经发到你飞书了，你点确认我就发」，然后**结束这一轮**。
- **不要**替店主确认、不要追问、不要换个 `idempotencyKey` 再提交一次（那会被 409 挡住，见下）。
- 想知道后来发没发出去：用**同一份请求、同一个 `idempotencyKey`** 再调一次本工具即可，
  它会按当前 job 状态回你终态（见 §5）。
- `data.cardDelivered=false` 表示那张卡这次没送到店主手上（后端已如实告知）：用**同一个
  `idempotencyKey`** 原样重试一次补投，不要换键重建任务；连着几次都投不出去就如实告诉店主。

店主点「我要修改」或「取消不发」→ 这一稿终结为 `cancelled`，一个字都没发出去。据店主接下来说的
改法重拟一稿，**换新 `idempotencyKey`** 再提交（同键换正文会撞幂等冲突）。
卡片 30 分钟没人处理会自动作废（`expired`，未发送），需要就重新拟一稿。

这一环节的两个拒绝码，都发生在**一个字都还没发出去**的阶段，不要汇报成「发送失败」：

- 409 `PUBLISH_CONFIRMATION_PENDING_EXISTS`：这条会话已经有一张卡在等店主处理。请店主先点掉那张，
  再换新键提交下一稿。不要改用别的会话或别的定位方式绕过它。
- 409 `PUBLISH_CONFIRMATION_CHAT_MISSING`：这个店铺还没配置接收确认卡的飞书会话，没法做人工确认，
  所以后端拒绝建任务（宁可发不出，也不会跳过店主确认直接发）。如实告诉店主让管理员补配置。

**潜在客户照常可发**：selector 用 `platform_customer_id`（他的数字买家 ID）或直接用获取结果里的 `etsy-buyer:…` customer_id，不需要他先下单、也不需要建档——绝不要对用户说「他没下过单所以发不了」。发送只能回到已同步的会话里：

- 404 `CUSTOMER_CONVERSATION_NOT_FOUND`：这个人名下还没同步到会话（先请用户在 Etsy 打开一次那条会话），**不是不允许发**。
- `CUSTOMER_CONVERSATION_NOT_UNIQUE`：名下有多条会话，带 `conversationId` 指明哪一条。

Agent 输入：

```json
{
  "selector": {"type":"order_number","value":"ORDER-NUMBER"},
  "conversationId": "etsy:123456789",
  "expectedBuyerName": "店主确认的买家展示名",
  "idempotencyKey": "稳定且仅代表这一次业务发送意图的非秘密键",
  "messageType": "text",
  "content": "完整消息正文",
  "imageAssetUrls": ["系统提供的本租户签名图片链接（可选，最多 3 项）"]
}
```

- `conversationId` **必填**：原样使用获取结果里的值（形如 `etsy:123`），不要自己拼、也不要放进 selector。
- `expectedBuyerName` **必填**：店主确认的收件买家展示名，服务端用它做收件人身份复核，对不上整条拒发。
- `imageAssetUrls` 可选（最多 3 项）：元素只能是**系统在对话里提供的本租户内部签名图片链接**（店主在飞书发图后系统自动生成的 `/api/feishu/message-assets/…` 链接，7 天内有效），逐字原样传；不能填外部图片网址、不能自己拼链接。单张限 8 MiB、仅 JPEG/PNG/GIF/WebP。被拒时按返回错误码处理：`IMAGE_ATTACHMENT_NOT_FOUND`（链接过期，请店主重发图片）、`IMAGE_ATTACHMENT_TOO_LARGE`（请店主压缩重发）、`IMAGE_ATTACHMENT_FORBIDDEN`（不是系统给的链接）等，错误里都带人话提示，逐字复述即可。

同一业务发送意图从首次创建到查询最终状态，必须始终使用**相同 selector、相同完整正文、相同附件清单和相同 `idempotencyKey`**：

- 同键同内容重放只返回同一 job，不重复发送。
- 同键换客户、会话或正文会冲突；修改后的新发送意图必须使用新键。
- 网络超时或暂时拿不到最终状态时，继续用原请求重放查询，绝不自行换键重投。
- `idempotencyKey` 必填、最多 200 字符；它不是鉴权凭据，不放 token 或客户隐私。

## 5. 发布结果判定

适配器内部用相同幂等意图查询状态，Agent 只接收最终 `etsy-agent-tool/v1`：

- `outcome=complete` 且 `data.status=sent`，并带 `externalMessageId`、`platformSentAt`：才可报告已发送。
- `outcome=failed`：报告已证明失败，不自动创建新发送意图。
- `outcome=unknown` / `safeToRetry=false` / `actionRequired=verify_status_only`：可能已经发送，只核对状态，禁止自动重发。

以下 job 状态表是内部 transport 的判据，Agent 不展示 jobId 或轮询过程。

发布接口成功响应为 `{ "ok": true, "job": { ... } }`；同一请求重放时还可能带
`"deduped": true`。按 `job.status` 判定：

| `job.status` | 对外结论 | 后续动作 |
|---|---|---|
| `awaiting_confirmation` | **还没有发送**，等店主在飞书确认卡上放行 | 告诉店主去点那张卡，结束本轮；要查结果用原请求和原幂等键再调一次 |
| `cancelled` | 店主没让发（点了「我要修改」或「取消不发」），未发送 | 按店主的改法重拟一稿，用**新**幂等键提交；不要用原键重投 |
| `queued` | 店主已确认、已进入队列，尚未证明发送 | 用原请求和原幂等键查询 |
| `dispatched` | 已交给浏览器执行，尚未证明发送 | 用原请求和原幂等键查询 |
| `sent` | 仅当 `job` 同时带 `externalMessageId` 和 `platformSentAt` 才可报告已发送 | 报告真实成功结果 |
| `failed` | 已证明失败 | 报告失败；只有用户决定再次发送时才用新幂等键创建新意图 |
| `expired` | 未交付执行即过期（含确认卡超时未处理） | 报告过期；只有用户决定再次发送时才用新幂等键创建新意图 |
| `result_unknown` | 发送结果未知，可能已经发出 | **停止，绝不自动重发**；提示用户先在 Etsy 会话核对 |

`awaiting_confirmation`、`queued`、`dispatched`、HTTP 201 或拿到 `jobId` 都不等于客户已经收到消息；
尤其 `awaiting_confirmation` 连「已经在发」都算不上——它在等一个人点按钮。没有
`job.status=sent + job.externalMessageId + job.platformSentAt` 的完整证据，禁止说“已发送”。

## 6. 错误与安全边界

- 只有实际请求返回的 JSON 错误码才可对用户报告，且错误码必须逐字复述；不要把文档里的可能性冒充实测，也不要换成自以为更好懂的另一个码。
- 客户、订单、快递单号或会话匹配不唯一时停止，禁止选“第一个”。
- 功能未启用、服务未生效、租户绑定缺失或插件能力不足时，如实报告并停止，不绕过门禁。
- 不在日志、回复或 Base 客服记录中暴露鉴权令牌；订单号等敏感标识在面向用户的总结中按既有脱敏规则展示。
- 发送成功后如需记录客服结果，将用户最终发送版本及结果摘要写入 `Orders 订单`.`客服记录`；不要把“创建 job”写成“已发送”。
