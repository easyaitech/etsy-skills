# assets-library 增设计：模式 D — plan（拍前出 brief）

> **⚠️ 路径已过时**：本文档中的文件夹路径（`1. 摄影/by-SKU/{SKU}/shoot-brief.md` 等）已在 2026-05-08 扁平化重构中废弃。当前 brief 存储路径为 `商品/{SKU}_shoot-brief.md`。详见 [references/folder-structure.md](references/folder-structure.md)。本文档保留作为模式 D 设计决策的历史记录。

状态：APPROVED — 可进 PR1 起草
Reviewer：2 轮（round 1 = 6/10 → round 2 = 8/10 PASS）
前置讨论：/office-hours 会话（用户：johnz / 日期：2026-05-07）
方案：B (Ideal Architecture — Etsy 图位 SOP 独立词库 + listing-catalog 反向触发 + 三段式 brief)
核心单元：SKU
brief 输入：复用 listing-catalog 调研产物
影响范围：assets-library/SKILL.md 加模式 D；新增 references/etsy-listing-photo-slots.md + references/shoot-brief-template.md；listing-catalog/SKILL.md 模式 B 加 step 7.5 反向触发；folder-structure.md 一行；CHANGELOG / README 各一句。
Supersedes: 无（首版）

---

## 1. 背景与决定

### 现状的问题

assets-library 当前 4 个模式（A 建库 / B1 dump / B2 promote / C 查找）覆盖了"原料归档 / 成品上货架 / 检索"全链路，但**接到原料前的"决定拍什么"是空白**。摄影是工业化操作，没有 brief 上手就拍 = 拍出来的 50 张里只有 5-10 张能用，再叠加"Etsy listing 关键图位（hero / scale / packaging / size chart）经常忘拍 → 补拍" 这种典型摩擦。

跨境 Etsy 卖家的实际节奏是 **a 集中 shoot 主 + b 零散补拍辅**，集中 shoot 一次涉及多个 SKU。没有 brief 时：

- **拍前**：脑子里规划，没文档；摄影师（外包 / 自己）拿不到清单，全靠口头交代
- **拍中**：忘拍 packaging / size chart 是常态
- **拍后**：B1 dump 落盘，B2 promote 时发现某图位空缺 → 只能补拍

### 翻转

> brief 不是拍完后整理用的清单，是**拍前给摄影执行单**。同构 stack 的「输入 → 词库 → 文案」：
> - 输入 = SKU 行 + BRAND.md（必需）+ listing-catalog 调研产物（强烈推荐但不阻塞，缺则降级跑）
> - 词库 = Etsy 10 图槽社区 SOP（独立 reference；非平台 enumerated slots）
> - 产物 = 一份 markdown shoot brief

### 跟现有结构的契合

- assets-library 模式 A/B/C 不动，加**模式 D（plan）作为模式 B1 的前置**——拍之前出 brief，拍完后回到 B1 dump 落盘
- listing-catalog 模式 B 已经在 step 5.5（礼物场景调研）产出"4 类礼物词库 + 过滤候选清单"——这套词库当前**没有结构化持久化**（被 fused 进 description 段 3 + tags 礼物槽 + title 礼物维度槽），所以模式 D 用两条路径取词：反向触发时调用方现传 in-memory；主动触发时从 Base 行的 description / tags 反推 fused 文本
- shoot brief 跟 listing 文案同 SKU 同时段产出 → **视觉叙事 / 文案叙事同源**，避免 listing 描述讲春天感、拍出来全是冬天素材
- **Etsy 平台只规定 listing 最多 10 张图 + 1 段视频，槽位无平台级语义**；本设计的 hero / variation / scale / size chart / detail / lifestyle / packaging / brand story / context / comparison 是**社区最佳实践的语义映射**，独立成 reference 文件后既能演化（社区 SOP 会随 Etsy UI 改动）也能避免误导 agent 把它当平台硬规矩

---

## 2. 模式 D 定义

### 触发

| 触发源 | 何时 | 调用形式 |
|---|---|---|
| 用户主动（单 SKU） | "给 TEACUP-001 出拍摄 brief" / "下周要上新 X，先出 brief" | 直接 invoke 本 skill 进入模式 D |
| 用户主动（批量） | "给 X/Y/Z 都出 brief" / "下周拍这三个，先出 brief" | skill **顺序**循环跑模式 D：逐 SKU 展示 → 确认 → 写盘后才进下一个；中途用户中断时已写盘的保留，未写盘的丢弃 |
| listing-catalog 反向触发 | 模式 B step 9 写 Base 完成后 | listing-catalog SKILL.md step 10（新增）：「文案定了，4 类礼物词库新鲜可用。要不要顺手让 assets-library 模式 D 出一份 shoot brief？」 |
| 老 SKU 补拍 | "TEACUP-001 要补 size chart 图" | 模式 D **部分跑**（见下方 §5 部分跑分支） |

### 输入

按以下顺序读取（**任一不存在按规则降级**，不无脑阻塞）：

| # | 输入 | 是否必需 | 缺失时怎么办 |
|---|---|---|---|
| 1 | **商品 Base 该 SKU 行** | 必需 | SKU 不在 Base：**阻塞** + 提示用户先回 listing-catalog 模式 A 建一行最小记录（至少 title + 品类），再回模式 D。本 skill 不偷偷建 Base 行 |
| 2 | **`<workspace>/BRAND.md` § 视觉原则** | 必需但**降级可跑** | 缺失：§3.B Mood 段输出 "⚠️ BRAND.md 未建立——本段先留空，回 shop-foundation 建库后回头补"，brief 仍可出 §A/§C/§D/§E |
| 3 | **listing-catalog 礼物词库**（4 类：受众/场景/节日/包装）| 强烈推荐但**不阻塞** | 来源分两种：**(a) 反向触发（step 10）** → listing-catalog 现传词库 in-memory；**(b) 主动触发** → 从该 SKU 的 Base description 段 3 + tags 礼物槽抽取已 fused 文本；提示用户"如想用最新结构化词库可回 listing-catalog 重跑 step 5.5" |
| 4 | **listing-catalog eRank 调研产物**（如 Base 已存）| 可选 | 缺失：跳过，§3.B 不引用同类店铺风格 |
| 5 | **`<workspace>/SHOP.md` § 物料 / 礼盒服务** | 可选 | 缺失：§3.A 第 9 行 packaging 计划写 "未配置物料 → 拍裸品 + 简包装"，提示补 SHOP.md |

### 输出

一份 markdown 文件：

```
1. 摄影/by-SKU/{SKU}/shoot-brief.md
```

**为什么 markdown 而非 Base 行**：brief 是文档（含场景叙事 + 镜头要点 + 参考图链接），不是结构化数据；飞书 Base 长文本字段渲染弱。文件落 by-SKU 目录跟 SKU 的 raw / edited / scene 物理同位置，shoot 时打开 `by-SKU/{SKU}/` 即看到 brief。

**brief 已存在时**：写盘前**强制问一次**"覆盖 / 重命名旧版保留 / 仅补拍缺位（部分跑）"——不靠用户主动声明，避免事后想起想保留时已经被覆盖。重命名时旧版改为 `shoot-brief.{YYYY-MM-DD}.md`（旧版的生成日期）。

**写盘机制**：lark-drive 不直接接受字符串内容；step 6 拆为 6a 本地暂存（agent 内存里 / 临时文件） → 6b lark-drive 上传到目标路径。同时 step 5.5 检查 `by-SKU/{SKU}/` 目录存在性（缺则用 lark-drive 创建中间目录）。

### 不做的事

- **不在素材索引 Base 录入** brief（brief 是文档不是素材）
- **不预创建** `shoot-archive/{date}_{label}/` 目录（拍不拍是另一回事，目录由 B1 dump 真正回片时建）
- **不做图像生成 / 编辑**（那是 `image-synth` skill；本 skill 模式 D step 11 反向触发它）
- **不主动调** Etsy / Pinterest 抓参考图（用户在 brief §D 手填）
- **不自动聚合多 SKU 成 shoot 单**（批量调用 = 循环跑 N 遍出 N 份独立 brief，集中 shoot 时由用户拼合并单——SKU 级单元保持纯净）

---

## 3. brief 三段式结构

`references/shoot-brief-template.md` 定义骨架。每份 brief 长这样：

```markdown
# {SKU} 拍摄 Brief — {YYYY-MM-DD}

> Etsy listing 槽位、风格 mood、镜头清单
> 输入来源：[x] 商品 Base [x] BRAND.md [{x|-}] listing-catalog 礼物词库（来源：反向传入 / Base 反推 / 未跑过）[{x|-}] eRank [{x|-}] SHOP.md 物料
> 适用 shoot 节奏：[ ] 集中 shoot（与 X/Y/Z 同批）  [ ] 零散补拍

---

## A. Etsy 10 槽位社区 SOP 映射表

> ⚠️ Etsy 平台只规定 listing 最多 10 张图 + 1 段视频；槽位无平台语义。下面是社区最佳实践的语义映射（详见 references/etsy-listing-photo-slots.md）。
>
> **优先级定义**：
> - **P0**：listing 上线缺则不达标（搜索结果 / 列表页主图）
> - **P1**：高优先级，几乎所有品类必有
> - **P2**：场景 / 包装类，按品类决定
> - **P3**：可选锦上添花
>
> "本 SKU 计划" 列要求至少 1 个名词性具象描述（如"白底 + 茶杯单品 + 木纹托盘"）；不接受 `TBD` / `待定` / 单纯模板词。

| 建议槽位 | 用途 | 优先级 | 必拍? | 本 SKU 计划 |
|---|---|---|---|---|
| 1 | Hero（搜索结果展示） | P0 | ✅ | {白底 or 场景 + 名词性描述} |
| 2 | Variation grid | P0 | ✅（如有变体）| {变体集合 / 单 SKU 时 N/A} |
| 3 | Scale | P1 | ✅ | {用什么参照物显示尺寸} |
| 4 | Size chart | P1 | ✅（功能性 / apparel SKU）| {规格表 / 平铺测量} |
| 5 | Detail-1 | P1 | ✅ | {材质特写} |
| 6 | Detail-2 | P1 | ✅ | {工艺特写} |
| 7 | Detail-3 | P1 | ✅ | {关键纹理 / Logo} |
| 8 | Lifestyle | P2 | ✅ | {礼物场景词库命中的具体场景} |
| 9 | Packaging | P2 | ✅ | {SHOP.md 物料 + 礼盒服务 → 包装拆箱} |
| 10 | Brand story / context | P3 | 可选 | {品牌物料 / 工坊环境 / 制作过程} |

## B. Mood / 风格指令

每行从 BRAND.md `§ 视觉原则` 抽取，**抽取规则**：每行 ≤ 20 字，取该原则下的"主观点 + 1 个具象修饰"；多原则并存时取第一条+矛盾时给最严的一条。

- **整体气质**：{1 句 ≤ 20 字，取 BRAND § 视觉原则首条}
- **配色**：{BRAND 主色（hex 值如有）+ 视觉禁区色清单}
- **光线**：{自然光 / 影棚光 + 时段建议}
- **构图**：{留白 / 黄金分割 / 平铺；从 BRAND § 视觉原则 取}
- **道具集**：{符合 BRAND 的道具白名单 ≤ 5 个名词}
- **视觉禁区**：{原文复制 BRAND.md § 视觉禁区清单——如红黄金高饱和 / 龙凤回字纹 / Comic Sans}

> 若 BRAND.md 缺失，本段输出 "⚠️ BRAND.md 未建立——本段先留空，回 shop-foundation 建库后回头补"。

## C. 镜头清单（按图位展开）

### Hero（1 张）
- **画面**：{具体描述}
- **角度**：{俯视 / 侧 45° / 平视}
- **背景**：{白底 / 木纹 / 大理石}
- **后期方向**：{保色彩自然 / 加暖调}

### Lifestyle（{N} 张）— 来自 listing-catalog 礼物场景词库
- **场景 1：{母亲节早茶}** → 画面：{母亲手握杯，窗边晨光} → 道具：{花束、贺卡、热茶}
- **场景 2：{婚礼伴娘礼物}** → 画面：{...} → 道具：{...}

(其他图位类似展开)

## D. 参考图

> PR1 范围：**仅用户手填**，skill 不主动反查素材索引 Base。
> 老 SKU 已 promoted 素材的反查 → 留作 v2 增强（先看 PR1 实战需求再决定）。

- {Pinterest 链接 / 已有 raw 链接 / 同类店铺截图飞书云空间链接}

## E. 拍摄附注

- 装置 / 道具准备清单：{...}
- 必备道具采买（缺什么）：{...}
- 估计拍摄时长：{N 小时}

---

## References（本 brief 引用的源）

- BRAND.md § 视觉原则
- 商品 Base 该 SKU 行（链接）
- listing description 段 3（如已生成）
- references/etsy-listing-photo-slots.md
```

---

## 4. references/ 新增 2 文件

### 4.1 `references/etsy-listing-photo-slots.md`（独立词库）

内容大纲：

- **首段警示**：Etsy 平台只规定 listing 最多 10 张图 + 1 段视频，槽位**没有平台级语义**；本 SOP 是社区最佳实践的语义映射，非平台 enumerated slots。Agent 必须把它当社区惯例解释给用户，不当作 Etsy 强制规则。
- **优先级定义**：P0/P1/P2/P3（与 PLAN-MODE.md §3.A 表前定义保持一致）
- **10 槽位社区语义功能**（hero / variation / scale / size chart / detail / lifestyle / packaging / brand story / context / comparison）—— 每位 1 段说明
- **每个槽位的 SOP**：必拍 / 可选；典型构图；典型尺寸（Etsy 推荐 2700×2025 主图）；常见拍摄错误
- **PR1 范围：通用 SOP**（10 槽位通解，不按品类细化）—— 按品类细化（apparel / jewelry / home & living 等）留作 v2，等 brief 至少跑过 1 次实战后再决定颗粒度
- **与 Etsy SEO 的关系**：title / tag 里的关键词应该在视觉里能看到（搜 "morning tea cup" 命中 → 主图必须呈现 morning tea 场景）

**为什么独立成文件**：Etsy 改 listing UI 有先例（2021 加 video slot；2023 整 listing UI），独立文件演化时只动这一个，不牵动 SKILL.md 主体。

### 4.2 `references/shoot-brief-template.md`（模板骨架）

按上面 §3 的三段式结构成文。**注意**：

- 模板里要带字段空槽（让 agent 填具体内容）
- **何时跳过某段的指令**：SKU 无变体 → variation grid 行写 N/A；digital SKU 无 packaging → §A 第 9 行 strikethrough
- 输入来源勾选 placeholder（实际跑时勾"已读 BRAND / 已读礼物词库"等，让用户一眼看到 brief 是基于什么生成的）

---

## 5. SKILL.md 模式 D 章节草案

加到 assets-library/SKILL.md 第 4 个模式（C 之后）：

```markdown
### 模式 D：plan（出拍摄 brief）

**进入条件**：
- 用户主动单 SKU："给 {SKU} 出拍摄 brief" / "下周要上新 X，先出 brief"
- 用户主动批量："给 X/Y/Z 都出 brief" / "下周拍这三个，先出 brief"（循环跑模式 D，每个 SKU 独立产 brief）
- listing-catalog 反向触发（模式 B step 10）—— **PR2 后激活**
- 老 SKU 补拍补槽位（**部分跑**分支——见下方关键约束）

**执行步骤**：
1. **检查 SKU 是否在商品 Base**——不在则阻塞，提示用户回 listing-catalog 模式 A 建一行最小记录后再回
2. **检查 brief 是否已存在**（`by-SKU/{SKU}/shoot-brief.md`）——已存在则强制问："覆盖 / 重命名旧版保留 / 仅补拍缺位（部分跑）"。重命名时旧版改为 `shoot-brief.{原生成日期 YYYY-MM-DD}.md`
3. **若选"部分跑"**：用 lark-base 反查素材索引 Base 该 SKU 已 promoted 素材的"用途标签"，推断已覆盖槽位；列给用户确认缺哪几位 → 仅填 §3.A 表缺位行 + §3.C 对应镜头清单段；§3.B Mood 段沿用旧 brief

   > **跨文件契约**：素材索引 Base "用途标签"字段词汇表必须与 references/etsy-listing-photo-slots.md 槽位 ID 对齐（hero / variation / scale / size-chart / detail / lifestyle / packaging / brand-story / context / comparison）。当前 schema 若未对齐 → 本步降级为"让用户口头列已覆盖槽位"；建库时由 PR1 顺带补齐 schema 词汇表。
4. 读输入（按本文件 §2 输入表顺序 + 降级规则）
5. 读 references/etsy-listing-photo-slots.md：通用 10 槽位 SOP（PR1 不按品类细化）
6. 读 references/shoot-brief-template.md：拿模板骨架
7. 填三段式 brief（A 槽位映射 / B mood / C 镜头清单 / D 参考图占位 / E 附注 / References 链接段）
8. **展示给用户**等确认（不主动写盘）；用户调整后再写
9. 写盘：
   - 9a. 用 lark-drive **逐层检查并创建**（不假设 lark-drive 提供 `mkdir -p` 语义）：
     - 检查素材库根目录存在；缺 → 阻塞，提示用户先跑模式 A
     - 检查 `1. 摄影/`；缺 → 用 lark-drive 创建
     - 检查 `1. 摄影/by-SKU/`；缺 → 创建
     - 检查 `1. 摄影/by-SKU/{SKU}/`；缺 → 创建
   - 9b. 在临时位置（agent 内存 / 临时本地文件）生成 markdown 内容
   - 9c. 用 lark-drive 上传到 `1. 摄影/by-SKU/{SKU}/shoot-brief.md`
10. 给用户回执：文件链接 + "拍完后走模式 B1 dump"

**关键约束**：
- brief **不进** 素材索引 Base
- brief **不预创建** shoot-archive 目录
- brief **不批量聚合**：批量调用 = 循环跑 N 遍，N 份独立 brief
- "部分跑"判定路径：lark-base 反查素材索引 Base 关联 SKU = {SKU} 的 promoted 素材，按"用途标签"推断覆盖（如 hero / detail / packaging），未覆盖即缺位
- listing-catalog 反向触发条目在 PR1 时**仅声明不可达**——PR2 ship 后才真正被 caller 触发
```

---

## 6. listing-catalog SKILL.md 反向触发

放在 listing-catalog 模式 B **step 9 完成后**作为新 step 10（避免 9.5 这种半步号跟现有体系冲突；listing-catalog SKILL.md 当前 step 9 是末步）。**节奏定位**：step 10 是 step 9 完成后**同一 turn 内** agent 主动追问的可选环节（不是 step 9 的子步骤），用户回应后才 invoke 下一个 skill。

**最终位置**：模式 B step 9 之后加 step 10：

```markdown
10. **(可选) 反向触发 shoot brief** — listing 文案写入 Base + 提醒贴 Etsy 后，如果该 SKU 还没有 `1. 摄影/by-SKU/{SKU}/shoot-brief.md`：
    - 提示用户："文案定了，刚生成的 4 类礼物词库 + Mood 新鲜可用。要不要顺手让 assets-library 模式 D 出一份 shoot brief？这样下次集中 shoot 直接按单拍。"
    - 用户同意 → invoke assets-library 进入模式 D，**调用方现传** 4 类礼物词库（in-memory），mode D 直接用，不走 Base 反推
    - 用户跳过 → 静默跳过（不阻塞）
```

不阻塞主流程，是辅助提示。**不动 step 7-9 主体**。礼物词库以 in-memory 方式现传给 mode D —— 这避免了 listing-catalog Base schema 加新字段的改动量。

---

## 7. 其他文档调整（小动作）

### 7.1 assets-library/SKILL.md 头部"对外的实操接口"段补一句

原版："飞书云空间（lark-drive）+ 素材索引 Base（lark-base）+ 工作区根目录的 BRAND.md（视觉原则）"

加："+ 商品 Base（lark-base，模式 D 读 SKU 行）"

> 注意：
> - 礼物词库不是接口而是**输入数据**，已在本文件 §2 列出，不在"对外接口"段重复
> - SHOP.md 是 shop-foundation 间接依赖（通过工作区根读取），不在本 skill 的"对外接口"段重列；§2 输入表已记

### 7.2 assets-library/SKILL.md 三种 → 四种模式

把 `## 三种执行模式` 改成 `## 四种执行模式`。

### 7.3 references/folder-structure.md 加一行

`1. 摄影/by-SKU/{SKU}/` 子目录列表（当前是 `raw/` `edited/` `scene/`）补一行：

```
└── shoot-brief.md       ← 模式 D 出的拍摄 brief（拍前看；不进 Base）
```

### 7.4 README / CHANGELOG

CHANGELOG 一行：`feat(assets-library): 加模式 D plan（拍前出 shoot brief）`
README 在 skill 列表行补一句"含模式 D 拍前 brief 生成"

### 7.5 etsy-stack.json

不动（模式 D 是 assets-library 的内部扩展，不是新 skill）。

---

## 8. 落地步骤建议

按你 iterative ship 风格，拆 2 个 PR：

**PR 1 — assets-library 加模式 D（自包含）**
- 加 `assets-library/references/etsy-listing-photo-slots.md`
- 加 `assets-library/references/shoot-brief-template.md`
- assets-library/SKILL.md 加模式 D 章节、三种 → 四种、对外接口段
- assets-library/references/folder-structure.md 加 shoot-brief.md 一行
- CHANGELOG / README 一行

**PR 2 — listing-catalog 反向触发（可选，PR1 ship 后单独跑）**
- listing-catalog/SKILL.md 加 step 10 反向触发段
- CHANGELOG 一行

PR1 自包含可独立跑（用户主动 invoke 模式 D）；PR2 把 listing-catalog → assets-library 链路接上（上新流程闭环）。

---

## 9. 剩余开放问题（不阻塞 PR1）

1. **Etsy 槽位 SOP 按品类细化**：PR1 只做通用 10 槽位 SOP（v1 决议）；按品类细化（apparel / jewelry / home & living / digital / paper goods）等 brief 至少跑过 1 次实战后再决定颗粒度，避免 over-engineering。
2. **§D 参考图反查兜底**：PR1 决议**只手填，无反查**。老 SKU 已 promoted 素材的反查（用 lark-base 反查素材索引 Base）留作 v2 增强，先看 PR1 实战需求是否真痛。
3. **listing-catalog 礼物词库结构化持久化**：本设计走 in-memory 现传 + Base description 反推，避开 schema 改动。如果未来 brief 反推命中率太低（用户抱怨"模式 D 出的 Lifestyle 段跟 listing 礼物叙事不一致"），再考虑给 listing-catalog Base 加 4 个礼物词库字段。当前不动。

---

## 10. 成功标准

PR1 ship 后符合以下条件即视为模式 D 工作正常：

1. 主动 invoke "给 TEACUP-001 出 shoot brief" → 在该 SKU 的 by-SKU 目录看到一份 markdown brief
2. brief §A 表所有 P0/P1 行的"本 SKU 计划"列含 ≥ 1 个名词性具象描述（不是 `TBD` / `待定` / 单纯模板词）
3. brief §C 镜头清单的 Lifestyle 段引用了 listing-catalog 礼物场景调研词库——主动触发场景下从 Base description / tags 反推；如 SKU 没跑过 listing 流程则该段输出占位 + 提示用户"如要充实 Lifestyle 段，先回 listing-catalog 模式 B 跑 step 5.5"
4. brief §B Mood 段不出现 BRAND.md 视觉禁区清单里的元素（自检）
5. 老 SKU "部分跑"场景跑得通：用 lark-base 反查素材索引 Base 推断已覆盖槽位 → 列给用户确认 → 仅填缺位行 + 对应镜头清单段
6. **降级路径全跑通**：BRAND.md 缺失时输出 "⚠️" 占位仍可出 brief；SKU 不在 Base 时阻塞 + 提示走 listing-catalog 模式 A
7. **brief 已存在**时强制问"覆盖 / 重命名 / 部分跑"，不靠用户主动声明
8. **lark-drive 写盘**：缺 by-SKU/{SKU}/ 目录时自动建中间目录；缺整个素材库根目录时阻塞提示用户先跑模式 A

PR2 ship 后：

9. listing-catalog 模式 B step 9 完成后正确触发 step 10 提示
10. step 10 调用 mode D 时**现传 4 类礼物词库**（in-memory），mode D 直接用，不走 Base 反推
11. 用户跳过 step 10 不阻塞剩余流程

---

## 11. What I noticed

> 你直接说"我们先升级 assets-library，决定拍什么"

你听完图片设计 skill 拆开 vs 合并的分析后，没纠结另一个新 skill（image-design）的形状，直接把焦点压到"拍前规划"这一层。两个 skill 的价值密度其实差不多，但你识别出了**顺序依赖**——决定拍什么 → 实际拍 → 加工 → 上架，没拍对的素材后期 Image2 救不回来。先把上游闭环打紧，下游 skill 做时输入质量已经稳定。这是供应链思维：先把瓶颈在上游堵住，下游才有活路。

> 全部同意，进下一步

8 条 premises 一次过没挑刺。这跟 REDESIGN.md 里"直接说走方案 B"是同一种气质——推荐链如果说得通就 ship，不浪费一轮 round-trip。这种 edit-on-the-margins 风格让设计快速收敛；代价是你赌设计师把推导链摆得足够清晰，不留隐性陷阱。Phase 5 reviewer x2 ≥8/10 是这种风格的安全网。

> 三次决策都 pick recommended

SKU 级 brief、复用 listing-catalog 调研、Approach B（Ideal Architecture）—— 三次都跟 recommendation 一致。这不是省事，是你已经内化了 stack 同构原则（输入 → 词库 → 文案）；推荐选项每次都最贴合这个原则，所以你认得出。这种"原则驱动 + 一眼识别"是 stack 设计师阶段的标志——不是被推着选，是早就有判据。
