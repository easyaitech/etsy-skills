# Runtime Setup（首次接入 + 验证）

只在模式 A 触发；装一次，模式 B/C 复用。

## 路径与凭证约定

| 角色 | 落点 | 进 git? |
|---|---|---|
| 17TRACK API key（**集中，所有租户共用一个**） | Hermes 机器 `~/.config/logistics-tracking/17track.env`（或环境变量 `SEVENTRACK_API_KEY`） | 否（用户家目录，独立于仓库；profile 隔离下落到 profile HOME 是预期） |
| operator 中央运营表 | operator 管理 Base（lark-base） | 否（Base 数据） |
| dry-run/test scratch | `<workspace>/.cache/logistics-tracking/dryrun/` | 否（`.cache/` 进工作区 .gitignore） |

三层分离同 pinterest-autopin：key 像"登录态"——集中、跨租户复用一份；运行数据按租户隔离。

> 决定 #2：key 由运营方集中管理一个主账号 key。**不写进 skill 目录**（违反共享技能目录写入禁令）、**不写进任何租户 workspace**、**不写进 Base / 飞书消息 / 日志**。

## 1. 配置 17TRACK key

1. 让用户去 [17TRACK 后台](https://www.17track.net/en/api) 注册账号、拿 API key（**用户自己操作，本 skill 不替输凭据**）。
2. 引导用户把 key 放到 `~/.config/logistics-tracking/17track.env`：
   ```
   SEVENTRACK_API_KEY=xxxxxxxx
   ```
   并设权限 `chmod 600 ~/.config/logistics-tracking/17track.env`。
3. 计划上限以 `getquota.quota_total` 为准（实测本账户=200，非免费档 100）；如需本地参考可写进 `配额账本` 全局行 `配额上限`。

## 1.5 推送目标（运营者飞书）

巡检/查单的状态推送只发给**运营者本人**。接入时配置一次，否则实现者不知道发给谁：

- 在 `<workspace>` 配置（SHOP.md 或 workspace 配置文件）记运营者的飞书 `open_id` 或接收 `chat_id`；可用 `lark-contact` 按姓名/邮箱解析成 `open_id`。
- 每次推送前解析收件人；**解析不到就停下问用户，不猜、不群发、不默认发到任意群**。
- 多租户下推送目标随 `<workspace>` 隔离（各店铺运营者可能不同）。
- 内容只含订单号 + 物流状态 + 轨迹 + 时间，不含 key、不含买家 PII。

## 2. 启动自检

模式 A 配好后、以及每次巡检开始前跑一次轻量自检：

- key 文件/环境变量存在且非空（不在日志里回显 key 本身）。
- 一次**轻量** ping：对一个已知测试单号做 gettrackinfo standard（不消耗注册额度），确认鉴权通过、网络可达。失败按 [17track-adapter §四](17track-adapter.md) 错误分类报给用户，不硬跑巡检。

## 3. dry-run / test 模式（上线前必跑，D8）

照抄 pinterest-autopin 的 validate→test→final 思路：

| 阶段 | 做什么 | 安全边界 |
|---|---|---|
| **validate** | 自检 key + 中央表/Orders 字段齐全 + 待查队列能筛出来 | 只读，不调注册 |
| **test** | 用**真实测试单号**跑完整巡检流水线 ①–⑧ | **不推飞书、不翻真字段、回写到 `<workspace>/.cache/logistics-tracking/dryrun/`**；register 仅对测试号、明确告知会消耗少量额度 |
| **final** | 验证通过后切真跑（写真字段、推飞书） | 真实模式 C |

test 阶段重点验两个 ★CRITICAL 分支：
- **配额护栏**：把 `告警阈值` 临时调到**高于当前 `getquota.quota_remain`**，确认"近阈值告警"在真实余量上触发；单轮上限/耗尽路径用 `单轮注册上限` 调小 + adapter 测试桩模拟 register 被配额码拒来验。**不要靠调 `配额上限`**——实际护栏只读 getquota，调它测不到真路径。
- **中断恢复**：造一个 `17track注册状态=注册中` 的遗留单，确认下轮**直接重 register** 返回 `-18019901`、不重扣、归位 `已注册`。

## 4. QA 清单（每分支至少走一遍）

- [ ] 模式 B 有效跨境单号（4px/燕文）→ 正确识别承运商 + 返回状态
- [ ] 模式 B 无效单号 → 永久错，记 `查询失败原因`，不重试
- [ ] 模式 C 新号 → register 一次、计数 +1、标 `已注册`
- [ ] 模式 C 重跑 → 已注册号不重复 register（幂等，护额度）
- [ ] 状态跃迁 → 推飞书一次；状态没变 → 不推（去重）
- [ ] 命中 Delivered → 写 `物流签收日期` + 推送；不翻 `状态`/不发买家消息
- [ ] 配额近阈值（`getquota.quota_remain ≤ 告警阈值`，默认剩 20）→ 飞书告警一次；单轮新号超 `单轮注册上限` → 分批 + 告知；耗尽 → 停注册新号 + 继续轮询 + 告警
- [ ] 暂时错（限速）→ 退避重试，尝试次数 <2；永久错 → 标人工
- [ ] 异常件超 60 天无更新 → 挂起待人工，停轮询
- [ ] 巡检并发 → 第二实例占锁失败、停（或单实例约束生效）

## 安全

- key 只读自配置文件/环境变量，**绝不**写进 Base、飞书消息、日志、提交。
- 飞书推送只发给**运营者本人**，内容是物流状态+轨迹，不含 key、不含买家 PII。
- 共享 key 一旦泄露/失效影响所有租户：key rotation / 失效检测 / 多机迁移属 v2 运维项（见 TODOS 可补）。

## 故障排查

- **自检 ping 失败（鉴权）**：检查 key 是否正确、计划是否含 API 权限（免费档也含 API，但以 17TRACK 后台为准）。
- **承运商识别不出**：跨境号格式可能重叠；让用户在 Orders 的 `快递公司` 填明承运商作 hint 再查。
- **额度异常消耗**：核对是否误用了 instant 模式（应只用 standard）；查 `getquota` 看 `quota_used / quota_remain`。
