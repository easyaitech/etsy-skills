# Instagram 任务接口

按 [后端访问约定](../../shared/backend-api-access.md) 获取运行时变量。统一 POST `$YANGGEDIANZHANG_API_BASE/api/hermes/instagram/jobs`；Bearer 使用 `YANGGEDIANZHANG_HERMES_TOOL_TOKEN`，body 的 `tenantId` 来自 `YANGGEDIANZHANG_TENANT_ID`。请求 JSON 放文件，用本 skill 的 `scripts/request.py <文件>` 调用；脚本注入租户，使用 curl，不输出 token。

成功响应为 `{ "ok": true, "data": ... }`；失败读本次实际 JSON 的 `error`，不要据本文臆造运行结果。

| action | 额外字段 | data |
|---|---|---|
| `capabilities` | 无 | 支持媒体、上限、最低插件版本、`publishEnabled` |
| `create` | `idempotencyKey`, `username`, `caption`, `assetFileToken`, 可选 `mode` / `scheduledAt`；publish 时必须 `confirmPublishApproval=true` | 任务；重复键或相同内容可能返回已有任务 |
| `status` | `jobId` | 任务 |
| `list` | 无 | 本租户最近最多 100 条任务 |
| `approve` | `jobId`, `confirmPublishApproval=true` | 将已预览任务转为待发布，重复确认不复活终态 |
| `cancel` | `jobId` | 只允许 queued / previewed / failed / cancelled |
| `resolve` | `jobId`, `confirmOwnerVerification=true`, `resolution=published` 和真实 `resultUrl`，或 `resolution=not_published` | 仅解决 uncertain；必须先有店主明确核对结论 |

任务字段：`id`, `username`, `caption`, `mode`, `status`, `scheduledAt`, `createdAt`, `updatedAt`，以及可选 `error`, `resultUrl`, `evidence`。响应时间为 Unix 毫秒；创建请求的 `scheduledAt` 为含 `Z` 或 `+08:00` 等时区的 ISO 时间。默认 mode 是 preview；未给时间则立即排队。

创建预览的请求文件：

```json
{
  "action": "create",
  "idempotencyKey": "填写本次业务意图的稳定键",
  "username": "填写真实目标账号",
  "assetFileToken": "填写实际视频的文件 token",
  "caption": "填写已确认的完整文案",
  "mode": "preview"
}
```

只有 `published` 可报告分享成功；`previewed` 只是预览。`evidence=shared_confirmation` 来自插件对平台成功提示的确认，`owner_verified_published` 来自店主人工对账，两者如实区分。结果 URL 必须是实际核对的 `https://www.instagram.com/reel/<code>/` 或 `/p/<code>/`，无查询参数。

幂等键绑定原始输入；同键换账号、视频 token、文案或显式排期会冲突。同视频字节、账号和文案的未失败任务还会跨键去重，不能靠换键绕过待核对任务。首次预览后要发同一份内容，走 approve，不新建 publish 意图。

## 运维开通

后端部署并通过验收后，管理员配置 `INSTAGRAM_PUBLISH_ENABLED=1`，将准许发布的租户加入逗号分隔的 `INSTAGRAM_PUBLISH_TENANTS`。插件需 `instagram-reels-v1` 能力和 Instagram 站点权限，升级后核实心跳版本。先用自有租户预览和受控发布验收，再扩大名单。skill 不修改这些配置。
