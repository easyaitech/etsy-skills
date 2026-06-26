---
name: xiaohongshu-autopost
description: 把电商商品 + 素材库 + 品牌底座组装成小红书笔记（图文 / 视频），并作为 social-publisher 的小红书 adapter，通过 yanggedianzhang 服务器控制面 + 租户浏览器插件发布。Hermes 只负责判断、生成中文文案、调用服务器工具接口，不持有 Chrome profile、不跑 Playwright、不维护发布队列。三种触发：(1) "接小红书 / 配置小红书自动发 / 建小红书笔记流水线"——接通服务器工具 + 浏览器插件小红书 capability + 店铺总 Base 内 `社媒发布队列` 表；(2) "给 SKU 出小红书笔记 / 写小红书文案 / 排一条小红书笔记"——读 BRAND + `Products 商品` 表 + `Asset Variants 派生素材` 表，组装一条 `社媒发布队列`（平台=小红书）记录，平台专属字段走 `XiaohongshuExt` typed schema；(3) "发小红书 / 测试笔记 / publish"——adapter 已 enabled：创建 test job → 用户目视确认 → confirm-publish 转 final → 回写公开笔记 URL（流程见 references/publishing-flow.md）；若该租户插件未装 / 缺 capability 则运行时降级人工发布清单。每次只处理一条。
layer: application
depends-on: [shop-foundation, listing-catalog, assets-library]
---

# Xiaohongshu AutoPost（小红书笔记发布适配器）

这个 skill 把电商店铺的「商品 + 素材 + 品牌」组装成**小红书笔记**（图文笔记 / 视频笔记），并作为 `social-publisher` 的**小红书输出适配器**。它和 `pinterest-autopin` 是同一套三层范式的兄弟 adapter：

1. **Hermes**：读商品、派生变体、品牌规则，生成中文 title / 正文 / 话题 / 封面文案，组装 `平台 = 小红书` 的 PublishIntent，调用服务器工具接口。
2. **yanggedianzhang 服务器**：校验租户、保存小红书 job 状态、加锁、发放素材下载地址、**热下发小红书笔记 recipe**、记录 test / final 结果。
3. **租户浏览器插件**：在租户自己的小红书登录态里打开发布页、按服务器下发的 recipe 填表上传、回传结果。

跨平台 `社媒发布队列` 的 source of truth 在 `publish-composer`；本 skill 只负责 `平台 = 小红书` 行的语义准备、服务器 job 创建和结果回写。

> **架构定位**：本 skill 是「平台层」的小红书适配器。平台专属字段走 PublishIntent 的 `平台扩展 (typed)` —— `XiaohongshuExt` schema + validator（定义见 [`../publish-composer/references/base-schema.md` § 表 2](../publish-composer/references/base-schema.md)），**不是自由 JSON**。底层执行模型见 [`../shared/tools-architecture.md`](../shared/tools-architecture.md) 与 design doc 的 D-A4（插件稳定原语 + 服务端热下发 recipe）。

> 共享引导见 [`../shared/preamble.md`](../shared/preamble.md)，降级协议见 [`../shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 执行就绪状态（enabled）

**小红书真实自动发布已启用**——后端三件就绪：服务器工具 `/api/tools/xiaohongshu/jobs`（+ `/confirm-publish`）、浏览器插件 `xiaohongshu` capability、服务端热下发笔记 recipe。Mode C 走真实 test → 用户目视确认 → confirm-publish → final 流程（与 Pinterest 同形），完整契约见 [`references/publishing-flow.md`](references/publishing-flow.md)。

**运行时仍可能降级**（不是设计缺位，是租户态）：某租户插件没装 / 版本低 / 没 `xiaohongshu` capability 时，服务器返回 `BROWSER_TOOL_INSTALL/UPGRADE_REQUIRED`，本 skill 把 `userMessage` 原样转述 + 降级人工发布清单——不是"未启用"，是该租户先装插件。

---

## 前置就绪检查（Mode B / C 入口守卫）

触发 Mode B / C 时，执行业务逻辑前**静默**按序检查，任一失败即停并按话术回复：

| # | 检查项 | 怎么检查 | 失败时怎么说 |
|---|--------|----------|-------------|
| 1 | `社媒发布队列` 表已存在 | 读 `<workspace>/docs/store-base.md` 确认店铺总 Base 有 `publishing_queue` | 「`社媒发布队列` 还没建。小红书笔记就是这张表 `平台 = 小红书` 的行，要现在建吗？」 |
| 2 | `BRAND_MARKETING.md` + `MARKETING_PLATFORM.md` 存在 | 检查工作区根 | 「营销 / 平台内容策略底座还没建，要用 shop-foundation 建吗？」 |
| 3 | 小红书平台规则可读 | 读 [`../listing-catalog/references/platforms/xiaohongshu.md`](../listing-catalog/references/platforms/xiaohongshu.md)（商品结构）+ MARKETING_PLATFORM.md 的小红书笔记规范 | 「小红书内容规范缺失，先在 MARKETING_PLATFORM.md 补小红书笔记规则。」 |
| 4 | 〔仅 Mode C〕该租户插件就绪 | 创建 job 时若返回 `BROWSER_TOOL_INSTALL_REQUIRED` / `BROWSER_TOOL_UPGRADE_REQUIRED`（该租户没装插件 / 版本低 / 缺 `xiaohongshu` capability）；`HERMES_TOOL_DISABLED` / `UNAUTHORIZED` = 管理员侧未配置 | 前者转述服务器 `userMessage`（装 / 升级插件）+ 降级人工清单；后者停下提示管理员配置。功能本身已 enabled，这是租户态检查 |

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

### 模式 A：接入小红书适配器
进入：用户「接小红书 / 配置小红书自动发」。
步骤：① 定位店铺总 Base + `社媒发布队列` 表；② 确认 `XiaohongshuExt` 字段已在队列表 `平台扩展 (typed)` 列约定（note_type / topic_tags / cover_caption / related_item_id）；③ 确认该租户插件带 `xiaohongshu` capability（创建 job 时按 references/publishing-flow.md 的错误码判，未装则转述安装提示）；④ adapter 全局已 enabled（见 adapter-registry）；⑤ 不创建任何真实定时任务，除非用户明确要求。

### 模式 B：组装小红书笔记 PublishIntent（每次一条）
进入：用户「给 {SKU} 出小红书笔记 / 写小红书文案 / 排一条」。
步骤：
1. 读依赖（BRAND/MARKETING + 商品行 + 变体）。
2. 判定 `note_type`（图文笔记 / 视频笔记）。
3. 取小红书规格发布副本：查 `Asset Variants 派生素材` 表该 SKU `目标平台 ⊇ 小红书` 的变体；**缺 → 反向请求 assets-library 模式 E** 派生 3:4 封面 / 商品图（机械/模板化派生），拿回变体文件链接。
4. 生成中文文案：`标题` / `正文` / `话题标签`（topic_tags）/ `封面文案`（cover_caption，封面可读性关键）。
5. 填 `平台扩展 (typed)` = `XiaohongshuExt{ note_type, topic_tags[], cover_caption, related_item_id? }`，**过 validator**，不写 schema 外字段；不确定的留空标 `待后台确认`。
6. 商品型笔记 `链接` 从 `Products 商品.分享链接` 读；缺则留空标待补，不拼小红书商品 URL。
7. 组一条 `社媒发布队列`（`平台 = 小红书`，`任务 ID = XHS-YYYYMMDD-001`，状态 = `草稿`）；素材顺序显式写；封面素材指定。
8. 列字段值给用户确认后写入（写入前硬约束）。状态进 `待审`。

### 模式 C：发布（enabled）
进入：用户「发小红书 / 测试 / publish」。**完整执行手册见 [`references/publishing-flow.md`](references/publishing-flow.md)**（[0] 校验 → [1] 创建 test job → [2] 插件 test 填表 → [3] 用户目视确认 → [5] confirm-publish → [6] 回写）。
- **正常路径**：`POST /api/tools/xiaohongshu/jobs` 建 test job → 展示给用户确认小红书发布页（封面 / 图序 / 文案 / 话题）→ 用户说"发" → `POST /api/tools/xiaohongshu/jobs/confirm-publish` 转 final → 插件回传公开笔记 URL → 回写 `发布 URL` + `平台 post id` + `发布时间`，状态 `发布中→已发`。素材先变服务器可授权下载的 asset，插件按服务端 recipe 上传，不传本地绝对路径。
- **运行时降级**：服务器返回 `BROWSER_TOOL_INSTALL/UPGRADE_REQUIRED`（该租户插件没装 / 缺 capability）→ 转述 `userMessage` + 出**人工发布清单**，用户手动发后回填公开 URL，状态 `手动已发`。test 没过不进 final。

---

## 写入前的硬性约束

- **Hermes 不直接读浏览器登录态、不点击小红书、不存 cookie / token / 密码、不传本地绝对图片路径**给浏览器。素材先变服务器可授权下载的 asset，插件再拉取上传。
- 队列写入前列字段值清单 → 用户确认 → 写（lark-base）。
- 一条记录 = 一个平台一次发布（per-platform 语义）；失败重发 = 同条 attempt++，不新建。
- 平台专属字段**只走** `XiaohongshuExt` typed schema，不塞自由 JSON、不编造后台字段。
- 不自己裁切 / 清理图片——发布副本由 assets-library 模式 E 派生；本 skill 只引用变体链接。
- 未就绪不声称自动发布；登录 / 凭据红线同 pinterest-autopin。

---

## 与其他 skill 的协作

- **publish-composer / social-publisher**：跨平台队列 source of truth 在 composer；本 skill 只读写 `平台 = 小红书` 行 + 作为 dispatch 路由到的小红书 adapter。dispatch 在 `已批准→发布中` 前按本 adapter 的 capability 校验。
- **assets-library**：模式 E 派生小红书规格变体（3:4 封面 / 商品图）；本 skill 只引用，不自己裁切清理。
- **listing-catalog**：商品事实 + `分享链接` + 小红书商品 ID；商品型笔记链接来源。
- **pinterest-autopin**：兄弟 adapter，同三层范式 + 同 PublishIntent 契约；新增字段 / 能力时对齐两边。

---

## 工作语言

通用规则见 [`../shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：小红书笔记文案默认**中文**（标题 / 正文 / 话题）；`任务 ID` 等结构化标识用英文（`XHS-YYYYMMDD-001`）。
