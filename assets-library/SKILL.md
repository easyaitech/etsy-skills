---
name: assets-library
description: 维护 Etsy 店铺的视觉与素材资产库（摄影 / 视频 / 视觉模板 / 字体 / Logo / 包装物料 / 客户 UGC）。三种触发：(1) 建库：用户提到"建素材库 / 建资产库 / 建摄影目录 / 整理素材"等首次建立请求时——建文件夹骨架 + 素材索引 Base；(2) 归档：用户提到"上传新摄影 / 归档某 SKU 的图 / 整理新素材 / 上新视频 / 收到客户 UGC / 挑图发 Pinterest"等请求时——按模式 B 分流（B1 批量入冷藏 / B2 单条上货架）；(3) 查找：用户提到"找某 SKU 的图 / 查能发 Pinterest 的素材 / 看视频库 / 找某客户的 UGC"等检索请求时——找成品走 Base 多维筛选，找原片走文件夹。归档严格遵守 BRAND.md 视觉原则（如存在）。
---

# 资产库 (Assets Library)

这个 skill 维护 Etsy 店铺的视觉与素材资产，核心是**双层架构 + 冷藏/货架分离**：
- **物理层（文件夹）**——飞书云空间，每个文件唯一存放。按"raw 冷藏 / edited 货架 / 受限"语义粗分
- **语义层（素材索引 Base）**——**只收 promoted 的成品**：一行一个，多选标签 + 关联其他 Base，承载所有"网状归类"

文件夹回答"原片物理在哪 + 成品物理在哪"；Base 只回答"哪些**成品**属于哪些 SKU / 渠道 / 客户 / 用途"。两者通过"文件链接"字段连接。

> **冷藏 vs 货架**：raw 不进 Base，promoted 成品才进 Base。原片不打标签——50 张里只有 5-10 张会真用，给剩下 40 张录字段是噪音。完整背景见 [REDESIGN.md](REDESIGN.md)。

**对外的实操接口**：飞书云空间（`lark-drive`） + 素材索引 Base（`lark-base`） + 工作区根目录的 BRAND.md（视觉原则）。

> 「工作区根」指 `etsy-stack workspace` 解析出的绝对路径——见 shop-foundation §工作区路径解析。本 skill 读 BRAND.md 之前必须先调一次该命令；解析失败按 shop-foundation 的指引停下问用户，不要猜路径。

---

## 启动检查（每次激活）

开始向用户输出之前，**静默**执行一次：

```
bash ~/.local/share/etsy-skills/scripts/check-update.sh
```

脚本自带 24h 缓存，重复调用没成本。如果它打印了一行 `💡 …` 提示，把它**原样**附在你最终回复的最后一行；没输出就当无事发生。**不要**解读、不要展开、不要主动建议立刻升级。

如果脚本不存在（用户没装 stack 或自己挪了位置），跳过这一步，不要报错。

---

## 依赖关系

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` § 视觉原则 | 整体气质 / 色彩 / 排版构图 / 视觉禁区 | **B2 promote 时**用作"是否合规"自检；自检结果写进素材索引 Base 的"BRAND 合规"字段。raw 不做合规检查 |
| 商品 Base | SKU 列表 | 素材索引 Base 的"关联 SKU"字段直接关联；商品 Base 通过反向查询能看到该 SKU 的全部素材 |
| 订单 Base | 订单号 | 客户拍摄 / 客户定制类素材通过"关联订单"字段挂上 |
| 客户 Base | 客户列表 | UGC 类素材通过"关联客户"字段溯源授权 |

---

## 三种执行模式

### 模式 A：建库（首次建立双层骨架）

**进入条件**：飞书云空间还没有规范的资产目录，或还没有素材索引 Base。

**执行步骤**：
1. 先按 [asset-index-base-schema.md § 何时不需要建这张 Base](references/asset-index-base-schema.md#何时不需要建这张-base) 与用户确认是否真的需要 Base——若否，本模式只做物理层
2. 读 `references/folder-structure.md` 与 `references/asset-index-base-schema.md`，对齐双层结构
3. **物理层**：用 `lark-drive` 在飞书云空间创建根文件夹 `{店铺名}-素材库`，按推荐骨架建子目录（视频暂不做可跳过）
4. **语义层**（如需要）：用 `lark-base` 在与商品/订单/客户 Base 同一个空间创建 `{店铺名}-素材索引` Base，按 schema 建字段（关联字段必须指向已有的三张 Base）和推荐视图
5. 落盘后告诉用户：根目录链接 + Base 链接（如建了） + 简要使用约定

> **建库阶段不批量迁移已有素材**——只创建空骨架。让用户自己分批迁过来；迁的过程中可以求助本 skill 给命名建议 +（要用的）录索引。实际归档动作走模式 B：**默认 B1 dump（落盘到 raw / shoot-archive，不进 Base）→ B2 promote（编辑成品 + 进 Base）**。

### 模式 B：归档新素材

**进入条件**：用户上传了新摄影 / 视频 / 设计 / 模板 / 客户素材，需要按规范归档。

分两个子模式——B1 落冷藏不录 Base，B2 上货架录 Base：

#### 模式 B1：dump（批量入冷藏，**不**录 Base）

**进入条件**：刚拍完 shoot 回来 / 客户发了一堆图 / 老素材搬迁——总之是**一批未策展的原片**先要落盘。

**只问 1 次**（不要边走边追问），用以下决策树定 dump 目的地：

```
本批是？
  ├─ 一次拍摄回来的整批         → 1. 摄影/shoot-archive/{date}_{label}/   （整批 shoot 默认）
  ├─ 单个 SKU 的零散补拍         → 1. 摄影/by-SKU/{SKU}/raw/               （已知 SKU 快路径）
  └─ 客户发来的图（含订单号）   → 7. 受限/客户拍摄/{ORDER}/               （UGC 槽位，目前少见）
```

不能直接判断时的默认推断：批量大（50+）或文件名都是相机原始命名（`IMG_xxxx`）→ 推 a；少量 + 能明确归到单 SKU → 推 b；用户提了订单号 → 推 c。

**执行步骤**：
1. 用 `lark-drive` 创建目标子目录（如缺）
2. 上传 / 移动文件到目标路径；**shoot-archive 区接受保留相机原始文件名**（`IMG_1234.JPG`），不强制走 [naming-convention.md](references/naming-convention.md) 重命名——批量重命名收益太低，规范命名延后到 B2 promote
3. 给用户回执：路径 + 文件数 + 一句"这批已入冷藏，要用时走模式 B2 promote"

**B1 明确不做的事**（避免重蹈"录入即合规"覆辙）：
- 不问 BRAND 合规
- 不问用途标签
- 不问关联 SKU（多 SKU 批次的归属延后到 B2）
- **不录素材索引 Base**

**B1 唯一硬要求**：客户拍摄类必须知道关联订单号（决定 `7. 受限/客户拍摄/{ORDER}/` 落哪个子目录）。

#### 模式 B2：promote（单条上货架，录 Base）

**进入条件**：
- 用户挑了某张图准备用（写 listing / 出 pin / 发 IG）
- 下游 skill（pinterest-autopin / listing-catalog）查 Base 时发现该素材还没录入，反向触发本模式

**执行步骤**：
1. 读 [naming-convention.md](references/naming-convention.md)：成品文件命名规则
2. 读 [asset-types.md](references/asset-types.md)：识别成品该归到哪个粗分目录
3. 物理动作（**用户在外部工具完成**——本 skill 不做图像编辑）：从 `raw/` 或 `shoot-archive/` 挑出原片 → 编辑（裁切 / 调色 / 加水印）→ 导出到 `edited/` / `scene/` 等成品子目录，按规范命名。例：
   ```
   素材库/1. 摄影/by-SKU/TEACUP-001/edited/2026-05-05_TEACUP-001_morning-light_001.jpg
   ```
4. 用 `lark-drive` 拿到飞书云空间文件链接
5. **录入素材索引 Base**——按 [asset-index-base-schema.md § 录入约定](references/asset-index-base-schema.md#录入约定模式-b2-promote-时执行) 执行；用 `lark-base` 新增一行，**录入前列出将写入的字段值清单等用户确认**
6. 商品 Base 该 SKU 行通过"关联 SKU"反向就能看到本条素材；商品 Base 的"照片链接"跳转字段如需手动维护，参 [asset-types.md § 与 listing-catalog 的协作](references/asset-types.md#与-listing-catalog-的协作)

> **视觉合规检查（B2 时）**：对照 BRAND.md 视觉禁区做自检，结论写进 Base 的"BRAND 合规"字段（不通过时理由写"备注"）。详见 [asset-types.md § 视觉合规自检](references/asset-types.md#视觉合规自检b2-promote-时)。

> **客户拍摄 / UGC 类**：必须挂"关联订单 + 关联客户"。`公开授权 = 待沟通` 时可以 promote（已经决定要用、正在去要授权），但**不要勾任何渠道用途标签**；改成 `已授权` 后才能勾用途 / 投渠道。

### 模式 C：查找（按"找成品"还是"找原片"分流）

**进入条件**：用户要找素材（"某 SKU 的图"、"那个新春模板"、"Logo PNG 透明底"、"客户 UGC 里能发 Pinterest 的"）。

#### 找成品（promoted）→ 走素材索引 Base

Base 是为多维检索而生，但**只覆盖 promoted 集合**：

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

#### 找原片（raw）→ 走文件夹

raw / shoot-archive / 受限/客户拍摄 区的原片**不在 Base**——找原片直接打开对应目录：

| 用户问 | 直接打开的目录 |
|---|---|
| "TEACUP-001 那批原图" | `1. 摄影/by-SKU/TEACUP-001/raw/` |
| "上周拍的 morning-light 那场 shoot" | `1. 摄影/shoot-archive/2026-XX-XX_morning-light/` |
| "ORDER-2026-001 客户原图" | `7. 受限/客户拍摄/ORDER-2026-001/` |

这是设计取舍：raw 区不可多维筛选，但你查 raw 一般就是为了挑一张走 B2 promote。Base 视图保持精炼，只回答 promoted 集合的问题。

#### 边界情况

- **Base 不存在**：回退到 `lark-drive` 直接搜文件名 + 引用 `references/folder-structure.md` 推断目录位置
- **找的是成品但 Base 里没有**：意味着这张应该 promote 了但还没——提示用户"这张还在冷藏区，要不要现在走模式 B2 promote 一下？"

---

## 写入前的硬性约束

通用协议见 shop-foundation §写入前的硬性约束。本 skill 特有禁区：

- **文件操作前列出动作清单** → 等用户确认 → 执行（lark-drive）
- **Base 录入前列出字段值清单** → 等用户确认 → 写入（lark-base）
- **不删除原始素材**：摄影原图（RAW / 高清 JPG）一旦归档，本 skill 不主动删除（容量管理由用户人工决策）
- **不替用户处理图片内容**：只管目录、命名、归档、索引；裁切 / 调色 / 加水印等由用户人工或其他工具
- **single source of truth**：每个文件在云空间只放一份——多归属靠 Base 多选字段表达，不要靠拷贝。详见 [asset-index-base-schema.md § 设计原则](references/asset-index-base-schema.md#设计原则)

---

## 与其他 skill 的协作

- **shop-foundation**：每次归档后如果发现 BRAND.md 视觉原则需要补充（比如新增"自然光必拍"这种偏好），按 shop-foundation 的沉淀流程（`references/distillation-brand.md`）提议进 BRAND.md
- **listing-catalog**：商品 Base 通过"关联 SKU"反向看到全部素材；详见 [asset-types.md § 与 listing-catalog 的协作](references/asset-types.md#与-listing-catalog-的协作)
- **orders-customers**：客户定制参考图与 UGC 通过"关联订单 + 关联客户"挂上；UGC 授权流程（找客户沟通）由 orders-customers 完成，结果回写到 Base 的"公开授权"字段

---

## 工作语言

通用规则见 shop-foundation §工作语言。本 skill 特有：文件名用**英文**（飞书路径中文不稳定，跨平台兼容差）；目录名可中英混用（飞书原生支持中文目录名）。
