# Future Health Check Rules

Monthly Health Check is not a v0 command.

Implement only after at least 4 weeks of real Knowledge Cards and Marketing Brief usage.

Future trigger:

```text
/business-knowledge 做一次月度健康检查
```

Future output:

1. Expired candidates.
2. Cards never used.
3. Cards repeatedly used.
4. Wiki contradictions.
5. Cards that may deserve promotion into `BRAND_MARKETING.md` / `MARKETING_PLATFORM.md`.

## Preconditions

- At least 4 weekly notes exist.
- `Knowledge Cards 知识卡片` 表 has enough active/watch cards to review.
- `引用次数` / `最后引用日期` have been best-effort maintained by real workflows.
- At least one Marketing Brief has been generated or explicitly skipped.

Until then, keep this as rules only. Do not expose a command that produces empty authority.
