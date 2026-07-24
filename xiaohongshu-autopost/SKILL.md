---
name: xiaohongshu-autopost
description: 小红书笔记发布 adapter，当前**封存（shelved，产品决策 2026-07-24：现阶段专注 Etsy，小红书不对用户开放）**。用户提出任何小红书相关请求（"接小红书 / 配置小红书自动发 / 建小红书笔记流水线"、"给 SKU 出小红书笔记 / 写小红书文案 / 排一条小红书笔记"、"发小红书 / 测试笔记 / publish 小红书"）时，触发本 skill 只为**统一说明封存边界并引导回 Etsy**：告知"当前版本专注 Etsy，小红书功能暂未开放，请等后续版本"，不组草稿、不建发布队列行、不创建 server publish job、不出人工发布清单。后端配套已用 XHS_PLATFORM_ENABLED 开关封存（默认关，XHS 端点返回 410）。本 adapter 的组笔记 / 三层范式 / 发布契约文档原样保留供未来版本解封复用（解封需产品侧批准 + 后端开关 + adapter-registry 改 enabled）。
layer: application
depends-on: [shop-foundation, listing-catalog, assets-library]
---

# Xiaohongshu AutoPost（小红书笔记发布适配器）

> # ⛔ 封存总闸（shelved — 产品决策 2026-07-24：现阶段专注 Etsy，小红书不对用户开放）
>
> **收到任何小红书相关请求（接小红书 / 建小红书笔记流水线 / 给 SKU 出小红书笔记 / 写小红书文案 / 排一条小红书笔记 / 发小红书 / 测试笔记 / publish 小红书），一律只回复：「当前版本专注 Etsy，小红书功能暂未开放，请等后续版本」，并把话题引导回 Etsy 经营，然后 STOP。**
>
> **禁止继续读取或执行本文件下方任何内容**——不进入任何模式（A / B / C）、不跑就绪检查表、不组草稿、不建 `社媒发布队列` 行、不创建 server publish job、不出人工发布清单、不反向请求派生变体。
>
> 本闸的判据（fail-closed）：[`../social-publisher/references/adapter-registry.md`](../social-publisher/references/adapter-registry.md) 小红书状态 = `封存 shelved`——**只要 != `enabled` 就一律封存**。后端配套已用 `XHS_PLATFORM_ENABLED` 开关封存（默认关，四个 XHS 端点返回 `410`）。
>
> **下方全部章节（Mode A / B / C、就绪检查表、依赖关系、写入约束、协作、工作语言）均为「未来解封资料，封存期禁止执行」**，原样保留供未来版本解封复用；解封需走 §执行就绪状态 的完整验收清单（不是一处开关）。

这个 skill 把电商店铺的「商品 + 素材 + 品牌」组装成**小红书笔记**（图文笔记 / 视频笔记），并作为 `social-publisher` 的**小红书输出适配器**。它和 `pinterest-autopin` 是同一套三层范式的兄弟 adapter——三层架构（Hermes 大脑 / yanggedianzhang 服务器控制面 / 租户浏览器插件）、job 生命周期与队列表模型见 [`../shared/social-adapter-paradigm.md`](../shared/social-adapter-paradigm.md)。小红书侧的差异（**均为解封后行为，封存期不执行**）：Hermes 产出**中文** title / 正文 / 话题 / 封面文案，组 `平台 = 小红书` 的草稿和人工发布清单；服务器能力解封后才建 job 并**热下发小红书笔记 recipe**；插件解封后才按 recipe 在租户自己的小红书登录态里填表上传、回传结果。

跨平台 `社媒发布队列` 的 source of truth 在 `publish-composer`；本 skill 解封后才负责 `平台 = 小红书` 行的语义准备、服务器 job 创建和结果回写。**封存期一律不碰**。

> **架构定位**：本 skill 是「平台层」的小红书适配器。小红书当前**封存（shelved）**未对外开放，不在 `社媒发布队列` 建任何平台专属列；解封后才按真实发布器读取需求补 `平台扩展 (typed)` / `XiaohongshuExt` 或显式字段。底层执行模型见 [`../shared/tools-architecture.md`](../shared/tools-architecture.md) 与 design doc 的 D-A4（插件稳定原语 + 服务端热下发 recipe）。

> 共享引导见 [`../shared/preamble.md`](../shared/preamble.md)，降级协议见 [`../shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## ⛔ 执行就绪状态（封存 shelved — 产品决策 2026-07-24：现阶段专注 Etsy，小红书不对用户开放）

**小红书业务已整体封存，本 adapter 现阶段不对用户提供任何小红书能力。** 产品侧（2026-07-24）决定当前版本只做 Etsy，小红书连组草稿都不做——用户要小红书相关帮助时，说明「当前版本专注 Etsy，小红书功能暂未开放，请等后续版本」并引导回 Etsy 经营，不进入本 skill 的任何模式。

后端配套已用 `XHS_PLATFORM_ENABLED` 开关封存（默认关，四个 XHS 端点返回 `410 XHS_PLATFORM_SUSPENDED`）；本 adapter 文档与流程契约**原样保留**，供未来版本重新启用时直接复用，不删。

**未来解封验收清单（不是一处开关，需逐项完成）**：

1. **产品负责人批准**：明确决定小红书对用户开放，撤销「专注 Etsy」的封存决策。
2. **后端负责人设 `XHS_PLATFORM_ENABLED=1`**：四个 XHS 端点当前封存返回 `410 XHS_PLATFORM_SUSPENDED`，解封后恢复 `200` 正常契约。
3. **技能仓改动（逐文件）**：
   - 恢复本 SKILL.md frontmatter `description` 的动作语义（去掉「只说明封存边界」，改回「组草稿 / 建队列行 / test → confirm-publish」）；
   - 删掉本文件顶部的 ⛔ 封存总闸、本节封存说明、以及下方各章节入口的封存守卫；
   - [`../social-publisher/references/adapter-registry.md`](../social-publisher/references/adapter-registry.md)：小红书行状态改 `enabled`、路由树去掉 `shelved` 分支、eval #3 期望改为真实路由；
   - `social-publisher/SKILL.md`、`publish-composer/SKILL.md` 各处把小红书从 `封存 shelved` 改回 `enabled` 可组草稿 / 可路由；
   - `shared/platform-config.md`、`shared/dependency-protocol.md`、`shared/social-adapter-paradigm.md`、`references/publishing-flow.md`、`publish-composer/references/platform-publishing-model.md`、`publish-composer/references/base-schema.md` 各处 `封存 shelved` → `enabled`。
4. **验收**：仓库内 `grep -rn "封存\|shelved\|staged" --include="*.md"` 不再残留小红书封存 / staged 冲突表述；跑一条 SKU 端到端 test → confirm-publish → final 走通。

解封前，下面这段是**未来态说明、当前不适用**：

> （未来态，封存期不执行）后端三件已就绪（服务器工具 `/api/tools/xiaohongshu/jobs` + `/confirm-publish`、插件 `xiaohongshu` capability、服务端热下发笔记 recipe），发布契约见 [`references/publishing-flow.md`](references/publishing-flow.md)。解封后本 skill 能做：组装 `平台 = 小红书` 的 PublishIntent 草稿和人工发布清单（专属字段先留草稿文本，不默认扩表）；反向请求 assets-library 模式 E 派生小红书规格变体（3:4 封面 / 商品图）；出人工发布清单供用户手动发布后回填公开笔记 URL 对账。`references/publishing-flow.md` 的 test → confirm-publish → final 是 adapter-registry 改 `enabled` 后才走的真实路径。

---

## 🔒 以下为未来解封资料 —— 封存期禁止执行

**本行以下所有章节（前置就绪检查、依赖关系、三种执行模式、写入约束、协作、工作语言）都是未来解封后才生效的资料。封存期（adapter-registry 小红书 != `enabled`）一律不执行**——收到小红书请求只按顶部 ⛔ 封存总闸回复并 STOP，不得进入下面任何步骤。保留在此仅供未来解封复用。

---

## 前置就绪检查（Mode B / C 入口守卫）

> （封存期本章不执行，见顶部封存总闸——小红书 != `enabled` 时不进 Mode B / C，直接按封存话术回复并 STOP。以下为解封后资料。）

触发 Mode B / C 时，执行业务逻辑前**静默**按序检查，任一失败即停并按话术回复：

| # | 检查项 | 怎么检查 | 失败时怎么说 |
|---|--------|----------|-------------|
| 1 | `社媒发布队列` 表已存在 | 读 `<workspace>/docs/store-base.md` 确认店铺总 Base 有 `publishing_queue` | 「`社媒发布队列` 还没建。小红书笔记就是这张表 `平台 = 小红书` 的行，要现在建吗？」 |
| 2 | `BRAND_MARKETING.md` + `MARKETING_PLATFORM.md` 存在 | 检查工作区根 | 「营销 / 平台内容策略底座还没建，要用 shop-foundation 建吗？」 |
| 3 | 小红书平台规则可读 | 读 [`../listing-catalog/references/platforms/xiaohongshu.md`](../listing-catalog/references/platforms/xiaohongshu.md)（商品结构）+ MARKETING_PLATFORM.md 的小红书笔记规范 | 「小红书内容规范缺失，先在 MARKETING_PLATFORM.md 补小红书笔记规则。」 |
| 4 | 〔仅 Mode C〕adapter 是否已对外开放 | 读 [`../social-publisher/references/adapter-registry.md`](../social-publisher/references/adapter-registry.md) 小红书行状态 | 当前 = `封存 shelved`：**封存期本章整段不执行**（连草稿 / 人工发布清单都不出，按顶部封存总闸回复并 STOP）。解封改 `enabled` 后才按 publishing-flow.md 真发（届时 #4 改为校验该租户插件 capability） |

---

## 依赖关系（每次组笔记 / 发笔记前必读）

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` § 语调 / 视觉禁区 | 中文语调 + 视觉禁区 | 文案语气 + 封面合规 |
| `<workspace>/BRAND_MARKETING.md` / `MARKETING_PLATFORM.md` | 小红书内容策略 / 笔记规范 / 话题策略 | 决定 note_type、话题、封面文案方向 |
| `Products 商品` 表该 SKU 行 | title / 品类 / 卖点 / `分享链接` / 小红书商品 ID | 文案锚点；商品型笔记的 `链接` 必须来自 `分享链接`，不拼 |
| **`Asset Variants 派生素材` 表** | 小红书规格发布副本（3:4 封面 / 商品图，已清理） | 笔记图只引用变体文件链接；**缺变体 → 反向请求 assets-library 模式 E 派生**，不自己裁切 |
| `../listing-catalog/references/platforms/xiaohongshu.md` | 小红书商品图比例（1:1 / 3:4）等 | 变体规格依据 |

**降级**：BRAND/MARKETING 缺失 → 文案输出 `⚠️ 底座未建` 占位 + 提示回 shop-foundation；变体缺失 → 走模式 E 派生，不阻塞到无法出草稿。

---

## 三种执行模式

> （封存期以下三种模式均不执行，见顶部封存总闸——小红书 != `enabled` 时任何模式都不进，按封存话术回复并 STOP。以下为解封后资料。）

### 模式 A：接入小红书适配器
> （封存期本章不执行，见顶部封存总闸。以下为解封后资料。）

进入：用户「接小红书 / 配置小红书自动发」。
步骤：① 定位店铺总 Base + `社媒发布队列` 表；② adapter 未 `enabled` 前（未对外开放），不新增小红书专属字段、不创建真实定时任务；③ 对外放行后才确认该租户插件带 `xiaohongshu` capability，并按真实读取需求补 `XiaohongshuExt` / `平台扩展 (typed)`。

### 模式 B：组装小红书笔记 PublishIntent（每次一条）
> （封存期本章不执行，见顶部封存总闸——小红书 != `enabled` 时不组草稿、不建队列行，按封存话术回复并 STOP。以下为解封后资料。）

进入：用户「给 {SKU} 出小红书笔记 / 写小红书文案 / 排一条」。
步骤：
1. 读依赖（BRAND/MARKETING + 商品行 + 变体）。
2. 判定 `note_type`（图文笔记 / 视频笔记）。
3. 取小红书规格发布副本：查 `Asset Variants 派生素材` 表该 SKU `目标平台 ⊇ 小红书` 的变体；**缺 → 反向请求 assets-library 模式 E** 派生 3:4 封面 / 商品图（机械/模板化派生），拿回变体文件链接。
4. 生成中文文案：`标题` / `正文` / `话题标签`（topic_tags）/ `封面文案`（cover_caption，封面可读性关键）。
5. 小红书未 `enabled` 期间，把 `note_type` / `topic_tags` / `cover_caption` / `related_item_id?` 放在人工发布清单里；不默认写 `平台扩展 (typed)`。对外放行后再按 `XiaohongshuExt` validator 写结构化字段。
6. 商品型笔记 `链接` 从 `Products 商品.分享链接` 读；缺则留空标待补，不拼小红书商品 URL。
7. 组一条 `社媒发布队列`（`平台 = 小红书`，`任务 ID = XHS-YYYYMMDD-001`，状态 = `草稿`）；素材顺序和封面在草稿/人工清单里显式展示，只有真实发布器读取时才补 `素材顺序` / `封面素材` 字段。
8. 列字段值给用户确认后写入（写入前硬约束）。状态进 `待审`。

### 模式 C：发布（解封后 test → confirm-publish → final）
> （封存期本章不执行，见顶部封存总闸——小红书 != `enabled` 时**连人工发布清单都不出**，按封存话术回复并 STOP。以下为解封后资料。）

进入：用户「发小红书 / 测试 / publish」。
- **解封后（adapter-registry 小红书 = `enabled`）**：走 [`references/publishing-flow.md`](references/publishing-flow.md) 的真实路径（[1] `POST /api/tools/xiaohongshu/jobs` 建 test job → [3] 用户目视确认 → [5] `confirm-publish` 转 final → [6] 回写公开笔记 URL + `平台 post id` + 状态 `发布中→已发`）。该路径契约已就绪。
- **封存期**：小红书 != `enabled`，本章整段不执行；不创建真实 server publish job、不出人工发布清单，按顶部封存总闸回复并 STOP。

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束，**Base 写穿不变量**见 [`../shared/store-base-architecture.md`](../shared/store-base-architecture.md)（改动没真正写进 Base 不算完成，落库与确认同 turn 收口，写完带回执含飞书链接）。本 skill 特有禁区：

- **Hermes 不直接读浏览器登录态、不点击小红书、不存 cookie / token / 密码、不传本地绝对图片路径**给浏览器。素材先变服务器可授权下载的 asset，插件再拉取上传。
- 队列写入前列字段值清单 → 用户确认 → 写（lark-base）→ **回执必须含一条可点击的飞书 Base 链接**（优先深链到 `社媒发布队列` 改动的那张表 / 行，按 §Base 写穿不变量的链接构造配方拼）；不要只在对话里报写入而不写 Base。
- 一条记录 = 一个平台一次发布（per-platform 语义）；失败重发 = 同条 attempt++，不新建。
- 平台专属字段在未 `enabled` 期间只进人工清单；对外放行后只走 `XiaohongshuExt` typed schema，不塞自由 JSON、不编造后台字段。
- 不自己裁切 / 清理图片——发布副本由 assets-library 模式 E 派生；本 skill 只引用变体链接。
- 未就绪不声称自动发布；登录 / 凭据红线同 pinterest-autopin。

---

## 与其他 skill 的协作

- **publish-composer / social-publisher**：跨平台队列 source of truth 在 composer；本 skill 只读写 `平台 = 小红书` 行 + 作为 dispatch 路由到的小红书 adapter。dispatch 在 `已批准→发布中` 前按本 adapter 的 capability 校验。
- **assets-library**：模式 E 派生小红书规格变体（3:4 封面 / 商品图）；本 skill 只引用，不自己裁切清理。
- **listing-catalog**：商品事实 + `分享链接` + 小红书商品 ID；商品型笔记链接来源。
- **pinterest-autopin**：兄弟 adapter，同三层范式 + 同 PublishIntent 契约（共享骨架见 [`../shared/social-adapter-paradigm.md`](../shared/social-adapter-paradigm.md)）；新增字段 / 能力时对齐两边。

---

## 工作语言

通用规则见 [`../shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：小红书笔记文案默认**中文**（标题 / 正文 / 话题）；`任务 ID` 等结构化标识用英文（`XHS-YYYYMMDD-001`）。
