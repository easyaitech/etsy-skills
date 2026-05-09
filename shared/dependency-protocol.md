# 依赖降级协议

## Stack 两层架构

```
┌──────────────────────────────────────────────────┐
│              应用层（Application）                 │
│   pinterest-autopin    image-synth    (未来...)    │
└─────────────────────┬────────────────────────────┘
                      │ 依赖
┌─────────────────────┴────────────────────────────┐
│              基座层（Foundation）                   │
│                                                   │
│  shop-foundation     listing-catalog              │
│  assets-library      orders-customers             │
│                                                   │
│  四个平级，缺一不可。不分先后顺序。                  │
│  所有应用层 skill 围绕这四个基座运行。               │
└───────────────────────────────────────────────────┘
```

### 基座层

| Skill | 管什么 |
|---|---|
| shop-foundation | 品牌原则 + 店铺事实 + 营销策略 + 平台策略（四份 .md 基座文件） |
| listing-catalog | 商品目录（飞书 Base）+ listing 文案 |
| assets-library | 视觉与素材资产（飞书云空间 + 素材索引 Base） |
| orders-customers | 订单 + 客户（飞书 Base × 2）+ 客服 SOP |

四个基座 skill 之间有协作（如 assets-library 读商品 Base、orders-customers 读 BRAND.md），但**不存在启动先后顺序**——哪个先建视用户业务需求而定。

### 应用层

围绕基座层运行，从基座取数据、用基座的规则约束输出。当前：
- `pinterest-autopin`：取商品 + 素材 + 品牌 → 组 pin 发布
- `image-synth`：取品牌视觉 + 商品信息 → AI 合成图

未来的推广、CRM 等 skill 同样围绕四个基座运行。

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

| 依赖 \ Skill | listing-catalog | orders-customers | assets-library | pinterest-autopin | image-synth |
|---|---|---|---|---|---|
| BRAND.md | 写文案=**BLOCK**；查改=SKIP | 客服=**BLOCK**；录入=SKIP | B2=**DEGRADE**；D=**DEGRADE** | 组 pin=**BLOCK** | **DEGRADE** |
| SHOP.md | 写文案=**BLOCK** | 客服=**BLOCK** | D=SKIP | 组 pin=**BLOCK** | SKIP |
| BRAND_MARKETING.md | — | — | — | 组 pin=SKIP | — |
| MARKETING_PLATFORM.md | — | — | — | 组 pin=SKIP | — |
| 商品 Base | 写文案=**BLOCK** | 录入=SKIP | D=**BLOCK** | 组 pin=**BLOCK** | SKIP |
| 素材索引 Base | — | — | B2=**BLOCK**；C=SKIP | 组 pin=**DEGRADE** | SKIP |
| 订单 Base | — | 录入=**BLOCK** | SKIP | — | — |
| 客户 Base | — | 客服=**BLOCK** | SKIP | — | — |
| Pin Queue Base | — | — | — | 发 pin=**BLOCK** | — |
