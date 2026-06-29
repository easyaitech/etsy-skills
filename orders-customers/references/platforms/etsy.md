# Etsy 订单与客服配置

本文件是 Etsy 平台 preset（订单 / 履约 / 客服 / 售后）。仅在目标销售平台是 "Etsy" 时读取；不要把这些字段名、语言、Ship-by 规则套给小红书或其他平台。契约见 [`platform-presets.md`](platform-presets.md)。

## preset 契约对照

| # | 契约项 | Etsy 取值 |
|---|---|---|
| 1 | 平台标识 / 别名 | Etsy |
| 2 | 买家语言（默认） | 英文（最终以 `COMMERCE_PLATFORM.md`「买家语言」为准） |
| 3 | 履约单元 | 订单（一个 Etsy order 一行 `Orders 订单`） |
| 4 | 平台专属字段组 | 通用核心字段基本够用；Etsy 特有的少量字段（如 receipt id）可进通用 `平台字段 JSON`，不单建字段组 |
| 5 | 订单号 / 买家标识 | 平台订单号 = Etsy order / receipt number；买家标识 = Etsy username / buyer；写入 `平台订单号` / `平台用户名 / 昵称` |
| 6 | 承诺发货时间来源 | Etsy 后台 / 订单截图的 `Ship by ...` / `Ship today` / `Ship tomorrow`，换算成 `承诺发货日` |
| 7 | 消息 / 客服 / 售后入口 | Etsy Messages（站内信）；售后 / 纠纷走 Etsy case / 退款流程；以 `COMMERCE_PLATFORM.md` 为准 |
| 8 | 消息媒体限制 | **Etsy 站内信不直接发视频**；要展示打包 / 出货过程时，从视频里截**最多 3 张**图片发送 |
| 9 | 隐私 / 地址 | 完整收货地址、邮箱留在 Etsy 后台 / 打单系统；Base 只保留 `收件地区`（国家 / 州 / 城市级） |
| 10 | 价值标签阈值 | `VIP`：累计 ≥ 3 单 **或** 累计金额 ≥ **USD 300**（若客户表 `累计金额` 使用核算币种，如 CNY，先把 USD 300 按店铺确认汇率折算到同一核算币种再比较）；`品牌相符`：留过 ≥ **50 词英文**实质好评 或 自发社媒分享 |
| 11 | 自动化边界 | 不替用户在 Etsy 后台发站内信 / 标记发货 / 退款 / 处理 case；本 skill 只产文案 + 维护 Base |

## 承诺发货时间（Ship by）

- 从订单截图 / 后台提取 `Ship by ...` / `Ship today` / `Ship tomorrow`，换算成可执行的 `承诺发货日`，写入订单记录——**不要只记下单日期**。
- 只给相对描述（如 `tomorrow`）且当前日期不明确时，用系统日期换算；仍不确定时在 `备注` 标记「需 Etsy 后台复核」。
- `承诺发货日` 进 `临期/超期待发` / `待发货` 视图，作为临期履约的待办来源（触达机制见 `order-fulfillment-sop.md` §阶段 0）。

## 客服话术（英文示例）

`order-handling.md` 的场景骨架是平台中性的；下面是 Etsy 英文措辞示例，套用骨架时按这里的语气，但**语调仍以 BRAND.md 为准**、**政策仍以 SHOP.md 原文为准**。

- 订单咨询："Thanks for checking in — your order is currently in production and should reach you by {SHOP.md 运输时长}. I'll let you know the moment it ships."
- 退换货：避免条件反射式 "I'm so sorry, full refund"；先共情→了解→按 SHOP.md 退货政策给方案。
- 差评公开回复：不为差评本身道歉、不甩锅、不在公开回复里写解决方案细节（"will refund X" 这类放站内信）；不重复负面关键词（避免成为 SEO 反例）。
- 签收评价引导：温和邀请 honest review / share your thoughts，**不要**写 "please leave us a 5-star review"。

## 售后 / 纠纷边界

- 退款、补发、case 处理都在 Etsy 后台，由用户操作；本 skill 只记录事实、出处理建议和站内信草稿。
- 损坏且属运输方责任 → 建议主动补（重发 / 退款），但实际动作用户来做。
