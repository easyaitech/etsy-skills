---
name: social-publisher
description: 社交媒体自动发布总控层：从 content-asset-pool 的跨平台 社媒发布队列 读取待发布任务，按平台适配器执行发布、定时自动发布巡检、失败重试和结果回写。当前真实发布适配器只支持 Pinterest（调用 pinterest-autopin adapter，再由 yanggedianzhang 服务器和现有浏览器插件执行）；小红书、Instagram、TikTok 等先登记为 planned/manual-only，能建任务和人工对账，但不能声称已自动发布。用于用户说“自动发布社媒 / 到点发布 / 跑发布队列 / 发 Pinterest / 以后接小红书自动发布 / 对账发布结果”等场景。
---

# Social Publisher

这个 skill 是跨平台社交媒体发布的**执行层**。

```text
content-asset-pool 生成发布任务草稿
        ↓
social-publisher 做任务校验 / 排期 / 适配器路由
        ↓
Pinterest: pinterest-autopin adapter → yanggedianzhang server → browser plugin
小红书 / Instagram / TikTok: 未来适配器或人工后台
```

它不负责长期素材归档，不负责生成图片或视频，不负责写商品事实。那些仍归 `assets-library`、`image-synth`、`video-assembly`、`listing-catalog`。

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，平台配置见 [`shared/platform-config.md`](../shared/platform-config.md)。

---

## 必读引用

按任务选择读取：

| 场景 | 先读 |
|---|---|
| 执行 / 自动发布 社媒发布队列 | [`references/publishing-queue-contract.md`](references/publishing-queue-contract.md) |
| 判断某个平台能不能自动发 | [`references/adapter-registry.md`](references/adapter-registry.md) |
| Pinterest 发布 | `pinterest-autopin/SKILL.md` + `pinterest-autopin/references/publishing-flow.md` |
| 小红书发布 | `content-asset-pool/references/platform-publishing-model.md` 的小红书段；当前只支持草稿 / 人工对账 |

---

## 模式 A：接入发布器

进入条件：

- 用户说“新增社交媒体自动发布”
- 用户要把 Pinterest 自动发布纳入通用发布队列
- 用户要预留小红书 / Instagram / TikTok 自动发布接口

步骤：

1. 解析工作区根，读取 `COMMERCE_PLATFORM.md` 和 `MARKETING_PLATFORM.md`（如存在），并按 `shared/store-base-architecture.md` 定位店铺总 Base。
2. 读 [`references/publishing-queue-contract.md`](references/publishing-queue-contract.md)，确认店铺总 Base 内的 `社媒发布队列` 表是否存在。
3. 如果发布任务表缺少以下字段，列出字段清单给用户确认后再补：`自动发布`、`发布适配器`、`外部队列 ID`、`发布尝试次数`、`最后尝试时间`、`执行锁`。
4. 读 [`references/adapter-registry.md`](references/adapter-registry.md)，展示当前适配器状态：
   - Pinterest = enabled，真实发布走 `pinterest-autopin` adapter → 服务器工具 → 浏览器插件
   - 小红书 = planned/manual-only，只允许建任务和人工回填
5. 如用户要启用 Pinterest，按 `pinterest-autopin` 模式 A 检查服务器工具、浏览器插件和 `社媒发布队列`（Pinterest pin 即本表 `平台 = Pinterest` 的行）。
6. 不创建任何真实定时任务，除非用户明确要求“帮我创建/更新自动任务”。如果需要创建 runtime 自动任务，必须使用当前环境提供的 automation / cron 工具，不手写不可见后台任务。

---

## 模式 B：发布指定任务

进入条件：

- 用户说“发这条发布任务”
- 用户指定某个 `任务 ID`
- 用户说“把这条 Pinterest 发掉 / publish”

步骤：

1. 读 [`references/publishing-queue-contract.md`](references/publishing-queue-contract.md)。
2. 从店铺总 Base 内 `社媒发布队列` 表读取目标行，校验：
   - `状态` 是 `待发` / `重试` / 用户明确确认的 `草稿`
   - `平台` 在 adapter registry 中有明确状态
   - `关联素材`、`素材顺序`、`标题`、`描述`、`链接` 等必填字段满足该平台要求
   - `授权状态`、AI 清理、发布副本已在 `content-asset-pool` 完成
3. 查 [`references/adapter-registry.md`](references/adapter-registry.md) 决定适配器。
4. 如果 adapter 是 enabled 且本轮会真实发布，按 [`references/publishing-queue-contract.md`](references/publishing-queue-contract.md) §占用规则生成 `执行锁` 并把任务占用为 `发布中`。占用失败、无法确认唯一占用，或当前环境不允许并发安全更新时，停止，不调用平台 adapter。
5. Pinterest：
   - Pinterest 任务就是 社媒发布队列 里 `平台 = Pinterest` 的本行；`任务 ID`（`PIN-...`）即主键，无需映射到独立子队列表
   - 调用 `pinterest-autopin` 模式 C 的 server test job → 用户确认 → server publish job 流程
   - 成功后回写 社媒发布队列 本行：`状态 = 已发`、`发布时间`、`发布 URL`，并清空 `执行锁`
   - 失败后回写：`状态 = 失败`、`失败原因`、`最后尝试时间`，并清空 `执行锁`；不要再次递增占用阶段已加过的 `发布尝试次数`
6. planned/manual-only 平台（如小红书）：
   - 不登录、不上传、不点击发布
   - 只输出人工发布清单，或在用户给出公开 URL 后走模式 D 对账

直接发布前必须有确认门。用户没有明确说“发吧 / 真发 / publish / 到点自动发”时，只能 validate / test / 准备。

---

## 模式 C：自动发布巡检

进入条件：

- 用户说“跑自动发布”
- 定时任务唤醒本 skill
- 用户问“有没有到点该发的内容”

步骤：

1. 读 [`references/publishing-queue-contract.md`](references/publishing-queue-contract.md)。
2. 筛选 社媒发布队列：
   - `自动发布 = true`
   - `状态 = 待发` 或 `状态 = 重试`
   - `计划发布时间 <= 当前时间`
   - `发布尝试次数 < 2`
3. 按平台分组，只处理适配器状态为 enabled 的平台；planned/manual-only 平台写入待复核，不自动发布。
4. 每个平台每轮默认只发布最早一条，避免中断恢复后连续打出 backlog。
5. 发布前再跑模式 B 的完整校验和占用规则；任何校验失败、占用失败或无法证明唯一占用，都不要强行发布。
6. 成功 / 失败都回写 社媒发布队列 本行，并清空本轮 `执行锁`；Pinterest pin 就是本表 `平台 = Pinterest` 的行，一次回写即可。

自动巡检不是“绕过确认”。只有 `自动发布 = true` 且已有计划发布时间的记录，才视为用户已提前授权自动发布。

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
4. 如果不匹配，保持 `待复核`，不要为了消除失败状态而回填错 URL。

---

## 禁区

- 不把 `content-asset-pool` 的“已入任务”当成“已发布”。
- 不为小红书、Instagram、TikTok 伪造自动发布能力；没有 enabled adapter 就只做草稿 / 人工对账。
- 不替用户登录平台，不保存账号密码、cookie、token。
- 不跳过 Pinterest 的 test → final 确认门，除非用户明确说明已经 test 过并要求 final。
- 不对 `失败` 记录无限重试；默认最多两次，之后停在 `待复核`。
- 不批量补发 backlog；自动巡检每个平台每轮默认只发一条。

---

## 与其他 skill 的协作

- **content-asset-pool**：上游任务来源；发布任务字段和状态必须按同一张 社媒发布队列 回写。
- **pinterest-autopin**：Pinterest enabled adapter；本 skill 不重写 Pinterest 发布逻辑，只做队列路由和对账。
- **listing-catalog**：商品型发布的 `链接` 必须来自 `Products 商品` 表 `分享链接`。
- **assets-library**：素材授权、发布副本、AI metadata 清理必须在发布前完成。
- **video-assembly / image-synth**：只产出素材，不直接发布；发布仍进 社媒发布队列。

## 工作语言

与用户对话用中文。买家可见文案按平台策略：Pinterest 默认英文，小红书默认中文，配置优先。
