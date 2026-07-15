# 给特定订单的买家发 Etsy 站内信：飞书定稿 → 插件在订单页定位 → 代发

仅在目标销售平台是 **Etsy**、且在**飞书对话**里店主要求「给某个订单的买家发消息」时使用。典型场景：买家收货后引导评价、主动告知发货延迟、定制细节确认。

**和 [`etsy-reply-draft-tool.md`](etsy-reply-draft-tool.md) 的分工——按「有没有现成会话」选，不要混用**：

| 情况 | 用哪个 | 结局 |
|---|---|---|
| 买家先发了消息、要**回复已有会话** | `etsy-reply-draft-tool.md` | 只填进回复框，店主手动点发送 |
| 要**主动找某个订单的买家**说话（没有会话 / 不知道买家名） | **本文件** | 插件按订单号定位并**代为发送** |

> **别再向店主要「买家会话信息」**：只要店主给了订单号，就走本文件——插件会在 Etsy 订单页（`/your/orders/sold/new` 和 `/your/orders/sold/completed` 两个页签都查）按订单号找到订单卡，点订单行右侧的聊天 icon 直接开消息窗口。买家名 / 会话 id 都不是必需的。

链路：店主在飞书跟你确认消息文本 + 订单号 → 你调服务器工具暂存 → 店主机器上的浏览器插件（≥0.5.52）约 1 分钟内在隐藏 tab 里定位订单、填入消息、**代点发送** → 结果经飞书回执告知店主。角色分工按 [`../../shared/tools-architecture.md`](../../shared/tools-architecture.md)：你只负责想内容和调接口，队列、鉴权、定位、发送都在 ECS 控制面 + 插件。

> **鉴权**：`Authorization` 用**按租户派生的 Hermes 工具令牌**（provisioning 时注入网关，Hermes 不手写 / 不读取 / 不回显）。`401 UNAUTHORIZED` / `503 HERMES_TOOL_DISABLED` 是服务端配置问题，提示管理员，别自行编造令牌。

---

## [1] 起草与定稿（飞书内迭代）

按模式 C 的正常流程起草：读 BRAND.md（语调）+ SHOP.md（政策原文，绝不自编承诺）+ [`order-handling.md`](order-handling.md)（场景 SOP）+ [`platforms/etsy.md`](platforms/etsy.md)（英文措辞示例）。订单上下文从 `Orders 订单` 表取（商品、定制文字、买家、承诺发货日）。草稿整篇展示给店主，在飞书里改到店主明确认可。

## [2] 暂存消息（店主确认后才调，一次）

**进入条件**：店主对**这条具体文本**明确说「就这么发 / 发吧 / 帮我发给他」。**这一步之后就是真实代发，飞书里的这次确认是全链路唯一的人工闸**——讨论没定稿、或店主只说了「帮我催下评价」而没看过文本，都**不要**调。

```http
POST https://yanggedianzhang.com/api/hermes/etsy-dm/order-message
Content-Type: application/json
```

```json
{
  "tenantId": "tenant_xxx",
  "orderNumber": "4112506739",
  "message": "Hi Bryan, hope the scroll arrived safely! ...",
  "buyerName": "Bryan"
}
```

- `orderNumber`：**6~20 位数字**，可带 `#` 前缀（`#4112506739` 也行）；从 `Orders 订单` 表「订单号」字段或店主直接给的订单号取。格式不对 400。
- `message`：上限 4000 字符，纯文本。
- `buyerName`（可选，但**能给就给**）：这是发错人的保险闸——插件打开消息窗口后会校验窗口文本含这个名字，不含就拒发并报 `RECIPIENT_MISMATCH_SUSPECTED`。订单表里有买家名时务必带上。

成功返回 `orderMessage`（含 `messageId` / `status: "pending"`）+ `userMessage`。**把 userMessage 转述给店主**：插件约 1 分钟内会定位订单并发送，发送结果另有飞书回执。

## [3] 结果怎么知道

**没有查状态的接口，也不要轮询**。发送成功 / 失败都由服务器主动推飞书：成功 = 告知已发送 + 消息内容；失败 = 原因 + 消息全文发回店主手动处理。你在 [2] 之后就收口，等回执即可，不要追问「发了吗」。

## [4] 错误处理

| 响应 | 含义 | 你该做什么 |
|---|---|---|
| `400 INVALID_ORDER_NUMBER` | 订单号不是 6~20 位数字 | 跟店主核对订单号原文重投 |
| `400 MESSAGE_TEXT_TOO_LONG` | 超 4000 字符 | 精简后重投 |
| `409 ORDER_MESSAGE_ALREADY_DISPATCHED` | 这个订单已有一条消息**正在店主机器上执行发送** | **绝不重投**。转述 `userMessage`：结果几分钟内回报飞书，等结果出来再决定 |
| `409 ORDER_MESSAGE_LIMIT_REACHED` | 待发消息满 20 份 | 等现有消息发完 / 过期再投 |
| `409 BROWSER_TOOL_INSTALL_REQUIRED` / `426 BROWSER_TOOL_UPGRADE_REQUIRED` | 插件未装 / 版本低于 0.5.52 | 转述 `userMessage`（安装 / 升级指引），消息没有暂存 |
| `403 SERVICE_NOT_ACTIVE` | 租户服务停用 / 订阅到期 | 转述给店主，别绕开 |
| `404 TENANT_BINDING_NOT_FOUND` | 租户未绑定 | 提示管理员 |

同订单**未下发**的 pending 重投 = 修订覆盖（返回带 `replacedPendingMessageId`），不会发两条。

## [5] 红线

- **确认文本才调**：这条链路会真实发到买家手里，发出去收不回。店主没逐字认可过的文本一律不调；一次定稿只调一次。
- **超时 / 报错不要重试**：暂存请求没拿到响应时**不要**盲目重投——可能已经暂存并正在发送。如实告诉店主「不确定是否已暂存，请等飞书回执」。宁可漏发（有飞书兜底）也绝不双发（骚扰买家不可挽回）。
- **回执后收口**：店主收到「已发送」回执后，按模式 C 第 6 步把发出的版本回写 `Orders 订单` 表「客服记录」+ 按需更新 `签收评价消息状态` 等履约字段。
- 客户对话是敏感内容：飞书里引用买家信息只取讨论所需片段，不整段倾倒。
