# TODOS — video-assembly

## P2: 后续迭代

- [ ] **平台多规格输出** — 同一组合同时输出 9:16（竖屏）+ 1:1（方形），MVP 先只做 9:16。实现时可能需要 video_jobs 表加 `aspect_ratio` 字段或拆分为多条 job 记录。来源：CEO Review D7 DEFERRED (2026-05-10)
- [ ] **负面反馈闭环** — rejected 组合的信号反哺兼容性规则，自动收紧低质量片段组合。来源：Codex Outside Voice finding #4
- [ ] **音乐版权合规** — 建立免版权音乐库管理机制，标注来源和许可类型。来源：Design Doc Open Question #2
