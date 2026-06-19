---
name: content-asset-pool
description: 管理跨平台内容素材发布池：从飞书云盘、云文档或聊天上传收集待发布图片/视频，登记素材池，生成不覆盖原图的发布副本，记录 AI metadata/provenance 清理状态，并把单图、多图轮播、视频、图文笔记等组合成 Pinterest、Instagram、小红书、TikTok、Etsy Listing 等平台发布任务。它是 assets-library、listing-catalog 与 social-publisher 之间的上游调度层，不直接扫描、上传、移动、删除或发布，所有真实写入都必须经用户确认。
layer: application
depends-on: [assets-library, listing-catalog, social-publisher]
---

# Content Asset Pool

这个 skill 定义电商店铺的**跨平台素材发布池**。它回答两个运营问题：

- 单个素材：这是什么素材？能不能公开？有没有清理？发布副本在哪里？
- 一次发布：这次用了哪几个素材？顺序是什么？发到哪个平台？发没发？

它位于：

```text
飞书云盘 / 云文档 / 聊天上传素材
        ↓
content-asset-pool
        ↓
Pinterest / Instagram / 小红书 / TikTok / Etsy Listing / 未来平台
```

它不替代 `assets-library`、`listing-catalog` 或 `social-publisher`。它负责发布前调度、跨平台状态与发布副本追踪；长期归档仍归 `assets-library`，商品事实和分享链接仍归 `listing-catalog`，实际平台发布统一交给 `social-publisher` 再路由到具体平台适配器。

> 共享引导（版本检查 / 工作区解析 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## When to Use

以下场景触发本 skill：

- 用户说“这些图以后要统一管理”
- 用户问“哪些图发了哪些没发”
- 用户给一个飞书文件夹 / 云文档，里面持续增加待发布素材
- 用户要把一组素材发 Pinterest / 小红书 / Instagram / TikTok / Etsy Listing
- 用户问“这个素材有没有去 AI 水印 / AI metadata”
- 用户问“这张图已经发过哪些平台”
- 用户想让素材跨平台复用

如果用户只是在长期归档素材、建立素材库目录或查找已归档成品，优先使用 `assets-library`。如果用户已经指定“发一条 Pinterest pin / 跑自动发布 / 到点发布”，且发布任务已入队，优先使用 `social-publisher`。如果用户要写 listing 或查商品字段，优先使用 `listing-catalog`。

---

## Core Principles

1. **素材池不是 Pinterest 专用**。核心字段只描述素材、授权、清理、跨平台适用性和发布任务关联；不要把 Board、pin_url 这类平台专用字段塞进素材池核心 schema。
2. **原图永远保留**。AI 清理、metadata 清理、尺寸处理、压缩、平台适配都只作用在“发布副本”上，不替换原图。
3. **默认只清 metadata / provenance**。默认清 EXIF、XMP、C2PA、OpenAI provenance、prompt 信息、软件生成记录和其他可检测 AI metadata。像素级隐形水印处理必须用户明确确认。
4. **素材池和发布任务分层**。一个素材一条 Asset Pool 记录；一次平台发布一条 Publishing Queue 记录。同一素材可能 Pinterest 已发、小红书未发，所以素材池不要用单个“已发布”状态表达所有平台状态。
5. **多图顺序必须显式记录**。多图 / 多素材发布必须用 `素材顺序` 字段决定顺序，不依赖飞书 relation / multi-select 的显示顺序。
6. **商品型发布链接来自商品 Base `分享链接` 字段**。不要临时拼任何平台 URL（包括 Etsy listing URL）。如果 `分享链接` 缺失，阻塞发布任务创建并引导回 `listing-catalog` 补齐。
7. **本 skill 默认只定义和准备，不直接发布**。真实飞书写入、云盘上传、平台发布、自动发布任务修改都必须由用户明确确认；发布执行交给 `social-publisher`。

固定处理模型：

```text
原图
  ↓ 复制
发布副本
  ↓ 清 metadata / provenance / 轻度压缩 / 平台适配
用于发布
```

---

## Data Model

读 [`references/base-schema.md`](references/base-schema.md)。

推荐两张表：

- **素材池 / Asset Pool**：一张图片 / 一个视频 / 一个素材 = 一条记录。
- **发布任务 / Publishing Queue**：一次平台发布 = 一条任务。

两张表可以未来独立建，也可以先让 Publishing Queue 与现有 Pinterest Pin Queue 并存。即使先只做 Pinterest，也要按跨平台模型保留 `平台`、`发布类型`、`关联素材`、`素材顺序`、`封面素材`、`状态`、`发布 URL`、`自动发布`、`发布适配器`、`外部队列 ID`、`执行锁` 等字段。

---

## Workflow A: Initialize Asset Pool

进入条件：

- 用户要建立统一素材池 / 发布池
- 用户已有持续新增的飞书文件夹或云文档
- 用户无法追踪哪些素材已处理、已入队、已发布

步骤：

1. 读 [`references/base-schema.md`](references/base-schema.md) 与 [`references/state-model.md`](references/state-model.md)。
2. 确认是否已经存在 `{店铺名}-素材发布池` / `{店铺名}-发布任务` Base。只查询，不创建。
3. 如用户确认要建 Base，展示字段清单和视图建议，等用户明确确认后才调用 `lark-base`。
4. 建表时优先放在与商品 Base、素材索引 Base、Pin Queue 同一飞书空间目录下。
5. 初始化完成后只给 Base 链接、字段清单、下一步扫描入口；不扫描、不搬文件、不发布。

建议 Base 名：

- `{店铺名}-素材发布池`
- `{店铺名}-发布任务`

---

## Workflow B: Scan New Source Folder / Document

进入条件：

- 用户给飞书文件夹 / 云文档链接，里面有持续新增的待发布素材
- 用户说“帮我看看这个文件夹里哪些还没登记”

步骤见 [`references/scan-and-dedupe.md`](references/scan-and-dedupe.md)。

核心规则：

1. 从用户给的飞书文件夹 / 云文档提取 token。
2. 列出文件，提取 file token、文件名、文件链接、文件类型、修改时间。
3. 下载到 workspace cache，只用于计算 hash 和准备发布副本。
4. 用 `file token + hash` 判断是否已登记。
5. 已登记则跳过，并可追加“重复发现”备注。
6. 新素材写入素材池，状态为 `待处理` 或 `待清理`。
7. 不直接发布。
8. 不删除、移动或覆盖原图。

真实写入素材池前，必须展示新增记录清单并等用户确认。

---

## Workflow C: Create Publishing Copies

进入条件：

- 素材池中有 `待清理` 素材
- 用户问“这批图能不能去 AI metadata 后再发”
- 下游发布任务需要使用清理后的副本

步骤：

1. 读 [`references/ai-sanitization-policy.md`](references/ai-sanitization-policy.md) 和 [`../shared/ai-image-sanitization.md`](../shared/ai-image-sanitization.md)。
2. 对每个素材复制原图到 `<workspace>/.cache/content-asset-pool/processed/`。
3. 只对发布副本清 EXIF / XMP / C2PA / OpenAI provenance / prompt / 软件生成记录等 metadata。
4. 做无损或轻度压缩；不要破坏商品边缘、文字、手工笔触 / 纹样。
5. 输出 `发布副本本地路径`、`发布副本 hash`、`AI 清理状态`。
6. 如用户确认上传回飞书，再由 `lark-drive` 上传发布副本，并回写 `发布副本链接`。

默认不做像素级隐形水印处理。只有用户明确说“这批图可以做像素级处理”并接受画面可能变化，才允许对发布副本执行，并把 `像素级水印处理 = 已处理`。如果图片包含大量文字、手工纹样或商品细节，默认写 `像素级水印处理 = 不建议`。

---

## Workflow D: Group Assets Into Platform Publishing Task

进入条件：

- 用户要把一个或多个素材发到某个平台
- 用户问“这几张能不能做一条小红书 / Instagram carousel / Pinterest carousel”
- 用户要把素材与某个 SKU 关联并形成待发布任务

步骤：

1. 读 [`references/platform-publishing-model.md`](references/platform-publishing-model.md)。
2. 检查所有关联素材：
   - `授权状态` 必须允许公开。
   - `AI 清理状态` 应为 `已清 metadata` / `无需处理`；否则先走 Workflow C。
   - `素材生命周期状态` 必须是 `可发布` 或可复用状态。
3. 确认平台、发布类型、素材清单、封面素材和素材顺序。
4. 如为商品型发布，查询 `listing-catalog` 商品 Base：
   - 必须取 SKU、商品 record_id、平台商品 ID（如 Etsy Listing ID / ASIN / item_id）。
   - `链接` 必须取商品 Base 的 `分享链接` 字段。
   - `分享链接` 缺失时阻塞，不临时拼任何平台 URL。
5. 写入 Publishing Queue 草稿：
   - `状态 = 草稿`
   - `自动发布 = false`（除非用户明确确认了计划发布时间和无人值守发布）
   - `平台 = Pinterest / Instagram / 小红书 / TikTok / Etsy`
   - `发布类型 = 单图 / 多图轮播 / 视频 / 图文笔记 / 图文混合`
   - `关联素材` 记录一条或多条素材
   - `素材顺序` 用编号列表记录顺序
   - 小红书任务必须写 `封面素材`；图文笔记 / 视频的标题、正文、标签、话题进入 Publishing Queue，不写回素材池
6. 回写素材池的 `关联发布任务`，并把素材生命周期状态改为 `已入任务`。不要改成“已发布”。

写入前必须展示任务草稿和素材顺序，等用户确认。

---

## Workflow E: Reconcile Published Results

进入条件：

- 下游平台 skill 已经发布成功或失败
- 用户问“这张图发过哪些平台”
- 用户要核对发布任务状态

步骤：

1. 从对应平台队列 / 发布结果读取任务 ID、状态、发布时间、发布 URL、失败原因。
2. 回写 Publishing Queue：
   - 成功：`状态 = 已发`，写 `发布时间` 和 `发布 URL`。
   - 失败：`状态 = 失败`，写 `失败原因`，后续人工决定 `待复核 / 重试 / 跳过`。
3. 只在发布任务表表达平台发布状态。
4. 素材池只更新 `关联发布任务` 和必要备注；同一素材仍可复用于其他平台。

---

## Single Image / Multi Image / Video Compatibility

规范见 [`references/platform-publishing-model.md`](references/platform-publishing-model.md)。真实发布由 `social-publisher` 消费 Publishing Queue。

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

完整规则见 [`references/ai-sanitization-policy.md`](references/ai-sanitization-policy.md)。

默认允许：

- 复制原图生成发布副本
- 清 metadata / EXIF / XMP / C2PA / OpenAI provenance / prompt / 软件生成记录
- 无损或轻度压缩
- 可选上传发布副本回飞书

默认禁止：

- 覆盖原图
- 删除原图
- 默认跑像素级隐形水印处理
- 重绘、画面修复、破坏性压缩
- 在文字、手工纹样、商品边缘密集的图上自动做像素级处理

---

## Collaboration With Existing Skills

### assets-library

- `assets-library` 负责长期归档和素材索引。
- `content-asset-pool` 负责发布前调度、跨平台状态、发布副本。
- 原图归档位置仍遵守素材库原则。
- 发布副本可以放在营销 / 发布副本区域，或记录为 Base 链接。
- 不要把同一素材复制到多个云盘文件夹表达多用途；多用途由 Base 字段表达。

### social-publisher

- `social-publisher` 是 Publishing Queue 的执行层。用户说“自动发布 / 到点发布 / 发这条任务 / 对账发布结果”时交给它。
- 当前 enabled adapter 只有 Pinterest，底层仍调用 `pinterest-autopin`。
- 小红书、Instagram、TikTok 等没有 enabled adapter 时，只能建草稿和人工对账，不能标记自动发布成功。
- 发布成功 / 失败后必须回写 Publishing Queue，不只更新平台子队列。

### pinterest-autopin

- 本仓现有 Pinterest 发布 skill 是 `pinterest-autopin`；现在作为 `social-publisher` 的 Pinterest adapter 使用。
- 当素材池中素材用于 Pinterest，Publishing Queue 先建任务；执行时由 `social-publisher` 创建或补齐 Pin Queue。
- Pin Queue 的 `关联 SKU` 必须写 SKU + 商品 record_id + 平台商品 ID（如 Etsy Listing ID / ASIN / item_id）。
- Pin Queue 的 `Link` 必须使用商品 Base `分享链接` 字段，不临时拼任何平台商品 URL。
- 素材池对应素材写入 `关联发布任务 = PIN-xxx`。
- 发布成功后由下游回写发布 URL，再通过 Workflow E 对账。

### listing-catalog

- 商品型素材必须能关联 SKU。
- 发布链接必须优先从商品 Base 的 `分享链接` 字段读取。
- `分享链接` 缺失时，回到 `listing-catalog` 补字段；不要用平台商品 ID 临时拼链接。

### Future Platforms

预留 Instagram、小红书、TikTok、Reels、电商平台商品页 / listing 和未来平台。平台专用字段放在 Publishing Queue 或平台子队列，不污染 Asset Pool 核心 schema。未来新增真实发布能力时，只扩 `social-publisher` adapter。

---

## Common Pitfalls

1. **不要替换原图。**
2. **不要用素材池的一个状态表示所有平台发布状态。**
3. **不要依赖飞书关联字段顺序作为多图发布顺序。**
4. **不要把 Pinterest 专用字段写进素材池核心 schema。**
5. **不要默认做像素级水印处理。**
6. **不要临时拼平台商品链接，应从商品 Base `分享链接` 取。**
7. **不要把云盘文件夹当作发布状态系统，状态必须进 Base。**
8. **不要把同一素材复制到多个云盘文件夹表达多用途，多用途应由 Base 字段表达。**
9. **不要在本 skill 中执行真实平台发布，交给 social-publisher。**
10. **不要把“已入任务”误写成“已发布”。**

---

## Verification Checklist

- [ ] `SKILL.md` frontmatter 合法，`name = content-asset-pool`。
- [ ] 描述不超过 Hermes 1024 字限制。
- [ ] 文档明确：原图不覆盖；发布副本清理；跨平台扩展；单图 / 多图 / 视频兼容。
- [ ] 文档明确：素材池与发布任务分层。
- [ ] 文档明确：AI metadata 与像素级水印处理边界。
- [ ] 文档明确：商品分享链接从商品 Base `分享链接` 取。
- [ ] 已有 references：`base-schema.md`、`state-model.md`、`ai-sanitization-policy.md`、`platform-publishing-model.md`、`scan-and-dedupe.md`。
- [ ] 没有执行真实飞书写入、云盘移动、平台发布或自动任务修改。
