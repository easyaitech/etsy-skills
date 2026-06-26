# ecommerce-skills

通用电商运营 skill bundle，跑在 [Hermes Agent](https://hermes-agent.nousresearch.com/) 上（Mac mini 本地），用 [larksuite/cli](https://github.com/larksuite/cli) 操作飞书 Base / 文档 / 云空间。

每个 skill 各管一摊：品牌底座、销售平台配置、商品目录、订单客服、供应商管理、业务知识库、素材库、社交媒体发布、Pinterest 自动 pin、AI 图片合成、趋势热词采集（完整列表见下面 §Skills）。默认数据架构是 **一个店铺 = 一个飞书多维表格 Base；一个业务对象 = Base 内一张表**，下游都引用 `BRAND.md` / `SHOP.md` / `COMMERCE_PLATFORM.md`，从 `shop-foundation` 开始建是推荐顺序。

仓库历史上叫 `etsy-skills`，Etsy 和小红书继续作为内置平台 preset。新的通用入口是 `ecommerce-stack`，旧命令 `etsy-stack` 保留兼容。

## 安装

```bash
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v1.0.1/install.sh | bash
```

脚本会：
- clone 到 `~/.local/share/etsy-skills/`
- 把所有 skill 软链进 `~/.hermes/skills/`
- 把 `ecommerce-stack` CLI 装到 `~/.local/bin/`，并保留 `etsy-stack` 兼容命令

谨慎模式（先看再跑）：

```bash
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v1.0.1/install.sh -o install.sh
less install.sh    # 自查一遍
bash install.sh
```

## Skills

| Skill | 干啥 |
|---|---|
| [`shop-foundation`](shop-foundation/SKILL.md) | 维护 BRAND.md（品牌原则）+ SHOP.md（店铺事实）+ COMMERCE_PLATFORM.md（销售平台配置）等元基础 |
| [`listing-catalog`](listing-catalog/SKILL.md) | 店铺总 Base 内 `Products 商品` 表 + 按目标电商平台配置撰写商品页 / listing 文案 |
| [`orders-customers`](orders-customers/SKILL.md) | 店铺总 Base 内 `Orders 订单` / `Customers 客户` 表 + 按平台配置支撑客服/履约 SOP + 客户标签 |
| [`logistics-tracking`](logistics-tracking/SKILL.md) | 跨境物流状态跟踪（薄 skill）：让 agent 调 `track` 命令查/录物流，接后端常驻的 17TRACK 跟踪服务（每天自动轮询到签收）；正确性在后端服务，不写飞书 Base |
| [`supplier-foundation`](supplier-foundation/SKILL.md) | 店铺总 Base 内 `Suppliers 供应商` 表 + 采购来源筛选、主用/备用/淘汰记录 |
| [`business-knowledge`](business-knowledge/SKILL.md) | 轻量业务知识库：每周材料 → raw / weekly / wiki markdown + `Knowledge Cards 知识卡片` 表 + Marketing Brief |
| [`assets-library`](assets-library/SKILL.md) | 素材生命周期 owner（双层：六文件夹物理层 + 店铺总 Base `Assets 素材池` canonical + `Asset Variants 派生素材` 变体工厂）；不碰创意策略 |
| [`image-brief`](image-brief/SKILL.md) | 图片方案设计（创意 brief owner）：给 SKU + 目标平台出平台感知 brief（槽位/Mood/镜头清单），再分叉到人工拍摄 / image-synth / 已有素材；只产 brief 计划文档，不拍不生图不归档 |
| [`publish-composer`](publish-composer/SKILL.md) | 发布编排（旧名 content-asset-pool）：把 assets-library 的发布副本变体 + 商品 + 品牌组装成跨平台发布意图 PublishIntent，拥有 `社媒发布队列` 表；平台专属走 typed extension。只引用变体，不收集/清理/裁切 |
| [`social-publisher`](social-publisher/SKILL.md) | 社交媒体自动发布总控层：从店铺总 Base 内 `社媒发布队列` 表读取待发任务，按 adapter 路由（Pinterest enabled；小红书 adapter 已建、执行 gated；IG/TikTok 草稿/人工对账） |
| [`pinterest-autopin`](pinterest-autopin/SKILL.md) | `社媒发布队列` 表 `平台 = Pinterest` 行 + 调 yanggedianzhang 服务器工具创建 Pinterest job，由现有浏览器插件使用租户登录态执行 |
| [`xiaohongshu-autopost`](xiaohongshu-autopost/SKILL.md) | `社媒发布队列` 表 `平台 = 小红书` 行（笔记，`XiaohongshuExt` typed 字段）+ 同 pinterest 三层范式调服务器工具/插件；**执行 gated**（服务器工具 + 插件 capability + 笔记 recipe 就绪前只出草稿 + 人工发布清单） |
| [`image-synth`](image-synth/SKILL.md) | AI 图片合成（电商图 / 社媒图）：用 Hermes 自带生图能力把"图片需求 + 商品实拍图"合成成 1 张成品图，差异化 QA 闸门 + 入库走 assets-library |
| [`trend-radar`](trend-radar/SKILL.md) | 每周自动采集 Google Trends / Pinterest Trends / eRank Trend Buzz 热词，并生成趋势 × 店铺/品牌/商品的 fit report 供人工判断 |

## 工作区初始化（首次使用必读）

stack 中所有 skill 都会把 BRAND.md / SHOP.md / COMMERCE_PLATFORM.md / 社媒发布队列辅助文件等数据落到统一的「工作区」。Hermes profile 隔离环境下 `$HOME` 不是系统用户 HOME，靠 `~/` 推路径会让数据落到 profile sandbox。**必须**显式声明工作区位置：

```bash
# 进到希望放数据的目录
cd /path/to/your/ecommerce-workspace

# 写一个标记文件（也可加可选的 ECOMMERCE_WORKSPACE 环境变量）
ecommerce-stack init

# 验证：从任何子目录都能解析到工作区根
ecommerce-stack workspace
```

解析顺序（不变契约）：

1. 优先 `$ECOMMERCE_WORKSPACE` 环境变量
2. 兼容旧 `$ETSY_WORKSPACE` 环境变量
3. 否则从 cwd 向上找 `.ecommerce-workspace` 标记文件
4. 兼容旧 `.etsy-workspace` 标记文件
5. 都没有 → 命令退出非零，skill 会停下问用户而不是猜路径

工作区是 git 仓库时记得在 `.gitignore` 加 `.cache/`（用来放图片处理副本、趋势采集 evidence 等临时数据）。

## 定制与升级（skill-prefs）

skill 是**共享只读、会持续升级**的产品引擎，不为单个客户改动。客户要让某个 skill 贴合自己的习惯时，**不改 skill 本体、不 fork**，而是叠一层每客户隔离的覆盖：

- **品牌语气 / 店铺事实 / 平台规则** → `BRAND.md` / `SHOP.md` / `COMMERCE_PLATFORM.md`（用 `shop-foundation` 维护，被多个 skill 读取）。
- **某个 skill 的工作流 / 风格旋钮** → `<workspace>/skill-prefs/<skill-name>.md`（`ecommerce-stack init` 会建好这个目录）。
- **安全 / 合规 / QA 闸 / 写入确认** → 不可被覆盖。

因为覆盖层活在客户工作区、与引擎**物理分离**，`ecommerce-stack update` 只换引擎、不碰 `skill-prefs/`——**升级零冲突、零 merge**。失配的偏好会以 `⚠️ DEGRADE` 提示，`ecommerce-stack doctor` 也会体检工作区里的 skill-prefs。

> agent **不得**往 `~/.hermes/skills` / `~/.local/share/etsy-skills` 等共享技能目录写入或自建 skill（会污染全体客户、并在升级时冲突）。完整契约见 [`shared/skill-prefs.md`](shared/skill-prefs.md) 与 [`shared/preamble.md`](shared/preamble.md)。

## 升级

所有 skill 启动时都会静默检查更新（24h 缓存）。有新版本会在 agent 回复末尾追加一行：

> 💡 电商 skill stack 有新版本：v1.0.0 → v1.0.1（运行 `ecommerce-stack update` 升级；旧命令 `etsy-stack update` 仍可用）

主动操作：

```bash
ecommerce-stack check       # 立即检查（绕过缓存）
ecommerce-stack update      # 拉最新版本并刷新软链
ecommerce-stack version     # 当前版本
ecommerce-stack list        # 列出已安装 skill 的链接状态
ecommerce-stack ai-cleaner  # 查看 / 安装 AI 发布图清理工具
ecommerce-stack where       # 打印源码安装目录
ecommerce-stack workspace   # 解析当前电商工作区根
ecommerce-stack init [DIR]  # 在 DIR（默认 cwd）写 .ecommerce-workspace 标记
```

## 运行环境

- macOS（已在 Mac mini + bash 3.2 验证；Linux 应该也行没系统测过）
- [Hermes Agent](https://hermes-agent.nousresearch.com/)（runtime；本仓 SKILL.md 是给 Hermes 写的，**不是** Claude Code）
- [larksuite/cli](https://github.com/larksuite/cli) + 已登录的飞书账号
- `git` / `python3`（macOS 自带）
- `node` / `npm`（trend-radar 需要）
- Pinterest 发布依赖 yanggedianzhang 服务器控制面 + 现有浏览器插件；不再要求 Hermes/Mac mini 安装本地 Pinterest-autopin Playwright 工具
- 可选：[remove-ai-watermarks](https://github.com/wiltodelta/remove-ai-watermarks)（最终商品图 / listing 图片和社媒待发布图片才需要；必须安装在 Hermes Agent 实际运行的机器上，用 `ecommerce-stack ai-cleaner update` 安装）

## 自定义安装路径

| 环境变量 | 默认值 |
|---|---|
| `ECOMMERCE_SKILLS_HOME` | `~/.local/share/etsy-skills`（保留旧路径，避免升级断链） |
| `HERMES_SKILLS_DIR` | `~/.hermes/skills` |
| `ECOMMERCE_STACK_BIN` | `~/.local/bin` |
| `ECOMMERCE_SKILLS_REPO` | `https://github.com/easyaitech/etsy-skills.git` |
| `ECOMMERCE_SKILLS_REF` | `main`（推荐传具体 tag，例如 `v1.0.1`） |
| `ECOMMERCE_WORKSPACE` | 无；显式声明电商工作区根 |
| `PINTEREST_AUTOPIN_HOME` | 仅旧本地 Playwright 工具迁移排查使用；新 Pinterest 发布不读取 |
| `PINTEREST_AUTOPIN_REPO` | 仅旧本地 Playwright 工具迁移排查使用；新 Pinterest 发布不读取 |

旧变量 `ETSY_SKILLS_HOME` / `ETSY_STACK_BIN` / `ETSY_SKILLS_REPO` / `ETSY_SKILLS_REF` / `ETSY_WORKSPACE` 继续兼容。

## 仓库布局

```
.
├── etsy-stack.json            # bundle manifest（历史文件名保留）
├── install.sh                 # 一行安装入口
├── scripts/
│   ├── etsy-stack             # 管理 CLI（安装为 ecommerce-stack + etsy-stack）
│   └── check-update.sh        # 24h 缓存的更新检查
├── shared/                    # 所有 skill 共享的引导 / 协议 / 原则
│   ├── preamble.md            # 版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 技能目录写入禁令 / 工作语言
│   ├── dependency-protocol.md # 两层架构 + 三级降级协议
│   ├── tools-architecture.md  # 工具架构硬约束（Hermes 大脑 / ECS 控制面 / 浏览器插件）
│   ├── platform-config.md     # 销售平台配置契约
│   ├── skill-prefs.md         # 每客户 skill 覆盖层（升级不冲突）契约
│   ├── ethos.md               # 经营原则
│   └── ai-image-sanitization.md # 最终 listing / 社媒发布图的 AI metadata / watermark 清理协议
├── shop-foundation/           # ┐
├── listing-catalog/           # │ 基座层（Foundation）
├── orders-customers/          # │ 基座层平级，按需建立
├── logistics-tracking/        # │ 物流跟踪薄 skill（调后端 ECS track 服务）
├── supplier-foundation/       # │
├── business-knowledge/        # │ 可选业务记忆层
├── assets-library/            # ┘
├── publish-composer/        # ┐
├── social-publisher/          # │
├── pinterest-autopin/         # │ 应用层（Application）
├── xiaohongshu-autopost/      # │ 围绕基座层运行
├── image-brief/               # │ 图片方案设计（创意 brief owner）
├── image-synth/               # ┘
└── trend-radar/               #   Utility / Input 层（为基座层提供自动化数据输入）
```

每个 skill 目录里通常有 `SKILL.md`（Hermes 入口）+ `references/` / `templates/` / `assets/` / `scripts/` 四类子目录。

## License

未定。
