# 素材索引 Base schema

> 资产库的**语义层**——一行一个**promoted 成品**，多维标签 + 关联其他 Base，把"网状归类"压在 Base 里。
> 文件物理仍唯一存放在飞书云空间（按 [folder-structure.md](folder-structure.md) 粗分），靠"文件链接"字段连接。
> raw 原片**不进 Base**，只在文件夹中存放。

## 设计原则

1. **single source of truth**：每个文件在云空间只放一份；Base 一行只对应一个文件，不重复录入
2. **物理薄、语义厚**：文件夹只做来源归属 / 发布阶段粗分（商品 / 品牌 / 客户 / 工作室 / 营销 / 待处理），"属于哪些 SKU / 渠道 / 用途 / 阶段"全在 Base 字段
3. **关联优于多选**：能跟其他 Base 关联的（SKU / 订单 / 客户）走关联字段；只是分类标签的（用途 / 渠道）走多选字段
4. **Promote 即合规**：进 Base 视为"准备使用"，BRAND 合规自检在 promote（模式 B2）时执行；raw 层无合规义务

## 表名

`{店铺名}-素材索引`（与商品 Base、订单 Base、客户 Base 同一空间，便于互相关联）

## 字段

| 字段名 | 飞书字段类型 | 必填 | 示例 | 说明 |
|---|---|---|---|---|
| 素材标题 | 文本（主键） | ✓ | `TEACUP-001 棚拍 morning-light 001` | 方便人眼识别，不严格规范 |
| 文件链接 | URL | ✓ | `https://xxx.feishu.cn/file/...` | 飞书云空间唯一物理位置 |
| 文件名 | 文本 | ✓ | `2026-05-05_TEACUP-001_morning-light_001.jpg` | 与云空间真实文件名一致（参 [naming-convention.md](naming-convention.md)） |
| 素材类型 | 多选 | ✓ | `摄影原图 / 摄影成图 / 场景图 / 视频原料 / 视频母版 / 视觉模板 / Logo / 字体 / 包装物料 / 客户拍摄 / 客户定制参考` | 多选——一个素材可同时是"摄影成图"+"客户拍摄"。⚠️ `摄影原图 / 视频原料` 仅为旧数据兼容保留；新 promote **不要勾这两个**——原片通常不直接 promote（详见 § 录入约定 §3）|
| 关联 SKU | 关联（商品 Base） | △ | `TEACUP-001`, `TEACUP-007` | — |
| 关联订单 | 关联（订单 Base） | △ | `ORDER-2026-001` | — |
| 关联客户 | 关联（客户 Base） | △ | (客户 open_id) | — |
| 用途标签 | 多选 | △ | **Etsy 槽位**：`hero / variation / scale / size-chart / detail / lifestyle / packaging / brand-story / context / comparison`（与 [etsy-listing-photo-slots.md](etsy-listing-photo-slots.md#3-槽位-id-与素材索引-base-用途标签-字段对齐) 对齐）<br>**渠道**：`Pinterest / Instagram Posts / Instagram Reels / Instagram Stories / 小红书 / 评价素材 / 内部参考`<br>**Etsy 店铺**：`Etsy 店铺 banner`<br>**legacy（仅旧数据兼容）**：`Etsy listing 主图（→ 等同 hero）/ Etsy listing 详情（→ 等同 detail）` | 一份素材投多槽位 + 多渠道全勾上；先空着也行，发布到某渠道时再补。模式 D 部分跑反查 SKU 已覆盖槽位时按这套词汇表推断；遇到 legacy 标签按对应映射 |
| 比例 / 尺寸 | 多选 | △ | `1x1 / 4x5 / 9x16 / 16x9 / 自由` | 视频和成图建议填，便于按渠道筛 |
| 公开授权 | 单选 | ✓ | `已授权 / 仅内部 / 待沟通 / 不可公开` | 客户拍摄类的关键合规位；非客户类默认"已授权" |
| BRAND 合规 | checkbox | ✓ | `true` / `false` | 对照 BRAND.md `§ 视觉原则` 的自检结果；不通过时把理由写进"备注" |
| 拍摄日期 | 日期 | △ | `2026-05-05` | 摄影 / 视频建议填 |
| 备注 | 多行文本 | — | `客户在 ORDER-2026-001 评价里附的；BRAND 不通过：高饱和` | 任何不结构化的上下文，包括 BRAND 不通过的理由 |

> △ = 条件必填，按"录入约定"的规则触发。"上传日期"用 Base 内置的"创建时间"即可，不另设字段。

## 关联 Base 的方向

```
素材索引 Base
   ├─→ 关联商品 Base   （多选关联：一图多 SKU）
   ├─→ 关联订单 Base   （单选关联）
   └─→ 关联客户 Base   （单选关联）

商品 Base（反向）
   └─→ 通过"关联 SKU"字段反查：这个 SKU 有哪些素材

订单 Base（反向）
   └─→ 通过"关联订单"反查：这单的客户给的所有定制参考 / 评价图

客户 Base（反向）
   └─→ 通过"关联客户"反查：这个 VIP / 回头客给的所有 UGC
```

## 推荐视图

| 视图名 | 用途 | 配置 |
|---|---|---|
| 全部成品 | 默认 | 按"创建时间"倒序 |
| 按 SKU 分组 | 给某 SKU 找所有 promoted 成品 | 分组：关联 SKU |
| 待派渠道（用途未填） | 已录入 Base 但用途标签还没勾 | 筛：用途标签 IS EMPTY |
| BRAND 复审 | 视觉合规复盘 | 筛：BRAND 合规 = false |
| 客户 UGC（已授权） | 可发渠道的 UGC 池 | 筛：素材类型 ⊇ 客户拍摄 AND 公开授权 = 已授权 |
| 客户 UGC（待沟通） | 还没拿到授权的素材 | 筛：素材类型 ⊇ 客户拍摄 AND 公开授权 = 待沟通 |
| Pinterest 候选 | 待发 Pinterest | 筛：用途标签 ⊇ Pinterest AND 公开授权 = 已授权 |
| Instagram Reels 候选 | 待发 Reels | 筛：用途标签 ⊇ Instagram Reels |
| 视频库 | 仅看视频类成品 | 筛：素材类型 ⊇ 视频母版 |

## 录入约定（模式 B2 promote 时执行）

> 模式 B1 dump **不录 Base**；本段只在 promote 时生效。

1. 一次只录一行；不要给一个目录建一行抽象索引
2. 必填字段全填：素材标题、文件链接、文件名、素材类型、公开授权、BRAND 合规
3. 关联字段按素材类型条件触发：
   - 摄影成图 / 场景图 / 视频母版 / 视觉模板 → 关联 SKU 必填（跨 SKU 的 vlog / 品牌片可空）
   - 客户拍摄 / 客户定制参考 → 关联订单 + 关联客户必填，且 `公开授权 = 已授权` 才能 promote 进可投渠道状态
   - **摄影原图 / 视频原料**（未经编辑的原片）→ 不应该直接 promote。如用户尝试，提示：原片需先在外部工具编辑导出成品，按命名公式命名后再 promote
4. 用途标签可以先空着——发布到某渠道时再勾上（避免"Pinterest 候选"视图被未投的素材污染）。**Etsy listing 用图建议在 promote 时就勾对应槽位 ID**（hero / detail / lifestyle 等，词汇表见 [etsy-listing-photo-slots.md § 3](etsy-listing-photo-slots.md#3-槽位-id-与素材索引-base-用途标签-字段对齐)）——这是模式 D 部分跑反查"该 SKU 已覆盖槽位"的依据；不勾不阻塞但部分跑会降级为问用户
5. BRAND 合规不通过时仍然录入，checkbox 留空 + 在"备注"写理由——保留可追溯，不假装没发生

## 与文件夹的边界

| 决策 | 在哪做 |
|---|---|
| 这个文件物理放云空间哪条路径 | 文件夹（[folder-structure.md](folder-structure.md) + [asset-types.md](asset-types.md)）——6 个一级文件夹按来源归属 / 发布阶段 |
| 这个文件叫什么 | [naming-convention.md](naming-convention.md) |
| 这是原片还是成品 | Base "素材类型"字段区分（摄影原图 vs 摄影成图）；物理文件夹不区分 |
| **某 promoted 成品**属于哪些 SKU / 客户 / 用途 / 渠道 | 素材索引 Base（本文档） |
| 怎么找一类成品 | 素材索引 Base 的视图——**唯一检索入口** |
| 怎么找未分类素材 | 浏览 `待处理/` 文件夹 |

文件夹只做来源归属和发布阶段的粗分（商品 / 品牌 / 客户 / 工作室 / 营销 / 待处理），确保每个文件**有且只有一份**。所有细粒度分类（SKU / 渠道 / 用途 / 阶段）交给 Base。进 Base 即为承诺"这是用过 / 准备用的素材"。

## 何时不需要建这张 Base

- 素材总量预计 < 200 件
- 不做多渠道发布、没有 UGC / 客户拍摄
- 这种规模纯文件夹够用，建 Base 反而增加录入摩擦

只要开始下面任意一条，**强烈建议建 Base**：
- 视频内容
- Pinterest / Instagram / 小红书 多渠道发布
- 客户 UGC / 评价素材运营
- 跨 SKU 内容（vlog、品牌片、开箱多件）
