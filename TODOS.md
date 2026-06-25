# TODOS — video-assembly

## P2: 后续迭代

- [ ] **平台多规格输出** — 同一组合同时输出 9:16（竖屏）+ 1:1（方形），MVP 先只做 9:16。实现时可能需要 video_jobs 表加 `aspect_ratio` 字段或拆分为多条 job 记录。来源：CEO Review D7 DEFERRED (2026-05-10)
- [ ] **负面反馈闭环** — rejected 组合的信号反哺兼容性规则，自动收紧低质量片段组合。来源：Codex Outside Voice finding #4
- [ ] **音乐版权合规** — 建立免版权音乐库管理机制，标注来源和许可类型。来源：Design Doc Open Question #2

# TODOS — business-knowledge

## P2: 后续迭代

- [ ] **详细引用记录 ledger** — 当前 v0 只保留 `引用次数` / `最后引用日期` 这两个隐藏 system-maintained 字段。等 listing + Marketing Brief 真实跑过一段时间后，再补 `date | scenario | SKU | output section | adopted/rejected` 级别的使用记录，用来支撑后续健康检查和知识有效性复盘。来源：CEO Review DEFERRED + Eng Review 8A (2026-05-16)
- [ ] **月度健康检查命令** — PR1 只保留健康检查规则和触发条件，不暴露 `/business-knowledge 做一次月度健康检查` 命令。至少积累 4 周 Knowledge Cards / Marketing Brief 使用数据后再实现，避免空库生成看似严肃但无用的报告。来源：CEO Review DEFERRED + Eng Review 2A (2026-05-16)
- [ ] **接入更多下游自动引用** — `listing-catalog` 已在 PR2 接入 Knowledge Cards lookup。`assets-library` shoot brief、`pinterest-autopin`、`video-assembly` 后续按真实使用频率逐个接入 canonical lookup contract，缺失时保持 SKIP，不阻塞原流程。来源：Eng Review 1A/4A (2026-05-16)

# TODOS — trend-radar

## P2: 后续迭代

- [ ] **细化零结果错误分类** — 当前 v0.1 统一用 exit 4 处理所有解析失败。等积累几周实际失败数据后，区分 `blocked`（consent/CAPTCHA 卡住）、`selector_miss`（DOM 结构变化）、`empty_valid`（该 geo 确实无数据）、`partial`（部分字段缺失）。不同分类对应不同的自动恢复策略。来源：Codex Outside Voice finding #11 + CEO Review D14 (2026-05-18)

## P3: 健壮性优化

- [ ] **原子写入** — 当前 JSON 和 latest.json 的写入顺序已保护（dated → latest），但未用 temp file + rename 原子操作。每周跑一次时半文件风险极低，但如果未来频率提高应实施。实现：writeFileSync 到 `.tmp` 后 renameSync。来源：Codex Outside Voice finding #12 + CEO Review D12 (2026-05-18)
- [ ] **evidence 保留策略** — 每周累积 screenshot + HTML snapshot，一年后 ~50-250MB。实现 runner 启动时自动清理 >12 周的旧目录，或提供 `trend-fetch cleanup --keep 12` 命令。来源：Codex Outside Voice finding #13 + CEO Review D13 (2026-05-18)

# TODOS — logistics-tracking

## v2: 无人值守 + 多租户（v1 完成并跑稳后）
- [ ] **无人值守每日 cron + 多 workspace 枚举** — v1 是手动触发跑单 workspace；v2 接 Hermes 真·每日 cron 自动化并枚举所有租户 workspace。**先 spike**：Hermes 用 crontab/launchd/runtime scheduler 哪种、怎么发现要扫哪些 workspace、某 workspace 权限失效是跳过还是告警。这是 v1 没解决的唯一核心机制。来源：/plan-eng-review D11 + Codex Outside Voice #6 (2026-06-24)
- [ ] **每租户月配额上限** — 共享 17TRACK key 下给每个租户一个月注册上限，防一个旺客户吃光全局月额度（以 `getquota.quota_total` 为准，本账户实测 200）连坐其他客户；超额排队或人工提级。中央运营表计数器已按租户可分，只差上限逻辑。来源：/plan-eng-review D2 + Codex #3 (2026-06-24)
- [ ] **多适配器（快递100/快递鸟）** — v1 查轨迹已收口成单一调用点；有客户更看重国内段或要中文支持时，按 social-publisher adapter-registry 范式接国产数据源。来源：用户决定#3 + /plan-eng-review D6 (2026-06-24)

## P2: 上线前 spike（v1 实现 T3/T4 前必须实测）
- [x] **17TRACK 重复注册 + 限速语义** — ✅ 实测完成 (2026-06-24)：重复 register 返回 `-18019901`、**不重扣额度**（幂等安全，D5 放松）；限速按 **key 维度**、突发 ~2-3 发即 429、~1-2s 恢复（D9 串行节流+429 退避坐实）。意外收获：`/getquota` 可实时查 `quota_remain`，D2 配额护栏改查它不自维护计数器。结果已回填 17track-adapter.md / sweep-contract.md / base-schema.md。来源：Codex Outside Voice #5/#17 (2026-06-24)
