---
name: social-publisher
description: 社交媒体发布总控层（薄触发）：管 adapter registry + 人工/按需发布 + confirm-publish 人工闸 + 对账。**自动发布的巡检 / 锁 / 重试 / 死信归 ECS 常驻 dispatch（yanggedianzhang publish dispatch，T5），本 skill 不再手搓巡检 / 定时器**。当前真实发布适配器只有 Pinterest（pinterest-autopin，经 yanggedianzhang 服务器 + 浏览器插件执行）；小红书 adapter（xiaohongshu-autopost）后端 + 契约已就绪但 **staged 未对外开放**（只草稿 + 人工对账，不跑真发）；Instagram、TikTok 等 planned/manual-only。未 enabled 的平台不能声称已自动发布。用于用户说“发这条 / 发 Pinterest / publish / 对账发布结果 / 接发布器”等场景。
---

# Social Publisher

这个 skill 是跨平台社交媒体发布的**执行层**。

```text
publish-composer 生成发布任务草稿
        ↓
social-publisher 做任务校验 / 排期 / 适配器路由
        ↓
Pinterest: pinterest-autopin adapter → yanggedianzhang server → browser plugin
小红书 / Instagram / TikTok: 未来适配器或人工后台
```

它不负责长期素材归档，不负责生成图片或制作视频，不负责写商品事实。素材归档归 `assets-library`，图片生成归 `image-synth`，商品事实归 `listing-catalog`。

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，平台配置见 [`shared/platform-config.md`](../shared/platform-config.md)。

> **工具架构**（见 [`shared/tools-architecture.md`](../shared/tools-architecture.md)）：**自动发布的编排硬核（队列巡检 / 单写者锁 / 重试退避 / 死信 / 结果回写）已落到 ECS 常驻控制面（yanggedianzhang 的 publish dispatch，T5）**——本 skill **不再在 Hermes 上手搓巡检 / 锁 / 定时器**。ECS dispatch 默认 dormant（`PUBLISH_DISPATCH_POLL_MS` 未配 = 关），只处理 `自动发布 = true` 的行，且 **v1 不自动 confirm-publish**（保留人工目视确认闸）。本 skill 退成薄触发，只剩四件事：① 配置 adapter registry / 建队列表字段；② **人工 / 按需发布**（用户"发这条"，模式 B）；③ **confirm-publish 人工闸**（dispatch 建好 test job 停在待确认，用户说"发吧"才推进）；④ 对账（模式 D）。Base 是 SoT；`执行锁` 字段现由 ECS dispatch 持有，skill 侧人工发布前要避让（见模式 B）。登录 / 凭据红线见 §禁区。

---

## 必读引用

按任务选择读取：

| 场景 | 先读 |
|---|---|
| 执行 / 自动发布 社媒发布队列 | [`references/publishing-queue-contract.md`](references/publishing-queue-contract.md) |
| 判断某个平台能不能自动发 | [`references/adapter-registry.md`](references/adapter-registry.md) |
| Pinterest 发布 | `pinterest-autopin/SKILL.md` + `pinterest-autopin/references/publishing-flow.md` |
| 小红书发布 | `xiaohongshu-autopost/SKILL.md` + `xiaohongshu-autopost/references/publishing-flow.md`（**staged 未对外开放**：契约就绪，当前只草稿 + 人工对账） |

---

## 模式 A：接入发布器

进入条件：

- 用户说“新增社交媒体自动发布”
- 用户要把 Pinterest 自动发布纳入通用发布队列
- 用户要预留小红书 / Instagram / TikTok 自动发布接口

步骤：

1. 解析工作区根，读取 `COMMERCE_PLATFORM.md` 和 `MARKETING_PLATFORM.md`（如存在），并按 `shared/store-base-architecture.md` 定位店铺总 Base。
2. 读 [`references/publishing-queue-contract.md`](references/publishing-queue-contract.md)，确认店铺总 Base 内的 `社媒发布队列` 表是否存在。
3. 如果发布任务表缺少以下字段，列出字段清单给用户确认后再补：`自动发布`、`发布适配器`、`ECS job ID`、`发布尝试次数`、`最后尝试时间`、`执行锁 (lock_token)`、`失败原因分类`。
4. 读 [`references/adapter-registry.md`](references/adapter-registry.md)，展示当前适配器状态：
   - Pinterest = enabled，真实发布走 `pinterest-autopin` adapter → 服务器工具 → 浏览器插件
   - 小红书 = staged（后端 + 契约就绪，但**未对外开放**），adapter `xiaohongshu-autopost` 已建；当前只允许建草稿 + 人工发布清单 + 人工回填，**不跑真发**。对外放行后改 `enabled`
   - Instagram / TikTok = planned/manual-only，只允许建任务和人工回填
5. 如用户要启用 Pinterest，按 `pinterest-autopin` 模式 A 检查服务器工具、浏览器插件和 `社媒发布队列`（Pinterest pin 即本表 `平台 = Pinterest` 的行）。
6. **不在 Hermes 侧建定时器 / cron 跑自动发布**——自动发布的常驻巡检是 ECS dispatch 的事（T5）。要真开自动发布，由运维在 ECS 侧开启 dispatch（配 `PUBLISH_DISPATCH_POLL_MS` + 确认队列有 `自动发布 = true` 行），本 skill 不承担、也不模拟这个后台循环。

---

## 模式 B：发布指定任务

进入条件：

- 用户说“发这条发布任务”
- 用户指定某个 `任务 ID`
- 用户说“把这条 Pinterest 发掉 / publish”

步骤：

1. 读 [`references/publishing-queue-contract.md`](references/publishing-queue-contract.md)。
2. 从店铺总 Base 内 `社媒发布队列` 表读取目标行，校验：
   - `状态` 是 `已批准`，或用户明确确认要发的 `草稿` / `待审` / `失败`（手动重试，`失败→发布中`）
   - `平台` 在 adapter registry 中有明确状态
   - `关联素材`、`素材顺序`、`标题`、`描述`、`链接` 等必填字段满足该平台要求
   - `授权状态`、AI 清理、发布副本已在 `publish-composer` 完成
3. 查 [`references/adapter-registry.md`](references/adapter-registry.md) 决定适配器。
4. **与 ECS dispatch 避让**：人工发布前先读该行——若 `状态 = 发布中` 或 `执行锁` 已被持有（ECS dispatch 正在处理这条 `自动发布 = true` 的行），**让位、不抢**，提示用户"这条已在自动发布流程中"。仅当行空闲（未锁、状态可发）时，本 skill 才按 [`references/publishing-queue-contract.md`](references/publishing-queue-contract.md) §人工发布占用 取 `执行锁` 占为 `发布中`。占用失败或无法证明唯一占用，停止，不调用 adapter。（注：常规自动发布交 ECS dispatch，本 skill 的人工占用只用于"用户主动发某条"。）
5. enabled 平台（当前只有 Pinterest）——调对应 adapter 的模式 C：
   - 任务就是 社媒发布队列 里 `平台 = Pinterest` 的本行；`任务 ID`（`PIN-...`）即主键，无需映射独立子队列表
   - 调 `pinterest-autopin` 模式 C：server test job → 用户目视确认 → server confirm-publish → final
   - 成功后回写本行：`状态 = 已发`、`发布时间`、`发布 URL`，清空 `执行锁`
   - 失败后回写：`状态 = 失败`、`失败原因分类` + `失败原因`、`最后尝试时间`，清空 `执行锁`；不重复递增占用阶段已加的 `发布尝试次数`
6. staged / planned/manual-only 平台（小红书 staged；Instagram / TikTok planned）：
   - 不登录、不上传、不点击发布；**不创建真实 server publish job**（小红书后端虽就绪但未对外开放）
   - 只输出人工发布清单，或在用户给出公开 URL 后走模式 D 对账
   - 小红书对外放行（adapter-registry 改 `enabled`）后才并入第 5 步走真发

直接发布前必须有确认门。用户没有明确说“发吧 / 真发 / publish / 到点自动发”时，只能 validate / test / 准备。

---

## 模式 C：自动发布 = ECS dispatch（本 skill 不再手搓巡检）

**自动发布的巡检 / 单写者锁 / 重试退避 / 死信 / 结果回写已归 ECS 常驻控制面**（yanggedianzhang 的 publish dispatch，T5 落地，commit 经 PR 合并）。**本 skill 不再跑巡检、不再被定时任务唤醒做发布、不再手搓 `执行锁` / 重试。**

ECS dispatch 的行为（本 skill 只需知道、不实现）：
- 常驻 tick 扫 `社媒发布队列`：`自动发布 = true` AND `状态 = 已批准` AND `计划发布时间 ≤ now` AND 未锁。
- 抢单写者锁 → 建 test job（幂等键 `tenantId:intentId#aN` 去重，跨重启防重复发）→ 回写 `状态 = 发布中`。
- **v1 不自动 confirm-publish**：test 建好后停在待人工确认（保留 publishing-flow.md 的目视确认闸）。
- 失败按分类退避重试 / 死信；插件掉线租约回收。
- **默认 dormant**：`PUBLISH_DISPATCH_POLL_MS` 未配 = 关。要真跑自动发布，由运维显式开启 ECS dispatch，不在本 skill 侧配定时器。

**本 skill 在自动路径里的唯一职责 = confirm-publish 人工闸**：dispatch 建好的 test job 停在待确认时，用户目视小红书 / Pinterest 发布页后说“发吧 / publish” → 本 skill（或用户）触发对应 adapter 的 confirm-publish（见模式 B 的 confirm 步骤），dispatch 不替用户拍这一下。

> 不要在本 skill 里重新实现巡检 / 定时器 / 锁——那会和 ECS dispatch 抢同一批行、双写冲突。自动发布没开启（dispatch dormant）时，就是没有自动发布，**不回退手搓巡检**；用户要发就走模式 B 人工发布。

---

## 模式 D：发布结果对账

进入条件：

- 用户给了 Pinterest / 小红书 / Instagram 等公开发布 URL
- 平台发布成功但队列表还没回写
- 自动发布失败后需要人工核对

步骤：

1. 读取目标 社媒发布队列 行（Pinterest pin 即本表 `平台 = Pinterest` 的行）。
2. 核对公开 URL 是否匹配任务标题、素材、SKU 或平台返回结果。
3. 匹配后回写 社媒发布队列：
   - `状态 = 已发`
   - `发布时间`
   - `发布 URL`
   - `失败原因` 清空或追加“人工对账成功”
4. 如果不匹配，保持 `失败`（待人工核对），不要为了消除失败状态而回填错 URL。

---

## 禁区

- 不把 `publish-composer` 的“已入任务”当成“已发布”。
- 不为小红书（staged 未对外开放）、Instagram、TikTok 伪造自动发布能力；只有 Pinterest 是 enabled。未 enabled 的平台一律只做草稿 / 人工对账，不伪造已发——小红书后端虽就绪，未对外开放前一样不跑真发。
- 不替用户登录平台，不保存账号密码、cookie、token。
- 不跳过 Pinterest 的 test → final 确认门，除非用户明确说明已经 test 过并要求 final。
- 不对 `失败` 记录无限重试；默认最多两次，之后停在 `失败`（待人工核对）。
- 不批量补发 backlog（每平台每轮只发一条的节流由 ECS dispatch 负责，本 skill 人工发布也一次一条，不一口气清队列）。

---

## 与其他 skill 的协作

- **publish-composer**：上游任务来源；发布任务字段和状态必须按同一张 社媒发布队列 回写。
- **pinterest-autopin**：Pinterest enabled adapter；本 skill 不重写 Pinterest 发布逻辑，只做队列路由和对账。
- **listing-catalog**：商品型发布的 `链接` 必须来自 `Products 商品` 表 `分享链接`。
- **assets-library**：素材授权、发布副本、AI metadata 清理必须在发布前完成。
- **image-synth**：只产出图片素材，不直接发布；发布仍进 社媒发布队列。

## 工作语言

与用户对话用中文。买家可见文案按平台策略：Pinterest 默认英文，小红书默认中文，配置优先。
