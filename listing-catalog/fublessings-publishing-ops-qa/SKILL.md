---
name: fublessings-publishing-ops-qa
description: "Operational QA for FuBlessings publishing surfaces after content goes live: verify actual Etsy buyer-facing pages through live Chrome/CDP rather than relying on Base, and harden scheduled Pinterest AutoPin publishing jobs by converting deterministic cron tasks to script-only wrappers when LLM/provider failures occur."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [fublessings, etsy, pinterest, cron, live-page-audit, publishing-qa]
    related_skills: [etsy-live-listing-audit, pinterest-autopin, hermes-agent]
---

# FuBlessings Publishing Ops QA

## When to use

Use this skill when the user asks to check a published FuBlessings Etsy/Pinterest surface or a scheduled publishing automation, especially:

- “我已经更新 Etsy listing 了，检查还有什么问题”
- “不要根据 Base，按实际店铺展示检查”
- “用 Pinterest 自动发布的 Chrome Profile 打开 Etsy 页面”
- “Cron job Pinterest AutoPin failed / provider 403 / 改成 script-only”

This skill is a local operational overlay. If `etsy-live-listing-audit` or `pinterest-autopin` is editable in the current profile, patch those first; if not, follow this skill and mention overlap for curator consolidation.

---

## Principle: actual buyer-facing page beats Base

For live listing audits, Product Base is not the source of truth for what buyers see. It is useful for fallback/context only.

Preferred verification order:

1. Open the actual Etsy URL in an authenticated/live Chrome session.
2. Capture buyer-visible text, screenshots, title, price, variation selector, personalization prompt, policy display, seller block, image order, and JSON-LD/FAQ if available.
3. Compare actual display against BRAND.md / SHOP.md and the listing’s intended promise.
4. Use Base only after actual page access fails; label any Base-only conclusion clearly.

## Using Pinterest AutoPin live Chrome/CDP for Etsy pages

When normal browser/web extraction is blocked by Etsy/DataDome, reuse the Pinterest AutoPin live Chrome profile/CDP if it is open.

Typical probe:

```bash
curl -sS http://127.0.0.1:9225/json/version
```

Then connect by Playwright/CDP, open the Etsy listing, and save sanitized evidence:

- `body_text.txt`
- top + scroll screenshots
- page title and canonical/current URL
- meta description / OG title / OG image
- JSON-LD Product / Breadcrumb / FAQ snippets
- DOM state for variations and personalization fields

Never save or report cookies, CSRF values, auth headers, raw request headers, session IDs, or DevTools internal URLs.

## Etsy audit checks to prioritize

1. Personalization field: required vs optional, character limit, prompt clarity, and conflicts with description.
2. Variations: default selection, style names, and whether style chart matches buyer choices.
3. Policies: public policy display vs description vs FAQ, especially custom-item returns/exchanges.
4. Shipping: displayed delivery estimates vs SHOP.md; standard vs expedited promises.
5. Gift presentation promises: images and wording must match actual packaging inclusions; avoid overpromising freebies.
6. Title and first-screen conversion: first 60–70 chars should contain personalized/custom + product + gift intent where possible.

## Pinterest AutoPin cron hardening

If a Pinterest AutoPin cron fails before script execution with model/provider errors such as `403 Terms Of Service` from a chat-completions endpoint, the failure is in the LLM-driven cron architecture, not necessarily Pinterest, Chrome, Pin Queue, or the publish script.

Recommended fix for deterministic publishing checks:

1. Create a profile script wrapper, e.g. `pinterest_auto_publish_due_notify.py`.
2. The wrapper runs `/Users/songchou/workspaces/etsy/scripts/pinterest_auto_publish_due.py`.
3. Wrapper behavior:
   - `status == no_due` → print nothing; no_agent cron stays silent.
   - `status == published` or `published_reconciled_from_profile` → print concise Chinese success message with Pin ID, published time, Pin URL.
   - `status == failed` or non-zero publisher output → print concise Chinese failure message with Pin ID, stage, reason.
   - invalid JSON → print a compact failure alert.
4. Update cron to:

```text
no_agent = true
script = pinterest_auto_publish_due_notify.py
profile = etsy-fublessings
workdir = /Users/songchou/workspaces/etsy
deliver = origin
skills = []
enabled_toolsets = []
```

5. Manually run the wrapper once; if there is no due pin, stdout should be empty.
6. Trigger/list the cron and verify `last_status = ok`.

This avoids sending Pinterest automation prompts and skill text to the model every 30 minutes, preventing provider 403/TOS failures and reducing token use.

## Reporting format

Use concise Chinese:

1. `总体结论`
2. `必须尽快修正`
3. `建议优化`
4. `后台/自动化仍需确认`
5. evidence path if saved, without secrets

Always distinguish actual page evidence, Base/source records, backend assumptions, and cron scheduler state vs script publisher state.
