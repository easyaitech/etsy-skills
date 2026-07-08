---
name: publish-metrics
description: 发布结果回收闭环（反馈层）：把每条已发 PublishIntent 的发布后表现（公开 URL / post id / 曝光 / 点击 / 保存 / 转化 / 失败原因分类）回写进 `社媒发布队列`，并按素材变体 / 文案 / SKU / 平台聚合出「哪些有效」复盘，喂回 publish-composer——让发布从单向变闭环，composer 不再盲选素材和文案。三种触发：(1) "建发布指标列 / 配发布复盘"——在 `社媒发布队列` 补 metrics 列；(2) "回收发布数据 / 录这条 pin 的表现 / 更新发布指标"——按平台数据来源回写已发行的指标；(3) "复盘发布效果 / 哪些素材文案有效 / 这个 SKU 发得怎样"——聚合出表现 rollup。只读发布结果 + 写 metrics 列，不改内容/执行状态列、不重新发布；数据来源（手录 / 平台 API / 插件抓取）必须如实标注。
layer: application
depends-on: [publish-composer, listing-catalog]
---

# Publish Metrics（发布结果回收闭环）

这个 skill 是社媒发布栈的**反馈层**：目标态的工作流轴覆盖到「发布」就断了，发布是单向的——发出去之后哪条素材 / 文案有效、哪个 SKU 在哪个平台跑得动，没有回流。本 skill 补上这一环：

```text
publish-composer 选素材+文案 → … → 平台发布（已发，有公开 URL）
        ▲                                      │
        │   哪些素材/文案/SKU 在哪个平台有效     │ 回收表现
        └──────────  publish-metrics  ◀─────────┘
```

**它只做回收 + 复盘**：读 `社媒发布队列` 的已发行，回写发布后指标，聚合出「表现」喂回 composer。**不改内容列 / 执行状态列、不重新发布、不碰素材**。

> **诚实数据来源**：互动指标（曝光 / 点击 / 保存 / 转化）的获取分层——有平台数据接口的走接口；没有的靠运营手录或插件抓取。每条指标必须标 `数据来源`（手录 / 平台API / 插件抓取 / 估算），不假装精确。v1 先把"有公开 URL + post id + 可拿到的基础指标"落死，逐平台补互动指标。

> 共享引导见 [`../shared/preamble.md`](../shared/preamble.md)，降级协议见 [`../shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 依赖关系

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `社媒发布队列`（owner=publish-composer）| 已发行：平台 / 账号 / 关联变体 / 文案 / 关联 SKU / 发布 URL / post id | 读已发行作回收对象；metrics 列回写在同表本行 |
| `Asset Variants 派生素材`（assets-library）| 该 intent 用了哪些变体 | 把表现归因到具体变体，喂 composer 选材 |
| `Products 商品`（listing-catalog）| SKU | 把表现归因到 SKU |
| 平台数据（如有 API / 插件抓取）| 曝光 / 点击 / 保存 / 转化 | 有则回写真实值并标来源；无则手录 / 留空 |

**边界**：本 skill 不重新实现发布、不读浏览器登录态、不改 `状态` / `执行锁` 等执行状态列（那是 ECS dispatch / adapter）。只写 metrics 列。

---

## 模式 A：建发布指标列

**进入条件**：首次做发布复盘，`社媒发布队列` 还没有 metrics 列。

**执行步骤**：
1. 读 [`references/metrics-schema.md`](references/metrics-schema.md) 对齐列定义。
2. 列字段清单给用户确认后，用 `lark-base` 在 `社媒发布队列` 表补 metrics 列（`曝光` / `点击` / `保存` / `转化` / `指标采集时间` / `数据来源` 等）+「发布表现」推荐视图。
3. 不动已有内容 / 执行状态列。

> metrics 列归本 skill（反馈层 owner），与 composer 的内容列、dispatch 的执行状态列分组，互不越界（沿用 T2 的按写者分组纪律）。

---

## 模式 B：回收 / 录入指标（每次一条或一批已发行）

**进入条件**：用户"回收发布数据 / 录这条 pin 的表现 / 更新某批已发的指标"。

**执行步骤**：
1. 用 `lark-base` 筛 `社媒发布队列`：`状态 = 已发` 且（`指标采集时间` 为空 或 用户指定的一批）。
2. 每条按平台确定数据来源：
   - **基础（已有）**：`发布 URL` / `平台 post id` —— adapter 发布成功时已回写，本 skill 只核对齐全。
   - **互动指标**：有平台数据接口 → 拉真实值；无 → 让用户手录，或（若该平台插件支持）按 recipe 抓取。
3. 回写 metrics 列 + `指标采集时间 = now` + `数据来源`。**拿不到就留空 + 标 `待补`，不编数字**。
4. 列回写清单给用户确认后落盘。

> 不替用户编造曝光 / 转化。没有可信来源时 metrics 留空比填假值好——假数据会污染复盘、误导 composer 选材。

---

## 模式 C：复盘 rollup（喂回 composer）

**进入条件**：用户"复盘发布效果 / 哪些素材文案有效 / 这个 SKU / 平台发得怎样"。

**执行步骤**：
1. 读 `社媒发布队列` 已发 + 有指标的行。
2. 按维度聚合表现（用 Base 视图 / 分组，不另建分析库）：
   - **按变体**：哪些 `Asset Variants 派生素材` 的 pin/笔记保存 / 点击高 → 喂 composer 选材优先级
   - **按文案特征**：标题 / 话题 / 封面文案与表现的相关（描述性，不做统计断言）
   - **按 SKU × 平台**：哪个 SKU 在哪个平台跑得动
3. 输出一页复盘给用户 + 给 composer 的可执行建议（"这个 SKU 的 lifestyle 变体在 Pinterest 保存高，下次多排这类"）。
4. **只描述、不替 composer 拍板**——建议交回 publish-composer，由它在组下一条 intent 时参考。

> v1 数据少时如实说"样本不足，先攒数据"，不强行得出趋势结论。

---

## 与其他 skill 的协作

- **publish-composer**：本 skill 的复盘 rollup 是 composer 选素材 / 文案的输入；composer 组 intent 时参考"哪些变体 / 文案有效"。闭环就在这两者之间。
- **assets-library**：表现归因到 `Asset Variants 派生素材`；哪个变体有效是 assets-library 派生 / 检索的参考，但本 skill 不改素材。
- **平台 adapter（pinterest-autopin / xiaohongshu-autopost）**：基础结果（URL / post id）由 adapter 发布时回写，本 skill 不重复；互动指标若靠插件抓取，由 adapter / 服务器侧能力提供，本 skill 只消费。
- **ECS dispatch**：本 skill 不碰执行状态列，与 dispatch 写的列不重叠。

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束，**Base 写穿不变量**见 [`../shared/store-base-architecture.md`](../shared/store-base-architecture.md)（改动没真正写进 Base 不算完成，落库与确认同 turn 收口，写完带回执含飞书链接）。本 skill 特有禁区：

- 只写 metrics 列 + `指标采集时间` / `数据来源`；不改 `状态` / `执行锁` / 内容列。
- 不重新发布、不读登录态、不抓取未授权数据。
- 拿不到指标留空标 `待补`，**绝不编数字**；每条指标标来源。
- Base 写入前列清单 → 用户确认 → 落盘 → **回执必须含一条可点击的飞书 Base 链接**（优先深链到回写了 metrics 的 `社媒发布队列` 行，按 §Base 写穿不变量的链接构造配方拼）。

---

## 工作语言

通用规则见 [`../shared/preamble.md`](../shared/preamble.md) §工作语言。复盘输出跟随客户工作语言（默认中文）。
