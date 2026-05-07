# etsy-skills

跨境 Etsy 店铺运营 skill bundle，跑在 [Hermes Agent](https://hermes-agent.nousresearch.com/) 上（Mac mini 本地），用 [larksuite/cli](https://github.com/larksuite/cli) 操作飞书 Base / 文档 / 云空间。

5 个 skill 各管一摊：品牌底座、商品目录、订单客服、素材库、Pinterest 自动 pin。下游都引用 `BRAND.md` / `SHOP.md`，从 `shop-foundation` 开始建是推荐顺序。

## 安装

```bash
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.6/install.sh | bash
```

脚本会：
- clone 到 `~/.local/share/etsy-skills/`
- 把 5 个 skill 软链进 `~/.hermes/skills/`
- 把 `etsy-stack` CLI 装到 `~/.local/bin/`

谨慎模式（先看再跑）：

```bash
curl -fsSL https://raw.githubusercontent.com/easyaitech/etsy-skills/v0.1.6/install.sh -o install.sh
less install.sh    # 自查一遍
bash install.sh
```

## Skills

| Skill | 干啥 |
|---|---|
| [`shop-foundation`](shop-foundation/SKILL.md) | 维护 BRAND.md（品牌原则）+ SHOP.md（店铺事实），整个 stack 的元基础 |
| [`listing-catalog`](listing-catalog/SKILL.md) | 飞书 Base 商品目录 + 撰写 Etsy listing 文案 |
| [`orders-customers`](orders-customers/SKILL.md) | 飞书 Base × 2（订单 + 客户）+ 客服 SOP + 客户标签 |
| [`assets-library`](assets-library/SKILL.md) | 飞书云空间素材库（双层：文件夹物理层 + 索引 Base 语义层） |
| [`pinterest-autopin`](pinterest-autopin/SKILL.md) | Pin Queue Base + 调用 [Pinterest-autopin](https://github.com/easyaitech/Pinterest-autopin) 工具发 pin |

## 升级

5 个 skill 启动时都会静默检查更新（24h 缓存）。有新版本会在 agent 回复末尾追加一行：

> 💡 Etsy stack 有新版本：v0.1.0 → v0.2.0（运行 `etsy-stack update` 升级）

主动操作：

```bash
etsy-stack check    # 立即检查（绕过缓存）
etsy-stack update   # 拉最新版本并刷新软链
etsy-stack version  # 当前版本
etsy-stack list     # 看 5 个 skill 的链接状态
etsy-stack where    # 打印源码安装目录
```

## 运行环境

- macOS（已在 Mac mini + bash 3.2 验证；Linux 应该也行没系统测过）
- [Hermes Agent](https://hermes-agent.nousresearch.com/)（runtime；本仓 SKILL.md 是给 Hermes 写的，**不是** Claude Code）
- [larksuite/cli](https://github.com/larksuite/cli) + 已登录的飞书账号
- `git` / `python3`（macOS 自带）
- 可选：[Pinterest-autopin](https://github.com/easyaitech/Pinterest-autopin)（用到 `pinterest-autopin` skill 时才装）

## 自定义安装路径

| 环境变量 | 默认值 |
|---|---|
| `ETSY_SKILLS_HOME` | `~/.local/share/etsy-skills` |
| `HERMES_SKILLS_DIR` | `~/.hermes/skills` |
| `ETSY_STACK_BIN` | `~/.local/bin` |
| `ETSY_SKILLS_REPO` | `https://github.com/easyaitech/etsy-skills.git` |
| `ETSY_SKILLS_REF` | `main`（推荐传具体 tag，例如 `v0.1.6`） |

## 仓库布局

```
.
├── etsy-stack.json            # bundle manifest
├── install.sh                 # 一行安装入口
├── scripts/
│   ├── etsy-stack             # 管理 CLI
│   └── check-update.sh        # 24h 缓存的更新检查
├── shop-foundation/           # ┐
├── listing-catalog/           # │
├── orders-customers/          # ├ 5 个 skill，各自独立目录
├── assets-library/            # │
└── pinterest-autopin/         # ┘
```

每个 skill 目录里通常有 `SKILL.md`（Hermes 入口）+ `references/` / `templates/` / `assets/` / `scripts/` 四类子目录。

## License

未定。
