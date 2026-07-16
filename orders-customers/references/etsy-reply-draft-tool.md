# Etsy 站内信回复：飞书定稿 → 服务器工具填入回复框

仅在目标销售平台是 **Etsy**、且在**飞书对话**里给店主起草站内信回复时使用。这是 `etsy.md` preset §自动化边界的**唯一放宽**：定稿后的回复草稿可以经服务器工具自动填进 Etsy Messages 的回复框——**只填入，绝不发送**，最终由店主在 Etsy 页面核对后手动点击发送。

链路：店主在飞书跟你讨论定稿 → 你调服务器工具暂存草稿 → 店主机器上的浏览器插件（≥0.5.45）约 1 分钟内自动打开对应会话、填入回复框 → 插件回执经飞书告知店主去点发送。角色分工按 [`../../shared/tools-architecture.md`](../../shared/tools-architecture.md)：你只负责想内容和调接口，队列、鉴权、填入都在 ECS 控制面 + 插件。

> **鉴权**：两个接口的 `Authorization` 都用**按租户派生的 Hermes 工具令牌**（provisioning 时注入网关，Hermes 不手写 / 不读取 / 不回显）。`401 UNAUTHORIZED` / `503 HERMES_TOOL_DISABLED` 是服务端配置问题，提示管理员，别自行编造令牌。变量名、在 terminal / execute_code 里怎么按引用取用、怎么自查有没有注入，见 [`../../shared/backend-api-access.md`](../../shared/backend-api-access.md)。

---

## [1] 读会话（讨论回复前先拿上下文）

```http
POST https://yanggedianzhang.com/api/hermes/etsy-dm/conversations
Content-Type: application/json
```

列表（轻视图，不带正文）：

```json
{ "tenantId": "tenant_xxx", "limit": 10 }
```

返回 `conversations[]`：`conversationKey` / `buyerName` / `lastMessagePreview` / `lastMessageAtText` / `unread` / `hasPendingReplyDraft`。

单条（带正文，讨论怎么回时用这个）：

```json
{ "tenantId": "tenant_xxx", "buyerName": "Alice" }
```

或用 `conversationKey` 精确指定。返回 `conversation`（含 `messages[]` 结构化正文）+ `threadTextExcerpt`（原始对话文本节选）+ `replyDraft`（该会话已有草稿及其状态，`filled` = 已填入回复框）。

会话数据来自店主浏览器插件在 Etsy Messages 页的同步——**可能不是实时的**。店主说「刚收到消息」但接口里没有时，请店主先打开 Etsy Messages 页（插件会自动同步），再重试。

## [2] 起草与定稿（飞书内迭代）

按模式 C 的正常流程起草：读 BRAND.md（语调）+ SHOP.md（政策原文，绝不自编承诺）+ [`order-handling.md`](order-handling.md)（场景 SOP）+ [`platforms/etsy.md`](platforms/etsy.md)（英文措辞示例）。草稿整篇展示给店主，在飞书里改到店主明确认可。

## [3] 暂存草稿（店主确认后才调）

**进入条件**：店主明确说「就这么回 / 发吧 / 帮我填进去」这类确认。讨论没定稿前**不要**调。

```http
POST https://yanggedianzhang.com/api/hermes/etsy-dm/reply-draft
Content-Type: application/json
```

```json
{
  "tenantId": "tenant_xxx",
  "conversationKey": "/messages/123456",
  "draft": "Thanks for reaching out! Your order ships on Monday..."
}
```

- **优先用 [1] 拿到的 `conversationKey`** 精确指定；只有名字唯一时才可用 `buyerName` 定位。
- `draft` 上限 4000 字符，纯文本（填的是 Etsy 回复框 textarea）。
- 同一会话重投 = 修订：旧的未填草稿被新稿直接覆盖，不会重复填两条。

成功返回 `draft`（含 `draftId` / `status: "pending"`）+ `userMessage`。**把 userMessage 转述给店主**：插件约 1 分钟内会打开该会话并填入回复框，请在 Etsy 核对内容后手动点击发送；填入成功 / 失败都会另有飞书回执。

## [4] 错误处理

| 响应 | 含义 | 你该做什么 |
|---|---|---|
| `409 CONVERSATION_AMBIGUOUS` | 买家名匹配到多个会话 | 用返回的 `candidates` 列给店主选，拿 `conversationKey` 重试 |
| `404 CONVERSATION_NOT_FOUND` | 没有这个会话（插件还没同步到） | 请店主打开 Etsy Messages 页刷新，稍后重试；`candidates` 里有最近会话可对照 |
| `409 BROWSER_TOOL_INSTALL_REQUIRED` / `426 BROWSER_TOOL_UPGRADE_REQUIRED` | 插件未装 / 版本低于 0.5.45 | 转述 `userMessage`（安装 / 升级指引），草稿没有暂存 |
| `400 DRAFT_TEXT_TOO_LONG` | 草稿超 4000 字符 | 精简后重投 |

## [5] 红线

- **绝不发送**：这个工具到「填入回复框」为止；不要向店主暗示会自动发出，也不要催「已发送」。发送动作只属于店主。
- **定稿才暂存**：一次讨论只在店主确认后调一次 [3]；改稿就重投（覆盖），不要一稿多投刷屏。
- **填入回执后收口**：店主发出后，按模式 C 第 6 步把最终版本回写 `Orders 订单` 表「客服记录」（如果消息关联到订单）+ 按需更新客户标签。
- 客户对话是敏感内容：飞书里引用买家消息只取讨论所需片段，不整段倾倒。
