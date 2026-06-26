# 小红书平台 preset

> 仅在目标销售平台是「小红书 / 小红书店铺 / RED」时读取；不要把这些字段套给 Etsy 或其他平台。注册见 [`../../../shared/platform-config.md`](../../../shared/platform-config.md) § 内置平台 preset · 小红书。

依据：
- 商品结构 SPU / SPL / SPV / ITEM 分层：https://school.xiaohongshu.com/en/open/product/product-structure.html
- Create SPU 字段（品牌、末级类目、商品名、规格、商品图、描述、商品特色、产品参数、FAQ、使用指南、图文详情、条码、重量、原产国、价格等）：https://school.xiaohongshu.com/en/open/product/create-spu.html
- Submit Review（Open API 导入的 SPU / SPV 自动审核通过，创意编辑 / 文描信息需提交审核）：https://school.xiaohongshu.com/en/open/product/spl-item-submit.html
- 商品基础介绍（商品 ID、SKU、SKU 状态、价格、库存、上下架）：https://xiaohongshu.apifox.cn/doc-2810949

## 数据结构

| 层级 | 含义 | 关键字段 |
|---|---|---|
| SPU | 不区分规格的产品单位 | `brand_id`、`category_id`、`name`、`ename`、`short_name` |
| SPL | 一种可展示规格，同一 SPL 共享图片和描述 | `variants` |
| SPL_ITEM | 创意编辑 / 文描信息 | `image_urls`、`desc`、`feature`、`attributes`、`faqs`、`user_guide`、`image_desc` |
| SPV | 具体可下单规格，常带条码和商品基础信息 | `barcode`、`barcode_type`、`non_desc_variants`、`net_weight`、`gross_weight`、`country`、`qty`、`unit`、`shelf_life`、`manufacturer`、`ingredient`、`usage`、`customs_specification`、`customs_photos_urls` |
| ITEM | 小红书 APP 上消费者购买的最小单位 | `price`、`original_price`、`pre_tax_price`、商品 ID |

## 上架前必备信息

建小红书 `Products 商品` 表或准备上新时，至少盘点：

| 信息 | 说明 |
|---|---|
| 品牌 | 先确认品牌是否已在小红书品牌库，记录 `brand_id`；没有品牌时按后台流程补品牌资料 |
| 末级类目 | 必须使用小红书末级分类 ID；规格和产品参数依赖末级类目 |
| 商品名称 | 中文商品名；英文名仅在需要时填写 |
| 商品简称 | `short_name`，不超过 15 个中文字符 |
| 销售规格 | SPL 规格，如颜色、款式、容量；需要规格 ID / 值 ID 或人工确认后台选项 |
| SKU 规格 | SPV 规格，如尺码、容量、套装；无规格可留空 |
| 商品图片 | SPL_ITEM `image_urls`；商品图片比例支持 1:1 或 3:4 |
| 商品描述 | SPL_ITEM `desc`，文描信息不能添加 HTML，换行用普通换行表达 |
| 商品特色 | `feature`，官方字段说明为"不超过八个字符" |
| 产品参数 | SPL_ITEM `attributes`；参数 ID、属性值来自末级类目产品参数 |
| FAQ | `faqs`，可选但适合沉淀售前问题 |
| 使用指南图片 | `user_guide.image_urls`，可选 |
| 图文详情图片 | `image_desc.image_urls`，详情图每张小于等于 2 MB |
| 条码 | `barcode` / `barcode_type`；可用 UPC 或自定义商品编码 |
| 原产国 | `country` |
| 重量 | `net_weight` / `gross_weight` |
| 内含数量 / 单位 | `qty` / `unit`；注意这里不是库存数量 |
| 保质期 | `shelf_life`，适用于有保质期商品 |
| 生产厂家 | `manufacturer`，填写全称 |
| 材质或成分 | `ingredient` |
| 用途 | `usage` |
| 规格型号 | `customs_specification` |
| 海关备案图片 | `customs_photos_urls`，跨境或需要备案时填写 |
| 价格 | ITEM `price`；跨境税商家还可能需要 `pre_tax_price` |
| 原价 | ITEM `original_price` |
| 库存 | SKU 维度设置；不要只维护 SPU 总库存 |
| 上下架状态 | 商品和 SKU 均可能影响实际可售状态 |

## 图片规则

- 商品图片：800x800 或 750x1000，JPG / PNG / JPEG，比例 1:1 或 3:4。
- 使用指南图片：单图宽度 750px 到 1242px，高度不超过 1546px。
- 图文详情图片：单图宽度 750px 到 1242px，高度不超过 1546px，JPG / PNG / JPEG，每张不超过 2 MB。
- 图片不符合规则时，接口可能不额外报错，但后台和前端商详页可能看不到对应图片；发布前必须人工复核。

## 飞书 Base 建字段要求

当 `COMMERCE_PLATFORM.md` 包含小红书平台时，`listing-catalog` 模式 A 建 `Products 商品` 表必须在通用核心字段外加建 [`../base-schema.md`](../base-schema.md) 的"小红书字段"分组。字段多，但这是平台约束；可以先建空字段，后续按 SKU 慢慢补齐。

## 发布边界

- 本 skill 只准备字段、文案和 Base 数据，不直接调用小红书后台或 Open API 创建商品。
- 提交审核是独立动作：小红书开放平台的创意编辑 / 文描信息需要提交审核；是否提交由用户或专门平台发布 skill 处理。
- 规格、产品参数、属性值必须来自小红书接口或后台选项；不知道 ID 时写"待后台确认"，不要编造。
