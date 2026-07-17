# 工具架构约束

全 stack 硬约束。任何新增「工具能力」（生图、查快递、平台抓取、平台发布、客服自动化、社媒发布等）都必须遵守本文。本仓库的 skill 是 **Hermes 大脑层**——你写约束、想方案、生成内容，但你**不是**工具本体的归宿。

## 一句话

**Hermes 思考，ECS 做事和连接，插件只在「无 API 又必须用租户登录态」时伸手。**

---

## 三个角色（谁负责什么）

| 角色 | 在本 stack 里是什么 | 负责 | 绝不持有 |
|---|---|---|---|
| **服务器（ECS）** | 多租户后端 / 控制面（当前实现：`yanggedianzhang`） | 队列、排期、per-tenant 身份与 token、密钥、调外部 API、计费、限流、状态、重试、审计 | —（工具本体永远住这里） |
| **Hermes（Mac mini）** | **本仓库的这些 skill**，每租户一个 Hermes profile | 用每个租户的口吻去想和生成（写 listing / 起草客服回复 / 拼生图 prompt / 做判断），含每 profile 的人设 + 知识 skill | 工具实现、密钥、队列、浏览器会话（**唯一例外**：lark-cli / 飞书访问，见 §例外） |
| **浏览器插件** | 进入租户登录态的「手」 | 仅当目标平台没有可用 API、且必须用租户已登录的浏览器时才用；跑在租户自己的浏览器里，带 per-tenant token，只和 ECS 控制面通信 | 任何内嵌密钥 |

**关键边界：工具的「本体」永远住在 ECS。** 这些 skill 维护的是**语义层 / 提示词层 / 质量闸门层**（输入 → 词库 / 规则 → 输出 + QA），把「做事」下沉给 ECS 控制面背后的工具。这正是本 stack 既有 skill 的写法——`image-synth` 维护提示词层 + QA 闸门、生图动作下沉；`pinterest-autopin` 维护 `社媒发布队列` 语义层、物理发布下沉。本文把这个隐式范式升级成**全 stack 硬约束**。

---

## 选型优先级（加新工具按顺序选）

新增任何工具能力，**从上往下选第一个满足的**，不要跳级：

1. **平台有可用 API → ECS 用 per-tenant token 直接调。** 不要浏览器、不要插件。
   - 例：Etsy 上架 / 订单 / 库存 / 发货 / 物流（Etsy 官方 API + 租户 OAuth token）、小红书开放接口、17TRACK 物流查询。
2. **无 API，但要进租户登录态 → 浏览器插件（租户自己的浏览器）+ ECS 控制面编排。**
   - 例：Etsy 站内信 / 私信（官方 API 不覆盖会话）、Pinterest 发布。
3. **无 API、租户又不开浏览器、且需无人值守 → 自建反检测浏览器（专用机 + 每租户代理）。**
   - 这是**平台工具里**唯一「执行不在 ECS」的例外；但**控制面仍在 ECS**，绝不放在 Hermes 那台 Mac mini。（飞书底座另有一个已批准例外，见 §例外）

判断「有没有 API」以**官方公开 API 是否覆盖该动作**为准，不是「能不能爬到」。能爬 ≠ 该爬：先走 API，爬取是降级选项。

---

## 例外（已批准）：lark-cli / 飞书访问留在 Hermes

飞书有官方 API，按选型优先级本该 tier 1（ECS 用 per-tenant token 调）。但 **lark-cli 是已拍板的例外：飞书访问就跑在 Hermes 的 Mac mini 上，不上收 ECS。** 这是终态，不是过渡。

**为什么给飞书开口子**：
- 飞书是租户的**内部工作台 / 后台**（店铺总 Base、云文档、云空间、妙记都在这），用的是**租户运营者本人的飞书身份**——不是需要集中托管的外部平台凭据。
- 每租户 = 一个 Hermes profile = 一套独立飞书登录态，隔离在 profile sandbox HOME，profile 之间互不可见。
- 整个 stack 以 lark-cli 为数据底座（基座 skill 的 Base / 文档 / 云空间操作全经它）；上收 ECS 收益小、改造面大。

**例外的边界（不可外溢）**：
- 只豁免 **lark-cli / 飞书工具族**（Base / 云文档 / 云空间 / 妙记 / 日历 等）。
- **不豁免任何外部平台**：Etsy / Pinterest / 小红书 / 外部生图 / 物流等仍按选型优先级走——密钥与执行在 ECS，**不得借本例外把外部平台凭据塞进 Mac mini**。
- 区别在于：飞书是运营者自己的内部后台 + 自有身份；外部平台是营销 / 交易渠道，其 per-tenant token 是平台凭据，必须 ECS 集中托管、轮换、审计。

**例外下仍然成立的红线**：
- 一个 profile 只持有**该租户**的飞书身份，绝不跨租户访问别人的飞书。
- 飞书机器人 / Agent 角色最小权限、绑定单店铺总 Base（见 [`shared/store-base-architecture.md`](store-base-architecture.md) §共享与权限边界）。
- 仍全程审计；面向用户的回复不暴露 token / app_token 等内部凭据。

---

## 控制面 / 执行面分离

- **控制面（永远 ECS）**：队列、身份、计费、状态、审计 + Hermes 大脑产出的内容。
- **执行面（看登录态住哪）**：官方 API（token 存 ECS）/ 租户浏览器（插件）/ 反检测浏览器（专用机）。

**原则：位置可变，入口不变。** 每个能力对外只暴露一个稳定入口（ECS endpoint），调用方（这些 skill）不关心它实际在哪执行；以后换执行位置，不动调用方。

---

## 接口形态（工具实现怎么包装）

1. 先把能力写成**核心库 / 纯函数**；CLI、HTTP endpoint、MCP 都只是它外面的薄壳。
2. **默认 CLI**：单个、无状态、单一职责的能力。
3. **才上 MCP**：一组共享同一份 auth / 有状态会话的工具族（如浏览器 / CDP 连接）。
4. **agent 调工具的真实路径** = Hermes skill → 调 ECS 的 HTTP endpoint（薄、无密钥、带租户 session key）。落地细节（注入哪三个环境变量、terminal / execute_code 里怎么拿、怎么调、怎么判断成没成）见 [`shared/backend-api-access.md`](backend-api-access.md)。

skill 侧只写「调哪个入口、传什么、怎么解释返回」；不写鉴权、不写重试编排、不写密钥读取——那些在 ECS。

---

## 安全红线

涉及鉴权 / token / 密钥的改动，**上线前必须跑 Codex 独立审**（`/cso` 或 codex rescue）。

- **per-tenant token 即认证，必须 fail-closed 校验**；token ≠ tenantId，不可拿公开标识符（店铺名 / Base token / 用户名）当 bearer。
- **每租户会话 / token 加密存储、严格隔离**，防跨租户泄露。
- **全程审计**：谁、哪个租户、调了什么、改了什么状态，都要留痕。
- **密钥永不进 Hermes、永不进 skill 目录、永不进工作区文件**。这条与既有约束一致：
  - skill 目录所有租户共享、只读 → 见 [`shared/preamble.md`](preamble.md) §技能目录写入禁令。
  - 机器人 / Agent 权限绑定单店铺、最小权限、日常角色非 admin → 见 [`shared/store-base-architecture.md`](store-base-architecture.md) §共享与权限边界。
- **面向用户的回复不暴露**任何 token / session key / app_token / record_id 等内部凭据或 ID。

---

## 这些 skill 的具体边界（自检清单）

写或改任何 tool 型 skill（生图 / 发布 / 抓取 / 客服自动化）时，对照：

- ✅ skill 只维护语义层 / 提示词层 / 质量闸门，把「做事」下沉给 ECS 入口或既定外部工具。
- ✅ 需要外部能力时，调一个**稳定入口**（CLI 薄壳或 ECS HTTP endpoint），不在 skill 里写鉴权 / 密钥 / 队列编排。
- ✅ 登录态动作走选型优先级：先问「有没有官方 API」，没有才考虑浏览器路径。
- ✅ 发布 / 写库 / 对外动作有显式确认门（与 [`shared/preamble.md`](preamble.md) §经营原则「授权才能发布」一致）。
- ❌ 不在 skill 里硬编码密钥 / token / 账号密码。
- ❌ 不替用户登录任何外部服务（登录由用户在租户浏览器 / profile 里人工完成）。
- ❌ 不把工具本体、队列、状态机塞进 skill 目录或工作区——通用能力走 git 提拔，店主口味偏好走服务端「我的偏好」设置层（skill-prefs）。

---

## 落地现状与迁移（诚实记录）

目标拓扑如上；当前 stack 有几处执行**还在 Mac mini 上**，属过渡形态，不是终态。新增能力一律按上文选型优先级，不照抄下列过渡现状：

| 能力 | 当前执行位置 | 目标拓扑 | 差距 / 迁移方向 |
|---|---|---|---|
| `image-synth` 生图 | **已上收 ECS**：中心后端 `POST /image/generate`（GPT Image 2 / OpenRouter） | 同左（已是目标态） | ✅ key / 配额 / 换模型都在后端一处，skill 经 `terminal` 调端点、不持 key、不传 model slug（per-profile token + idempotency）。见 image-synth `references/backend-image-gen-contract.md` |
| `pinterest-autopin` 发布 | **已上收 ECS**：yanggedianzhang 服务器控制面 + 现有浏览器插件（租户 Chrome 登录态执行） | 同左（已是 tier 2 目标态） | ✅ Hermes 只生成 + 调服务器工具，不持 Chrome / Playwright / 队列 / token；服务器做 job 状态机 / 鉴权 / 素材授权 / 结果回写 |
| 发布**编排**（巡检 / 锁 / 重试 / 死信） | **已上收 ECS**：yanggedianzhang publish dispatch（T5，常驻 tick，dormant-by-default） | 同左（已是目标态） | ✅ 队列调度 / 单写者锁 / 重试退避 / 幂等去重 / 崩溃恢复在服务端；`social-publisher` skill 退薄（只做配置 / 人工发布 / confirm-publish 闸 / 对账），不再 Hermes 手搓巡检。v1 不自动 confirm-publish（保留人工目视确认闸） |
| `trend-radar` 抓取 | Mac mini 上的 Node 脚本 + `SERPAPI_KEY` | 数据抓取走 ECS（tier 1，有 API），密钥存 ECS | 密钥目前在 Mac mini 是过渡；非租户特异的只读输入，优先迁 ECS |
| Etsy 站内信草稿 | 插件读会话 → ECS `/api/etsy-dm/draft` → 租户 Hermes profile 出草稿 → 回填不发送 | 已基本符合 tier 2（插件 + ECS 控制面 + Hermes 出文） | 端到端已验过；保持控制面在 ECS |
| 物流跟踪 | 17TRACK 公共引擎（register-once + 轮询 + 飞书推送） | tier 1（有 API），按租户路由 | 引擎已建；部署到目标租户 profile 时控制面在 ECS |

迁移只追加不破坏：上收某能力到 ECS 时，先双跑验证、保留旧路径只读，人工验收后再切换 skill 侧入口。

---

## 与其他 shared 协议的关系

| 关注点 | 看这里 |
|---|---|
| skill 目录只读、客户定制走工作区（基座/知识）或服务端偏好层、通用能力走 git | [`shared/preamble.md`](preamble.md) §技能目录写入禁令 |
| 店主长期偏好（服务端设置层：propose → 店主点卡确认，agent 无直接写入） | [`shared/skill-prefs.md`](skill-prefs.md) |
| 每店铺一 Base、机器人最小权限、客户共享边界 | [`shared/store-base-architecture.md`](store-base-architecture.md) |
| 基座层 / 应用层两层 skill 架构 + 依赖降级 | [`shared/dependency-protocol.md`](dependency-protocol.md) |
| 授权才能发布、事实不可自编 | [`shared/preamble.md`](preamble.md) §经营原则 |

一句话收尾：**这些 skill 是大脑，不是工具本体；想清楚再调入口，密钥和执行都不归你管。**
