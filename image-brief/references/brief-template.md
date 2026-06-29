# Image Brief 模板（image-brief 模式 A 输出骨架）

> 本文档是 `image-brief` 模式 A 生成的 brief 文件的**模板骨架**。模式 A 执行 step 7 时，按本骨架结构填具体内容；step 9c 上传到 `商品/{SKU}_shoot-brief.md`（文件名沿用 `shoot-brief` 以保持下游 image-synth 引用契约稳定；同一份 brief 同时服务人工拍摄与 AI 合成两条生产路径）。

## 模板骨架

将下列内容作为生成的 markdown 文件的初始结构，填字段空槽（标 `{...}`）后输出给用户预览。

---

```markdown
# {SKU} 拍摄 Brief — {YYYY-MM-DD}

> Etsy listing 槽位、风格 mood、镜头清单
> 输入来源：[x] `Products 商品` 表 [x] BRAND.md [{x|-}] BRAND_MARKETING.md（§B 视觉铁律 + §C 人群/触点/场景）[{x|-}] MARKETING_PLATFORM.md § 1.2（§A/§B 平台执行）[{x|-}] listing-catalog 礼物词库（来源：反向传入 / Base 反推 / 未跑过）[{x|-}] SHOP.md 物料
> 适用 shoot 节奏：[ ] 集中 shoot（与 X/Y/Z 同批）  [ ] 零散补拍

---

## A. Etsy 10 槽位社区 SOP 映射表

> ⚠️ Etsy 平台只规定 listing 最多 10 张图 + 1 段视频；槽位无平台语义。下面是社区最佳实践的语义映射（详见 references/etsy-listing-photo-slots.md）。
>
> 优先级：**P0** 必拍（不达标）/ **P1** 高优先（几乎所有品类）/ **P2** 按品类决定 / **P3** 可选锦上添花
>
> "本 SKU 计划"列：≥1 个名词性具象描述（如"白底 + 茶杯单品 + 木纹托盘"）；不接受 `TBD` / `待定` / 单纯模板词。

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

> 抽取规则：每行从 BRAND.md `§ 视觉原则` 抽 ≤ 20 字 = 主观点 + 1 个具象修饰；多原则并存时取首条+矛盾时给最严的一条。
>
> **三源分层（冲突按阶梯裁决，高层压低层）**：① BRAND.md § 视觉禁区（绝对 veto）> ② BRAND_MARKETING.md 第 5 章红线 / 第 4 章视觉调性铁律（营销宪法）> ③ MARKETING_PLATFORM.md 平台红线 / § 1.2 视觉规范（平台执行，适配不破上层）。详见 SKILL.md「视觉规则分层 + 冲突裁决阶梯」。
>
> ⚠️ 若 BRAND.md 缺失，本段输出 "⚠️ BRAND.md 未建立——本段先留空，回 shop-foundation 建库后回头补"，brief 仍可出 §A/§C/§D/§E。
> ⚠️ 若 BRAND_MARKETING.md 缺失，「视觉铁律层」行标 "⚠️ BRAND_MARKETING.md 未建立——本行留空"；若 MARKETING_PLATFORM.md 缺失（非内置平台），「平台视觉规范」行同样留 ⚠️ 占位。

- **整体气质**：{1 句 ≤ 20 字，取 BRAND § 视觉原则首条}
- **配色**：{BRAND 主色（hex 值如有）+ 视觉禁区色清单}
- **光线**：{自然光 / 影棚光 + 时段建议；平台执行层（MARKETING_PLATFORM § 1.2 光线）做细则}
- **构图**：{留白 / 黄金分割 / 平铺；从 BRAND § 视觉原则取}
- **道具集**：{符合 BRAND 的道具白名单 ≤ 5 个名词}
- **视觉铁律层**：{BRAND_MARKETING 第 4 章视觉调性铁律——品牌形象级正面要求 + 反面禁止；缺则留 ⚠️ 占位}
- **平台视觉规范**：{MARKETING_PLATFORM § 1.2——目标平台的画幅 / 背景 / 元素密度 / 文字位置 / 字体；Etsy / 小红书走内置 preset；缺则留 ⚠️ 占位}
- **视觉禁区（硬底线）**：{原文复制 BRAND.md § 视觉禁区清单 + BRAND_MARKETING 第 5 章红线；任何下层不可触碰}

## C. 镜头清单（按图位展开）

### Hero（1 张）
- **画面**：{具体描述}
- **角度**：{俯视 / 侧 45° / 平视}
- **背景**：{白底 / 木纹 / 大理石}
- **后期方向**：{保色彩自然 / 加暖调}

### Variation grid（{N} 张，如有变体）
- **网格构图**：{2x2 / 3x3 / 横向并排}
- **统一项**：{光线 / 角度 / 背景必须一致}
- **变体清单**：{从`Products 商品` 表 变体字段抽——颜色 / 尺寸 / 款式}

### Scale（1 张）
- **参照物**：{手 / 硬币 / 信用卡 / 已知尺寸家具}
- **同框拍**：{商品 + 参照物在同一画面}

### Size chart（1 张，功能性 / apparel SKU）
- **格式**：{平铺 + 标尺 / Photoshop 数字标注 / 表格图层}
- **单位**：cm + inch 双标

### Detail（3 张：材质 / 工艺 / 关键纹理或 Logo）
- **Detail-1（材质）**：{材质特写 + 微距}
- **Detail-2（工艺）**：{工艺过程或细节}
- **Detail-3（纹理 / Logo）**：{品牌标识或独特纹理}

### Lifestyle（{N} 张）— 场景来源按目标平台分流
> **Etsy**：礼物场景词库（受众 / 场景 / 节日）⊕ BRAND_MARKETING 第 1/2/3 章（人群优先级 / 情感触点 / 场景表）并用——词库定节日/受众细节，BRAND_MARKETING 定人群基调/情感触点。
> **非 Etsy（小红书 / Pinterest 等）**：礼物词库不存在，**以 BRAND_MARKETING 第 1/2/3 章为主来源**——人群优先级（这组图为谁拍）× 情感触点（击中哪个情绪瞬间）× 场景表（场景母题）。
> 场景来源标记：[ ] 礼物词库 反向触发 in-memory 现传 / [ ] 礼物词库 Base 反推 / [ ] BRAND_MARKETING 人群×触点×场景 / [ ] 用户口述
> ⚠️ 若两者皆缺（无 BRAND_MARKETING 且非 Etsy / 未跑 listing）：本段标 "⚠️ 无结构化场景来源——按用户口述出图"。

- **场景 1：{母亲节早茶}** → 服务人群：{P1 代号} → 情感触点：{被记得} → 画面：{母亲手握杯，窗边晨光} → 道具：{花束、贺卡、热茶}
- **场景 2：{婚礼伴娘礼物}** → 服务人群：{P?} → 情感触点：{...} → 画面：{...} → 道具：{...}
- **场景 N**：...

### Packaging（1-2 张）
- **包装物料**：{SHOP.md § 物料抽——包装盒 / 感谢卡 / 贴纸}
- **礼盒服务**：{SHOP.md 礼盒服务字段——是否拍开箱过程}
- **构图**：{包装 + 商品半露出 / 拆箱定格}

### Brand story / context（可选，1 张）
- **取材**：{BRAND.md § 起源 / § 工艺}
- **画面**：{制作过程 / 工坊环境 / 原料展示}

## D. 参考图（用户手填）

> PR1 范围：仅用户手填，skill 不主动反查`Assets 素材池` 表。

- {Pinterest 链接}
- {已有 raw 链接}
- {同类店铺截图飞书云空间链接}

## E. 拍摄附注

- **装置 / 道具准备清单**：{...}
- **必备道具采买（缺什么）**：{...}
- **估计拍摄时长**：{N 小时}
- **后期工具**：{Lightroom / PS / Canva / 飞书内编辑}

---

## References

- BRAND.md § 视觉原则
- BRAND.md § 视觉禁区
- {BRAND_MARKETING.md 第 1/2/3 章（人群/触点/场景）+ 第 4/5 章（视觉铁律/红线），如已建立}
- {MARKETING_PLATFORM.md § 1.2 视觉规范 + 平台红线（目标平台章节），非 Etsy/小红书时}
- `Products 商品` 表中该 SKU 行（链接）
- listing description 礼物 / 使用语境（如已生成）
- references/etsy-listing-photo-slots.md（10 槽位社区 SOP）
- {SHOP.md § 物料 + § 礼盒服务，如已建立}
```

---

## 填写指引（给 agent 看的）

### A 段填写规则

- "本 SKU 计划"列每行必须 ≥ 1 个名词性具象描述。**不接受**模板词如 `TBD / 待定 / 后续补 / 见 BRAND`
- P0 / P1 行不允许空槽
- P2 行按品类判断：home & living / 礼品 SKU 必拍；纯 digital SKU packaging 写 N/A（数字商品没物理包装）
- 单 SKU 无变体时槽位 2 写 `N/A（单 SKU 无变体）`
- size chart 仅 apparel / 功能性 SKU 必拍；纯装饰品可写 `可选 — 装饰品无功能尺寸`

### B 段填写规则

- 每行 ≤ 20 字
- 抽取 BRAND.md § 视觉原则时，遵循"首条+矛盾时给最严"
- **三源冲突按阶梯裁决**：BRAND 视觉禁区（veto）> BRAND_MARKETING 红线/视觉铁律 > MARKETING_PLATFORM 平台视觉规范。下层只能在不违反上层前提下适配平台表达，不由 agent 拍脑袋。典型冲突：BRAND_MARKETING 铁律要留白 vs 平台 § 1.2 要高元素密度 → 留白赢（高层压低层），平台密度只在留白允许的范围内调
- 视觉禁区段 + BRAND_MARKETING 红线**原文复制**，不要 paraphrase（避免漏关键禁区元素）
- BRAND.md 缺失：整段输出 ⚠️ 占位，不强行编；BRAND_MARKETING / MARKETING_PLATFORM 缺失：对应行单独留 ⚠️ 占位，其余行照填

### C 段填写规则

- Hero 一定要有
- Variation grid: 看 `Products 商品` 表的变体字段；无变体时整段省略
- Detail: 至少 3 张（材质 / 工艺 / 纹理 Logo 三选三）
- Lifestyle 段 "场景来源标记"勾选必须如实——Etsy 下礼物词库（反向触发 = in-memory 现传 / 主动触发 = Base 反推）⊕ BRAND_MARKETING；非 Etsy 平台以 BRAND_MARKETING 人群×触点×场景为主；两者皆缺才标用户口述
- 每个 Lifestyle 场景必须标「服务人群 + 情感触点」（来自 BRAND_MARKETING 第 1/2 章）——避免出脱离品牌策略的泛场景；BRAND_MARKETING 缺失时这两栏留空，场景仍按礼物词库 / 口述填
- 老 SKU 部分跑场景：仅填 §A 表缺位行 + §C 对应镜头清单段；§B 沿用旧 brief，不重写

### D 段填写规则

- PR1 范围：skill 不反查 `Assets 素材池` 表，仅用户手填
- 出 brief 时 §D 留 3-5 个空 bullet，给用户事后填

### E 段填写规则

- 道具采买清单：跟 BRAND § 视觉原则 道具白名单交叉，列出"白名单里目前没有的"
- 估计拍摄时长：按图位数 × 30 分钟粗算（10 张图 ~ 5 小时；老 SKU 部分跑按缺位数）
