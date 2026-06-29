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
- **用户问“这单到哪了 / 到货没 / 查快递 / 签收了吗”**：`~/.local/bin/track query <运单号> [carrier]` —— 据返回 JSON 的 `awaiting_data` + `status` + `latest_event` + `note` 用中文口语化回答（别把原始 JSON 甩给用户）。

## 关键规则

- 用**运单号 / 物流跟踪号**（例 `4PX3002882403921CN`），**不是订单号**（订单号查不到）。
- **务必带承运商码**避免撞号：**4px = 190094**。其他承运商若已知也尽量带；实在不确定才不带（自动识别，有撞错风险）。
- `status` 枚举：`pending`(系统已收单但 17TRACK 还没返回轨迹) `not_found`(17TRACK 暂无该单数据) `info_received`(承运商已收到电子面单信息、**等待揽收**——包裹尚未实际收件) `in_transit`(运输中) `out_for_delivery`(派送中) `available_for_pickup`(待自取) `delivered`(已签收) `returned`(退回) `exception`(异常) `suspended`(长期无更新挂起)。
- register 是幂等的，重复 `add` / `query` 不会重复扣 17TRACK 额度。

### 「正在抓取」≠「等待揽收」——必须分开措辞

新录入的单号第一次查时，系统刚注册、17TRACK 还没回数据，这是个**过渡态**，不是真的卡在揽收。响应里 `awaiting_data` 布尔值把这件事讲清楚了，**先看它再开口**：

- `awaiting_data: true`（`pending` / `not_found` 这类）→ 说**「系统刚把这个单号纳入跟踪，物流数据还在抓取，通常几分钟到几小时到位，稍后我再帮你查一次」**。**别**说成「等待揽收」，也**别**编造轨迹。
- `awaiting_data: false` 且 `status: info_received` → 这才是**「等待揽收」**：「承运商已经收到发货信息，正在等上门揽件，包裹还没实际收走」。
- 其它 `status` → 照枚举正常口语化（运输中 / 派送中 / 已签收……）。
- `note` 字段若非空，是后端给的一句事实提示（含注册失败原因），可直接拿来组织回话；`reg_state: "failed"` / note 提到「注册失败」→ 多半是**运单号或承运商码不对**，让用户核对，别说「正在抓取」。

**反面教材（别这么干）**：用户问到哪了，你回了一长段「为什么状态会变」的科普——『因为这个单号刚录入…我第一次查时系统里还没有…自动注册…轮询…你提醒后强制立即拉取…』。这是把内部实现讲给用户听，啰嗦且没用。用户只想知道**现在到哪了 / 要不要等**。看 `awaiting_data` 一句话讲清楚「正在抓取，请稍候」或「等待揽收」即可。

## 例

> 用户：“查下运单 4PX3002882403921CN 到哪了”
> → 跑 `~/.local/bin/track query 4PX3002882403921CN 190094`
> → 看到 `status=delivered, latest_event="Delivered. Position: Front door"`
> → 回：“已经签收啦，快递放在门口了～”

> 用户：“刚发的这单 YT2512… 到哪了”（第一次录入）
> → 跑 `~/.local/bin/track query YT2512... <carrier>`
> → 看到 `awaiting_data=true, status=pending`
> → 回：“刚帮你把这个单号纳入跟踪了，物流数据还在抓取（一般几分钟到几小时出来），稍后我再帮你查一次～” —— **不要**说“等待揽收”，也不要长篇解释为什么。

> 用户：“查下这单”
> → 看到 `awaiting_data=false, status=info_received`
> → 回：“承运商已经收到发货信息，正在等上门揽件，包裹还没实际收走哈。”

## 主动推送（v2，由定时任务触发）

Hermes cron 每天触发本流程（cron 用 `--skill logistics-tracking --deliver <运营者会话>` 把消息投给运营者）：

1. 跑 `~/.local/bin/track pending` 取"未推送的重要变更"（已签收/异常/退回/挂起），每条带始发地 + 近几条轨迹。（**当前单租户阶段不带参数**；多租户上线后才按 `track pending <租户ID>` 过滤。）
2. **没有结果就不要输出任何内容**（保持沉默，别打扰运营者）。
3. 有结果 → 用中文逐条写给运营者：订单/运单号、状态（如"已签收"）、始发 → 目的、最近 2-3 条轨迹，末尾加一句"核对无误回『确认』我就更新订单状态"。
4. **最后必须**跑 `~/.local/bin/track ack <id1,id2,...>`（逗号分隔所有处理过的 id）标记已推——否则明天会重复推送，务必执行。

## 运营者回复"确认"后才写 Base（人在环里）

运营者针对某条物流推送回复确认（"确认/对/没错"）时：
- 把物流状态回写到店铺总 Base `Orders 订单` 表的 **canonical 字段**（以 `orders-customers/references/base-schema.md` 为准，不要自造 `物流状态` / `物流签收日期`）：映射到通用 `状态`（已签收 → `状态 = 已签收`），已签收再回填 `签收日期`（实际 delivered 日期）。
- 已签收可按 `orders-customers` 的签收评价引导 SOP 跟进。
- 运营者说"不对 / 先别动" → 不写 Base。

## 来源 / 架构

后端 track 服务源码与设计见独立的 track-service（ECS，零依赖 `node:sqlite` + systemd，绑 tailnet）。本 skill 只是让 agent 知道“有这个能力、怎么调”。正确性（限速/配额/幂等/状态映射/TTL）都在服务代码里，不在本 markdown。
