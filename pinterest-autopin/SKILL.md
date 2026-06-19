---
name: pinterest-autopin
description: 把电商商品 + 素材库 + 品牌底座组装成 Pinterest pin，用 Pinterest-autopin 工具发布；也作为 social-publisher 的 Pinterest adapter。支持单图 pin 和轮播 pin（carousel，2-5 张图）。三种触发：(1) "接 Pinterest / 配置自动 pin / 建 pin 流水线"——装工具 + 建 Pin Queue Base；(2) "给 SKU 出 pin / 写 pin 文案 / 排队下一条 pin"——读 BRAND + 商品 Base + 素材 Base 组装一条 Pin Queue；(3) "发 pin / 跑 autopin / 测试 pin / validate / publish"——按 validate→test→final 三阶段执行并回写状态。每次只发一条。
layer: application
depends-on: [shop-foundation, listing-catalog, assets-library]
---

# Pinterest AutoPin

这个 skill 把电商店铺的「商品 + 素材 + 品牌」组装成 Pinterest pin，并用外部工具 [Pinterest-autopin](https://github.com/easyaitech/Pinterest-autopin)（Playwright + Chrome profile，非 Pinterest 官方 API）发布。

它可以被用户直接触发，也可以作为 `social-publisher` 的 Pinterest adapter 被调用。跨平台 Publishing Queue 的 source of truth 仍在 `content-asset-pool` / `social-publisher`；本 skill 只负责 Pinterest Pin Queue 与 Pinterest 发布动作。

支持两种 pin 类型：
- **单图 pin**：1 张图片，经典 Pinterest pin
- **轮播 pin**（carousel）：2-5 张图片，用户左右滑动浏览。适合展示产品多角度、使用场景组合、系列产品对比

**Pin Queue 核心模型**：一条 Base 记录 = 一个 Pinterest Pin。多图轮播不要拆成多条记录，而是在同一行里用有序 `image 路径` 列表 + 有序 `Alt Text (EN)` 段落表示。发布成功后这一行只回写一个 `pin_url`。

**架构**：本 skill 维护**语义层**（Pin Queue Base：写什么、发到哪、是否发成功），物理发布动作下沉到 Pinterest-autopin 这个外部 CLI 工具。两层之间通过一个 `request.json` 文件交接。

**工具补丁交付**：`references/patches/pinterest-video-pin-support-a5ccaec.patch` 是 Pinterest-autopin 视频 Pin 支持补丁（源自不可访问的工具仓库本地提交 `a5ccaec`）。在 `easyaitech/Pinterest-autopin` 不可访问时，先通过本仓库沉淀；拿到工具仓库权限后，把该 patch 应用到工具源码仓库再开 PR。

**对外的实操接口**：
- 飞书 Base（用 `lark-base` skill 操作 Pin Queue + 反查商品 / 素材 Base）
- 工作区根目录的 BRAND.md / SHOP.md（用 `shop-foundation` 维护）
- 外部工具：`~/code/etsy-skills/tools/Pinterest-autopin/`（用 terminal 调用 `npm run pin:*`；工具源码本体走 `$HOME` 是开发者机器约定，**runtime 数据按工作区隔离**——见模式 C）
- 独立 Chrome profile（用于 Pinterest 登录态持久化）
- 图片发布副本处理工具链：`remove-ai-watermarks` + `jpegoptim` + `optipng`（只清 AI metadata / AI watermark + 无损压缩——见 `references/image-processing.md`）

> 共享引导（版本检查 / 工作区解析 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 前置就绪检查（Mode B / C 入口守卫）

用户触发 Mode B 或 Mode C 时，在执行任何业务逻辑之前，**静默**按编号顺序逐项检查，任何一项失败即停止后续检查，直接按该项的失败话术回复并提议进入 Mode A。

| # | 检查项 | 怎么检查 | 失败时怎么说 |
|---|--------|----------|-------------|
| 1 | Pinterest-autopin 工具已安装且版本支持轮播 | 跑 `etsy-stack pinterest-tool status`，要求工具目录存在且版本 `>= 1.4.0` | 「Pinterest-autopin 发布工具还没装，或版本低于 1.4.0，当前发布器还不能可靠发轮播 pin。要现在运行 `etsy-stack pinterest-tool update` 升级吗？」 |
| 2 | Chrome profile 目录已存在 | 检查 `references/runtime-setup.md` §路径约定 中的 Chrome profile 目录是否存在 | 「Pinterest 的 Chrome 登录档还没建。要现在初始化吗？」 |
| 3 | Pin Queue Base 已存在 | 用 `lark-base` 搜索名称含 `{店铺名}-Pin Queue` 的 Base（店铺名取自 SHOP.md） | 「Pin Queue 飞书多维表格还没建。要现在建吗？我会按 schema 引导你。」 |
| 4 | `BRAND_MARKETING.md` 存在 | 检查 `<workspace>/BRAND_MARKETING.md` 是否存在 | 「营销策略底座还没建。要用 shop-foundation 建立吗？我会引导你完成营销策略访谈。」 |
| 5 | `MARKETING_PLATFORM.md` 存在 | 检查 `<workspace>/MARKETING_PLATFORM.md` 是否存在 | 「平台内容策略还没建。要用 shop-foundation 建立吗？我会引导你定义各平台的内容规范。」 |

> BRAND.md / SHOP.md 的缺失检查不在此处——由下方 §依赖关系 在组 pin 前处理，属于内容锚点而非基础设施。BRAND_MARKETING.md / MARKETING_PLATFORM.md 属于策略基座，缺失时无法正确决定内容方向，因此列入前置检查。

**路由规则**：
- 任何一项失败 → 提议进入 Mode A；用户同意后直接开始 Mode A 流程，不需要用户重新说"接入 Pinterest"
- 用户说"以后再说" → 尊重，不在同一对话中反复催促；告知用户「好的，需要接入 Pinterest 时随时说」，结束当前任务路由回到待命状态

---

## 依赖关系（每次组 pin / 发 pin 前必读）

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` | 文案语调 / 视觉原则 / 边界 | pin 的 title / description / altText 严格遵守"应该说"、"避免说"、"原则"段；选图时用视觉禁区做合规自检 |
| `<workspace>/SHOP.md` | 店铺 URL / 主营品类 | 店铺 URL 只作人工核对或非商品内容 fallback；商品型 pin 的 `link` 必须由商品 Base `分享链接` 提供 |
| `<workspace>/BRAND_MARKETING.md` | 营销定位 / 人群 / 情感触点 / 场景矩阵 / 红线 | pin 文案的情感锚点与场景归属；选题优先级；红线过滤 |
| `<workspace>/MARKETING_PLATFORM.md` | Pinterest 章节：内容规范 / 配比 / 红线 | pin 视觉规范、文字规范、内容配比按 Pinterest 章节执行 |
| 商品 Base（listing-catalog）| `分享链接` / `平台商品 ID` / 标题 / SEO 关键词 / 上线状态 | `Link` 优先读取商品 Base `分享链接`；SKU、record_id 与 `平台商品 ID`（如 Etsy Listing ID / ASIN / item_id）用于追溯；标题与 SEO 词做 pin title 的锚；**未上线或缺分享链接的 SKU 不允许排队** |
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
   - 如果工具目录已存在，先跑 `etsy-stack pinterest-tool update`，确保发布工具版本 `>= 1.4.0`；旧版 `v1.3.x` 只可靠支持单图 pin
2. 跑一次 `npm run pin:check-login`，让用户在弹出的 Chrome 里手动完成 Pinterest 登录；登录态持久化到 Chrome profile
3. 读 `references/pin-queue-base-schema.md`，用 `lark-base` 在与商品 / 素材 Base 同一个云空间目录下创建 `{店铺名}-Pin Queue` Base，按 schema 建字段（关联字段必须指向已有的商品 Base + 素材索引 Base；`关联素材` 设为允许多值以支持轮播 pin；`image 路径` 与 `Alt Text (EN)` 必须支持多行）和推荐视图
4. 落盘后告诉用户：工具路径 + Chrome profile 路径 + Base 链接 + 字段清单 + 一句"下一步可以用 Pin 模式 B 出第一条 pin 试试——单图或轮播都可以"

> **不要替用户在 Pinterest 上建 board**——board 是用户在 Pinterest 后台手动建好（涉及账号操作）。本 skill 在模式 B 取 board 名时假设用户已建好。

### 模式 B：组 pin（读多源 → 写 Pin Queue 草稿）

**进入条件**：
- 用户要给某个 SKU 出 pin / 写 pin 文案 / 排队下一条 pin
- 用户给了某张（或多张）素材问"这几张能发 Pinterest 吗、配什么文案"
- **前置就绪检查全部通过**（见上方 §前置就绪检查）；未通过则停下引导，不继续

**执行步骤**：
1. 按 `references/pin-composition.md` § 输入清单盘点用户已给的输入；**缺必填项一次性问全**（目标 SKU、目标 board、是否指定素材），不要边写边追问。如用户给了多张素材，确认是否要做轮播 pin
2. 用 `lark-base` 查商品 Base 取 SKU 行：
   - 校验 `状态 = 在售`，否则中止并提示用户先上线 listing
   - 取商品 Base `分享链接` → 写入 Pin Queue `Link`；同时记录 SKU + 商品 record_id + `平台商品 ID` 便于追溯。缺 `分享链接` 时中止，回 `listing-catalog` 补字段，不临时拼平台 URL
   - 取 SKU 标题 / SEO 关键词作 pin title 的锚
3. 用 `lark-base` 查素材索引 Base 的「Pinterest 候选」视图：
   - **如果用户指定了素材**（1 张或多张）——逐张做 4 路分流，统一格式 `条件 → 中止，先去解决 X 再回来`：
     - 在 Base 且 `公开授权 = 已授权` 且 `用途标签 ⊇ Pinterest` → ✅ 该张通过
     - 在 Base 但缺 Pinterest 用途标签 → 中止，先回 assets-library 加 Pinterest 用途标签再来
     - 在 Base 但 `公开授权 ≠ 已授权` → 中止，先把授权拿到（公开授权改 `已授权`）再来
     - **不在 Base**（还在待处理区） → 中止，先走 assets-library 模式 B2 promote 再来
   - **多图时所有图都通过后才继续**；任何一张未通过则整条 pin 中止
   - **如果未指定**：列出该 SKU 关联的、已授权且标了 Pinterest 用途的候选素材让用户挑（可选 1 张做单图 pin，或 2-5 张做轮播 pin）。视图为空时进入下面 step 3.5 的三选一
3.5. **(条件触发) 候选池空时三选一** — Pinterest 候选视图为空时给用户挑：
   - ① 先回 assets-library 模式 B2 promote 几张已有原片 → 中止本次组 pin，用户走完 promote 后回来
   - ② 反向触发 image-synth 模式 B AI 合成一张：**调用方现传** SKU + 目标 board + 已草拟的 pin 文案 + 目标平台 = Pinterest 1000×1500 in-memory；image-synth 出图 + QA + 用户选"入库"（走 assets-library B2）后回到本 step 3 继续选这张
   - ③ 跳过本次发 pin
   - 节奏：本步是 step 3 候选池空时**同一 turn 内** agent 主动追问；用户选后才 invoke 下一个 skill
3.7. **(轮播 pin) 确认图片顺序** — 多图时列出已选素材的编号和缩略描述，让用户确认或调整展示顺序。第一张是封面图（Pinterest feed 里默认展示的那张），选择上优先挑最抓眼球的
3.8. **图片处理**（素材选定后、写文案前）——按 `references/image-processing.md` 的流程处理到 `<workspace>/.cache/pinterest-autopin/processed/`：
   - 单图：发布副本流程（复制 → AI metadata / AI watermark 清理 → 无损压缩）
   - 多图：逐张走同一流程（见 image-processing.md § 多图处理）
   - 后续步骤统一使用 processed 路径
4. 读 BRAND.md（文案语调 / 视觉原则）+ SHOP.md（店铺事实，描述末尾不要重复政策——Pinterest 不是 listing 页面，政策在 link 那边）
5. 按 `references/pin-composition.md` 输出草稿：
   - **共用内容**：title / description / link / board
   - **每图独立**：alt text（每张图各写一段）
   - **辅助信息**：pin 类型（单图/轮播）、image 路径列表
6. **整篇展示**给用户，等用户确认或调整。轮播 pin 时按顺序编号展示每张图及其 alt text，便于用户逐张检查
7. 用户确认后，按 `references/pin-queue-base-schema.md` § 录入约定 用 `lark-base` 在 Pin Queue Base 写一行（状态 = `草稿`），关联到商品行 + 素材行。写入时：
   - `pin 类型` = 单图（1 张）或 轮播（2-5 张）
   - `关联素材` 关联所有选中的素材记录（用于追溯来源；发布顺序以 `image 路径` 行顺序为准）
   - `image 路径` = 每张 processed 路径各占一行（单图时一行；多图时顺序就是 carousel 展示顺序）
   - `Alt Text (EN)` = 每张 alt text 用 `---` 独占行分隔（单图时无分隔符）
   - `图片数量` = 图片行数；`封面图` = 第一张 processed 路径（如字段已建）
   - `备注` = 追加 `aiSanitization` 处理记录（来自 step 3.8），用于模式 C 判断该发布副本已完成 AI metadata / AI watermark 清理；不要覆盖用户已有节日联动 / 授权备注

> **一次只组一条 pin**——不批量。批量需求让用户重复触发，或交给 `loop` skill 编排（不在本 skill 范围）。

### 模式 C：发布（取草稿 → 跑 Pinterest-autopin → 回写状态）

**进入条件**：
- 用户要发 pin / 跑 autopin / 测试某条 pin / 跑 validate / publish
- **前置就绪检查全部通过**（见上方 §前置就绪检查）；未通过则停下引导，不继续

**执行步骤**：
1. 用 `lark-base` 从 Pin Queue Base 取目标行（用户指定 ID，或筛 `状态 = 草稿` 让用户挑一条）
2. 解析工作区根（`etsy-stack workspace`），得到 `<workspace>`；runtime 目录是 `<workspace>/.cache/pinterest-autopin/runtime/`，不存在就 `mkdir -p` 创建（一次即可）
2.5. **图片处理守卫**：读 `image 路径` 按行拆分，逐张检查是否以 `<workspace>/.cache/pinterest-autopin/processed/` 开头且文件存在，且处理记录包含 AI 发布图清理结果——全部通过则跳过；未通过的按 `references/image-processing.md` 处理，用 processed 路径覆盖
3. 按 `references/publishing-flow.md` § request.json 构造 把行字段渲染成 `request.json`（用 `assets/request-template.json` 作模板）：
   - `image 路径` 按行拆分 + `Alt Text (EN)` 按 `---` 拆分 → 配对为 `images` 数组
   - 任何 pin 都生成 `images` 数组；单图只是长度为 1，轮播长度为 2-5
   - 写到 `<workspace>/.cache/pinterest-autopin/runtime/{pin_id}.json`
4. **三阶段执行**（`references/publishing-flow.md` § 三阶段约定）。所有 `npm run pin:*` 命令都需要传 `--input <workspace>/.cache/pinterest-autopin/runtime/{pin_id}.json` 的**绝对路径**（工具源码在 `~/code/etsy-skills/tools/Pinterest-autopin/`，cwd 不在工作区）：
   - **validate**：`npm run pin:validate -- --input <绝对路径>`，校验 JSON（多图时额外校验 `images` 数组长度和每个元素的完整性）
   - **test**：`npm run pin:test -- --input <绝对路径>`，工具会先自动跑 `check-login` preflight；登录可用才弹出 Chrome 填表但不点发布；让用户**目视确认**预览效果（轮播 pin 让用户确认图片顺序和每张图的展示效果）
   - **final**：用户在对话里说"发吧 / publish / 真发"后，跑 `npm run pin:publish -- --input <绝对路径>`；工具会先自动跑 `check-login` preflight，登录不可用时会在发布前中止
   - CDP：工具默认探测 live Chrome CDP `9225 → 9222`，也可用 `PINTEREST_AUTOPIN_CDP_PORT` / `PINTEREST_CDP_PORT` 强制指定；如果 Chrome profile 已打开但 live CDP 可达，工具会自动切到 CDP 避免 `SingletonLock`
5. 解析 stdout 的 JSON 输出：
   - 成功：取 `pinUrl`，回写 Pin Queue Base 该行（`状态 = 已发` / `pin_url = ...` / `发布时间 = 现在`）
   - 失败：按 `references/publishing-flow.md` § 错误恢复 分类（登录失效 / board 找不到 / 网络），回写（`状态 = 失败` / `失败原因 = ...` / `重试次数 += 1`）并告诉用户对应处置
6. 告诉用户最终结果（pin URL 或失败原因）

> **不替用户跳过 test 阶段**——首次发某 board / 首次用某素材尺寸 / 首次发轮播 pin 时，test 阶段的目视检查能拦下大量翻车（裁切错位、文案截断、轮播顺序错误）。用户明确说"已经测过了，直接 final"才能跳。

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束。本 skill 特有禁区：

- **不替用户登录 Pinterest**：登录在 Chrome profile 初始化时由用户人工完成；token / 密码不进任何文件
- **不替用户建 board**：board 在 Pinterest 后台由用户手建；本 skill 只引用名称
- **未授权的 UGC 绝不发**：素材索引 Base 的 `公开授权` 不是 `已授权` 的素材不进入排队流程——按模式 B 第 3 步指引用户先走授权 / promote 流程，无论用户怎么催
- **未上线 listing 不出 pin**：商品 Base `状态 ≠ 在售` 的 SKU 不允许排队（pin 的 link 会 404，损害店铺信用）
- **Pin Queue 写入用 lark-base 的 diff 风格预览** → 等确认 → 落盘
- **final 发布前必须经过 test**：除非用户明确豁免
- **Pinterest-autopin 跑挂了不重试**：默认重试一次，第二次失败把状态停在 `失败`，等用户人工介入（盲目重试可能被 Pinterest 风控）
- **自动发布 cron 要做过期 backlog 恢复**：每次运行发布脚本前，先检查 `待发` / `草稿`、`pin_url` 为空、`重试次数 < 2` 的记录；如果 Hermes/cron 中断导致多条记录已过期，保留最早一条立即发布，把其余过期记录顺延到现有未来队列之后的北美友好档位，避免恢复后连续发布旧 backlog。内容配比与每日条数按 `MARKETING_PLATFORM.md` 的 Pinterest 章节执行（未配置时默认每天 1 条品牌/内容型 pin + 1 条商品/礼物型 pin）；各类别按各自配额规划，不要超量消耗。不要重启 `失败` 或已发记录。
- **Pinterest 库存提醒必须分库存独立触发**：品牌/内容型 pin 库存、商品/礼物型 pin 库存是两个不同库存；各自按 3 天阈值独立提醒，不用“总待发/草稿”合并判断，也不要把两类缺货混成一条泛化库存提醒。
- **轮播 pin 不要拆成多个单图 pin 发**：轮播是一个 pin 对象，必须整体发布
- **Ads Manager Board 选中判定只信任 dropdown selected 值**：Board 下拉打开时列表里出现目标 Board 名，不代表已选中；必须看右侧 `[data-test-id="board-dropdown-select-button"]` / `[data-test-id="board-dropdown-item-selected"]` 的文本。若选中后页面仍残留“必须要有图板”旧提示，但发布按钮可用，可视为旧草稿残留，不要因为 body 文本残留而回滚。
- **不要用 `关联素材` 的返回顺序作为发布顺序**：飞书关联字段只做追溯，真正顺序永远来自 `image 路径` 的行顺序

---

## 与其他 skill 的协作 / 回流

- **shop-foundation**：组 pin 时用户**纠正**了文案（"太硬广了"、"Pinterest 上不该这么写"），按 shop-foundation 的沉淀流程提示——纠正可能反映：
  - **BRAND.md 文案语调**的补充（→ distillation-brand.md 流程）
  - 也可能是 Pinterest 这个**渠道特有**的文案手感——这种暂时记到本 skill 的 `references/pin-composition.md`（用户后续触发"沉淀"再进 BRAND.md），不要硬塞 BRAND.md
- **listing-catalog**：本 skill 只**读**商品 Base，不改。如果发 pin 后想统计"哪条 listing 由哪些 pin 引流"，未来在商品 Base 加一个反向关联视图（不在本 skill 现版本范围）
- **content-asset-pool**：当 Pinterest pin 来自跨平台素材发布池时，本 skill 只消费已经确认顺序、授权和发布副本的素材任务；Pin Queue `关联 SKU` 需要保留 SKU + 商品 record_id + `平台商品 ID`，`Link` 必须使用商品 Base `分享链接`，发布成功后把 `pin_url` 回写给素材池对应发布任务。
- **social-publisher**：当用户要“自动发布 / 到点发布 / 发布任务对账”时，优先让 `social-publisher` 读取 Publishing Queue 并调用本 skill。发布成功或失败后，除 Pin Queue 外还必须回写 Publishing Queue。
- **assets-library**：本 skill 只**读**素材索引 Base 的「Pinterest 候选」视图，不改。模式 B 第 3 步若指定素材还未录入 Base，提示用户先回 assets-library 走 B2 promote 再回来排 pin。素材发 pin 后想加标记也回 assets-library 手动维护
- **orders-customers**：UGC 类素材的「公开授权」由 orders-customers 走客户沟通完成；本 skill 只消费已授权的结果
- **image-synth**：模式 B step 3 候选池空时反向触发 image-synth 模式 B；现传 SKU + 目标 board + 已草拟的 pin 文案 in-memory，目标平台 Pinterest 1000×1500；image-synth 出图 + QA + 入库（走 assets-library 模式 B2 promote）后回到本 skill step 3 选这张作 pin 素材

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：
- pin 文案输出（title / description / altText）为**英文**（Pinterest 是海外平台）
- Pin Queue Base 字段标签中英混用（schema 文件里给规范）
- `request.json` 字段名严格按 Pinterest-autopin 上游 schema（英文 camelCase）
