# Changelog

本项目使用 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.4] - 2026-05-05

`assets-library`：拆 dump → promote 双段流程，原片冷藏不进 Base、promoted 成品才进 Base。下游 `pinterest-autopin` / `listing-catalog` 跟着适配。背景与决策见 [`assets-library/REDESIGN.md`](assets-library/REDESIGN.md)。

### 重构
- `assets-library/SKILL.md`：模式 B 拆成 B1（dump 批量入冷藏，**不**录 Base）和 B2（promote 单条上货架，编辑成品 + 录 Base + BRAND 合规自检）；模式 B1 加 3 路决策树（整批 shoot / 已知 SKU / UGC）；模式 C 拆"找成品走 Base / 找原片走文件夹"；frontmatter description 重写
- `assets-library/references/asset-index-base-schema.md`：设计原则 4「录入即合规」→「**Promote 即合规**」；推荐视图（"待整理"→"待派渠道（用途未填）"）和录入约定段对齐 B2 promote
- `assets-library/references/folder-structure.md`：加"冷藏 vs 货架"小节 + 目录树注释 raw / edited 进 Base 状态；shoot-archive 改为 B1 dump 默认目的地
- `assets-library/references/naming-convention.md`：加"两阶段命名"段——dump 接受相机原始名，promote 强制按公式；改名时机段拆三档
- `assets-library/references/asset-types.md`：视觉合规自检章节改名"（B2 promote 时）"；RAW 段明确不进 Base；客户拍摄 row 加 B1/B2 流程注释
- `pinterest-autopin/SKILL.md`：模式 B 第 3 步加 4 路 fallback（在 Base ✅ / 缺 Pinterest 用途 / 未授权 / 不在 Base 反向触发 B2 promote）；硬性约束"未授权 UGC 一律拒绝"软化为指引走授权 / promote 流程
- `listing-catalog/references/base-schema.md`：加"反查素材：商品 Base ↔ 素材索引 Base"段——反向关联看到的是 promoted 成品，原片不在反查结果里要直接打开 raw/ 目录

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
- `listing-catalog` — 商品目录 Base + Etsy listing 文案
- `orders-customers` — 订单 / 客户双 Base + 客服 SOP
- `assets-library` — 飞书云空间素材库 + 索引 Base
- `pinterest-autopin` — Pin Queue Base + 外部 Pinterest 自动发布工具

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
