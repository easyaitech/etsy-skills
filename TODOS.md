# TODOS — video-assembly

## P2: 后续迭代

- [ ] **平台多规格输出** — 同一组合同时输出 9:16（竖屏）+ 1:1（方形），MVP 先只做 9:16。实现时可能需要 video_jobs 表加 `aspect_ratio` 字段或拆分为多条 job 记录。来源：CEO Review D7 DEFERRED (2026-05-10)
- [ ] **负面反馈闭环** — rejected 组合的信号反哺兼容性规则，自动收紧低质量片段组合。来源：Codex Outside Voice finding #4
- [ ] **音乐版权合规** — 建立免版权音乐库管理机制，标注来源和许可类型。来源：Design Doc Open Question #2

# TODOS — business-knowledge

## P2: 后续迭代

- [ ] **详细引用记录 ledger** — 当前 v0 只保留 `引用次数` / `最后引用日期` 这两个隐藏 system-maintained 字段。等 listing + Marketing Brief 真实跑过一段时间后，再补 `date | scenario | SKU | output section | adopted/rejected` 级别的使用记录，用来支撑后续健康检查和知识有效性复盘。来源：CEO Review DEFERRED + Eng Review 8A (2026-05-16)
- [ ] **月度健康检查命令** — PR1 只保留健康检查规则和触发条件，不暴露 `/business-knowledge 做一次月度健康检查` 命令。至少积累 4 周 Knowledge Cards / Marketing Brief 使用数据后再实现，避免空库生成看似严肃但无用的报告。来源：CEO Review DEFERRED + Eng Review 2A (2026-05-16)
- [ ] **接入更多下游自动引用** — PR2 先接 `listing-catalog`。`assets-library` shoot brief、`pinterest-autopin`、`video-assembly` 后续按真实使用频率逐个接入 canonical lookup contract，缺失时保持 SKIP，不阻塞原流程。来源：Eng Review 1A/4A (2026-05-16)
