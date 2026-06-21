# Changelog

本项目使用 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增
- `shared/skill-prefs.md` + `shared/preamble.md`：新增**客户偏好覆盖层（skill-prefs）**——每客户在 `<workspace>/skill-prefs/<skill>.md` 叠加本 skill 的工作流 / 风格旋钮，不改 skill 本体、不 fork。覆盖层与引擎物理分离，`ecommerce-stack update` 只换引擎不碰偏好，**升级零冲突 / 零 merge**；失配偏好按依赖降级协议报 `⚠️ DEGRADE`。品牌语气 / 店铺事实 / 平台规则仍走 BRAND/SHOP/COMMERCE_PLATFORM，安全 / QA 闸不可被覆盖。
- `shared/preamble.md`：新增**技能目录写入禁令**——agent 不得在 `~/.hermes/skills`（`$HERMES_SKILLS_DIR`）/ `~/.local/share/etsy-skills` 等共享技能目录新建 / 改写 skill（会污染全体客户并在升级时冲突）；客户专属知识走 `Knowledge Cards` / SHOP.md，通用能力产出「提拔建议」走 git。各 SKILL.md 的共享引导摘要同步加入「客户偏好」。
- `scripts/etsy-stack`：新增 `doctor [--quarantine]` 子命令——扫描技能目录里 manifest 之外的非托管条目（agent 自建 / 历史遗留）并可隔离到 `.quarantine/`，同时体检工作区 skill-prefs（标记目标 skill 已不在 manifest 的失配文件）；`list` 一并列出非托管条目；`init` 现在脚手架 `skill-prefs/` 目录与 README。
- `shared/store-base-architecture.md`：新增 one-shop-one-base 数据架构契约，默认一个店铺一个飞书多维表格 Base、业务对象拆成 Products / SKUs / Assets / Publishing Queue / Pinterest Queue / Orders / Customers / Suppliers / Knowledge Cards 等表；明确 SKU 不因迁移改名、旧 Base 只作迁移期 fallback、旧表不自动删除。
- `stack 级`：从 Etsy 专用 skill 包泛化为电商平台通用栈，新增 `ecommerce-stack` 入口、`shared/platform-config.md` 平台配置契约和 `COMMERCE_PLATFORM.md` 基座模板；内置 Etsy / 小红书两个可选平台 preset，并保留旧 `etsy-stack` 命令与 `.etsy-workspace` 标记兼容。
- `business-knowledge` + `trend-radar`：**接通 trend-radar → Knowledge Cards 的本周热词 ingestion**——此前 trend-radar 文档单方面声称「business-knowledge 整理周报时检查 latest.json」，但 business-knowledge 侧零引用、handoff 未落实。新增 [`business-knowledge/references/trend-radar-intake.md`](business-knowledge/references/trend-radar-intake.md) ingestion 契约：weekly intake 读 `outputs/trend-radar/latest.json` + `latest-fit-report.md`（+ 同日 `fit-report.json` 结构化优先），把 `decision ∈ {可做, 观察}` 且有 `candidate_products` 店铺结合点的上升热词映射成 `Knowledge Cards`（`适用场景=listing`、热词进 `关键词标签`、`过期提醒日期` +30-60 天、未经人工确认默认 `watch`），并在每次 intake **顺手把过期热词卡置 `expired`**（补月度 health check 尚未实现的空缺）。沉淀后 `listing-catalog` step 5.6 按现有 lookup 自动浮出作参考——**不改 listing 流程、不把热词自动塞进 title/tags**（仅作参考；自动注入是另一条可选规则，本次未做）。配套：`business-knowledge/SKILL.md` 模式 A 加 step 4.5（纳入热词材料）+ 扩 step 8（趋势卡映射 / 过期清扫指向契约）+ 进入条件 / description / 外部材料源补 trend-radar；`trend-radar/references/output-schema.md` § 下游消费 改为指向 intake 契约，handoff 双向闭环。

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
- `shared/preamble.md` 与 listing / orders / supplier / business-knowledge / assets / content-asset-pool / social-publisher / pinterest-autopin / video-assembly 等 skill：把默认建库/查询口径从多个独立 Base 调整为店铺总 Base 内多张表；客户共享入口默认只给店铺总 Base，不默认共享知识库；机器人和 Hermes Agent 权限默认限定到当前店铺总 Base 与必要素材文件夹。
- `README.md` / `install.sh` / `scripts/etsy-stack`：安装、更新、工作区解析和文档从 Etsy 命名迁移到通用电商命名，同时兼容既有 Etsy 环境变量、缓存目录和工作区标记。
- `assets-library` / `image-synth` / `video-assembly` / `content-asset-pool`：把 Etsy / Pinterest 单平台约束调整为平台配置驱动，避免商品图、视频安全区、素材状态和发布目标只能服务单一平台。
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
