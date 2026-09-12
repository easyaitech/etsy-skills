---
name: instagram-publish
description: Instagram 单视频 Reels 发布适配器。用户要发 Instagram 视频、预览、定时发布、确认发布或查询结果时使用；通过养个店长服务器和租户浏览器插件执行。图片、轮播和 Stories 尚未接入。本 skill 不制作视频、不持浏览器登录态。
layer: application
depends-on: [shop-foundation, assets-library]
---

# Instagram Reels

服务器保存任务、排期、幂等键和结果；租户插件用已登录的 Instagram 上传、填文案并分享。接口正文见 [API](references/api.md)，调用前先读。平台开通状态以 `capabilities` 实测为准，安装 skill 本身不代表后端已上线或租户已开通。

## 准备素材与文案

确认目标 Instagram 用户名、一个完成的视频和 caption。已有文案按原文使用；需要起草时读店铺 `BRAND.md`、`BRAND_MARKETING.md` 和 `MARKETING_PLATFORM.md`，缺事实就保留缺口，不编购买地址、客户故事或授权。

首版只接一个 MP4，最多 20 MiB（系统传输限制），caption 最多 2200 UTF-16 单元。优先使用已验收的 9:16 成片，插件保留原比例和原音轨。音乐署名、授权链接、换行和标签都是 caption 的一部分。

素材必须能由本租户 bot 从飞书下载，输入的是 `assetFileToken`，不是文件夹 token、URL 或本地路径。用户只给本地视频时，经 `assets-library` 的已有上传链路放入其素材库，再读回 file token。给 Pinterest 的五图文件夹不等于 Instagram 视频已上传；科普视频与商品视频都按实际文件处理。

## 执行

1. 调 `capabilities`。需要插件至少 `0.5.178` 并在目标账号的浏览器中登录。`publishEnabled=false` 时可准备预览，实际发布由管理员开通；不靠反复重试或换接口绕过。
2. 为本次业务意图固定 `idempotencyKey`，保存到已有任务记录或当前交接说明。创建请求超时后用同一键重送，或 `list` 查找；先找到原任务再继续。
3. 用户只要求试一下或预览：`create` 使用 `mode=preview`。轮询 `status` 到 `previewed`，告诉用户预览页已准备；这不是已发布。用户确认这份预览后，给同一个 `jobId` 调 `approve`，`confirmPublishApproval=true`。
4. 用户已明确授权这份素材、文案和目标账号发布（包括明确排期）时，可 `create mode=publish` 并传 `confirmPublishApproval=true`。已有授权不必重复确认；调试、提供素材、询问能力本身不当成公开发布授权。
5. 定时发布使用带时区的 `scheduledAt`。时间到后仍需插件在线，离线任务保持排队，浏览器恢复后执行。首版由这个 Instagram 任务接口排期，**不靠 Base 的 `自动发布=true` 扫描，也不在 Hermes 建 cron**。
6. 查询到终态后报告真实状态。`published` 表示平台分享成功提示已被插件确认；`resultUrl` 为空时直说“分享已确认，帖子链接尚未读取”，不猜最新帖子链接。需要公开链接时请店主提供或通过授权只读页面核对。用户已经手动分享的内容只查结果，不再提交一次。

## 失败与交接

- `failed`：本次未进入可能提交的状态，读回 `error` 后修复具体问题；再次执行使用新意图键，保留原失败任务。不要循环盲试。
- `uncertain`：可能已经分享，服务器会阻止本租户后续任务，避免连续重复发布。先由店主核对 Instagram，明确已发及真实 URL，或在确认原执行已结束后明确未发，再调 `resolve` 记录其确认；仅有超时不能判断未发。
- `queued` / `claimed` / `committing`：仍在排期、执行或验证，不报成功。需要取消时只取消服务器允许的空闲状态；执行中的任务不抢占。
- 回执丢失时插件补送回执，不重放分享点击。查询工具也只读，不通过重建发布任务“查询”。

若这条视频已有 `社媒发布队列` 行，记录返回的 `id` 到既有外部任务 ID 字段，并按查询结果更新事件说明。首版没有 Instagram 的 Base 自动扫描和自动回写：拿不到 URL 时保留“分享已确认、待补链接”的说明，不按通用 Base 合同伪填 `已发`；店主补齐真实 URL 后才完成该行对账。独立视频不为发布额外创建表或扩平台字段。
