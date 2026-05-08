# 质量闸门（QA gates）

> SKILL.md step 8 引用本文档。每项 check 给"怎么验 / 通过条件 / 不通过怎么调 prompt"；验证手段统一用 **Hermes 看图能力**。

---

## 批量 vision 调用约定

每生成 1 张图后，本模式适用的所有 checks 走 **1 次** vision 调用——把 4-5 个结构化问题（每个 check 一段）合并成一个多部分 prompt 喂给看图能力，单次返回 JSON 块（每 check 一项）。

**禁止**给每个 check 单发一次 vision——3 轮重试 × 4-5 checks = 最多 15 次 vision call/请求，是不必要的成本。

下面每个 check 的"怎么验"段定义的是**问题片段**，不是独立调用。

---

## 模式 A 电商图

### Check 1 — 商品形态保持（必检）

**怎么验**：

让 Hermes 看图能力把"原实拍图"+"生成图"作两张对比，按以下 4 项结构化提问：

| 维度 | 判断标准 |
|---|---|
| 主体形状 | 主体物种 / 类别一致（杯子还是杯子，不变成碗）|
| 比例 | 高宽比与实拍图偏差 ≤ 15% |
| 关键纹理 / Logo | 实拍图可见的纹理 / Logo 在生成图保持可见 |
| 主色 | 主色调一致（视觉上属于同一色相，明度偏差允许） |

vision 对每项回 `PASS` / `FAIL` / `UNCLEAR`。

**通过条件**：4 项全 `PASS`；任意一项 `FAIL` 或 `UNCLEAR` 视为不通过（保守）

**不通过怎么调 prompt**：

| 失败项 | prompt 调整 |
|---|---|
| 形状跑偏 | anchor 段加 `precise silhouette: {从实拍提取的剪影描述}`；negative 加 `do not alter product shape, no morphing, no fantasy reinterpretation` |
| 比例失衡 | anchor 段加 `proportions: height-to-width ratio ≈ {从实拍测出的比例}` |
| Logo / 纹理丢失 | anchor 段加 `must preserve: {logo 位置 / 纹理特征}`；`distinctive features must remain visible` |
| 主色偏 | anchor 段加 `color must match reference: {hex 或色彩描述}` |

### Check 2 — 文字可读性（条件检）

**触发条件**：仅在生成图含文字 / Logo 时检；纯图无文字时跳过此项。

**怎么验**：

- 用看图能力扫生成图问"图中是否有文字 / Logo"
- 如有：每段文字 vision 能否准确读出原文 + Logo 形态是否完整

**通过条件**：
- vision 读出的文字与 prompt 指定文案一致（无生成式乱码）
- Logo 形态完整可识别

**不通过怎么调 prompt**：

| 失败项 | prompt 调整 |
|---|---|
| 文字模糊 | shot-spec 加 `crisp typography, high-contrast text, readable at thumbnail size` |
| 文字内容错（AI 乱码）| 重生时强调 verbatim：`text must read exactly: "{文案}"`；某些模型对长文字仍易乱码——超过 5 词建议改后期叠层（不在本 skill 范围）|

### Check 3 — 视觉禁区扫描（必检）

**怎么验**：

把 BRAND § 视觉禁区 **原文**清单喂给看图能力，问"生成图是否含以下任一元素 [清单]"。vision 对每条回 `PRESENT` / `ABSENT` / `UNCLEAR`。

**通过条件**：所有禁区项 `ABSENT`；任意 `PRESENT` 或 `UNCLEAR` 视为不通过（UNCLEAR 保守判 FAIL）

**不通过怎么调 prompt**：

把命中的禁区原文加到 negative prompt 段（如已在 negative，加更强语气前缀：`strictly absolutely no {禁区元素}`）。重生 1 次。

> BRAND.md 缺失时本检查降级为"通用兜底扫描"——只扫 watermark / competitor logo / AI artifacts；不主动给用户找麻烦。

### Check 4 — hero 槽位特检（仅 hero）

**触发条件**：目标槽位 = `hero`

**怎么验**：

| 维度 | 判断标准 | 验证手段 |
|---|---|---|
| 主体居中 | 主体几何中心偏离画面中心 ≤ 10% 宽高 | vision 估 |
| 背景接近白底 | 背景采样 HSV 中 V > 90% 且 S < 10% | vision 估（宽容：纯白 / 米白 / 浅灰都接受）|
| 长宽比 ≥ 4:3 | 图像 metadata 直接读 | 不需 vision |
| 无水印 | 角落 + 主体表面无水印 / 价格标签 | vision 扫四角 + 主体 |

**通过条件**：4 项全 PASS

**不通过怎么调 prompt**：

| 失败项 | prompt 调整 |
|---|---|
| 主体不居中 | shot-spec 加 `subject perfectly centered in frame, equal margins on all sides` |
| 背景不够白 | shot-spec 强化 `seamless white background, studio backdrop, no contextual elements except subtle product shadow` |
| 长宽比错 | format 段重指定 → 如果是模型不接受 aspect ratio 参数，**不重试**：报错给用户「生图工具未接受 aspect ratio 参数」，由用户决定 |
| 有水印 | negative 加 `no watermark, no logo overlays, no price tags` |

### Check 5 — lifestyle 槽位特检（仅 lifestyle）

**触发条件**：目标槽位 = `lifestyle`

**怎么验**：

| 维度 | 判断标准 | 验证手段 |
|---|---|---|
| 场景命中度 | 生成图中出现的元素清单 与 shoot-brief §C Lifestyle 当前场景行的"画面 / 道具"清单逐项比对 | vision 扫生成图，列元素清单 |

**通过条件**：清单中至少 70% 的关键名词在生成图出现

**不通过怎么调 prompt**：

| 失败项 | prompt 调整 |
|---|---|
| 场景偏离 | shot-spec 把 brief lifestyle 段原文逐字重复进去（精确化，不省略修饰）|
| 道具缺位 | prompt 主体段加 `scene must include the following props: {道具清单}` |

---

## 模式 B 社媒图

模式 B 仅检以下两项，不做商品形态比对（社媒图本就允许艺术化处理）。

### Check 1 — 文字可读性（条件检）

同模式 A Check 2，但：

- **触发条件**：仅在用户指定了叠层文案时检；用户没指定时跳过
- **额外维度**：字号占图最长边 ≥ 3%（手机端缩略图能看清的下限）

**不通过怎么调 prompt**：

| 失败项 | prompt 调整 |
|---|---|
| 字号太小 | format 段加 `text occupies at least 8% of canvas longest side` |
| 文字模糊 / 内容错 | 同模式 A Check 2 |

### Check 2 — 视觉禁区扫描（必检）

同模式 A Check 3。

---

## 自动重试机制

| 轮次 | 动作 |
|---|---|
| 第 1 轮 | 初次生图 + 全部 QA |
| 第 2 轮（第 1 次重试）| QA 不通过 → 按上文调整 prompt → 重生 + 全部 QA |
| 第 3 轮（第 2 次重试）| 第 2 轮仍不通过 → 再调整 → 重生 + 全部 QA |
| **停下** | 第 3 轮仍不通过 → **不再自动重试**，停下问用户 |

每轮调整 prompt 时**累加**（不覆盖前轮的调整）——除非两轮调整冲突，则取后轮。

### QA 失败停下时的用户三选一

把 3 轮过程贴给用户：

```
QA 第 1 轮 失败：商品形态保持 FAIL（比例失衡）
  → prompt 调整：anchor 加 "proportions: ratio ≈ 1:2"
QA 第 2 轮 失败：商品形态保持 FAIL（Logo 丢失）
  → prompt 调整：anchor 加 "must preserve: small embossed logo on bottom rim"
QA 第 3 轮 失败：视觉禁区扫描 FAIL（出现工业冷光）
  → prompt 调整：negative 强化 "strictly no industrial cold lighting"

3 张候选图都在 .cache/image-synth/ai_raw/{date}/ 下：
  - {filename}_attempt-1.png
  - {filename}_attempt-2.png
  - {filename}_attempt-3.png

下一步选：
① 改 prompt 手动重试（你给我新 prompt 段）
② 丢弃全部，结束
③ 留某一张到 .cache（QA 失败也允许留，但**不调用 assets-library promote**——QA 失败的图不入库）
```

> **关键约束**：QA 失败的图最多落 `.cache/`，**不允许**走"入库"分支调用 assets-library promote。这是为了保护资产库的视觉合规基线。

---

## QA 跳过场景

某些场景 QA 不适用，本 skill 跳过对应 check：

| 场景 | 跳过的 check | 为什么 |
|---|---|---|
| 模式 A 但用户主动说"做艺术化处理"（如概念稿）| Check 1 商品形态保持 | 用户已知会跑偏；走"用户口头授权降级" |
| 模式 A brand-story 槽位（拍工坊环境，非商品本身）| Check 1 商品形态保持 | 商品不是主体，无形态比对前提 |
| BRAND.md 缺失 | Check 3 视觉禁区扫描降级为通用兜底 | 见 Check 3 末尾 |
| 用户在第 3 轮 QA 失败后选"丢弃" | 后续不再 QA | 用户已决定 |

跳过时**显式告诉用户**："本次跳过 Check X，原因：{理由}"——避免悄悄降级让用户误以为 QA 全过。

---

## 修订历史

| 版本 | 日期 | 改动 |
|---|---|---|
| v1 | 2026-05-07 | 初版：模式 A 5 项 check + 模式 B 2 项；自动重试 ≤ 2 次；QA 失败用户三选一；QA 失败禁止 promote |
