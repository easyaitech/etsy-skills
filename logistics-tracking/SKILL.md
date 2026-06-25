---
name: logistics-tracking
description: 跨境物流状态自动跟踪：用 17TRACK 聚合查询把 Orders 表里已发货订单的跟踪号一路跟到签收，状态有变化主动推送给运营者（飞书），不用人工去各承运商网站查。覆盖 4px/燕文/云途/顺友/中国邮政等跨境专线 + 目的国末端派送（USPS/Royal Mail 等），17TRACK 自动识别承运商。三种触发：(1) 接入："接物流跟踪 / 配置自动跟踪 / 建物流跟踪 / 给 Orders 表加物流字段"——建 operator 中央运营表 + 给店铺总 Base 的 `Orders 订单` 表补物流字段 + 配 17TRACK key；(2) 手动查单："这单到哪了 / 查下这个跟踪号 / XX 订单物流到哪了 / 查快递"——对单个订单或跟踪号即时查 17TRACK 并回写作答；(3) 巡检："跑物流巡检 / 更新物流状态 / 看看有哪些到货了 / 物流跟踪巡检"（v1 手动触发，v2 才接无人值守 cron）——批量查所有已发货未签收订单、回写、状态跃迁即推飞书、签收交回 orders-customers。本 skill 只管"包裹在哪、到没到"；订单履约/客服回复/签收评价引导/SOP 阶段属 orders-customers，不在这里做。
---

# Logistics Tracking

跨境物流状态跟踪的**执行层**。把"已发货订单的跟踪号"喂给 17TRACK 聚合查询，一路跟到签收，状态有变就推给运营者。

```text
Orders 订单表（已发货 + 有跟踪号 + 未签收）
        ↓  本 skill 模式 C 巡检
17TRACK register-once → 每日 standard 轮询（按单号计费，注册后轮询免费）
        ↓
回写 Orders 物流字段（物流状态/最新轨迹/物流更新时间/物流签收日期）
        ↓  状态跃迁
飞书推送给运营者；签收 → orders-customers 的「签收评价引导 SOP」最终一致接管
```

**和 orders-customers 的边界**（务必分清，避免 Hermes 路由歧义和抢写）：
- 本 skill 写：`物流状态`、`最新轨迹`、`物流更新时间`、`物流签收日期` 以及一组跟踪运行字段（见 base-schema）。
- 本 skill **不写** `状态`（待发货/已发货/已签收…）、`SOP 阶段`、`评价跟进状态` —— 这些是 orders-customers 拥有的业务状态。本 skill 只把真实签收信号写进 `物流状态=已签收`，由 orders-customers 读它后接管（单写者原则）。
- 买家消息（签收关怀/评价引导）**永远不在本 skill 自动发**，由 orders-customers 走人工确认。

## 起步：先解析工作区与 Base

任何模式开始前：

1. 按 [`shared/preamble.md`](../shared/preamble.md) §工作区路径解析定位 `<workspace>` 根（`$ECOMMERCE_WORKSPACE` / `.ecommerce-workspace` 标记；解析不出就停下问用户，不猜）。
2. 按 [`shared/store-base-architecture.md`](../shared/store-base-architecture.md) 用 `lark-base` 定位**店铺总 Base**，里面应有 orders-customers 建的 `Orders 订单` 表。
3. 读 `COMMERCE_PLATFORM.md`（如存在）确认平台与承运商习惯。
4. **客户偏好与运行数据进 `<workspace>` / 店铺总 Base / operator 中央表，绝不写进 `~/.hermes/skills` 共享技能目录**（见 [`shared/preamble.md`](../shared/preamble.md) 写入禁令）。17TRACK key 的存放见 [`references/runtime-setup.md`](references/runtime-setup.md)，集中存放，不进 skill 目录、不进租户 workspace。

字段、表结构、查询契约都在 references 里，按需读，别凭记忆：
- [`references/base-schema.md`](references/base-schema.md) — operator 中央运营表 + Orders 表要补的物流字段
- [`references/17track-adapter.md`](references/17track-adapter.md) — 17TRACK 单一调用点契约 + 中性状态枚举映射 + 错误分类
- [`references/sweep-contract.md`](references/sweep-contract.md) — 模式 C 巡检契约（锁 / 幂等注册 / 配额护栏 / 去重推送 / 终态 TTL）
- [`references/runtime-setup.md`](references/runtime-setup.md) — 17TRACK key 存放 + 启动自检 + dry-run/test 模式 + QA 清单

---

## 模式 A：接入（首次配置）

进入条件：用户说"接物流跟踪 / 配置自动跟踪 / 给 Orders 表加物流字段 / 建物流跟踪"。

步骤：

1. 读 [`references/runtime-setup.md`](references/runtime-setup.md)，确认 17TRACK API key 已按集中方式配好（缺失则按该文档引导用户配置；**不替用户输凭据**）。配好后跑一次启动自检（key 存在性 + 一次轻量 ping）。
2. 读 [`references/base-schema.md`](references/base-schema.md)：
   - 在 operator 层建/校验**中央运营表**（全局月配额账本 + cron 运行态/锁；不含任何客户明细）。表缺字段时，列出字段清单给用户确认后再建。
   - 给店铺总 Base 的 `Orders 订单` 表补物流字段组。字段缺失时列清单给用户确认后再补；不破坏 orders-customers 已有字段。
3. 提示用户：本 skill 的真实签收信号会替掉 orders-customers 原来"按时效猜签收日"的估算——orders-customers 的"待签收跟进"应改读 `物流状态=已签收`（见 base-schema §与 orders-customers 的衔接）。
4. 输出"接入完成"清单：中央表链接、Orders 物流字段已就绪、key 状态、下一步可以"跑物流巡检（dry-run）"。

**不在模式 A 创建任何真实定时任务**。v1 的巡检是手动触发；v2 才接 Hermes 无人值守 cron（见 TODOS）。

---

## 模式 B：手动查单（"这单到哪了"）

进入条件：用户说"这单到哪了 / 查下这个跟踪号 / XX 订单物流到哪了 / 查快递"。

步骤：

1. 定位目标：给定订单号 → 读 `Orders 订单` 行拿 `跟踪号` + `快递公司`（作 carrier hint）；或用户直接给跟踪号。
2. 按 [`references/17track-adapter.md`](references/17track-adapter.md) 调单一调用点：
   - 该号未注册 → 先 register（消耗 1 额度，按中央表配额护栏校验，见 sweep-contract §配额）。
   - 已注册 → gettrackinfo standard（缓存读，免费）。
   - **不要用 instant 模式**（10x 额度）。
3. 按中性状态枚举映射结果，回写该行物流字段（单条写，字段级 patch）。
4. 给用户作答：当前 `物流状态` + 最新一条轨迹 + 时间；查不到/无效号按错误分类（D7）说明原因，不编造。

手动查单也走配额护栏：register 前先看中央表本月全局额度，近阈值提醒、耗尽则只对已注册号 gettrackinfo、新号停注册并告警。

---

## 模式 C：巡检（v1 手动触发 / v2 cron）

进入条件：用户说"跑物流巡检 / 更新物流状态 / 看看哪些到货了"，或（v2）定时任务唤醒。

完整契约见 [`references/sweep-contract.md`](references/sweep-contract.md)。要点：

1. **单实例占用**：按 social-publisher 范式，巡检开始前在中央运营表占用 cron 运行锁；占不到锁（已有实例在跑）就停，不并发。
2. **筛待查队列**（对 `Orders 订单` 一次筛选读，不逐单读）：`状态=已发货 ∧ 跟踪号非空 ∧ 物流状态∉{已签收, 终态}`。
3. **幂等注册**：按每单 `17track注册状态` 决定——`未注册`（**空值等同未注册**，覆盖接入前就已发货的存量订单，首轮巡检会一并纳入）才 register（受配额护栏约束）；`已注册` 只 gettrackinfo standard。中断遗留"注册中"**直接重 register**（实测幂等、不重扣：返回 `-18019901` 即已注册）。
4. **批量**：按 40 个跟踪号一批调 17TRACK，≤3 请求/秒；批量回写。
5. **配额护栏**：每轮查 17TRACK `getquota` 的 `quota_remain`（不自维护计数器）；剩量近阈值（默认剩 20）推飞书告警；耗尽则停注册新号、继续轮询已注册号、推飞书告警——**不静默失败**。
6. **去重推送**：只在 `物流状态` 发生**跃迁**（或出现新的关键轨迹事件）时推飞书给运营者，按 last-notified 事件去重；状态没变不推，异常件不每天炸。
7. **签收交接**：`物流状态` 命中"已签收"时，写 `物流签收日期`，推飞书"订单 X 已签收"，由 orders-customers 的"待签收跟进"下轮扫到接管（最终一致，不在此处发买家消息、不翻 `状态`/`SOP 阶段`）。
8. **终态 TTL**：delivered 不是唯一终态——returned/lost/exception/海关扣留/长期无更新（默认 60 天）也进"挂起"，停止每日轮询，标人工，避免异常件永久轮询。
9. **错误分类**：暂时错（429/5xx/网络）退避重试（尝试次数<2）；永久错（无效号/不支持/额度耗尽）记 `查询失败原因` + 标人工，不重试。

**dry-run / test 模式**：上线前先用 [`references/runtime-setup.md`](references/runtime-setup.md) §dry-run 跑——用真实测试单号跑通整条管道，但不推飞书、不翻真字段、写到 scratch，验证幂等/配额护栏/去重/锁/状态映射都对，再切真跑。

---

## 对外的实操接口（给用户的话术）

- 接入：「接物流跟踪」「给 Orders 加物流字段」「配 17track」
- 查单：「TEACUP-001 这单到哪了」「查下跟踪号 LP00xxxx」
- 巡检：「跑物流巡检」「更新一下物流状态」「dry-run 跑一遍物流」「看看哪些到货了」

## 客户偏好与边界（共享引导摘要）

- 客户专属数据（要跟的订单、推送目标飞书）进 `<workspace>` / 店铺总 Base；全局配额与 cron 运行态进 operator 中央表；**都不写进 `~/.hermes/skills`**。通用能力改进走"提拔建议" + git，不在共享技能目录自建/改写 skill。
- 17TRACK key 集中存放，绝不写进 Base、飞书消息或日志（见 runtime-setup §安全）。
- 一切买家可见动作（消息）由 orders-customers 走人工确认，本 skill 只推送给运营者本人。
