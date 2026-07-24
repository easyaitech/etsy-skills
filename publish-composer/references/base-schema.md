# Publish Composer Tables Schema（社媒发布队列 / PublishIntent）

本 skill（publish-composer）真正 **owner 的是一张表：`社媒发布队列 / PublishIntent`**（表 2）。素材侧（素材池 + 派生素材）的 schema **owner 是 assets-library**，本 skill 只读引用（契约 1）。

- **素材池 / Asset Pool**（owner=assets-library）：一个 canonical 成品 = 一条记录；发布副本/清理走 assets-library 的 `Asset Variants 派生素材`。本文件表 1 仅供存量兼容阅读，不重声明。
- **社媒发布队列 / PublishIntent**（owner=本 skill）：一个平台一次发布 = 一条任务，所有平台共用这一张表，按 `平台` + typed extension 区分。

社媒发布队列回答“这次发布用了哪些（派生）素材、顺序是什么、发到哪个平台/账号、走到哪个状态、发没发”。

---

## 表 1：素材池 / Asset Pool（schema owner = assets-library，本 skill 不重声明）

> **所有权（契约 1）**：`Assets 素材池` 的 schema **唯一 owner 是 assets-library**。canonical 成品在 `Assets 素材池`，**发布副本 / 清理 / 平台裁切走 assets-library 的 `Asset Variants 派生素材` 表**（见 [`../../assets-library/references/asset-index-base-schema.md` § 派生素材 / AssetVariant](../../assets-library/references/asset-index-base-schema.md)）。content-asset-pool（publish-composer）**只读** canonical + 派生素材，**不另建发布池、不自己清理裁切**——只引用 assets-library 已产出的派生文件链接。
>
> 下表为历史字段，**新店按 assets-library 的 canonical + AssetVariant 双表建**，不要在本表重复加发布副本/清理列（已迁至 `Asset Variants 派生素材`）。下表仅供存量数据兼容阅读。

| 字段 | 类型建议 | 说明 |
|---|---|---|
| `素材 ID` | 单行文本（主键） | 如 `ASSET-20260524-001` |
| `素材名称` | 单行文本 | 原文件名或规范名 |
| `素材类型` | 单选 / 多选 | 图片 / 视频 / 海报 / 商品图 / UGC / 工作室素材 |
| `来源类型` | 单选 | 飞书文件夹 / 云文档 / 聊天上传 / `Products 商品` 表 / AI 生成 |
| `来源链接` | URL / 文本 | 原始飞书文件或文档链接 |
| `原图链接` | URL / 文本 | 原图飞书链接 |
| `原图 file token` | 单行文本 | 用于文件级去重 |
| `原图 hash` | 单行文本 | 内容级去重 |
| `发布副本链接` | URL / 文本 | 清理后的副本飞书链接，可为空 |
| `发布副本本地路径` | 单行文本 | workspace cache 路径，可选 |
| `发布副本 hash` | 单行文本 | 处理后 hash |
| `AI 清理状态` | 单选 | 未处理 / 已清 metadata / 无需处理 / 需人工复核 |
| `像素级水印处理` | 单选 | 未处理 / 不建议 / 已处理 / 需用户确认 |
| `授权状态` | 单选 | 自有 / 已授权 / 未授权 / 不可公开 / 待确认 |
| `关联 SKU` | 文本或关联 | 商品 SKU；如可关联 `Products 商品` 表，优先 relation |
| `适用平台` | 多选 | Pinterest / Instagram / 小红书 / TikTok / Etsy |
| `素材生命周期状态` | 单选 | 待处理 / 待清理 / 可发布 / 已入任务 / 可复用 / 停用 / 不可公开 |
| `关联发布任务` | 文本或关联 | `PIN-xxx` / `IG-xxx` / `XHS-xxx` 等；可多值 |
| `备注` | 多行文本 | 异常、人工判断、处理说明 |

### 素材池设计原则

- 不放平台发布结果字段，例如 `pin_url`、`IG URL`、`小红书笔记链接`。这些属于发布任务表。
- 不用 `已发布` 作为素材生命周期状态。同一素材可能在一个平台已发，在另一个平台未发。
- `关联发布任务` 可以有多条，但只做追溯；每个平台任务的状态由 社媒发布队列 管。
- `发布副本链接` 与 `发布副本本地路径` 可以同时存在。飞书链接是长期可访问入口，本地路径是 runtime cache。

---

## 表 2：社媒发布队列 / PublishIntent

建议表名：`社媒发布队列`。这是**跨平台发布任务的唯一队列表**，所有平台（含 Pinterest pin）都进这一张表，用 `平台` 字段区分；不再为 Pinterest 单建执行队列表，Pinterest 行就是 `平台 = Pinterest` 的记录。

默认建在店铺总 Base 内。迁移期可与旧独立发布任务数据源或旧的 Pinterest 队列并存，但新写入优先进入本表。无论哪种方式，都保持跨平台字段模型。

**语义定死**：一条记录 = **一个平台目标的一次发布任务**（per-platform）。同一素材发多平台 = **多条**记录；失败重发 = **同一条** `发布尝试次数++`，不新建。

**默认只建最小可运行字段**：不要为了未来平台预留 `Campaign ID` / `账号` / `品牌线` / `地区 / 语言` / `平台 post id` / metrics 等列；不要为了“看起来完整”提前建 `平台扩展 (typed)`。字段用到时再由对应 skill 补。历史字段有数据时可以保留或隐藏，但新建 / 补齐时不再默认创建。

**字段按写者分组**（每组只有标注的 owner 能写；越权写 = 拒绝并记 `事件日志`）：

**① 身份维度**（composer owner）

| 字段 | 类型建议 | 说明 |
|---|---|---|
| `任务 ID` | 单行文本（主键） | `PIN-xxx` / `IG-xxx` / `XHS-xxx` / `TT-xxx` / `ETSY-xxx` |
| `平台` | 单选 | Pinterest / Instagram / 小红书 / TikTok / Etsy |

**② 内容**（composer owner；`待审` 前可改，`已批准` 后改需先退回 `草稿`）

| 字段 | 类型建议 | 说明 |
|---|---|---|
| `发布类型` | 单选 | 单图 / 多图轮播 / 视频 / 图文笔记 / 图文混合 |
| `关联素材` | 关联 | 指向 assets-library `Asset Variants 派生素材`（发布副本），不是 canonical 原图 |
| `标题` / `描述` | 文本 / 多行文本 | 平台文案；Pinterest 由 adapter 写，其他未 enabled 平台由 composer 兜底 |
| `链接` | URL / 文本 | 商品型发布必须来自 `Products 商品` 表的 `分享链接`，不拼 |

可选内容列：`关联 SKU`、`标签`、`素材顺序`、`封面素材`、`备注`、`平台字段 JSON` / `平台扩展 (typed)`。只有真实工作流会读取或写入时才补；仅作历史迁移说明或人工注释时优先隐藏，不默认建。

**③ 执行状态**（dispatch owner；按状态机转移，见下）

| 字段 | 类型建议 | 说明 |
|---|---|---|
| `状态` | 单选 | 草稿 / 待审 / 已批准 / 发布中 / 已发 / 失败 / 跳过 / 手动已发 |
| `计划发布时间` | 日期时间 / 文本 | 排期 |
| `自动发布` | 复选框 | 默认 false；用户明确确认无人值守才勾 |
| `发布适配器` | 单选 / 文本 | 如 `pinterest-autopin` / `manual-xiaohongshu`；dispatch 路由用 |
| `外部队列 ID` | 单行文本 | 当前生产 dispatch 写入的 job 标识；新后端兼容 `ECS job ID` 时可用别名，但不要为了改名迁移历史表 |
| `发布尝试次数` | 数字 | 默认 0；每次真实尝试前累加 |
| `最后尝试时间` / `下次重试时间` | 日期时间 | 重试调度 |
| `执行锁` | 单行文本 | 后端租约令牌；占用时写入，成功/失败/回收后清空 |
| `失败原因分类` | 单选 | `会话过期 / 插件未装 / 限速 / DOM漂移 / 平台拒绝 / 网络 / 其他`（结构化，喂重试与排查） |

**④ 平台结果**（adapter owner，回写）

| 字段 | 类型建议 | 说明 |
|---|---|---|
| `发布时间` | 日期时间 | 实际发布时间 |
| `发布 URL` | URL / 文本 | 平台发布后的公开链接 |
| `失败原因` | 多行文本 | 自动化失败的原始记录（分类见 ③） |

> **⑥ metrics 列**（曝光 / 点击 / 保存 / 互动 / 转化 / 指标采集时间 / 数据来源）= 反馈层 `publish-metrics` owner 的列分组，见 [`../../publish-metrics/references/metrics-schema.md`](../../publish-metrics/references/metrics-schema.md)。回写 metrics 不参与状态机、不改执行状态列；做发布复盘时才建。

**⑤ 事件日志**（所有转移投影来源）

| 字段 | 类型建议 | 说明 |
|---|---|---|
| `事件日志` | 多行文本 / 子表 | 每次状态转移追加一条 `who / from→to / ts / reason`。`状态` 字段是事件日志的投影，不裸写——这样 adapter 失败要改内容、dispatch 重试、composer 撤销重排都有可审计的转移记录。 |

### 状态机与转移权限（半自动是单人店命脉）

```
        composer            user             dispatch          adapter/plugin
  草稿 ──提交审核──▶ 待审 ──批准──▶ 已批准 ──领取/排期──▶ 发布中 ──┬─成功─▶ 已发
   ▲  └──────退回(改内容)──────┘         │                        ├─失败─▶ 失败 ──重试(上限内)─▶ 发布中
   │                          user│跳过                          └─超时/掉线─▶（租约回收）─▶ 已批准
   └─────────── composer 撤销/重排 ◀──────┘                       手动已发(user 标记，旁路自动化)
```

转移权限（越权即拒 + 记事件，防静默串状态）：
- `composer`：`草稿↔待审`、`*→草稿`（撤销/重排）
- `user`：`待审→已批准`、`待审→跳过`、`*→手动已发`
- `dispatch`：`已批准→发布中`、`发布中→失败`、`发布中→已批准`（租约回收）、`失败→发布中`（重试上限内）
- `adapter`：`发布中→已发`

> capability 协商：dispatch 在 `已批准→发布中` 前，按 `发布适配器` 的 capability（尺寸/比例/数量上下限/标题正文长度/标签数/draft/schedule/edit/delete/needs_human_confirm/rate_limit）校验本 intent；不支持则降级为 draft-only 或回 `待审` 提示用户。Pinterest capability 见 [`../../pinterest-autopin/references/pin-queue-base-schema.md`](../../pinterest-autopin/references/pin-queue-base-schema.md)。

### 商品型发布字段约定

`关联 SKU` 至少写清：

```text
SKU: FUB-001
商品 record_id: recxxxx
平台商品 ID: Etsy Listing ID 1234567890 / ASIN ... / item_id ...
```

`链接` 必须从 `Products 商品` 表的 `分享链接` 字段读取。平台商品 ID 是识别商品的事实，不是拼链接的授权。

### Pinterest 发布任务字段约定

当 `平台 = Pinterest` 时，本表行就是一条 Pinterest pin，单图和轮播（2-5 张）共用一行：

- `任务 ID` 用 `PIN-YYYYMMDD-001`，即旧 `pin_id`。
- `发布类型` 为 `单图` 或 `多图轮播`。
- Pinterest 行最小额外字段只需要 `Board (Pinterest)`、`Alt Text (EN)`。图片来源走通用 `关联素材`；如果历史表已有 `素材顺序` / `封面素材` / `平台字段 JSON`，保留作历史数据或人工检查，不作为新建必需列。
- 这些 Pinterest 专属字段对非 Pinterest 行留空即可，不影响跨平台字段模型。

### 小红书发布任务字段约定（⛔ 封存 shelved — 未来解封资料）

> **小红书当前封存**（产品决策 2026-07-24：专注 Etsy，不对用户开放，判据 = [`../../social-publisher/references/adapter-registry.md`](../../social-publisher/references/adapter-registry.md) 小红书状态 = `封存 shelved`）。封存期**不组小红书发布任务、不建 `平台 = 小红书` 行**，按封存边界回复并 STOP。以下字段约定仅供未来解封复用。

当 `平台 = 小红书` 时（解封后）：

- `任务 ID` 建议使用 `XHS-YYYYMMDD-001`。
- `发布类型` 只能从 `单图 / 多图轮播 / 视频 / 图文笔记 / 图文混合` 中选；图文笔记的顺序和封面可先写进 `关联素材` / 正文草稿，只有真实发布器需要结构化读取时再补 `素材顺序` / `封面素材`。
- `标题`、`描述`、`标签` 使用中文；如果 COMMERCE_PLATFORM.md 或 MARKETING_PLATFORM.md 要求双语，再按配置输出。
- 小红书未 `enabled` 时不默认加专属列；对外放行后再按 `XiaohongshuExt` 的真实读取需求补字段或 `平台扩展 (typed)`，不知道的字段留空标 `待后台确认`，不要编造。
- 商品型笔记如果没有 `Products 商品` 表的 `分享链接`，`链接` 可以为空并标记为待补；不要临时拼小红书商品 URL。

---

## 推荐视图

素材池 / 派生素材：视图归 assets-library（canonical + `Asset Variants 派生素材`），见 [`../../assets-library/references/asset-index-base-schema.md` § 推荐视图](../../assets-library/references/asset-index-base-schema.md)。本 skill 不重复定义。

发布任务（社媒发布队列 / PublishIntent，状态机对齐）：

- **草稿**：`状态 = 草稿`
- **待我审**：`状态 = 待审`（半自动核心入口：用户在此批准 / 退回 / 跳过）
- **已批准待发**：`状态 = 已批准`，按 `计划发布时间` 升序
- **自动发布队列**：`自动发布 = true AND 状态 IN (已批准, 失败)`，按 `计划发布时间` 升序
- **发布中**：`状态 = 发布中`（占用 `执行锁` 的在途任务）
- **已发 / 手动已发**：`状态 IN (已发, 手动已发)`
- **失败**：`状态 = 失败`，可按 `失败原因分类` 分组排查
- **按平台分组**：按 `平台`
- **按账号 / 品牌线**：按 `账号` 或 `品牌线`（多账号多品牌线店铺）
- **按 SKU 分组**：按 `关联 SKU`
