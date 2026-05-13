# Pin Queue Base Schema

> 用 `lark-base` 在飞书云空间创建 `{店铺名}-Pin Queue` Base，建在与商品 / 素材 Base 同一目录下。建表后删除飞书自动生成的「文本」「日期」「附件」三个默认列——它们在本流程中没有用途。

---

## 已有 Base 升级（从单图升级到多图支持）

如果已有 Pin Queue Base（之前用 Mode A 建的单图版本），需要手动修改以下字段以支持轮播 pin：

1. 新增 `pin 类型` 字段（单选：单图 / 轮播）
2. 把 `关联素材` 改为**允许多值**（飞书 Base 关联字段设置里勾选「允许关联多条记录」）
3. 把 `image 路径` 字段类型从「单行文本」改为「多行文本」
4. 新增「轮播」视图（pin 类型 = 轮播）

已有的单图草稿/已发记录不受影响——单图 pin 的 `pin 类型` 留空或手动补填「单图」均可。

---

## 核心字段（必建，12 个）

| 字段名 | 飞书字段类型 | 说明 |
|---|---|---|
| `pin_id` | 单行文本（**主键**） | 格式 `PIN-{YYYYMMDD}-{3 位序号}` |
| `状态` | 单选 | 草稿 / 待发 / 已发 / 失败 |
| `pin 类型` | 单选 | 单图 / 轮播。单图 = 1 张，轮播 = 2-5 张（Pinterest carousel pin） |
| `关联 SKU` | 关联（→ 商品 Base） | 必填；通过它拿 `Etsy Listing ID` 拼 link |
| `关联素材` | 关联（→ 素材索引 Base，**允许多值**） | 必填；单图关联 1 条，轮播关联 2-5 条。关联顺序 = 轮播展示顺序 |
| `Board (Pinterest)` | 单选 | Pinterest 后台已建好的 board 名；用单选避免拼写漂移 |
| `Title (EN)` | 多行文本 | ≤ 100 字符 |
| `Description (EN)` | 多行文本 | 建议 200-500 字符 |
| `Alt Text (EN)` | 多行文本 | 每张图的 alt text 用 `---` 独占一行分隔（见下方 § 多图 alt text 格式）；单图时无分隔符 |
| `Link` | URL | 通常 = Etsy listing URL |
| `创建时间` | 创建时间（系统） | Base 自动 |
| `创建人` | 创建人（系统） | Base 自动 |

## 发布结果字段（必建，4 个，发布前为空）

| 字段名 | 飞书字段类型 | 说明 |
|---|---|---|
| `pin_url` | URL | 发布成功后的 Pinterest pin URL |
| `发布时间` | 日期时间 | 状态变 `已发` 时填 |
| `重试次数` | 数字 | 默认 0；每次 final 失败 +1 |
| `失败原因` | 单行文本 | 按 publishing-flow.md § 错误恢复 分类 + 简短原文 |

## 辅助字段（推荐）

| 字段名 | 飞书字段类型 | 说明 |
|---|---|---|
| `image 路径` | 多行文本 | 每张图的绝对本地路径各占一行，顺序与 `关联素材` 对应（见下方 § 多图路径格式） |
| `创意主题` | 单行文本 | 一句话描述本条 pin 想表达什么 |
| `备注` | 多行文本 | 节日联动、授权细节等特殊情况 |

---

## 多图路径格式

`image 路径` 字段存放所有图片的绝对路径，每行一个，顺序与 `关联素材` 关联记录一一对应：

```
/Users/john/.cache/pinterest-autopin/processed/cup-sage-01.jpg
/Users/john/.cache/pinterest-autopin/processed/cup-sage-02.jpg
/Users/john/.cache/pinterest-autopin/processed/cup-sage-03.jpg
```

单图 pin 时只有一行。

## 多图 alt text 格式

`Alt Text (EN)` 字段存放每张图的独立 alt text，用 `---` 独占一行分隔。顺序与 `image 路径` 一一对应：

```
A pale sage green ceramic teacup on a linen cloth, photographed in soft morning light from above.
---
Close-up of the cup's glazed rim showing the sage green gradient and fine crackle pattern.
---
Three cups arranged on a wooden shelf, each showing a slightly different shade of sage green.
```

单图 pin 时没有 `---` 分隔符，和原来一样是纯文本。

构造 `request.json` 时按分隔符拆分，第 N 段 alt text 对应 `images` 数组第 N 个元素的 `altText`。

---

## 视图建议

- **草稿** — 状态 = 草稿，按创建时间倒序（模式 C 取候选）
- **已发** — 状态 = 已发，按发布时间倒序
- **失败** — 状态 = 失败，按发布时间倒序
- **按 SKU 分组** — 分组依据 `关联 SKU`
- **轮播** — pin 类型 = 轮播（快速查看所有多图 pin）

---

## 录入约定（模式 B 写入草稿时）

写入前列出字段值清单给用户确认，确认后才用 `lark-base` 写入。`pin_url` / `发布时间` / `失败原因` 等在模式 C 才填。

多图 pin 时额外展示：
- 图片数量和顺序（编号列表）
- 每张图的 alt text 对照
- `pin 类型 = 轮播` 自动设置

## 校验规则（模式 B 写入前自检）

| 校验项 | 不通过时 |
|---|---|
| `关联 SKU` 状态 = 在售 | 中止，先上线 listing |
| `关联素材` 每条记录的公开授权 = 已授权 | 中止（特别是客户 UGC） |
| `关联素材` 每条记录的用途标签 ⊇ Pinterest | 警告，提示去加标签 |
| `Title (EN)` ≤ 100 字符 | 让用户改 |
| `image 路径` 每行都是绝对路径且文件存在 | 中止，提示素材未同步 |
| `image 路径` 行数 = `关联素材` 记录数 | 中止，路径和素材不一致 |
| `Alt Text (EN)` 按 `---` 拆分后段数 = 图片数 | 中止，alt text 数量和图片不一致 |
| 轮播 pin 图片数 2-5 张 | 中止，Pinterest carousel 限制 2-5 张 |
| 同一 SKU + 同一素材组合未发布过 | 警告（重复发同图容易被限流） |
