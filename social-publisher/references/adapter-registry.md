# Social Publisher Adapter Registry

本文件定义 social-publisher 当前能真正发布哪些平台。没有在这里标成 `enabled` 的平台，不能自动上传或发布。

| 平台 | 状态 | 支持发布类型 | 执行层 | 关键前置 | 说明 |
|---|---|---|---|---|---|
| Pinterest | enabled | 单图；多图轮播需服务器 / 插件显式支持后再 final | `pinterest-autopin` → yanggedianzhang server browser tool | 服务器工具可用、租户浏览器插件可用、`社媒发布队列` 表可用 | 当前唯一真实发布适配器。发布过程必须走 server test job → 用户确认 → server publish job，并回写 社媒发布队列。 |
| 小红书 | adapter 已建，执行 gated | 图文笔记 / 视频笔记 | `xiaohongshu-autopost`（adapter skill 已建）→ 待服务器工具 + 插件 `xiaohongshu` capability + 笔记 recipe | 服务器工具 `/api/tools/xiaohongshu/jobs`、插件小红书 capability、笔记 recipe 三者就绪后改 `enabled` | adapter skill `xiaohongshu-autopost` 已建：能组 `平台=小红书` PublishIntent 草稿（`XiaohongshuExt` typed）+ 反向请求 assets-library 模式 E 派生变体 + 出人工发布清单。**真实自动发布 gated**：三件就绪前不登录、不上传、不声称已发；用户手动发布后回填公开笔记 URL 对账。 |
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

## 小红书 adapter 规则（adapter 已建，执行 gated）

- adapter skill = `xiaohongshu-autopost`（同 pinterest-autopin 三层范式）。social-publisher 只通过它路由小红书行，不复制小红书表单逻辑。
- 小红书行 = `社媒发布队列` 里 `平台 = 小红书` 的行，`任务 ID` = `XHS-...`，是本表主键。
- 平台专属字段走 `平台扩展 (typed)` 的 `XiaohongshuExt` schema（note_type / topic_tags / cover_caption / related_item_id），过 validator，不塞自由 JSON。
- 发布图只引用 `Asset Variants 派生素材` 的小红书规格变体（assets-library 模式 E 派生），不在 adapter 里裁切清理。
- **执行 gated**：服务器工具 `/api/tools/xiaohongshu/jobs` + 插件 `xiaohongshu` capability + 笔记 recipe 三者就绪前，不得自动上传 / 发布；只出草稿 + 人工发布清单。三者就绪后把上表状态改 `enabled`，Mode C 走 server test → 用户确认 → final（与 Pinterest 同形）。
- `发布 URL` 保存公开笔记 URL；拿不到公开 URL 不能标 `已发`。Hermes 不跑本地 Playwright，登录态只在租户插件中使用。
