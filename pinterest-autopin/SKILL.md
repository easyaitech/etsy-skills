---
name: pinterest-autopin
description: Pinterest 发布**适配器**：把电商商品 + 素材变体 + 品牌底座组装成 Pinterest pin，并通过 yanggedianzhang 服务器控制面 + 浏览器插件执行。Hermes 只负责判断、生成文案、调服务器工具接口、把队列行标记成自动发布，不持 Chrome profile、不跑 Playwright、不持队列、不自己跑巡检定时器（自动发布的巡检/锁/重试循环归 ECS dispatch，T5；Hermes 只负责组 pin、手动发某条、以及把行标成 `自动发布=true` 交给 dispatch）。四种触发：(1) "接 Pinterest / 配置 pin 流水线"——接通服务器工具 + 浏览器插件 + 店铺总 Base 内 `社媒发布队列` 表；(2) "给 SKU 出 pin / 写 pin 文案 / 排一条 pin"——读 BRAND + `Products 商品` 表 + `Asset Variants 派生素材` 表（Pinterest 2:3 变体，缺则反向请求 assets-library 模式 E 派生），组一条 `社媒发布队列`（平台=Pinterest）记录，平台专属字段走 `PinterestExt` typed schema；(3) "发 pin / 测试 pin / publish"——创建 test job，用户目视确认后 confirm-publish 转 final，回写状态；(4) "开启自动发布 / 自动发这几条 / 到点自动发"——把已审核的行标成 `自动发布=true` + `状态=已批准` + `计划发布时间`，交给已在生产运行的 ECS dispatch 无人值守发布（dispatch 直发、无逐条人工确认闸）；(5) "发成功没 / 这条发了吗 / 为什么没发 / 队列什么情况"——**只读店铺总 Base `社媒发布队列` 行**（`状态` / `自动发布` / `计划发布时间` / `发布 URL` / `事件日志`）判读状态，**绝不用 Mac mini cron 或本地定时器推断**（自动发布跑在 Hermes 看不到的 ECS dispatch）。每次只处理一条。
layer: application
depends-on: [shop-foundation, listing-catalog, assets-library]
---

# Pinterest AutoPin

这个 skill 把电商店铺的「商品 + 素材 + 品牌」组装成 Pinterest pin。发布动作不再由 Hermes 本机的 Playwright / Chrome profile 完成，而是分三层：

1. **Hermes**：读商品、素材、品牌规则，生成 title / description / alt text，调用服务器工具接口。
2. **yanggedianzhang 服务器**：校验租户、保存 Pinterest job 状态、加锁、发放素材下载地址、记录 test / final 结果。
3. **现有浏览器插件**：在租户自己的 Chrome 登录态里打开 Pinterest、填表、上传服务器给的素材，并把结果回传服务器。

它可以被用户直接触发，也可以作为 `social-publisher` 的 Pinterest adapter 被调用。跨平台 `社媒发布队列` 的 source of truth 仍在 `publish-composer` / `social-publisher`；本 skill 只负责 `平台 = Pinterest` 行的语义准备、服务器 job 创建和结果回写。

**两种发布路径（Hermes 都能走，机器不同）**：
- **手动发某条（模式 C）**：Hermes 亲自调 `POST /api/tools/pinterest/jobs` 建 test job → 用户目视确认 → `confirm-publish` 转 final。逐条人工把关，适合首发 / 拿不准的内容。
- **无人值守自动发布（模式 D）**：Hermes **不亲自调发布端点**，只把已审核的行标成 `自动发布=true` + `状态=已批准` + `计划发布时间`，交给**已在 yanggedianzhang 生产常驻运行的 ECS dispatch**（约每分钟扫一轮）自动建 publish job、浏览器插件真发、结果回写。**dispatch 到点直发、没有逐条人工确认闸**——所以只在内容确定无误后才标 `自动发布=true`（详见模式 D 的红线）。Hermes 依然不跑定时器、不持队列，只负责「把料放上传送带」。

支持的队列模型：
- **单图 pin**：当前服务器工具接口的推荐路径。
- **多图轮播 pin**：队列表可以表达 2-5 张图，但只有当服务器工具和浏览器插件明确支持多素材 job 时才能进入 final；否则只建草稿，不声称已经自动发布。

**`社媒发布队列` 表核心模型**：一条 Base 记录 = 一个 Pinterest Pin。发布成功后这一行只回写一个 `发布 URL`。

**架构边界**：Hermes 不直接读浏览器登录态，不直接点击 Pinterest，不保存 cookie / token / 密码，不把本地绝对图片路径传给浏览器。素材必须先变成服务器能授权下载的 asset，插件再从服务器拉取 Blob/File 上传。

**对外的实操接口**：
- 飞书 Base：用 `lark-base` 操作店铺总 Base 内的 `社媒发布队列` 表，并反查 `Products 商品` / `Asset Variants 派生素材` 表；架构见 `../shared/store-base-architecture.md`。
- 工作区根目录的 BRAND.md / SHOP.md / BRAND_MARKETING.md / MARKETING_PLATFORM.md（用 `shop-foundation` 维护）。
- 服务器工具：`POST /api/tools/pinterest/jobs` 创建 test job；`POST /api/tools/pinterest/jobs/confirm-publish` 在 test 通过且用户确认后转 final。详见 `references/publishing-flow.md`。
- 浏览器执行器：沿用现有 Etsy DM 浏览器插件，插件版本必须带 `pinterest` capability。安装 / 升级提示由服务器返回，Hermes 只把 `userMessage` 原样转述给用户。
- **图片裁切 / 清理不在本 skill**：Pinterest 2:3 规格变体 + AI metadata 清理由 `assets-library` 模式 E 派生（D-A8），本 skill 只引用 `Asset Variants 派生素材` 的变体文件链接；变体仍需进服务器 asset 流程才能给插件下载。

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)，工具架构见 [`shared/tools-architecture.md`](../shared/tools-architecture.md)（已是 tier 2 范式：服务器控制面 + 浏览器插件，Hermes 不持 Chrome / token / 队列，已符合约束）。

---

## 前置就绪检查（Mode B / C / D 入口守卫）

用户触发 Mode B、Mode C 或 Mode D 时，在执行任何业务逻辑之前，**静默**按编号顺序逐项检查。任何一项失败即停止后续检查，按失败话术回复，并提议进入 Mode A 或让服务器返回安装 / 升级提示。Mode D（开启自动发布）额外依赖 ECS dispatch 已开启 + 队列表含 dispatch 必需列，见模式 D 的「前提」清单。

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
| `Asset Variants 派生素材` 表（assets-library）| Pinterest 规格发布副本（2:3 已清理变体） | pin 图只引用变体文件链接；**缺变体 → 反向请求 assets-library 模式 E 派生**（裁切 + 清理），本 skill 不自己裁切清理。客户 UGC 没拿到授权的**绝不发** |
| `社媒发布队列` 表（owner=publish-composer）| 草稿 / 待审 / 已批准 / 发布中 / 已发 / 失败状态 + pin URL（状态机见 base-schema 表 2）| 模式 B 组 `平台=Pinterest` 行（与 composer 同表，平台专属走 `PinterestExt`）；模式 C 创建服务器 job 并回写结果。**自动发布的巡检/锁/重试归 ECS dispatch（T5），本 skill 不持队列** |

如 BRAND.md / SHOP.md 缺失，组 pin 前主动提示用户先用 shop-foundation 建立。

---

## 五种执行模式

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
3. 用 `lark-base` 查 `Asset Variants 派生素材` 表，取该 SKU `目标平台 ⊇ Pinterest` 的 2:3 已清理变体：
   - 指定变体：逐条校验在 Base、源 canonical `公开授权 = 已授权`。
   - **缺 Pinterest 规格变体 → 反向请求 `assets-library` 模式 E** 派生（2:3 裁切 + AI metadata 清理），拿回变体文件链接。**本 skill 不自己裁切/清理图片**（D-A8：派生归 assets-library）。
   - 连 canonical 成品都没有：给用户三选一：① 回 assets-library promote；② 反向触发 image-synth 生成 Pinterest 素材；③ 跳过本次 pin。
4. 读 BRAND.md + SHOP.md + BRAND_MARKETING.md + MARKETING_PLATFORM.md，按 `references/pin-composition.md` 输出草稿（平台专属字段走 `PinterestExt`）：
   - 通用列：title（description）、link、关联变体 + 素材顺序
   - `平台扩展 (typed)` = `PinterestExt{ board_id, alt_text, dominant_color? }`，过 validator，不塞自由 JSON
5. **整篇展示**给用户，等用户确认或调整。
6. 用户确认后，按 `references/pin-queue-base-schema.md` § 录入约定，用 `lark-base` 在 `社媒发布队列` 表写一行（状态 = `草稿`，组好后进 `待审`），`关联素材` 指向变体（非 canonical 原图）。不要把本地绝对路径当发布输入；图片由服务器 asset 流程提供下载。

> **一次只组一条 pin**——不批量。批量需求让用户重复触发，或交给 `loop` skill 编排（不在本 skill 范围）。

### 模式 C：发布（取草稿 → 服务器 job → 浏览器插件执行 → 回写状态）

**进入条件**：
- 用户要发 pin / 测试某条 pin / publish
- **前置就绪检查全部通过**；未通过则停下引导，不继续

**执行步骤**：
1. 用 `lark-base` 从 `社媒发布队列` 表取目标行（用户指定 ID，或筛 `状态 = 草稿 / 待审 / 已批准` 让用户挑一条）。
2. 校验 `标题`、`描述`、`链接`、`Board (Pinterest)`、`Alt Text (EN)`、授权和 AI 清理记录。素材必须已经能由服务器提供给插件下载；否则停在草稿，提示先补服务器 asset 流程。
3. 按 `references/publishing-flow.md` § 创建 test job 调用服务器：
   - `POST /api/tools/pinterest/jobs`
   - body 至少包含 `tenantId`、`title`、`description`、`altText`、`link`、`board`
4. 处理服务器响应：
   - `201`：把 `jobId` 写入 `ECS job ID`，状态改为 `发布中`（test 阶段），备注 `待测试确认`（不要写 `测试中` 这种枚举外的值）。
   - `409 BROWSER_TOOL_INSTALL_REQUIRED`：把 `userMessage` 转述给用户，状态保持草稿。
   - `426 BROWSER_TOOL_UPGRADE_REQUIRED`：把 `userMessage` 转述给用户，状态保持草稿。
   - 其他错误：按错误类型写入 `失败原因` 或保持草稿待修。
5. 浏览器插件领取 test job 后会打开 Pinterest 并填表；当前版本的安全边界是 **test 不点发布**。让用户在 Pinterest 页面目视确认图片、board、title、description、alt text、link。
6. 用户确认 test 成功并明确说"发吧 / publish / final"后，调用：
   - `POST /api/tools/pinterest/jobs/confirm-publish`
7. 插件领取 publish job 后执行 final。若当前插件版本仍需要人工点击 Pinterest 页面或人工回报，按插件 UI 指引执行；不要在 Hermes 里假装已经无人值守发布。
8. 服务器收到 final 结果后，Hermes 用结果回写 `社媒发布队列`：
   - 成功：`状态 = 已发`、`发布 URL = resultUrl`、`发布时间 = 现在`、清空 `失败原因分类` / `失败原因`。
   - 失败：`状态 = 失败`、`失败原因分类 = {会话过期/插件未装/限速/DOM漂移/平台拒绝/网络/其他}`、`失败原因 = 原文`、`发布尝试次数 += 1`、`最后尝试时间 = 现在`。

> **不替用户跳过 test 阶段**——首次发某 board / 首次用某素材尺寸时，test 阶段的目视检查能拦下裁切错位、文案截断、board 选错等问题。用户明确说"已经测过了，直接 final"才能跳。

### 模式 D：开启自动发布（把行交给 ECS dispatch 无人值守发）

**进入条件**：
- 用户说"开启自动发布 / 自动发这几条 / 到点自动发 / 排好了就自动发布"
- **前置就绪检查全部通过**；未通过则停下引导，不继续
- 目标行已是 `平台 = Pinterest` 且**内容已审核**（`标题` / `链接` / `Board (Pinterest)` / `Alt Text (EN)` 齐全、`关联素材` 已授权且能被服务器解析为真实图 file token）

**这条路和模式 C 的根本区别**：模式 C 是 Hermes 亲自调服务器发布端点、逐条人工确认；模式 D 是 Hermes **只改 Base 字段**，把行标成 dispatch 的合格候选，**之后不再经手**——ECS dispatch（yanggedianzhang 生产已常驻运行，约每分钟一轮）会自动建 publish job、浏览器插件真发、结果回写。**dispatch 到点直发、不停在任何人工确认闸**（当前部署无逐条目视确认）。所以标记 = 授权无人值守发到真 Pinterest，务必内容确定无误才标。

**执行步骤**：
1. 用 `lark-base` 取目标行，按模式 C §0 校验清单确认内容与素材授权齐全。**内容没审核完不要标自动发布**——dispatch 不会替你把关。
2. **整篇展示**给用户「即将标记为自动发布的行 + 计划发布时间」，明确告诉用户"标记后约 1 分钟内会自动发到真实 Pinterest，中途不再问你"，等用户确认。
3. 用户确认后，用 `lark-base` 把这一行改成 dispatch 的合格候选（三个字段，diff 预览 → 落盘）：
   - `自动发布` = **勾选（true，复选框字段）**
   - `状态` = `已批准`（dispatch 的入口状态；`草稿 / 待审` 不会被自动发）
   - `计划发布时间` = **留空 = 尽快发**（下一轮 tick 就发）；要排期就填未来时间（飞书**日期时间**字段最稳，或文本用带时区的 ISO 如 `2026-07-08T21:30:00+08:00`）。**不要填 dispatch 解析不了的自然语言**（如"下周一"）——解析失败它会记事件日志跳过、不发。
   - 其余（`外部队列 ID` / `执行锁` / `发布尝试次数` 等执行列）**留空不填**，dispatch 自己写。
4. 落盘后告诉用户：已排入自动发布，dispatch 会在到点后自动发；进度看该行 `状态`（已批准→发布中→已发）和 `事件日志` 列。**Hermes 到此为止，不再轮询、不再确认**。
5. 若用户想撤回：在 dispatch 领取前（`状态` 仍是 `已批准` 且 `执行锁` 为空）把 `自动发布` 取消勾选或 `状态` 改回 `待审` 即可；已进 `发布中`（`执行锁` 非空）说明 dispatch 正在处理，让位不抢。

**模式 D 的前提（缺一不发，要如实告诉用户）**：
- **ECS dispatch 已由运维开启**（服务端配了 `PUBLISH_DISPATCH_POLL_MS`）。yanggedianzhang 生产当前**已开启**；若换部署没开，标了也不会自动发，得让运维开。
- **浏览器插件在线**：插件带 `pinterest` capability、租户 Chrome 开着且已登录 Pinterest。dispatch 只建 job，真正点发布的是插件——插件离线则 job 排着发不出，最终按租约判死。
- **该租户 `社媒发布队列` 表含 dispatch 要求的全部执行列**（尤其 `外部队列 ID` / `执行锁` / `下次重试时间` / `事件日志` / `失败原因分类`，逐字对齐）。缺列 dispatch 会 fail-closed 跳过**整个租户**且不报错到对话——见 `references/publishing-flow.md` § 自动发布路径的建表校验。

> **一次只标一条**——和模式 B/C 一致，不批量勾选。批量让用户重复触发。

### 模式 E：状态查询与排障（"发成功没 / 为什么没发"）

**进入条件**：
- 用户问自动发布/某条 pin 的状态："发成功没 / 这条发了吗 / 最近发得怎么样 / 队列什么情况 / 为什么没发 / 到点了怎么还没发"

**三条铁律（回答前先内化，违反即会误导用户）**：
1. **自动发布状态的唯一真相源 = 店铺总 Base `社媒发布队列` 表的行本身**（`状态` / `自动发布` / `计划发布时间` / `发布 URL` / `事件日志` / `失败原因分类` / `失败原因`）。dispatch 的每一次动作（建 job / 发布中 / 成功 / 失败 / 跳过 / 租约回收）都写在该行 `事件日志` 列——**要判断发没发、为什么，只读这里**。
2. **绝不用 Mac mini 上的 cron / launchd job / Hermes 本地定时器来推断自动发布是否成功。** 无人值守自动发布跑在 **ECS dispatch**（yanggedianzhang 生产常驻），Hermes / Mac mini **看不到**它的运行状态。Mac mini 上那些旧的发布 cron 在切换到 ECS 时**已被有意暂停**，与自动发布是否工作**完全无关**——看到它们 `paused` 不代表发布停了，**别拿它当证据、别据此说"某天被暂停了 / 在等恢复"**。
3. **拿不准就读 Base，不编因果。** 没有 Base 证据支持的结论一律不说。计划发布时间在未来 = 还没到点，"没发"是正常的，不是故障。

**执行步骤**：
1. 用 `lark-base` 读 `社媒发布队列` 表 `平台 = Pinterest` 的行，按下表逐状态判读后回答：

   | 行状态 + 字段 | 含义 | 怎么跟用户说 |
   |---|---|---|
   | `待发` / `已批准` + `自动发布=true` | 已在自动发布通道排队等到点（`待发` 是 dispatch 合法入口状态，等价 `已批准`） | 看 `计划发布时间`：**在未来 = 还没到点，没发是正常的**；已过去仍没发 → 走下方核查 |
   | `草稿` / `待审` / `待发` + `自动发布=false` | **没进**自动发布通道，dispatch 不会碰它 | 要自动发得先走模式 D 标 `自动发布=true` |
   | `发布中` + `执行锁` 非空 | dispatch 已建 job、浏览器插件正在发 | 稍等，进度看该行 `状态` / `事件日志` |
   | `已发` + `发布 URL` | 发成功 | 给出 `发布 URL` |
   | `失败` | 发布失败 | 读 `失败原因分类` / `失败原因` / `事件日志` 告知真因；dispatch 默认**不自动重排失败行**，要补发得人工改回 `待发` |

2. 用户报"到点了还没发"时，按此顺序核查（全部有 Base / 服务器凭据可查，**不猜**）：
   - a. 行是不是 `自动发布=true` 且 `状态 ∈ {待发, 已批准}`？否 → 没进通道（模式 D 没标或被撤回）。
   - b. `计划发布时间` 是不是已过去？未来 = 没到点。若填了自然语言（"下周一"）→ dispatch 解析不了，会在 `事件日志` 记「计划发布时间无法解析」并跳过——提示用户改成带时区的 ISO 或飞书日期时间字段。
   - c. `事件日志` 有没有 dispatch 的失败 / 跳过记录（缺字段 fail-closed、素材未解析、插件租约超时、发布后未确认 Pin URL）？照它说，这些多是**浏览器插件侧**问题（插件离线 / 会话过期 / DOM 漂移），不是调度停了。
   - d. 以上都正常但仍不发 → 可能是 ECS dispatch 未开启或插件离线，这**归运维 / 管理员在服务器侧排查**（Hermes 看不到 ECS）。如实说"需要管理员确认服务器侧 dispatch 与插件状态"，**不要自己下"被暂停"的结论**。

3. **不要基于"以为发布停了"去改排期。** 发现过期未发的行，先按第 2 步用 Base 证据确认原因；确需补发就**问用户**要不要把行改回近几天（走模式 D），而不是默默把 pin 往后顺延（那只会把本该补发的越推越远）。

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
- **不在本 skill / Hermes 跑自动发布 cron / 定时器**：自动发布的巡检 / backlog 恢复 / 重试 / 单写者锁归 ECS 常驻 dispatch（T5，需运维显式开启 `PUBLISH_DISPATCH_POLL_MS`；yanggedianzhang 生产已开启）。Hermes 在自动发布里的**唯一职责是模式 D 的标记**（把行标成 `自动发布=true`+`已批准`+`计划发布时间`），标完就交出去——绝不在 Hermes 侧模拟巡检、重试、锁或轮询发布结果。本 skill 是 Pinterest **adapter**：组 pin（模式 B）、手动发某条（模式 C）、开启自动发布（模式 D），不持队列、不跑定时器。
- **标自动发布前内容必须审核完**：模式 D 的 `自动发布=true` 是"授权无人值守发到真 Pinterest"，dispatch 到点直发、无逐条确认闸。字段不全 / 素材未授权 / 文案没定稿的行**绝不标自动发布**。
- **Pinterest 库存提醒必须分库存独立触发**：品牌/内容型 pin 库存、商品/礼物型 pin 库存是两个不同库存。
- **多图轮播不拆成多个单图 pin 发**：服务器 / 插件未支持多素材 final 时只能停在草稿或人工发布，不得拆分冒充轮播。
- **不用 Mac mini cron / Hermes 本地定时器推断自动发布状态**：无人值守自动发布跑在 ECS dispatch，Hermes / Mac mini 看不到它；旧 Mac mini 发布 cron 已在切 ECS 时**有意暂停**，与发布是否工作无关。回答"发成功没 / 为什么没发"只能读 `社媒发布队列` 行 + `事件日志`（模式 E）；无 Base 证据不下因果结论（尤其不说"某天被暂停了 / 在等恢复"）、不据此改排期。

---

## 与其他 skill 的协作 / 回流

- **shop-foundation**：组 pin 时用户纠正文案，先判断是 BRAND.md 的语调补充，还是 Pinterest 渠道特有手感；渠道特有内容暂记到 `references/pin-composition.md`。
- **listing-catalog**：本 skill 只读 `Products 商品` 表，不改商品事实。商品型 pin 的 `链接` 必须来自 `Products 商品` 表 `分享链接`。
- **publish-composer**（发布队列 owner）：跨平台 `社媒发布队列` 的 source of truth 在 composer。本 skill 作为 Pinterest adapter，组 / 消费 `平台 = Pinterest` 行；composition 与 composer 同一张表、平台专属字段走 `PinterestExt`。
- **social-publisher / ECS dispatch**：自动发布的循环（到点 / 巡检 / 重试 / 锁）归 ECS dispatch（T5，需运维开 `PUBLISH_DISPATCH_POLL_MS`；yanggedianzhang 生产已开），social-publisher 是薄触发。本 skill 不被 cron 唤醒；手动发某条走模式 C，开启无人值守自动发布走模式 D（只标行、不经手发布）。Pinterest pin 即 `平台 = Pinterest` 行，成功/失败由 dispatch / adapter 一次回写本行。
- **assets-library**：本 skill 只引用 `Asset Variants 派生素材` 的 Pinterest 规格变体；缺变体反向请求模式 E 派生（裁切+清理）。**本 skill 不裁切/不清理图片**。未授权 UGC 提示先回 assets-library / orders-customers 拿授权。
- **orders-customers**：UGC 类素材的「公开授权」由 orders-customers 走客户沟通完成；本 skill 只消费已授权的结果。
- **image-synth**：模式 B 候选池空时反向触发 image-synth 模式 B；目标平台 Pinterest 1000x1500；image-synth 出图 + QA + 入库后回到本 skill 继续。

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：
- pin 文案输出（title / description / altText）为**英文**（Pinterest 是海外平台）。
- `社媒发布队列` 表字段标签中英混用（schema 文件里给规范）。
- 服务器工具请求字段按 `references/publishing-flow.md` 的 JSON contract。
