# etsy-skills

跨境 Etsy 店铺运营 skill bundle，跑在 [Hermes Agent](https://hermes-agent.nousresearch.com/) 上（Mac mini 本地），用 [larksuite/cli](https://github.com/larksuite/cli) 操作飞书 Base / 文档 / 云空间。

每个 skill 各管一摊：品牌底座、商品目录、订单客服、供应商管理、业务知识库、素材库、Pinterest 自动 pin、AI 图片合成、趋势热词采集（完整列表见下面 §Skills）。下游都引用 `BRAND.md` / `SHOP.md`，从 `shop-foundation` 开始建是推荐顺序。

## 安装

```bash
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.3.0/install.sh | bash
```

脚本会：
- clone 到 `~/.local/share/etsy-skills/`
- 把所有 skill 软链进 `~/.hermes/skills/`
- 把 `etsy-stack` CLI 装到 `~/.local/bin/`

谨慎模式（先看再跑）：

```bash
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.3.0/install.sh -o install.sh
less install.sh    # 自查一遍
bash install.sh
```

## Skills

| Skill | 干啥 |
|---|---|
| [`shop-foundation`](shop-foundation/SKILL.md) | 维护 BRAND.md（品牌原则）+ SHOP.md（店铺事实），整个 stack 的元基础 |
| [`listing-catalog`](listing-catalog/SKILL.md) | 飞书 Base 商品目录 + 撰写 Etsy listing 文案 |
| [`orders-customers`](orders-customers/SKILL.md) | 飞书 Base × 2（订单 + 客户）+ 客服 SOP + 客户标签 |
| [`supplier-foundation`](supplier-foundation/SKILL.md) | 飞书 Base 供应商管理 + 采购来源筛选、主用/备用/淘汰记录 |
| [`business-knowledge`](business-knowledge/SKILL.md) | 轻量业务知识库：每周材料 → raw / weekly / wiki markdown + Knowledge Cards Base + Marketing Brief |
| [`assets-library`](assets-library/SKILL.md) | 飞书云空间素材库（双层：六文件夹物理层 + 索引 Base 语义层，含 `营销/`）+ 拍前 shoot brief 生成（模式 D） |
| [`pinterest-autopin`](pinterest-autopin/SKILL.md) | Pin Queue Base + 调用 [Pinterest-autopin](https://github.com/easyaitech/Pinterest-autopin) 工具发 pin |
| [`image-synth`](image-synth/SKILL.md) | AI 图片合成（电商图 / 社媒图）：用 Hermes 自带生图能力把"图片需求 + 商品实拍图"合成成 1 张成品图，差异化 QA 闸门 + 入库走 assets-library |
| [`video-assembly`](video-assembly/SKILL.md) | 从已标记的视频片段库批量装配短视频，输出 Hook / Body / Close 结构的社媒视频 |
| [`trend-radar`](trend-radar/SKILL.md) | 每周自动采集 Google Trends / Pinterest Trends 热词，输出结构化 JSON 供 business-knowledge 消费 |

## 工作区初始化（首次使用必读）

stack 中所有 skill 都会把 BRAND.md / SHOP.md / Pinterest runtime 等数据落到统一的「工作区」。Hermes profile 隔离环境下 `$HOME` 不是系统用户 HOME，靠 `~/` 推路径会让数据落到 profile sandbox。**必须**显式声明工作区位置：

```bash
# 进到希望放数据的目录
cd /path/to/your/etsy-shop-workspace

# 写一个标记文件（也可加可选的 ETSY_WORKSPACE 环境变量）
etsy-stack init

# 验证：从任何子目录都能解析到工作区根
etsy-stack workspace
```

解析顺序（不变契约）：

1. 优先 `$ETSY_WORKSPACE` 环境变量
2. 否则从 cwd 向上找 `.etsy-workspace` 标记文件
3. 都没有 → 命令退出非零，skill 会停下问用户而不是猜路径

工作区是 git 仓库时记得在 `.gitignore` 加 `.cache/`（用来放 Pinterest-autopin runtime 等临时数据）。

## 升级

所有 skill 启动时都会静默检查更新（24h 缓存）。有新版本会在 agent 回复末尾追加一行：

> 💡 Etsy stack 有新版本：v0.1.0 → v0.3.0（运行 `etsy-stack update` 升级）

主动操作：

```bash
etsy-stack check       # 立即检查（绕过缓存）
etsy-stack update      # 拉最新版本并刷新软链
etsy-stack version     # 当前版本
etsy-stack list        # 列出已安装 skill 的链接状态
etsy-stack where       # 打印源码安装目录
etsy-stack workspace   # 解析当前 Etsy 工作区根
etsy-stack init [DIR]  # 在 DIR（默认 cwd）写 .etsy-workspace 标记
```

## 运行环境

- macOS（已在 Mac mini + bash 3.2 验证；Linux 应该也行没系统测过）
- [Hermes Agent](https://hermes-agent.nousresearch.com/)（runtime；本仓 SKILL.md 是给 Hermes 写的，**不是** Claude Code）
- [larksuite/cli](https://github.com/larksuite/cli) + 已登录的飞书账号
- `git` / `python3`（macOS 自带）
- `node` / `npm`（trend-radar 需要，用于 Playwright 浏览器自动化）
- 可选：[Pinterest-autopin](https://github.com/easyaitech/Pinterest-autopin)（用到 `pinterest-autopin` skill 时才装）

## 自定义安装路径

| 环境变量 | 默认值 |
|---|---|
| `ETSY_SKILLS_HOME` | `~/.local/share/etsy-skills` |
| `HERMES_SKILLS_DIR` | `~/.hermes/skills` |
| `ETSY_STACK_BIN` | `~/.local/bin` |
| `ETSY_SKILLS_REPO` | `https://github.com/easyaitech/etsy-skills.git` |
| `ETSY_SKILLS_REF` | `main`（推荐传具体 tag，例如 `v0.3.0`） |

## 仓库布局

```
.
├── etsy-stack.json            # bundle manifest
├── install.sh                 # 一行安装入口
├── scripts/
│   ├── etsy-stack             # 管理 CLI
│   └── check-update.sh        # 24h 缓存的更新检查
├── shared/                    # 所有 skill 共享的引导 / 协议 / 原则
│   ├── preamble.md            # 版本检查 / 工作区解析 / 写入约束 / 工作语言
│   ├── dependency-protocol.md # 两层架构 + 三级降级协议
│   └── ethos.md               # 经营原则
├── shop-foundation/           # ┐
├── listing-catalog/           # │ 基座层（Foundation）
├── orders-customers/          # │ 基座层平级，按需建立
├── supplier-foundation/       # │
├── business-knowledge/        # │ 可选业务记忆层
├── assets-library/            # ┘
├── pinterest-autopin/         # ┐ 应用层（Application）
├── image-synth/               # │ 围绕基座层运行
├── video-assembly/            # ┘ 围绕基座层运行
└── trend-radar/               #   Utility / Input 层（为基座层提供自动化数据输入）
```

每个 skill 目录里通常有 `SKILL.md`（Hermes 入口）+ `references/` / `templates/` / `assets/` / `scripts/` 四类子目录。

## License

未定。
