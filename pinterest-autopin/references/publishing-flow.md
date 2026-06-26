# Publishing Flow（模式 C 的执行手册）

模式 C 从 `社媒发布队列` 表中的一行草稿出发，通过 yanggedianzhang 服务器创建 Pinterest browser tool job，再由现有浏览器插件在租户 Chrome 登录态里执行。

Hermes 不运行 Playwright，不打开本地 Chrome profile，不写 `request.json` 给本地工具。

---

## 总体流程

```text
`社媒发布队列` Pinterest 草稿
   │
   ├─[0] 校验业务字段与素材授权
   │
   ├─[1] Hermes 调服务器：POST /api/tools/pinterest/jobs
   │       创建 test job
   │
   ├─[2] 浏览器插件领取 test job
   │       GET /api/browser-tools/jobs/next?capability=pinterest&stage=test
   │       GET /api/browser-tools/jobs/asset?jobId=...
   │       在 Pinterest 页面填表，不自动发布
   │       POST /api/browser-tools/jobs/result
   │
   ├─[3] 用户目视确认 test 页面
   │       不 OK → 改 Base / 改素材 / 重建 test job
   │
   ├─[4] 用户在对话里说"发吧 / publish / final"
   │
   ├─[5] Hermes 调服务器：POST /api/tools/pinterest/jobs/confirm-publish
   │       将 test_succeeded job 转成 publish job
   │
   └─[6] 浏览器插件领取 publish job 并回传 resultUrl
           成功 → 回写 发布 URL / 状态=已发 / 发布时间
           失败 → 回写 状态=失败 / 失败原因
```

---

## [0] 发布前校验

从 `社媒发布队列` 表读取目标行，校验：

1. `平台 = Pinterest`。
2. `状态` 是 `草稿` / `待发` / 用户明确确认的 `待复核`。
3. `标题` 非空且不超过 Pinterest title 限制。
4. `描述` 非空。
5. `链接` 是 absolute `http(s)` URL；商品型 pin 必须来自 `Products 商品` 表 `分享链接`。
6. `Board (Pinterest)` 非空。
7. `Alt Text (EN)` 非空。
8. 关联素材公开授权为 `已授权`，并完成 AI metadata / watermark 清理记录。
9. 素材已经能由服务器提供给浏览器插件下载。不要把本地绝对路径当成浏览器上传源。

当前已上线的最小服务器接口只接收单条 pin 的 `title` / `description` / `altText` / `link` / `board`。如果目标行是多图轮播，必须先确认服务器和插件已支持多素材 job；否则停在草稿或转人工发布，不要拆成多个单图冒充轮播。

---

## [1] 创建 Test Job

Hermes 调用服务器工具接口：

```http
POST https://yanggedianzhang.com/api/tools/pinterest/jobs
Authorization: Bearer <HERMES_TOOL_SECRET>
Content-Type: application/json
```

请求体：

```json
{
  "tenantId": "tenant_xxx",
  "title": "A calm gift idea",
  "description": "A test Pinterest pin.",
  "altText": "A handmade ceramic cup on a linen cloth in soft morning light.",
  "link": "https://example.com/listing/1",
  "board": "Gift Ideas"
}
```

成功响应：

```json
{
  "ok": true,
  "job": {
    "jobId": "pin_test_...",
    "platform": "pinterest",
    "stage": "test",
    "status": "ready_for_test",
    "title": "...",
    "description": "...",
    "altText": "...",
    "link": "...",
    "board": "...",
    "assetUrl": "/api/browser-tools/jobs/asset?jobId=pin_test_..."
  }
}
```

把 `jobId` 写入 `社媒发布队列` 的 `外部队列 ID` 或备注，并把状态改成 `测试中` / `待测试确认`。

---

## 创建 Job 的错误处理

| HTTP / error | 含义 | Hermes 怎么处理 |
|---|---|---|
| `401 UNAUTHORIZED` | Hermes 工具密钥错误或缺失 | 停止，提示管理员修服务器配置 |
| `404 TENANT_BINDING_NOT_FOUND` | 租户没有 server binding | 停止，提示管理员先绑定租户 |
| `409 BROWSER_TOOL_INSTALL_REQUIRED` | 服务器还没看到该租户插件上线 | 把响应里的 `userMessage` 原样转述给用户，不编 token |
| `426 BROWSER_TOOL_UPGRADE_REQUIRED` | 插件版本低或缺 `pinterest` capability | 把响应里的 `userMessage` 原样转述给用户 |
| `503 HERMES_TOOL_DISABLED` | 服务器未启用 Hermes tool | 停止，提示管理员配置服务端 |

安装 / 升级类错误不算发布失败；队列表保持草稿或待配置状态。

---

## [2] 浏览器插件 Test 执行

插件侧流程由浏览器执行器完成，Hermes 只等待结果：

```http
GET /api/browser-tools/jobs/next?capability=pinterest&stage=test
Authorization: Bearer <browserToolToken>
X-Browser-Tool-Version: 0.5.1
X-Browser-Tool-Capabilities: etsy-dm,pinterest
```

插件拿到 job 后下载素材：

```http
GET /api/browser-tools/jobs/asset?jobId=<jobId>
Authorization: Bearer <browserToolToken>
```

插件执行后回传：

```http
POST /api/browser-tools/jobs/result
Authorization: Bearer <browserToolToken>
Content-Type: application/json
```

```json
{
  "jobId": "pin_test_...",
  "ok": true,
  "note": "preview appeared"
}
```

test job 的安全边界：填表和预览，不代表已经发布。用户必须目视确认 Pinterest 页面。

---

## [3] Test 结果处理

服务器 job 状态：

| 状态 | 含义 | Hermes 怎么处理 |
|---|---|---|
| `test_succeeded` | 插件已完成 test 填表 | 让用户确认页面是否正确 |
| `test_failed` | 插件未能完成 test | 读取失败 note，写入队列表备注 / 失败原因，修正后重建 test job |
| `claimed_for_test` 长时间不变 | 插件领取后掉线或浏览器关闭 | 等 lease 过期后可重新领取；不要创建重复 job |

用户说图片、文案、board、链接不对时，回到 Base 修改源字段，再重新创建 test job。

---

## [5] 确认 Final / Publish

前置：用户在对话里明确说"发 / publish / 真发 / final"。test 没过的不要进 final。

Hermes 调用：

```http
POST https://yanggedianzhang.com/api/tools/pinterest/jobs/confirm-publish
Authorization: Bearer <HERMES_TOOL_SECRET>
Content-Type: application/json
```

```json
{
  "tenantId": "tenant_xxx",
  "jobId": "pin_test_..."
}
```

成功响应会把同一个 job 转成：

```json
{
  "ok": true,
  "job": {
    "jobId": "pin_test_...",
    "stage": "publish",
    "status": "ready_for_publish"
  }
}
```

如果返回 `JOB_NOT_TESTED`，说明 test 没成功或还没回传结果；不要绕过。

---

## [6] Final 结果回写

插件领取 publish job：

```http
GET /api/browser-tools/jobs/next?capability=pinterest&stage=publish
Authorization: Bearer <browserToolToken>
```

插件回传：

```json
{
  "jobId": "pin_test_...",
  "ok": true,
  "note": "publish confirmed",
  "resultUrl": "https://www.pinterest.com/pin/123/"
}
```

成功时，用 `lark-base` 回写 `社媒发布队列`：

```text
- 状态: 已发
- 发布 URL: {resultUrl}
- 发布时间: {now in YYYY-MM-DD HH:mm}
- 失败原因: 清空
```

失败时：

```text
- 状态: 失败
- 失败原因: {分类} - {原文截断到 100 字符}
- 发布尝试次数: +1
- 最后尝试时间: {now}
```

回写前按通用协议列出改动让用户确认。

---

## 错误恢复

### 浏览器插件离线

如果 job 长时间停在 ready / claimed，不把它标成成功。告诉用户打开 Chrome、确认插件已启用、Pinterest 已登录，再让插件重新领取任务。

### Pinterest 登录失效

插件或 Pinterest 页面会暴露登录状态问题。让用户在自己的 Chrome 里重新登录 Pinterest，然后重试。Hermes 不输入凭据。

### board 不存在

`社媒发布队列` 表里的 board 名和 Pinterest 后台不一致：

1. 让用户去 Pinterest 后台核对实际 board 名。
2. 如果是后台拼写错，用户改后台。
3. 如果是 Base 字段填错，用 `lark-base` 改 `Board (Pinterest)`，并修正单选选项。
4. 重建 test job。

### 素材下载 / 上传失败

不要回退成本地路径上传。检查服务器 asset 是否可下载、图片尺寸是否满足 Pinterest 要求、插件是否能把 Blob/File 注入上传控件。失败原因写回 job 和队列表。

### 网络 / Pinterest 临时错误

第一次失败可等 30 秒后重试一次；第二次还失败就停在 `失败`，等待人工介入。盲目重试可能触发 Pinterest 风控。

---

## 不要做的事

- 不要在 Hermes 本机跑 Playwright、CDP、`npm run pin:*`。
- 不要把 Chrome profile、cookie、token 写入工作区、Base 或对话。
- 不要绕过 test 直接 final（除非用户明确说已测过并要求 final）。
- 不要并发跑多个 final。
- 不要替用户解 Pinterest 的人机验证 / 二次验证。
- 不要把任何响应里的疑似登录态字符串写进 Base 或对话。
- 不要手动拆分轮播 pin 为多个单图 pin 发布。
