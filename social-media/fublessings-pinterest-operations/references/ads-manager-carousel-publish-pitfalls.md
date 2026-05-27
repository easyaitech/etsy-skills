# Ads Manager Carousel Publish Pitfalls

Session: 2026-05-19 FuBlessings overdue Pin auto-publish.

## What happened

When publishing overdue carousel Pins through Pinterest Ads Manager Pin 图生成器:

1. `validate` passed.
2. `check-login` passed through live Chrome CDP `9225`.
3. Image upload, board selection, title, description, link and alt text succeeded.
4. Clicking the Pin 图生成器 modal `发布` button created an Ads Manager ad draft / ad creative state (`广告总计 (1)`), but the public profile `_created/` page did not expose a matching `/pin/.../` URL.
5. The tool failed while trying to verify by title on the public profile: `个人主页未找到标题匹配的新 Pin`.

Important: do **not** click the outer Ads Manager campaign `发布` button as a blind recovery step. That may publish/promote an ad campaign and can spend money.

## Confirmed UI observations

- After the modal publish attempt, Ads Manager showed `广告总计 (1)` and a campaign/ad draft interface.
- Public pages such as `https://jp.pinterest.com/FuBlessings/_created/` returned no visible Pin links for the newly generated title.
- This means “modal publish clicked” is not sufficient proof of a publicly accessible organic Pin.

## Board dropdown pitfall in Chinese Ads Manager UI

The board dropdown list can contain the target board text, but Playwright `getByText(candidate, { exact: false }).first()` may click a container/body match rather than the actual dropdown option.

Safer selection pattern:

1. Open `[data-test-id="board-dropdown-select-button"]`.
2. Prefer `getByText(candidate, { exact: true })`.
3. Iterate from last visible match to first visible match and click the actual visible option.
4. Fall back to fuzzy/DOM click only if exact visible matching fails.
5. Verify the dropdown button text contains the selected board name.

This exact-match-last-visible approach was manually verified for:

- `Meaningful Gifts for Mom & Dad`
- `The Calligrapher's Studio · Behind the Brush`

## Automation guardrail

For scheduled/automatic publishing:

- Treat missing public Pin URL as failure, even if Ads Manager has an ad draft.
- Do not mark Base as `已发` unless a verifiable `pin_url` exists.
- Pause or disable cron if it repeatedly creates Ads Manager drafts without public URLs.
- Keep every run to at most one Pin to avoid accumulating unknown drafts.

## Follow-up engineering tasks

Before resuming unattended carousel auto-publish, improve the publisher to either:

1. Retrieve the newly created public Pin URL from Ads Manager/ad creative state safely; or
2. Use an organic Pin creation route that returns a normal public Pin URL; or
3. Explicitly classify the result as `ads_draft_created_no_public_url` and require manual review.

Never solve this by publishing the outer ad campaign unless the user explicitly asks to run paid ads and confirms budget/scope.
