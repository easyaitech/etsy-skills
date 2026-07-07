# `社媒发布队列` Pinterest 行 Schema

> Pinterest pin 不再单独建表。一条 Pinterest pin = 店铺总 Base 内 `社媒发布队列` 表里 `平台 = Pinterest` 的一行。用 `lark-base` 在该表内补齐下面这些 Pinterest 行需要的字段即可；跨平台通用字段（`任务 ID` / `平台` / `状态` / `关联素材` / `计划发布时间` / `自动发布` / `发布适配器` / `执行锁` 等）见 [`publish-composer/references/base-schema.md`](../../publish-composer/references/base-schema.md) 和 [`social-publisher/references/publishing-queue-contract.md`](../../social-publisher/references/publishing-queue-contract.md)。不要为 Pinterest 队列默认创建独立 Base / 独立表；迁移期旧的独立 Pinterest 队列数据源只作为只读来源。

## 数据模型

一条 `平台 = Pinterest` 的记录就是一个 Pinterest Pin。单图 pin 和轮播 pin 共用同一行：

- 单图：`发布素材` 只有 1 项，`发布类型 = 单图`
- 轮播：`发布素材` 有 2-5 项，`发布类型 = 多图轮播`
- 多张图不要拆成多条记录；它们属于同一行里的有序图片列表
- 发布成功后只回写这一行的一个 `发布 URL`
- 发布顺序以 `发布素材` 字段的行顺序为准（即跨平台 `素材顺序` 在 Pinterest 行的落地）；`关联素材` 关联派生素材变体记录，只做素材来源追溯，不作为排序来源

---

## 从旧 `Pinterest Queue` 表迁入

如果店铺以前用过独立的 `Pinterest Queue` 表，把它并入 `社媒发布队列`：

1. 旧 `pin_id` → `任务 ID`（保留 `PIN-...` 编码，作为本表主键）
2. 旧 `pin 类型`（单图 / 轮播）→ `发布类型`（单图 / 多图轮播）
3. 旧 `Title (EN)` / `Description (EN)` / `Link` / `pin_url` → 通用字段 `标题` / `描述` / `链接` / `发布 URL`
4. `Board (Pinterest)` / `发布素材` / `Alt Text (EN)` 作为 Pinterest 专属列保留；旧 `image 路径` 只作为迁移期只读证据
5. 所有迁入行写 `平台 = Pinterest`
6. 新增「Pinterest」「轮播」视图（见下方 § 视图建议）

旧表验收后归档，不再单独维护。

---

## Pinterest 行专属字段

`社媒发布队列` 通用字段之外，Pinterest 行额外需要下面这些列（非 Pinterest 行留空即可）。

> **与目标态对齐**：这些 Pinterest 专属列在目标态等价于 PublishIntent 的 `平台扩展 (typed)` 里的 **`PinterestExt`** schema（`board_id` ← `Board (Pinterest)`、`alt_text` ← `Alt Text (EN)`、`dominant_color?`），写入前过 PinterestExt validator；`发布素材` 引用 `Asset Variants 派生素材` 的变体（非 canonical 原图）。下表是这些字段在飞书 Base 里的具体列实现，不是另一套自由字段。PublishIntent 契约见 [`../../publish-composer/references/base-schema.md` 表 2](../../publish-composer/references/base-schema.md)。

| 字段名 | 飞书字段类型 | 说明 |
|---|---|---|
| `Board (Pinterest)` | 单选 | Pinterest 后台已建好的 board 名；用单选避免拼写漂移 |
| `发布素材` | 多行文本 / URL / 附件 | 每张图的服务器 asset 标识、授权下载 URL 或可由服务器解析的附件引用各占一行，顺序就是 carousel 展示顺序（见下方 § 多素材格式）。不要把本地绝对路径作为浏览器上传源 |
| `image 路径` | 多行文本 | 迁移期旧字段；只用于追溯旧本地处理文件，不作为新架构的发布输入 |
| `Alt Text (EN)` | 多行文本 | 每张图的 alt text 用 `---` 独占一行分隔（见下方 § 多图 alt text 格式）；单图时无分隔符 |
| `图片数量` | 数字 / 公式 | 发布素材数量。手填时由 agent 写入；如用公式，等于 `发布素材` 非空行数量 |
| `封面图` | 单行文本 / URL / 附件 | 第一张发布素材或预览链接，方便人工检查 carousel 首图 |
| `创意主题` | 单行文本 | 一句话描述本条 pin 想表达什么 |
| `备注` | 多行文本 | 节日联动、授权细节，以及 `aiSanitization` 处理记录（模式 C 据此判断发布副本已完成 AI metadata / watermark 清理）等特殊情况 |

## Pinterest 行用到的通用字段（值约定）

| 通用字段 | Pinterest 行的取值约定 |
|---|---|
| `任务 ID`（主键） | 格式 `PIN-{YYYYMMDD}-{3 位序号}`，即旧 `pin_id` |
| `平台` | `Pinterest` |
| `状态` | 草稿 / 待审 / 已批准 / 发布中 / 已发 / 失败 / 跳过 / 手动已发（与 [`base-schema.md` 表 2 状态机](../../publish-composer/references/base-schema.md) 一致；旧 `待发 / 待复核 / 重试` 已废，`待发→已批准`、失败后待人工核对停 `失败`、重试是 `失败→发布中` 的转移而非状态） |
| `自动发布` | 复选框，默认 false。勾选（true）= 授权 ECS dispatch 无人值守发布该行（模式 D）。只在内容审核完、素材已授权时勾——dispatch 到点直发、无逐条人工确认闸。非自动发布行留 false，走模式 C 手动发 |
| `计划发布时间` | 自动发布行的到点闸。**留空 = 尽快发**（服务端把空解析成 0 = 已到点，下一轮 tick 就发）；排期填未来时间（飞书日期时间字段最稳，或文本带时区 ISO `...+08:00`）。**非空但格式解析不了**（自然语言）→ dispatch 跳过不发，等人工改格式 |
| `发布类型` | `单图`（1 张）或 `多图轮播`（2-5 张，Pinterest carousel pin） |
| `关联 SKU` | 关联 `Products 商品` 表；用于追溯 SKU + record_id + `平台商品 ID`（如 Etsy Listing ID / ASIN / item_id）；`链接` 另从 `Products 商品` 表 `分享链接` 读取 |
| `关联素材` | 关联 `Asset Variants 派生素材` 表的 Pinterest 规格变体（**非 canonical 原图**），**允许多值**；单图关联 1 条，轮播关联 2-5 条；发布顺序以 `发布素材` 行顺序为准 |
| `标题` | Pinterest 标题：英文，≤ 100 字符 |
| `描述` | Pinterest 正文：英文，建议 200-500 字符 |
| `链接` | 商品型 pin 必须 = `Products 商品` 表 `分享链接`；不要临时拼平台 listing URL |
| `发布 URL` | 发布成功后的 Pinterest pin URL（旧 `pin_url`） |
| `发布时间` | 状态变 `已发` 时填 |
| `发布尝试次数` | 默认 0；每次 final 失败 +1（旧 `重试次数`） |
| `最后尝试时间` | 每次真实发布 / 重试后更新 |
| `失败原因分类` | 单选，结构化：`会话过期 / 插件未装 / 限速 / DOM漂移 / 平台拒绝 / 网络 / 其他`（与 [`base-schema.md` 表 2 执行状态列](../../publish-composer/references/base-schema.md) 对齐，喂重试与排查） |
| `失败原因` | 原始失败记录的简短原文（截断到 100 字符）；分类走 `失败原因分类` |
| `ECS job ID` / `外部队列 ID` | 后端 publish-service / ECS dispatch 返回的 `jobId`。当前 dispatch 同时接受两套列名：目标态文档名 `ECS job ID`，以及历史运行表名 `外部队列 ID`。两列同时存在时，dispatch 按表结构解析出的同一列读写；新建表优先用 `ECS job ID`，历史表保留 `外部队列 ID` 即可，不需要为了改名迁移数据 |

> 暂不把「同步 Board」列为发布必需字段。当前发布器一次只创建一个 Pinterest Pin，并回写一个 `发布 URL`；如果未来要同一内容同步多个 board，需要给每个发布目标单独记录结果。

---

## 多素材格式

`发布素材` 字段存放所有待发布图片的服务器 asset 标识、授权下载 URL 或可解析附件引用，每行一个，顺序就是 Pinterest carousel 展示顺序：

```
asset://pinterest/PIN-20260626-001/01
asset://pinterest/PIN-20260626-001/02
asset://pinterest/PIN-20260626-001/03
```

单图 pin 时只有一行。

## 多图 alt text 格式

`Alt Text (EN)` 字段存放每张图的独立 alt text，用 `---` 独占一行分隔。段落顺序与 `发布素材` 行顺序一一对应：

```
A pale sage green ceramic teacup on a linen cloth, photographed in soft morning light from above.
---
Close-up of the cup's glazed rim showing the sage green gradient and fine crackle pattern.
---
Three cups arranged on a wooden shelf, each showing a slightly different shade of sage green.
```

单图 pin 时没有 `---` 分隔符，和原来一样是纯文本。

创建服务器 job 时按分隔符拆分，第 N 段 alt text 对应第 N 个发布素材。服务器 job 会保留首段为兼容字段 `altText`，并把完整分段作为 `altTexts` 交给浏览器插件；多素材 job 通过有序 `assetFileTokens` / `assetUrls` 发布轮播。

---

## 服务器 job 目标结构

Hermes 从一行 Pinterest 记录构造服务器工具请求。单图请求体：

```json
{
  "tenantId": "tenant_xxx",
  "title": "The Story Behind Our Handmade Process",
  "description": "...",
  "altText": "Alt text for image 1",
  "board": "Behind the Scenes · Our Studio",
  "link": "https://your-shop.example.com"
}
```

多图轮播请求体在单图字段之外增加：

```json
{
  "tenantId": "tenant_xxx",
  "title": "The Story Behind Our Handmade Process",
  "description": "...",
  "altText": "Alt text for image 1",
  "altTexts": ["Alt text for image 1", "Alt text for image 2"],
  "board": "Behind the Scenes · Our Studio",
  "link": "https://your-shop.example.com",
  "assetFileTokens": ["file_front", "file_side"]
}
```

字段来源：`tenantId` ← 当前租户绑定，`title` ← `标题`，`description` ← `描述`，`altText` ← `Alt Text (EN)` 首段，`altTexts` ← `Alt Text (EN)` 按 `---` 拆分后的完整段落，`board` ← `Board (Pinterest)`，`link` ← `链接`，`assetFileTokens` ← 服务器 asset 流程已授权的有序图片 file token。

素材不是 Hermes 请求体里的本地路径；服务器 job 返回 `assetUrl` / `assetUrls` 给浏览器插件。真实商品素材必须先进入服务器可授权下载的 asset 流程。

校验伪代码：

```js
const assets = publishAssets.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const alts = splitAltTextBySeparator(altText, "---");

assert(assets.length === alts.length);
assert(publishType === "单图" ? assets.length === 1 : assets.length >= 2 && assets.length <= 5);

assert(assetFileTokens.length === assets.length);
```

---

## 视图建议

在 `社媒发布队列` 上为 Pinterest 建以下筛选视图：

- **Pinterest** — `平台 = Pinterest`，按创建时间倒序（Pinterest 行总入口）
- **Pinterest 草稿** — `平台 = Pinterest` 且 `状态 = 草稿`
- **Pinterest 待发** — `平台 = Pinterest` 且 `状态 IN (待审, 已批准)`（模式 C 取候选）
- **Pinterest 自动发布** — `平台 = Pinterest` 且 `自动发布 = true` 且 `状态 IN (已批准, 发布中, 失败)`，按 `计划发布时间` 升序（模式 D 已交给 dispatch 的行；盯这个视图看无人值守发布进度）
- **Pinterest 已发** — `平台 = Pinterest` 且 `状态 IN (已发, 手动已发)`，按发布时间倒序
- **Pinterest 失败** — `平台 = Pinterest` 且 `状态 = 失败`
- **Pinterest 轮播** — `平台 = Pinterest` 且 `发布类型 = 多图轮播`（快速查看所有多图 pin）

---

## 录入约定（模式 B 写入草稿时）

写入前列出字段值清单给用户确认，确认后才用 `lark-base` 写入。草稿组好进 `待审`；`ECS job ID` 在模式 C 创建 job 时写，`发布 URL` / `发布时间` / `失败原因分类` / `失败原因` 等在模式 C 才填。

多图 pin 时额外展示：
- 图片数量和顺序（编号列表）
- 封面图（第一张）
- 每张图的 alt text 对照
- `发布类型 = 多图轮播` 自动设置

## 校验规则（模式 B 写入前自检）

| 校验项 | 不通过时 |
|---|---|
| `关联 SKU` 状态 = 在售 | 中止，先上线 listing |
| `关联素材` 每条变体的源 canonical `公开授权` = 已授权 | 中止（特别是客户 UGC） |
| `关联素材` 每条变体 `目标平台` ⊇ Pinterest | 警告，提示去 assets-library 加规格/标签 |
| `标题` ≤ 100 字符 | 让用户改 |
| `描述` 非空 | 中止，模式 D 不会替缺失描述生成文案 |
| `发布素材` 每行都能被服务器解析为授权下载 asset | 中止，先补服务器 asset 流程 |
| `备注` 含 `aiSanitization` 记录 | 中止，先按 `image-processing.md` 生成发布副本 |
| `发布素材` 行数 = `关联素材` 记录数 | 中止，发布素材和素材来源不一致 |
| `Alt Text (EN)` 按 `---` 拆分后段数 = 图片数 | 中止，alt text 数量和图片不一致 |
| `发布类型 = 单图` 时图片数 = 1 | 中止，单图记录只能有一张图 |
| `发布类型 = 多图轮播` 时图片数 2-5 张 | 中止，Pinterest carousel 限制 2-5 张 |
| 同一 SKU + 同一素材组合未发布过 | 警告（重复发同图容易被限流） |
