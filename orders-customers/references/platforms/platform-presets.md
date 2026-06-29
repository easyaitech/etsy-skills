# 平台 preset 架构（订单 / 客服 / 履约）

> 这个 skill 的核心流程（`SKILL.md` / `order-handling.md` / `order-fulfillment-sop.md` / `base-schema.md` 的通用字段 / `customer-tags.md`）是**平台中性**的。任何"这个平台特有"的东西——买家语言、订单号 / 买家标识怎么解析、承诺发货时间从哪取、消息 / 售后入口、媒体限制、平台专属字段、价值标签阈值——都**不写进核心流程**，而是放进**该平台自己的 preset 文件** `references/platforms/<platform>.md`。

核心流程负责"对任何平台都一样的部分"；preset 负责"这个平台不一样的部分"。Etsy 不是隐性默认平台——它和小红书、亚马逊一样，只是一个 preset。

---

## 内置 preset

| 平台 | preset 文件 | 买家语言默认 | 履约单元 |
|---|---|---|---|
| Etsy | [`etsy.md`](etsy.md) | 英文 | 订单 |
| 小红书 / 小红书店铺 / RED | [`xiaohongshu.md`](xiaohongshu.md) | 中文 | 包裹 |

其他平台（亚马逊 / Shopify / 淘宝 / 天猫 / 抖店等）目前**没有内置 preset**：必须先在 `COMMERCE_PLATFORM.md` 配置该平台，并按下面的契约新增对应 preset 文件，才能跑订单 / 客服 / 履约。缺失时按 `../../../shared/dependency-protocol.md` 走 **BLOCK**——停下引导用户先建配置，不要拿 Etsy / 小红书规则硬套。

---

## preset 解析（每次任务开始时）

1. 读 `COMMERCE_PLATFORM.md` 的「目标销售平台」（多平台并行时先和用户确认这次处理哪个平台）。
2. 把平台值映射到 preset 文件：Etsy → `etsy.md`；小红书 → `xiaohongshu.md`；其他 → `references/platforms/<platform>.md`（存在才用）。
3. preset 缺失：
   - 平台是 Etsy / 小红书 → 用内置 preset，并说明"这次按内置 {平台} 规则跑；建议后续用 `shop-foundation` 把 `COMMERCE_PLATFORM.md` 固化"。
   - 平台不是 Etsy / 小红书 → **BLOCK**，引导用户先建 `COMMERCE_PLATFORM.md` + 该平台 preset。
4. 读到的 preset 优先级**高于**核心流程里的中性默认；但 preset **不得**豁免 `shared/preamble.md` §写入前的通用约束、隐私红线和"不替用户操作平台"边界。

---

## 一个 preset 必须定义的内容（契约）

新平台 preset 照这 12 项写，核心流程才能在不改动的前提下跑这个平台：

| # | 契约项 | 说明 |
|---|---|---|
| 1 | **平台标识 / 别名** | 与 `COMMERCE_PLATFORM.md`「销售平台」取值对齐的名字和常见别名 |
| 2 | **买家语言（默认）** | 面向买家输出的默认语言；最终以 `COMMERCE_PLATFORM.md`「买家语言」为准 |
| 3 | **履约单元** | 订单 / 包裹 / 其他；决定 `Orders 订单` 表按什么粒度建行 |
| 4 | **平台专属字段组** | 该平台要在 `base-schema.md` 通用字段外加建的字段组（组名以平台前缀命名，如 `小红书…`）；没有结构化字段就用通用 `平台字段 JSON` 兜底 |
| 5 | **订单号 / 买家标识解析规则** | 平台订单号、buyer id、用户名怎么取；**禁止**把别的平台字段名（Etsy username、Etsy order number 等）套过来 |
| 6 | **承诺发货时间来源** | 从哪个平台字段提取 `承诺发货日`（Etsy `Ship by`；小红书 `promiseLastDeliveryTime`；亚马逊 ship-by / handling time 等）|
| 7 | **买家消息 / 客服 / 售后入口与边界** | 平台消息渠道、售后链路、哪些动作不能代操作；以 `COMMERCE_PLATFORM.md` 为准，preset 给默认 |
| 8 | **消息媒体限制** | 例如某些平台消息不支持直接发视频 / 图片张数上限 |
| 9 | **隐私 / 地址处理特例** | 完整地址 / 电话默认不进 Base 的口径；该平台特有的脱敏要求 |
| 10 | **价值标签阈值** | `customer-tags.md` 的 `VIP` 金额阈值（含币种）、`品牌相符` 长评阈值（含语言）在这里给平台默认值；如果客户表 `累计金额` 使用 `总金额(核算币种)` 汇总，使用前必须把本阈值折算到同一核算币种 |
| 11 | **自动化边界** | 该平台下本 skill 明确不替用户做的真实动作（发消息 / 发货 / 退款 / 售后审核等）|
| 12 | **平台专属视图（可选）** | 该平台特有的异常 / 履约监控视图（如小红书的 `小红书异常`）。启用该平台时**追加**到 `base-schema.md` §视图建议，与平台字段组一起建；通用视图（`待发货` / `临期/超期待发` / `待签收跟进` 等）对所有平台共用，不在此列 |

---

## 加一个新平台（以亚马逊为例）

不改**流程逻辑文件**（`SKILL.md` / `order-handling.md` / `order-fulfillment-sop.md`）；`base-schema.md` 是唯一按平台增长的核心文件——只在它的「平台专属字段组 / 平台专属视图」追加内容，通用字段与通用视图不动：

1. 用 `shop-foundation` 在 `COMMERCE_PLATFORM.md` 里把「亚马逊」加进销售平台，配齐买家语言、消息 / 售后边界、自动化边界。
2. 新建 `references/platforms/amazon.md`，按上面 12 项契约写满。
3. 如果亚马逊有值得结构化的订单字段（FBA / MCF、ship-by、买家无邮箱的匿名地址等），在 `base-schema.md` 的「平台专属字段组」追加一个 `亚马逊…` 字段组（暂不细化就先用通用 `平台字段 JSON`）；如该平台有专属异常 / 监控视图（契约 #12），同时在 `base-schema.md` §视图建议追加 `亚马逊异常` 类视图。
4. 不需要改 `SKILL.md` / `order-handling.md` / `order-fulfillment-sop.md`——它们读 preset，不写死平台。

> 维护提醒：新 preset 属于"对所有客户通用的能力"，按 `shared/preamble.md` §技能目录写入禁令，应走 git 进仓库，不在客户工作区就地落盘。
