# TODOS — business-knowledge

## P2: 后续迭代

- [ ] **详细引用记录 ledger** — 当前 v0 只保留 `引用次数` / `最后引用日期` 这两个隐藏 system-maintained 字段。等 listing + Marketing Brief 真实跑过一段时间后，再补 `date | scenario | SKU | output section | adopted/rejected` 级别的使用记录，用来支撑后续健康检查和知识有效性复盘。来源：CEO Review DEFERRED + Eng Review 8A (2026-05-16)
- [ ] **月度健康检查命令** — PR1 只保留健康检查规则和触发条件，不暴露 `/business-knowledge 做一次月度健康检查` 命令。至少积累 4 周 Knowledge Cards / Marketing Brief 使用数据后再实现，避免空库生成看似严肃但无用的报告。来源：CEO Review DEFERRED + Eng Review 2A (2026-05-16)
- [ ] **接入更多下游自动引用** — `listing-catalog` 已在 PR2 接入 Knowledge Cards lookup。`assets-library` shoot brief、`pinterest-autopin` 后续按真实使用频率逐个接入 canonical lookup contract，缺失时保持 SKIP，不阻塞原流程。来源：Eng Review 1A/4A (2026-05-16)

# TODOS — 社媒发布栈（目标态架构）

## P3: 后续 phase

- [ ] **publish-metrics 发布结果回收闭环** — 当前目标态只覆盖到「发布」，不覆盖发布后的结果回收。补一个反馈层 skill `publish-metrics`：回写每条 PublishIntent 的 `发布 URL / post id / 曝光 / 点击 / 保存 / 转化 / 失败原因分类`，喂回 publish-composer 让它学习哪些素材/文案有效。**Why**：没有 metrics，composer 永远在盲选素材和文案，发布是单向的而非闭环。**依赖/blocked by**：PublishIntent 契约定稿（带身份维度 + per-platform 语义）+ 各平台 adapter 具备结果回写能力（Pinterest 插件已回写发布 URL，曝光/互动需平台数据接口或插件抓取）。**起点**：先在 PublishIntent 加 metrics 列 + Pinterest adapter 回写基础 post id/URL，再逐平台补互动指标。来源：plan-eng-review Codex Outside Voice #16 (2026-06-26)

# TODOS — trend-radar

## P2: 后续迭代

- [ ] **细化零结果错误分类** — 当前 v0.1 统一用 exit 4 处理所有解析失败。等积累几周实际失败数据后，区分 `blocked`（consent/CAPTCHA 卡住）、`selector_miss`（DOM 结构变化）、`empty_valid`（该 geo 确实无数据）、`partial`（部分字段缺失）。不同分类对应不同的自动恢复策略。来源：Codex Outside Voice finding #11 + CEO Review D14 (2026-05-18)

## P3: 健壮性优化

- [ ] **原子写入** — 当前 JSON 和 latest.json 的写入顺序已保护（dated → latest），但未用 temp file + rename 原子操作。每周跑一次时半文件风险极低，但如果未来频率提高应实施。实现：writeFileSync 到 `.tmp` 后 renameSync。来源：Codex Outside Voice finding #12 + CEO Review D12 (2026-05-18)
- [ ] **evidence 保留策略** — 每周累积 screenshot + HTML snapshot，一年后 ~50-250MB。实现 runner 启动时自动清理 >12 周的旧目录，或提供 `trend-fetch cleanup --keep 12` 命令。来源：Codex Outside Voice finding #13 + CEO Review D13 (2026-05-18)

# TODOS — logistics-tracking

> **架构转向（2026-06-25）**：从"重 skill + Base 结构"改为"**ECS 后端常驻服务 + 薄 skill + mini CLI**"。轮询/限速/配额/幂等/状态映射都在后端服务（不在 Hermes、不在 skill markdown）。原 v2 的"Hermes cron + 多 workspace 枚举"作废——轮询是后端服务的内部循环，集中跑、天然覆盖所有租户。

## v1 已落地并验证（2026-06-25）
- [x] **后端 track 服务 + 薄 skill + mini CLI** — ECS 常驻 `track.service`（零依赖 node:sqlite、绑 tailnet 100.84.89.68:8790、源 ~/code/track-service、systemd）；薄 skill 进 etsy-skills bundle（指向 `~/.local/bin/track`，CLI 自带 `--noproxy` 绕 agent 代理）；**真实 4px 订单端到端验证**（agent 调 track → 正确已签收轨迹，比网页 auto-detect 还准）。

## 收尾 / 推广
- [ ] **铺到其余活跃租户** — 薄 skill 已 pilot 在 etsy-fublessings profile；合并本 PR 后对 tenant_mqj68naq/mqmbtu/mqoyzyp 重装 bundle（或手动放 skill）+ 确认各 profile 能调 `~/.local/bin/track`。
- [ ] **track-service 源码归一个 repo** — 现本地 ~/code/track-service + 部署在 ECS /opt/yanggedianzhang-ops/track，未版本控制。建议独立小 repo 或并进 yanggedianzhang monorepo（与 image-gen-service 同处理）。

## v2: 主动推送（C，用户原始诉求"主动发给我"）
- [ ] **Hermes 消费 `track changes` → 推消息 → 核查 → 确认才写 Base** — 后端已每天轮询并攒 changes；给租户 Hermes 配定时读 changes，签收/异常推飞书给运营者，**人工核查确认后**才由 Hermes 写 Base（不自动改）。核查需要的"始发地 + 近几条轨迹"届时在服务侧补返回（query/changes 现只回最新状态+最新事件）。
- [ ] **每租户月配额上限** — 共享 17TRACK key 下给每租户月注册上限，防旺客户吃光全局额度（getquota.quota_total，本账户 200）；服务 SQLite 已按租户可分，只差上限逻辑。来源：/plan-eng-review D2
- [ ] **多适配器（快递100/快递鸟）** — 查轨迹已收口在服务里；有客户重国内段/要中文支持时按 adapter 范式接国产源。来源：用户决定#3

## 已完成的 spike（2026-06-24/25，结论全落进 track-service 代码）
- [x] **17TRACK API 实测** — 重复 register `-18019901` 不重扣（幂等）；限速按 key、突发 2-3 发即 429（串行节流+429退避）；`/getquota` 实时查 quota_remain（配额护栏）；裸订单号 auto-detect 失败 `-18019903` 需带 carrier（**4px=190094**）；刚注册 `-18019909` 待抓取（异步，正常）；同号不同承运商会撞单 → 务必钉 carrier。
