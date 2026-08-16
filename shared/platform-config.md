# 销售平台契约（Etsy 固定）

本 stack 的销售平台**固定为 Etsy**（产品决策 2026-07-24：专注 Etsy；2026-08-16 落到基座架构）。销售平台规则一律以仓库**内置 Etsy preset** 为准，工作区**不再维护** `COMMERCE_PLATFORM.md` 平台配置文件。

Skill 只负责通用流程：盘点输入、生成草稿、写入 Base、准备素材、等待确认；「平台要求什么」由内置 Etsy preset 回答，不需要先确认目标平台。

## Etsy 内置 preset 索引

- 文案 SEO + 礼物 / 节日维度 + 上架前调研：`listing-catalog/references/platforms/etsy.md`（单文件 preset，原则级；礼物维度调研是模式 B 的 step 5.5，见该文件 § 附加调研环节）
- 订单 / 客服 / 履约表：`orders-customers/references/platforms/etsy.md`
- 商品图硬规则：`image-synth/references/etsy-listing-image-specs.md`
- Listing 槽位语义：`assets-library/references/etsy-listing-photo-slots.md`

通用口径：

- 买家语言默认**英文**；市场、货币、处理时间等店铺事实以 `SHOP.md` 为准。
- 礼物维度是 Etsy 搜索流量大头、是 Etsy SEO 的输入：礼物词库 → title 礼物位 / tags 礼物词 / description 礼物语境，绑定 Etsy 的 listing 结构。
- 自动化边界（哪些动作禁止 agent 代操作，如付款、真实上架、直接发买家消息）由 `orders-customers` 的 Etsy preset 与各 skill 自身约束定义。
- 店铺级例外（如「我们店描述必须双语」）沉淀进 `SHOP.md` 对应段落，不单独维护平台文件；Etsy 官方规则变更（标题上限、tag 数量等）属于 stack 升级，改内置 preset 走仓库发版，不落工作区。

## 存量工作区的 COMMERCE_PLATFORM.md

历史工作区可能还留有 `COMMERCE_PLATFORM.md`（旧「五份基座文件」之一，2026-08-16 起移除）。处理口径：

- **不再作为契约来源读取**；销售平台规则以内置 Etsy preset 为准。
- 首次注意到该文件时提示用户一次：若其中有店铺自定义条目（自动化边界、双语要求等）与 preset 不同，把这些条目迁入 `SHOP.md`，然后归档或删除该文件。不要静默迁移。
- 各 skill 不需要为它保留读取逻辑。

## 小红书（封存 shelved）

小红书电商 preset 保留在仓库但**整体封存**（产品决策 2026-07-24：专注 Etsy，不对用户开放）：

- 商品上架 / `Products 商品` 表：`listing-catalog/references/platforms/xiaohongshu.md`
- 订单 / 客服 / 售后表：`orders-customers/references/platforms/xiaohongshu.md`
- 发布任务池：`publish-composer/references/platform-publishing-model.md` 的「小红书图文 / 小红书视频」
- 自动发布状态：`social-publisher/references/adapter-registry.md` 小红书 adapter `enabled: false`
- 社媒图默认规格：`image-synth/references/social-platform-specs.md` 的「小红书图文 / 商品种草图」

封存边界：用户提小红书发布 / 上新请求时，只说明封存边界 + 引导回 Etsy + STOP，**连草稿 / 人工对账都不做**；解封走 adapter-registry § 小红书解封验收清单（不是一处开关）改 `enabled`。小红书字段、图片规则、订单规则不能反向套给 Etsy。

## 未来多平台

未来真要开放第二销售平台时，再重新引入「工作区平台配置文件」机制——旧契约（必填配置字段表、平台规则清单、新平台接入步骤）见 git 历史 v1.0.27 及以前的本文件。当前**不为多平台做任何预留设计**：不新增平台分支、不写「如果是其他平台」的兜底 prose。
