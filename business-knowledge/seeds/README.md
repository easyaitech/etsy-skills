# Knowledge Seeds（知识种子）

> 本文件是种子机制的**实现说明**；「怎么发 / 怎么拿 / 冲突怎么算」的架构不变量见 [`knowledge-seeds.md`](knowledge-seeds.md)。

公共包发出的**起步方法论知识**。引擎只读发布；`ecommerce-stack init` 把每个种子拷进租户 workspace 的 `knowledge/wiki/`，**拷完归租户、随便改**。

种子是平台 preset 的方法论同构：平台 preset「引用 live」，种子「拷贝即拥有」。运行时永远两层（公共引擎 / 租户 workspace），种子拷进来后就是租户个性化的一部分，零 override 语义、零 drift。

> 设计与决策见 `[[project_two_layer_seeds]]` 记忆 + `shared/skill-prefs.md`（红线表）。

## 一个种子 = wiki + 内嵌 card-spec

每个种子 `.md` 的 YAML frontmatter 既是 wiki 元数据，也是配套 **Knowledge Card 规格**（`卡片类型 / 标题 / 适用场景 / 关键词标签 / 建议动作 / 禁用场景 / applicability`）。

- `init` 只拷本地 wiki 文件 + 写 provenance ledger（`knowledge/.seeds.json`）。**不写飞书 Base**——Base 写入要走 `business-knowledge`（diff 预览 + 用户确认）。
- 卡的 Base 登记由 `business-knowledge` 负责：它发现 workspace 里有带 `卡片类型: 方法论` frontmatter、尚未登记的种子 wiki 时，按 card-spec 提议建卡（`知识页链接` 指向该 wiki）。**登记后 listing lookup 才能从卡片入口找到它**——这是种子可达的前提。

## manifest.json

| 字段 | 说明 |
|---|---|
| `seed_id` | 稳定 ID（改名/删除靠它，不靠文件名） |
| `seed_hash` | 发布时 wiki 内容 `sha256`，写进租户 ledger 做 provenance（未改 vs 已改） |
| `applicability` | `platform/locale/scope`——防新租户把起步种子当通用真理 |
| `installs_to` | 拷进 workspace 的相对路径 |
| `debrand_denylist` | 去品牌化护栏的 grep 地板（品牌/SKU/owner 标识符） |

## 去品牌化审查（作者必读 — grep 是地板，不是全部）

种子会被**所有新租户**拷走，残留品牌内容会污染全体。发布/改动种子前：

**1. 自动地板（CI/doctor 跑）**：`debrand_denylist` 里的串不得出现在任何种子 `.md`。
```bash
ecommerce-stack doctor   # 含去品牌 grep；命中即非零退出
```

**2. 人工 checklist（grep 抓不到的，作者逐条过）**：
- [ ] 没有具体店铺名 / 品牌别名（含中文别名、缩写、谐音）。
- [ ] 没有真实 SKU 编号、产品专属型号。
- [ ] 示例是**通用占位品类**，不是某店铺的主营品类（不要让种子只对「某一类货」成立）。
- [ ] 没有店铺专属客户口吻、签名、话术模板。
- [ ] 案例结构里没有藏「只有这家店成立」的假设（供应链、定价区间、客群画像）。
- [ ] `applicability` 如实标了 platform/locale/scope，方法论不通用就写清边界。
- [ ] 顶部有「起步种子、非圣经、请按自己情况改」的提示。

denylist 只增不删；发现新的品牌泄漏串就补进 `manifest.json`。
