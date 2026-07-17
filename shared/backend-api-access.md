# 后端 API 访问约定（Hermes 侧）

[`tools-architecture.md`](tools-architecture.md) §接口形态 第 4 点定死了「agent 调工具的真实路径 = Hermes skill → 调 ECS 的 HTTP endpoint（薄、无密钥、带租户 session key）」。**本文是那条路径的落地细节**：你在 Hermes 里拿什么、在哪能拿到、怎么调、怎么判断成没成。

各端点自己的请求体和字段语义**不在本文**——那些写在各 skill 的 reference 里（如 [`../orders-customers/references/etsy-order-message-tool.md`](../orders-customers/references/etsy-order-message-tool.md)）。本文只管**访问约定**，全 skill 共用。

---

## 三个环境变量

provisioning 时由管理员注入网关进程，**你不配置、不修改、不猜**：

| 变量 | 是什么 | 怎么用 |
|---|---|---|
| `YANGGEDIANZHANG_API_BASE` | ECS 控制面根地址 | 拼在端点路径前。**不要硬编码域名、不要猜 `localhost:<端口>`**——后端不跑在你这台机器上，地址只有这一个来源 |
| `YANGGEDIANZHANG_TENANT_ID` | 当前 profile 对应的租户 ID | 端点要求时放进请求 **body 的 `tenantId`** |
| `YANGGEDIANZHANG_HERMES_TOOL_TOKEN` | 该租户的**派生**工具令牌 | `Authorization: Bearer <它>` |

令牌是**按租户派生**的：服务端按 `(master secret, tenantId)` 推导后比对，网关只拿到自己租户那一份，无 master 无法伪造他人的。所以 token ≠ tenantId，**tenantId 是公开标识符，永远不能拿来当凭据**（见 [`tools-architecture.md`](tools-architecture.md) §安全红线）。

### 令牌只按引用使用（硬性）

各 skill 的鉴权段写的「Hermes 不手写 / 不读取 / 不回显」在本文这样落地：

- ✅ 在命令里写 `$YANGGEDIANZHANG_HERMES_TOOL_TOKEN`，让 shell 展开——**你自始至终看不到它的值**。
- ❌ 不 `echo` / `print` / 写进文件 / 塞进日志 / 回显给用户 / 在总结里复述。
- ❌ 不自己编一个令牌、不从别处抄一个、不把 tenantId 或店铺名当 bearer。

需要自查变量在不在时，**只看长度、不看值**：

```bash
echo "API_BASE=${YANGGEDIANZHANG_API_BASE:-<unset>} TENANT=${YANGGEDIANZHANG_TENANT_ID:-<unset>} TOKLEN=${#YANGGEDIANZHANG_HERMES_TOOL_TOKEN}"
```

`TOKLEN=0` 或 `API_BASE=<unset>` = 这台机器上没注入，**这是管理员的配置问题**：如实告诉用户「后端工具当前没接通，需要管理员补配置」，然后停。不要绕路、不要编一个令牌试、不要把它说成用户的问题。

---

## 在哪能拿到

**`terminal` 和 `execute_code` 都能拿到**这三个变量。

注入链路两段，缺任一段变量就不可见：

1. **进网关进程**：launchd plist（`~/Library/LaunchAgents/ai.hermes.gateway-<profile>.plist`）的 `EnvironmentVariables` 字典。
2. **进子进程**：profile `config.yaml` 的 `terminal.env_passthrough` 允许清单。两个沙箱默认都会把带 `KEY` / `TOKEN` 等字样的变量从子进程环境里剔掉，`env_passthrough` 是把指定变量放行的白名单——**它对 `execute_code` 和 `terminal` 同时生效**，不是 terminal 专属。

> **别把「当时拿不到」写成「execute_code 拿不到」。** 曾经有一段时间某 profile 的 plist 漏配了这三个变量（第 1 段断了），于是两个沙箱都拿不到；据此推断出的「terminal 能、execute_code 不能」是错的机制解释。判据只有一个：**按上面的自查命令实测**。

cron 的 no_agent script 跑在同一套环境里，同样能拿到。

---

## 怎么调

```bash
curl -sS -X POST "$YANGGEDIANZHANG_API_BASE/api/hermes/<endpoint>" \
  -H "Authorization: Bearer $YANGGEDIANZHANG_HERMES_TOOL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tenantId\":\"$YANGGEDIANZHANG_TENANT_ID\", ...}"
```

`tenantId` 由上面的变量注入，**不向用户索要、不自行编造**。具体端点、body 字段和返回语义看该 skill 的 reference。

两条硬性约定：

- **地址只有 `$YANGGEDIANZHANG_API_BASE` 一个来源。** 后端不跑在 Hermes 这台机器上——`localhost:<任意端口>` 上没有它。连不上一个自己拼出来的地址，说明的是地址拼错了，对后端状态什么也说明不了。
- **客户端用 curl（按上面模板）。** 站点前有边缘防护，会按客户端签名拦截非浏览器默认客户端（Python `urllib` / `requests` 的默认 User-Agent 属于此类）；被拦的请求根本到不了后端。必须用 Python HTTP 库时，显式设置一个具名 `User-Agent` 头。

---

## 怎么判断成没成（判据，不是记忆）

本后端的失败一律是 **JSON body 里的字符串码**（配 4xx 状态码），成功是该端点自己约定的 JSON。

**判据**：只有你**真的执行了请求、并读到了返回的 JSON**，才可以对用户报告某个具体结果或具体错误。

- ❌ 不凭记忆、不凭本文、不凭「一般来说」复述任何错误码或失败原因。
- ❌ 没调通就不要给用户一个看起来像实测的结论。**本文不列举失败响应样例，就是为了不让它被当成实测结果转述。**
- ❌ 返回的错误 body **不是 JSON**（纯文本 / HTML 页）→ 那不是本后端的返回，而是边缘防护拦截了你的客户端签名（见「怎么调」）。既不代表后端宕机，也与权限无关——换 curl 模板重发。
- ❌ 「后端挂了 / 没运行」不是你能下的结论。你能如实报告的只有「用什么地址、什么客户端、卡在哪一步」；后端是否在运行由管理员判断。
- ✅ 请求根本没发出去（变量缺失、命令报错）→ 如实说「没调成，卡在哪一步」，不要把它翻译成某个后端错误码。

### 公共闸门错误的判据（全 Hermes 工具端点共用）

**只有真的读到了返回 JSON 里的这些码才作数**（上面的判据原则不变；本表是"读到之后怎么办"，不是可转述的样例）。

| error | 含义 | 你该做什么 |
|---|---|---|
| `METHOD_NOT_ALLOWED` / `INVALID_JSON` | 调用方式错（非 POST / body 不是合法 JSON） | 按该端点 reference 修正请求重发 |
| `TENANT_ID_REQUIRED` | body 漏了 `tenantId` | 补 `$YANGGEDIANZHANG_TENANT_ID` 重发 |
| `UNAUTHORIZED` | 令牌与 tenantId 不匹配 | 多半是变量注入问题：按上文自查命令核对（只看长度），缺失/不符 → 如实告知需管理员补配置，停 |
| `HERMES_TOOL_DISABLED` | 服务端未启用工具通道 | 管理员配置问题，如实告知后停 |
| `TENANT_BINDING_NOT_FOUND` | 租户绑定不存在 | 管理员配置问题，如实告知后停 |
| `SERVICE_NOT_ACTIVE` | 订阅未生效/已停用（带 reason） | 如实告知店主服务状态，引导联系管理员或续费；不要重试绕过 |

以上只是**读到对应 JSON 错误码之后**的处置判据；未实际读到时，不得引用本表向用户转述任何具体错误。各端点自己的领域错误码见该 skill 的 reference。

各端点该怎么处置它自己的错误码，写在该端点的 reference 里；照那里的处置表走，别自己发挥。

---

## 飞书系统签名图片链接

用户在飞书发图后，后端会把图存下并给你一条**签名链接**（`$YANGGEDIANZHANG_API_BASE/api/feishu/message-assets/...?expiresAt=...&sig=...`）。

事实（按当前实现）：

- 签名是 HMAC + `expiresAt`，**有效期 7 天**，校验只看签名和是否过期。
- **没有 IP 绑定、没有一次性限制。** 有效期内任何上下文（后续 turn、`execute_code`、`terminal` 里 curl）都能重复取，**能下载保存到本地**。
- 链接过期或被改动 → 拿不到图；这时如实说链接失效、请用户重发，别说成「我没有能力看图」。

**所以：需要看图或处理图片时，直接下载 / 打开这条链接，不要让用户重新上传。** 后端给你这条链接就是为了让你用它。

`record-search` 等 Base 读端点返回的 `attachments[].assetUrl` 同理——那是可直接使用的真实图片输入。

---

## 附：从沙箱里跑 lark-cli 要覆盖 `HOME`

飞书访问走 lark-cli（这是 [`tools-architecture.md`](tools-architecture.md) §例外里已批准的口子，留在 Hermes 不上收 ECS）。它有一个会咬人的坑：

lark-cli 的 bot 凭证配在 **profile home** 下（`<HERMES_HOME>/home/.lark-cli/`），但 `terminal.home_mode` 为默认的 `auto` 时，主机安装上的子进程 `HOME` 指向的是**真实用户 HOME**，不是 profile home。于是 lark-cli 读不到凭证、报「未配置」。

**这对 `terminal` 和 `execute_code` 一样成立**——不是 execute_code 专属的沙箱怪癖。两边都要显式覆盖 `HOME`：

```bash
HOME="$HERMES_HOME/home" lark-cli base +record-list --base-token <...> --table-id <...>
```

`lark-cli auth status` 是判据：带上覆盖后应显示 `identity: bot` + `appId`；不带覆盖会报未配置。**报未配置时先确认 `HOME` 覆盖有没有加上**，再下「凭证坏了」的结论。

proxy 警告（`proxy detected: ...`）不影响功能，可忽略。

---

## 不是你的活

- **飞书 Base 的权限开通与协作者授权**走管理员侧的运维端点（bot 自建自持开通 / 一键授权 / 协作者对账巡检），**不是**让你或用户去飞书后台手点。Base 读写报无权限时：如实说「Base 权限没配好，需要管理员处理」，别给用户编一套后台操作步骤。
- **密钥、队列、重试编排、鉴权实现**全在 ECS。你只负责调入口、解释返回。
