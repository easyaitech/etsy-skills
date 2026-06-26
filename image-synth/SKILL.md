---
name: image-synth
description: 调中心后端生图服务(GPT Image 2 via OpenRouter)把"图片需求 + 商品实拍图"合成成 1 张成品图，专攻电商图与社媒图。三种触发：(1) 模式 A 电商图：用户提到"出 listing 主图 / 生成 hero 图 / AI 合成 lifestyle / 出详情图 / 替换背景做场景图 / 不去拍直接合成 / 给 SKU 出图 / 小红书商品图"等请求时——按 COMMERCE_PLATFORM.md 的目标销售平台媒体规则出图；Etsy 走内置槽位语义，小红书走内置商品图 / 详情图规则，QA 检查商品形态保持 + 文字可读性 + 平台主图规范；(2) 模式 B 社媒图：用户提到"出 Pinterest pin / 做 Instagram 图 / 出 Story / 节日营销图 / 社媒分享图 / 群发图 / banner"等请求时——按目标内容平台尺寸出图，QA 仅检查文字可读性；(3) 反向触发：assets-library 模式 D 出 brief 后选"不拍直接合成" / pinterest-autopin 候选池空 / listing-catalog 缺图。严格出 1 张，落 `<workspace>/.cache/image-synth/ai_raw/`，QA 不通过自动调 prompt 重试 ≤ 2 次；用户三选一（入库走 assets-library promote / 留 ai_raw / 丢弃）。严格遵守 BRAND.md 视觉禁区（如存在）。
layer: application
depends-on: [shop-foundation, listing-catalog, assets-library]
---

# Image Synth (AI 图片合成)

把"详细图片需求 + 商品实拍图"经**中心后端生图服务**(GPT Image 2 / OpenRouter)合成成 1 张成品图。专攻**电商图**（目标销售平台商品页图 / listing 槽位 / 商品级营销图）+ **社媒图**（Pinterest / Instagram / Story / 节日营销 / 群发 banner）。

**架构**：本 skill 维护**提示词层**（输入 → 5 类词库 → 最终 prompt）+ **质量闸门层**（差异化 QA）。生图动作经 `terminal` 调**中心后端生图端点**（`POST /image/generate`，GPT Image 2）——key / 配额 / 换模型都在后端一处，**不在 mini 本地、skill 不持 key**（见 [references/backend-image-gen-contract.md](references/backend-image-gen-contract.md)）。看图能力（取 anchor / QA）仍用 Hermes `vision_analyze`。生成的图先落本地 `.cache/image-synth/ai_raw/`，由用户三选一决定是否进资产库。

**AI 发布图清理边界**：本 skill 生成后先保留原始输出，不在 `.cache/image-synth/ai_raw/` 阶段清理 AI metadata / AI watermark。只有用户选择"入库"、且该图会成为最终 listing 图片或社媒待发布图时，才由 `assets-library` 模式 B2 按 [`shared/ai-image-sanitization.md`](../shared/ai-image-sanitization.md) 处理发布副本。

**对外的实操接口**：
- **中心后端生图端点** `POST /image/generate`（per-profile token 鉴权 + idempotency key；契约见 [references/backend-image-gen-contract.md](references/backend-image-gen-contract.md)）——经 `terminal`（如 `curl`）调；OPENROUTER_API_KEY 只在后端，skill 不持
- Hermes 看图能力 `vision_analyze`（看实拍图作 anchor + 看生成图做 QA）
- 工作区根目录的 BRAND.md（视觉原则 + 视觉禁区）+ SHOP.md（仅 packaging / brand-story 类用到）+ COMMERCE_PLATFORM.md（销售平台媒体规则）
- `assets-library` 模式 B2 promote 流程（用户选"入库"时调用，本 skill 不重新实现归档）

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)，工具架构见 [`shared/tools-architecture.md`](../shared/tools-architecture.md)（生图走中心后端 `/image/generate`、key 在后端 skill 不持，已符合约束）。

---

## 依赖关系（每次出图前必读）

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| 图片需求（必需） | shoot-brief.md 路径 / 反向触发现传 in-memory / 用户口述 | 解析成 5 类提示词词库（mood / shot-spec / anchor / negative / format） |
| 商品实拍图 ≥ 1 张（必需） | 本地路径 / 飞书云空间链接 | **必须用 Hermes 看图能力**看图识别商品（材质 / 色 / 比例 / Logo），作为 anchor 喂给生图——跳过这步 AI 容易把商品形态画跑偏 |
| `<workspace>/BRAND.md` § 视觉原则 + § 视觉禁区 | 整体气质 / 配色 / 视觉禁区 | mood 词库源 + negative 词库**唯一**来源；BRAND 缺失降级 |
| `<workspace>/SHOP.md` § 物料 / 礼盒服务 | 包装物料 + 礼盒服务字段 | 仅 packaging 槽位 / brand-story 槽位 / 礼盒营销图用到 |
| `<workspace>/COMMERCE_PLATFORM.md` | 销售平台媒体规则（主图 / 详情图 / 视频 / 水印 / 文字限制） | 模式 A 决定槽位、比例、分辨率和平台硬禁区；Etsy / 小红书缺失可用内置 preset，其他平台缺失阻塞 |
| `Products 商品` 表中该 SKU 行（如已建） | title / 品类 / 变体 / SEO 关键词 | 选填——精确化 anchor，缺也能跑 |
| `Assets 素材池` 表中已 promoted 候选 | 已有同 SKU 成品图 | 选填——参考已有视觉风格保持一致 |

**降级规则**：

- **BRAND.md 缺失** → mood 段输出 `⚠️ BRAND.md 未建立——本图按通用视觉跑` + negative 段留通用兜底 + 提示用户回 shop-foundation 建库后回头补
- **`Products 商品` 表或 `Assets 素材池` 表缺失** → 跳过这两路输入，纯靠用户口述 + 实拍图 vision 结果
- **实拍图 / 图片需求 缺** → **阻塞**——anchor 与 brief 是保形与拟合的根，没法降级

---

## 模式 A vs 模式 B：先分清

| 维度 | 模式 A 电商图 | 模式 B 社媒图 |
|---|---|---|
| 核心诉求 | 商品本身的真实呈现 | 品牌氛围 / 节日感 / 情绪 |
| QA 商品形态 | ✅ 严格比对 | ❌ 不比对 |
| QA 主图规范 | 目标平台主图 / hero 槽位特检有 | 不适用 |
| 长宽比 | COMMERCE_PLATFORM.md 或 Etsy 内置槽位决定（见 [prompt-vocabulary.md § format](references/prompt-vocabulary.md#format-词库映射规则)）| 内容平台决定（见 [social-platform-specs.md](references/social-platform-specs.md)）|
| 文案叠层 | 罕见 | 常见（标题 / hashtag / CTA） |
| 入库标签字段值 | 目标平台商品图用途；Etsy 为槽位 ID（hero / detail / lifestyle / ...）| 渠道值（Pinterest / Instagram Posts / ...）|

**入库标签的取值集**：与 [`assets-library/references/asset-index-base-schema.md` § 用途标签](../assets-library/references/asset-index-base-schema.md) 字段词汇表一一对应——本 skill **不**自定义。Etsy 槽位 ID 见 [`assets-library/references/etsy-listing-photo-slots.md § 3`](../assets-library/references/etsy-listing-photo-slots.md#3-槽位-id-与-assets-素材池-表-用途标签-字段对齐)；其他平台按 COMMERCE_PLATFORM.md 与 `Assets 素材池` 表 schema 对齐，缺值时先补 schema，不临时编标签。

**边界场景**："黑五营销图（含商品 + 营销文字）"——核心是商品形态保真则走 A，核心是营销氛围则走 B。盘点输入时反问用户，**不替用户拍板**。

---

## 共享执行流（11 步，模式 A / B 共用）

模式 A / B 走同一套 11 步骤；差异见后面两节（输入表 + 模式差异表）。

1. **解析工作区根**（`ecommerce-stack workspace`，旧命令 `etsy-stack workspace` 兼容），得到 `<workspace>`
2. **盘点输入**——必填项一次性问全（不要边走边追问）。**反向触发时已 in-memory 现传的字段不重复盘点**（见 § 反向触发条件）
3. **解析图片需求** → 5 类词库（按 [prompt-vocabulary.md](references/prompt-vocabulary.md)）：
   - 输入是 shoot-brief.md 路径：读文件按模板段映射
   - 反向触发现传 in-memory：直接用结构化数据，不再读文件
   - 用户口述：在 chat 里跟用户对齐结构化短 brief（≤ 3 轮）
4. **看图取 anchor**——用 Hermes 看图能力看实拍图，提取 anchor 描述（材质 / 色 / 比例 / Logo / 关键纹理）；多张实拍图取一致信息
5. **拼最终 prompt**——按 [prompt-vocabulary.md § 最终 prompt 拼装](references/prompt-vocabulary.md#最终-prompt-拼装) 合成 1 段英文 prompt + negative prompt
6. **完整性自检 + 展示预览**——展示前自检：anchor.subject 与 format.aspect_ratio 必须非空；mood 段允许全空但显式标 `(degraded — BRAND.md 缺失)`。任意硬必填空 → 不展示，回 step 3 补输入。自检过 → 用代码块展示给用户确认 / 调整。**不偷跑**——生图调用有成本
7. **生图**——经 `terminal` 调**中心后端** `POST /image/generate`（契约见 [references/backend-image-gen-contract.md](references/backend-image-gen-contract.md)）：传 prompt + 实拍图（base64，受大小/数量上限约束）+ aspect/resolution + **idempotency key**（本次请求唯一；重试复用同一个 → 后端去重，不重复扣费）。**严格 1 张**。**不传 model slug**——模型由后端 allowlist 决定（默认 GPT Image 2）。
   - **失败显式报错，绝不静默**：`quota_exceeded` → 报「本租户配额用尽」停；`upstream`/网络（明确未计费）→ 退避重试**一次**（复用同一 idempotency key）；**超时（504）→ 报「生成超时，计费未知」，换一个新的 idempotency key 再试一次，或停下**（同 key 会返 409，因后端标 uncertain 防重复扣费）。任何失败都**不对缺失图跑 QA**，原因落 sidecar。
8. **QA**——按 [qa-gates.md](references/qa-gates.md) 对应段（模式 A / 模式 B）走全部 checks。含自动重试 ≤ 2 次 + 第 3 轮失败用户三选一
9. **落盘**——按 [output-layout.md](references/output-layout.md) 写到 `<workspace>/.cache/image-synth/ai_raw/{date}/` + 同名 sidecar `.json`。本地写入用 `mkdir -p` 一步建目录（`.cache/` 是本地 fs，不需要 assets-library 模式 D 的逐层检查——那是 `lark-drive` 限制）
10. **用户三选一**：
    - **入库** → 调用 `assets-library` 模式 B2 promote；按 [output-layout.md § promote 字段透传](references/output-layout.md#promote-入库时的字段透传) 现传 sidecar 元数据；如果用途是最终 listing 图或社媒发布图，由 assets-library 在 promote 时处理 AI metadata / AI watermark 发布副本
    - **留 ai_raw** → 保留 `.cache/`，不入索引
    - **丢弃** → 移到 `retired/`（详见 output-layout.md，给 7 天回滚窗口）
11. 给用户回执：本地路径 / 入库后的飞书云空间链接 / "已丢弃"

### 模式 A：电商图（销售平台商品图 / listing 槽位 / 商品级营销图）

**进入条件**：
- 用户明确说"出 listing 主图 / hero / 详情图 / lifestyle / packaging / scale / size chart / 槽位 X"
- 用户说"给 {SKU} AI 合成一张图"且核心是商品本身
- 反向触发：见 § 反向触发条件

**输入**：

| # | 输入 | 必需 | 缺失时 |
|---|---|---|---|
| 1 | 图片需求（brief 路径 / 反向触发 in-memory / 用户口述）| ✅ | 阻塞 + 反问 |
| 2 | 商品实拍图 ≥ 1 张 | ✅ | 阻塞 + 让用户给路径 / 飞书链接 |
| 3 | 目标销售平台 + 商品图用途 / 槽位 | ✅ | Etsy 取值见 [`assets-library/references/etsy-listing-photo-slots.md § 3`](../assets-library/references/etsy-listing-photo-slots.md#3-槽位-id-与-assets-素材池-表-用途标签-字段对齐) 的 10 槽位 ID；小红书取值按商品图 / 使用指南图 / 图文详情图；其他平台按 COMMERCE_PLATFORM.md，缺配置则阻塞 |
| 4 | `<workspace>/BRAND.md` 视觉原则 + 视觉禁区 | 必需但**降级可跑** | 见 § 依赖关系 降级规则 |
| 5 | `Products 商品` 表中该 SKU 行 | 可选 | anchor 段只用实拍图 vision 结果 |

**模式 A 步骤差异**：

| Step | 模式 A 取值 |
|---|---|
| 3 镜头清单源 | shoot-brief.md §C 当前槽位段 |
| 8 QA 段 | [qa-gates.md § 模式 A](references/qa-gates.md#模式-a-电商图) |
| 10 入库标签字段 | 目标平台商品图用途；Etsy 为槽位 ID（hero / detail / lifestyle / ...）|

### 模式 B：社媒图（Pinterest / Instagram / Story / 节日营销 / 群发 banner / 自定义氛围图）

**进入条件**：
- 用户明确说"出 Pinterest pin / 做 IG post / 做 Story / 节日营销图 / 社媒分享图 / 群发图 / banner"
- 用户说要做"氛围图 / 概念图"且不要求商品形态严格保真
- 反向触发：见 § 反向触发条件

**输入**：

| # | 输入 | 必需 | 缺失时 |
|---|---|---|---|
| 1 | 图片需求 | ✅ | 同模式 A |
| 2 | 商品实拍图 ≥ 1 张 | ✅ | 阻塞——纯氛围图无产品时也允许放品牌物料 / Logo 图作 anchor |
| 3 | 目标平台 + 尺寸（取值见 [social-platform-specs.md](references/social-platform-specs.md)）| ✅ | 阻塞 + 反问 |
| 4 | 文案叠层（如需要在图上加文字）| 可选 | 缺失：纯视觉图，不加文字 |
| 5 | `<workspace>/BRAND.md` | 必需但**降级可跑** | 同模式 A |

**模式 B 步骤差异**：

| Step | 模式 B 取值 |
|---|---|
| 3 镜头清单源 | [social-platform-specs.md](references/social-platform-specs.md) 的目标平台段（尺寸 / 安全区 / 文字密度 / 视觉权重）|
| 8 QA 段 | [qa-gates.md § 模式 B](references/qa-gates.md#模式-b-社媒图)（仅文字可读 + 视觉禁区，不做商品形态比对）|
| 10 入库标签字段 | 渠道值（取值见 [`assets-library/references/asset-index-base-schema.md` § 用途标签 § 渠道](../assets-library/references/asset-index-base-schema.md)：Pinterest / Instagram Posts / Instagram Reels / Instagram Stories / 小红书 / 评价素材 / 内部参考）|

### 反向触发条件（被其他 skill 调用时的入口）

三个 caller 现传 in-memory 字段：

| 调用方 | 触发位 | 现传字段 | 进入模式 |
|---|---|---|---|
| `assets-library` 模式 D step 11 | 用户选"不拍直接合成" | brief §A 槽位选项 + §B Mood + §C 镜头清单 + 用户挑的目标槽位 | **A** |
| `pinterest-autopin` 模式 B step 3 | Pinterest 候选池空 + 用户选"AI 合成" | SKU + 目标 board + 已草拟 pin 文案 + 目标平台 = Pinterest 1000×1500 | **B** |
| `listing-catalog` 模式 B step 10 | 用户选"不拍直接 AI 合成" | 礼物词库（受众 / 场景 / 节日 / 包装） + description 礼物 / 使用语境 + `Products 商品` 表中该 SKU 行 | **A** |

**信任规则**：反向触发时**不重复盘点已现传输入**——调用方现传 = 信任。step 2 跳过对应字段；其余步骤照走（看图 anchor / 拼 prompt / 预览 / 生图 / QA / 落盘 / 三选一）。

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束。本 skill 特有：

- **prompt 展示给用户预览** → 等确认 → 才调生图（生图调用有成本）
- **入库走 assets-library**：本 skill 不直接写 `Assets 素材池` 表 / 不直接上传飞书云空间——这是 assets-library 的职责边界
- **生图走中心后端，skill 不持 key / 不直接调 OpenRouter**：`OPENROUTER_API_KEY` 只在后端；skill 经 `terminal` 调 `/image/generate`，**model 由后端 allowlist 决定**（默认 GPT Image 2），skill 不传任意 model slug（防点贵模型 / 绕安全）
- **视觉禁区不可绕过**：BRAND § 视觉禁区原文进 negative prompt + QA 扫描清单；用户当场说"这次破例"也**不破例**——要破例先回 shop-foundation 改 BRAND.md
- **QA 失败不入库**：QA 不通过的图最多落 `.cache/`；不调用 assets-library promote。失败原因 + 重试历史落 sidecar `.json`

---

## 与其他 skill 的协作

- **shop-foundation**：BRAND.md § 视觉禁区是 negative prompt **唯一**来源；用户对生成图的纠正（"这种风格不像我们品牌"）按 shop-foundation 沉淀流程流回 BRAND.md
- **assets-library**：
  - 模式 D 出 shoot-brief.md 是本 skill 的**主输入源**（brief 路径 / 反向触发 in-memory）
  - 用户选"入库" → 调 assets-library 模式 B2 promote；现传 sidecar 元数据（含 `[AI 合成]` 标记）。AI metadata / AI watermark 清理只在 promote 的发布副本上发生，不改 ai_raw 原图
  - 入库标签字段值取自 assets-library schema 的 § 用途标签 词汇表——本 skill **不**自定义；v0 不动 schema，AI 合成识别靠 Base "备注"字段前缀
- **listing-catalog**：`Products 商品` 表中该 SKU 行的 title / 品类 / SEO 词作 anchor 选填输入；本 skill 不写 `Products 商品` 表
- **pinterest-autopin**：候选池空时被反向触发；本 skill 出图 → 落 .cache → 入库 → 回到 pinterest-autopin step 4
- **orders-customers**：暂无直接耦合（v1 可能加：客户 UGC 风格反向训练 anchor 一致性）

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：
- **prompt 输出为英文**（生图模型对英文 prompt 拟合度更高）；BRAND.md 抽取的中文短语先翻成英文再入 prompt
- 与用户对话仍中文（按 stack 规则）
- sidecar `.json` 字段名英文 camelCase；值视情况
