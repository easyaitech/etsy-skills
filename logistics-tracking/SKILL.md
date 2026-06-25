---
name: logistics-tracking
description: 跨境物流状态跟踪——用 `track` 命令查/录包裹物流（接后端 17TRACK 跟踪服务）。当用户问“这单到哪了 / 物流到哪了 / 查快递 / 到货没 / 签收了吗”，或你在处理发货、拿到运单号需要纳入跟踪时使用。覆盖 4px/燕文/云途/中国邮政等跨境专线 + 目的国末端派送，自动跟到签收。只查/录，不直接改飞书 Base。
---

# 物流跟踪（track）

跨境物流查询/录入走 `track` 命令——它连到后端的 **17TRACK 跟踪服务**（常驻 ECS、SQLite 存状态、每天自动轮询“已发货未签收”的单，状态有变进变更流）。

- **不要**自己去承运商网站查：网页的自动识别承运商会**撞号**、给到不相干的旧单/错单（踩过：同一 4px 号网页 auto-detect 撞成另一条“武汉 2022”旧单，而钉死承运商查到的才是真单）。
- **不要**直接改飞书 Base。状态落 Base / 主动推送给运营者，是另一条**要人工核查确认**的流程，不在本 skill 做。

## 前置（运维一次性，非本 bundle 内容）

`track` CLI 在运行机 `~/.local/bin/track`，指向后端 track 服务（tailnet）。它由运维单独部署，**不随 etsy-skills 安装**；缺失时提示运维部署。调用一律用**绝对路径** `~/.local/bin/track`（PATH 里可能没有；且 agent 环境带代理，CLI 已自带 `--noproxy` 直连 tailnet）。

## 何时用哪条

- **拿到运单号 / 发货**：`~/.local/bin/track add <运单号> <租户ID> <order_ref> [carrier]` —— 纳入后台跟踪。
- **用户问“这单到哪了 / 到货没 / 查快递 / 签收了吗”**：`~/.local/bin/track query <运单号> [carrier]` —— 据返回 JSON 的 `status` + `latest_event` 用中文口语化回答（别把原始 JSON 甩给用户）。

## 关键规则

- 用**运单号 / 物流跟踪号**（例 `4PX3002882403921CN`），**不是订单号**（订单号查不到）。
- **务必带承运商码**避免撞号：**4px = 190094**。其他承运商若已知也尽量带；实在不确定才不带（自动识别，有撞错风险）。
- `status` 枚举：`pending`(待抓) `info_received`(已揽收) `in_transit`(运输中) `out_for_delivery`(派送中) `available_for_pickup`(待自取) `delivered`(已签收) `returned`(退回) `exception`(异常) `suspended`(长期无更新挂起)。
- register 是幂等的，重复 `add` / `query` 不会重复扣 17TRACK 额度。

## 例

> 用户：“查下运单 4PX3002882403921CN 到哪了”
> → 跑 `~/.local/bin/track query 4PX3002882403921CN 190094`
> → 看到 `status=delivered, latest_event="Delivered. Position: Front door"`
> → 回：“已经签收啦，快递放在门口了～”

## 来源 / 架构

后端 track 服务源码与设计见独立的 track-service（ECS，零依赖 `node:sqlite` + systemd，绑 tailnet）。本 skill 只是让 agent 知道“有这个能力、怎么调”。正确性（限速/配额/幂等/状态映射/TTL）都在服务代码里，不在本 markdown。
