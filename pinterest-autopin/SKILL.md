---
name: pinterest-autopin
description: 把电商商品 + 素材库 + 品牌底座组装成 Pinterest pin，并通过 yanggedianzhang 服务器控制面创建浏览器插件执行任务；也作为 social-publisher 的 Pinterest adapter。Hermes 只负责判断、生成文案、调用服务器工具接口，不持有 Chrome profile、不跑 Playwright、不维护发布队列。三种触发：(1) "接 Pinterest / 配置自动 pin / 建 pin 流水线"——接通服务器工具 + 现有浏览器插件 + 店铺总 Base 内 `社媒发布队列` 表；(2) "给 SKU 出 pin / 写 pin 文案 / 排队下一条 pin"——读 BRAND + `Products 商品` 表 + `Assets 素材池` 表，组装一条 `社媒发布队列`（平台=Pinterest）记录；(3) "发 pin / 测试 pin / publish"——调用服务器工具创建 test job，用户确认后再创建 final/publish job，并回写状态。每次只处理一条。
layer: application
depends-on: [shop-foundation, listing-catalog, assets-library]
---

# Pinterest AutoPin

这个 skill 把电商店铺的「商品 + 素材 + 品牌」组装成 Pinterest pin。发布动作不再由 Hermes 本机的 Playwright / Chrome profile 完成，而是分三层：

1. **Hermes**：读商品、素材、品牌规则，生成 title / description / alt text，调用服务器工具接口。
2. **yanggedianzhang 服务器**：校验租户、保存 Pinterest job 状态、加锁、发放素材下载地址、记录 test / final 结果。
3. **现有浏览器插件**：在租户自己的 Chrome 登录态里打开 Pinterest、填表、上传服务器给的素材，并把结果回传服务器。

它可以被用户直接触发，也可以作为 `social-publisher` 的 Pinterest adapter 被调用。跨平台 `社媒发布队列` 的 source of truth 仍在 `content-asset-pool` / `social-publisher`；本 skill 只负责 `平台 = Pinterest` 行的语义准备、服务器 job 创建和结果回写。

支持的队列模型：
- **单图 pin**：当前服务器工具接口的推荐路径。
- **多图轮播 pin**：队列表可以表达 2-5 张图，但只有当服务器工具和浏览器插件明确支持多素材 job 时才能进入 final；否则只建草稿，不声称已经自动发布。

**`社媒发布队列` 表核心模型**：一条 Base 记录 = 一个 Pinterest Pin。发布成功后这一行只回写一个 `发布 URL`。

**架构边界**：Hermes 不直接读浏览器登录态，不直接点击 Pinterest，不保存 cookie / token / 密码，不把本地绝对图片路径传给浏览器。素材必须先变成服务器能授权下载的 asset，插件再从服务器拉取 Blob/File 上传。

**对外的实操接口**：
- 飞书 Base：用 `lark-base` 操作店铺总 Base 内的 `社媒发布队列` 表，并反查 `Products 商品` / `Assets 素材池` 表；架构见 `../shared/store-base-architecture.md`。
- 工作区根目录的 BRAND.md / SHOP.md / BRAND_MARKETING.md / MARKETING_PLATFORM.md（用 `shop-foundation` 维护）。
- 服务器工具：`POST /api/tools/pinterest/jobs` 创建 test job；`POST /api/tools/pinterest/jobs/confirm-publish` 在 test 通过且用户确认后转 final。详见 `references/publishing-flow.md`。
- 浏览器执行器：沿用现有 Etsy DM 浏览器插件，插件版本必须带 `pinterest` capability。安装 / 升级提示由服务器返回，Hermes 只把 `userMessage` 原样转述给用户。
- 图片发布副本处理工具链：`remove-ai-watermarks` + `jpegoptim` + `optipng`（只清 AI metadata / AI watermark + 无损压缩——见 `references/image-processing.md`）。处理后的文件仍需进入服务器 asset 流程，不能直接作为浏览器上传路径。

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 前置就绪检查（Mode B / C 入口守卫）

用户触发 Mode B 或 Mode C 时，在执行任何业务逻辑之前，**静默**按编号顺序逐项检查。任何一项失败即停止后续检查，按失败话术回复，并提议进入 Mode A 或让服务器返回安装 / 升级提示。

| # | 检查项 | 怎么检查 | 失败时怎么说 |
|---|--------|----------|-------------|
| 1 | 服务器 Pinterest 工具已启用 | 调用服务器工具接口时若返回 `HERMES_TOOL_DISABLED` / `UNAUTHORIZED`，说明 Hermes 侧工具密钥或服务端未配置 | 「Pinterest 发布工具还没有在服务器侧启用，需要管理员先配置 yanggedianzhang 的 Hermes tool secret / tenant binding。」 |
| 2 | 租户浏览器插件可用 | 创建 job 时如果返回 `BROWSER_TOOL_INSTALL_REQUIRED` / `BROWSER_TOOL_UPGRADE_REQUIRED`，读取响应里的 `userMessage` | 原样转述服务器给出的安装 / 升级步骤，不自行编 token，不把 token 写进 Base |
| 3 | `社媒发布队列` 表已存在 | 先读 `<workspace>/docs/store-base.md`，确认店铺总 Base 中已配置 `publishing_queue`（社媒发布队列，属扩展表） | 「`社媒发布队列` 还没建。要现在在店铺总 Base 里建吗？Pinterest pin 就是这张表 `平台 = Pinterest` 的行。」 |
| 4 | `BRAND_MARKETING.md` 存在 | 检查 `<workspace>/BRAND_MARKETING.md` 是否存在 | 「营销策略底座还没建。要用 shop-foundation 建立吗？我会引导你完成营销策略访谈。」 |
| 5 | `MARKETING_PLATFORM.md` 存在 | 检查 `<workspace>/MARKETING_PLATFORM.md` 是否存在 | 「平台内容策略还没建。要用 shop-foundation 建立吗？我会引导你定义各平台的内容规范。」 |

> BRAND.md / SHOP.md 的缺失检查不在此处——由下方 §依赖关系 在组 pin 前处理，属于内容锚点而非基础设施。

**路由规则**：
- 服务器返回浏览器插件安装 / 升级要求 → 把 `userMessage` 给用户，并停在当前任务；用户装好 / 升级后再继续。
- 用户说"以后再说" → 尊重，不在同一对话中反复催促。

---

## 依赖关系（每次组 pin / 发 pin 前必读）

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` | 文案语调 / 视觉原则 / 边界 | pin 的 title / description / altText 严格遵守"应该说"、"避免说"、"原则"段；选图时用视觉禁区做合规自检 |
| `<workspace>/SHOP.md` | 店铺 URL / 主营品类 | 店铺 URL 只作人工核对或非商品内容 fallback；商品型 pin 的 `link` 必须由 `Products 商品` 表的 `分享链接` 提供 |
| `<workspace>/BRAND_MARKETING.md` | 营销定位 / 人群 / 情感触点 / 场景矩阵 / 红线 | pin 文案的情感锚点与场景归属；选题优先级；红线过滤 |
| `<workspace>/MARKETING_PLATFORM.md` | Pinterest 章节：内容规范 / 配比 / 红线 | pin 视觉规范、文字规范、内容配比按 Pinterest 章节执行 |
| `Products 商品` 表（listing-catalog）| `分享链接` / `平台商品 ID` / 标题 / SEO 关键词 / 上线状态 | `链接` 优先读取 `Products 商品` 表的 `分享链接`；SKU、record_id 与 `平台商品 ID` 用于追溯；**未上线或缺分享链接的 SKU 不允许排队** |
| `Assets 素材池` 表（assets-library）| 「Pinterest 候选」视图 | 用筛选 `用途标签 ⊇ Pinterest AND 公开授权 = 已授权` 的素材；客户 UGC 没拿到授权的**绝不发** |
| `社媒发布队列` 表（本 skill）| 待发 / 已发 / 失败状态 + pin URL | 模式 B 写入草稿；模式 C 创建服务器 job 并回写结果 |

如 BRAND.md / SHOP.md 缺失，组 pin 前主动提示用户先用 shop-foundation 建立。

---

## 三种执行模式

### 模式 A：接入服务器工具 + 浏览器插件（首次接入 Pinterest）

**进入条件**：
- 用户明确说要接入 Pinterest / 配置自动 pin / 建 pin 流水线
- 项目下尚无 `社媒发布队列` 表
- 或服务器返回浏览器插件未安装 / 需升级

**执行步骤**：
1. 读 `references/runtime-setup.md`，确认当前采用的是服务器控制面 + 现有浏览器插件，不安装旧 `Pinterest-autopin` 本地工具。
2. 如管理员尚未给该租户 mint `browserToolToken`，提示由管理员在 yanggedianzhang 后台 / ops 接口生成；Hermes 不在对话里公开或持久化 token。
3. 用户侧安装 / 升级现有浏览器插件：由服务器返回的 `userMessage` 指引用户进入 `chrome://extensions/`、加载已解压插件、在扩展程序选项里填写 `Bridge Base URL` 和 `browserToolToken`。
4. 读 `references/pin-queue-base-schema.md` 和 `../shared/store-base-architecture.md`，用 `lark-base` 在店铺总 Base 内创建或补齐 `社媒发布队列` 表，按 schema 建字段和推荐视图。只有用户明确要求隔离时才创建独立 Base。
5. 完成后告诉用户：服务器控制面、浏览器插件状态、Base 链接、字段清单，以及"下一步可以用 Pin 模式 B 出第一条 pin 试试"。

> **不要替用户在 Pinterest 上建 board**——board 是用户在 Pinterest 后台手动建好。本 skill 在模式 B 取 board 名时假设用户已建好。

### 模式 B：组 pin（读多源 → 写 `社媒发布队列` 草稿）

**进入条件**：
- 用户要给某个 SKU 出 pin / 写 pin 文案 / 排队下一条 pin
- 用户给了某张素材问"这张能发 Pinterest 吗、配什么文案"
- **前置就绪检查全部通过**；未通过则停下引导，不继续

**执行步骤**：
1. 按 `references/pin-composition.md` § 输入清单盘点用户已给的输入；**缺必填项一次性问全**（目标 SKU、目标 board、是否指定素材），不要边写边追问。
2. 用 `lark-base` 查店铺总 Base 的 `Products 商品` 表取 SKU 行：
   - 校验 `状态 = 在售`，否则中止并提示用户先上线 listing。
   - 取 `分享链接` → 写入 `社媒发布队列` 表 `链接`；缺 `分享链接` 时中止，回 `listing-catalog` 补字段。
   - 取 SKU 标题 / SEO 关键词作 pin title 的锚。
3. 用 `lark-base` 查 `Assets 素材池` 表的「Pinterest 候选」视图：
   - 指定素材：逐张校验在 Base、`公开授权 = 已授权`、`用途标签 ⊇ Pinterest`。
   - 未指定素材：列出该 SKU 关联的、已授权且标了 Pinterest 用途的候选素材让用户挑。
   - 候选池为空：给用户三选一：① 回 assets-library promote；② 反向触发 image-synth 生成 Pinterest 素材；③ 跳过本次 pin。
4. 图片处理：按 `references/image-processing.md` 生成发布副本并记录 `aiSanitization`。处理后的文件不能直接传给浏览器插件，必须由服务器 asset 流程提供下载。
5. 读 BRAND.md + SHOP.md + BRAND_MARKETING.md + MARKETING_PLATFORM.md，按 `references/pin-composition.md` 输出草稿：
   - title
   - description
   - link
   - board
   - alt text
   - 素材来源 / 处理记录 / 是否已具备服务器 asset
6. **整篇展示**给用户，等用户确认或调整。
7. 用户确认后，按 `references/pin-queue-base-schema.md` § 录入约定，用 `lark-base` 在 `社媒发布队列` 表写一行（状态 = `草稿`），关联到商品行 + 素材行。不要把本地绝对路径当作最终发布输入；本地路径只可作为内部处理证据或待上传来源。

> **一次只组一条 pin**——不批量。批量需求让用户重复触发，或交给 `loop` skill 编排（不在本 skill 范围）。

### 模式 C：发布（取草稿 → 服务器 job → 浏览器插件执行 → 回写状态）

**进入条件**：
- 用户要发 pin / 测试某条 pin / publish
- **前置就绪检查全部通过**；未通过则停下引导，不继续

**执行步骤**：
1. 用 `lark-base` 从 `社媒发布队列` 表取目标行（用户指定 ID，或筛 `状态 = 草稿 / 待发` 让用户挑一条）。
2. 校验 `标题`、`描述`、`链接`、`Board (Pinterest)`、`Alt Text (EN)`、授权和 AI 清理记录。素材必须已经能由服务器提供给插件下载；否则停在草稿，提示先补服务器 asset 流程。
3. 按 `references/publishing-flow.md` § 创建 test job 调用服务器：
   - `POST /api/tools/pinterest/jobs`
   - body 至少包含 `tenantId`、`title`、`description`、`altText`、`link`、`board`
4. 处理服务器响应：
   - `201`：记录 `jobId`，把队列表状态改为 `测试中` / `待测试确认`。
   - `409 BROWSER_TOOL_INSTALL_REQUIRED`：把 `userMessage` 转述给用户，状态保持草稿。
   - `426 BROWSER_TOOL_UPGRADE_REQUIRED`：把 `userMessage` 转述给用户，状态保持草稿。
   - 其他错误：按错误类型写入 `失败原因` 或保持草稿待修。
5. 浏览器插件领取 test job 后会打开 Pinterest 并填表；当前版本的安全边界是 **test 不点发布**。让用户在 Pinterest 页面目视确认图片、board、title、description、alt text、link。
6. 用户确认 test 成功并明确说"发吧 / publish / final"后，调用：
   - `POST /api/tools/pinterest/jobs/confirm-publish`
7. 插件领取 publish job 后执行 final。若当前插件版本仍需要人工点击 Pinterest 页面或人工回报，按插件 UI 指引执行；不要在 Hermes 里假装已经无人值守发布。
8. 服务器收到 final 结果后，Hermes 用结果回写 `社媒发布队列`：
   - 成功：`状态 = 已发`、`发布 URL = resultUrl`、`发布时间 = 现在`、清空失败原因。
   - 失败：`状态 = 失败`、`失败原因 = ...`、`发布尝试次数 += 1`。

> **不替用户跳过 test 阶段**——首次发某 board / 首次用某素材尺寸时，test 阶段的目视检查能拦下裁切错位、文案截断、board 选错等问题。用户明确说"已经测过了，直接 final"才能跳。

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束。本 skill 特有禁区：

- **不在 Hermes/Mac mini 上跑 Playwright 发布 Pinterest**：旧本地工具只作为历史迁移材料，不是推荐路径。
- **不保存浏览器登录态**：登录态只在租户自己的 Chrome / 浏览器插件里。
- **不在对话或 Base 里暴露 browserToolToken**：token 由管理员发放给插件选项页，不让 Hermes 编造、回显或持久化。
- **不替用户建 board**：board 在 Pinterest 后台由用户手建；本 skill 只引用名称。
- **未授权的 UGC 绝不发**：`Assets 素材池` 表的 `公开授权` 不是 `已授权` 的素材不进入排队流程。
- **未上线 listing 不出 pin**：`Products 商品` 表中 `状态 ≠ 在售` 的 SKU 不允许排队。
- **`社媒发布队列` 表写入用 lark-base 的 diff 风格预览** → 等确认 → 落盘。
- **final 发布前必须经过 test**：除非用户明确豁免。
- **发布失败不盲目重试**：默认重试一次，第二次失败把状态停在 `失败`，等用户人工介入。
- **自动发布 cron 要做过期 backlog 恢复**：每次运行发布脚本前，先检查 `待发` / `草稿`、`发布 URL` 为空、`发布尝试次数 < 2` 的记录；每轮默认只处理最早一条，避免恢复后连续发布旧 backlog。
- **Pinterest 库存提醒必须分库存独立触发**：品牌/内容型 pin 库存、商品/礼物型 pin 库存是两个不同库存。
- **多图轮播不拆成多个单图 pin 发**：服务器 / 插件未支持多素材 final 时只能停在草稿或人工发布，不得拆分冒充轮播。

---

## 与其他 skill 的协作 / 回流

- **shop-foundation**：组 pin 时用户纠正文案，先判断是 BRAND.md 的语调补充，还是 Pinterest 渠道特有手感；渠道特有内容暂记到 `references/pin-composition.md`。
- **listing-catalog**：本 skill 只读 `Products 商品` 表，不改商品事实。商品型 pin 的 `链接` 必须来自 `Products 商品` 表 `分享链接`。
- **content-asset-pool**：当 Pinterest pin 来自跨平台素材发布池时，本 skill 只消费已经确认顺序、授权和发布副本的素材任务；发布成功后把 `发布 URL` 回写给素材池对应发布任务。
- **social-publisher**：当用户要“自动发布 / 到点发布 / 发布任务对账”时，优先让 `social-publisher` 读取 `社媒发布队列` 并调用本 skill。Pinterest pin 就是这张表 `平台 = Pinterest` 的行，发布成功或失败后一次回写本行即可。
- **assets-library**：本 skill 只读 `Assets 素材池` 表的「Pinterest 候选」视图，不改。素材未入库或未授权时，提示用户先回 assets-library。
- **orders-customers**：UGC 类素材的「公开授权」由 orders-customers 走客户沟通完成；本 skill 只消费已授权的结果。
- **image-synth**：模式 B 候选池空时反向触发 image-synth 模式 B；目标平台 Pinterest 1000x1500；image-synth 出图 + QA + 入库后回到本 skill 继续。

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：
- pin 文案输出（title / description / altText）为**英文**（Pinterest 是海外平台）。
- `社媒发布队列` 表字段标签中英混用（schema 文件里给规范）。
- 服务器工具请求字段按 `references/publishing-flow.md` 的 JSON contract。
