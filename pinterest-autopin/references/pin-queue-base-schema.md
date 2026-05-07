# Pin Queue Base 推荐 Schema

> 用 `lark-base` skill 在飞书云空间创建一个 Base，命名建议：`{店铺名}-Pin Queue`。建在与商品 / 素材 Base 同一个云空间目录下，方便关联。

---

## 核心字段（必建，11 个）

| 字段名 | 飞书字段类型 | 说明 / 示例 |
|---|---|---|
| `pin_id` | 单行文本（**主键**） | 自动生成，建议格式 `PIN-{YYYYMMDD}-{3 位序号}`，如 `PIN-20260505-001` |
| `状态` | 单选 | 草稿 / 待发 / 已发 / 失败 |
| `关联 SKU` | 关联（→ 商品 Base） | 必填——pin 必须挂在某个 SKU 上；通过它能拿到 `Etsy Listing ID` 拼 link |
| `关联素材` | 关联（→ 素材索引 Base） | 必填——pin 用的图来自素材库；通过它能拿到本地文件路径 / 飞书链接 |
| `Board (Pinterest)` | 单选 | Pinterest 上已建好的 board 名（用户在 Pinterest 后台手建后，把名称选项填进来） |
| `Title (EN)` | 多行文本 | Pinterest pin 标题，≤ 100 字符 |
| `Description (EN)` | 多行文本 | Pinterest pin 描述，建议 200-500 字符 |
| `Alt Text (EN)` | 多行文本 | 图片无障碍描述，与 title 不重复 |
| `Link` | URL | pin 跳转目标，通常 = 该 SKU 的 Etsy listing URL |
| `创建时间` | 创建时间（系统） | Base 自动 |
| `创建人` | 创建人（系统） | Base 自动 |

## 发布结果字段（必建，4 个，发布前为空）

| 字段名 | 飞书字段类型 | 说明 |
|---|---|---|
| `pin_url` | URL | 发布成功后的 Pinterest pin URL；失败为空 |
| `发布时间` | 日期时间 | 状态变 `已发` 时填 |
| `重试次数` | 数字 | 默认 0；每次 final 失败 +1 |
| `失败原因` | 单行文本 | 状态 = 失败 时填，按 publishing-flow.md § 错误恢复 的分类（`登录失效` / `board 不存在` / `网络` / `JSON 校验失败` / `未知`）+ 简短原文 |

## 辅助字段（推荐，按需建）

| 字段名 | 飞书字段类型 | 说明 |
|---|---|---|
| `image 路径` | 单行文本 | 该 pin 用的图片**绝对本地路径**（Pinterest-autopin 要求绝对路径）；从素材索引 Base 取或人工填 |
| `创意主题` | 单行文本 | 一句话本条 pin 想表达什么（"早晨独享的茶时光"），便于回看 |
| `备注` | 多行文本 | 任何特殊情况：节日联动、客户授权细节、Pinterest 后台手动调整等 |

## 进阶字段（可选，等数据多了再加）

- `表现快照`：pin 发布后定期回填 impression / save / click（手动 or 未来另一个 skill 拉 Pinterest analytics）
- `关联营销活动`：未来营销日历 skill 上线后关联

---

## 视图建议（建完字段后顺手建）

- **全部** — 默认
- **草稿** — 状态 = 草稿，按创建时间倒序（模式 C 取候选）
- **待发** — 状态 = 待发，按创建时间倒序
- **失败** — 状态 = 失败，按发布时间倒序（用户人工排查）
- **已发** — 状态 = 已发，按发布时间倒序
- **按 SKU 分组** — 分组依据 `关联 SKU`（看每个 SKU 累计发了多少 pin）

---

## 字段命名约定

- 与商品 Base / 素材索引 Base 一致：中文标签优先；英文内容字段（`Title (EN)` / `Description (EN)` / `Alt Text (EN)`）保留英文标签
- `pin_id` 主键用全英文小写下划线，便于在 `request.json` 文件名 (`<workspace>/.cache/pinterest-autopin/runtime/{pin_id}.json`) 直接引用
- `Board (Pinterest)` 用单选不用文本——避免拼写漂移导致 Pinterest-autopin 找不到 board

---

## 录入约定（模式 B 写入草稿时执行）

向 Pin Queue Base 写一行前，**列出将写入的字段值清单**给用户确认：

```
将在 Pin Queue Base 新增一行：
- pin_id: PIN-20260505-001
- 状态: 草稿
- 关联 SKU: TEACUP-001 (《Morning Mist Cup》)
- 关联素材: ASSET-2026-0312 (2026-05-05_TEACUP-001_morning-light_001.jpg)
- Board (Pinterest): Slow Mornings
- Title (EN): Morning Mist Tea Cup — handmade ceramic for slow mornings
- Description (EN): ...
- Alt Text (EN): ...
- Link: https://www.etsy.com/shop/{shop}/listing/1234567890
- image 路径: /Users/johnz/...（绝对路径）
- 创意主题: 早晨独享的茶时光
```

用户确认后才用 `lark-base` 写入。pin_url / 发布时间 / 失败原因 等字段在模式 C 才填。

---

## 校验规则（模式 B 写入前自检）

| 校验项 | 不通过时的处理 |
|---|---|
| `关联 SKU` 在商品 Base 的 `状态 = 在售` | 中止排队，告知用户先上线 listing |
| `关联素材` 在素材索引 Base 的 `公开授权 = 已授权` | 中止排队（特别是客户 UGC） |
| `关联素材` 的 `用途标签 ⊇ Pinterest` | 警告但不强制——如果用户坚持用，提示去素材索引 Base 加上 Pinterest 用途标签 |
| `Title (EN)` ≤ 100 字符 | 截断不动，让用户改 |
| `image 路径` 是绝对路径且文件存在 | 中止排队，提示用户素材未同步到本地或路径错 |
| 同一 SKU + 同一素材**未发布过 pin** | 警告（重复发同图同 SKU 的 pin 容易被 Pinterest 限流），让用户确认是否继续 |

---

## 不建议在 Base 里塞的东西

- 图片本身：用关联到素材索引 Base 即可（素材在 assets-library 维护）
- listing 文案：商品 Base 的字段；Pin Queue 只存 pin 自己的文案
- Chrome profile / Pinterest 凭据：永远不进任何 Base

---

## 建表后的下一步

1. 让用户在 Pinterest 后台建 1-3 个 board（如 `Slow Mornings` / `Handmade Ceramics` / `Tea Rituals`），把名字加进 `Board (Pinterest)` 单选字段的选项
2. 用户挑一个已上线 SKU + 一张已授权的 Pinterest 候选素材，跑一次模式 B 出第一条草稿
3. 跑模式 C 的 validate + test 看一下完整链路通不通，再 final 发第一条真 pin
