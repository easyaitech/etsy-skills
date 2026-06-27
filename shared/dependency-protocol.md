# 依赖降级协议

## Stack 两层架构

```
┌──────────────────────────────────────────────────┐
│              应用层（Application）                 │
│ image-brief      image-synth                     │
│ publish-composer social-publisher              │
│ pinterest-autopin xiaohongshu-autopost           │
│ (未来...)                                         │
└─────────────────────┬────────────────────────────┘
                      │ 依赖
┌─────────────────────┴────────────────────────────┐
│              基座层（Foundation）                   │
│                                                   │
│  shop-foundation     listing-catalog              │
│  assets-library      orders-customers             │
│  supplier-foundation business-knowledge           │
│                                                   │
│  基座平级，按业务需要建立。不分先后顺序。             │
│  所有应用层 skill 围绕这些基座运行。                 │
└───────────────────────────────────────────────────┘
```

### 基座层

| Skill | 管什么 |
|---|---|
| shop-foundation | 品牌原则 + 店铺事实 + 营销策略 + 平台策略（四份 .md 基座文件） |
| listing-catalog | 店铺总 Base 内商品表 + listing 文案 |
| assets-library | 视觉与素材资产（飞书云空间 + `Assets 素材池` 表） |
| orders-customers | 店铺总 Base 内订单 / 客户表 + 客服 SOP |
| supplier-foundation | 店铺总 Base 内供应商表 |
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
- `xiaohongshu-autopost`：小红书 adapter（**staged 未对外开放**）；取 社媒发布队列（`平台 = 小红书` 行）+ 商品 + 变体 + 品牌 → 组笔记草稿 + 人工清单。后端 + 契约就绪，放行后改 enabled 才走 server test → confirm-publish → final

未来的推广、CRM 等 skill 同样围绕基座层运行。

---

## 三级降级协议

当 skill 的依赖项缺失时，按以下三个等级处理：

| 等级 | 语义 | Agent 行为 |
|------|------|-----------|
| **BLOCK** | 缺了不能跑 | 停下告诉用户缺什么 + 引导去对应基座 skill 建立。不替代、不猜测、不跳过 |
| **DEGRADE** | 能跑但质量受损 | 相关输出段标 `⚠️ {依赖名} 未建立——{影响说明}`，继续执行其余步骤。回复末尾提示用户补建 |
| **SKIP** | 缺了跳过 | 静默跳过该输入源，不提示。缺失不影响核心输出 |

### 使用规则

1. 每个 skill 在自己的「依赖关系」表里标明每项依赖的降级等级
2. 同一依赖在不同模式下可以不同等级（如 BRAND.md 在"写 listing"时 BLOCK，在"查 SKU"时 SKIP）
3. BLOCK 等级的依赖缺失时，**引导用户去对应基座 skill 建立**，不要越界代建（职责边界）
4. DEGRADE 提示**只说一次**；用户说"以后再说"不反复催

---

## 基座文件降级速查

下表列出各 skill 对基座文件的依赖等级（按模式区分）。具体用法见各 skill 的「依赖关系」节。

| 依赖 \ Skill | listing-catalog | orders-customers | supplier-foundation | business-knowledge | assets-library | publish-composer | social-publisher | pinterest-autopin | image-synth |
|---|---|---|---|---|---|---|---|---|---|
| BRAND.md | 写文案=**BLOCK**；查改=SKIP | 客服=**BLOCK**；录入=SKIP | SKIP | brief=**DEGRADE** | B2=**DEGRADE**；D=**DEGRADE** | SKIP | SKIP | 组 pin=**BLOCK** | **DEGRADE** |
| SHOP.md | 写文案=**BLOCK** | 客服=**BLOCK** | 建库=**BLOCK**；现有链接=SKIP | 建知识卡片表=**BLOCK**；brief=**DEGRADE** | D=SKIP | 建表=**BLOCK** | 发布表定位=**BLOCK** | 组 pin=**BLOCK** | SKIP |
| BRAND_MARKETING.md | — | — | — | brief=**DEGRADE** | — | SKIP | SKIP | 组 pin=SKIP | — |
| MARKETING_PLATFORM.md | — | — | — | brief=**DEGRADE** | — | 建任务=**DEGRADE** | SKIP | 组 pin=SKIP | — |
| `Knowledge Cards 知识卡片` 表 | SKIP | SKIP | SKIP | 写卡片=**BLOCK**；读卡片=SKIP | SKIP | SKIP | SKIP | SKIP | SKIP |
| `Products 商品` 表 | 写文案=**BLOCK** | 录入=SKIP | 有 SKU 上下文时=SKIP | brief=SKIP | D=**BLOCK** | 商品型任务=**BLOCK** | SKIP | 组 pin=**BLOCK** | SKIP |
| `Suppliers 供应商` 表 | — | — | 录入/选型=**BLOCK** | SKIP | SKIP | SKIP | SKIP | — | — |
| `Assets 素材池` 表（基础素材字段） | — | — | — | SKIP | B2=**BLOCK**；C=SKIP | 入队=**DEGRADE** | SKIP | 组 pin=**DEGRADE** | SKIP |
| `Assets 素材池` 表（发布副本字段） | — | — | — | SKIP | SKIP | 建池/入队=**BLOCK** | 发布校验=**BLOCK** | SKIP | SKIP |
| `社媒发布队列` 表 | — | — | — | SKIP | SKIP | 建任务=**BLOCK** | 发布=**BLOCK** | 发 pin=**BLOCK** | SKIP |
| `Orders 订单` 表 | — | 录入=**BLOCK** | — | SKIP | SKIP | SKIP | SKIP | — | — |
| `Customers 客户` 表 | — | 客服=**BLOCK** | — | SKIP | SKIP | SKIP | SKIP | — | — |
