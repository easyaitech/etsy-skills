---
name: publish-composer
description: 发布编排（旧名 content-asset-pool）：把已归档的素材变体 + 商品事实 + 品牌底座组装成跨平台发布意图 PublishIntent，并拥有店铺总 Base 内 `社媒发布队列` 表。把单图、多图轮播、视频、图文笔记组合成 Pinterest、Instagram、小红书、TikTok、Etsy Listing 等平台发布任务，平台专属字段走每平台 typed extension（如 XiaohongshuExt / PinterestExt）。触发：用户说"组发布任务 / 排一条 pin / 出小红书笔记草稿 / 这组图发哪些平台 / 这张图发过哪些平台 / 跨平台复用素材 / 对账发布结果"。**只引用 assets-library 已产出的发布副本变体，自己不收集素材、不清理、不裁切**（那些归 assets-library）；真实发布交 social-publisher 路由到平台适配器。所有真实写入经用户确认。
layer: application
depends-on: [assets-library, listing-catalog, social-publisher]
---

# Publish Composer（发布编排，旧名 content-asset-pool）

这个 skill 是发布这个**动词**的 owner：把素材变体 + 商品 + 品牌组装成**跨平台发布意图（PublishIntent）**，并拥有 `社媒发布队列` 表。它回答一个运营问题：

- 一次发布：这次用了哪几个（派生）素材？顺序是什么？发到哪个平台/账号？文案是什么？走到哪个状态？发没发？

它位于：

```text
assets-library 派生素材（发布副本变体） + listing-catalog 商品事实 + BRAND
        ↓
publish-composer  组 PublishIntent + 拥有发布队列
        ↓
social-publisher（排期/路由）→ Pinterest / 小红书 / IG / TikTok / Etsy 适配器
```

它不替代 `assets-library`、`listing-catalog` 或 `social-publisher`。**素材的名词侧（收集 / 清理 / 派生变体 / 检索）全归 `assets-library`**；商品事实和分享链接归 `listing-catalog`；实际平台发布交 `social-publisher` 路由到适配器。本 skill 只 own「组 PublishIntent + 拥有跨平台发布队列」。

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)，工具架构见 [`shared/tools-architecture.md`](../shared/tools-architecture.md)（本 skill 是纯语义 / 编排层，发布执行交 social-publisher，不持有工具 / 密钥 / 浏览器会话，已符合约束）。

---

## When to Use

以下场景触发本 skill：

- 用户要把一组素材组成某平台发布任务（Pinterest / 小红书 / Instagram / TikTok / Etsy Listing）
- 用户问“哪些图发了哪些没发”“这张图已经发过哪些平台”
- 用户想让素材跨平台复用、排发布队列
- 用户要对账发布结果、看发布队列状态

边界：**收集素材 / 去 AI 水印 / 派生平台变体 / 长期归档 / 查找成品 → `assets-library`**（本 skill 只引用它产出的变体）。已指定“发一条 pin / 跑自动发布 / 到点发布”且任务已入队 → `social-publisher`。写 listing / 查商品字段 → `listing-catalog`。具体平台的笔记/pin 语义准备 → 对应 adapter（`pinterest-autopin` / `xiaohongshu-autopost`）。

---

## Core Principles

1. **只引用变体，不动素材**。发布图只引用 `assets-library` 的 `Asset Variants 派生素材`（已清理、已按平台规格派生）。本 skill **不收集、不清理、不裁切**——缺某平台规格变体时反向请求 assets-library 模式 E 派生，不自己处理像素。
2. **PublishIntent = per-platform**。一条记录 = 一个平台一次发布；同素材发多平台 = 多条；失败重发 = 同条 attempt++，不新建。不要用单个“已发布”表达所有平台状态。
3. **平台专属走 typed extension**。平台专属字段（小红书话题/封面文案、Pinterest board/alt）走每平台注册的 `XxxExt` schema + validator，**不塞自由 JSON**、不污染核心字段。
4. **多图顺序必须显式记录**。多图 / 多素材发布用 `素材顺序` 字段决定顺序，不依赖飞书 relation / multi-select 的显示顺序。
5. **商品型发布链接来自 `Products 商品` 表的 `分享链接` 字段**。不要临时拼任何平台 URL（包括 Etsy listing URL）。`分享链接` 缺失时阻塞发布任务创建并引导回 `listing-catalog` 补齐。
6. **按写者分组 + 状态机转移权限**。composer 写内容列；dispatch 写执行状态列；adapter 写平台结果列；状态走事件日志投影，越权转移即拒（schema 见 [`references/base-schema.md` 表 2](references/base-schema.md)）。
7. **只定义和准备，不直接发布**。真实飞书写入、平台发布、自动发布任务修改都必须用户明确确认；发布执行交给 `social-publisher` 路由到适配器。

---

## Data Model

本 skill **只 own 一张表**：`社媒发布队列 / PublishIntent`（店铺总 Base 内）。schema + 字段分组 +
状态机 + typed extension 见 [`references/base-schema.md` § 表 2](references/base-schema.md)。

- **素材侧**（`Assets 素材池` canonical + `Asset Variants 派生素材`）的 schema owner 是 `assets-library`，
  本 skill 只读引用，**不建、不写其结构**。
- **`社媒发布队列`**：一个平台一次发布 = 一条记录，按 `平台` + typed extension 区分。即使先只做
  Pinterest + 小红书，也按跨平台模型保留身份维度（平台/账号/品牌线/地区语言）、内容列、执行状态列。

---

## 已移交 assets-library 的职责（旧 Workflow A/B/C）

旧版的「建素材池 / 扫描收集素材 / 生成清理副本」三个 workflow **已全部移交 `assets-library`**——
它是素材这个名词的唯一 owner：

| 旧职责 | 现在去哪 |
|---|---|
| 建素材池表 / 双层骨架 | `assets-library` 模式 A |
| 从文件夹/文档/聊天收集素材进池 | `assets-library` 模式 B（B1 dump / B2 promote） |
| 生成发布副本 / 清 AI metadata / 像素处理 | `assets-library` 模式 E（按平台规格派生变体，含清理）+ [`../shared/ai-image-sanitization.md`](../shared/ai-image-sanitization.md) |

本 skill 缺某平台规格的发布副本时，**反向请求 assets-library 模式 E 派生**，拿回变体文件链接即可，
自己不收集、不清理、不裁切。

---

## Workflow D: Group Assets Into Platform Publishing Task

进入条件：

- 用户要把一个或多个素材发到某个平台
- 用户问“这几张能不能做一条小红书 / Instagram carousel / Pinterest carousel”
- 用户要把素材与某个 SKU 关联并形成待发布任务

步骤：

1. 读 [`references/platform-publishing-model.md`](references/platform-publishing-model.md)。
2. 取目标平台规格的**发布副本变体**：查 `assets-library` 的 `Asset Variants 派生素材` 表，该 SKU `目标平台 ⊇ 目标平台` 且 `AI 清理状态 = 已清/无需处理` 的变体。
   - **缺该平台规格变体 → 反向请求 `assets-library` 模式 E 派生**（裁切/封面/清理），拿回变体链接；本 skill 不自己处理像素。
   - canonical 成品的 `公开授权` 必须允许公开（在 `Assets 素材池` 查）。
3. 确认平台、发布类型、变体清单、封面变体和素材顺序。
4. 如为商品型发布，查询 `listing-catalog` `Products 商品` 表：
   - 必须取 SKU、商品 record_id、平台商品 ID（如 Etsy Listing ID / ASIN / item_id）。
   - `链接` 必须取 `Products 商品` 表的 `分享链接` 字段。
   - `分享链接` 缺失时阻塞，不临时拼任何平台 URL。
5. 写入 社媒发布队列 草稿（字段分组 + typed extension 见 [`references/base-schema.md` 表 2](references/base-schema.md)）：
   - 身份维度：`平台` / `账号` / `品牌线` / `地区语言`
   - `状态 = 草稿`；`自动发布 = false`（除非用户明确确认排期 + 无人值守）
   - `发布类型 = 单图 / 多图轮播 / 视频 / 图文笔记 / 图文混合`
   - `关联素材` 指向 `Asset Variants 派生素材`（变体，不是 canonical 原图）；`素材顺序` 编号列表
   - 平台专属字段写 `平台扩展 (typed)`（如 `XiaohongshuExt` / `PinterestExt`），过该平台 validator，不塞自由 JSON
   - 小红书任务必须写 `封面素材` + `cover_caption`
6. 组好后状态进 `待审`（半自动核心：用户在此批准 / 退回 / 跳过）。不要直接标“已发布”。

写入前必须展示任务草稿和素材顺序，等用户确认。

---

## Workflow E: Reconcile Published Results

进入条件：

- 下游平台 skill 已经发布成功或失败
- 用户问“这张图发过哪些平台”
- 用户要核对发布任务状态

步骤：

> 注：执行状态列由 `social-publisher`（dispatch）/ 适配器按状态机转移权限回写（`发布中→已发/失败`、
> 平台结果列由 adapter 写）。composer 在本 workflow 主要做**跨平台读 + 报告**，不越权改执行状态。

1. 读 社媒发布队列，按 `关联 SKU` / `账号` / `平台` 聚合：这条 SKU / 这次活动发过哪些平台、各自状态。
2. 跨平台视图给用户：哪些 `已发`（带 `发布 URL`）、哪些 `失败`（带 `失败原因分类`）、哪些 `待审/已批准`。
3. 若用户要重发某条失败任务：交 dispatch 在重试上限内 `失败→发布中`，不在 composer 直接改执行状态。
4. 同一 canonical 素材仍可复用于其他平台（多条 intent，各自独立状态）。

---

## Single Image / Multi Image / Video Compatibility

规范见 [`references/platform-publishing-model.md`](references/platform-publishing-model.md)。真实发布由 `social-publisher` 消费 社媒发布队列。

### 单图发布

```text
发布类型 = 单图
关联素材 = ASSET-001
素材顺序 =
1. ASSET-001
```

### 多图轮播

```text
发布类型 = 多图轮播
关联素材 = ASSET-001, ASSET-002, ASSET-003
素材顺序 =
1. ASSET-001
2. ASSET-002
3. ASSET-003
```

### 视频发布

```text
发布类型 = 视频
关联素材 = ASSET-VIDEO-001
封面素材 = ASSET-COVER-001
```

### 小红书图文

```text
发布类型 = 图文笔记
关联素材 = ASSET-001, ASSET-002, ASSET-003
封面素材 = ASSET-001
素材顺序 =
1. ASSET-001
2. ASSET-002
3. ASSET-003
```

关键规则：多图 / 多素材发布必须用 `素材顺序` 字段决定顺序，不依赖飞书 relation / multi-select 的显示顺序。

---

## AI Sanitization Rules

AI metadata / 水印清理**不再由本 skill 做**，已移交 `assets-library` 模式 E（产出发布副本变体时单点清理，规则见 [`../shared/ai-image-sanitization.md`](../shared/ai-image-sanitization.md)）。本 skill 只引用已清理的变体；如发现引用的变体 `AI 清理状态` 非 `已清/无需处理`，退回请 assets-library 处理，不自己清。

---

## Collaboration With Existing Skills

### assets-library（素材名词 owner）

- `assets-library` 负责素材的一切：收集进池、长期归档、检索、清理、**按平台规格派生发布副本变体（模式 E）**。
- 本 skill 缺某平台规格变体时**反向请求 assets-library 模式 E**，拿回变体文件链接；自己不收集 / 清理 / 裁切。
- 边界：素材这个名词归 assets-library；发布这个动词（组 intent + 队列）归本 skill。

### social-publisher（dispatch 执行层）

- `social-publisher` 是 社媒发布队列 的执行层。用户说“自动发布 / 到点发布 / 发这条任务”时交给它。
- 当前 enabled adapter 只有 Pinterest（`pinterest-autopin`）；小红书 adapter `xiaohongshu-autopost` 后端 + 契约就绪但 **staged 未对外开放**（草稿 + 人工对账）；IG/TikTok 仍草稿。
- 执行状态列由 dispatch / adapter 按状态机转移权限回写，composer 不越权改。

### pinterest-autopin / xiaohongshu-autopost（平台适配器）

- Pinterest pin = 社媒发布队列 `平台 = Pinterest` 行（`PIN-xxx`）；小红书笔记 = `平台 = 小红书` 行（`XHS-xxx`）。
- 平台专属字段由对应 adapter 的 typed extension（`PinterestExt` / `XiaohongshuExt`）约定；composer 按平台策略填、过 validator。
- 商品型发布行的 `链接` 必须用 `Products 商品` 表的 `分享链接`，不临时拼平台商品 URL。
- 发布图引用 `Asset Variants 派生素材` 的对应平台规格变体，不引用 canonical 原图。

### listing-catalog

- 商品型素材必须能关联 SKU。
- 发布链接必须优先从 `Products 商品` 表的 `分享链接` 字段读取。
- `分享链接` 缺失时，回到 `listing-catalog` 补字段；不要用平台商品 ID 临时拼链接。

### Future Platforms

预留 Instagram、小红书、TikTok、Reels、电商平台商品页 / listing 和未来平台。平台专用字段走 社媒发布队列 的 `平台扩展 (typed)`——每平台注册 typed extension schema + validator（见 [references/base-schema.md 表 2](references/base-schema.md)），不是自由 JSON。未来新增真实发布能力时，只扩 `social-publisher` adapter + 注册该平台 typed schema。

---

## Common Pitfalls

1. **不要自己收集 / 清理 / 裁切素材**——那是 assets-library 的活，本 skill 只引用变体。
2. **不要引用 canonical 原图当发布图**，要引用 `Asset Variants 派生素材` 的平台规格变体。
3. **不要用一条 intent 表达多平台**——一个平台一条 PublishIntent（per-platform）。
4. **不要把平台专属字段塞自由 JSON**，走每平台 typed extension + validator。
5. **不要依赖飞书关联字段顺序作为多图发布顺序**，用 `素材顺序`。
6. **不要临时拼平台商品链接**，应从 `Products 商品` 表 `分享链接` 取。
7. **不要越权改执行状态列**——执行状态由 dispatch / adapter 按状态机转移权限写。
8. **不要在本 skill 中执行真实平台发布**，交给 social-publisher。
9. **不要把“待审 / 已批准”误写成“已发布”。**

---

## Verification Checklist

- [ ] `SKILL.md` frontmatter 合法，`name = publish-composer`（旧名 content-asset-pool 在描述中保留作路由兼容）。
- [ ] 描述不超过 Hermes 1024 字限制。
- [ ] 文档明确：只引用 assets-library 变体，不收集 / 清理 / 裁切。
- [ ] 文档明确：PublishIntent per-platform + 按写者分组 + 状态机转移权限。
- [ ] 文档明确：平台专属走 typed extension，不塞自由 JSON。
- [ ] 文档明确：商品分享链接从 `Products 商品` 表 `分享链接` 取。
- [ ] references 收敛为：`base-schema.md`（队列契约）、`platform-publishing-model.md`（组装规则）。
- [ ] 没有执行真实飞书写入、云盘移动、平台发布或自动任务修改。
