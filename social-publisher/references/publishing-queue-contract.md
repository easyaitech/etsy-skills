# 社媒发布队列 Contract

social-publisher 消费店铺总 Base 内的 `社媒发布队列` 表。发布状态只以这张表为跨平台 source of truth；所有平台（含 Pinterest pin）都是这张表里的行，用 `平台` 字段区分，不再有独立的平台子队列表。

## 必填字段

| 字段 | 说明 |
|---|---|
| `任务 ID` | `PIN-...` / `XHS-...` / `IG-...` 等 |
| `平台` | Pinterest / 小红书 / Instagram / TikTok / Etsy |
| `发布类型` | 单图 / 多图轮播 / 视频 / 图文笔记 / 图文混合 |
| `关联素材` | 一条或多条 `Asset Variants 派生素材` 变体记录（发布副本，非 canonical 原图） |
| `素材顺序` | 多素材任务的唯一顺序来源（Pinterest 行用 `发布素材` 行顺序落地，见 §Pinterest 行） |
| `封面素材` | 多图 / 视频 / 图文笔记必须填 |
| `标题` | 平台标题 |
| `描述` | 平台正文 / caption |
| `链接` | 商品型发布必须来自 `Products 商品` 表的 `分享链接`；非商品型可空 |
| `状态` | 发布状态 |
| `计划发布时间` | 自动发布筛选依据 |
| `自动发布` | true 才允许无人值守自动执行 |

## 发布器字段

| 字段 | 类型建议 | 说明 |
|---|---|---|
| `发布适配器` | 单选 / 文本 | 如 `pinterest-autopin`、`manual-xiaohongshu` |
| `ECS job ID` | 单行文本 | 后端 publish-service / 服务器返回的 `jobId`（统一名，替代旧「外部队列 ID」语义）。Pinterest 不再单独建表，pin 的 `任务 ID`（`PIN-...`）就是本表主键 |
| `发布尝试次数` | 数字 | 每次进入真实发布前累加；默认 0 |
| `最后尝试时间` / `下次重试时间` | 日期时间 | 每次自动 / 手动执行后更新；重试调度 |
| `执行锁 (lock_token)` | 单行文本 | 真实发布前写入本轮唯一令牌；完成、失败或放弃后清空 |
| `失败原因分类` | 单选 | 结构化：`会话过期 / 插件未装 / 限速 / DOM漂移 / 平台拒绝 / 网络 / 其他`，喂重试与排查；原文走 `失败原因` |

## 状态机

与 [`publish-composer/references/base-schema.md` § 表 2 状态机](../../publish-composer/references/base-schema.md) 同一套（owner 定义，本表是它的消费者，不另立一套）。旧的 `待发 / 待复核 / 重试` 已废弃：`待发→已批准`、人工待核对停在 `失败`、重试是 `失败→发布中` 的转移而非独立状态。

```text
        composer            user             dispatch          adapter/plugin
  草稿 ──提交审核──▶ 待审 ──批准──▶ 已批准 ──领取/排期──▶ 发布中 ──┬─成功─▶ 已发
   ▲  └──────退回(改内容)──────┘         │                        ├─失败─▶ 失败 ──重试(上限内)─▶ 发布中
   │                          user│跳过                          └─超时/掉线─▶（租约回收）─▶ 已批准
   └─────────── composer 撤销/重排 ◀──────┘                       手动已发(user 标记，旁路自动化)
```

转移权限（越权即拒）：`composer` 写 `草稿↔待审`、`*→草稿`；`user` 写 `待审→已批准`、`待审→跳过`、`*→手动已发`；`dispatch` 写 `已批准→发布中`、`发布中→失败`、`发布中→已批准`（租约回收）、`失败→发布中`（重试上限内）；`adapter` 写 `发布中→已发`。

> **人工「发这条」快路**：用户明确确认要发某条 `草稿` / `待审` / `失败` 行时，本 skill（模式 B）按 §占用规则 占锁后直接进 `发布中`，等价于把 `→待审→已批准→发布中`（或 `失败→发布中` 重试）一步走完。这是 user 显式授权的 fast-path，不是绕过审核闸；自动路径仍严格按上面的 dispatch 转移。

`状态` 是 `事件日志` 的投影：回写 `状态` 时如该行有 `事件日志` 列，追加一条 `who / from→to / ts / reason`，不裸改状态。

## 占用规则（谁持锁）

`执行锁` 是单写者令牌。**自动发布的占用 / 巡检 / 重试 / 死信归 ECS 常驻 dispatch（yanggedianzhang publish dispatch，T5）**——其锁 + 幂等 + 崩溃恢复在服务端实现（运行态落 mvp-store，幂等键 `tenantId:intentId#aN` 跨重启去重）。本 skill **不再跑自动巡检、不手搓重试**。

本 skill 只在**人工 / 按需发布**（用户"发这条"）时占用，且必须与 ECS dispatch 避让：

1. 先读目标行：若 `状态 = 发布中` 或 `执行锁` 非空（dispatch 正在处理这条 `自动发布 = true` 行）→ **让位，不抢**。
2. 行空闲时，为本轮生成唯一 `执行锁`（如 `social-publisher:<run_id>:<任务 ID>`），条件更新写 `状态 = 发布中`、`执行锁`、`最后尝试时间`、`发布尝试次数 +1`。
3. 重读确认锁是本轮令牌；不成立就停，不调 adapter。
4. 成功 / 失败 / 跳过后清空 `执行锁`。中断遗留的 `发布中` 必须先核对平台真实结果再改状态，不能直接再发。

> Base `执行锁` 是单写者标记，但飞书 Base 未证明支持原子 CAS——ECS dispatch 的单写者正确性靠服务端单实例 tick + 在途守卫 + mvp-store 锁，不依赖 Base CAS。skill 人工占用是尽力避让，不和 dispatch 并发抢同一行。

## 自动发布筛选（由 ECS dispatch 执行，非本 skill）

ECS dispatch 常驻 tick 选择的记录条件（本 skill 只需了解、不实现）：

- `自动发布 = true`
- `状态 = 已批准`
- `计划发布时间 <= 当前时间`
- 未锁（`执行锁` 空）
- 平台 adapter 在 `adapter-registry.md` 中是 `enabled`

dispatch 默认 dormant（`PUBLISH_DISPATCH_POLL_MS` 未配 = 关），且 v1 不自动 confirm-publish（建好 test job 停在待人工确认）。**本 skill 不再实现这套筛选 / 巡检**——写在这里只为说明队列字段语义。

## Pinterest 行（`平台 = Pinterest`）

Pinterest pin 不再单独建表，就是 `社媒发布队列` 里 `平台 = Pinterest` 的行。`pinterest-autopin` 作为 adapter 直接读写这一行，不做跨表映射：

- `任务 ID`（`PIN-...`）即旧 `pin_id`，是本表主键。
- `发布类型` = `单图` / `多图轮播`；轮播图片顺序以 `发布素材` 行顺序为准（`素材顺序` 仅作素材追溯）。
- Pinterest 专属字段（`Board (Pinterest)`、`发布素材`、`Alt Text (EN)`）写在同一行；字段细节与轮播校验见 [`pinterest-autopin/references/pin-queue-base-schema.md`](../../pinterest-autopin/references/pin-queue-base-schema.md)。
- 发布成功后回写本行：`状态 = 已发`、`发布 URL`（pin_url）、`发布时间`。
- 发布失败回写本行：`状态 = 失败` + `失败原因`。一行就是唯一真相，不存在“两边都要记录”的问题。

## Manual-only 平台

小红书、Instagram、TikTok 在 adapter 启用前只能：

- 生成 `社媒发布队列` 草稿
- 输出人工发布清单
- 用户给出公开 URL 后回写 `已发`

不得自动登录、上传、点击发布，也不得把“草稿已准备”写成“已发”。
