# Social Publisher Adapter Registry

本文件定义 social-publisher 当前能真正发布哪些平台。没有在这里标成 `enabled` 的平台，不能自动上传或发布。

| 平台 | 状态 | 支持发布类型 | 执行层 | 关键前置 | 说明 |
|---|---|---|---|---|---|
| Pinterest | enabled | 单图；多图轮播需服务器 / 插件显式支持后再 final | `pinterest-autopin` → yanggedianzhang server browser tool | 服务器工具可用、租户浏览器插件可用、`社媒发布队列` 表可用 | 当前唯一真实发布适配器。发布过程必须走 server test job → 用户确认 → server publish job，并回写 社媒发布队列。 |
| 小红书 | **封存 shelved（产品决策 2026-07-24：专注 Etsy，不对用户开放）** | 图文笔记 / 视频笔记 | `xiaohongshu-autopost` → yanggedianzhang server browser tool（同 pinterest 三层范式，契约已就绪） | 后端三件已就绪（服务器工具 `/api/tools/xiaohongshu/jobs`、插件 `xiaohongshu` capability、笔记 recipe）；**但整体封存、不对外开放**——解封需产品侧明确放行 | **封存 fail-closed**：用户提任何小红书请求，只说明封存边界（「当前版本专注 Etsy，小红书功能暂未开放，请等后续版本」）+ 引导回 Etsy + STOP，**不组草稿、不建 `社媒发布队列` 行、不创建 server publish job、不出人工发布清单、不做人工回填对账**。后端 + 契约（流程见 [`xiaohongshu-autopost/references/publishing-flow.md`](../../xiaohongshu-autopost/references/publishing-flow.md)）原样保留供未来解封。解封不是一处开关，需走本文件末尾 §小红书解封验收清单。 |
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
- Pinterest 行的 `任务 ID`（`PIN-...`）就是本表主键；`外部队列 ID`（或表里已有的 `ECS job ID`）仅在创建服务器 job 后写入返回的 `jobId`。
- `发布 URL` 保存 Pinterest 返回的公开 Pin URL。
- 如果发布器只创建了广告草稿或拿不到公开 Pin URL，不能标记 `已发`。
- Hermes 不跑本地 Playwright / Chrome profile；浏览器登录态只在租户已安装的浏览器插件中使用。

## 小红书 adapter 规则（封存 shelved — 后端就绪，整体封存不对外开放）

- **封存 fail-closed（当前唯一操作规则，产品决策 2026-07-24）**：现阶段专注 Etsy，小红书 adapter 不对用户开放——用户提任何小红书请求（触发词见 `xiaohongshu-autopost` frontmatter）时只说明封存边界（「当前版本专注 Etsy，小红书功能暂未开放，请等后续版本」）+ 引导回 Etsy + STOP，**连草稿都不组、不建发布队列行、不创建 server publish job、不出人工发布清单、不做人工回填对账**。后端已用 `XHS_PLATFORM_ENABLED` 开关封存（默认关，XHS 端点返回 `410`）。后端三件（服务器工具 `/api/tools/xiaohongshu/jobs` + 插件 `xiaohongshu` capability + 笔记 recipe）与发布契约 [`xiaohongshu-autopost/references/publishing-flow.md`](../../xiaohongshu-autopost/references/publishing-flow.md) 原样保留供未来解封。解封不是一处开关，走本文件末尾 §小红书解封验收清单，Mode C 才走真实 test → confirm-publish → final。

**以下为解封后资料（封存期不适用）：**

- adapter skill = `xiaohongshu-autopost`（同 pinterest-autopin 三层范式）。social-publisher 解封后只通过它路由小红书行，不复制小红书表单逻辑。
- 小红书行 = `社媒发布队列` 里 `平台 = 小红书` 的行，`任务 ID` = `XHS-...`，是本表主键。
- 小红书未 `enabled` 期间不默认写平台专属字段；note_type / topic_tags / cover_caption / related_item_id 先进入人工发布清单。对外放行后再按 `XiaohongshuExt` schema 写结构化字段，不塞自由 JSON。
- 发布图只引用 `Asset Variants 派生素材` 的小红书规格变体（assets-library 模式 E 派生），不在 adapter 里裁切清理。
- 〔`enabled` 后〕`发布 URL` 保存公开笔记 URL；拿不到公开 URL 不能标 `已发`。Hermes 不跑本地 Playwright，登录态只在租户插件中使用。

---

## 路由决策 + eval 场景（T8）

> 给一条 PublishIntent，「该不该发、谁来发、怎么发」由下面的决策树定。运行时实现 + 测试在 ECS dispatch（yanggedianzhang，已有 78+291 单测）；本节是**可审计的 spec + eval 场景**，供 skill 侧路由对齐和后续真 eval 校验。

### 路由决策树

```
PublishIntent（社媒发布队列 一行）
  │
  ├─ 平台 = X → 查本表 X 的「状态」
  │     ├─ shelved（封存）      → fail-closed：说明封存边界 + 引导回 Etsy + 立即 STOP；
  │     │                          不组草稿、不建行、不出人工发布清单、不落入下面任何分支（当前小红书）
  │     ├─ enabled            → 可真发：路由到 X 的 adapter（pinterest-autopin / …）
  │     ├─ staged（未对外开放）→ 不真发：只组草稿 + 人工发布清单 + 人工回填对账
  │     └─ planned/manual-only → 不真发：草稿 + 人工对账
  │
  ├─ 自动发布 = true 且 状态 = 已批准 且 到点 且未锁
  │     → ECS dispatch 接管（仅 enabled 平台）；shelved/staged/planned 不进自动发布
  │
  └─ 用户手动「发这条」
        ├─ enabled 平台          → adapter 模式 C：test → 用户目视确认 → confirm-publish → final
        ├─ shelved 平台          → fail-closed：封存话术 + STOP，不出人工发布清单（当前小红书）
        └─ 其余非 enabled（staged / planned）
                                  → 出人工发布清单，不创建真实 server publish job
```

> **fail-closed 判据**：`shelved` 优先于所有其它分支——只要平台状态是 `shelved`（当前小红书），一律封存话术 + STOP，**绝不落入「非 enabled → 人工发布清单」这条通用分支**。「非 enabled → 人工清单」只覆盖 `staged` / `planned/manual-only`，明确排除 `shelved`。

### eval 场景（输入 → 期望路由 / 结果）

| # | 输入 intent | 期望 |
|---|---|---|
| 1 | 平台=Pinterest, enabled, 自动发布=true, 已批准, 到点, 未锁 | ECS dispatch **直接建 publish job**（`ready_for_publish`）→ 回写发布中 → 插件真发，**无逐条人工确认闸**（人工把关点在标 `自动发布=true` 那一下） |
| 2 | 平台=Pinterest, enabled, 用户手动"发这条" | pinterest-autopin 模式 C：test → 目视确认 → confirm-publish → final |
| 3 | 平台=小红书, **shelved（封存）**, 用户"发" | **fail-closed**：只回封存话术「当前版本专注 Etsy，小红书功能暂未开放，请等后续版本」+ 引导回 Etsy + STOP；**不创建真实 job、不组草稿、不出人工发布清单**（不落入「非 enabled → 人工清单」通用分支） |
| 4 | 平台=Instagram, planned | 草稿 + 人工对账；不真发 |
| 5 | 平台=Pinterest, 自动发布=true, 但行已被 dispatch 锁（发布中） | 人工发布让位（避让），不双写抢同一行 |
| 6 | 平台=Pinterest, dispatch dormant（POLL_MS 未配） | 自动发布不发生；用户要发走手动模式 C，**不回退 Hermes 手搓巡检** |
| 7 | 任意平台, `链接` 缺（商品型缺分享链接） | 阻塞建任务，回 listing-catalog 补 `分享链接`，不拼 URL |
| 8 | 平台=X, 平台扩展 typed 校验不过（未注册字段 / 缺必填） | 阻塞，不写库；不塞自由 JSON |
| 9 | 关联素材指向 canonical 原图而非变体 | 阻塞 / 提示引用 `Asset Variants 派生素材` 变体 |
| 10 | enabled 平台, 但该租户插件未装（`BROWSER_TOOL_INSTALL_REQUIRED`） | 转述 `userMessage` + 降级人工清单；不算发布失败、不伪造已发 |

> 这些场景是路由正确性的判据。新增平台 / 改状态时，先确认它在本表有明确「状态」，再对照决策树跑一遍上面的场景。

---

## 小红书解封验收清单（`shelved → enabled`，不是一处开关）

小红书当前 `封存 shelved`（产品决策 2026-07-24：专注 Etsy）。解封需逐项完成，改一个状态字段不够：

1. **产品负责人批准**：明确决定小红书对用户开放，撤销「专注 Etsy」的封存决策。
2. **后端负责人设 `XHS_PLATFORM_ENABLED=1`**：四个 XHS 端点当前封存返回 `410 XHS_PLATFORM_SUSPENDED`，解封后恢复 `200` 正常契约。
3. **技能仓改动（逐文件，全路由封存不止一个 skill）**：
   - `social-publisher/references/adapter-registry.md`（本文件）：小红书行状态 `封存 shelved → enabled`、路由树去掉 `shelved` 分支、eval #3 期望改回真实路由、删本节。
   - `xiaohongshu-autopost/SKILL.md`：恢复 frontmatter `description` 的动作语义、删顶部 ⛔ 封存总闸与各章节封存守卫。
   - `social-publisher/SKILL.md`、`publish-composer/SKILL.md`：各处小红书从 `封存 shelved` 改回可组草稿 / 可路由。
   - `shared/platform-config.md`、`shared/dependency-protocol.md`、`shared/social-adapter-paradigm.md`、`xiaohongshu-autopost/references/publishing-flow.md`、`publish-composer/references/platform-publishing-model.md`、`publish-composer/references/base-schema.md`：各处 `封存 shelved` → `enabled`。
4. **验收**：仓库内 `grep -rn "封存\|shelved" --include="*.md"` 不再残留小红书封存冲突表述；跑一条 SKU 端到端 test → confirm-publish → final 走通。
