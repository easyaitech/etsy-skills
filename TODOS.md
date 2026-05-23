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

# TODOS — photo-style

## P2: 后续迭代

- [ ] **高置信度图片自动入队** — 当前 v0 先走 `photo-style` 本地 contact sheet 人工批准，所有图片必须批准后才允许写入平台队列。等 2-3 批真实图片跑完、manifest 中的 QA 结果 / 人工批准结果 / 处理参数能证明通过率稳定后，再支持“高置信度自动入队，低置信度继续人工批准”。这样可以减少重复点击，但不能在缺真实失败数据时提前放开，否则坏图会被自动送进 Pinterest/Instagram 队列。依赖：`photo-style` v0 manifest 已记录 QA 结果、人工批准结果和处理参数。来源：Eng Review TODO Candidate 1 (2026-05-23)
- [ ] **Photo Style Jobs Base** — 当前 v0 不建新的多维表格，先用本地 HTML contact sheet + batch manifest 完成人工批准和追溯；如果后续出现多人协作、跨机器处理、批次很多或需要长期统计，再升级为 `Photo Style Jobs` Base，记录每张图的状态、失败原因、style version、approval 和 queued target。不要在第一版凭空设计字段，先等 v0 manifest 跑过几批真实图片后再固化长期 schema。依赖：`photo-style` v0 manifest 字段稳定，并至少跑过几批真实图片。来源：Eng Review TODO Candidate 2 (2026-05-23)

# TODOS — trend-radar

## P2: 后续迭代

- [ ] **细化零结果错误分类** — 当前 v0.1 统一用 exit 4 处理所有解析失败。等积累几周实际失败数据后，区分 `blocked`（consent/CAPTCHA 卡住）、`selector_miss`（DOM 结构变化）、`empty_valid`（该 geo 确实无数据）、`partial`（部分字段缺失）。不同分类对应不同的自动恢复策略。来源：Codex Outside Voice finding #11 + CEO Review D14 (2026-05-18)

## P3: 健壮性优化

- [ ] **原子写入** — 当前 JSON 和 latest.json 的写入顺序已保护（dated → latest），但未用 temp file + rename 原子操作。每周跑一次时半文件风险极低，但如果未来频率提高应实施。实现：writeFileSync 到 `.tmp` 后 renameSync。来源：Codex Outside Voice finding #12 + CEO Review D12 (2026-05-18)
- [ ] **evidence 保留策略** — 每周累积 screenshot + HTML snapshot，一年后 ~50-250MB。实现 runner 启动时自动清理 >12 周的旧目录，或提供 `trend-fetch cleanup --keep 12` 命令。来源：Codex Outside Voice finding #13 + CEO Review D13 (2026-05-18)
