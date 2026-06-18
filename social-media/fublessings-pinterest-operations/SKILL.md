---
name: fublessings-pinterest-operations
description: FuBlessings / ETSY 工作区的 Pinterest 运营工作流：用户直接发送一组图片时，自动组装为一条 Pin Queue 任务；支持单图与 2–5 张轮播；包含飞书 Pin Queue 写入、Runtime JSON、内容稿、validate、发布回写与常见 CLI 坑。
layer: application
depends-on: [pinterest-autopin]
---

# FuBlessings Pinterest Operations

用于 FuBlessings / ETSY 工作区中的 Pinterest 日常运营任务，尤其是用户发送图片组后自动入队。

> 注意：本 skill 与 `pinterest-autopin` 有重叠；优先视为 FuBlessings 运营约定层，底层发布与 request schema 仍以 `pinterest-autopin` 为准。

补充参考：`references/2026-05-image-group-autopin.md` 记录了本工作流中验证过的飞书 CLI payload、Chrome profile 锁 CDP workaround 与品牌文案 guardrails。

补充参考：`references/ads-manager-carousel-publish-pitfalls.md` 记录了 2026-05-19 轮播 Pin 通过 Pinterest Ads Manager 发布时的关键坑：modal 内“发布”可能只生成广告草稿/素材而不暴露公开 Pin URL；自动发布不能因此标记已发，也不能盲点外层推广计划“发布”。

补充参考：`references/ads-manager-carousel-safety-and-cdp.md` 记录了本次修复沉淀：只接受公开 `/pin/<digits>/` URL、`ads_draft_created_no_public_url` 分类、Board 精确下拉选择、API response capture、以及 localhost CDP 受代理污染时的诊断办法。

补充参考：`references/ads-manager-board-selection-scope.md` 记录了 Ads Manager 轮播发布的关键坑：Board 名绝不能填进左侧 `定位详情 > 地点`；Board 选择器、搜索框和候选项都必须限定在右侧 `Pin 图生成器` 面板，无法确认时安全中止。

补充参考：`references/feishu-folder-to-pin-queue.md` 记录了用户给飞书云盘文件夹链接时，如何列出/下载文件、处理 lark-cli token redaction、按自然文件名排序、生成发布副本并写入 Pin Queue。

补充参考：`references/manual-reconcile-published-pin.md` 记录了当公开 Pinterest Pin 已存在但 Pin Queue 仍显示失败/缺 URL 时的人工回填流程：匹配公开 `/pin/<digits>/` URL、只更新目标行、清空失败原因并同步本地运营文档。

补充参考：`references/retry-failed-pins-and-alt-text.md` 记录了用户要求“失败的重试一下”时的 Pin Queue 筛选、逐条重试、成功/失败回写，以及单图 Alt Text 写入失败不应阻塞公开 Pin 发布的规则。

补充参考：`references/product-share-links-and-sku-linkage.md` 记录了商品型 Pinterest Pin 的专属分享链接规则：链接从商品 Base `分享链接` 取，并在 Pin Queue `关联 SKU` 中写入 SKU + 商品 record_id + Listing ID 以保证回溯。

补充参考：`references/social-asset-pool-to-pin-queue.md` 记录了从素材发布池/社交媒体新增图片批量生成 Pinterest Pin Queue 的流程：逻辑图片 vs 新素材行、按 SKU 视觉分组、生成去 metadata 发布副本、完整填写 Pin Queue、回写素材池、validate、以及 BM-001 这类缺少 `分享链接` 时的临时店铺链接 fallback。

补充参考：`references/single-image-vs-carousel.md` 记录了本次用户纠正后的规则：当用户要求“以单图形式 / 不要组合 / 每张都发”时，必须创建一图一 Pin；若已误建轮播草稿，要先删除未发布轮播记录，再创建单图记录并回写素材池。

补充参考：`references/single-vs-carousel-social-assets.md` 记录了批量社交媒体素材入 Pinterest 时"单图 vs 轮播"的决策规则，以及误建轮播后如何在未发布前删除草稿、重建单图 Pin、回写素材池、重新 validate 和备份旧内容稿。

补充参考：`references/2026-05-27-duplicate-publish-url-extraction-fix.md` 记录了 2026-05-27 修复的同一条 Pin 发布 3 次的 bug：URL 提取三层降级（stdout JSON → /tmp/published_pin_url.txt → 正则 raw stdout）+ upsert 指数退避 3 次 + 成功后清理 /tmp 文件，避免重复发布。

补充参考：`references/pin-url-profile-fallback.md` 记录了用户确认的 Pin URL 获取兜底策略：发布后工具拿不到 URL 时，先回 FuBlessings 账号首页/对应 Board 找最新公开 `/pin/<digits>/` 并匹配内容；首页找不到才判定发布失败，避免重复发布。

补充参考：`references/pinterest-publishing-cadence-and-inventory.md` 记录了用户确认的 Pinterest 默认发布节奏：每天 1 条汉字解释（每字 4 图轮播）+ 2 条商品/礼物图；以及 3 天安全库存阈值和 no-agent 库存提醒 cron 的静默检查模式。

## 触发条件

- 用户直接发送 1 张或多张图片，没有额外说明。
- 如果用户的问题上升为“持续往云文档/文件夹加素材，如何知道哪些清理过、入队过、发布过，且未来可能发多个平台”，先加载/使用 `content-asset-pool`；本 skill 只处理 Pinterest 任务本身。
- 用户说“这几张是一组 / 做成 Pinterest / 入队 / 发布这条 Pin”。
- 用户说“Pinterest 有几个失败的 / 重试失败的 / 再发一下失败项”：按 `references/retry-failed-pins-and-alt-text.md`，先筛选仍未发布记录，已公开发布但 Base 失败的走 reconcile，不要盲目二次发布。
- 用户要求把素材池 / 社交媒体文件夹里的新增图片全部安排 Pinterest，并填写 Pin Queue、关联商品。此时按 `references/social-asset-pool-to-pin-queue.md`：先以素材池记录为准，包含已去重后保留的旧资产行，再按用户指定格式生成任务。
  - 若用户明确说“以单图形式 / 不要组合 / 不要轮播 / 每张都发”，按 `references/single-image-vs-carousel.md` 创建一图一 Pin，不要按 SKU 合并成轮播。
  - 若用户明确说“这几张是一组 / 做成轮播 / carousel”，再按组创建轮播任务。
- 用户要求建立/调整 Pinterest 发布计划、内容配比、Board 路由、排期节奏或“队列库存不足提醒”。此时按 `references/pinterest-publishing-cadence-and-inventory.md`：默认每天 3 条（1 条汉字解释 + 2 条商品/礼物图），并用 3 天安全库存阈值提醒补素材。
- 用户要求修改 Pinterest/FuBlessings 自动发布相关 skill 或工具代码：skill / 运营约定层改动统一使用 `https://github.com/easyaitech/etsy-skills`。如果涉及底层 `Pinterest-autopin` 工具代码，先用 `etsy-stack pinterest-tool status` 和工具目录 `git remote -v` 核实真实来源、版本与分支；不要根据旧文档猜仓库。代码改动必须从 `origin/main` 新建 `codex/hermes-<short-task>` 分支、开 PR，runtime 等 PR 合并后再通过 `install.sh` 从 main/tag 更新。

## 图片组默认工作流

用户在 FuBlessings / ETSY 工作区直接发送一组图片、没有额外说明时，默认理解为：**新建一条 Pinterest Pin Queue 任务**，不是只做图片描述。

- 1 张图 → `单图` Pin。
- 2–5 张图 → 默认一条 `轮播` Pin，仅适用于用户表达为同一组图片时。
- 如果用户明确说“每张都发 / 以单图形式 / 不要组合 / 不要轮播”，即使是同一批上传，也必须拆成一图一 Pin。
- 同一组图片不要拆成多条任务，除非用户明确要求单图发布。
- 只有用户明确说“发布 / 发掉 / final publish”时，才执行真实发布。

## 入队步骤

1. 读取工作区上下文：`README.md`、`BRAND.md`、`SHOP.md`、`docs/pinterest-autopin-setup.md`。
2. 检查 Pinterest-autopin：`etsy-stack pinterest-tool status`，要求版本 `>= 1.4.0`。
3. 找到用户刚发送的图片缓存，确认尺寸与顺序；必要时用视觉识别提炼主题。
   - 如果用户给的是飞书云盘文件夹链接，而不是聊天图片，按 `references/feishu-folder-to-pin-queue.md`：用 `lark-cli drive files list` 列出文件，按文件名自然顺序下载到 workspace source cache，再进入同一条轮播入队流程。
4. 将图片复制/重存为 processed 文件：`<workspace>/.cache/pinterest-autopin/processed/`。
5. 生成英文 `Title (EN)`、`Description (EN)`、每张图独立 `Alt Text (EN)`。
   - 遵守 `BRAND.md`：不用功效动词，不神秘化，不主动放大未经考证的具体历史数字。
   - 图片上已有的具体历史数字可以在 Alt Text 中客观描述；Title/Description 不主动强化。
   - 如果这条 Pin 指向具体 Etsy listing，链接必须优先取商品 Base 的 `分享链接` 字段；不要临时拼 `https://www.etsy.com/listing/...`。若商品 Base 还没有 `分享链接` 字段，先在商品 Base 建文本字段并写入用户提供/确认的专属分享链接。
   - Pin Queue 的 `关联 SKU` 当前是文本追溯字段；创建商品型 Pin 时写成 `SKU | Product Base record <record_id> | Listing ID <listing_id>`，确保发布表能回溯到商品表。
6. 生成 Runtime request JSON：`<workspace>/.cache/pinterest-autopin/runtime/{pin_id}.json`。Runtime JSON 的 `link` 也必须使用商品 Base `分享链接`。
7. 创建本地内容稿：`<workspace>/output/social-media/{date}_{slug}_pinterest-carousel.md`。
8. 向飞书 `FuBlessings-Pin Queue` 写入一条记录，状态通常为 `待发`。
   - 如果 Pin 来源是商品 Base / listing 图片，必须在 `关联 SKU` 中写入可追溯商品关联：`<SKU> | Product Base record <record_id> | Listing ID <listing_id>`。当前 Pin Queue 的 `关联 SKU` 是文本字段，不是真正跨表关联；不要只写品类名或留空。
   - 如果使用商品 Base 的 `照片附件` token 下载遇到 HTTP 403，改从 `照片链接` 字段的 `https://my.feishu.cn/file/<file_token>` 中提取完整 file token 下载；详见 `references/product-base-listing-images-to-pin-queue.md`。
9. 运行 validate：`npm run pin:validate -- --input <绝对路径>`。
10. 更新 `docs/pinterest-autopin-setup.md` 历史记录。
11. 复查三处链接一致性：商品 Base `分享链接`、Pin Queue `Link`、Runtime JSON `link` 必须相同；如果本地内容稿记录了 Link，也同步更新。
12. 最终回复用户：Pin ID、状态、类型、标题、Board、validate 结果；不要暴露任何 token。

## 飞书 CLI 注意事项

- `lark-cli base +record-upsert` 单记录写入时，`--json` 必须是 raw field map；不要包成 `{ "fields": ... }`。
- `lark-cli base +record-search` 可用形态：

```json
{
  "keyword": "PIN-20260522-001",
  "search_fields": ["pin_id"],
  "page_size": 10
}
```

- 对用户可见的输出中必须 redact Base token、Folder token、Base URL token。
- proxy 警告和 lark-cli 版本提醒通常不阻塞。

## 发布计划与库存提醒

用户已确认 Pinterest 默认发布计划：每天 3 条内容。

- 每天 1 条汉字解释 / 文化科普：每个字通常做 4 图轮播，主 Board 用 `Chinese Calligraphy Meanings`。
- 每天 2 条商品 / 礼物图片：按商品或内容类型选择主 Board；单图/轮播遵守用户当前要求。
- 3 天安全库存阈值：汉字解释 >= 3 条、商品/礼物图 >= 6 条、总待发/草稿 >= 9 条。
- 当库存低于阈值时提醒用户补充素材；库存充足时不要打扰。

当前实现用 no-agent cron 跑静默库存脚本；详见 `references/pinterest-publishing-cadence-and-inventory.md`。如果调整发布频率，必须同步更新阈值、脚本、文档和用户说明。

## 自动发布 cron

2026-05-19 起，用户已明确要求在 Hermes Agent 内加入 Pinterest 自动任务，保证到时间的 Pin 可以自动发布。

当前生产配置：
- Cron 名称：`ETSY Pinterest AutoPin 到期自动发布`
- Cron ID：`d99651079542`
- Schedule：`*/30 * * * *`（每 30 分钟）
- Deliver：`origin`；无到期记录时最终回复 `[SILENT]` 抑制通知，成功/失败通过 cron 最终回复自动投递到 Feishu。不要在 cron 内调用 `send_message`。
- Worker：`/Users/songchou/workspaces/etsy/scripts/pinterest_auto_publish_due.py`
- 文档：`/Users/songchou/workspaces/etsy/docs/pinterest-autopin-setup.md` 的 Auto Publish Cron 小节。

自动发布守卫：
1. 只处理 `状态` 为 `待发` 或 `草稿` 的记录。
2. `pin_url` 必须为空。
3. `计划发布时间` 必须能解析出 CST 时间且 `<= 当前时间`。
4. `重试次数 < 2`。
5. 每次运行最多发布 1 条，按计划发布时间最早优先。
6. 自动流程固定为：读取 Pin Queue → 生成去掉 `chromeProfile` 的 `{pin_id}.cdp.json` → validate → check-login → final publish → 回写 Base → 更新本地 markdown。
7. 登录不可用或发布失败时不要绕过；记录失败原因并通知。注意：生产自动发布必须使用去掉 `chromeProfile` 的 CDP request；否则工具内部 final preflight 可能仍按 request-level `chromeProfile` 检查登录，误报 `Pinterest login required` 或 profile lock。
8. 若轮播 Pin 通过 Ads Manager 只创建了广告草稿/素材但拿不到公开 `pin_url`，立即暂停 cron 或保持失败状态，避免持续生成未知广告草稿；详见 `references/ads-manager-carousel-publish-pitfalls.md` 和 `references/ads-manager-carousel-safety-and-cdp.md`。
9. 成功判定必须严格校验 URL：只接受公开 Pinterest `/pin/<digits>/`，不得把 Ads Manager create/campaign URL、preview URL、API signal UUID 或页面 `finalUrl` 写入 `pin_url`。

如果后续要暂停/修改/删除这个自动任务：先 `cronjob(action='list')` 找到实际 job_id，不要猜；再用 `cronjob` update/pause/remove。

## 排期调整步骤

当用户要求“还没发布的 Pinterest 调整时间 / 每天发几条 / 按北美最佳时间排期”时，按运营排期任务处理，不触发真实发布：

1. 读取 `docs/pinterest-autopin-setup.md` 获取 Pin Queue Base token/table、字段名和本地内容稿约定。
2. 用 `lark-cli base +record-list` 拉取 Pin Queue，筛选未发布记录：`状态 != 已发` 且 `pin_url` 为空；不要改已发布记录。
3. 根据用户指定频率生成新 `计划发布时间`。如用户只说“北美最佳时间、每天两条”，默认使用两档：
   - `15:30 EDT / 12:30 PDT`（北美午间/下午档）
   - `20:30 EDT / 17:30 PDT`（北美晚间/下班后档）
   并附带北京时间：`（YYYY-MM-DD HH:mm CST）`。
4. 写入飞书前备份当前记录到 `<workspace>/.hermes/backups/pin-queue-reschedule-<timestamp>/records-before.json` 和 `schedule.json`。
5. 用 `lark-cli base +record-upsert --record-id <record_id> --json '{"计划发布时间":"..."}'` 逐条更新 Base。
6. 同步更新本地文档：
   - `docs/pinterest-autopin-setup.md` 对应历史行的 `planned publish`。
   - `output/social-media/*pinterest*.md` 中对应内容稿的 `计划发布时间` 行。
   修改前备份到 `<workspace>/.hermes/backups/pin-local-doc-reschedule-<timestamp>/`。
7. 复查 Base 和本地文档，最终只汇报 Pin ID → 新时间表、已更新位置和备份目录。

> 排期字段只是发布计划，不等于到点自动发布。除非用户明确要求创建/修改 Hermes cron 或立即 final publish，否则不要创建自动发布任务，也不要运行 publish。

## 发布步骤

当用户明确说发布某条 `PIN-...`：

1. 读取对应 Runtime JSON。
2. 先跑 validate。
3. 若用户要求 test，则跑 test 并让用户目视确认。
4. 用户明确 final / 发掉后再跑 publish。
5. 成功判定必须以拿到可验证的公开 `pin_url` 为准：只接受 Pinterest `/pin/<digits>/` URL；如果 Ads Manager 只出现 `广告总计 (1)` / ad draft，但个人主页、API response capture 或工具输出没有公开 `/pin/.../` URL，视为失败或待人工复核，不能标记 `已发`。
   - 单图 Pin 若只是 Alt Text 输入/确认失败，但标题、描述、链接、Board 与公开 Pin URL 均确认成功，Alt Text failure 只记 warning，不阻塞发布；按成功回写 Base，并清空失败原因。详见 `references/retry-failed-pins-and-alt-text.md`。
6. 严禁把 Ads Manager 外层推广计划的「发布」按钮当作自动恢复动作；那可能启动付费广告投放。只有用户明确要求投放广告并确认预算/范围时才可触发。
7. 若返回结构化错误 `ads_draft_created_no_public_url`，回写失败摘要，停止继续补发后续 Pin，并保持/暂停自动发布 cron，直到 check-login 与 final publish 重新验证稳定。
8. 成功后回写三处：
   - 飞书 Base：`状态=已发`、`pin_url`、`发布时间`、`失败原因=null`。
   - 本地内容稿：状态、发布时间、pin_url、Notes。
   - `docs/pinterest-autopin-setup.md`：queued 改 published，并写 Pin URL。
9. 尽量用浏览器/CDP 验证 Pin 页面标题、描述与访问网站入口可见。

## 已发布但 Base 仍失败的回填流程

当用户确认某条 `PIN-...` 已经在 Pinterest 公开发布，但 Pin Queue 仍停在 `失败`、`pin_url` 为空或失败原因残留时，不要重新 final publish。按 `references/manual-reconcile-published-pin.md` 做 reconcile：

1. 用 `lark-cli base +record-search` 定位 Pin Queue 目标行；该命令不要加 `--format json`。
2. 从公开 Pinterest profile/board 或用户给的 URL 中确认唯一公开 `/pin/<digits>/` 链接，并用页面 title/description 校验与 Pin Queue 文案一致。
3. 只对目标 record upsert：`状态=已发`、`pin_url=<public pin URL>`、`发布时间=<CST timestamp>`、`失败原因=null`。
4. 复查 Base，并同步 `docs/pinterest-autopin-setup.md` 与对应 `output/social-media/*pinterest*.md`。

## Chrome profile 锁 / CDP 登录检查解决

### Ads Manager Board 选择防误填地点

轮播 Pin 走 Ads Manager `Pin 图生成器` 时，页面左侧还有推广计划的 `定位详情 > 地点` 搜索框。Board 自动选择必须只操作右侧 `Pin 图生成器` 的 `选择图板` 下拉；不要用全页 Search 输入框、全页文本匹配或 `.last()` 作为 fallback。若看到 Board 名出现在左侧地点框，说明流程已偏离，必须停止并修复选择器，不要继续发布。详细修复模式见 `references/ads-manager-board-selection-scope.md`。

## Chrome profile 锁 / CDP 登录检查解决

如果 publish 或 check-login 报：

```text
Failed to create a ProcessSingleton for your profile directory
SingletonLock: File exists
```

说明 persistent Chrome profile 已被打开的 Chrome/Chromium 占用。不要把它直接判断为“未登录”。先检查 CDP。注意：本机可能设置 `http_proxy`，访问 localhost 时必须显式绕过代理，否则可能把 `127.0.0.1:9225` 请求发到代理并出现 502/timeout：

```bash
NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost curl -sS --max-time 2 http://127.0.0.1:9225/json/version
NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost curl -sS --max-time 2 http://127.0.0.1:9225/json/list
NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost curl -sS --max-time 2 http://127.0.0.1:9222/json/version
```

若能看到 Pinterest/FuBlessings 页面或 Ads create 页面，优先使用 CDP 方法：

1. 复制 `{pin_id}.json` 为 `{pin_id}.cdp.json`。
2. 从 `.cdp.json` 删除 `chromeProfile` 字段。
3. 使用：

```bash
python3 tools/pinterest_publish_pin.py --mode final --input <.../{pin_id}.cdp.json> --no-default-chrome-profile
```

登录态检查建议用 Ads 创建页，因为轮播/企业账号发布走 Ads Manager：

```bash
python3 tools/pinterest_publish_pin.py \
  --mode check-login \
  --no-default-chrome-profile \
  --creation-url 'https://ads.pinterest.com/ads/create/'
```

前提：本地 live Chrome CDP 可达，且已有 Chrome 保留 Pinterest 登录态。历史默认端口是 `9222`，当前更稳定的端口是 `9225`。

当前推荐检查命令：

```bash
python3 tools/pinterest_publish_pin.py \
  --mode check-login \
  --no-default-chrome-profile \
  --creation-url 'https://ads.pinterest.com/ads/create/'
```

当前本地 AutoPin 已做两项加固：
1. 默认自动探测 live CDP 端口 `9225 → 9222`；也可用 `PINTEREST_AUTOPIN_CDP_PORT` / `PINTEREST_CDP_PORT` 强制指定。
2. `test` / `final` 发布前自动跑 `check-login` preflight；若登录不可用，发布前中止。若 Chrome profile 已打开导致 lock，但 live CDP 可达，会自动切到 CDP，避免 `SingletonLock` 失败。

已见坑：
- 如果 `--no-default-chrome-profile` 走 CDP 时报 `Unexpected status 400 ... /json/version/`，说明工具把 CDP endpoint 传成了 `http://127.0.0.1:<port>` 后被 Playwright 追加尾斜杠；本地修复是让 `publish_playwright.js::resolveBrowserEndpointUrl()` 返回 `/json/version` 里的 `webSocketDebuggerUrl`。
- 如果 `9222` 超时但 `9225` 可达，不要直接判定未登录；当前工具默认会自动优先尝试 `9225`。

## Trend Radar / Pinterest Trends 登录与中文 UI 解析

当 `trend-radar` 跑 `pinterest-trends` 或 `pinterest-chinese` 时，如看到：

```text
Pinterest Trends 返回 0 条结果
页面没有返回包含 "chinese" 的关键词
```

不要立刻判断为没有数据。先用 live Chrome/CDP 打开：

```text
https://trends.pinterest.com/search/?country=US&trendsPreset=1&keywordsToInclude=chinese
```

若页面中有 `关键词 / 搜索量 / 每周变化 / 每月变化 / 每年变化`，说明是中文 UI，解析器必须支持中文表头。已验证修复：`trend-radar/scripts/sources/pinterest.ts` 需要同时识别英文 `Keywords / Weekly change / Monthly change / Yearly change` 和中文 `关键词 / 每周变化 / 每月变化 / 每年变化`。

如果复制 Chrome profile 给 headless Playwright 后仍跳 `showUnauthModal=true`，优先走 live CDP，不要依赖复制 profile：

```bash
PINTEREST_TRENDS_CDP_PORT=9225 trend-fetch pinterest-chinese --geo US
PINTEREST_TRENDS_CDP_PORT=9225 trend-fetch pinterest-trends --geo US
```

CDP 连接也要使用 `/json/version` 返回的 `webSocketDebuggerUrl`，不要直接把 `http://127.0.0.1:<port>` 传给 Playwright，否则可能遇到 `/json/version/` 400。

## 交付口径

回复用户应简洁，包含：

- `Pin ID`
- 状态：`待发` / `已发`
- 类型：单图或轮播 / 图片数量
- 若来自商品 Base：必须汇报已写入的商品关联（SKU、Product Base record_id、Etsy Listing ID/链接），确认 Pin Queue 能追溯到商品
- 若用户刚纠正了单图/轮播格式，必须说明旧格式草稿是否已删除/备份，避免用户担心会误发
- Title
- 主 Board 与同步 Board
- validate 或发布结果
- 如已发布，给 Pin URL

不要在普通入队完成后主动执行 final publish；可以提示用户“如要现在发，说：`PIN-... 发布掉`”。
