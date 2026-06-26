---
name: image-brief
description: 图片方案设计（创意 brief 的 owner）：给某 SKU + 目标平台 + 用途，产出一份**平台感知**的图片创意 brief（槽位映射 / Mood 风格 / 镜头清单 / 参考图 / 附注），再分叉到生产——人工拍摄（交 brief）或 image-synth（现传 brief AI 合成）或已有素材够（走 assets-library 检索）。触发：用户说"给 SKU 出拍摄 brief / 出图片方案 / 设计一组图 / 要拍什么 / 上新先出方案 / 不拍直接合成的方案"。本 skill 只产出 brief 这个**计划文档**，不拍、不生图、不归档、不写 Base；brief 落 `商品/{SKU}_shoot-brief.md`。严格遵守 BRAND.md 视觉原则 / 视觉禁区（如存在）。
layer: application
depends-on: [shop-foundation, listing-catalog, assets-library]
---

# Image Brief（图片方案设计）

这个 skill 是图片**创意策略**的 owner：回答「这个 SKU 要什么样的一组图」。它是工作流轴上素材生产的**上游**——产出一份平台感知的 brief，再分叉到三条生产路径：

```text
SKU + 目标平台 + 用途 + BRAND + 礼物词库
        ↓
image-brief  产出平台感知 brief（§A 槽位 / §B Mood / §C 镜头清单 / §D 参考 / §E 附注）
        ↓ 分叉
   ┌─ 人工拍摄（把 brief 交给摄影，拍完走 assets-library 模式 B 归档）
   ├─ image-synth（现传 brief，AI 合成，入库走 assets-library promote）
   └─ 已有素材够（走 assets-library 模式 C 检索，不重复生产）
```

**它只产出 brief 这个计划文档**：不拍照、不生图（那是 image-synth）、不归档/不写 Base（那是 assets-library）。brief 是「我要什么图」的结构化表达，**拍 vs 合成只是后端不同**——同一份 brief 喂两条路。

> **为什么独立成 skill（D-A2）**：创意策略（mood / 槽位 / 构图）和素材生命周期（存储 / 变体 / 清理 / 检索）是两个不同的关注点。把 brief 从 assets-library 抽出来，防止 assets-library 变成 god-object；assets-library 严格收窄为资产生命周期 owner。

> 共享引导见 [`../shared/preamble.md`](../shared/preamble.md)，降级协议见 [`../shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 依赖关系（每次出 brief 前必读）

| # | 输入 | 是否必需 | 缺失时怎么办 |
|---|---|---|---|
| 1 | `Products 商品` 表该 SKU 行 | 必需 | SKU 不在店铺总 Base：**阻塞** + 提示先回 listing-catalog 模式 A 建一行最小记录（至少 title + 品类）。本 skill 不偷偷建 SKU 行 |
| 2 | `<workspace>/BRAND.md` § 视觉原则 + § 视觉禁区 | 必需但**降级可跑** | 缺失：§B Mood 段输出 "⚠️ BRAND.md 未建立——本段先留空，回 shop-foundation 建库后回头补"，brief 仍可出 §A/§C/§D/§E |
| 3 | **目标平台 + 用途**（必需） | 必需 | 缺：问用户"这组图发哪个平台、什么用途（listing 主图 / 详情 / 小红书笔记 / Pinterest pin / 营销）" |
| 4 | `<workspace>/COMMERCE_PLATFORM.md` / `MARKETING_PLATFORM.md` 目标平台媒体规则 | 目标平台非 Etsy / 小红书时必需 | Etsy 用内置 10 槽位 preset；小红书用内置商品图 / 详情图 / 笔记图规则；其他平台缺配置则阻塞，提示先用 shop-foundation 补 |
| 5 | listing-catalog 礼物词库（受众 / 场景 / 节日 / 包装）| 强烈推荐**不阻塞** | (a) 反向触发 → listing-catalog 现传 in-memory；(b) 主动触发 → 从该 SKU 的 Base description 礼物 / 使用语境 + tags 礼物词抽取已 fused 文本；喂 §C Lifestyle 段 |
| 6 | `<workspace>/SHOP.md` § 物料 / 礼盒服务 | 可选 | 缺失：§A packaging 计划写"未配置物料 → 拍裸品 + 简包装" |
| 7 | `Assets 素材池` 表该 SKU 已 promoted 素材 | 可选 | 部分跑（补拍补槽位）时反查已覆盖槽位，只补缺位 |

**平台感知（D-A3）**：§A 槽位映射按**目标平台**展开——Etsy 走 [`../assets-library/references/etsy-listing-photo-slots.md`](../assets-library/references/etsy-listing-photo-slots.md) 的 10 槽位 preset；小红书走商品图 / 使用指南图 / 图文详情图 / 笔记封面规则；其他平台按 COMMERCE/MARKETING_PLATFORM.md。不同平台的槽位、比例、文字叠层策略不同，brief 早平台化，不出"平台中立"的通用 brief。

---

## 模式 A：出 brief

**进入条件**：
- 用户主动单 SKU："给 {SKU} 出拍摄 brief / 出图片方案" / "下周上新 X，先出方案"
- 用户主动批量："给 X/Y/Z 都出 brief"——顺序循环跑，每个 SKU 独立展示确认 + 写盘后再进下一个；中途中断时已写盘的保留
- listing-catalog 模式 B step 10 反向触发（listing 文案落 Base 后选"顺手出图方案"）
- 老 SKU 补拍补槽位 → 走"部分跑"分支

**执行步骤**：
1. **检查 SKU 在 `Products 商品` 表**——不在则阻塞，提示回 listing-catalog 模式 A 建最小记录
2. **检查 brief 是否已存在**（`商品/{SKU}_shoot-brief.md`）——已存在则强制问："覆盖 / 重命名旧版保留 / 仅补拍缺位（部分跑）"。重命名时旧版改为 `{SKU}_shoot-brief_{原生成日期}.md`
3. **若选"部分跑"**：用 `lark-base` 反查 `Assets 素材池` 表该 SKU 已 promoted 素材的"用途标签"。Etsy 按 [etsy-listing-photo-slots.md § 3](../assets-library/references/etsy-listing-photo-slots.md#3-槽位-id-与-assets-素材池-表-用途标签-字段对齐) 推断已覆盖槽位；小红书按 `../listing-catalog/references/platforms/xiaohongshu.md` 商品图 / 详情图规则推断；其他平台按 COMMERCE_PLATFORM.md。列给用户确认缺哪几位 → 仅填 §A 缺位行 + §C 对应镜头段；§B 沿用旧 brief
4. 读上述输入（依赖表 + 降级规则）
5. 按**目标平台**读媒体规则：Etsy 读 [etsy-listing-photo-slots.md](../assets-library/references/etsy-listing-photo-slots.md) 内置 10 槽位 preset；小红书读 `../listing-catalog/references/platforms/xiaohongshu.md` 图片规则；其他平台读 COMMERCE/MARKETING_PLATFORM.md 对应章节
6. 读 [references/brief-template.md](references/brief-template.md)：拿模板骨架
7. 填 brief（§A 槽位映射 / §B Mood / §C 镜头清单 / §D 参考图占位 / §E 附注 / References）
8. **展示给用户**等确认（不主动写盘）；用户调整后再写
9. 写盘：
   - 9a. 用 `lark-drive` 检查素材库根目录和 `商品/` 文件夹存在；缺 → 阻塞，提示先跑 assets-library 模式 A 建库
   - 9b. 临时位置生成本地 markdown；9c. 用 `lark-drive` 上传到 `商品/{SKU}_shoot-brief.md`
10. 给用户回执：文件链接 + "拍完走 assets-library 模式 B1 dump" + 提示可进模式 B 分叉

**关键约束**：
- brief **不进** `Assets 素材池` 表（brief 是计划文档不是素材）
- brief **不预创建**其他文件（拍不拍是另一回事，素材由 assets-library B1 dump 真正回片时上传）
- brief **不批量聚合**：批量 = 循环跑 N 遍，N 份独立 brief
- 不做图像生成 / 编辑 / 归档——那是 image-synth / assets-library

---

## 模式 B：分叉到生产

**进入条件**：brief 出好后（模式 A step 10），用户决定怎么生产这组图。

**三条路径**（同一份 brief，后端不同）：

| 路径 | 何时 | 怎么做 |
|---|---|---|
| **人工拍摄** | 用户要真拍 | 把 brief 交给摄影；拍完的成品走 `assets-library` 模式 B（B1 dump → B2 promote 归档 + 录 Base） |
| **image-synth（AI 合成）** | 用户"不想真拍 / 没场景 / 想 AI 出图" | invoke `image-synth` 模式 A，**现传** brief 的 §A 槽位选项 + §B Mood + §C 镜头清单 in-memory + 用户挑的目标槽位（避免 image-synth 重新读文件）。AI 图入库仍走 assets-library promote |
| **已有素材够** | 这组槽位已有 promoted 成品 | 走 `assets-library` 模式 C 检索，不重复生产 |

**追问节奏**：
- 来自 listing-catalog 反向触发时：listing-catalog step 10 已给过三选一（出方案 / AI 合成 / 跳过），用户选了出方案就别再回头问，brief 写盘即止
- 用户主动触发模式 A 时：step 10 完成后同一 turn 内可追问"brief 出好了。要真拍，还是让 image-synth 直接按这份方案合成一张？" → 用户回应后才 invoke 下一个 skill
- 用户跳过 → 静默跳过（不阻塞）；用户后续主动 invoke image-synth 也能直接读 `商品/{SKU}_shoot-brief.md`

---

## 与其他 skill 的协作

- **assets-library**：素材生命周期 owner。brief 写盘用其 `商品/` 文件夹（lark-drive）；拍摄/合成的成品入库走 assets-library 模式 B / promote；部分跑反查走其 `Assets 素材池` 表。本 skill 不归档、不写 Base。
- **image-synth**：本 skill 的 brief 是 image-synth 的**主输入源**——模式 B 分叉时现传 brief 词库 in-memory，或 image-synth 直接读 `商品/{SKU}_shoot-brief.md`。本 skill 不生图。
- **listing-catalog**：消费其礼物词库喂 §C Lifestyle 段（反向触发现传 / 主动触发从 Base 抽）；其模式 B step 10 反向触发本 skill。
- **shop-foundation**：每次出 brief 后如发现 BRAND.md 视觉原则需补充，按其沉淀流程提议进 BRAND.md。

---

## 工作语言

通用规则见 [`../shared/preamble.md`](../shared/preamble.md) §工作语言。brief 文档正文跟随客户工作语言（默认中文）；文件名用英文（`{SKU}_shoot-brief.md`）。
