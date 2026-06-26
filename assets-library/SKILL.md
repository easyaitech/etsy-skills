---
name: assets-library
description: 维护电商店铺的视觉与素材资产库（摄影 / 视频 / 视觉模板 / 字体 / Logo / 包装物料 / 客户 UGC / 营销素材）。六个一级文件夹（商品 / 品牌 / 客户 / 工作室 / 营销 / 待处理）+ 店铺总 Base 内 `Assets 素材池` 表（canonical 成品）+ `Asset Variants 派生素材` 表（平台发布副本）双层架构。五种触发：(1) 建库：用户提到"建素材库 / 建资产库 / 整理素材"等首次建立请求时——建文件夹骨架 + `Assets 素材池` 表；(2) 归档：用户提到"上传新摄影 / 归档某 SKU 的图 / 整理新素材 / 收到客户 UGC / 整理营销素材 / 收集这些图"等请求时——新素材先入待处理/，分类后移入对应文件夹 + 录入 `Assets 素材池` 表（B1 dump / B2 promote）。**素材收集进池是本 skill 唯一职责**，下游发布编排不自己收集；(3) 查找：用户提到"找某 SKU 的图 / 查能发 Pinterest 的素材 / 查某次营销活动素材"等检索请求时——走 Base 多维筛选；(4) 拍前规划：用户提到"给某 SKU 出拍摄 brief"等请求时——按 COMMERCE_PLATFORM.md 的目标平台媒体规则出 markdown shoot brief；Etsy 走内置 10 槽位 preset，小红书走内置商品图 / 详情图规则（模式 D plan，落 商品/{SKU}_shoot-brief.md）；(5) 派生平台变体：用户或 publish-composer 提到"给某 SKU 出小红书笔记封面 / Pinterest 竖裁 / 按平台规格出发布副本 / 出某平台尺寸图"等请求时——从已有 canonical 成品按目标平台规格派生发布变体（裁切 / 封面 / 压缩 / 清理），录入 `Asset Variants 派生素材` 表（模式 E）。**多平台下本 skill 是「按平台规格的变体工厂」**。归档、brief、变体严格遵守 BRAND.md 视觉原则（如存在）。
layer: foundation
---

# 资产库 (Assets Library)

这个 skill 维护电商店铺的视觉与素材资产，核心是**双层架构——扁平文件夹 + 语义 Base**：
- **物理层（6 个一级文件夹）**——飞书云空间：`商品/ 品牌/ 客户/ 工作室/ 营销/ 待处理/`。每个文件唯一存放在一个文件夹中，**无任何子目录**
- **语义层（店铺总 Base 内 `Assets 素材池` 表）**——**只收 promoted 的成品**：一行一个，多选标签 + 关联店铺总 Base 内其他表，承载所有细粒度分类（SKU / 渠道 / 用途 / 阶段）

**文件夹只管来源归属 / 发布阶段**（商品相关？品牌相关？客户相关？工作室相关？营销发布版本？还没分类？）；**Base 管一切语义分类**（哪个 SKU / 什么用途 / 投哪个渠道 / raw 还是成品）。两者通过"文件链接"字段连接。

> **Base 是查素材的唯一入口**：用户找素材时走 Base 视图筛选 → 点文件链接跳转。不应该在文件夹里翻找——文件夹只是存储后端。

**对外的实操接口**：飞书云空间（`lark-drive`） + 店铺总 Base 内的 `Assets 素材池` 表（`lark-base`） + `Products 商品` 表（模式 D 读 SKU 行） + 工作区根目录的 BRAND.md（视觉原则）。

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 依赖关系

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` § 视觉原则 / 视觉禁区 | 整体气质 / 色彩 / 排版构图 / 视觉禁区 | **B2 promote 时**用作"是否合规"自检；自检结果写进 `Assets 素材池` 表的"BRAND 合规"字段。**模式 D 出 brief 时**作为 §B Mood 段抽取源。raw 不做合规检查 |
| `<workspace>/SHOP.md` § 物料 / 礼盒服务 | 包装物料 / 感谢卡 / 礼盒服务字段 | **模式 D 出 brief 时**决定 §A 表第 9 行 packaging 计划该拍什么物料 |
| `<workspace>/COMMERCE_PLATFORM.md` | 目标销售平台媒体规则（主图 / 详情图 / 视频 / 水印 / 文字限制） | **模式 D 出 brief 时**决定槽位、比例、分辨率和硬禁区；Etsy / 小红书可使用内置 preset |
| 店铺总 Base 的 `Products 商品` 表 | SKU 列表 + 字段（title / 品类 / 变体 / SEO 关键词 / description 礼物 / 使用语境） | `Assets 素材池` 的"关联 SKU"字段直接关联（B2 用）；**模式 D 读 SKU 行**作为输入；SKU 行通过反向查询能看到该 SKU 的全部素材 |
| `Orders 订单` 表 | 订单号 | 客户拍摄 / 客户定制类素材通过"关联订单"字段挂上 |
| `Customers 客户` 表 | 客户列表 | UGC 类素材通过"关联客户"字段溯源授权 |
| listing-catalog 礼物词库 | 礼物词库（受众 / 场景 / 节日 / 包装等） | **模式 D 出 brief 时**喂入 §C Lifestyle 段；获取路径见模式 D §输入 |

---

## 五种执行模式

### 模式 A：建库（首次建立双层骨架）

**进入条件**：飞书云空间还没有规范的资产目录，或店铺总 Base 内还没有 `Assets 素材池` 表。

**执行步骤**：
1. 先按 [asset-index-base-schema.md § 何时不需要建这张表](references/asset-index-base-schema.md#何时不需要建这张表) 与用户确认是否真的需要 `Assets 素材池` 表——若否，本模式只做物理层
2. 读 `references/folder-structure.md` 与 `references/asset-index-base-schema.md`，对齐双层结构
3. **物理层**：用 `lark-drive` 在飞书云空间创建根文件夹 `{店铺名}-素材库`，下建 6 个一级文件夹：`商品/`、`品牌/`、`客户/`、`工作室/`、`营销/`、`待处理/`。**不建任何子目录**
4. **语义层**（如需要）：用 `lark-base` 在店铺总 Base 内创建或补齐 `Assets 素材池` 表，按 schema 建字段（关联字段必须指向同 Base 内 `Products 商品`、`Orders 订单`、`Customers 客户` 表）和推荐视图
5. 落盘后告诉用户：素材库根目录链接 + 店铺总 Base 链接 + `Assets 素材池` 表字段清单 + 简要使用约定

> **建库阶段不批量迁移已有素材**——只创建空骨架。让用户自己分批迁过来；迁的过程中可以求助本 skill 给命名建议 +（要用的）录索引。实际归档动作走模式 B：**默认 B1 dump（新素材全进 待处理/，不进 Base）→ B2 promote（分类 + 移入对应文件夹 + 进 Base）**。

### 模式 B：归档新素材

**进入条件**：用户上传了新摄影 / 视频 / 设计 / 模板 / 客户素材，需要按规范归档。

**聊天图片硬规则**：所有通过聊天窗口发给电商 Agent 的图片，都必须先备份到飞书云盘素材库。暂时无法判断归属时默认走 B1 上传到 `待处理/`；已明确用于商品页 / listing / Pinterest / 营销时，可直接走 B2 promote。不要只写商品表的 `照片附件` 而跳过 Drive 备份。

分两个子模式——B1 入待处理不录 Base，B2 分类移入对应文件夹录 Base：

#### 模式 B1：dump（新素材入 待处理/，**不**录 Base）

**进入条件**：刚拍完 shoot 回来 / 客户发了一堆图 / 老素材搬迁——总之是**一批未策展的素材**先要落盘。

**目的地固定：所有新素材统一进 `待处理/`**。不做任何分流决策——dump 阶段追求零摩擦入库。

**执行步骤**：
1. 用 `lark-drive` 确认 `待处理/` 文件夹存在
2. 上传 / 移动文件到 `待处理/`；**接受保留相机原始文件名**（`IMG_1234.JPG`），不强制走 [naming-convention.md](references/naming-convention.md) 重命名——规范命名延后到 B2 promote
3. **硬性 gate**：dump 完成的标志是拿到每个文件的 Lark `file_token`，拿不到就报错——**不允许静默存本地**
4. 给用户回执：路径 + 文件数 + 一句"这批已入待处理，后续走模式 B2 分类 + 录 Base"

**B1 明确不做的事**（零摩擦入库）：
- 不问 BRAND 合规
- 不问用途标签
- 不问关联 SKU
- 不问分类归属（商品/品牌/客户/工作室/营销的分类延后到 B2）
- **不录入 `Assets 素材池` 表**

#### 模式 B2：promote（分类 + 移入对应文件夹 + 录 Base）

**进入条件**：
- 用户挑了某张图准备用（写 listing / 出 pin / 发 IG）
- 用户主动整理 待处理/ 中的素材
- 下游 skill（pinterest-autopin / listing-catalog）查 Base 时发现该素材还没录入，反向触发本模式

**执行步骤**：
1. 读 [naming-convention.md](references/naming-convention.md)：成品文件命名规则
2. 读 [asset-types.md](references/asset-types.md)：识别素材该归到哪个一级文件夹
3. **分类**：判断素材归属——商品 / 品牌 / 客户 / 工作室 / 营销。判断依据见 [asset-types.md](references/asset-types.md) 的类型→文件夹映射表
4. **发布图 AI 清理 gate（仅 final listing / 社媒发布图）**：
   - 若本次 promote 的用途标签是目标电商平台商品图 / listing 槽位（如 Etsy `hero` / `detail` / `lifestyle`），或包含社媒渠道（`Pinterest` / `Instagram Posts` / `Instagram Stories` / 等），先按 [`shared/ai-image-sanitization.md`](../shared/ai-image-sanitization.md) 处理**发布副本**。
   - 输入仍是用户选中的素材；输出落 `<workspace>/.cache/ai-image-sanitizer/`，后续上传 / 移动使用清理后的副本。
   - `待处理/` 原图、`image-synth` 的 `.cache/image-synth/ai_raw/` 暂存图、内部参考图不跑本 gate。
   - 只默认跑 AI metadata + 可检测的 AI visible watermark；`invisible` / `all` 需要用户明确接受会重写像素后才用。
5. **物理动作**：
   - 如素材需编辑（**用户在外部工具完成**——本 skill 不做图像编辑）：裁切 / 调色 / 加水印 → 按规范命名
   - 用 `lark-drive` 将文件从 `待处理/` 移入对应一级文件夹。例：
     ```
     待处理/IMG_3847.JPG → 商品/TEACUP-001_listing-cover_01.jpg
     ```
6. 用 `lark-drive` 拿到飞书云空间文件链接
7. **录入 `Assets 素材池` 表**——按 [asset-index-base-schema.md § 录入约定](references/asset-index-base-schema.md#录入约定模式-b2-promote-时执行) 执行；用 `lark-base` 新增一行，**录入前列出将写入的字段值清单等用户确认**；如第 4 步执行过 AI 清理，在"备注"字段追加 `AI 发布图清理: applied/checked-noop, steps=...`
8. `Products 商品` 表该 SKU 行通过"关联 SKU"反向就能看到本条素材；商品表的"照片链接"跳转字段如需手动维护，参 [asset-types.md § 与 listing-catalog 的协作](references/asset-types.md#与-listing-catalog-的协作)

> **视觉合规检查（B2 时）**：对照 BRAND.md 视觉禁区做自检，结论写进 Base 的"BRAND 合规"字段（不通过时理由写"备注"）。详见 [asset-types.md § 视觉合规自检](references/asset-types.md#视觉合规自检b2-promote-时)。

> **客户拍摄 / UGC 类**：必须挂"关联订单 + 关联客户"，且归入 `客户/` 文件夹。`公开授权 = 待沟通` 时可以 promote（已经决定要用、正在去要授权），但**不要勾任何渠道用途标签**；改成 `已授权` 后才能勾用途 / 投渠道。

### 模式 C：查找

**进入条件**：用户要找素材（"某 SKU 的图"、"那个新春模板"、"Logo PNG 透明底"、"客户 UGC 里能发 Pinterest 的"）。

#### 已录入 Base 的素材 → 走 `Assets 素材池` 表

**Base 是查素材的唯一入口**，覆盖所有 promoted 集合：

| 用户问 | Base 视图 / 筛选条件 |
|---|---|
| "TEACUP-001 所有成品图" | 视图"按 SKU 分组" → 找 TEACUP-001 |
| "能发 Pinterest 的图" | 视图"Pinterest 候选"，或筛 用途标签 ⊇ Pinterest AND 公开授权 = 已授权 |
| "客户拍的、能用作评价的" | 视图"客户 UGC（已授权）" → 筛 素材类型 ⊇ 客户拍摄 |
| "ORDER-2026-001 客户给的所有定制参考" | 筛 关联订单 = ORDER-2026-001 |
| "竖版视频母版" | 筛 素材类型 ⊇ 视频母版 AND 比例 ⊇ 9x16 |

**执行步骤**：
1. 用 `lark-base` 按上述模式查 Base，拿到候选素材列表（含文件链接）
2. 必要时用 `lark-drive` 跟进打开文件 / 提供更多元信息
3. 候选多时，按"上传日期"或"BRAND 合规"排序提供给用户

#### 未录入 Base 的素材 → 走 待处理/ 文件夹

待处理/ 中的素材尚未分类和录入 Base。找这类素材直接用 `lark-drive` 浏览 `待处理/` 文件夹。

#### 边界情况

- **Base 不存在**：回退到 `lark-drive` 直接搜文件名 + 浏览各一级文件夹
- **找的是成品但 Base 里没有**：可能还在 待处理/ 中——提示用户"这张还没分类，要不要现在走模式 B2 promote 一下？"

### 模式 D：plan（拍前出 shoot brief）

**进入条件**：
- 用户主动单 SKU："给 {SKU} 出拍摄 brief" / "下周要上新 X，先出 brief"
- 用户主动批量："给 X/Y/Z 都出 brief"——skill 顺序循环跑模式 D，每个 SKU 独立展示给用户确认 + 写盘后再进下一个；中途用户中断时已写盘的保留，未写盘的丢弃
- listing-catalog 模式 B step 10 反向触发（用户在 listing 文案落 Base 后选择"顺手出 shoot brief"）
- 老 SKU 补拍补槽位 → 走"部分跑"分支（见下方关键约束）

**输入**（按顺序读取，按规则降级，不无脑阻塞）：

| # | 输入 | 是否必需 | 缺失时怎么办 |
|---|---|---|---|
| 1 | `Products 商品` 表该 SKU 行 | 必需 | SKU 不在店铺总 Base：**阻塞** + 提示用户先回 listing-catalog 模式 A 建一行最小记录（至少 title + 品类），再回模式 D。本 skill 不偷偷建 SKU 行 |
| 2 | `<workspace>/BRAND.md` § 视觉原则 + § 视觉禁区 | 必需但**降级可跑** | 缺失：§B Mood 段输出 "⚠️ BRAND.md 未建立——本段先留空，回 shop-foundation 建库后回头补"，brief 仍可出 §A/§C/§D/§E |
| 3 | listing-catalog 礼物词库（受众 / 场景 / 节日 / 包装等）| 强烈推荐**不阻塞** | 来源分两种：**(a) 反向触发** → listing-catalog 现传词库 in-memory；**(b) 主动触发** → 从该 SKU 的 Base description 礼物 / 使用语境 + tags 礼物词抽取已 fused 文本；提示用户"如想用最新结构化词库可回 listing-catalog 重跑礼物维度调研" |
| 4 | listing-catalog eRank 调研产物（如已存）| 可选 | 缺失：跳过，§B 不引用同类店铺风格 |
| 5 | `<workspace>/SHOP.md` § 物料 / 礼盒服务 | 可选 | 缺失：§A 表第 9 行 packaging 计划写"未配置物料 → 拍裸品 + 简包装"，提示补 SHOP.md |
| 6 | `<workspace>/COMMERCE_PLATFORM.md` 目标平台媒体规则 | 目标平台非 Etsy / 小红书时必需 | Etsy 缺失可用内置 10 槽位 preset；小红书缺失可用内置商品图 / 详情图规则；其他平台缺失则阻塞，提示先用 shop-foundation 补平台配置 |

**执行步骤**：
1. **检查 SKU 是否在 `Products 商品` 表**——不在则阻塞，提示用户回 listing-catalog 模式 A 建一行最小记录后再回
2. **检查 brief 是否已存在**（`商品/{SKU}_shoot-brief.md`）——已存在则强制问："覆盖 / 重命名旧版保留 / 仅补拍缺位（部分跑）"。重命名时旧版改为 `{SKU}_shoot-brief_{原生成日期 YYYY-MM-DD}.md`
3. **若选"部分跑"**：用 `lark-base` 反查 `Assets 素材池` 表中该 SKU 已 promoted 素材的"用途标签"。目标平台是 Etsy 时，按 [etsy-listing-photo-slots.md § 槽位 ID 与 `Assets 素材池` 表 "用途标签"字段对齐](references/etsy-listing-photo-slots.md#3-槽位-id-与-assets-素材池-表-用途标签-字段对齐) 推断已覆盖槽位；目标平台是小红书时，按 `listing-catalog/references/platforms/xiaohongshu.md` 的商品图 / 使用指南图 / 图文详情图规则推断；其他平台按 COMMERCE_PLATFORM.md 的媒体规则推断，配置缺失则阻塞。列给用户确认缺哪几位 → 仅填模板 §A 缺位行 + §C 对应镜头清单段；§B Mood 段沿用旧 brief
4. 读上述输入（按本节"输入"表 + 降级规则）
5. 按目标平台读取媒体规则：Etsy 读 [references/etsy-listing-photo-slots.md](references/etsy-listing-photo-slots.md) 作为内置 10 槽位 preset；小红书读 `../listing-catalog/references/platforms/xiaohongshu.md` 的图片规则；其他平台只读 COMMERCE_PLATFORM.md 对应平台章节
6. 读 [references/shoot-brief-template.md](references/shoot-brief-template.md)：拿模板骨架
7. 填三段式 brief（A 槽位映射 / B Mood / C 镜头清单 / D 参考图占位 / E 附注 / References 链接段）
8. **展示给用户**等确认（不主动写盘）；用户调整后再写
9. 写盘：
   - 9a. 用 `lark-drive` 检查素材库根目录和 `商品/` 文件夹存在；缺 → 阻塞，提示用户先跑模式 A
   - 9b. 在临时位置生成本地 markdown 内容
   - 9c. 用 `lark-drive` 上传到 `商品/{SKU}_shoot-brief.md`
10. 给用户回执：文件链接 + "拍完后走模式 B1 dump"
11. **(可选) 反向触发 image-synth** — brief 写盘后，如果用户表达"不想真去拍 / 没场景 / 想 AI 出图"等意图：
    - **若来自 listing-catalog 反向触发**：跳过本步——调用方已在自己的 step 10 给过"出 brief / image-synth / 跳过"三选一，用户既然选了 brief 就别再回头问
    - 仅在用户**主动**触发模式 D（不是 listing-catalog 现传词库进来的场景）时追问："brief 出好了。如果你不想真去拍，可以让 image-synth 直接按这份 brief 合成图。要不要顺手让它出一张？"
    - 用户同意 → invoke `image-synth` 进入模式 A，**调用方现传** brief 的 §A 槽位选项 + §B Mood + §C 镜头清单 in-memory + 用户挑的目标槽位（避免 image-synth 重新读 brief 文件，词库新鲜可用）
    - 用户跳过 → 静默跳过（不阻塞）；用户后续主动 invoke image-synth 时也能正常出图（直接读 `商品/{SKU}_shoot-brief.md` 文件路径）
    - 节奏：本步是 step 10 完成后**同一 turn 内** agent 主动追问的可选环节，不是必跑步骤；用户回应后才 invoke 下一个 skill

**关键约束**：
- brief **不进** `Assets 素材池` 表（brief 是文档不是素材）
- brief **不预创建**其他文件（拍不拍是另一回事，素材由 B1 dump 真正回片时上传）
- brief **不批量聚合**：批量调用 = 循环跑 N 遍，N 份独立 brief；集中 shoot 时由用户拼合并单
- brief 已存在时**强制问**"覆盖 / 重命名 / 部分跑"，不靠用户主动声明
- 不做图像生成 / 编辑——AI 合成走 `image-synth` skill；本 skill 模式 D step 10 末尾会反向触发它（用户选"不拍直接合成"路径）。不主动调平台后台或外部平台抓参考图（用户在 §D 手填）

---

### 模式 E：派生平台变体（多平台发布副本工厂）

**进入条件**：
- 用户主动："给 {SKU} 出小红书笔记封面 / Pinterest 竖裁 / 出某平台尺寸的发布副本"
- `publish-composer` 组某平台 PublishIntent 时发现缺该平台规格的变体 → 反向请求本 skill 派生

**输入**：

| # | 输入 | 是否必需 | 缺失时怎么办 |
|---|---|---|---|
| 1 | 源 canonical 成品（`Assets 素材池` 一行 / 文件链接）| 必需 | 没有成品：**阻塞**，提示先走模式 B2 promote 一张 canonical 成品 |
| 2 | 目标平台 + 用途 | 必需 | 缺：问用户"派给哪个平台、什么用途（封面 / 商品图 / 详情图 / pin）" |
| 3 | `COMMERCE_PLATFORM.md` / `MARKETING_PLATFORM.md` 平台规格 | 目标平台非 Etsy / 小红书时必需 | Etsy / 小红书走内置 preset；其他平台缺配置则阻塞 |
| 4 | `BRAND.md` § 视觉禁区 | 推荐不阻塞 | 带字封面 / 模板套用时作合规自检 |

**派生类型与归属**（D-A8 synth-vs-派生边界）：

| 派生类型 | 怎么做 | 谁做 |
|---|---|---|
| 裁切 / 缩放 / 比例适配（2:3 pin、3:4 小红书） | 机械裁切工具 | **本 skill** |
| 压缩副本 / 缩略图 / 视频首帧 | 机械工具 | **本 skill** |
| AI metadata / 水印清理 | `remove-ai-watermarks` + `jpegoptim` / `optipng`（见 [`../shared/ai-image-sanitization.md`](../shared/ai-image-sanitization.md)）| **本 skill** |
| 模板化带字封面（品牌框 + 文字叠层，模板已定） | 套模板 | **本 skill** |
| 需要**全新创意构图**的封面 / 海报 | 不是机械派生 | **委托 `image-synth`**（模式 B），产出物再回本 skill 录为变体 |

**执行步骤**：
1. 确认源 canonical 成品存在；读目标平台规格（preset 或 COMMERCE/MARKETING_PLATFORM.md）
2. 判定派生类型 → 机械/模板化在本 skill 做；需新创意构图则委托 image-synth（边界见上表）
3. **不覆盖原图**：派生输出为**新文件**，上传到对应文件夹（社媒发布图→`营销/`，listing 图→`商品/`）
4. 列动作清单 + Base 字段值给用户确认（写入前硬约束）
5. 在 `Asset Variants 派生素材` 表录一行：`派生自`（关联 canonical）/ `派生类型` / `目标平台` / `比例尺寸` / `AI 清理状态` / `派生来源工具`（schema 见 [asset-index-base-schema.md § 派生素材 / AssetVariant](references/asset-index-base-schema.md)）
6. 回执：变体文件链接 + "publish-composer 引用本变体组 PublishIntent，不要再清理 / 裁切"

**关键约束**：
- 派生**只作用在发布副本**，永不替换 / 覆盖 canonical 原图（与固定处理模型一致）
- 同一 canonical 可有多个变体（Pinterest 一个、小红书一个）；每个变体一行
- 下游 `publish-composer` / 平台 adapter **只引用**变体文件链接，不重新清理 / 裁切（清理派生单点在本层）

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束。本 skill 特有禁区：

- **文件操作前列出动作清单** → 等用户确认 → 执行（lark-drive）
- **Base 录入前列出字段值清单** → 等用户确认 → 写入（lark-base）
- **不删除原始素材**：摄影原图（RAW / 高清 JPG）一旦归档，本 skill 不主动删除（容量管理由用户人工决策）
- **不替用户做创意图片编辑**：调色 / 创意构图 / 新海报由用户人工或 `image-synth`。但**模式 E 的机械/模板化派生平台变体（裁切 / 缩放 / 压缩 / 缩略图 / AI metadata 清理 / 套定好的模板封面）是本 skill 的职责**——这是多平台发布的「变体工厂」能力（D-A7/D-A8）。所有派生**只作用在发布副本**，永不替换 / 覆盖原始 canonical 素材；需要全新创意构图的封面/海报委托 `image-synth`
- **single source of truth**：每个文件在云空间只放一份——多归属靠 Base 多选字段表达，不要靠拷贝。详见 [asset-index-base-schema.md § 设计原则](references/asset-index-base-schema.md#设计原则)

---

## 与其他 skill 的协作

- **shop-foundation**：每次归档后如果发现 BRAND.md 视觉原则需要补充（比如新增"自然光必拍"这种偏好），按 shop-foundation 的沉淀流程（`../shop-foundation/references/distillation-brand.md`）提议进 BRAND.md
- **listing-catalog**：
  - `Products 商品` 表通过"关联 SKU"反向看到全部素材；详见 [asset-types.md § 与 listing-catalog 的协作](references/asset-types.md#与-listing-catalog-的协作)
  - **模式 D 出 brief 时**消费 listing-catalog 模式 B step 5.5 的礼物词库——反向触发场景下 listing-catalog 现传 in-memory；主动触发场景下从该 SKU 的 Base description 礼物 / 使用语境 + tags 礼物词抽取已 fused 文本
- **orders-customers**：客户定制参考图与 UGC 通过"关联订单 + 关联客户"挂上；UGC 授权流程（找客户沟通）由 orders-customers 完成，结果回写到 Base 的"公开授权"字段。目标平台是小红书时，客户素材仍必须先拿公开授权，才能勾 `小红书` 用途标签进入小红书候选视图
- **image-synth**：
  - 本 skill 模式 D 出的 shoot-brief.md 是 image-synth 的**主输入源**——image-synth 解析 brief 的 §B Mood 段填 mood 词库 / §C 镜头清单填 shot-spec 词库
  - 模式 D step 11 反向触发 image-synth：用户选"不拍直接合成"时现传 brief 词库 in-memory，避免重新读文件
  - image-synth 出的 AI 合成图最终通过本 skill 模式 B2 promote 入 `Assets 素材池` 表：其"备注"字段以 `[AI 合成] {prompt 摘要}` 前缀写入；电商 / listing 图上传到 `商品/` 文件夹，社媒 / 营销图上传到 `营销/` 文件夹，按命名规则命名
  - **v0 不动 schema**：`Assets 素材池` 表不新增"AI 合成"词汇，仅在"备注"字段标前缀。v1 观察后再决定是否升级
- **publish-composer（社媒发布编排）**：
  - composer 组某平台 PublishIntent 时**只引用** `Asset Variants 派生素材` 的发布副本文件链接，不自己收集 / 清理 / 裁切
  - composer 发现缺某平台规格变体 → 反向请求本 skill 模式 E 派生；本 skill 录入变体后把链接交回 composer
  - 边界：素材这个**名词**（canonical + 变体 + 收集 + 清理 + 检索）归本 skill；发布这个**动词**（组 intent + 队列）归 composer

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：文件名用**英文**（飞书路径中文不稳定，跨平台兼容差）；目录名可中英混用（飞书原生支持中文目录名）。
