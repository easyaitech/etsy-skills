# assets-library 重设计：dump-then-promote

> **⚠️ 路径已过时**：本文档中的文件夹路径（`1. 摄影/by-SKU/`、`shoot-archive/`、`7. 受限/` 等）已在 2026-05-08 扁平化重构中废弃。当前结构为 5 个一级文件夹（商品 / 品牌 / 客户 / 工作室 / 待处理），无任何子目录。详见 [references/folder-structure.md](references/folder-structure.md)。本文档保留作为"dump-then-promote"设计决策的历史记录，核心原则不变。

状态：APPROVED — 可进 PR1 起草
前置讨论：/office-hours 会话（用户：john / 日期：2026-05-05）
方案：B（双层架构 = 原片库冷藏 + 成品库货架）
拍照节奏：a (集中 shoot) 为主 / b (零散补拍) 为辅 / c (UGC) 当前不活跃但保留架构槽位
影响范围：assets-library SKILL.md 模式 B、asset-index-base-schema 设计原则、与 pinterest-autopin 的接口约定。folder-structure / naming-convention 几乎不动。

---

## 1. 背景与决定

### 现状的问题

当前 `asset-index-base-schema.md` 要求每张素材进 Base 一行，必填 6 字段 + 条件必填 5 字段。一次拍 50 张照片 = ~300 个录入决策。再叠加设计原则 4「录入即合规」，BRAND 视觉自检被压到每张原片，但实际只有 5-10 张会真正用上。剩下 40 张要么"假装通过"要么停在"待整理"，半年后 Base 噪音占主导。

### 翻转

> 不是"每张素材都进 Base"。是**每张被用过 / 准备用的素材才进 Base**。
> 文件夹是冷藏库（raw），Base 是货架（edited / 成品）。冷藏库不打标签，货架才打。

### 跟现有结构的契合

幸运的是 `folder-structure.md` 当前已经把 `by-SKU/{SKU}/raw/` 和 `edited/`、`scene/` 分开放（lines 21-23），还有 `shoot-archive/` 作为未整理批次区（line 28）。**物理结构不需要改**——改的是 SKILL.md 怎么用它们，以及 Base 录什么。

---

## 2. 双层定义（明确化）

| 层 | 物理位置 | 进 Base？ | 触发录入的事件 |
|---|---|---|---|
| **冷藏 / raw 层** | `1. 摄影/by-SKU/{SKU}/raw/` 或 `1. 摄影/shoot-archive/{date}_{label}/` | ❌ 不进 | — |
| **货架 / 成品层** | `1. 摄影/by-SKU/{SKU}/edited/` 或 `scene/`；视频 `edited/`；模板 / Logo / 物料目录；`7. 受限/客户拍摄/{ORDER}/`（已授权部分） | ✅ 进 | 编辑导出后 / 用户决定准备使用 / 客户给完授权 |

raw 文件**永远只在物理层存在**。要查"店里所有 TEACUP-001 的原片"——直接打开 `by-SKU/TEACUP-001/raw/` 文件夹。Base 的视图回答的是"准备用 / 已经用过"的成品集。

---

## 3. SKILL.md 模式 B 重写

当前 SKILL.md 模式 B（lines 58-76）合并了"上传"和"录入"。拆成两个子模式：

### 模式 B1：dump（批量入冷藏）

**触发**：用户上传一批新原片（拍完 shoot 回来 / 客户发了一堆图 / 老素材搬迁）。

**执行**：
1. 识别批次类型：单 SKU shoot / 跨 SKU shoot / 客户发来的 UGC / 个人参考
2. 落盘路径：
   - 单 SKU shoot 已确定 SKU → `1. 摄影/by-SKU/{SKU}/raw/`
   - 多 SKU 或未定 → `1. 摄影/shoot-archive/{date}_{label}/`，等用户后续整理拆到 by-SKU
   - 客户 UGC 未授权 → `7. 受限/客户拍摄/{ORDER}/`
3. 文件名按 `naming-convention.md` 落规范，但**不进 Base**
4. 给用户回执：路径 + 文件数 + "这批已入冷藏，要用时模式 B2 promote"

**关键约束**：
- B1 **不**问 BRAND 合规
- B1 **不**问用途标签
- B1 **不**问关联 SKU（如果整批同 SKU，直接体现在路径里就够了；多 SKU 的延后到 promote）
- B1 **唯一**的硬要求：客户拍摄类必须知道关联订单号（决定落到 `7. 受限/客户拍摄/{ORDER}/`）

### 模式 B2：promote（单条上货架）

**触发**：用户挑了某张图准备用（写 listing / 出 pin / 发 IG）；或下游 skill（pinterest-autopin / listing-catalog）查 Base 时发现这张还没录入。

**执行**：
1. 物理动作：如果还在 `raw/` 或 `shoot-archive/`，导出编辑后的成品到 `edited/` 或 `scene/`（这一步**用户在外部工具完成**——Lightroom / PS / Canva / 飞书内编辑工具——本 skill 不做图像编辑）
2. 录入素材索引 Base 一行：必填字段全填，包括 BRAND 合规自检
3. 校验：
   - 客户拍摄类必须 `公开授权 = 已授权` 才能 promote 到非"待沟通"状态
   - BRAND 合规不通过仍可 promote，但 checkbox 留空 + 备注写理由（保留可追溯）
4. 给用户回执：Base 行链接 + "下游 skill 现在能查到了"

**反向触发**：pinterest-autopin 模式 B 第一步从"查 Pinterest 候选视图"改为：
- 视图里有 → 走原流程
- 用户指定的素材不在 Base → "这张还没 promote 进货架，先走 assets-library 模式 B2 录一行"
- 视图为空 → 提示用户从 raw 区挑一张做 B2

### 模式 A 几乎不变

模式 A（建库）保持原样，只改一处叙述：明确"raw 层不进 Base，Base 只收 promoted 成品"。

### 模式 C 几乎不变

模式 C（查找）保持原样。补一句：**raw 区的查找走文件夹**（按 SKU 目录或 shoot-archive 日期），**Base 视图只回答 promoted 集合的查询**。这是设计上的取舍：raw 区不可被多维筛选，但你也不需要——你查 raw 一定是为了 promote 一张出来。

---

## 4. asset-index-base-schema.md 调整

### 设计原则改 1 处

原则 4 「**录入即合规**：录入同时强制带 BRAND 合规自检，避免事后补登」
改为：「**Promote 即合规**：进 Base 视为"准备使用"，BRAND 合规自检在 promote 时执行；raw 层无合规义务」

### 字段表改 0 处

字段不动。所有"必填 / 条件必填"规则保持。原因：现在进 Base 的全是 promoted 素材，必填合理；raw 不进 Base，不存在录入摩擦。

### "录入约定"段重写（schema 文件 § 录入约定 = 模式 B 归档时执行）

替换为以下内容：

> ## 录入约定（模式 B2 promote 时执行；B1 dump 不录入）
>
> 1. 一次只录一行；不要给一个目录建一行抽象索引
> 2. 必填字段全填：标题 / 文件链接 / 文件名 / 类型 / 公开授权 / BRAND 合规
> 3. 关联字段按素材类型条件触发：
>    - 摄影成图 / 场景图 / 视频母版 / 视觉模板 → 关联 SKU 必填（跨 SKU 的 vlog 等可空）
>    - 客户拍摄 / 客户定制参考 → 关联订单 + 关联客户必填，且 公开授权 = 已授权 才能 promote
>    - **摄影原图 / 视频原料**（仍在 raw 区的）→ 不应该 promote，告诉用户"这是原片，要用先编辑导出到 edited/"
> 4. 用途标签可以先空着——发布到某渠道时再勾上
> 5. BRAND 合规不通过时仍然录入，checkbox 留空 + 备注写理由

### 推荐视图调整

`待整理` 视图 含义变化：
- 旧：Base 里"录入不全"的素材
- 新：Base 里"promoted 但用途标签还没勾"的素材（即只是上了货架还没分配渠道）

新增可选视图 `Raw 待 promote 提醒`：实际上 Base 查不到 raw 文件，这个视图不能在 Base 实现。改为一句使用提示放进 SKILL.md：「需要查 raw 区时直接打开 `by-SKU/{SKU}/raw/` 或 `shoot-archive/`」。

---

## 5. folder-structure.md 调整

只改 1 段：

`shoot-archive/` 当前的描述是"按拍摄批次的临时目录，用完整理到 by-SKU/"。
改为：「**dump 默认目的地**——拍完先全塞这里。整理 = 把要用的挑出来 → 编辑导出 → 落到 by-SKU/{SKU}/edited/ 并 promote 进 Base。剩下的原片留在 shoot-archive 或移到 by-SKU/{SKU}/raw/，**不进 Base**」。

`raw/` 子目录当前描述「原图 / RAW / 高清 JPG（不动 / 不裁切 / 长期保留）」。补一句：「**冷藏区，不进 Base**。要用一定先编辑导出到 edited/。」

其他不动。

---

## 6. naming-convention.md 调整

应该不动（dump 和 promote 用同一套命名）。

唯一可能补的：B1 dump 阶段允许 shoot-archive 下的文件**保留相机原始文件名**（IMG_1234.JPG）——因为 raw 不进 Base、不参与 SEO / 关联，重命名是没收益的工作。等 promote 那一刻再按规范命名 edited 导出文件。

待你确认是否接受这个松绑。

---

## 7. 与下游 skill 的接口

### pinterest-autopin

**改动**：模式 B 第一步「查 Pinterest 候选视图」 → 改为：

```
if 用户指定了素材:
    if 该素材在 Base AND 用途标签 ⊇ Pinterest AND 公开授权 = 已授权:
        ✅ 走原流程
    elif 该素材在 Base 但 用途标签 不含 Pinterest:
        提示：「这张已经在货架但没标 Pinterest 用途，先回 assets-library 给它加标签」
    else:
        提示：「这张还在冷藏区，先走 assets-library 模式 B2 promote 一下」
        中止
elif 用户未指定:
    走原流程：列 Pinterest 候选视图给用户挑
```

**Pinterest 候选视图本身不变**：仍是「素材索引 Base 用途标签 ⊇ Pinterest AND 公开授权 = 已授权」。它只是池子变小了——只有 promoted 的素材才进得来。这正是好事。

### listing-catalog

商品 Base 通过"关联 SKU"反查素材现在只能反查到 promoted 集合。这是符合预期的——listing 用图本来就是用编辑过的成图，不会用 raw。

补一条 SKILL.md 说明：「商品 Base 反查的素材 = 该 SKU 的 edited / scene 成品。raw 区原片不在反查结果里——要看原片直接打开 `1. 摄影/by-SKU/{SKU}/raw/`」。

### orders-customers

UGC 流程不变。客户拍摄落到 `7. 受限/客户拍摄/{ORDER}/`（这个目录里的文件本质上还是 raw 性质——只是物理上不在 raw/ 而在受限目录）。授权拿到后 + 用户准备使用时，按 promote 流程录入 Base，公开授权 = 已授权。

---

## 8. 节奏与 B1 默认路径（已锁定）

| 节奏 | 状态 | dump 默认目的地 | promote 时机典型 |
|---|---|---|---|
| (a) 集中 shoot | **主** | `1. 摄影/shoot-archive/{date}_{label}/` | shoot 后 1-3 天集中挑图 + 批量 promote |
| (b) 零散补拍 | 辅 | `1. 摄影/by-SKU/{SKU}/raw/` 直接落 | 当天或当周，零散 promote |
| (c) UGC | 当前不活跃 | `7. 受限/客户拍摄/{ORDER}/`（架构槽位保留） | 拿到授权 + 准备使用时 promote |

### B1 模式的默认问询路径

模式 B1 启动时按以下决策树问用户（**只问 1 次，不要边走边追**）：

```
本批是？
  ├── 一次拍摄回来的整批 → 落 shoot-archive/{date}_{label}/  (a 模式默认)
  ├── 单个 SKU 的零散补拍 → 落 by-SKU/{SKU}/raw/             (b 模式快路径)
  └── 客户发来的图 → 落 7. 受限/客户拍摄/{ORDER}/              (c 槽位，目前少见)
```

如果用户没说但批次特征明显（比如一次传 50+ 文件、文件名都是相机原始命名 IMG_xxxx）—— 默认推 a 模式；少量文件且能明显归到单 SKU —— 默认推 b 模式。

### shoot-archive → by-SKU 整理动作

a 模式 dump 完后，shoot-archive 里的原片**不强制**搬到 by-SKU/{SKU}/raw/。只有被 promote 出来的成品才进 edited/。原片可以一直留在 shoot-archive 里——直到容量管理时（按年回头）才考虑归档备份或迁移。

这一条是对当前 folder-structure.md 的隐性松绑：原版"shoot-archive 用完整理到 by-SKU/" 这句不再强制，只是"想归类的可以搬，不想搬的留着也行"。

---

## 9. 落地步骤建议

按你 iterative ship 风格，拆 2-3 个 PR：

**PR 1 — 设计原则与文档先行（不动 Base 数据）**
- 改 `asset-index-base-schema.md` 设计原则 4 + 录入约定段
- 改 `folder-structure.md` 两段描述
- 改 `assets-library/SKILL.md` 模式 B 拆 B1 / B2
- README / CHANGELOG 一句话
- 不动现有 Base 数据，因为旧数据本来就是 promoted 性质（手动逐张录的）

**PR 2 — 下游 skill 适配**
- 改 `pinterest-autopin/SKILL.md` 模式 B 第一步的查询逻辑
- 改 `listing-catalog/SKILL.md` 反查素材的说明
- 改 `orders-customers/SKILL.md` UGC promote 时机说明

**PR 3（可选）— 视图清理**
- 在 Base 里实际改"待整理"视图的筛选条件
- 删掉旧的"BRAND 复审"视图（promote 时已经强制自检，事后复审用例减少）

---

## 10. 剩余开放问题（不阻塞 PR1）

1. **naming-convention 松绑**（§6）：dump 阶段是否接受保留相机原始文件名？倾向"接受"——shoot-archive 里 50 张文件挨个改名收益太低，promote 时再起规范名才是真正的工作。如不同意，改成"shoot-archive 接受原始名 + by-SKU/raw/ 必须按规范名"也行。
2. **archive 区编辑工作流**：你编辑图用什么工具？飞书内 / Lightroom / PS / Canva？影响 B2 promote 时给用户的提示话术（"导出后存到 …"那一句）。
3. **存量素材**：当前 Base 里已有的素材（如有）按旧规则录的，应该已经是 promoted 性质——改设计后语义一致，不需要回溯清理。如果你跑过模式 A 但还没真正录过任何素材，那直接零迁移成本。
4. **UGC 槽位激活时机**：一旦开始有客户发图，回头补一次 SKILL.md 模式 B1 的客户分支细化即可，不需要现在做。

---

## 11. What I noticed

> 你直接说"走方案 B"

你听完 3 个方案 + 推荐 + 3 条理由，直接定 B，没有再让我展开一轮。这是有边界感的决策——推荐的逻辑链如果说得通就 ship，不浪费一轮 round-trip。同样的风格也体现在节奏问题——你不是答"我也不知道"，而是直接给"a 主 b 辅 c 没有"这种带优先级的回答，把"默认路径如何选"的设计权交还给我。

> 现在素材库的设计有点复杂，每一个素材都要填写一堆的参数

你描述问题时的具象度足够触发"workflow first"思路：你没说"字段太多 / Base 太复杂"，说的是"用户的操作会是拍照，拍很多照片"。从动作出发推回设计——这个顺序本身就避免了在错的层面优化（删字段 / 加视图 / 调权限）。这是一个不太常见但很值钱的诊断习惯：先盯实际使用流程，再决定改哪一层。
