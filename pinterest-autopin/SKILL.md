---
name: pinterest-autopin
description: 把 Etsy 商品 + 素材库 + 品牌底座 组装成 Pinterest pin，用 Pinterest-autopin 工具发布。三种触发：(1) "接 Pinterest / 配置自动 pin / 建 pin 流水线"——装工具 + 建 Pin Queue Base；(2) "给 SKU 出 pin / 写 pin 文案 / 排队下一条 pin"——读 BRAND + 商品 Base + 素材 Base 组装一条 Pin Queue；(3) "发 pin / 跑 autopin / 测试 pin / validate / publish"——按 validate→test→final 三阶段执行并回写状态。每次只发一条。
layer: application
depends-on: [shop-foundation, listing-catalog, assets-library]
---

# Pinterest AutoPin

这个 skill 把 Etsy 店铺的「商品 + 素材 + 品牌」组装成 Pinterest pin，并用外部工具 [Pinterest-autopin](https://github.com/easyaitech/Pinterest-autopin)（Playwright + Chrome profile，非 Pinterest 官方 API）发布。

**架构**：本 skill 维护**语义层**（Pin Queue Base：写什么、发到哪、是否发成功），物理发布动作下沉到 Pinterest-autopin 这个外部 CLI 工具。两层之间通过一个 `request.json` 文件交接。

**对外的实操接口**：
- 飞书 Base（用 `lark-base` skill 操作 Pin Queue + 反查商品 / 素材 Base）
- 工作区根目录的 BRAND.md / SHOP.md（用 `shop-foundation` 维护）
- 外部工具：`~/code/etsy-skills/tools/Pinterest-autopin/`（用 terminal 调用 `npm run pin:*`；工具源码本体走 `$HOME` 是开发者机器约定，**runtime 数据按工作区隔离**——见模式 C）
- 独立 Chrome profile（用于 Pinterest 登录态持久化）
- 图片处理工具链：`exiftool` + `jpegoptim` + `optipng`（清除元数据 + 无损压缩——见 `references/image-processing.md`）

> 共享引导（版本检查 / 工作区解析 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 前置就绪检查（Mode B / C 入口守卫）

用户触发 Mode B 或 Mode C 时，在执行任何业务逻辑之前，**静默**按编号顺序逐项检查，任何一项失败即停止后续检查，直接按该项的失败话术回复并提议进入 Mode A。

| # | 检查项 | 怎么检查 | 失败时怎么说 |
|---|--------|----------|-------------|
| 1 | Pinterest-autopin 工具已安装 | 检查 `references/runtime-setup.md` §路径约定 中的工具目录是否存在 | 「Pinterest-autopin 工具还没装。要现在装吗？我会按 Mode A 的步骤引导你。」 |
| 2 | Chrome profile 目录已存在 | 检查 `references/runtime-setup.md` §路径约定 中的 Chrome profile 目录是否存在 | 「Pinterest 的 Chrome 登录档还没建。要现在初始化吗？」 |
| 3 | Pin Queue Base 已存在 | 用 `lark-base` 搜索名称含 `Pin Queue` 的 Base | 「Pin Queue 飞书多维表格还没建。要现在建吗？我会按 schema 引导你。」 |

> BRAND.md / SHOP.md 的缺失检查不在此处——由下方 §依赖关系 在组 pin 前处理，属于内容锚点而非基础设施。

**路由规则**：
- 任何一项失败 → 提议进入 Mode A；用户同意后直接开始 Mode A 流程，不需要用户重新说"接入 Pinterest"
- 用户说"以后再说" → 尊重，不在同一对话中反复催促；告知用户「好的，需要接入 Pinterest 时随时说」，结束当前任务路由回到待命状态

---

## 依赖关系（每次组 pin / 发 pin 前必读）

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` | 文案语调 / 视觉原则 / 边界 | pin 的 title / description / altText 严格遵守"应该说"、"避免说"、"原则"段；选图时用视觉禁区做合规自检 |
| `<workspace>/SHOP.md` | Etsy 店铺 URL / 主营品类 | pin 的 `link` 默认指向 listing URL（由商品 Base 提供）；店铺 URL 作 fallback；主营品类辅助 board 命名 |
| 商品 Base（listing-catalog）| `listing_id` / 标题 / SEO 关键词 / 上线状态 | 拼 Etsy listing URL = `{etsy_shop_url}/listing/{listing_id}`；标题与 SEO 词做 pin title 的锚；**未上线的 SKU 不允许排队** |
| 素材索引 Base（assets-library）| 「Pinterest 候选」视图 | 用筛选 `用途标签 ⊇ Pinterest AND 公开授权 = 已授权` 的素材；客户 UGC 没拿到授权的**绝不发** |
| Pin Queue Base（本 skill）| 待发 / 已发 / 失败状态 + pin URL | 模式 B 写入草稿；模式 C 取草稿发布并回写结果 |

如 BRAND.md / SHOP.md 缺失，组 pin 前主动提示用户先用 shop-foundation 建立——pin 文案的语调和店铺 URL 没有锚点。

---

## 三种执行模式

### 模式 A：建库 + 装工具（首次接入 Pinterest）

**进入条件**：
- 用户明确说要接入 Pinterest / 配置自动 pin / 建 pin 流水线
- 项目下尚无 Pin Queue Base
- 或 `~/code/etsy-skills/tools/Pinterest-autopin/` 不存在

**执行步骤**：
1. 读 `references/runtime-setup.md` —— 按里面的步骤 clone Pinterest-autopin 到 `~/code/etsy-skills/tools/`、`npm install`、初始化 Chrome profile（Chrome profile 路径建议 `~/.config/pinterest-autopin/chrome-profile/`，不进 git）。runtime/ 目录按工作区隔离，模式 C 时再创建——不在装机阶段建
2. 跑一次 `npm run pin:check-login`，让用户在弹出的 Chrome 里手动完成 Pinterest 登录；登录态持久化到 Chrome profile
3. 读 `references/pin-queue-base-schema.md`，用 `lark-base` 在与商品 / 素材 Base 同一个云空间目录下创建 `{店铺名}-Pin Queue` Base，按 schema 建字段（关联字段必须指向已有的商品 Base + 素材索引 Base）和推荐视图
4. 落盘后告诉用户：工具路径 + Chrome profile 路径 + Base 链接 + 字段清单 + 一句"下一步可以用 Pin 模式 B 出第一条 pin 试试"

> **不要替用户在 Pinterest 上建 board**——board 是用户在 Pinterest 后台手动建好（涉及账号操作）。本 skill 在模式 B 取 board 名时假设用户已建好。

### 模式 B：组 pin（读多源 → 写 Pin Queue 草稿）

**进入条件**：
- 用户要给某个 SKU 出 pin / 写 pin 文案 / 排队下一条 pin
- 用户给了某张素材问"这张能发 Pinterest 吗、配什么文案"
- **前置就绪检查全部通过**（见上方 §前置就绪检查）；未通过则停下引导，不继续

**执行步骤**：
1. 按 `references/pin-composition.md` § 输入清单盘点用户已给的输入；**缺必填项一次性问全**（目标 SKU、目标 board、是否指定素材），不要边写边追问
2. 用 `lark-base` 查商品 Base 取 SKU 行：
   - 校验 `状态 = 已上线`，否则中止并提示用户先上线 listing
   - 取 `listing_id` → 拼 Etsy listing URL（店铺 URL 来自 SHOP.md）
   - 取 SKU 标题 / SEO 关键词作 pin title 的锚
3. 用 `lark-base` 查素材索引 Base 的「Pinterest 候选」视图：
   - **如果用户指定了素材**——4 路分流，统一格式 `条件 → 中止，先去解决 X 再回来`：
     - 在 Base 且 `公开授权 = 已授权` 且 `用途标签 ⊇ Pinterest` → ✅ 走原流程
     - 在 Base 但缺 Pinterest 用途标签 → 中止，先回 assets-library 加 Pinterest 用途标签再来
     - 在 Base 但 `公开授权 ≠ 已授权` → 中止，先把授权拿到（公开授权改 `已授权`）再来
     - **不在 Base**（还在待处理区） → 中止，先走 assets-library 模式 B2 promote 再来
   - **如果未指定**：列出该 SKU 关联的、已授权且标了 Pinterest 用途的候选素材让用户挑。视图为空时进入下面 step 3.5 的三选一
3.5. **(条件触发) 候选池空时三选一** — Pinterest 候选视图为空时给用户挑：
   - ① 先回 assets-library 模式 B2 promote 几张已有原片 → 中止本次组 pin，用户走完 promote 后回来
   - ② 反向触发 image-synth 模式 B AI 合成一张：**调用方现传** SKU + 目标 board + 已草拟的 pin 文案 + 目标平台 = Pinterest 1000×1500 in-memory；image-synth 出图 + QA + 用户选"入库"（走 assets-library B2）后回到本 step 3 继续选这张
   - ③ 跳过本次发 pin
   - 节奏：本步是 step 3 候选池空时**同一 turn 内** agent 主动追问；用户选后才 invoke 下一个 skill
3.8. **图片处理**（素材选定后、写文案前）——按 `references/image-processing.md` 的三步流程（复制 → 清元数据 → 无损压缩）处理到 `<workspace>/.cache/pinterest-autopin/processed/`；后续步骤统一使用 processed 路径
4. 读 BRAND.md（文案语调 / 视觉原则）+ SHOP.md（店铺事实，描述末尾不要重复政策——Pinterest 不是 listing 页面，政策在 link 那边）
5. 按 `references/pin-composition.md` § 文案规则输出草稿：title / description / altText / link / board / image 路径
6. **整篇展示**给用户，等用户确认或调整
7. 用户确认后，按 `references/pin-queue-base-schema.md` § 录入约定 用 `lark-base` 在 Pin Queue Base 写一行（状态 = `草稿`），关联到商品行 + 素材行

> **一次只组一条 pin**——不批量。批量需求让用户重复触发，或交给 `loop` skill 编排（不在本 skill 范围）。

### 模式 C：发布（取草稿 → 跑 Pinterest-autopin → 回写状态）

**进入条件**：
- 用户要发 pin / 跑 autopin / 测试某条 pin / 跑 validate / publish
- **前置就绪检查全部通过**（见上方 §前置就绪检查）；未通过则停下引导，不继续

**执行步骤**：
1. 用 `lark-base` 从 Pin Queue Base 取目标行（用户指定 ID，或筛 `状态 = 草稿` 让用户挑一条）
2. 解析工作区根（`etsy-stack workspace`），得到 `<workspace>`；runtime 目录是 `<workspace>/.cache/pinterest-autopin/runtime/`，不存在就 `mkdir -p` 创建（一次即可）
2.5. **图片处理守卫**：检查 `image 路径` 是否以 `<workspace>/.cache/pinterest-autopin/processed/` 开头且文件存在——是则跳过；否则按 `references/image-processing.md` 处理，用 processed 路径覆盖后续构造
3. 按 `references/publishing-flow.md` § request.json 构造 把行字段渲染成 `request.json`（用 `assets/request-template.json` 作模板），写到 `<workspace>/.cache/pinterest-autopin/runtime/{pin_id}.json`
4. **三阶段执行**（`references/publishing-flow.md` § 三阶段约定）。所有 `npm run pin:*` 命令都需要传 `--input <workspace>/.cache/pinterest-autopin/runtime/{pin_id}.json` 的**绝对路径**（工具源码在 `~/code/etsy-skills/tools/Pinterest-autopin/`，cwd 不在工作区）：
   - **validate**：`npm run pin:validate -- --input <绝对路径>`，校验 JSON
   - **test**：`npm run pin:test -- --input <绝对路径>`，弹出 Chrome 填表但不点发布；让用户**目视确认**预览效果
   - **final**：用户在对话里说"发吧 / publish / 真发"后，跑 `npm run pin:publish -- --input <绝对路径>`
5. 解析 stdout 的 JSON 输出：
   - 成功：取 `pinUrl`，回写 Pin Queue Base 该行（`状态 = 已发` / `pin_url = ...` / `发布时间 = 现在`）
   - 失败：按 `references/publishing-flow.md` § 错误恢复 分类（登录失效 / board 找不到 / 网络），回写（`状态 = 失败` / `失败原因 = ...` / `重试次数 += 1`）并告诉用户对应处置
6. 告诉用户最终结果（pin URL 或失败原因）

> **不替用户跳过 test 阶段**——首次发某 board / 首次用某素材尺寸时，test 阶段的目视检查能拦下大量翻车（裁切错位、文案截断）。用户明确说"已经测过了，直接 final"才能跳。

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束。本 skill 特有禁区：

- **不替用户登录 Pinterest**：登录在 Chrome profile 初始化时由用户人工完成；token / 密码不进任何文件
- **不替用户建 board**：board 在 Pinterest 后台由用户手建；本 skill 只引用名称
- **未授权的 UGC 绝不发**：素材索引 Base 的 `公开授权` 不是 `已授权` 的素材不进入排队流程——按模式 B 第 3 步指引用户先走授权 / promote 流程，无论用户怎么催
- **未上线 listing 不出 pin**：商品 Base `状态 ≠ 已上线` 的 SKU 不允许排队（pin 的 link 会 404，损害店铺信用）
- **Pin Queue 写入用 lark-base 的 diff 风格预览** → 等确认 → 落盘
- **final 发布前必须经过 test**：除非用户明确豁免
- **Pinterest-autopin 跑挂了不重试**：默认重试一次，第二次失败把状态停在 `失败`，等用户人工介入（盲目重试可能被 Pinterest 风控）

---

## 与其他 skill 的协作 / 回流

- **shop-foundation**：组 pin 时用户**纠正**了文案（"太硬广了"、"Pinterest 上不该这么写"），按 shop-foundation 的沉淀流程提示——纠正可能反映：
  - **BRAND.md 文案语调**的补充（→ distillation-brand.md 流程）
  - 也可能是 Pinterest 这个**渠道特有**的文案手感——这种暂时记到本 skill 的 `references/pin-composition.md`（用户后续触发"沉淀"再进 BRAND.md），不要硬塞 BRAND.md
- **listing-catalog**：本 skill 只**读**商品 Base，不改。如果发 pin 后想统计"哪条 listing 由哪些 pin 引流"，未来在商品 Base 加一个反向关联视图（不在本 skill 现版本范围）
- **assets-library**：本 skill 只**读**素材索引 Base 的「Pinterest 候选」视图，不改。模式 B 第 3 步若指定素材还未录入 Base，提示用户先回 assets-library 走 B2 promote 再回来排 pin。素材发 pin 后想加标记也回 assets-library 手动维护
- **orders-customers**：UGC 类素材的「公开授权」由 orders-customers 走客户沟通完成；本 skill 只消费已授权的结果
- **image-synth**：模式 B step 3 候选池空时反向触发 image-synth 模式 B；现传 SKU + 目标 board + 已草拟的 pin 文案 in-memory，目标平台 Pinterest 1000×1500；image-synth 出图 + QA + 入库（走 assets-library 模式 B2 promote）后回到本 skill step 3 选这张作 pin 素材

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：
- pin 文案输出（title / description / altText）为**英文**（Pinterest 是海外平台）
- Pin Queue Base 字段标签中英混用（schema 文件里给规范）
- `request.json` 字段名严格按 Pinterest-autopin 上游 schema（英文 camelCase）
