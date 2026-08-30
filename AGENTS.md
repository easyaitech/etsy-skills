# Agents

本仓是电商运营 skill bundle(跑在 Hermes Agent 上)的开发仓库。仓库整体结构与各 skill 职责见 `README.md`。

## Agent skills

### Issue tracker

Issues 走本仓 GitHub Issues(用 `gh` CLI)。见 `docs/agents/issue-tracker.md`。

### Triage labels

沿用五个规范角色标签(needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix)。见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文布局:根目录 `CONTEXT.md` + `docs/adr/`(由 `/domain-modeling` 懒创建)。见 `docs/agents/domain.md`。
