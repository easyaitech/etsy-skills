# 发布指标列 schema（`社媒发布队列` 的 metrics 组）

> metrics 列加在 `社媒发布队列 / PublishIntent`（owner=publish-composer）表上，属**反馈层（publish-metrics）owner 的列分组**——与内容列（composer）、执行状态列（dispatch）、平台结果列（adapter）并列，互不越界（沿用 [PublishIntent 契约](../../publish-composer/references/base-schema.md) 的按写者分组纪律）。

## ⑥ metrics 组（publish-metrics owner）

| 字段 | 类型建议 | 说明 |
|---|---|---|
| `曝光` | 数字 | 平台展示量 / impressions；拿不到留空标待补 |
| `点击` | 数字 | 链接 / pin 点击；outbound clicks |
| `保存` | 数字 | Pinterest save / 小红书收藏；平台无此概念则留空 |
| `互动` | 数字 | 赞 + 评论 + 分享之和（或平台主互动指标）|
| `转化` | 数字 / 文本 | 可归因的下单 / 询单；多数情况靠运营判断，标来源 |
| `指标采集时间` | 日期时间 | 本行 metrics 最近一次回收的时间；空 = 还没回收 |
| `数据来源` | 单选 | `手录 / 平台API / 插件抓取 / 估算 / 待补`——**每条 metrics 必标**，不假装精确 |

**与已有列的关系**：
- `发布 URL` / `平台 post id`（adapter 已回写的平台结果列）是 metrics 回收的锚——本 skill 不重复写这两列，只读。
- metrics 组**不参与状态机**：写 metrics 不改 `状态`；已发行的 metrics 可多次更新（采集时间随之更新）。

## 推荐视图

- **待回收**：`状态 = 已发` AND `指标采集时间` 为空
- **发布表现**：`状态 = 已发` AND `指标采集时间` 非空，按 `保存` / `点击` 倒序
- **按变体归因**：分组 `关联素材`（变体），看哪些变体表现好
- **按 SKU × 平台**：分组 `关联 SKU` + `平台`

## 原则

- **拿不到就留空 + `数据来源 = 待补`，绝不编数字**——假数据污染复盘、误导 composer 选材。
- **样本不足不强行下结论**——v1 数据少时如实说"先攒数据"。
- 互动指标获取分层：有平台 API 走 API；无则手录 / 插件抓取；来源如实标。
