# Wiki Style and Merge Policy

Wiki 文件保存跨周主题知识。

路径：

```text
<workspace>/knowledge/wiki/{topic-slug}.md
```

## Page shape

```markdown
# {Topic}

## Current Working Understanding
- What we currently believe.

## Useful Signals
- YYYY-WW: signal summary, linked to weekly notes.

## Business Uses
- Listing:
- Shooting:
- Pinterest:
- TikTok:

## Boundaries
- Where not to apply this topic.

## Contradictions / Needs Review
- Conflicting signals or unclear cases.

## Superseded Notes
- Older assumptions that changed, with reason.

## Source Log
- YYYY-WW: ../weekly/YYYY-WW.md
```

## Merge policy

- Default to append / merge. Do not rewrite the whole page.
- Preserve `Source Log`.
- Preserve `Boundaries` unless the new evidence explicitly changes them.
- If `Current Working Understanding` changes, move the old understanding into `Superseded Notes` and explain why.
- If evidence conflicts, add `Contradictions / Needs Review`; do not silently choose the newer source.
- If a topic page does not exist, create it using the page shape above.

The goal is compounding memory, not a weekly summary wearing a wiki costume.
