# 依赖降级协议

## Stack 三层架构(layer 契约)

每个 SKILL.md 的 frontmatter 必须带 `layer`,取值 ∈ `foundation | application | utility-input`(词汇定义见根目录 `CONTEXT.md`),由 [`scripts/validate-frontmatter.py`](../scripts/validate-frontmatter.py) 在 CI 强制。

```text
┌──────────────────────────────────────────────────┐
│              应用层(Application)                  │
│ image-brief        image-synth                   │
│ publish-composer   social-publisher              │
│ pinterest-autopin  xiaohongshu-autopost(封存)     │
│ publish-metrics    logistics-tracking            │
└─────────────────────┬────────────────────────────┘
                      │ 依赖
┌─────────────────────┴────────────────────────────┐
│              基座层(Foundation)                    │
│                                                   │
│  shop-foundation     listing-catalog              │
│  assets-library      orders-customers             │
│  supplier-foundation business-knowledge           │
│  inventory                                        │
│                                                   │
│  基座平级,按业务需要建立。不分先后顺序。             │
│  所有应用层 skill 围绕这些基座运行。                 │
└───────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────┐
│           工具输入层(Utility-input)                │
│                                                   │
│  trend-radar:只为基座层提供自动化外部输入           │
│  (热词采集与 fit report),不围绕基座编排业务流程     │
└───────────────────────────────────────────────────┘
```

### 基座层

| Skill | 管什么 |
|---|---|
| shop-foundation | 品牌原则 + 店铺事实 + 营销策略 + 内容平台策略（四份 .md 基座文件；销售平台固定 Etsy，规则走内置 preset，见 `shared/platform-config.md`） |
| listing-catalog | 店铺总 Base 内商品表 + listing 文案 |
| assets-library | 视觉与素材资产（飞书云空间 + `Assets 素材池` / `Asset Variants 派生素材` 表） |
| orders-customers | 店铺总 Base 内订单 / 客户表 + 客服 SOP |
| supplier-foundation | 店铺总 Base 内供应商表 |
| inventory | 店铺总 Base 内实物库存两张表（`Inventory 库存品` + `Inventory Ledger 库存流水`） |
| business-knowledge | 业务知识库（raw / weekly / wiki / briefs markdown + `Knowledge Cards 知识卡片` 表），optional memory foundation |

基座 skill 之间有协作（如 assets-library 读店铺总 Base 的 SKU 表、orders-customers 读 BRAND.md、supplier-foundation 服务物料采购、business-knowledge 提供可选业务记忆），但**不存在启动先后顺序**——哪个先建视用户业务需求而定。

`business-knowledge` 是 optional memory foundation：下游引用它时默认 `SKIP`，缺失不阻塞原流程。

### 应用层

围绕基座层运行，从基座取数据、用基座的规则约束输出。当前：
- `image-brief`：取商品 + 品牌 + 礼物词库 + 平台规则 → 出平台感知图片创意 brief，分叉到拍摄 / image-synth / 已有素材
- `image-synth`：取 image-brief 的 brief + 品牌视觉 + 商品实拍图 → AI 合成图
- `publish-composer`：取 assets-library 变体 + 商品 + 平台策略 → 组跨平台发布意图 PublishIntent，拥有 `社媒发布队列`（只引用变体，不收集/清理/裁切）
- `social-publisher`（薄触发）：管 adapter registry + 人工/按需发布 + confirm-publish 人工闸 + 对账。自动发布的巡检/锁/重试/死信归 ECS dispatch（yanggedianzhang publish dispatch，T5），不在本 skill
- `pinterest-autopin`：Pinterest adapter；取 社媒发布队列（`平台 = Pinterest` 行）+ 商品 + 素材 + 品牌 → 组 pin 发布
- `xiaohongshu-autopost`：小红书 adapter（**封存 shelved**，判据 = adapter-registry 状态列；决策见 `docs/adr/0001`）
- `publish-metrics`（反馈层）：读已发 PublishIntent → 回写表现 metrics（曝光/点击/保存/转化）→ 按变体/文案/SKU/平台聚合复盘喂回 publish-composer。只读结果 + 写 metrics 列，不碰内容/执行状态列
- `logistics-tracking`：物流跟踪薄 skill——调后端 ECS track 服务查/录跨境物流，运营者确认后按 orders-customers 的 schema 回写 `Orders 订单` 表

未来的推广、CRM 等 skill 同样围绕基座层运行。

### 工具输入层

不为业务流程编排负责，只把外部世界自动化地搬进基座可消费的形态：
- `trend-radar`：从 ECS trend-radar 服务拉取管理员采集插件已采的热词，生成 fit report 供人工判断；客观趋势可沉淀进 business-knowledge

---

## 三级降级协议

当 skill 的依赖项缺失时，按以下三个等级处理：

| 等级 | 语义 | Agent 行为 |
|------|------|-----------|
| **BLOCK** | 缺了不能跑 | 停下告诉用户缺什么 + 引导去对应基座 skill 建立。不替代、不猜测、不跳过 |
| **DEGRADE** | 能跑但质量受损 | 相关输出段标 `⚠️ {依赖名} 未建立——{影响说明}`，继续执行其余步骤。回复末尾提示用户补建 |
| **SKIP** | 缺了跳过 | 静默跳过该输入源，不提示。缺失不影响核心输出 |

### 使用规则

1. **降级信息的唯一真源 = 各 skill 自己的「依赖关系」表**（每项标明按模式的 BLOCK / DEGRADE / SKIP 等级）。本文件只维护协议本身，**不维护跨 skill 汇总矩阵**——汇总矩阵必然与各 skill 的表漂移，已删除。维护者要总览时跑 `python3 scripts/deps-overview.py`（读 frontmatter 按需打印，不落盘）。
2. 同一依赖在不同模式下可以不同等级（如 BRAND.md 在"写 listing"时 BLOCK，在"查 SKU"时 SKIP）
3. BLOCK 等级的依赖缺失时，**引导用户去对应基座 skill 建立**，不要越界代建（职责边界）
4. DEGRADE 提示**只说一次**；用户说"以后再说"不反复催
5. 应用层 / 工具输入层 skill 必须自带「依赖关系」表；新增 skill 时 frontmatter `layer` 必填，CI 校验
