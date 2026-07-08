---
name: xiaohongshu-autopost
description: 把电商商品 + 素材库 + 品牌底座组装成小红书笔记（图文 / 视频），并作为 social-publisher 的小红书 adapter。当前小红书 adapter **staged（后端就绪但未对外开放）**：Hermes 只负责判断、生成中文文案、组草稿和人工发布清单，不持 Chrome profile、不跑 Playwright、不维护发布队列、不创建真实 server publish job。三种触发：(1) "接小红书 / 配置小红书自动发 / 建小红书笔记流水线"——定位店铺总 Base 内 `社媒发布队列` 表并说明 staged 边界；(2) "给 SKU 出小红书笔记 / 写小红书文案 / 排一条小红书笔记"——读 BRAND + `Products 商品` 表 + `Asset Variants 派生素材` 表，组装一条 `社媒发布队列`（平台=小红书）草稿，专属字段先进入人工发布清单，不默认扩 `XiaohongshuExt` / typed JSON；(3) "发小红书 / 测试笔记 / publish"——当前只出草稿 + 人工发布清单；对外放行（adapter-registry 改 enabled）后才走真发 test → confirm-publish → final（契约见 references/publishing-flow.md）。每次只处理一条。
layer: application
depends-on: [shop-foundation, listing-catalog, assets-library]
---

# Xiaohongshu AutoPost（小红书笔记发布适配器）

这个 skill 把电商店铺的「商品 + 素材 + 品牌」组装成**小红书笔记**（图文笔记 / 视频笔记），并作为 `social-publisher` 的**小红书输出适配器**。它和 `pinterest-autopin` 是同一套三层范式的兄弟 adapter：

1. **Hermes**：读商品、派生变体、品牌规则，生成中文 title / 正文 / 话题 / 封面文案；当前只组 `平台 = 小红书` 的草稿和人工发布清单。
2. **yanggedianzhang 服务器**：后端能力 staged 待放行；放行后才校验租户、保存小红书 job 状态、加锁、发放素材下载地址、热下发小红书笔记 recipe、记录 test / final 结果。
3. **租户浏览器插件**：对外放行后，在租户自己的小红书登录态里打开发布页、按服务器下发的 recipe 填表上传、回传结果。

跨平台 `社媒发布队列` 的 source of truth 在 `publish-composer`；本 skill 当前只负责 `平台 = 小红书` 行的语义准备和人工发布清单。对外放行后才负责服务器 job 创建和结果回写。

> **架构定位**：本 skill 是「平台层」的小红书适配器。小红书当前 staged 未对外开放，默认不在 `社媒发布队列` 额外建平台专属列；对外放行后，才按真实发布器读取需求补 `平台扩展 (typed)` / `XiaohongshuExt` 或显式字段。底层执行模型见 [`../shared/tools-architecture.md`](../shared/tools-architecture.md) 与 design doc 的 D-A4（插件稳定原语 + 服务端热下发 recipe）。

> 共享引导见 [`../shared/preamble.md`](../shared/preamble.md)，降级协议见 [`../shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## ⚠️ 执行就绪状态（staged — 后端就绪，**未对外开放**）

**小红书真实自动发布尚未对外开放。** 后端三件已就绪（服务器工具 `/api/tools/xiaohongshu/jobs` + `/confirm-publish`、插件 `xiaohongshu` capability、服务端热下发笔记 recipe），发布契约也写好了（见 [`references/publishing-flow.md`](references/publishing-flow.md）），**但还没上线放行**。所以现在本 skill 能做的是：

- ✅ 组装 `平台 = 小红书` 的 PublishIntent 草稿和人工发布清单；专属字段先留在草稿文本里，不默认扩表
- ✅ 反向请求 assets-library 模式 E 派生小红书规格变体（3:4 封面 / 商品图）
- ✅ 出**人工发布清单**，用户手动发布后回填公开笔记 URL 对账
- ❌ **不得**创建真实 server publish job、不得对真实租户跑真发、不得声称已自动发布

`references/publishing-flow.md` 里的 test → confirm-publish → final 流程是**对外放行后**才走的真实路径，现在只读不跑。**放行**（产品侧明确批准对外开放）后，把 [`../social-publisher/references/adapter-registry.md`](../social-publisher/references/adapter-registry.md) 小红书行改 `enabled`，Mode C 才解锁真发。

---

## 前置就绪检查（Mode B / C 入口守卫）

触发 Mode B / C 时，执行业务逻辑前**静默**按序检查，任一失败即停并按话术回复：

| # | 检查项 | 怎么检查 | 失败时怎么说 |
|---|--------|----------|-------------|
| 1 | `社媒发布队列` 表已存在 | 读 `<workspace>/docs/store-base.md` 确认店铺总 Base 有 `publishing_queue` | 「`社媒发布队列` 还没建。小红书笔记就是这张表 `平台 = 小红书` 的行，要现在建吗？」 |
| 2 | `BRAND_MARKETING.md` + `MARKETING_PLATFORM.md` 存在 | 检查工作区根 | 「营销 / 平台内容策略底座还没建，要用 shop-foundation 建吗？」 |
| 3 | 小红书平台规则可读 | 读 [`../listing-catalog/references/platforms/xiaohongshu.md`](../listing-catalog/references/platforms/xiaohongshu.md)（商品结构）+ MARKETING_PLATFORM.md 的小红书笔记规范 | 「小红书内容规范缺失，先在 MARKETING_PLATFORM.md 补小红书笔记规则。」 |
| 4 | 〔仅 Mode C〕adapter 是否已对外开放 | 读 [`../social-publisher/references/adapter-registry.md`](../social-publisher/references/adapter-registry.md) 小红书行状态 | 当前 = `staged（未对外开放）`：Mode C 只出草稿 + 人工发布清单，**不创建真实 server job**。放行改 `enabled` 后才按 publishing-flow.md 真发（届时 #4 改为校验该租户插件 capability） |

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
步骤：① 定位店铺总 Base + `社媒发布队列` 表；② adapter 当前 **staged（未对外开放）**，不新增小红书专属字段、不创建真实定时任务；③ 对外放行后才确认该租户插件带 `xiaohongshu` capability，并按真实读取需求补 `XiaohongshuExt` / `平台扩展 (typed)`。

### 模式 B：组装小红书笔记 PublishIntent（每次一条）
进入：用户「给 {SKU} 出小红书笔记 / 写小红书文案 / 排一条」。
步骤：
1. 读依赖（BRAND/MARKETING + 商品行 + 变体）。
2. 判定 `note_type`（图文笔记 / 视频笔记）。
3. 取小红书规格发布副本：查 `Asset Variants 派生素材` 表该 SKU `目标平台 ⊇ 小红书` 的变体；**缺 → 反向请求 assets-library 模式 E** 派生 3:4 封面 / 商品图（机械/模板化派生），拿回变体文件链接。
4. 生成中文文案：`标题` / `正文` / `话题标签`（topic_tags）/ `封面文案`（cover_caption，封面可读性关键）。
5. 小红书 staged 期间，把 `note_type` / `topic_tags` / `cover_caption` / `related_item_id?` 放在人工发布清单里；不默认写 `平台扩展 (typed)`。对外放行后再按 `XiaohongshuExt` validator 写结构化字段。
6. 商品型笔记 `链接` 从 `Products 商品.分享链接` 读；缺则留空标待补，不拼小红书商品 URL。
7. 组一条 `社媒发布队列`（`平台 = 小红书`，`任务 ID = XHS-YYYYMMDD-001`，状态 = `草稿`）；素材顺序和封面在草稿/人工清单里显式展示，只有真实发布器读取时才补 `素材顺序` / `封面素材` 字段。
8. 列字段值给用户确认后写入（写入前硬约束）。状态进 `待审`。

### 模式 C：发布（staged — 当前只走草稿 + 人工清单）
进入：用户「发小红书 / 测试 / publish」。
- **当前（未对外开放）**：**不创建真实 server publish job**。输出**人工发布清单**（封面 + 图序 + 标题 + 正文 + 话题 + 链接），用户手动发布后回填公开笔记 URL，状态 → `手动已发`。不声称自动发布。
- **对外放行后**：adapter-registry 小红书改 `enabled` 后，走 [`references/publishing-flow.md`](references/publishing-flow.md) 的真实路径（[1] `POST /api/tools/xiaohongshu/jobs` 建 test job → [3] 用户目视确认 → [5] `confirm-publish` 转 final → [6] 回写公开笔记 URL + `平台 post id` + 状态 `发布中→已发`）。该路径契约已就绪，**现在只读不跑**。

---

## 写入前的硬性约束

- **Hermes 不直接读浏览器登录态、不点击小红书、不存 cookie / token / 密码、不传本地绝对图片路径**给浏览器。素材先变服务器可授权下载的 asset，插件再拉取上传。
- 队列写入前列字段值清单 → 用户确认 → 写（lark-base）。
- 一条记录 = 一个平台一次发布（per-platform 语义）；失败重发 = 同条 attempt++，不新建。
- 平台专属字段在 staged 期间只进人工清单；对外放行后只走 `XiaohongshuExt` typed schema，不塞自由 JSON、不编造后台字段。
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
