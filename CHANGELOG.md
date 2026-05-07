# Changelog

本项目使用 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.2.0] - 2026-05-07

`assets-library`：加模式 D plan（拍前出 shoot brief）。现状是模式 A 建库 / B1 dump / B2 promote / C 查找 — 接到原料前的"决定拍什么"是空白。摄影没 brief 上手就拍 = 50 张里只有 5-10 张能用，关键 Etsy 槽位（hero / scale / packaging / size chart）经常忘拍要补拍。模式 D 在拍前给 SKU 出一份 markdown shoot brief，落 `1. 摄影/by-SKU/{SKU}/shoot-brief.md`，按 stack 同构范式「输入 → 词库 → 文案」组装：输入 = SKU 行 + BRAND.md + listing-catalog 礼物词库；词库 = Etsy 10 槽位社区 SOP（独立 reference）；文案 = 三段式 brief（A 槽位映射 / B Mood / C 镜头清单）。

### 新增
- `assets-library/PLAN-MODE.md`：模式 D 设计 doc（Approved，前置 office-hours 会话 2026-05-07，reviewer x2 = 6/10 → 8/10 PASS）
- `assets-library/references/etsy-listing-photo-slots.md`：Etsy 10 槽位社区 SOP；首段警示"平台只规定 10 张图，槽位无平台语义"；P0/P1/P2/P3 优先级定义；与素材索引 Base "用途标签"字段对齐的槽位 ID 词汇表（hero / variation / scale / size-chart / detail / lifestyle / packaging / brand-story / context / comparison）；PR1 仅做通用 SOP，按品类细化留 v2
- `assets-library/references/shoot-brief-template.md`：三段式 brief 模板骨架 + 填写指引（A/B/C/D/E + References 段；BRAND 缺失降级为 ⚠️ 占位；老 SKU 部分跑只填缺位行）

### 修
- `assets-library/SKILL.md`：description "三种触发 → 四种触发"加模式 D；"对外接口"段补"商品 Base"；"依赖关系"表补 BRAND.md 视觉禁区段、SHOP.md § 物料、商品 Base SKU 行字段、listing-catalog 礼物词库；"三种执行模式 → 四种执行模式"；加模式 D 章节（10 步执行 + 部分跑分支 + 9a 逐层建目录 + 输入降级表 + 关键约束）；"与其他 skill 的协作"补 listing-catalog 礼物词库消费路径
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
