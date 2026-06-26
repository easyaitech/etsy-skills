# Social Publisher Adapter Registry

本文件定义 social-publisher 当前能真正发布哪些平台。没有在这里标成 `enabled` 的平台，不能自动上传或发布。

| 平台 | 状态 | 支持发布类型 | 执行层 | 关键前置 | 说明 |
|---|---|---|---|---|---|
| Pinterest | enabled | 单图；多图轮播需服务器 / 插件显式支持后再 final | `pinterest-autopin` → yanggedianzhang server browser tool | 服务器工具可用、租户浏览器插件可用、`社媒发布队列` 表可用 | 当前唯一真实发布适配器。发布过程必须走 server test job → 用户确认 → server publish job，并回写 社媒发布队列。 |
| 小红书 | planned/manual-only | 图文笔记 / 视频草稿 / 人工对账 | 暂无 | 未来需要明确 API / 后台自动化方案、登录态、安全确认、字段校验 | 当前只能生成 社媒发布队列 草稿和人工发布清单；用户给出公开笔记 URL 后可对账。 |
| Instagram | planned/manual-only | 单图 / 多图轮播 / Reels 草稿 / 人工对账 | 暂无 | 未来需要平台工具或 API 适配器 | 不自动发布。 |
| TikTok | planned/manual-only | 视频草稿 / 人工对账 | 暂无 | 未来需要平台工具或 API 适配器 | 不自动发布。 |

## Adapter 接入契约

新增平台适配器时必须补齐：

1. **认证边界**：登录态 / token 存在哪里，是否需要用户手动登录，skill 不保存明文凭据。
2. **输入映射**：社媒发布队列 字段如何映射到平台请求。
3. **发布前校验**：素材数量、比例、视频时长、标题长度、标签限制、链接要求。
4. **dry run / preview**：真实发布前是否能预览；不能预览的平台必须提高人工确认门槛。
5. **成功回写**：公开 URL、发布时间、平台返回 ID。
6. **失败回写**：失败分类、原始错误摘要、是否可重试。
7. **自动发布守卫**：什么条件下允许 `自动发布 = true` 的任务无人值守执行。

## Pinterest 适配器规则

- 只通过 `pinterest-autopin` 这个 adapter 调服务器工具发布，不在 social-publisher 里复制 Pinterest 表单逻辑。
- 单图和多图轮播都是 社媒发布队列 里 `平台 = Pinterest` 的行，由 `pinterest-autopin` 直接读写本行发布，不另建子队列表。
- Pinterest 行的 `任务 ID`（`PIN-...`）就是本表主键，`外部队列 ID` 留空。
- `发布 URL` 保存 Pinterest 返回的公开 Pin URL。
- 如果发布器只创建了广告草稿或拿不到公开 Pin URL，不能标记 `已发`。
- Hermes 不跑本地 Playwright / Chrome profile；浏览器登录态只在租户已安装的浏览器插件中使用。

## 小红书 future adapter 规则

- 当前没有 enabled adapter，不得自动上传图片、视频或发布笔记。
- 社媒发布队列 可以保存标题、正文、标签、话题、封面素材、商品 ID、人工审核备注。
- 未来启用前必须先补本文件状态为 `enabled`，并新增小红书 adapter reference，说明登录、字段校验、dry run、发布 URL 提取和失败恢复。
