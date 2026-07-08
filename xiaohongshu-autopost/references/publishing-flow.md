# Publishing Flow（模式 C 的执行手册）

> 🚧 **当前小红书 adapter = `staged`，未对外开放。本手册描述的是「对外放行后」才走的真实发布路径，现在「只读不跑」**——
> Mode C 当前只组草稿 + 人工发布清单，**不创建真实 server publish job**。对外放行（adapter-registry 小红书行改 `enabled`）后本手册才生效。
>
> 与 `pinterest-autopin/references/publishing-flow.md` 同款三层契约，把 `pinterest` 换成 `xiaohongshu`、pin 字段换成笔记字段。

模式 C 从 `社媒发布队列` 表中 `平台 = 小红书` 的一行草稿出发，通过 yanggedianzhang 服务器创建小红书 browser tool job，再由现有浏览器插件在租户小红书登录态里执行。

Hermes 不运行 Playwright，不打开本地 Chrome profile，不存登录态。

---

## 总体流程

```text
`社媒发布队列` 小红书草稿（平台 = 小红书）
   │
   ├─[0] 校验业务字段与素材授权
   │
   ├─[1] Hermes 调服务器：POST /api/tools/xiaohongshu/jobs
   │       创建 test job
   │
   ├─[2] 浏览器插件领取 test job
   │       GET /api/browser-tools/jobs/next?capability=xiaohongshu&stage=test
   │       GET /api/browser-tools/jobs/asset?jobId=...
   │       在小红书发布页按服务端下发的笔记 recipe 填表，不点发布
   │       POST /api/browser-tools/jobs/result
   │
   ├─[3] 用户目视确认 test 页面（封面 / 图序 / 文案 / 话题）
   │       不 OK → 改 Base / 改变体 / 重建 test job
   │
   ├─[4] 用户在对话里说"发吧 / publish / final"
   │
   ├─[5] Hermes 调服务器：POST /api/tools/xiaohongshu/jobs/confirm-publish
   │       将 test_succeeded job 转成 publish job
   │
   └─[6] 浏览器插件领取 publish job 并回传 resultUrl（公开笔记 URL）
           成功 → 回写 发布 URL / 状态=已发 / 发布时间
           失败 → 回写 状态=失败 / 失败原因分类
```

---

## [0] 发布前校验

从 `社媒发布队列` 表读取目标行，校验：

1. `平台 = 小红书`。
2. `状态` 是 `草稿` / `待审` / `已批准`（用户已确认的）。
3. `标题` 非空且不超过小红书标题限制；`正文` 非空。
4. 对外放行前不要求 `平台扩展 (typed)`；`note_type` / `topic_tags` / `cover_caption` 先在人工发布清单里显式展示。对外放行后再按 `XiaohongshuExt` validator 写结构化字段。
5. 商品型笔记 `链接` 来自 `Products 商品` 表 `分享链接`（缺则留空标待补，不拼 URL）。
6. `关联素材` 指向 `Asset Variants 派生素材` 的小红书规格变体（3:4 封面 / 商品图），`公开授权 = 已授权`、AI 清理已记录；封面 + 图序在草稿/人工清单里明确，只有真实发布器读取时才补字段。
7. 素材已能由服务器提供给插件下载——不要把本地绝对路径当上传源。

图文笔记 / 视频笔记按 `note_type` 区分；服务器 / 插件当前 capability 不支持的 `note_type` 或图片数，停在草稿或转人工，不硬发。

---

## [1] 创建 Test Job

```http
POST https://yanggedianzhang.com/api/tools/xiaohongshu/jobs
Authorization: Bearer <HERMES_TOOL_SECRET>
Content-Type: application/json
```

请求体（笔记字段，camelCase 对齐 pinterest 约定）：

```json
{
  "tenantId": "tenant_xxx",
  "noteType": "图文笔记",
  "title": "一只适合慢下来的手作茶杯",
  "body": "正文……（中文）",
  "topics": ["手作茶具", "新中式", "送礼"],
  "coverCaption": "封面文案（可读性关键）",
  "link": "https://example.com/listing/1",
  "assets": [
    { "ref": "variant_xxx", "order": 1, "isCover": true },
    { "ref": "variant_yyy", "order": 2 }
  ]
}
```

成功响应：

```json
{
  "ok": true,
  "job": {
    "jobId": "xhs_test_...",
    "platform": "xiaohongshu",
    "stage": "test",
    "status": "ready_for_test",
    "assetUrl": "/api/browser-tools/jobs/asset?jobId=xhs_test_..."
  }
}
```

把 `jobId` 写入 `社媒发布队列` 的 `外部队列 ID`（或表里已有的 `ECS job ID`），状态改成 `发布中`（test 阶段）/ 备注 `待测试确认`。

---

## 创建 Job 的错误处理

| HTTP / error | 含义 | Hermes 怎么处理 |
|---|---|---|
| `401 UNAUTHORIZED` | Hermes 工具密钥错误或缺失 | 停止，提示管理员修服务器配置 |
| `404 TENANT_BINDING_NOT_FOUND` | 租户没有 server binding | 停止，提示管理员先绑定租户 |
| `409 BROWSER_TOOL_INSTALL_REQUIRED` | 服务器还没看到该租户插件上线 | 把响应里的 `userMessage` 原样转述给用户，不编 token |
| `426 BROWSER_TOOL_UPGRADE_REQUIRED` | 插件版本低或缺 `xiaohongshu` capability | 把响应里的 `userMessage` 原样转述给用户 |
| `503 HERMES_TOOL_DISABLED` | 服务器未启用 Hermes tool | 停止，提示管理员配置服务端 |

安装 / 升级类错误不算发布失败；队列表保持草稿 / 待审，降级走人工发布清单。

---

## [2] 浏览器插件 Test 执行

插件侧由浏览器执行器完成，Hermes 只等结果：

```http
GET /api/browser-tools/jobs/next?capability=xiaohongshu&stage=test
Authorization: Bearer <browserToolToken>
X-Browser-Tool-Version: <ver>
X-Browser-Tool-Capabilities: etsy-dm,pinterest,xiaohongshu
```

插件下载素材：`GET /api/browser-tools/jobs/asset?jobId=<jobId>`，按服务端下发的**笔记 recipe**（原语序列 + 选择器 + fallback）填表，回传：

```http
POST /api/browser-tools/jobs/result
```

```json
{ "jobId": "xhs_test_...", "ok": true, "note": "preview filled" }
```

test 安全边界：填表 + 预览，不点发布。用户必须目视确认小红书发布页（封面 / 图序 / 文案 / 话题）。

---

## [3] Test 结果处理

| 状态 | 含义 | Hermes 怎么处理 |
|---|---|---|
| `test_succeeded` | 插件已完成 test 填表 | 让用户确认页面是否正确 |
| `test_failed` | 插件未能完成 test | 读失败 note → 写 `失败原因分类`（DOM漂移 / 平台拒绝 / …），修正后重建 test job |
| `claimed_for_test` 长时间不变 | 插件领取后掉线 / 浏览器关闭 | 等 lease 过期后可重新领取；不要创建重复 job |

用户说封面 / 文案 / 话题 / 链接不对 → 回 Base 改源字段（或回 assets-library 模式 E 改变体）→ 重建 test job。

---

## [5] 确认 Final / Publish

前置：用户明确说"发 / publish / 真发 / final"。test 没过不进 final。

```http
POST https://yanggedianzhang.com/api/tools/xiaohongshu/jobs/confirm-publish
Authorization: Bearer <HERMES_TOOL_SECRET>
Content-Type: application/json
```

```json
{ "tenantId": "tenant_xxx", "jobId": "xhs_test_..." }
```

成功把同一 job 转成 `stage=publish` / `status=ready_for_publish`。返回 `JOB_NOT_TESTED` 说明 test 没成功，不要绕过。

---

## [6] Final 结果回写

插件领取 publish job：`GET /api/browser-tools/jobs/next?capability=xiaohongshu&stage=publish`，回传：

```json
{ "jobId": "xhs_test_...", "ok": true, "note": "publish confirmed", "resultUrl": "https://www.xiaohongshu.com/explore/abc123" }
```

成功时用 `lark-base` 回写 `社媒发布队列`（**adapter owner 执行状态列 + 平台结果列**，按状态机 `发布中→已发`）：

```text
- 状态: 已发
- 发布 URL: {resultUrl}        # 公开笔记 URL，拿不到不能标已发
- 平台 post id: {从 resultUrl 解析的 note id}
- 发布时间: {now YYYY-MM-DD HH:mm}
- 失败原因: 清空
```

失败时：

```text
- 状态: 失败
- 失败原因分类: {会话过期 / 限速 / DOM漂移 / 平台拒绝 / 网络 / 其他}
- 失败原因: {原文截断到 100 字符}
```

幂等：插件迟到上报不得造成重复发布（同 `jobId` 只回写一次）。
