# Changelog

本项目使用 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增
- **「给特定订单的买家发 Etsy 站内信」工具接入 `orders-customers`（补上服务端 v0.6.10.22 上线时欠的 bot 侧一半）**：新增 [`orders-customers/references/etsy-order-message-tool.md`](orders-customers/references/etsy-order-message-tool.md)——店主在飞书里给出订单号 + 逐字定稿消息文本后，Hermes 调 `POST /api/hermes/etsy-dm/order-message`（per-tenant 派生令牌），店主机器上的浏览器插件（≥0.5.52）在 Etsy 订单页 New / Completed 两个页签按订单号定位订单卡、点行内聊天 icon、填入并**代为发送**，结果经飞书回执。**修的问题**：服务端与插件早已上线，但网关技能从没注册这个工具，bot 手里只有按会话发的 `etsy-reply-draft-tool`，于是店主给了订单号还被反问「缺这个订单对应的买家会话信息」。现在 SKILL.md 索引表 / 模式 C 第 5 步 / §写入前的硬性约束、`platforms/etsy.md` §自动化边界、skill `description` 触发词都按「有会话→填回复框、只有订单号→按订单号代发」明确二选一，并写死**不得向店主索要买家会话信息**。红线：只有店主逐字确认过的文本才调、一次定稿只调一次、暂存超时或报错**绝不盲目重投**（宁可漏发也不双发）、`409 ORDER_MESSAGE_ALREADY_DISPATCHED` 一律等飞书回执不重投；错误码（订单号格式 400 / 超长 400 / 在途 409 / 满员 409 / 插件未装 409 / 版本 <0.5.52 426 / 停服 403）逐条给了处置。`buyerName` 标为「能给就给」——它是插件侧防发错人的收件人校验闸。
- **Etsy 站内信「飞书定稿 → 插件填入回复框」工具接入 `orders-customers`**：新增 [`orders-customers/references/etsy-reply-draft-tool.md`](orders-customers/references/etsy-reply-draft-tool.md)——店主在飞书里跟店长讨论定稿站内信回复后，Hermes 调服务器工具（`POST /api/hermes/etsy-dm/conversations` 读会话上下文 + `POST /api/hermes/etsy-dm/reply-draft` 暂存草稿，per-tenant 派生令牌），店主机器上的浏览器插件（≥0.5.45）自动打开对应会话把草稿填进回复框，**发送仍由店主手动点击**。SKILL.md 模式 C 第 5 步与 `platforms/etsy.md` §自动化边界同步放宽为「可填入、不发送」（服务端 yanggedianzhang v0.6.10.8）。定稿才暂存、同会话重投即修订、错误码（多命中 409 / 未同步 404 / 插件版本 426）逐条给了处置。
- **上游 Mac mini 本地热修：发货后必须回填平台后台，否则这单不算完（orders-customers 履约约束）**：fublessings 部署机的共享 clone 上曾就地（未提交）给 `order-fulfillment-sop.md` 阶段 5 加过两条——拿到快递单号后要提醒用户把单号回填到 Etsy 后台对应订单、核对承运信息 / 发货确认是否已提交，未填完前这单仍算有一个未完成待办。**修的问题**：Base 里 `状态 = 已发货` 不等于 Etsy 后台已发货，本 skill 又明确不替用户在后台标记发货（契约 #11），中间这段真空此前没人跟，订单会在「我们这边完事了」的假象里收尾。该热修本地未进 git、下次 `ecommerce-stack update` 会被覆盖丢失，现固化进 canonical 仓库，并**按多平台架构下沉**：热修原文写的是「如果目标平台是 Etsy…」这种条件句，而 `platforms/platform-presets.md` 把 `order-fulfillment-sop.md` 列为不得写平台差异的流程逻辑文件。故拆成两层——core SOP 阶段 5 的检查项 / 完成条件只留**平台中性**的「回填到平台后台 + 提交平台发货确认，入口与核对项见平台 preset §自动化边界」（回填后台这件事对小红书等平台同样成立，其 preset #11 亦已写明不替用户发货 / 改快递单号，故中性化后覆盖面严格大于原热修）；Etsy 专属细节（回填到 Etsy 后台对应订单、核对承运信息 / 发货确认、未提交则继续作为最后一个待办）落进 `platforms/etsy.md` 新增 §发货回填，契约 #11 补指针。
- **上游 Mac mini 本地热修：过期未发 pin 不许自己顺延（pinterest-autopin 硬约束）**：fublessings 部署机上曾就地（未提交）加过一条红线——过期未发的 pin（`自动发布=true`+`状态∈{待发,已批准}`+计划时间<now）**先问用户要不要改回近几天补发，不主动往后推一两周**，并记了用户偏好「积压过期 pin 应尽快补发」。该热修本地未进 git、下次 `ecommerce-stack update` 会被覆盖丢失，现固化进 canonical SKILL.md 硬约束（含"读 `事件日志` 排除租约超时/失败重复行"），与模式 E 第 3 步互为强调。

### 重构
- **CLI 脚本去重：抽出 `scripts/lib/env.sh` + `scripts/lib/stack_common.py`**（架构评审候选 C4）。旧 `etsy-* → ecommerce-*` 环境变量兼容映射此前逐字复制在 `install.sh` / `scripts/etsy-stack` / `scripts/check-update.sh` 三处；现由 `scripts/lib/env.sh` 作单一事实源，`etsy-stack` 与 `check-update.sh` 顺软链定位真实脚本目录后 source 之（`install.sh` 是 `curl|bash` 引导、clone 前运行无法 source，保留同款副本 + 同步提示注释）。`list` 与 `doctor` 子命令此前各自内联「加载 manifest + `managed = skills ∪ {shared}` + 枚举非托管条目」的 Python，现统一 import `scripts/lib/stack_common.py`（经 `PYTHONPATH=$INSTALL_DIR/scripts/lib`），消除两者对「什么算托管」产生分歧的隐患。纯脚本重构，行为不变。
- **删除 `shared/ethos.md`，4 条经营原则内联进 `shared/preamble.md` §经营原则**（架构评审候选 C6）。ethos.md 仅 35 行、且 preamble 已有一行悬空指针；内联后经营原则随每个 skill 都读的 bootstrap 到达，少一次运行时跳转。`shared/tools-architecture.md` 两处引用改指 `preamble.md §经营原则`，README 文件树同步删行（CHANGELOG 历史条目保留不改）。

### 变更
- **清理废弃的本地 Playwright 路径遗留**：(1) 删除 `spikes/etsy-dm/`（Etsy 私信命脉 spike，验 CDP 接管 + 邮件通知，已随插件路径上线 PR#72/#74 完成使命，仓库零引用）；(2) 删除 `pinterest-autopin/references/patches/pinterest-video-pin-support-a5ccaec.patch`（打给早已移除的本地 `publish_playwright.js` 发布工具的补丁；模式 C/D 全走 ECS dispatch + 浏览器插件，该本地 Playwright 路线整体废弃）；(3) 移除 `install.sh` 里给 `trend-radar` 装 `playwright chromium` 的残留行（trend-radar 已改 ECS 只读拉取，`scripts` 无 Playwright 依赖）。本机 `~/Library/Caches/ms-playwright` 缓存可随之清理。
- **`trend-radar` 采集上收到管理员浏览器插件，skill 不再本机 Chrome 抓取**：热词采集统一由「管理员趋势采集插件」（`admin-trend-extension`，装在运营方登录态浏览器）完成、回传 ECS 上的 trend-radar 服务；`trend-radar` skill 改为**只从服务读取**。彻底删除本机 Playwright 抓取（`scripts/sources/` 全部数据源、`sources` DataSource 合约、`SERPAPI_KEY` / `*_PROFILE` / `*_CDP_PORT` 登录态依赖、截图/HTML 快照证据、parser / url-builder 单测与 fixtures），移除 `playwright` 依赖。新命令：`trend-fetch pull [--geo]` 从服务 `/latest` 拉回各平台已采热词、落成同结构 per-source JSON（`fit-report` 完全不变，继续读当天目录的 per-source JSON）；旧的 `trend-fetch <source>`（`google-trends` / `pinterest-trends` / `erank-trend-buzz` …）已移除。新增环境变量 `TREND_RADAR_TOKEN`（必需）/ `TREND_RADAR_BASE_URL`（默认公网代理 `https://yanggedianzhang.com/trend-radar`）。`latest.json` 语义从「最后一个 source 的副本」变为「服务端合并总览（revision / runs / 跨平台合并 items）」；同步更新 `business-knowledge/references/trend-radar-intake.md` 对 latest.json 的描述（消费逻辑不变：仍只用 `generated_at` 做新鲜度闸、建卡走 fit-report）。SKILL.md / output-schema.md 同步重写，删除 `source-guide.md`。

### 修复
- **Pinterest Mode B 边界与真实 dispatch 能力对齐**：`pinterest-autopin` 明确模式 B 只是 Hermes 内容合同，后端只校验、传递和记录已确认的 `标题` / `描述` / `Alt Text (EN)` / `链接` / `Board (Pinterest)`，缺字段 fail-closed，不生成、不改写、不补全文案；同步修正自动发布前置检查必须包含 `描述`，并把 `ECS job ID` / `外部队列 ID`、`执行锁` / `执行锁 (lock_token)` 的字段别名和多素材 `assetFileTokens` / `altTexts` 能力写回 schema 与发布流文档，避免 Hermes 继续按旧单图/旧列名理解系统。
- **Hermes 飞书直聊 Base / 图片工具边界对齐**：`listing-catalog` 与 `assets-library` 明确在 Hermes 飞书直聊中优先走后端只读 `record-search` 查店铺总 Base，`attachments[].assetUrl` 可直接作为真实图片输入，不再要求用户重复上传；`tenantId` 由当前 profile / 后端工具注入，不向用户索要或自行编造。`image-synth` 增加运行时工具 gate：未接入 `terminal` / `execute_code` / 后端图片工具时硬停在 prompt/brief，不假装生图或把工具缺失包装成用户输入问题。
- **`listing-catalog` 字段名对齐为 `SEO 关键词`**：商品表 schema 与 listing 模板统一使用 `SEO 关键词`，小红书录入说明也改指向同名字段，避免同一列在不同文档里出现 `SEO / 搜索关键词` 和 `SEO 关键词` 两种写法。
- **清理退休 `video-assembly` 残留引用**：历史发布说明里与当前 stack 不再匹配的 `video-assembly` 计数和能力引用已移除，避免读者误以为该模块仍在当前 skill bundle 中。
- **统一 `Orders 订单` / `Customers 客户` 字段名（跨 orders-customers / logistics-tracking / 小红书 preset 对齐到 base-schema canonical）**：审计发现 `logistics-tracking` 回写订单表用的是自造的 `物流状态` / `物流签收日期`（还带「字段不存在就先建」），而 canonical schema 只有 `状态`（含 `已签收` 枚举值）+ `跟踪号` / `快递公司` / `发货日期`，且压根没有「实际签收日期」字段——SOP §5 算 `30天复购跟进日期 = 签收日 + 30天` 引用的「签收日」无处落库。修法：(1) `base-schema.md` 新增 canonical `签收日期`（实际 delivered 日，以 `track query` 签收事实回填、同步置 `状态=已签收`）；(2) `logistics-tracking/SKILL.md` 回写收口到 `状态`+`签收日期`，删自造字段名与「先建」；(3) `order-fulfillment-sop.md` §5「签收日」指向 `签收日期` 字段；(4) 小红书 preset `售后记录 JSON` → `小红书售后记录 JSON`（补前缀对齐 schema 定义）；(5) `30天复购跟进日期` 描述改为 `= 签收日期 + 30 天`。纯文档对齐，无运行时代码改动。
- **统一 `社媒发布队列` schema（跨 5 个 skill 对齐到 publish-composer 目标态）**：审计发现 Pinterest + social-publisher 落后于已部署的 ECS dispatch 实际契约（dispatch 真扫 `状态 = 已批准`），且 Pinterest 自身三处自相矛盾。统一全栈：(1) 状态枚举一律用 `草稿 / 待审 / 已批准 / 发布中 / 已发 / 失败 / 跳过 / 手动已发`，废弃旧 `待发 / 待复核 / 重试`（重试改为 `失败→发布中` 转移）；(2) `关联素材` 一律指向 `Asset Variants 派生素材` 变体（非 canonical 原图），修正 pin-queue-base-schema 与 pin-composition 旧指向；(3) `外部队列 ID` → `ECS job ID`（含 publish-composer/platform-publishing-model 遗漏处）；(4) 补结构化 `失败原因分类`；(5) 去掉 Pinterest 枚举外的 `测试中` 状态值，改 `发布中` + 备注 `待测试确认`；(6) social-publisher 状态机整段重写为 owner 同款 + 补人工「发这条」快路说明。改动文件：pinterest-autopin（SKILL + pin-composition + pin-queue-base-schema + publishing-flow）/ social-publisher（SKILL + adapter-registry + publishing-queue-contract）/ publish-composer（platform-publishing-model）。纯文档对齐，无运行时代码改动。

### 新增
- **Pinterest 状态查询与排障（pinterest-autopin 模式 E）——堵住 bot 拿 Mac mini cron 脑补发布状态的坑**：此前 skill 只有模式 A/B/C/D（接入 / 组 pin / 手动发 / 开自动发），**没有「用户问'发成功没 / 为什么没发'时怎么答」的路径**。实测事故：用户问 fublessings bot 自动 Pinterest 发布是否成功，bot 因无指令可循，抓了它唯一能看到的、**已在切 ECS 时被有意暂停**的 Mac mini 旧发布 cron（`d99651079542`），加用户一句旧吐槽，**编出「7/4 被你暂停了、一直没恢复」的假因果**——而真实的 ECS dispatch 一直在跑、pin 只是没到排期点。本次加**模式 E「状态查询与排障」**：三条铁律（① 自动发布状态唯一真相源 = 店铺总 Base `社媒发布队列` 行的 `状态`/`自动发布`/`计划发布时间`/`发布 URL`/`事件日志`；② 绝不用 Mac mini cron / Hermes 本地定时器推断发布状态，自动发布跑在 Hermes 看不到的 ECS dispatch，旧 cron 的 `paused` 与发布是否工作无关；③ 无 Base 证据不编因果）+ 逐状态判读表（`待发`/`已批准`+`自动发布=true`=排队等到点、未来时间=没发正常；`自动发布=false`=没进通道；`发布中`/`已发`/`失败` 各自判读）+ 「到点还没发」四步核查（是否进通道 → 时间是否到点 / 可解析 → `事件日志` 有无 dispatch 跳过·失败 → 都正常则归运维查 ECS/插件，不自下「被暂停」结论）+ 「不基于误判改排期」红线。SKILL 描述加第 (5) 种触发、`四种执行模式`→`五种`、硬约束加「不用 cron 推断发布状态」一条。纯文档，无运行时代码改动。
- **Pinterest 开启无人值守自动发布（pinterest-autopin 模式 D + social-publisher 对齐 dispatch 实际行为）**：此前 skill 只教 Hermes「手动发某条」（模式 C：亲自建 test job → 人工 confirm-publish），完全没有「把行交给 ECS dispatch 无人值守发」的工作流——用户让 Hermes「开启自动发布」时它无从下手。本次给 `pinterest-autopin` 加**模式 D「开启自动发布」**：Hermes 不亲自调发布端点，只用 `lark-base` 把已审核的行标成 dispatch 合格候选（`自动发布=true`（复选框）+ `状态=已批准` + `计划发布时间`（留空=尽快 / 填未来=排期）），交给**已在 yanggedianzhang 生产常驻运行的 ECS dispatch**（`PUBLISH_DISPATCH_POLL_MS` 已配，约 60s 一轮）自动建 publish job、浏览器插件真发、结果回写。SKILL 描述 / 入口守卫 / 硬约束 / 协作章节同步加模式 D；`publishing-flow.md` 新增「自动发布路径」章节（谁做什么图 + dispatch 合格条件表 + `计划发布时间` 格式坑 + 建表列校验）；`pin-queue-base-schema.md` 补 `自动发布` / `计划发布时间` 取值约定 + `Pinterest 自动发布` 视图。
- **修正 social-publisher / pinterest-autopin 落后于代码的「人工确认闸」声明**：文档多处写「v1 dispatch 不自动 confirm-publish、建 test job 停在人工目视确认闸」，但服务端 dispatch 实际是**直接建 `ready_for_publish` publish job、无逐条人工确认闸**（合格行到点即真发）。据用户明确决策（无人值守直发）把 `social-publisher`（SKILL 开篇工具架构段 + 模式 C + adapter-registry eval + publishing-queue-contract）统一改成：dispatch 直发、人工把关点前移到「标 `自动发布=true`」那一步；并把「dispatch 默认 dormant」补注「yanggedianzhang 生产已开启」，避免 Hermes 误以为自动发布不可用而拒绝。
- **标注 `外部队列 ID` vs `ECS job ID` 运行时命名漂移（阻塞新租户自动发布的坑）**：上一条 CHANGELOG「统一社媒发布队列 schema」把 job id 列文档名从 `外部队列 ID` 改成 `ECS job ID`，但 ECS dispatch 运行时（`PUBLISH_REQUIRED_FIELDS` schema 守卫）仍**逐字要求 `外部队列 ID`**，缺列即 fail-closed 跳过整个租户。已在 `pin-queue-base-schema.md` 与 `publishing-flow.md` 显著标注：建表 / 补列必须用 dispatch 运行时列名 `外部队列 ID`（已跑通 dispatch 的租户其表已对；新开通按文档名建表会踩坑）。根治（后端接受双名 or 文档全量回退）另行跟踪。
- **`orders-customers` 支持订单原币 + 核算币种 + 实际运费成本**：`Orders 订单` 辅助字段新增 `订单币种`、`核算币种`、`订单汇率`、`总金额(核算币种)`、`实际运费成本`，让 Etsy HKD / USD 收款与 CNY 采购、物流成本可以保留原始金额同时统一做利润和客户累计金额核算；履约 SOP 明确 `实际运费成本` 只按物流面单 / 打单系统 / 物流商账单证据填写，不能用买家支付运费或估算值代替。`Customers 客户.累计金额`、本月视图和 VIP 阈值比较同步改为优先使用同一核算币种口径。
- **image-brief 接入 BRAND_MARKETING + MARKETING_PLATFORM（视觉分层裁决阶梯 + §C 跨平台场景源）**：审查发现 `image-brief` 完全没引 `BRAND_MARKETING.md`、`MARKETING_PLATFORM.md` 只当兜底窄用。补全三处：(1) `image-brief` 依赖表加 `BRAND_MARKETING`（第 4 章视觉铁律 / 第 5 章红线喂 §B Mood、第 1/2/3 章人群·情感触点·场景喂 §C Lifestyle）+ 明确 `MARKETING_PLATFORM §1.2` 视觉规范喂 §A/§B；新增**四级视觉冲突裁决阶梯**（BRAND 视觉禁区 veto > BRAND_MARKETING 红线 / 铁律 > MARKETING_PLATFORM 平台执行 > 平台 preset，"宪法不变语言变"）；§C Lifestyle 场景源按平台分流（Etsy 礼物词库 ⊕ BRAND_MARKETING，非 Etsy 以 BRAND_MARKETING 人群×触点×场景为主，补上礼物词库 Etsy 专属导致的非-Etsy 平台 §C 缺口）。(2) `publish-composer`：品牌接地气文案主权归 adapter，composer 仅在目标平台无 live adapter（小红书 staged / IG / TikTok）时兜底写文案（读三份品牌文档，DEGRADE），`depends-on` 加 `shop-foundation`。(3) `dependency-protocol` 矩阵加 `image-brief` 列；修正 pinterest `BRAND_MARKETING` / `MARKETING_PLATFORM` `SKIP→BLOCK`（对齐其前置就绪检查实际 gate 行为）。纯文档对齐，无运行时代码改动。
- **Base 写穿不变量（single source of truth + 飞书链接回执）**：在 `shared/store-base-architecture.md` 新增「Base 写穿不变量」契约——任何对店铺总 Base 承载对象的新增/改/删，在真正写进 Base 前都算「未完成」；落库与用户确认同一 turn 收口，写完必须带一条可点击飞书 Base 链接的回执（拿不到深链退店铺总 Base 链接，彻底拿不到则如实标「已写入但暂无链接」+提示补 `docs/store-base.md`），写失败如实说、不许用「已写入」口吻收尾；附反模式清单 + 「对话 vs Base 分歧以 Base 为准」。`shared/preamble.md` §写入前的通用约束同步把约束从 workspace 文件扩展到 Base 记录并指向该契约。6 个直接写 Base 的 skill（listing-catalog / orders-customers / supplier-foundation / assets-library / business-knowledge / publish-composer）写入约束段 + 收口步骤行内加固，杜绝「对话里答应了改动、Base 没动」。
- **Base 写穿回执补全链接构造配方 + 覆盖收口到全部写 Base 的 skill**：`shared/store-base-architecture.md` §Base 写穿不变量的「写后回执」补一段**具体链接构造配方**（消除 agent 因不知怎么拼而跳过链接）——默认走零副作用的表/视图深链 `…/base/{base_token}?table={table_id}`（配了默认视图再拼 `&view=`），要精确定位到改动那一行时才升级到 `lark-cli base +record-share-link-create`（一次写操作、扩分享面，非每次都调），两者都拿不到退店铺总 Base 首页链接。审计发现 5 个直接写 `社媒发布队列` / 供应商表的 skill 缺回执链接指针（pinterest-autopin / xiaohongshu-autopost 连写穿不变量引用都没有），逐一补齐：`pinterest-autopin`（组 pin / 模式 C 回写 / 模式 D 标自动发布，模式 E 只读除外）、`xiaohongshu-autopost`、`publish-metrics`、`supplier-foundation` 各在「写入前的硬性约束」加写穿不变量引用 + 「回执必须含可点击飞书链接」；`assets-library` 原已覆盖。至此全部会写 Base 的 skill 一致带回执链接。纯文档对齐，无运行时代码改动。
- **T9 publish-metrics（发布结果回收闭环 / 反馈层）**：新建 `publish-metrics` skill + `社媒发布队列` metrics 列分组（⑥：曝光/点击/保存/互动/转化/指标采集时间/数据来源，见 publish-metrics/references/metrics-schema.md）。三模式：建指标列 / 回收录入 / 复盘 rollup（按变体·文案·SKU·平台聚合喂回 publish-composer）。只读发布结果 + 写 metrics 列，不碰内容/执行状态列、不重新发布；**拿不到指标留空标待补、绝不编数字，每条标数据来源**。补上工作流轴「发布后」缺口，让 composer 不再盲选素材文案。注册 manifest + README + dependency-protocol；TODOS 该项标完成。

### 重构
- **T7 pinterest-autopin 退纯 adapter（对齐目标态）**：老 skill 对齐到 xiaohongshu-autopost 同款 adapter 形态——平台专属字段走 `PinterestExt` typed schema（board_id/alt_text/dominant_color，对齐 pin-queue-base-schema 列）；发布图引用 `Asset Variants 派生素材`（2:3 变体）而非 raw `Assets 素材池`，**裁切/清理移交 assets-library 模式 E**（D-A8，去掉本 skill 的 image-processing 工具链）；删「自动发布 cron / backlog 恢复」（归 ECS dispatch T5）；description / 依赖表 / Mode B / 协作段 / 对外接口同步。
- **T8 路由 eval（adapter-registry）**：新增「路由决策树 + 10 条 eval 场景」（输入 intent → 期望路由/结果），覆盖 enabled/staged/planned 分流、自动 vs 手动、dispatch 避让/dormant、typed 校验、变体引用、插件未装降级。运行时实现+测试在 ECS dispatch（78+291 单测）；本节是可审计 spec 供 skill 侧对齐 + 后续真 eval。
- **T6 social-publisher 收成薄触发（对齐 T5 ECS dispatch 已落地）**：发布编排硬核（自动巡检 / 单写者锁 / 重试退避 / 死信 / 结果回写）已落到 ECS 常驻控制面（yanggedianzhang publish dispatch，dormant-by-default），`social-publisher` 不再在 Hermes 手搓巡检 / 锁 / 定时器。skill 退成薄触发四件事：配置 adapter registry / 人工按需发布（模式 B）/ confirm-publish 人工闸 / 对账（模式 D）。模式 C「自动发布巡检」改写为「自动发布 = ECS dispatch，本 skill 不再手搓」；人工发布占用规则加「与 dispatch 避让」（行已锁 / 发布中则让位）；Mode A 去掉「Hermes 侧建 cron」、改为「运维开 ECS dispatch」。同步更新 description / publishing-queue-contract.md（占用规则 + 自动筛选归 dispatch）/ shared/tools-architecture.md 落地现状表（+发布编排已上收 ECS 行）。

### 新增
- **小红书发布契约就绪（staged，未对外开放）**：后端三件就绪（服务器工具 `/api/tools/xiaohongshu/jobs` + `/confirm-publish`、插件 `xiaohongshu` capability、服务端热下发笔记 recipe），新增 [`xiaohongshu-autopost/references/publishing-flow.md`](xiaohongshu-autopost/references/publishing-flow.md)（镜像 pinterest 三层契约，换笔记字段 title/body/topics/coverCaption/noteType/images/link）。**但小红书自动发布尚未对外开放**：adapter 状态 = `staged`，**不 enabled、不对真实租户跑真发**，当前只组草稿 + 人工发布清单 + 人工回填对账；test → confirm-publish → final 真实路径契约就绪但"只读不跑"。对外放行（产品侧批准）后把 adapter-registry 小红书行改 `enabled` 一处开关即解锁。adapter-registry / social-publisher（模式 A/B 路由）/ README / dependency-protocol / platform-config / publish-composer 的小红书状态统一为 staged。

### 重构
- **社媒发布栈目标态架构落地（plan-eng-review + Codex 敲定，D-A1~D-A8）**：把素材+生产+发布整理成「基座（名词 owner）/ 工作流（动词）/ 平台（唯一变动面）」三轴，干净支持多平台。
  - **T1 AssetVariant**：`assets-library` 新增 `Asset Variants 派生素材` 表，canonical 成品与平台发布副本（裁切/封面/清理）分离；清理/派生单点在 assets-library，下游只引用。
  - **T2 PublishIntent 契约**：`社媒发布队列` 升级为完整契约——per-platform 语义、身份维度（平台/账号/品牌线/地区语言）、四组写者归属 + 状态机&转移权限&事件日志、平台专属走每平台 **typed extension**（弃 `平台字段 JSON` 自由块）、capability 细化、执行器（插件↔ECS）契约。
  - **T10 变体工厂**：`assets-library` 加模式 E「按平台规格派生变体」+ 明确「收集进池」为其唯一职责；解开旧「不替用户裁切」硬约束（开机械/模板化派生例外，新创意构图仍委托 image-synth）。
  - **T11 小红书 adapter**：新建 `xiaohongshu-autopost`（同 pinterest-autopin 三层范式，`XiaohongshuExt` typed schema，执行 gated：服务器工具+插件 capability+笔记 recipe 就绪前只出草稿+人工清单）；注册进 adapter-registry + manifest + README。
  - **T4 改名 `content-asset-pool` → `publish-composer`**：收窄为纯发布编排（组 PublishIntent + 拥有发布队列），把收集/清理/拥有素材池三职责移交 assets-library；移除 ingestion/清理类 reference（scan-and-dedupe / ai-sanitization-policy / state-model）；旧名在描述中保留作路由兼容，install.sh `retired` 加 `content-asset-pool` 清旧软链；全仓指针、`shared/store-base-architecture.md`/`preamble.md` 表所有权、README 同步更新。
  - **T3 新建 `image-brief`（图片方案设计 owner）**：把创意 brief 从 `assets-library` 模式 D 抽出来成独立 skill（D-A2 防 god-object）——平台感知 brief（§A 槽位/§B Mood/§C 镜头清单），分叉到人工拍摄 / image-synth / 已有素材。`shoot-brief-template.md` → `image-brief/references/brief-template.md`；assets-library 模式 D 删除（降为「→ 已移交 image-brief」重定向，frontmatter 五→四种触发），保留 `商品/{SKU}_shoot-brief.md` artifact 契约不变（绞杀者式迁移，image-synth 深层 §B/§C 引用不动）；image-synth depends-on + brief 源、listing-catalog step 10 反向触发、dependency-protocol 指针同步改到 image-brief；注册 manifest + README。
- `listing-catalog/references`：**Etsy preset 按平台分组 + 收敛为长期有效原则**。
  - **分组**：原 `references/` 平铺混了引擎层与平台层，且 Etsy 一个平台铺了 4 个互相循环引用的文件（`etsy-seo.md` / `gift-scenario.md` / `holiday-calendar.md` / `erank-research.md` 共 733 行）。现新增 `references/platforms/` 一层，把平台 preset 与引擎层（`base-schema.md` / `business-knowledge-lookup.md` / `input-checklist.md`）分离；4 个 Etsy 文件合并为单文件 `platforms/etsy.md`，`xiaohongshu-commerce.md` → `platforms/xiaohongshu.md`。**新平台扩展 = 往 `platforms/` 丢一个 `{平台}.md`**。
  - **精简**：`platforms/etsy.md` 进一步从合并后的 ~290 行收敛到 **~68 行的原则级文档**——只留「Etsy 是什么（搜索驱动的礼物市场等不变事实）+ 要填哪些参数 + 每个参数的总原则」。剔除所有随时间变化的内容（具体节日日期表、eRank 搜索量/竞争阈值与界面流程、当前热词）与固化套路（description 段 1-7 模板、客单价档分档表、13 tag 数字配额、礼物场景 5 问脚本 Q1-Q5、title 占位公式）。
  - **联动**：`SKILL.md` step 5/5.5/7/9/10 同步从「客单价档 / 5 问 / title 公式 / 段 3 双小段 / eRank 节点编号」降为原则级表述；全仓 ~13 处指针更新到新路径与新小节名（input-checklist / base-schema / business-knowledge-lookup / listing-template + `shared/platform-config.md` / `assets-library` / `image-synth` / `shop-foundation` 模板 / `business-knowledge/seeds`）。grep 验证无旧文件名 / 旧小节名残留死链。
  - **去固化（延伸）**：`assets/listing-template.md` 的描述段从固定「段 1-段 7 分别写什么」改为「不固定段序 + 要素清单」；跨 skill 的「4 类礼物词库 + description 段 3」交接措辞统一降为「礼物词库（受众/场景/节日/包装）+ description 礼物/使用语境」（动 `assets-library` SKILL.md / shoot-brief-template / etsy-listing-photo-slots、`image-synth` SKILL.md）。历史设计文档 `assets-library/PLAN-MODE.md` 按惯例保留原貌不改写。
- `orders-customers/references`：**平台 preset 按 `platforms/` 分组，对齐 `listing-catalog` 的跨 skill 约定**。三个 preset 文件迁入 `references/platforms/` 并去掉 `-orders` 后缀（命名对齐 `platforms/<平台>.md`）：`etsy-orders.md` → `platforms/etsy.md`、`xiaohongshu-orders.md` → `platforms/xiaohongshu.md`、契约文件 `platform-presets.md` → `platforms/platform-presets.md`。全仓指针更新到新路径（`orders-customers/SKILL.md`、`references/base-schema.md` / `order-handling.md` / `order-fulfillment-sop.md`、迁入文件内部的互引、`shared/platform-config.md`、`shop-foundation/assets/COMMERCE_PLATFORM_template.md`），并修掉 `platform-presets.md` 因下沉一层而失配的 `../../shared/` → `../../../shared/` 相对路径；grep 验证无旧文件名 / 旧路径残留死链。**纯路径约定对齐，不改语义内容**——多平台架构本身（同批 `### 新增` 的 `orders-customers` 重构，PR #49）不动。

### 新增
- `orders-customers`：**重构为「平台中性核心 + 每平台 preset」的多平台架构**——把原本隐性当默认平台的 Etsy 抽成对等 preset，核心流程（SKILL 模式 / `order-handling.md` 客服骨架 / `order-fulfillment-sop.md` 履约阶段 / `base-schema.md` 通用字段 / `customer-tags.md` 标签体系）全部平台中性，平台差异（买家语言、订单号 / 买家标识解析、承诺发货时间来源、消息 / 售后入口、媒体限制、专属字段、价值标签阈值、自动化边界）下沉到 `references/platforms/<platform>.md`。新增 [`platform-presets.md`](orders-customers/references/platforms/platform-presets.md)（11 项 preset 契约 + 解析顺序 + 「加亚马逊只新增一个 preset、不动核心」步骤）和 [`etsy.md`](orders-customers/references/platforms/etsy.md)（Etsy 从内联抽出）；`xiaohongshu.md` 补契约对照表；`base-schema.md`「小红书字段」升级为通用「平台专属字段组」范式。`COMMERCE_PLATFORM_template.md` / `shared/platform-config.md` 的 Etsy 段补订单 preset 指针。

### 修
- `orders-customers`：随多平台重构一起修掉 7 处问题——(1) **主动消息触达机制说清楚**：skill 请求触发、不驻留后台定时器，四类主动消息（下单确认 / 临期发货 / 签收评价 / 30 天复购）靠待办视图 + 运营每日看 / Hermes cron 扫视图触达，不再写"提醒已创建"这种 runtime 给不了的承诺；(2) **接通 `logistics-tracking`**：签收 / delivered 状态以 `track` 查询为准（不自己猜、不去承运商网页查），跟踪号录入后交其纳入跟踪，依赖表 + SOP 阶段 5/6 补引用；(3) `base-schema.md` 补通用 `收件地区` 字段（此前只有小红书有，Etsy 目的地无处可落）；(4) 去冗余：删 `评价跟进状态`（与 `签收评价消息状态` 重叠），厘清 `优惠券发送状态` 从属 `30天复购消息状态`，同步更新视图；(5) `打包视频状态` 枚举对齐（`未录制` → `不适用`）；(6) description 补模式 D（履约检查）触发词；(7) `customer-tags.md` 的 `VIP` 金额 / `品牌相符` 长评阈值去掉 USD / 英文写死，改引用平台 preset（Etsy USD 300 / 英文、小红书 ¥800 / 中文），渠道类从标签清单移到 `首次接触渠道` 字段。
- `logistics-tracking`：新增**薄物流跟踪 skill**——让 Hermes agent 知道有个 `track` 命令（接后端常驻的 17TRACK 跟踪服务）用于查/录跨境物流（用户问"这单到哪了"→ `track query`；发货 → `track add`），覆盖 4px/燕文/云途等专线到签收。**本 skill 只是调用指引**：跟踪的正确性（按 key 限速 + 429 退避、`/getquota` 配额护栏 + 单轮上限、register 幂等、状态→中性枚举映射、TTL、每日轮询、变更流）全在**独立部署的后端 `track-service`**（ECS 常驻、零依赖 `node:sqlite`、绑 tailnet、SQLite 存状态），**不在本 markdown、不碰飞书 Base、不往 `Orders` 加字段**。务必带承运商码避免 17track auto-detect 撞号（**4px=190094**；踩过同号撞成无关旧单的坑）。注册进 [`etsy-stack.json`](etsy-stack.json)。设计经 `/plan-eng-review`（架构从"重 skill + Base 结构"**转向**"后端服务 + 薄 skill + CLI"——因共享 17TRACK key 的限速/配额必须单进程中心化收口、且 mini 是脆的 headful 机不宜承载）+ 17TRACK v2.2 实测 spike + 真实 4px 订单端到端验证（agent 调 `track` → 正确返回已签收轨迹，比网页 auto-detect 还准）。后端服务源码独立维护（非本 bundle），运维单独部署 `track` CLI 到运行机 `~/.local/bin/track`。
- `shared/tools-architecture.md`：**工具架构硬约束**——全 stack 硬约束「Hermes 思考，ECS 做事和连接，插件只在『无 API 又必须用租户登录态』时伸手」。定义三角色（ECS 控制面 / Hermes 大脑 / 浏览器插件）、加新工具的三级选型优先级（官方 API → 租户浏览器插件 → 反检测专用机，控制面恒在 ECS）、控制面·执行面分离、安全红线（per-tenant token fail-closed、token≠tenantId、密钥不进 Hermes / skill 目录 / 工作区、改鉴权前跑 Codex 独立审），并记录**落地现状与迁移**（image-synth 中心后端、pinterest-autopin 服务器控制面 + 浏览器插件均已上收 ECS；trend-radar 抓取仍在 mini 属过渡）。已批准例外：**lark-cli 飞书访问留在 Hermes 的 Mac mini**（租户自有身份 + 数据底座，不外溢到任何外部平台）。接进 [`shared/preamble.md`](shared/preamble.md) §工具架构 / README 仓库布局 / `etsy-stack.json` `toolsArchitecture`；5 个 tool skill（content-asset-pool / social-publisher / trend-radar / pinterest-autopin / image-synth）各加工具架构指针。

## [1.0.1] - 2026-06-26

### 修
- `pinterest-autopin`：把 Skill 说明从旧本地 `Pinterest-autopin` / Playwright / 独立 Chrome profile 方案切换为推荐架构：Hermes 只生成与判断，调用 `yanggedianzhang` 服务器 Pinterest tool；服务器做 job 状态机、鉴权、素材下载地址和结果回写；现有浏览器插件作为租户登录态执行器。
- `social-publisher` / `content-asset-pool` / `README.md`：同步 Pinterest adapter 边界，明确新发布路径是服务器控制面 + 现有浏览器插件，不再要求 Hermes/Mac mini 安装本地 Pinterest-autopin 工具。
- `install.sh` / `ecommerce-stack pinterest-tool`：安装时不再自动同步旧本地 Pinterest-autopin 工具；`pinterest-tool update` 默认拒绝执行，只保留 `PINTEREST_AUTOPIN_LEGACY_ALLOW=1` 的迁移排查入口。

## [1.0.0] - 2026-06-25

### 新增
- `image-synth`：**生图后端化 + 外部模型选型（GPT Image 2）**——image-synth 从「Hermes 自带生图」切换为调**中心后端生图服务**（`POST /image/generate`，默认 GPT Image 2 / OpenRouter）。新增三模型对比选型 harness（[`image-synth/scripts/`](image-synth/scripts/)：OpenRouter（Nano Banana Pro / GPT Image 2）+ 火山方舟（Seedream 4.5），预览不偷跑 / `--run` 真跑 / 真实成本记 `usage.cost` / 产出对比图 + 评分表，多图参照 + Seedream 最小像素自动抬尺寸），用真实店铺图实测两轮选定 GPT Image 2。后端为**薄控制面 wrap OpenRouter**（per-profile token 鉴权防伪造 / 按租户 reserve-commit-refund 配额账本 / model allowlist / idempotency 去重防双扣 / 隐私脱敏），独立仓库部署到 ECS（systemd + 绑 tailnet），经代理出境解 OpenAI 地域封锁 + `imggen-health` 探测「经代理打 OpenAI」→ 飞书告警。新增契约文档 [`image-synth/references/backend-image-gen-contract.md`](image-synth/references/backend-image-gen-contract.md)（skill ↔ 后端唯一对齐源）；SKILL.md 全部「Hermes 自带生图」引用（frontmatter / 架构 / 对外接口 / step 7 / 硬性约束）改调后端契约，看图（anchor / QA）仍用 Hermes `vision_analyze`。经 `/plan-eng-review` + Codex 评审（14 项安全/计费 hardening 全折入）。
- `shared/skill-prefs.md` + `shared/preamble.md`：新增**客户偏好覆盖层（skill-prefs）**——每客户在 `<workspace>/skill-prefs/<skill>.md` 叠加本 skill 的工作流 / 风格旋钮，不改 skill 本体、不 fork。覆盖层与引擎物理分离，`ecommerce-stack update` 只换引擎不碰偏好，**升级零冲突 / 零 merge**；失配偏好按依赖降级协议报 `⚠️ DEGRADE`。品牌语气 / 店铺事实 / 平台规则仍走 BRAND/SHOP/COMMERCE_PLATFORM，安全 / QA 闸不可被覆盖。
- `shared/preamble.md`：新增**技能目录写入禁令**——agent 不得在 `~/.hermes/skills`（`$HERMES_SKILLS_DIR`）/ `~/.local/share/etsy-skills` 等共享技能目录新建 / 改写 skill（会污染全体客户并在升级时冲突）；客户专属知识走 `Knowledge Cards` / SHOP.md，通用能力产出「提拔建议」走 git。各 SKILL.md 的共享引导摘要同步加入「客户偏好」。
- `scripts/etsy-stack`：新增 `doctor [--quarantine]` 子命令——扫描技能目录里 manifest 之外的非托管条目（agent 自建 / 历史遗留）并可隔离到 `.quarantine/`，同时体检工作区 skill-prefs（标记目标 skill 已不在 manifest 的失配文件）；`list` 一并列出非托管条目；`init` 现在脚手架 `skill-prefs/` 目录与 README。
- `shared/store-base-architecture.md`：新增 one-shop-one-base 数据架构契约，默认一个店铺一个飞书多维表格 Base、业务对象拆成 Products / SKUs / Assets / Publishing Queue / Pinterest Queue / Orders / Customers / Suppliers / Knowledge Cards 等表；明确 SKU 不因迁移改名、旧 Base 只作迁移期 fallback、旧表不自动删除。
- `stack 级`：从 Etsy 专用 skill 包泛化为电商平台通用栈，新增 `ecommerce-stack` 入口、`shared/platform-config.md` 平台配置契约和 `COMMERCE_PLATFORM.md` 基座模板；内置 Etsy / 小红书两个可选平台 preset，并保留旧 `etsy-stack` 命令与 `.etsy-workspace` 标记兼容。
- `business-knowledge` + `trend-radar`：**接通 trend-radar → Knowledge Cards 的本周热词 ingestion**——此前 trend-radar 文档单方面声称「business-knowledge 整理周报时检查 latest.json」，但 business-knowledge 侧零引用、handoff 未落实。新增 [`business-knowledge/references/trend-radar-intake.md`](business-knowledge/references/trend-radar-intake.md) ingestion 契约：weekly intake 读 `outputs/trend-radar/latest.json` + `latest-fit-report.md`（+ 同日 `fit-report.json` 结构化优先），把 `decision ∈ {可做, 观察}` 且有 `candidate_products` 店铺结合点的上升热词映射成 `Knowledge Cards`（`适用场景=listing`、热词进 `关键词标签`、`过期提醒日期` +30-60 天、未经人工确认默认 `watch`），并在每次 intake **顺手把过期热词卡置 `expired`**（补月度 health check 尚未实现的空缺）。沉淀后 `listing-catalog` step 5.6 按现有 lookup 自动浮出作参考——**不改 listing 流程、不把热词自动塞进 title/tags**（仅作参考；自动注入是另一条可选规则，本次未做）。配套：`business-knowledge/SKILL.md` 模式 A 加 step 4.5（纳入热词材料）+ 扩 step 8（趋势卡映射 / 过期清扫指向契约）+ 进入条件 / description / 外部材料源补 trend-radar；`trend-radar/references/output-schema.md` § 下游消费 改为指向 intake 契约，handoff 双向闭环。
- `business-knowledge` + `listing-catalog`：**Knowledge Cards 从「摘要提醒」升级为按类型分叉的「可执行 playbook」**——给卡片加 `卡片类型`（`方法论` / `趋势` / `选品` / `定位` / `观察`）单选作为下游消费的分叉闸：`方法论` 卡命中时下游**必须读 `知识页链接` 的 wiki 正文，并把其判断清单 / 改写模板 / 正反例 / 开头规则应用到产出**（不再只展示一句话摘要，解决「卡片在、wiki 也在、却没人读」导致知识沦为泛泛提醒的问题），其余类型一句话摘要够用。配套：[`base-schema.md`](business-knowledge/references/base-schema.md) 加字段 + §卡片类型与消费 gating 表（新卡必填、存量缺省按 `观察`）；[`card-extraction-rules.md`](business-knowledge/references/card-extraction-rules.md) 抽取必填字段与判定要点同步；[`knowledge-card-lookup.md`](business-knowledge/references/knowledge-card-lookup.md) 把「选中才读 wiki」改为按类型分叉（方法论强制读并应用，输出加 `card_type` / `playbook_applied`）；[`listing-catalog/SKILL.md`](listing-catalog/SKILL.md) step 5.6 / step 7 把 wiki 的标题自检清单当 title **审查闸**、开头规则当 description **结构约束**，与平台 SEO 硬规则冲突时方法论写法降为 **A/B 候选**不强行覆盖既有 title 公式；[`listing-catalog/references/business-knowledge-lookup.md`](listing-catalog/references/business-knowledge-lookup.md) 新增「方法论卡：读 wiki 并应用」执行段；`trend-radar-intake.md` 自动建的热词卡固定 `卡片类型=趋势`（薄索引，不触发强制读 wiki）。
- `business-knowledge`：**修复过期清扫只扫 trend-radar 来源的 bug**——此前 [`trend-radar-intake.md`](business-knowledge/references/trend-radar-intake.md) §过期清扫 只把 `来源` 含 `trend-radar` 的过期卡置 `expired`，导致周报 / 用户来源的季节卡（如父亲节窗口）过了 `过期提醒日期` 仍挂 `active/watch`、继续在 listing step 5.6 浮出。现把过期清扫抽到 [`card-extraction-rules.md`](business-knowledge/references/card-extraction-rules.md) §Expiry sweep（**source-agnostic**：任何带 `过期提醒日期` 的卡到期都置 `expired`，不再看来源），由 `business-knowledge/SKILL.md` 模式 A 新增 step 8.5 在每次 weekly intake 统一跑；trend-radar 热词卡仅作为被清扫的一类（`过期提醒日期 = 记录日期 + 45 天`）。
- `stack 级` + `business-knowledge` + `scripts/etsy-stack`：**两层租户架构 + 知识种子（Knowledge Seeds）**——确立「公共引擎 vs 租户个性化」两层模型（租户赢、不可覆盖闸门免谈），把方法论知识做成 **copy-on-init 种子**而非 live 共享层：admin 只发一个通用包，种子 `init` 时拷进租户 `knowledge/wiki/`、**拷完归租户、随便改**，运行时永远两层、零 drift。新增 [`business-knowledge/seeds/`](business-knowledge/seeds/)（`manifest.json` 带稳定 `seed_id` / `seed_hash` / `applicability` + 去品牌化首份种子 `etsy-title-description-gift-conversion.md`，自带 `卡片类型=方法论` card-spec frontmatter）；`scripts/etsy-stack` `init` 拷种子 wiki + 写 `knowledge/.seeds.json` provenance ledger（按 `seed_id` 幂等、绝不覆盖租户已改），`doctor` **只读**上报可采纳 / 已采纳 / 未登记种子 + hash provenance（未改 vs 已改），并加**去品牌化护栏**（`debrand_denylist` 命中即非零退出，可当 CI 闸）；[`business-knowledge/SKILL.md`](business-knowledge/SKILL.md) 加「种子卡登记」桥——种子 wiki 自带 card-spec，由 business-knowledge 提议建 Knowledge Card（diff 预览 + 确认），**登记后 listing lookup 才可达**（卡是入口、wiki 是正文）；[`shared/knowledge-seeds.md`](shared/knowledge-seeds.md) 记录两层冲突规则与「方法论是 evidence 非 instruction」执行边界归属，`shared/skill-prefs.md` 红线表纳入知识层。经 `/plan-eng-review` + Codex outside voice 评审：撤回过度设计的 sync-seeds / 刷新语义（列 NOT-in-scope），改 hash provenance、补 wiki+卡可达性、doctor 只读。

### 修复（礼物 / 节日场景调研限定 Etsy 平台）
- `listing-catalog`：把礼物场景调研（模式 B step 5.5）**从全平台强制收敛为 Etsy 平台专属**。该环节在 Etsy 还是特权默认平台时加入（强制、`礼物倾向` 通用必填、`gift-scenario.md`「永远跑」），stack 泛化为多平台后未同步加门槛，导致小红书等非 Etsy 平台也被强制走 5 问礼物调研、产出无处落地的礼物词库（小红书无礼物 tag 槽位），违反 `platform-config.md`「其他平台不能复用 Etsy 的 SEO 规则」。现加平台门槛——礼物 / 节日维度只在目标平台是 Etsy 时显现，不影响小红书及其他平台：
  - `shared/platform-config.md`：Etsy preset 参考清单补 `gift-scenario.md` + `holiday-calendar.md`；门槛句明确礼物 / 节日场景调研是 Etsy 专属，非 Etsy 整段跳过
  - `listing-catalog/SKILL.md`：step 5.5 标题改「(Etsy 专属，Etsy 下强制；非 Etsy 平台整段跳过)」+ 加非 Etsy 跳过分支；step 1 `礼物倾向` 改 Etsy 专属必填；step 5.6 输入、step 10 in-memory 现传的礼物词库标为 Etsy 条件项
  - `listing-catalog/references/gift-scenario.md`：标题改「Etsy 专属环节」+ 顶部加平台门槛框；「永远跑」改「Etsy 每条跑 / 非 Etsy 不跑」
  - `listing-catalog/references/input-checklist.md`：`礼物倾向` 标 Etsy 专属必填 + 加平台门槛说明
  - `listing-catalog/references/holiday-calendar.md`：顶部加 Etsy-only 平台门槛

### 变更（飞书 Base 表结构精简）
- `shared/store-base-architecture.md` + `shared/preamble.md`：**建库默认只开 4 张基础表**（`Products 商品` / `Orders 订单` / `Customers 客户` / `Suppliers 供应商`）；素材池、社媒发布队列、知识卡片、视频表等扩展表第一次用到对应 skill 时再按需补建，不在建库时一次性全开。
- `listing-catalog`：**`Products 商品` 与 `SKUs 变体` 合并为一张 `Products 商品` 表**——一行 = 一个可售 SKU，商品级故事 / 品类 / 分享链接与 SKU / 成本 / 售价 / 库存 / 平台商品 ID 同表共存；退役 `skus` 逻辑键，多变体用 `变体` 字段或单独变体行，SKU 编码不变。
- `content-asset-pool` / `social-publisher` / `pinterest-autopin`：**`Publishing Queue 发布任务` 与 `Pinterest Queue` 合并为一张 `社媒发布队列` 表**——所有平台（含 Pinterest pin）共用一张表，用 `平台` 字段区分，Pinterest pin 即 `平台 = Pinterest` 的行；不再单建 Pinterest 子队列表，发布成功 / 失败一次回写本行，旧 `pin_id` 并入 `任务 ID`、`Title (EN)` / `Link` / `pin_url` 等并入通用字段 `标题` / `链接` / `发布 URL`。
- 移除 `Ops Log 操作日志` 表：迁移 / 发布 / 异常追踪改由各表上的迁移字段（旧 Base / 旧 table_id / 迁移状态）与 `社媒发布队列` 状态机承载。

### 去品牌化 / 去平台特权
- `stack 级`：移除所有品牌专属内容，使其成为真正通用的电商平台运营技能包。删除 ~28 个品牌 / Etsy 专属的遗留嵌套运营 skill（listing-catalog 下的 Etsy listing 优化 / SEO / 媒体一致性 / 数字打印件、orders-customers 下的品牌客服 / 订单 / 履约 / 运单运营、pinterest-autopin 下的品牌 Pinterest 运营子 skill，以及 image-synth / trend-radar 的品牌运营层、独立的 social-media / productivity / devops 目录）——这些工作流已由顶层通用 skill 覆盖。
- `etsy-stack.json`：移除 `defaultPlatform: "etsy"` 特权默认平台。Etsy 与小红书并列为可选 preset，平台由 `COMMERCE_PLATFORM.md` 驱动；任何 skill 不再假定 Etsy。
- 各 skill / shared / 参考文档：清除残留品牌字样与单一品类专属示例（硬编码的默认内容配比、示例文案、品牌官网链接等），改为通用占位或品类无关示例；假定 Etsy 的措辞（如裸用「Etsy 店铺 URL」「Etsy Listing ID」）改为通用「店铺 URL」/「平台商品 ID（如 Etsy Listing ID）」。
- `listing-catalog`：修复历史 merge 遗留的悬空引用——恢复被丢弃的 `references/{etsy-seo,input-checklist,erank-research,business-knowledge-lookup,holiday-calendar}.md`（`etsy-seo` / `erank-research` 作为 Etsy preset 参考，其余为通用流程参考），并把通用流程参考里假定 Etsy 的措辞与单一品类示例改为平台 / 品类无关；修正 `distillation-brand.md` 指向 `../shop-foundation/references/`。全仓 markdown 链接已无悬空引用。
- `listing-catalog` / `orders-customers`：新增小红书上架与订单字段参考，覆盖标题、类目、封面图、轮播图、视频、笔记正文、话题、价格、库存、SKU、物流、售后、订单状态、买家留言等上架和履约需要的字段。
- `social-publisher`：新增社交媒体自动发布 skill，首期支持 Pinterest 发布队列、适配器注册和发布回写契约；小红书先作为手动发布 / 待适配平台进入同一平台配置模型，后续可按适配器扩展。
- `content-asset-pool`：新增跨平台素材发布池 skill，登记待发布图片 / 视频、生成不覆盖原图的发布副本，并用素材池 + 发布任务双表追踪 Pinterest、Instagram、小红书、TikTok、Etsy 等平台的入队和发布状态。
- `orders-customers`：新增订单履约 SOP，覆盖新订单到发货、签收跟进的阶段检查、证据要求、Base 推荐字段和卡住视图；明确只处理订单之后的履约流程，不加入 listing 创建 SOP。
- `shared`：新增 AI 发布图清理协议 `ai-image-sanitization.md`，只在最终 listing 图片和社媒待发布图片的发布副本上使用 `remove-ai-watermarks` 清 AI metadata / AI visible watermark；明确素材库 `待处理/`、`image-synth` 的 `ai_raw/` 和内部参考图不处理，`invisible` / `all` 因会重写像素需用户显式 opt-in。
- `etsy-stack`：新增 `ai-cleaner` 子命令，用于检查 / 安装 [wiltodelta/remove-ai-watermarks](https://github.com/wiltodelta/remove-ai-watermarks)。
- `assets-library`：素材库物理层新增 `营销/` 一级文件夹，专门存放社交媒体、广告、邮件、活动页等营销路径的发布素材和派生版本；同步更新目录结构、素材类型映射、命名公式、schema 边界，以及 `image-synth` 社媒图入库目标。
- `supplier-foundation`：新增供应商管理基座，维护店铺总 Base 内 `Suppliers 供应商` / `采购来源` 表，覆盖物料名称、店铺名称、商品链接、状态、选择理由、合适参数、淘汰原因，以及主用/备用/测试中/淘汰视图。
- `business-knowledge`：新增 optional memory foundation，维护 `<workspace>/knowledge/raw|weekly|wiki|briefs` markdown、店铺总 Base 内 `Knowledge Cards 知识卡片` 表、Knowledge Card lookup contract 和 Marketing Brief 持久化流程。
- `trend-radar`：重新加入趋势热词采集 skill（v0.1 — Google Trends）。用 Playwright headless chromium 采集 Google Trends trending now 页面的上升关键词，输出结构化 JSON（TrendItem[] + run 元数据包装）到 `<workspace>/outputs/trend-radar/`。AutoCLI 命令 `trend-fetch google-trends [--geo GEO]`。下游 business-knowledge 可消费 `latest.json` 作为 Knowledge Cards evidence。分类 exit codes（1=usage, 2=config, 3=network, 4=parse）。vitest 单元测试覆盖 parser / runner / URL builder。
- `trend-radar`：新增 Pinterest Trends 月度热词来源 `pinterest-trends` 和 `pinterest-chinese`。两个来源都采集 `trendsPreset=1` 的 monthly keywords，`pinterest-chinese` 额外带 `keywordsToInclude=chinese` 并只保留包含 `chinese` 的关键词，避免未登录通用预览污染结果；沿用现有 JSON 输出合同、截图和 HTML evidence，并新增 parser / URL 单元测试。
- `trend-radar`：新增 eRank Trend Buzz 数据源 `erank-trend-buzz`，采集 Etsy / Last 30 Days 关键词并写入现有趋势 JSON 合同，供 `fit-report` 自动合并；免费态可能只有预览，完整列表可通过 `ERANK_TREND_BUZZ_PROFILE` / `ERANK_TREND_BUZZ_CDP_PORT` 复用已登录账号权限。
- `trend-radar`：新增 `trend-fetch fit-report` 第二步，读取当天所有趋势源 JSON、四份基座文件和本地商品上下文缓存，输出按趋势词组织的 `fit-report.md/json`。报告只做人工判断（`可做 / 观察 / 不做`），不自动生成 Marketing Brief，不直连飞书 Base。
- `pinterest-autopin`：新增 `references/patches/pinterest-video-pin-support-a5ccaec.patch`，临时沉淀 Pinterest-autopin 视频 Pin 支持补丁，供拿到工具仓库权限后应用到发布工具源码。

### 修
- `shared/preamble.md` 与 listing / orders / supplier / business-knowledge / assets / content-asset-pool / social-publisher / pinterest-autopin 等 skill：把默认建库/查询口径从多个独立 Base 调整为店铺总 Base 内多张表；客户共享入口默认只给店铺总 Base，不默认共享知识库；机器人和 Hermes Agent 权限默认限定到当前店铺总 Base 与必要素材文件夹。
- `README.md` / `install.sh` / `scripts/etsy-stack`：安装、更新、工作区解析和文档从 Etsy 命名迁移到通用电商命名，同时兼容既有 Etsy 环境变量、缓存目录和工作区标记。
- `assets-library` / `image-synth` / `content-asset-pool`：把 Etsy / Pinterest 单平台约束调整为平台配置驱动，避免商品图、视频安全区、素材状态和发布目标只能服务单一平台。
- `listing-catalog` / `pinterest-autopin`：补充商品表 `分享链接` 字段，并要求商品型 Pinterest 发布使用该字段作为 `Link`，不再临时拼 Etsy listing URL；同步应用层架构图和表命名约定。
- `photo-style`：从 stack 中移除。Hermes 当前只能调用生图模型，不能把原图作为可控 reference/edit input 传给模型，生成结果和原图差异过大；因此移除 skill、CLI 安装入口、manifest 暴露和后续 TODO。
- `assets-library` / `image-synth` / `pinterest-autopin`：把 AI metadata / AI watermark 清理接到发布出口，而不是素材管理入口；Pinterest processed 图片从“清空所有 metadata”改为“只清 AI metadata + AI visible watermark，并保留标准 metadata”。
- `shared/preamble.md` / `shared/dependency-protocol.md` / `README.md` / `etsy-stack.json`：把供应商管理纳入 Foundation 层和安装 manifest。
- `shared/preamble.md` / `shared/dependency-protocol.md` / `README.md` / `etsy-stack.json`：把 `business-knowledge` 纳入 Foundation 层、店铺总 Base 表命名约定和安装 manifest；下游引用 Knowledge Cards 时默认 `SKIP`，不阻塞原流程。
- `listing-catalog`：模式 B 写 listing 时新增 step 5.6，可在礼物场景调研后按 `business-knowledge` canonical contract 检索 Knowledge Cards；无命中静默跳过，有命中先展示采用 / 拒绝 / 边界，再生成文案。
- `shared/preamble.md`：补充 Hermes cron 输出型报告的窄例外。用户在配置定时任务时确认固定输出目录后，cron 可追加新的时间戳报告 / JSON / raw evidence 文件；仍禁止覆盖旧报告或修改业务文件。
- `install.sh`：移除 trend-radar 的 retired 集合；新增 trend-radar npm 依赖安装 + Playwright chromium 安装 + `trend-fetch` CLI 链接。
- `README.md`：skill 表加 trend-radar 一行；仓库布局加 utility/input 层；运行环境加 node/npm；移除"趋势分析交给 CoWork"措辞。
- `install.sh` / `etsy-stack`：支持嵌套 skill 路径软链，并阻止 `pinterest-tool update` 默认拉旧 `easyaitech/Pinterest-autopin` 仓库；必须先核实真实工具来源或显式设置 `PINTEREST_AUTOPIN_REPO`。

## [0.4.0] - 2026-05-10

`stack 级`：把 6 个 skill 里重复的启动引导（版本检查 / 工作区解析 / 写入约束 / 工作语言）抽到 `shared/` 目录，加两层架构声明（Foundation / Application）和三级降级协议。每个 skill 净减 ~12-15 行重复 boilerplate，新增经营原则注入。

### 新增
- `shared/preamble.md`：stack 共享引导——版本检查 + 工作区路径解析（从 shop-foundation 搬出）+ 写入前通用约束 + 工作语言规则 + 经营原则引用
- `shared/dependency-protocol.md`：两层架构文档（基座层 4 个平级 + 应用层围绕基座运行）+ 三级降级协议（BLOCK / DEGRADE / SKIP）+ 各 skill 对基座文件的降级等级速查表
- `shared/ethos.md`：4 条经营原则（品牌一致性 > 效率 / 事实不可自编 / 授权才能发布 / 基座完整性优先）

### 重构
- 6 个 SKILL.md 启动检查段：从内联 10 行 boilerplate 改为引用 `shared/preamble.md`
- 6 个 SKILL.md 写入约束 / 工作语言段：从引用 `shop-foundation §...` 改为引用 `shared/preamble.md §...`，各 skill 只保留自身特有规则
- `shop-foundation/SKILL.md`：工作区路径解析（~40 行）搬到 shared/preamble.md；启动检查精简为引用 + 基座文件完整性检查（shop-foundation 特有）
- YAML frontmatter：基座层 4 个 skill 加 `layer: foundation`；应用层 2 个 skill 加 `layer: application` + `depends-on` 声明

### 修
- `install.sh`：skill 软链循环后加 `shared/` 目录的软链（同防御模式：非软链已存在则备份）
- `README.md`：仓库布局加 `shared/` 目录 + 两层架构标注

### 安装入口（钉死 v0.4.0）
```
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.4.0/install.sh | bash
```

## [0.3.0] - 2026-05-08

`image-synth`：加全新 skill — 用 Hermes 自带生图能力把"图片需求 + 商品实拍图"合成成 1 张电商图或社媒图。卖家拍不起场景、拍不齐 lifestyle 槽是真痛点；上游 assets-library 模式 D 已经把"决定拍什么"压稳，下游需要一个出口让 AI 直接出图——专攻电商图（Etsy listing 槽位）+ 社媒图（Pinterest / Instagram / Story / 节日营销 banner）。架构按 stack 同构范式「输入 → 词库 → 文案」组装：输入 = brief + 实拍图 + BRAND.md；词库 = 5 类（mood / shot-spec / anchor / negative / format）；文案 = 英文 prompt + negative prompt。差异化 QA 闸门（电商图严格比对商品形态，社媒图仅检文字可读性 + 视觉禁区）+ 自动重试 ≤ 2 次 + 失败用户三选一。生成图先落 `<workspace>/.cache/image-synth/ai_raw/`，由用户选「入库（走 assets-library promote）/ 留 ai_raw / 丢弃」。

### 新增
- `image-synth/SKILL.md`：主入口；2 模式 + 3 反向触发条件；共享 11 步执行流 + 模式差异表
- `image-synth/references/prompt-vocabulary.md`：5 类词库映射规则 + 最终 prompt 拼装；用户口述 brief 时 ≤ 3 轮对齐流程
- `image-synth/references/qa-gates.md`：模式 A 5 项 / 模式 B 2 项 QA；批量 vision 调用约定（每 attempt 1 次 vision，避免 5x 放大）；自动重试 ≤ 2 次 + 第 3 轮失败用户三选一；QA 失败的图禁止入库
- `image-synth/references/output-layout.md`：`.cache/image-synth/ai_raw/` 落盘 + 同名 sidecar `.json` schema；入库走 `promoted/` / 丢弃走 `retired/`，各 7 天回滚窗口；promote 时透传字段表
- `image-synth/references/social-platform-specs.md`：Pinterest / Instagram (post / Story) / Twitter / Facebook 平台规范 + 自定义尺寸默认 shot-spec
- `image-synth/references/etsy-listing-image-specs.md`：Etsy 平台硬规则（文件大小 / 尺寸 / 格式 / 政策禁区）+ hero 主图特殊硬规则 + 与 hero QA 对接

### 修
- `assets-library/SKILL.md` 模式 D：加 step 11 反向触发 image-synth（用户选"不拍直接合成"），含 guard——若来自 listing-catalog 反向触发则跳过本步避免重复追问；与其他 skill 协作段加 image-synth；关键约束更新 `image-design` → `image-synth`
- `assets-library/PLAN-MODE.md`：frozen design doc 的命名同步（image-design → image-synth）
- `listing-catalog/SKILL.md` 模式 B step 10：从「shoot brief 二选一」改成「shoot brief / 直接 AI 合成 / 跳过」三选一；选 ② 时 invoke image-synth 现传 4 类礼物词库 + description 段 3 + 商品表该 SKU 行 in-memory
- `pinterest-autopin/SKILL.md` 模式 B：候选池空时拆出 step 3.5 三选一（assets-library promote / 反向触发 image-synth / 跳过），结构对齐 sibling 反向触发块；与其他 skill 协作段加 image-synth
- `etsy-stack.json`：skills 列表加 image-synth
- `README.md`：skill 表加 image-synth 一行；硬编码"X 个 skill"字眼改成"每个 / 所有 / stack 中"模板措辞，未来加 skill 不再 churn 计数；钉死 v0.3.0 安装入口

### 跨 skill 协议（vocabulary 收敛）
- 渠道值与 Etsy 槽位 ID 的取值集统一引用 [`assets-library/references/asset-index-base-schema.md` § 用途标签](assets-library/references/asset-index-base-schema.md) 与 [`etsy-listing-photo-slots.md § 3`](assets-library/references/etsy-listing-photo-slots.md)（contract source）；image-synth filename / sidecar / promote 透传 一律用 canonical 词汇，避免 promote 时词汇表分裂

### 安装入口（钉死 v0.3.0）
```
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.3.0/install.sh | bash
```

## [0.2.0] - 2026-05-07

`assets-library`：加模式 D plan（拍前出 shoot brief）。现状是模式 A 建库 / B1 dump / B2 promote / C 查找 — 接到原料前的"决定拍什么"是空白。摄影没 brief 上手就拍 = 50 张里只有 5-10 张能用，关键 Etsy 槽位（hero / scale / packaging / size chart）经常忘拍要补拍。模式 D 在拍前给 SKU 出一份 markdown shoot brief，落 `1. 摄影/by-SKU/{SKU}/shoot-brief.md`，按 stack 同构范式「输入 → 词库 → 文案」组装：输入 = SKU 行 + BRAND.md + listing-catalog 礼物词库；词库 = Etsy 10 槽位社区 SOP（独立 reference）；文案 = 三段式 brief（A 槽位映射 / B Mood / C 镜头清单）。

### 新增
- `assets-library/PLAN-MODE.md`：模式 D 设计 doc（Approved，前置 office-hours 会话 2026-05-07，reviewer x2 = 6/10 → 8/10 PASS）
- `assets-library/references/etsy-listing-photo-slots.md`：Etsy 10 槽位社区 SOP；首段警示"平台只规定 10 张图，槽位无平台语义"；P0/P1/P2/P3 优先级定义；与 `Assets 素材池` 表 "用途标签"字段对齐的槽位 ID 词汇表（hero / variation / scale / size-chart / detail / lifestyle / packaging / brand-story / context / comparison）；PR1 仅做通用 SOP，按品类细化留 v2
- `assets-library/references/shoot-brief-template.md`：三段式 brief 模板骨架 + 填写指引（A/B/C/D/E + References 段；BRAND 缺失降级为 ⚠️ 占位；老 SKU 部分跑只填缺位行）

### 修
- `assets-library/SKILL.md`：description "三种触发 → 四种触发"加模式 D；"对外接口"段补商品表；"依赖关系"表补 BRAND.md 视觉禁区段、SHOP.md § 物料、商品表 SKU 行字段、listing-catalog 礼物词库；"三种执行模式 → 四种执行模式"；加模式 D 章节（10 步执行 + 部分跑分支 + 9a 逐层建目录 + 输入降级表 + 关键约束）；"与其他 skill 的协作"补 listing-catalog 礼物词库消费路径
- `assets-library/references/asset-index-base-schema.md`：用途标签字段词汇表加 Etsy 槽位 ID 段（与 etsy-listing-photo-slots.md 对齐）+ legacy 段（"Etsy listing 主图 → 等同 hero"等映射）；录入约定 §4 加"Etsy listing 用图建议 promote 时就勾槽位 ID（模式 D 部分跑反查依赖）"
- `assets-library/references/folder-structure.md`：`by-SKU/{SKU}/` 子目录列表加 `shoot-brief.md` 一行
- `listing-catalog/SKILL.md` 模式 B 加 step 10：listing 文案写入 Base 后追问"要不要顺手出 shoot brief"——用户同意时 invoke assets-library 模式 D，**调用方现传** 4 类礼物词库 + description 段 3 in-memory（避免走 Base 反推路径，词库新鲜可用）；用户跳过不阻塞
- `README.md` skill 表 assets-library 描述补"+ 拍前 shoot brief 生成（模式 D）"

### 安装入口（钉死 v0.2.0）
```
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.2.0/install.sh | bash
```

## [0.1.7] - 2026-05-07

`stack 级`：加 Etsy 工作区路径解析契约。原本 5 个 skill 都用「项目根目录」隐式假设 cwd 就是工作区根——在 Hermes profile 隔离场景下 `$HOME` 是 profile sandbox HOME，靠 `~/` 推路径会让 BRAND.md 落到错误位置。新方案：`$ETSY_WORKSPACE` 环境变量 → `.etsy-workspace` 标记向上查找 → 都没有就停下问用户，绝不猜。

### 新增
- `etsy-stack workspace` 子命令：按解析顺序定位工作区根（环境变量 → 向上找标记），失败时给出明确错误信息并退出非零
- `etsy-stack init [DIR]`：在 DIR（默认 cwd）写 `.etsy-workspace` 标记文件；检测目标是 git 仓库时自动提示加 `.cache/` 到 `.gitignore`
- `shop-foundation/SKILL.md` §工作区路径解析：stack 级契约段，规定解析顺序、失败行为、不允许的写法（写死绝对路径 / `~/workspaces/etsy` 兜底 / 候选路径探测），下游 skill 引用

### 修
- `listing-catalog` / `orders-customers` / `assets-library` / `pinterest-autopin` SKILL.md：把「项目根目录的 BRAND.md / SHOP.md」统一改成「工作区根目录的 BRAND.md / SHOP.md」，并指向 shop-foundation 的契约段；引用表里的 `./BRAND.md` / `./SHOP.md` 改成 `<workspace>/BRAND.md` / `<workspace>/SHOP.md`
- `pinterest-autopin` runtime 路径迁移：`~/code/etsy-skills/tools/Pinterest-autopin/runtime/{pin_id}.json` → `<workspace>/.cache/pinterest-autopin/runtime/{pin_id}.json`。runtime 数据按工作区隔离（多店铺切换不互相污染、跟工作区一起迁移）；工具源码本体仍在 `~/code/etsy-skills/tools/`（开发者机器约定，与 stack 安装路径同性质）。`npm run pin:*` 改为传 runtime 文件的**绝对路径**，因工具 cwd 不在工作区
- `pinterest-autopin/references/runtime-setup.md` § 路径约定：runtime 改写到工作区，配 `<workspace>` 占位符 + 三层分离（工具源码 / 登录态 / runtime 数据）的理由
- `pinterest-autopin/references/publishing-flow.md`：流程图加 step 0（解析工作区），三阶段命令统一用 `<runtime>` 占位符替代旧的 `runtime/...` 相对路径
- `pinterest-autopin/references/pin-queue-base-schema.md`：runtime 路径示例同步
- `README.md` 加「工作区初始化（首次使用必读）」节，etsy-stack 命令清单补 `workspace` / `init`

### 安装入口（钉死 v0.1.7）
```
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.7/install.sh | bash
```

## [0.1.6] - 2026-05-07

`listing-catalog`：把礼物 / 节日维度从「文末点缀」提升到「输入级模块」。现状 listing 写作过度聚焦物的维度（材质 / 工艺 / 形态），缺关系的维度（送给谁 / 什么节日）——而 Etsy 流量大头是礼物搜索意图，这块漏吃。新加 step 5.5 强制环节，按客单价档（< $20 / $20-$50 / ≥ $50）分流问法 + 词库结构，跟现有 BRAND/SHOP/eRank 的「输入 → 词库 → 文案」范式同构。

### 新增
- `listing-catalog/references/gift-scenario.md`：5-block 节点格式（与 erank-research.md 同构），礼物场景调研环节的执行细节。5 问（① 礼物倾向 ② 受众类型 ③ 场景 ④ 节日时机 ⑤ 受众画像）按客单价档分流；输出礼物词库 4 类 + 长尾语义短语；BRAND.md 三条硬过滤规则（避免说清单 / 禁忌形容词黑名单 / 同语域校验）+ 过滤决策可见
- `listing-catalog/references/holiday-calendar.md`：节日清单（西方默认 + 东方可选）+ 提前期规则（tag 90 天 / title 60 天 / description 强化 30 天）+ 通用送礼场景词库 + 节日命中查询格式。`last_updated` 字段 + 365 天陈旧检测

### 修
- `listing-catalog/SKILL.md` 模式 B：step 5（eRank 可选）后插入 step 5.5（礼物场景调研，**强制**）；step 1 必填项加「预期售价」「礼物倾向」；step 7 输出说明更新（13 tag 严格守恒、礼物槽数按档位 3/4/3、title 公式礼物维度从第 4 提到第 3、description 段 3 双小段）
- `listing-catalog/references/etsy-seo.md`：title 公式调整（礼物维度第 3 位）；tags 13 槽分三档分配表（位移规则——礼物槽多占的从「使用场景」槽位移而来，**不动品类 / 工艺槽**，13 槽硬守恒）；description 段 3 改名「使用 + 礼物场景」并给出双小段 verbatim 模板；季节性章节扩写——提前期规则表 + 跨节日 / 0 命中处理；SEO 自检清单加礼物维度项
- `listing-catalog/references/input-checklist.md`：必填项加「预期售价」「礼物倾向」；可选项里「使用场景 / 受众」拆分（自购为主 SKU 走「使用场景」、送礼 / 兼顾走 step 5.5 自动收集）；加「计划上架日」可选输入；不要向用户索要的清单加「礼物词库」

### 安装入口（钉死 v0.1.6）
```
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.6/install.sh | bash
```

## [0.1.5] - 2026-05-06

`listing-catalog`：加 eRank 调研可选环节（5 节点）。`scripts/check-update.sh`：原本只比 tag，tag 没动就报"已是最新"——两次发版之间合到 main 的 commit（典型场景：刚 merge 的 feature 还没打 tag）用户那边永远看不到提示。这次加 main 推进检测。

### 新增
- `listing-catalog/SKILL.md` 模式 B 第 5 步：按 SKU 价值 + 用户 eRank 账号情况 gate 一个可选预调研，5 节点（选品验证 / 关键词词库 / 标题模式 / tag 反查 / 定价对标）驱动 title + 13 tag + 定价文案
- `listing-catalog/references/erank-research.md`：5 节点的执行细节、网页跑 + 贴回数据的协作模式、字段约定
- `listing-catalog/references/etsy-seo.md` / `input-checklist.md`：被动钩子提示 erank-research.md 存在，不进 hot path

### 修
- `scripts/check-update.sh` 加 main 推进检测：在 tag bump 路径之外加第二条——用户跟 main 走 + `origin/main` 比 HEAD 领先 → "main 比当前快 N 个 commit"。tag bump 仍优先；detached HEAD（用户显式钉了 tag）和别的分支（dev 自己的工作分支）都不打扰
- `scripts/check-update.sh`：`stat -c %Y`（GNU）放前面、`stat -f %m`（BSD/Mac）走 fallback。Linux 上 `stat -f %m FILE` 会被解析成"按文件系统 stat 文件 %m 和 FILE"——stdout 多行 `File:` / `ID:` / `Block size:` 污染 `last_ts`，配合 `set -u` 让缓存命中分支崩在算术比较那一步。后果：5 个 skill 串行激活时第 1 个走网络路径正常 emit，后 4 个命中缓存全部静默 abort

### 重构
- `scripts/check-update.sh` 缓存拆 `latest-tag` / `latest-main` 两份；`install.sh` 和 `etsy-stack check` 清缓存改 `latest-*` glob，顺手扫掉历史 `latest-version`
- `scripts/check-update.sh` 路径 2 把 `latest_main` 空检查前置（fail fast），fetch 失败的退化场景下少 spawn 一次 `git symbolic-ref`

### 安装入口（钉死 v0.1.5）
```
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.5/install.sh | bash
```

## [0.1.4] - 2026-05-05

`assets-library`：拆 dump → promote 双段流程，原片冷藏不进 Base、promoted 成品才进 Base。下游 `pinterest-autopin` / `listing-catalog` 跟着适配。背景与决策见 [`assets-library/REDESIGN.md`](assets-library/REDESIGN.md)。

### 重构
- `assets-library/SKILL.md`：模式 B 拆成 B1（dump 批量入冷藏，**不**录 Base）和 B2（promote 单条上货架，编辑成品 + 录 Base + BRAND 合规自检）；模式 B1 加 3 路决策树（整批 shoot / 已知 SKU / UGC）；模式 C 拆"找成品走 Base / 找原片走文件夹"；frontmatter description 重写
- `assets-library/references/asset-index-base-schema.md`：设计原则 4「录入即合规」→「**Promote 即合规**」；推荐视图（"待整理"→"待派渠道（用途未填）"）和录入约定段对齐 B2 promote
- `assets-library/references/folder-structure.md`：加"冷藏 vs 货架"小节 + 目录树注释 raw / edited 进 Base 状态；shoot-archive 改为 B1 dump 默认目的地
- `assets-library/references/naming-convention.md`：加"两阶段命名"段——dump 接受相机原始名，promote 强制按公式；改名时机段拆三档
- `assets-library/references/asset-types.md`：视觉合规自检章节改名"（B2 promote 时）"；RAW 段明确不进 Base；客户拍摄 row 加 B1/B2 流程注释
- `pinterest-autopin/SKILL.md`：模式 B 第 3 步加 4 路 fallback（在 Base ✅ / 缺 Pinterest 用途 / 未授权 / 不在 Base 反向触发 B2 promote）；硬性约束"未授权 UGC 一律拒绝"软化为指引走授权 / promote 流程
- `listing-catalog/references/base-schema.md`：加"反查素材：商品表 ↔ `Assets 素材池` 表"段——反向关联看到的是 promoted 成品，原片不在反查结果里要直接打开 raw/ 目录

### 新增
- `assets-library/REDESIGN.md`：office-hours 会话产物，记录这次 refactor 的决策、三种节奏（a 集中 shoot 主 / b 零散补拍辅 / c UGC 槽位）与落地步骤

### 安装入口（钉死 v0.1.4）
```
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.4/install.sh | bash
```

## [0.1.3] - 2026-05-05

`listing-catalog`：把"每条 listing 必须有视频"和"图/视频 alt"补进 schema 与流程。

### 新增
- `listing-catalog/references/base-schema.md`：核心字段加 `视频链接`（标注店铺硬性约束：每条 listing 必须有视频，否则状态停草稿）；辅助字段加 `图片 Alt (EN)` / `视频 Alt (EN)`
- `listing-catalog/references/input-checklist.md`：必填项加"产品视频（1 条，5–15 秒）"，没视频不进上线流程
- `listing-catalog/references/etsy-seo.md`：加 Image / Video Alt Text 段（长度、写法、差异化原则、例子、Base 字段对齐）；SEO 自检清单增 2 项（视频就位 + alt 已写）

### 安装入口（钉死 v0.1.3）
```
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.3/install.sh | bash
```

## [0.1.2] - 2026-05-05

`/simplify` 收掉冗余状态 + 热路径精简。

### 重构
- 删 `.installed-version` 文件：current 直接从 `git describe --tags --always` 推导，少一份会和 git 飘的状态
- `check-update.sh` 热路径重排：缓存命中且无更新时只跑 stat / date / cat，git 调用推迟到 emit 内部 lazy 求值；首装当日（无 latest 缓存）少 2-3 个 spawn
- `check-update.sh`：`awk -F/` → `sed`，少一个进程
- `install.sh`：去章节装饰注释，保留 WHY 注释；symlink 分支只对"非软链的真实文件 / 目录"备份

### 修
- `check-update.sh` emit_if_behind：加 semver guard，避免 main 用户（current = `v0.1.1-N-gabc`）看到误报"反向降级"提示
- `install.sh`：`merge --ff-only` 失败不再静默吞，warn 提示用户人工介入

### 优化
- `README`：去掉每发版必过期的 SHA256 行（HTTPS 已经是真正的保护）

### 安装入口（钉死 v0.1.2）
```
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.2/install.sh | bash
```

## [0.1.1] - 2026-05-05

代码审查后的稳健性补丁。

### 修
- `install.sh`：当 `ETSY_SKILLS_REF` 指 tag 升级时不再撞 detached HEAD（之前会报 "no tracking information"）
- `check-update.sh` / `etsy-stack`：`.installed-version` 为空文件时不再产生 ` → vX.Y.Z` 这种掉了"current"段的假提示
- `shop-foundation` 启动检查段落和其他 4 个 skill 对齐文案

### 优化
- `install.sh` / `etsy-stack`：Python 路径走环境变量传值，不再把 bash 变量当字符串字面量插进 Python 源码
- `etsy-stack.json`：删掉没人读的 `version` 字段（版本来源是 git tag）
- `etsy-stack list`：清死代码（unused `import sys` / `target = readlink`）

### 安装入口（钉死 v0.1.1）
```
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.1/install.sh | bash
```
SHA256：`cbbb1b34a93c1903b9e2a2c2a4378c0ac825d2c13ef1ff6c39a88ec4c5a8132b`

## [0.1.0] - 2026-05-05

首发版本。

### Skills
- `shop-foundation` — BRAND.md / SHOP.md 元基础
- `listing-catalog` — 商品目录表 + Etsy listing 文案
- `orders-customers` — 订单 / 客户表 + 客服 SOP
- `assets-library` — 飞书云空间素材库 + `Assets 素材池` 表
- `pinterest-autopin` — `Pinterest Queue` 表 + 外部 Pinterest 自动发布工具

### Bundle 工具链
- `install.sh` — clone + 软链 + 安装 CLI（默认 HTTPS clone，匿名可装 public 仓库）
- `etsy-stack.json` — manifest，列出 bundle 包含哪些 skill
- `etsy-stack` CLI：`version` / `check` / `update` / `list` / `where`
- `scripts/check-update.sh` — 24h 缓存的远端 tag 比对，**5 个 skill 启动时**都会静默调用

### 安装入口（陌生人）
```
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.0/install.sh | bash
```
钉死 tag 版本是推荐做法——`main` 上的 install.sh 后续会变。
