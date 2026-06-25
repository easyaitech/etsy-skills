# 17TRACK 适配器：单一调用点 + 状态映射 + 错误分类

v1 唯一数据源是 17TRACK。所有"查轨迹"都走这一个调用点（决定 #3）；将来要换/加数据源（快递100/快递鸟），让新适配器实现**同样的输入/输出契约**即可，上游巡检和回写逻辑不动。

## 一、单一调用点契约（适配器接口）

```text
输入:  [{ tracking_no, carrier_hint? }, ...]        # carrier_hint = Orders.快递公司，可空
输出:  [{ tracking_no,
          物流状态,            # 中性枚举（见 §三）
          最新轨迹,            # 最新一条事件描述（地点+事件）
          物流更新时间,        # 该事件时间（承运商时区→统一）
          是否终态,            # bool，命中终态集合（见 sweep-contract §TTL）
          raw_status,          # 17TRACK 原始主状态，留痕排查
          error?               # 见 §四错误分类；成功则空
        }, ...]
```

适配器内部封装 register 与 gettrackinfo 两步，上游只看这个契约，不直接拼 17TRACK 字段。

## 二、17TRACK API 机制（v2.2，决定计费与设计）

| 端点 | 作用 | 计费 |
|---|---|---|
| `POST /register` | 订阅一个跟踪号（之后 17TRACK 自动盯梢） | **成功 1 额度/号**（一次性，实测确认 200→199） |
| `POST /gettrackinfo`（standard，默认） | 读 17TRACK 缓存的轨迹 | 注册后轮询**免费** |
| `POST /gettrackinfo`（instant） | 强制实时向承运商拉取 | **10 额度/次** ← **禁用** |
| `POST /getquota` | 实时查账户配额 | **免费**，返回 `quota_total/quota_used/quota_remain/today_used` |

基址 `https://api.17track.net/track/v2.2`，鉴权头 `17token: <KEY>`，`Content-Type: application/json`，body 是 JSON 数组。响应外层恒 `{"code":0,"data":{"accepted":[...],"rejected":[{"number","error":{"code","message"}}]}}`，HTTP 200 也可能是业务错（看 `code` 与每号 `error.code`）。

- **限速 3 请求/秒、单请求最多 40 个跟踪号** → 巡检按 40 分批、≤3/s（D9）。
- 设计铁律（D1）：**register-once + 每日 standard 轮询**。贵不贵看注册了多少号，不看查几次。
- carrier hint：能给就给（提高识别准确率）；17TRACK 也能自动识别，跨境号（4px/燕文/云途）识别失败时走人工填 `快递公司` 再查。

> ✅ **已实测（2026-06-24，T10 spike 完成）**：
> 1. **重复注册**：对已注册号再 `/register` → 进 `rejected`，`error.code = -18019901`（"has been registered, don't need to repeat registration"），`quota_remain` **不变**。即**重注册幂等且不重扣额度**。→ `17track注册状态` 字段降为优化（省一次被限速的调用、状态可读），**不再是配额安全的命门**；中断恢复可直接重 register，已注册自动返回 -18019901，无需先核对。
> 2. **限速**：按 **key 维度**强制，突发约 2-3 发即 HTTP 429，停发后约 1-2s 恢复。→ 巡检必须串行/节流 ≤3/s 并对 429 退避重试（实测 1.4s 间隔 + 2.5s 退避可稳过；这同时验证了 D7 暂时错重试逻辑）。
> 3. **配额可实时查**：`/getquota` 免费返回 `quota_remain`。→ D2 配额护栏直接读它做阈值/耗尽判定，不自维护全局计数器（见 sweep-contract §配额）。
> 4. register 恰扣 1 额度；不带 carrier 也能自动识别（返回 `accepted[].carrier`，如中国邮政=3011）。

## 三、状态映射（D6 中性枚举）

`物流状态` 用**自己的中性枚举**，把各数据源状态码映射进来；orders-customers 只认中性枚举，不认 17TRACK 词汇。

| 中性枚举（`物流状态`） | 17TRACK 主状态（raw） | 含义 |
|---|---|---|
| `未发出` | NotFound / InfoReceived（仅建单未上网） | 已登记尚无承运商轨迹 |
| `已揽件` | InfoReceived（已揽收） / PickedUp | 承运商已收件 |
| `在途` | InTransit | 运输中 |
| `到达待取` | AvailableForPickup | 到达自提点/待取 |
| `派送中` | OutForDelivery | 末端派送中 |
| `已签收` | Delivered | **终态**；写 `物流签收日期`，交回 orders-customers |
| `异常` | Exception / DeliveryFailure | 派送失败/异常（**非终态**，继续跟一段，超 TTL 转挂起） |
| `退回` | Returned / ReturnedToSender | **终态**；停跟，标人工 |
| `挂起待人工` | Expired / 长期无更新 / 识别失败 | **终态（挂起）**；停每日轮询，标人工（见 sweep-contract §TTL） |

> 主状态取值路径（实测确认）：`data.accepted[].track_info.latest_status.status`（如未上网的号 = `NotFound`）；最新事件在 `track_info.latest_event` 与 `...tracking.providers[].events[]`，承运商在 `accepted[].carrier`（数字码，如中国邮政=3011）。
> 映射表是**唯一**的状态翻译处。17TRACK 主状态枚举以官方 v2.2 文档为准；遇到未覆盖的 raw 主状态，默认落 `异常` 并记 raw 留痕，不要静默丢。
>
> **lost / 海关扣留 / 退件 等是 `sub_status`，不是主状态**——它们挂在 `Exception` / `InTransit` 之下（主状态只有上表那几个）。终态判定：先按主状态映射（上表），再按 sub_status 细分——`Returned` 或 `Exception` 下的退回/销毁类 sub_status → `退回`（终态）；其余 `Exception` / `DeliveryFailure` 是**非终态**，留队列继续跟，超 TTL（sweep-contract §⑦）才转 `挂起待人工`；`Expired` 直接 `挂起待人工`。海关扣留通常是 `InTransit`/`Exception` 的 sub_status，按非终态跟 + TTL 兜底。

## 四、错误分类（D7）

每次 register / gettrackinfo 的失败都要分类，决定重试还是转人工：

| 类别 | 例子 | 处理 |
|---|---|---|
| **暂时错** | HTTP 429 限速、5xx、网络超时/抖动 | 退避重试；`物流查询尝试次数 +1`，写 `下次重试时间`；尝试次数 ≥2 仍失败 → 暂挂本轮，下轮再试，不立刻判死 |
| **永久错** | 单号无效/格式错、承运商不支持、号不存在 | 记 `查询失败原因`，`物流状态` 视情况置 `异常`/`挂起待人工`，标人工，**不重试** |
| **额度耗尽** | register 被拒（配额用尽码） | 走 sweep-contract §配额护栏**降级**：停注册新号、继续轮询已注册、推飞书告警；**不当暂时错重试** |

- 已实测码：`-18019902` = 号未注册（gettrackinfo 前需先 register）；`-18019901` = 号已注册（重复 register，**不重扣**，当幂等成功处理，不算错）。其余码上线遇到再按文档归类补这张表。
- 永久错和额度耗尽**绝不进退避重试循环**，否则白烧调用 + 问题静默堆积。
- 额度耗尽不靠"register 被拒"才发现——巡检每轮先 `/getquota` 看 `quota_remain`，提前判定（见 sweep-contract §配额）。

## 五、将来换/加数据源（#3 预留，v2）

本契约 §一的输入/输出就是适配器边界。接快递100/快递鸟时：新适配器实现同样的 I/O（内部换成它的实时查询/订阅 + 它的状态码→中性枚举映射），按 social-publisher 的 adapter-registry 范式登记即可。**v1 不实现注册表，只保证调用点收口在一处**，别提前为多适配器加复杂度。
