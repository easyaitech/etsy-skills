# ecommerce-skills

通用电商运营 skill bundle，跑在 [Hermes Agent](https://hermes-agent.nousresearch.com/) 上（Mac mini 本地），用 [larksuite/cli](https://github.com/larksuite/cli) 操作飞书 Base / 文档 / 云空间。

每个 skill 各管一摊：品牌底座、销售平台配置、商品目录、订单客服、供应商管理、业务知识库、素材库、社交媒体发布、Pinterest 自动 pin、AI 图片合成、趋势热词采集（完整列表见下面 §Skills）。默认数据架构是 **一个店铺 = 一个飞书多维表格 Base；一个业务对象 = Base 内一张表**，下游都引用 `BRAND.md` / `SHOP.md` / `COMMERCE_PLATFORM.md`，从 `shop-foundation` 开始建是推荐顺序。

仓库历史上叫 `etsy-skills`，Etsy 和小红书继续作为内置平台 preset。新的通用入口是 `ecommerce-stack`，旧命令 `etsy-stack` 保留兼容。

## 安装

```bash
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.3.0/install.sh | bash
```

脚本会：
- clone 到 `~/.local/share/etsy-skills/`
- 把所有 skill 软链进 `~/.hermes/skills/`
- 把 `ecommerce-stack` CLI 装到 `~/.local/bin/`，并保留 `etsy-stack` 兼容命令

谨慎模式（先看再跑）：

```bash
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.3.0/install.sh -o install.sh
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
| [`assets-library`](assets-library/SKILL.md) | 飞书云空间素材库（双层：六文件夹物理层 + 店铺总 Base 内 `Assets 素材池` 表，含 `营销/`）+ 拍前 shoot brief 生成（模式 D） |
| [`content-asset-pool`](content-asset-pool/SKILL.md) | 跨平台素材发布池：登记待发布图片/视频、生成发布副本、追踪 Pinterest / Instagram / 小红书 / TikTok / Etsy 等发布任务 |
| [`social-publisher`](social-publisher/SKILL.md) | 社交媒体自动发布总控层：从店铺总 Base 内 `社媒发布队列` 表读取待发任务，当前通过 Pinterest adapter 调用 `pinterest-autopin`，小红书等未来平台先做草稿 / 人工对账 |
| [`pinterest-autopin`](pinterest-autopin/SKILL.md) | `社媒发布队列` 表 `平台 = Pinterest` 行 + 调用本地 Pinterest-autopin 工具发 pin（用 `ecommerce-stack pinterest-tool status/update` 管理，旧命令兼容） |
| [`image-synth`](image-synth/SKILL.md) | AI 图片合成（电商图 / 社媒图）：用 Hermes 自带生图能力把"图片需求 + 商品实拍图"合成成 1 张成品图，差异化 QA 闸门 + 入库走 assets-library |
| [`video-assembly`](video-assembly/SKILL.md) | 从已标记的视频片段库批量装配短视频，输出 Hook / Body / Close 结构的社媒视频 |
| [`trend-radar`](trend-radar/SKILL.md) | 每周自动采集 Google Trends / Pinterest Trends / eRank Trend Buzz 热词，并生成趋势 × 店铺/品牌/商品的 fit report 供人工判断 |

## 工作区初始化（首次使用必读）

stack 中所有 skill 都会把 BRAND.md / SHOP.md / COMMERCE_PLATFORM.md / Pinterest runtime 等数据落到统一的「工作区」。Hermes profile 隔离环境下 `$HOME` 不是系统用户 HOME，靠 `~/` 推路径会让数据落到 profile sandbox。**必须**显式声明工作区位置：

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

工作区是 git 仓库时记得在 `.gitignore` 加 `.cache/`（用来放 Pinterest-autopin runtime 等临时数据）。

## 定制与升级（skill-prefs）

skill 是**共享只读、会持续升级**的产品引擎，不为单个客户改动。客户要让某个 skill 贴合自己的习惯时，**不改 skill 本体、不 fork**，而是叠一层每客户隔离的覆盖：

- **品牌语气 / 店铺事实 / 平台规则** → `BRAND.md` / `SHOP.md` / `COMMERCE_PLATFORM.md`（用 `shop-foundation` 维护，被多个 skill 读取）。
- **某个 skill 的工作流 / 风格旋钮** → `<workspace>/skill-prefs/<skill-name>.md`（`ecommerce-stack init` 会建好这个目录）。
- **安全 / 合规 / QA 闸 / 写入确认** → 不可被覆盖。

因为覆盖层活在客户工作区、与引擎**物理分离**，`ecommerce-stack update` 只换引擎、不碰 `skill-prefs/`——**升级零冲突、零 merge**。失配的偏好会以 `⚠️ DEGRADE` 提示，`ecommerce-stack doctor` 也会体检工作区里的 skill-prefs。

> agent **不得**往 `~/.hermes/skills` / `~/.local/share/etsy-skills` 等共享技能目录写入或自建 skill（会污染全体客户、并在升级时冲突）。完整契约见 [`shared/skill-prefs.md`](shared/skill-prefs.md) 与 [`shared/preamble.md`](shared/preamble.md)。

## 升级

所有 skill 启动时都会静默检查更新（24h 缓存）。有新版本会在 agent 回复末尾追加一行：

> 💡 电商 skill stack 有新版本：v0.1.0 → v0.3.0（运行 `ecommerce-stack update` 升级；旧命令 `etsy-stack update` 仍可用）

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
- 可选：Pinterest-autopin 发布工具（用到 `pinterest-autopin` skill 时才装；更新前用 `ecommerce-stack pinterest-tool status` 核实真实工具来源）
- 可选：[remove-ai-watermarks](https://github.com/wiltodelta/remove-ai-watermarks)（最终商品图 / listing 图片和社媒待发布图片才需要；必须安装在 Hermes Agent 实际运行的机器上，用 `ecommerce-stack ai-cleaner update` 安装）

## 自定义安装路径

| 环境变量 | 默认值 |
|---|---|
| `ECOMMERCE_SKILLS_HOME` | `~/.local/share/etsy-skills`（保留旧路径，避免升级断链） |
| `HERMES_SKILLS_DIR` | `~/.hermes/skills` |
| `ECOMMERCE_STACK_BIN` | `~/.local/bin` |
| `ECOMMERCE_SKILLS_REPO` | `https://github.com/easyaitech/etsy-skills.git` |
| `ECOMMERCE_SKILLS_REF` | `main`（推荐传具体 tag，例如 `v0.3.0`） |
| `ECOMMERCE_WORKSPACE` | 无；显式声明电商工作区根 |
| `PINTEREST_AUTOPIN_HOME` | `~/code/etsy-skills/tools/Pinterest-autopin` |
| `PINTEREST_AUTOPIN_REPO` | 空；安装或改源底层发布工具时必须显式指定 |

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
├── content-asset-pool/        # ┐
├── social-publisher/          # │
├── pinterest-autopin/         # │ 应用层（Application）
├── image-synth/               # │ 围绕基座层运行
├── video-assembly/            # ┘ 围绕基座层运行
└── trend-radar/               #   Utility / Input 层（为基座层提供自动化数据输入）
```

每个 skill 目录里通常有 `SKILL.md`（Hermes 入口）+ `references/` / `templates/` / `assets/` / `scripts/` 四类子目录。

## License

未定。
