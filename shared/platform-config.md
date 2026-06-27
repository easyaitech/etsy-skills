# 电商平台配置契约

平台差异只放在工作区的 `COMMERCE_PLATFORM.md`，不要散落进各个 skill。Skill 只负责通用流程：盘点输入、生成草稿、写入 Base、准备素材、等待确认；平台配置负责回答“这个平台要求什么”。

## 读取顺序

1. 先解析工作区根：`ecommerce-stack workspace`（旧命令 `etsy-stack workspace` 兼容）。
2. 读取 `<workspace>/COMMERCE_PLATFORM.md`。
3. 如果文件缺失：
   - 目标平台是 Etsy 或小红书，允许按仓库内对应 preset 继续，但要说明这是内置平台规则。
   - 目标平台不是 Etsy / 小红书，停止并引导用户先用 `shop-foundation` 建立或补齐 `COMMERCE_PLATFORM.md`，不要编造平台规则。

## 必填配置

每个平台至少要有这些字段：

| 字段 | 用途 |
|---|---|
| 平台名 | 如 Etsy、Amazon、Shopify、淘宝、天猫、小红书店铺、抖店 |
| 市场 / 国家地区 | 决定语言、货币、物流、节假日和合规提示 |
| 买家语言 | 决定 title / description / 客服回复输出语言 |
| 货币 | 决定价格字段和展示口径 |
| 商品 ID 字段 | 如 Etsy Listing ID、ASIN、handle、item_id |
| 商品链接字段 | 通常统一落 `Products 商品` 表的 `分享链接` |
| 发布方式 | 手动复制、平台后台、开放 API、第三方 ERP、暂不发布 |
| 自动化边界 | 哪些动作禁止 agent 代操作，例如付款、真实上架、发买家消息 |

## 平台规则

把会影响输出的硬规则写清楚：

| 规则 | 示例 |
|---|---|
| 标题 | 最大长度、语言、是否允许符号 / emoji、关键词顺序 |
| 描述 | 结构、必备政策段、禁用承诺、是否需要双语 |
| 关键词 / 标签 | 数量、长度、分隔符、是否有后台固定枚举 |
| 属性 / 类目 | 哪些必须从平台枚举中选择，哪些可自由填写 |
| 图片 | 数量、比例、分辨率、主图限制、水印 / 文字限制 |
| 视频 | 是否必需、时长、比例、大小限制 |
| 价格 / 促销 | 货币、含税、折扣展示、最低价限制 |
| 物流 / 售后 | 处理时间、退换货、承诺话术、地区限制 |
| 合规红线 | 禁售品、IP、医疗/财富/功效承诺、广告法或平台政策 |

## 内置平台 preset

### Etsy

旧仓库里的 Etsy 规则继续作为内置 preset：

- 文案 SEO + 礼物 / 节日维度 + 上架前调研：`listing-catalog/references/platforms/etsy.md`（单文件 preset，原则级；礼物维度调研是模式 B 的 step 5.5，见该文件 § 礼物维度 / § 节日 / 季节 / § 上架前调研）
- 订单 / 客服 / 履约表：`orders-customers/references/platforms/etsy.md`
- 商品图硬规则：`image-synth/references/etsy-listing-image-specs.md`
- Listing 槽位语义：`assets-library/references/etsy-listing-photo-slots.md`

只有当 `COMMERCE_PLATFORM.md` 明确选择 Etsy，或用户目标明显是 Etsy 时，才读取这些 Etsy 参考。其他平台不能复用 Etsy 的标题、tag、图片槽位、SEO 规则**或礼物 / 节日维度调研**。礼物维度是 Etsy 搜索流量大头、是 Etsy SEO 的输入，其产出（礼物词库 → title 礼物位 / tags 礼物词 / description 礼物语境）绑定 Etsy 的 listing 结构；**非 Etsy 平台整段跳过礼物维度调研**（小红书走内容种草模型、无礼物 tag 槽位，其余平台各按自己的 `COMMERCE_PLATFORM.md` 规则）。

### 小红书

小红书平台规则见：

- 商品上架 / `Products 商品` 表：`listing-catalog/references/platforms/xiaohongshu.md`
- 订单 / 客服 / 售后表：`orders-customers/references/platforms/xiaohongshu.md`
- 发布任务池：`publish-composer/references/platform-publishing-model.md` 的“小红书图文 / 小红书视频”
- 自动发布状态：`social-publisher/references/adapter-registry.md` 小红书 = **staged（未对外开放）**——adapter `xiaohongshu-autopost` 后端 + 契约就绪，但当前只草稿 + 人工对账，不跑真发；对外放行后改 `enabled`
- 社媒图默认规格：`image-synth/references/social-platform-specs.md` 的“小红书图文 / 商品种草图”

小红书商品按 SPU / SPL / SPV / ITEM 分层，`Products 商品` 表必须保留品牌、末级类目、规格、图片、描述、产品参数、价格、库存、上下架和审核状态等字段。小红书订单按订单 / 包裹 / SKU / 售后分层，`Orders 订单` 表必须保留包裹 ID、订单状态、售后状态、取消状态、SKU 明细、物流模式、承诺发货时间和收件地区等字段。

只有当 `COMMERCE_PLATFORM.md` 明确选择小红书，或用户目标明显是小红书上新 / 小红书店铺商品页 / 小红书订单 / 小红书图文笔记 / 小红书视频时，才读取小红书 preset。小红书字段、图片规则、订单规则和客服边界不能反向套给 Etsy。

## 新平台接入步骤

1. 用 `shop-foundation` 建立或更新 `COMMERCE_PLATFORM.md`。
2. 在目标平台章节填完必填配置和平台规则。
3. 用 `listing-catalog` 建或更新 `Products 商品` 表，字段用通用名；平台专属字段放 `平台字段 JSON` 或清晰命名的补充字段。
4. 若平台涉及订单或客服，再用 `orders-customers` 建或更新 `Orders 订单` / `Customers 客户` 表，字段用通用名 + 平台专属字段分组。
5. 若平台涉及素材发布，再用 `publish-composer` 建发布任务；真实发布统一交给 `social-publisher`，由 enabled adapter 执行。没有 enabled adapter 的平台只做人工后台或对账。
6. 先跑一个 SKU / 一个订单 / 一个发布任务的端到端草稿，人工确认规则够不够，再批量复用。
