---
name: assets-library
description: 维护 Etsy 店铺的视觉与素材资产库（摄影 / 视频 / 视觉模板 / 字体 / Logo / 包装物料 / 客户 UGC）。五个一级文件夹（商品 / 品牌 / 客户 / 工作室 / 待处理）+ 素材索引 Base 双层架构。四种触发：(1) 建库：用户提到"建素材库 / 建资产库 / 整理素材"等首次建立请求时——建文件夹骨架 + 素材索引 Base；(2) 归档：用户提到"上传新摄影 / 归档某 SKU 的图 / 整理新素材 / 收到客户 UGC"等请求时——新素材先入待处理/，分类后移入对应文件夹 + 录 Base（B1 dump / B2 promote）；(3) 查找：用户提到"找某 SKU 的图 / 查能发 Pinterest 的素材"等检索请求时——走 Base 多维筛选；(4) 拍前规划：用户提到"给某 SKU 出拍摄 brief"等请求时——按 Etsy 10 槽位社区 SOP 出 markdown shoot brief（模式 D plan，落 商品/{SKU}_shoot-brief.md）。归档与 brief 严格遵守 BRAND.md 视觉原则（如存在）。
layer: foundation
---

# 资产库 (Assets Library)

这个 skill 维护 Etsy 店铺的视觉与素材资产，核心是**双层架构——扁平文件夹 + 语义 Base**：
- **物理层（5 个一级文件夹）**——飞书云空间：`商品/ 品牌/ 客户/ 工作室/ 待处理/`。每个文件唯一存放在一个文件夹中，**无任何子目录**
- **语义层（素材索引 Base）**——**只收 promoted 的成品**：一行一个，多选标签 + 关联其他 Base，承载所有细粒度分类（SKU / 渠道 / 用途 / 阶段）

**文件夹只管来源归属**（商品相关？品牌相关？客户相关？工作室相关？还没分类？）；**Base 管一切语义分类**（哪个 SKU / 什么用途 / 投哪个渠道 / raw 还是成品）。两者通过"文件链接"字段连接。

> **Base 是查素材的唯一入口**：用户找素材时走 Base 视图筛选 → 点文件链接跳转。不应该在文件夹里翻找——文件夹只是存储后端。

**对外的实操接口**：飞书云空间（`lark-drive`） + 素材索引 Base（`lark-base`） + 商品 Base（`lark-base`，模式 D 读 SKU 行） + 工作区根目录的 BRAND.md（视觉原则）。

> 共享引导（版本检查 / 工作区解析 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 依赖关系

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` § 视觉原则 / 视觉禁区 | 整体气质 / 色彩 / 排版构图 / 视觉禁区 | **B2 promote 时**用作"是否合规"自检；自检结果写进素材索引 Base 的"BRAND 合规"字段。**模式 D 出 brief 时**作为 §B Mood 段抽取源。raw 不做合规检查 |
| `<workspace>/SHOP.md` § 物料 / 礼盒服务 | 包装物料 / 感谢卡 / 礼盒服务字段 | **模式 D 出 brief 时**决定 §A 表第 9 行 packaging 计划该拍什么物料 |
| 商品 Base | SKU 列表 + 字段（title / 品类 / 变体 / SEO 关键词 / description 段 3） | 素材索引 Base 的"关联 SKU"字段直接关联（B2 用）；**模式 D 读 SKU 行**作为输入；商品 Base 通过反向查询能看到该 SKU 的全部素材 |
| 订单 Base | 订单号 | 客户拍摄 / 客户定制类素材通过"关联订单"字段挂上 |
| 客户 Base | 客户列表 | UGC 类素材通过"关联客户"字段溯源授权 |
| listing-catalog 礼物词库 | 4 类礼物词库（受众 / 场景 / 节日 / 包装） | **模式 D 出 brief 时**喂入 §C Lifestyle 段；获取路径见模式 D §输入 |

---

## 四种执行模式

### 模式 A：建库（首次建立双层骨架）

**进入条件**：飞书云空间还没有规范的资产目录，或还没有素材索引 Base。

**执行步骤**：
1. 先按 [asset-index-base-schema.md § 何时不需要建这张 Base](references/asset-index-base-schema.md#何时不需要建这张-base) 与用户确认是否真的需要 Base——若否，本模式只做物理层
2. 读 `references/folder-structure.md` 与 `references/asset-index-base-schema.md`，对齐双层结构
3. **物理层**：用 `lark-drive` 在飞书云空间创建根文件夹 `{店铺名}-素材库`，下建 5 个一级文件夹：`商品/`、`品牌/`、`客户/`、`工作室/`、`待处理/`。**不建任何子目录**
4. **语义层**（如需要）：用 `lark-base` 在与商品/订单/客户 Base 同一个空间创建 `{店铺名}-素材索引` Base，按 schema 建字段（关联字段必须指向已有的三张 Base）和推荐视图
5. 落盘后告诉用户：根目录链接 + Base 链接（如建了） + 简要使用约定

> **建库阶段不批量迁移已有素材**——只创建空骨架。让用户自己分批迁过来；迁的过程中可以求助本 skill 给命名建议 +（要用的）录索引。实际归档动作走模式 B：**默认 B1 dump（新素材全进 待处理/，不进 Base）→ B2 promote（分类 + 移入对应文件夹 + 进 Base）**。

### 模式 B：归档新素材

**进入条件**：用户上传了新摄影 / 视频 / 设计 / 模板 / 客户素材，需要按规范归档。

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
- 不问分类归属（商品/品牌/客户/工作室的分类延后到 B2）
- **不录素材索引 Base**

#### 模式 B2：promote（分类 + 移入对应文件夹 + 录 Base）

**进入条件**：
- 用户挑了某张图准备用（写 listing / 出 pin / 发 IG）
- 用户主动整理 待处理/ 中的素材
- 下游 skill（pinterest-autopin / listing-catalog）查 Base 时发现该素材还没录入，反向触发本模式

**执行步骤**：
1. 读 [naming-convention.md](references/naming-convention.md)：成品文件命名规则
2. 读 [asset-types.md](references/asset-types.md)：识别素材该归到哪个一级文件夹
3. **分类**：判断素材归属——商品 / 品牌 / 客户 / 工作室。判断依据见 [asset-types.md](references/asset-types.md) 的类型→文件夹映射表
4. **物理动作**：
   - 如素材需编辑（**用户在外部工具完成**——本 skill 不做图像编辑）：裁切 / 调色 / 加水印 → 按规范命名
   - 用 `lark-drive` 将文件从 `待处理/` 移入对应一级文件夹。例：
     ```
     待处理/IMG_3847.JPG → 商品/TEACUP-001_listing-cover_01.jpg
     ```
5. 用 `lark-drive` 拿到飞书云空间文件链接
6. **录入素材索引 Base**——按 [asset-index-base-schema.md § 录入约定](references/asset-index-base-schema.md#录入约定模式-b2-promote-时执行) 执行；用 `lark-base` 新增一行，**录入前列出将写入的字段值清单等用户确认**
7. 商品 Base 该 SKU 行通过"关联 SKU"反向就能看到本条素材；商品 Base 的"照片链接"跳转字段如需手动维护，参 [asset-types.md § 与 listing-catalog 的协作](references/asset-types.md#与-listing-catalog-的协作)

> **视觉合规检查（B2 时）**：对照 BRAND.md 视觉禁区做自检，结论写进 Base 的"BRAND 合规"字段（不通过时理由写"备注"）。详见 [asset-types.md § 视觉合规自检](references/asset-types.md#视觉合规自检b2-promote-时)。

> **客户拍摄 / UGC 类**：必须挂"关联订单 + 关联客户"，且归入 `客户/` 文件夹。`公开授权 = 待沟通` 时可以 promote（已经决定要用、正在去要授权），但**不要勾任何渠道用途标签**；改成 `已授权` 后才能勾用途 / 投渠道。

### 模式 C：查找

**进入条件**：用户要找素材（"某 SKU 的图"、"那个新春模板"、"Logo PNG 透明底"、"客户 UGC 里能发 Pinterest 的"）。

#### 已录入 Base 的素材 → 走素材索引 Base

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
| 1 | 商品 Base 该 SKU 行 | 必需 | SKU 不在 Base：**阻塞** + 提示用户先回 listing-catalog 模式 A 建一行最小记录（至少 title + 品类），再回模式 D。本 skill 不偷偷建 Base 行 |
| 2 | `<workspace>/BRAND.md` § 视觉原则 + § 视觉禁区 | 必需但**降级可跑** | 缺失：§B Mood 段输出 "⚠️ BRAND.md 未建立——本段先留空，回 shop-foundation 建库后回头补"，brief 仍可出 §A/§C/§D/§E |
| 3 | listing-catalog 礼物词库（4 类：受众 / 场景 / 节日 / 包装）| 强烈推荐**不阻塞** | 来源分两种：**(a) 反向触发** → listing-catalog 现传词库 in-memory；**(b) 主动触发** → 从该 SKU 的 Base description 段 3 + tags 礼物槽抽取已 fused 文本；提示用户"如想用最新结构化词库可回 listing-catalog 重跑 step 5.5" |
| 4 | listing-catalog eRank 调研产物（如已存）| 可选 | 缺失：跳过，§B 不引用同类店铺风格 |
| 5 | `<workspace>/SHOP.md` § 物料 / 礼盒服务 | 可选 | 缺失：§A 表第 9 行 packaging 计划写"未配置物料 → 拍裸品 + 简包装"，提示补 SHOP.md |

**执行步骤**：
1. **检查 SKU 是否在商品 Base**——不在则阻塞，提示用户回 listing-catalog 模式 A 建一行最小记录后再回
2. **检查 brief 是否已存在**（`商品/{SKU}_shoot-brief.md`）——已存在则强制问："覆盖 / 重命名旧版保留 / 仅补拍缺位（部分跑）"。重命名时旧版改为 `{SKU}_shoot-brief_{原生成日期 YYYY-MM-DD}.md`
3. **若选"部分跑"**：用 `lark-base` 反查素材索引 Base 该 SKU 已 promoted 素材的"用途标签"，按 [etsy-listing-photo-slots.md § 槽位 ID 与素材索引 Base "用途标签"字段对齐](references/etsy-listing-photo-slots.md#3-槽位-id-与素材索引-base-用途标签-字段对齐) 推断已覆盖槽位；列给用户确认缺哪几位 → 仅填模板 §A 缺位行 + §C 对应镜头清单段；§B Mood 段沿用旧 brief
4. 读上述输入（按本节"输入"表 + 降级规则）
5. 读 [references/etsy-listing-photo-slots.md](references/etsy-listing-photo-slots.md)：通用 10 槽位社区 SOP（PR1 不按品类细化）
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
- brief **不进** 素材索引 Base（brief 是文档不是素材）
- brief **不预创建**其他文件（拍不拍是另一回事，素材由 B1 dump 真正回片时上传）
- brief **不批量聚合**：批量调用 = 循环跑 N 遍，N 份独立 brief；集中 shoot 时由用户拼合并单
- brief 已存在时**强制问**"覆盖 / 重命名 / 部分跑"，不靠用户主动声明
- 不做图像生成 / 编辑——AI 合成走 `image-synth` skill；本 skill 模式 D step 10 末尾会反向触发它（用户选"不拍直接合成"路径）。不主动调 Etsy / Pinterest 抓参考图（用户在 §D 手填）

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束。本 skill 特有禁区：

- **文件操作前列出动作清单** → 等用户确认 → 执行（lark-drive）
- **Base 录入前列出字段值清单** → 等用户确认 → 写入（lark-base）
- **不删除原始素材**：摄影原图（RAW / 高清 JPG）一旦归档，本 skill 不主动删除（容量管理由用户人工决策）
- **不替用户处理图片内容**：只管目录、命名、归档、索引；裁切 / 调色 / 加水印等由用户人工或其他工具
- **single source of truth**：每个文件在云空间只放一份——多归属靠 Base 多选字段表达，不要靠拷贝。详见 [asset-index-base-schema.md § 设计原则](references/asset-index-base-schema.md#设计原则)

---

## 与其他 skill 的协作

- **shop-foundation**：每次归档后如果发现 BRAND.md 视觉原则需要补充（比如新增"自然光必拍"这种偏好），按 shop-foundation 的沉淀流程（`references/distillation-brand.md`）提议进 BRAND.md
- **listing-catalog**：
  - 商品 Base 通过"关联 SKU"反向看到全部素材；详见 [asset-types.md § 与 listing-catalog 的协作](references/asset-types.md#与-listing-catalog-的协作)
  - **模式 D 出 brief 时**消费 listing-catalog 模式 B step 5.5 的 4 类礼物词库——反向触发场景下 listing-catalog 现传 in-memory；主动触发场景下从该 SKU 的 Base description 段 3 + tags 礼物槽抽取已 fused 文本
- **orders-customers**：客户定制参考图与 UGC 通过"关联订单 + 关联客户"挂上；UGC 授权流程（找客户沟通）由 orders-customers 完成，结果回写到 Base 的"公开授权"字段
- **image-synth**：
  - 本 skill 模式 D 出的 shoot-brief.md 是 image-synth 的**主输入源**——image-synth 解析 brief 的 §B Mood 段填 mood 词库 / §C 镜头清单填 shot-spec 词库
  - 模式 D step 11 反向触发 image-synth：用户选"不拍直接合成"时现传 brief 词库 in-memory，避免重新读文件
  - image-synth 出的 AI 合成图最终通过本 skill 模式 B2 promote 入索引 Base：素材索引 Base 的"备注"字段以 `[AI 合成] {prompt 摘要}` 前缀写入；上传到 `商品/` 文件夹，按命名规则命名
  - **v0 不动 schema**：素材索引 Base 不新增"AI 合成"词汇，仅在"备注"字段标前缀。v1 观察后再决定是否升级

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：文件名用**英文**（飞书路径中文不稳定，跨平台兼容差）；目录名可中英混用（飞书原生支持中文目录名）。
