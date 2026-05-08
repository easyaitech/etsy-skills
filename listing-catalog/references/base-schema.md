# 商品 Base 推荐 Schema

> 用 `lark-base` skill 在飞书云空间创建一个 Base，命名建议：`{店铺名}-商品目录`。

## 核心字段（必建，11 个）

| 字段名 | 飞书字段类型 | 说明 / 示例 |
|---|---|---|
| `SKU` | 单行文本（**主键**） | 内部唯一编号，建议格式 `{品类缩写}-{数字}`，如 `TEACUP-001`、`POT-007`。一次建立，永不修改 |
| `Etsy Listing ID` | 单行文本 | 上 Etsy 后获得的 listing 数字 ID（如 `1234567890`），未上线为空 |
| `状态` | 单选 | 草稿 / 待上线 / 在售 / 售罄 / 已下架 |
| `Title (EN)` | 多行文本 | Etsy 标题英文原文，140 字符以内 |
| `Description (EN)` | 多行文本 | Etsy 描述英文原文，分段保留换行 |
| `Tags` | 多选 | Etsy 13 个 tag 槽，单选项独立保存 |
| `Materials` | 多选 | Etsy 13 个 material 槽，同上 |
| `视频链接` | 链接 / 附件 | Etsy listing 视频（5–15 秒，1 条）。**店铺硬性约束：每条 listing 必须有视频**，未拍即视为未完工，状态停在"草稿"。原始视频走 `assets-library`，本字段存链接或外链 |
| `售价 (USD)` | 数字（货币） | 主售价；变体定价用变体表 |
| `库存` | 数字 | 在售数量；定制款用 0 + 备注 "made to order" |
| `上线日` | 日期 | 状态 = 在售 时填，便于按时间查询 |

## 辅助字段（推荐，按需建，约 10 个）

| 字段名 | 飞书字段类型 | 说明 |
|---|---|---|
| `品类` | 单选 | 茶杯 / 茶壶 / 茶则 / 配套等 |
| `成本 (USD)` | 数字（货币） | 估算成本，用于利润率计算 |
| `利润率` | 公式 | `(售价 - 成本) / 售价`，自动算 |
| `制作周期(天)` | 数字 | 新订单平均制作周期（天） |
| `变体` | 多行文本或关联表 | 简单情况用文本（"Size: S/M/L; Glazed: Yes/No"）；复杂的另建变体表关联 |
| `SEO 关键词` | 多行文本 | 当时为这条 listing 想的关键词组（不全用上 tag，留作后续优化参考） |
| `照片链接` | 链接 / 附件 | 飞书云空间该 SKU 摄影目录链接（assets 库 skill 维护） |
| `图片 Alt (EN)` | 多行文本 | Etsy listing 图片的 alt text，按图片顺序逐行写。每行 ≤ 125 字符，描述画面 + 关键 SEO 词（参考 `etsy-seo.md` 的 Alt Text 段）。无障碍 + 图搜双收益 |
| `视频 Alt (EN)` | 多行文本 | Etsy listing 视频的 alt text，1 条。≤ 125 字符，一句话描述视频画面 |
| `备注` | 多行文本 | 任何特殊情况：定制规则、容易碎、不发某些国家、限定批次等 |

## 进阶字段（可选，等业务跑顺再加）

- `首次纠正记录` / `last_correction`：记录用户最近一次对该 listing 的纠正反馈（用于回流到 BRAND.md 沉淀）
- `引用的品牌原则`：多选关联（如哪些 BRAND.md 原则是该 listing 重点体现的）—— 适合做品牌一致性 audit 时追溯
- `合规标记`：是否含定制/IP/限定地区物料（影响 Etsy 政策合规）

## 视图建议（建完字段后顺手建）

- **全部** — 默认视图
- **在售** — 状态=在售，按上线日倒序
- **草稿与待上线** — 状态∈{草稿, 待上线}，按 SKU 升序
- **缺货** — 库存=0 且状态=在售
- **按品类** — 分组视图

## 字段命名约定

- 中文标签优先（用户用中文交互）；英文内容字段（`Title (EN)`、`Description (EN)`、`Tags`、`Materials`）保留英文标签——这些是 Etsy 平台的字段名，与 Etsy 后台对得上
- 主键 `SKU` 用大写英文 + 数字，方便 grep 和不同表关联

## 不建议在 Base 里塞的东西

- 摄影原图：体积大、版本多 → 走资产库（`assets-library` skill）+ 链接字段
- 客户订单数据：另一个 Base（未来 `orders-customers` skill）
- 评价记录：未来另一个 Base
- 长篇 listing 描述的草稿历史：写完确认就覆盖；版本控制不该在 Base 里做

## 反查素材：商品 Base ↔ 素材索引 Base

本商品 Base 没有"照片字段"——素材通过 `assets-library` 的素材索引 Base 反向关联（关联 SKU 字段）。在飞书 Base 里点开某 SKU 行，能看到所有指向它的素材索引行。

**注意范围**：反查到的是该 SKU 的 **promoted 成品**（已经走过 assets-library 模式 B2 的）。**未录入 Base 的素材不在反查结果里**——找未分类素材浏览 `素材库/待处理/` 文件夹（详见 [assets-library/references/folder-structure.md](../../assets-library/references/folder-structure.md)）。

是否在商品 Base 上加"照片链接"快捷字段，由 assets-library 的 [asset-types.md § 与 listing-catalog 的协作](../../assets-library/references/asset-types.md#与-listing-catalog-的协作) 在每次 promote 时反向问用户，本表不预设。

## 建表后的下一步

1. 让用户给一个示范 SKU（已上线的或一个准备上的），手填一行让你看 schema 是不是合用
2. 如果合用：可以批量从 Etsy 后台或现有 Excel 导入历史 SKU（用户自己导，本 skill 不替操作 Etsy）
3. 用户用一两周后回头补辅助字段
