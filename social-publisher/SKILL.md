---
name: social-publisher
description: 社交媒体发布总控层（薄触发）：管 adapter registry + 人工 / 按需发布 + confirm-publish（手动路径）+ 发布对账；自动发布的巡检 / 锁 / 重试 / 死信归 ECS 常驻 dispatch（标 `自动发布=true` 即交给 dispatch 直发），本 skill 不手搓巡检定时器。Pinterest 走 pinterest-autopin；Instagram 单视频 Reels 走 instagram-publish（按租户开通），图片/轮播和 TikTok 仍人工处理。触发：用户说"发这条 / 发 Pinterest / publish / 对账发布结果 / 接发布器 / 发小红书（→ 封存拒绝）"等场景；小红书发布 / 对账请求 → 封存拒绝：按 shared/platform-config.md §封存协议 fail-closed 处理（判据 = adapter-registry 平台状态）。
layer: application
---

# Social Publisher

这个 skill 是跨平台社交媒体发布的**执行层**。

```text
publish-composer 生成发布任务草稿
        ↓
social-publisher 做任务校验 / 排期 / 适配器路由
        ↓
Pinterest: pinterest-autopin adapter → yanggedianzhang server → browser plugin
小红书: 封存 shelved（不对用户开放，只说明封存边界+引导回 Etsy+STOP，无人工后台出口）
Instagram 单视频 Reels: instagram-publish → 服务器独立任务 → 租户插件
Instagram 图片/轮播 / TikTok: 人工后台
```

它不负责长期素材归档，不负责生成图片或制作视频，不负责写商品事实。素材归档归 `assets-library`，图片生成归 `image-synth`，商品事实归 `listing-catalog`。

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，平台配置见 [`shared/platform-config.md`](../shared/platform-config.md)。

> **工具架构**（见 [`shared/tools-architecture.md`](../shared/tools-architecture.md)）：**自动发布的编排硬核（队列巡检 / 单写者锁 / 重试退避 / 死信 / 结果回写）已落到 ECS 常驻控制面（yanggedianzhang 的 publish dispatch，T5）**——本 skill **不再在 Hermes 上手搓巡检 / 锁 / 定时器**。ECS dispatch 默认 dormant（`PUBLISH_DISPATCH_POLL_MS` 未配 = 关；**yanggedianzhang 生产已开启，约 60s 一轮**），只处理 `自动发布 = true` 的行，合格行**直接建 publish job 无人值守直发、无逐条人工确认闸**（人工把关点前移到「标 `自动发布=true`」那一下）。本 skill 退成薄触发，只剩四件事：① 配置 adapter registry / 建队列表字段；② **人工 / 按需发布**（用户"发这条"，模式 B）；③ **开启自动发布**：内容审核完把行标 `自动发布=true` + `已批准` + `计划发布时间` 交给 dispatch 直发（对 Pinterest 走 `pinterest-autopin` 模式 D）；手动路径的 test → confirm-publish 仍在模式 B；④ 对账。Base 是 SoT；`执行锁` 字段现由 ECS dispatch 持有，skill 侧人工发布前要避让（见模式 B）。登录 / 凭据红线见 §禁区。

> **P0 永久退役闸**：旧 Hermes job `d99651079542`（`ETSY Social Publisher / Publishing Queue 到期自动发布`）必须保持 paused 或 removed（退役边界唯一真源 = [`../shared/retired-infra.md`](../shared/retired-infra.md) §1）。**永不 resume、run、重建或修复它的本地路径**；用户说“开启自动发布 / 到点自动发”只走 ECS dispatch；若发现该 job 已启用或报错，只停用它并如实回报，不执行旧发布脚本。

---

## 必读引用

按任务选择读取：

| 场景 | 先读 |
|---|---|
| 执行 / 自动发布 社媒发布队列 | [`references/publishing-queue-contract.md`](references/publishing-queue-contract.md) |
| 判断某个平台能不能自动发 | [`references/adapter-registry.md`](references/adapter-registry.md) |
| Pinterest 发布 | `pinterest-autopin/SKILL.md` + `pinterest-autopin/references/publishing-flow.md` |
| 小红书发布 | **封存 shelved**：不读执行细节，按 [`../shared/platform-config.md`](../shared/platform-config.md) §封存协议 fail-closed 拒绝并引导回 Etsy + STOP。契约文档 `xiaohongshu-autopost/SKILL.md` + `xiaohongshu-autopost/references/publishing-flow.md` 仅供未来解封复用 |

> 养个店长 Hermes 飞书直聊 runtime 无 lark-cli 时，`社媒发布队列` 等 Base 表的只读查询走后端 `POST /api/hermes/bitable/record-search` 端点，访问约定见 [`../shared/backend-api-access.md`](../shared/backend-api-access.md)。

---

## 依赖关系

降级等级按模式区分(BLOCK / DEGRADE / SKIP,协议见 [`../shared/dependency-protocol.md`](../shared/dependency-protocol.md))。文案主权在 adapter / composer 兜底,本 skill 不读品牌基座。

| 依赖 | 提供什么 | 降级等级(按模式) |
|---|---|---|
| `SHOP.md`(shop-foundation) | 店铺名 → 定位店铺总 Base 与队列表 | 发布表定位 = **BLOCK**;其余 = SKIP |
| `社媒发布队列` 表(publish-composer owner) | 任务行与状态机 | 发布 / 对账 = **BLOCK** |
| `Assets 素材池` 表·发布副本字段(assets-library) | 发布前授权 / 清理校验 | 发布校验 = **BLOCK**;对账 = SKIP |
| `pinterest-autopin`(adapter) | enabled 平台真实发布 | Pinterest 发布 = **BLOCK**;小红书按封存协议拒绝(判据 = adapter-registry 小红书状态;决策见 `docs/adr/0001`) |
| `BRAND.md` / `BRAND_MARKETING.md` / `MARKETING_PLATFORM.md` | —(文案不归本 skill) | SKIP |

---

## 模式 A：接入发布器

进入条件：

- 用户说“新增社交媒体自动发布”
- 用户要把 Pinterest 自动发布纳入通用发布队列
- 用户要预留小红书 / Instagram / TikTok 自动发布接口

步骤：

1. 解析工作区根，读取 `MARKETING_PLATFORM.md`（如存在），并按 `shared/store-base-architecture.md` 定位店铺总 Base。销售平台固定 Etsy，商品型发布规则以内置 Etsy preset 为准（`shared/platform-config.md`）。
2. 读 [`references/publishing-queue-contract.md`](references/publishing-queue-contract.md)，确认店铺总 Base 内的 `社媒发布队列` 表是否存在。
3. 如果发布任务表缺少自动发布运行字段，列出字段清单给用户确认后再补：`自动发布`、`发布适配器`、`外部队列 ID`（或 `ECS job ID`，二选一）、`发布尝试次数`、`最后尝试时间`、`下次重试时间`、`执行锁`（或 `执行锁 (lock_token)`，二选一）、`失败原因分类`、`事件日志`。不要默认补 `素材顺序` / `封面素材` / `标签` / `备注` / 平台扩展类字段；补完后按 `publish-composer` 的默认视图字段隐藏锁、重试、外部队列 ID、事件日志等技术列。
4. 读 [`references/adapter-registry.md`](references/adapter-registry.md)，展示当前适配器状态：
   - Pinterest = enabled，真实发布走 `pinterest-autopin` adapter → 服务器工具 → 浏览器插件
   - 小红书 = **封存 shelved**：按 [`../shared/platform-config.md`](../shared/platform-config.md) §封存协议 fail-closed 处理（统一话术 + 引导回 Etsy + STOP，连草稿 / 人工发布清单 / 人工回填都不做）；解封走 [`references/adapter-registry.md`](references/adapter-registry.md) §小红书解封验收清单（不是一处开关）
   - Instagram 单视频 Reels 路由 `instagram-publish`，实测 capabilities；Instagram 图片/轮播及 TikTok 仍 manual-only。
5. 如用户要启用 Pinterest，按 `pinterest-autopin` 模式 A 检查服务器工具、浏览器插件和 `社媒发布队列`（Pinterest pin 即本表 `平台 = Pinterest` 的行）。
6. **不在 Hermes 侧建定时器 / cron 跑自动发布**——自动发布的常驻巡检是 ECS dispatch 的事（T5）。要真开自动发布，由运维在 ECS 侧开启 dispatch（配 `PUBLISH_DISPATCH_POLL_MS` + 确认队列有 `自动发布 = true` 行），本 skill 不承担、也不模拟这个后台循环。

---

## Instagram 分支

用户要预览、发布、定时发布或查询 Instagram 单视频 Reels 时，直接执行 [instagram-publish](../instagram-publish/SKILL.md)，不进入下面的 Pinterest Base 占锁/dispatch 流程。已有 Base 行可记录返回的任务 ID 与对账说明；只有图片/轮播、Stories 等未接入类型走人工清单。

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
   - `关联素材`、`标题`、`描述`、`链接` 等必填字段满足该平台要求
   - `授权状态`、AI 清理、发布副本已在 `publish-composer` 完成
3. 查 [`references/adapter-registry.md`](references/adapter-registry.md) 决定适配器。
4. **与 ECS dispatch 避让**：人工发布前先读该行——若 `状态 = 发布中` 或 `执行锁` 已被持有（ECS dispatch 正在处理这条 `自动发布 = true` 的行），**让位、不抢**，提示用户"这条已在自动发布流程中"。仅当行空闲（未锁、状态可发）时，本 skill 才按 [`references/publishing-queue-contract.md`](references/publishing-queue-contract.md) §人工发布占用 取 `执行锁` 占为 `发布中`。占用失败或无法证明唯一占用，停止，不调用 adapter。（注：常规自动发布交 ECS dispatch，本 skill 的人工占用只用于"用户主动发某条"。）
5. 本节 Base 流程支持的平台（Pinterest）——调对应 adapter 的模式 C：
   - 任务就是 社媒发布队列 里 `平台 = Pinterest` 的本行；`任务 ID`（`PIN-...`）即主键，无需映射独立子队列表
   - 调 `pinterest-autopin` 模式 C：server test job → 用户目视确认 → server confirm-publish → final
   - 成功后回写本行：`状态 = 已发`、`发布时间`、`发布 URL`，清空 `执行锁`
   - 失败后回写：`状态 = 失败`、`失败原因分类` + `失败原因`、`最后尝试时间`，清空 `执行锁`；不重复递增占用阶段已加的 `发布尝试次数`
6. **封存 shelved 平台（小红书）= fail-closed**：用户提小红书「发这条」，只说明封存边界（「当前版本专注 Etsy，小红书功能暂未开放，请等后续版本」）+ 引导回 Etsy + STOP。禁止清单（不登录、不组草稿、不出人工发布清单、不创建 server publish job、不做对账……）与判据唯一真源 = [`../shared/platform-config.md`](../shared/platform-config.md) §封存协议；判据字段 = [`references/adapter-registry.md`](references/adapter-registry.md) 小红书状态（!= `enabled` 即封存）。解封后才并入第 5 步走真发。
7. manual-only 类型（Instagram 图片/轮播、Stories / TikTok）：
   - 不登录、不上传、不点击发布；**不创建真实 server publish job**
   - 只输出人工发布清单，或在用户给出公开 URL 后走模式 D 对账

直接发布前必须有确认门。用户没有明确说“发吧 / 真发 / publish / 到点自动发”时，只能 validate / test / 准备。

---

## 模式 C：自动发布 = ECS dispatch（本 skill 不再手搓巡检）

**自动发布的巡检 / 单写者锁 / 重试退避 / 死信 / 结果回写已归 ECS 常驻控制面**（yanggedianzhang 的 publish dispatch，T5 落地，commit 经 PR 合并）。**本 skill 不再跑巡检、不再被定时任务唤醒做发布、不再手搓 `执行锁` / 重试。**

ECS dispatch 的行为（本 skill 只需知道、不实现）：
- 常驻 tick 扫 `社媒发布队列`：`自动发布 = true` AND `状态 = 已批准` AND `计划发布时间 ≤ now`（留空=已到点）AND 未锁 AND `下次重试时间 ≤ now`。
- 抢单写者锁 → **直接建 publish job**（`stage=publish` / `ready_for_publish`，幂等键 `tenantId:intentId#aN#内容hash` 去重，跨重启防重复发）→ 回写 `状态 = 发布中`、`外部队列 ID = jobId`。
- **无逐条人工确认闸**：dispatch 建的是 publish job，浏览器插件领到即真发到平台，**不停在 test / 待确认**。人工把关点前移到「标 `自动发布=true`」那一下——标记 = 授权无人值守直发（当前 yanggedianzhang 部署的实际行为）。
- 失败按分类退避重试 / 死信；插件掉线租约回收。
- **默认 dormant**：`PUBLISH_DISPATCH_POLL_MS` 未配 = 关；**yanggedianzhang 生产已配（约 60s 一轮）= 开启**。换部署要真跑自动发布，由运维显式开启，不在本 skill 侧配定时器。

**本 skill 在自动路径里的职责 = 帮用户把行标成 dispatch 合格候选（人工把关点）**：内容审核完后，用户说“开启自动发布 / 到点自动发” → 本 skill（对 Pinterest 走 `pinterest-autopin` 模式 D）把行标 `自动发布=true` + `状态=已批准` + `计划发布时间`，交给 dispatch 直发。**标记即授权直发，标前必须确认内容无误**——dispatch 不会再问。

> 不要在本 skill 里重新实现巡检 / 定时器 / 锁——那会和 ECS dispatch 抢同一批行、双写冲突。dispatch 未开启（dormant）时就是没有自动发布，**不回退手搓巡检**；用户要发就走模式 B 人工发布。

---

## 模式 D：发布结果对账

进入条件：

- 用户给了 Pinterest / Instagram 等公开发布 URL（小红书封存 shelved，不做对账——见 §禁区）
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
- **小红书封存 shelved**：按 [`../shared/platform-config.md`](../shared/platform-config.md) §封存协议 fail-closed——统一话术 + 引导回 Etsy + STOP，不组草稿、不对账、不伪造任何能力。
- Instagram 单视频 Reels 按其 adapter 的实际任务结果报告；未支持的 Instagram 类型及 TikTok 只做草稿 / 人工对账。
- 不替用户登录平台，不保存账号密码、cookie、token。
- 不恢复、运行、重建或修复旧 Hermes job `d99651079542`（边界见 [`../shared/retired-infra.md`](../shared/retired-infra.md) §1）；它与 ECS dispatch 并行会造成重复发布。
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
