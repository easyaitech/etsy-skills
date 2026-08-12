# Skills 代码审核报告

| 项目 | 内容 |
|---|---|
| 审核日期 | 2026-07-05 |
| 审核范围 | `etsy-skills` 全部代码 |
| 审核分支 | `codex/order-shipping-cost-currency` |
| 审核依据 | gstack `/review` checklist（CRITICAL + INFORMATIONAL 分类） |
| 审核方式 | 按模块分派并行审查 + 头部 finding 二次核验 |

## 模块清单

| 模块 | 语言 | 是否纳入父仓库版本控制 | 文件数 |
|---|---|---|---|
| `trend-radar/scripts/` | TypeScript | ✅ 是 | ~2300 行 |
| `image-synth/scripts/` | TypeScript | ✅ 是 | ~900 行 |
| `install.sh` / `scripts/check-update.sh` | Bash | ✅ 是 | 280 行 |
| `tools/Pinterest-autopin/` | Python | ❌ 否（见 S1） | 35 文件 |

---

## 执行摘要

**总计 55 个 finding：1 个仓库结构重大问题，约 12 个 P0/P1，其余 P2/P3。**

三个最该先动的问题：

1. **Pinterest stuck-row 回收簇**（worker.py prepare/publish 无回收 + `can_reclaim` 死代码）——线上正确性 bug，行会永久卡住。
2. **image-synth `models-list.ts:17` fetch 无超时** + **`bench.ts:67` seed NaN**——一行级机械修复。
3. **仓库结构 S1**：把 Pinterest-autopin 改成 submodule 或正常纳管，结束"父仓库不可见 + 已公开"的最差组合。

---

## 🔴 仓库结构问题（最严重）

### S1. `tools/Pinterest-autopin/` 是被 `.gitignore` 屏蔽的嵌套公开仓库

- `etsy-skills/.gitignore:13` 含 `/tools/`，导致 `tools/Pinterest-autopin/`（35 个 Python 文件 + 测试）在**父仓库里完全不纳入版本控制**。
- 但它本身是一个独立 git 仓库，remote 指向 **公开仓库** `https://github.com/easyaitech/Pinterest-autopin.git`（其 `.gitignore` 自述 "This repository is public"）。
- **后果：**
  - 在 `etsy-skills` 工作的人 `git status` 看不到这块代码
  - 父仓库 CI 不会跑它的测试
  - code review 流程（包括 /review 的 diff-based 流程）覆盖不到它
  - 但它对外公开——任何已提交的敏感信息都对外可见
- **建议：** 做成 git submodule（明确版本锁定 + 父仓库可见），或移到父仓库内正常纳管。当前"父仓库 ignore + 子仓库公开"是最差组合：不可见 + 已公开。
- **附加动作：** 既然是公开仓库，建议单独跑一次历史 secret 扫描（`trufflehog`/`gitleaks`），本次未做 `git log -p` 扫描。

### S2. `tools/Pinterest-autopin/` 目录命名大小写混乱

目录名是 `Pinterest-autopin`（大写 P），但 skill 名、子包、install 引用大多是 `pinterest-autopin`/`pinterest_autopin`。macOS 默认不区分大小写能跑，但在 Linux CI / Docker 里会撞墙。

---

## trend-radar（已纳管，TypeScript）

总体质量较好：无 shell 注入、无 `eval`、`dynamic import` 有白名单校验、正则无 ReDoS、决策枚举穷尽。

| 级别 | 置信度 | 位置 | 问题与修复 |
|---|---|---|---|
| P2 | 7/10 | `runner.ts:251` | `writeFileSync(datedPath,...)` 非原子，紧接着 `copyFileSync(datedPath, latestPath)`。崩溃中途留下损坏 JSON。**讽刺的是同仓库 `fit-report.ts:712` 专门写了 `writeAtomic`（tmp+rename）并测了它，runner 没用。** Fix: runner 复用 `writeAtomic`。 |
| P2 | 7/10 | `fit-report.ts:341,347` + `assertTrendRun:163` | `rank` 未校验是数字。从磁盘读的 JSON 若 `rank` 缺失/非数字，`a.rank-b.rank` 返回 NaN（排序失效），`Math.min(...ranks)` 变 NaN。Fix: `assertTrendRun` 里 `Number(entry.rank)`，回退 `Infinity`。 |
| P2 | 8/10 | `sources/google-trends-chinese.ts:83` | `fetch(buildSerpApiUrl(...))` 无超时、无重试上限。SerpApi 卡住 → CLI 永久挂起。Fix: `AbortSignal.timeout(30_000)`。 |
| P2 | 5/10 | `sources/google-trends-chinese.ts:76,100` | API key 在 URL query 里，错误信息插值 `err.message`，若 undici 暴露 request URL 会泄露 key。Fix: key 走 header，或错误文本里洗掉 URL。 |
| P2 | 6/10 | `sources/google-trends-chinese.ts:183` | `trend_url: item.link \|\| fallback` 把 SerpApi 返回的任意 URL 当证据渲染，无 scheme/host 校验。Fix: 要求 `item.link` 以 `https://trends.google.com/` 开头。 |
| P3 | 6/10 | `sources/erank-trend-buzz.ts:256` | `.catch(err => ${err.message})` 没有 `instanceof Error` 守卫，非 Error throw 会得到 "undefined"。同文件 277 行有守卫，不一致。Fix: `err instanceof Error ? err.message : String(err)`。 |
| P3 | 5/10 | `sources/erank-trend-buzz.ts:161` + `sources/pinterest.ts:212` | `fetch(\`http://127.0.0.1:${cdpPort}/json/version\`)` 无超时，且 `cdpPort`（env）未校验为数字就插值进 URL。Fix: `/^\d+$/.test(cdpPort)` + `AbortSignal.timeout(5000)`。 |
| P3 | 4/10 | `sources/google-trends.ts:185` | bare `catch {}` 吞掉 consent-overlay 循环的所有错误，掩盖真实 Playwright 故障。 |

**测试盲区：** `rank-NaN`、SerpApi 超时、CDP fetch 路径、google-trends-chinese 链接校验 都没测。

**已验证 OK：** `parseTrendingPage`/`parseTrendingText` 正则无 ReDoS；`numericValue` 递归终止；决策枚举（可做/观察/不做）穷尽；`SERPAPI_KEY` 来自 env 非硬编码；`dynamic import` 前有 `KNOWN_SOURCES` 白名单。

---

## image-synth（已纳管，TypeScript）

| 级别 | 置信度 | 位置 | 问题与修复 |
|---|---|---|---|
| P1 | 9/10 | `models-list.ts:17` | `fetch(ENDPOINT, {headers})` **无超时**。OpenRouter 挂起 → 进程永久挂起。其它 3 个 client 都有超时，唯独这个漏了。Fix: 加 `AbortController` + 30s。 |
| P1 | 9/10 | `bench.ts:67` | `Number(arg("seed"))` 无 NaN 守卫。`--seed abc` → `NaN`，`opts.seed != null` 通过（NaN 非 null），最终把 `seed: NaN` 发给 provider，静默产生垃圾请求。Fix: `Number.isNaN` 校验后 `fail(EXIT_USAGE, "--seed 必须是数字")`。 |
| P1 | 7/10 | `fal.ts:87` / `volcengine.ts:92` | 二次 `fetch(item.url)`/`fetch(url)` 下载生成图，无超时、无 scheme 校验。URL 来自 provider JSON（provider 可控），有 SSRF/挂起风险。Fix: 校验 `new URL(url).scheme === 'https:'` + 超时。 |
| P2 | 9/10 | `bench.ts:40-42` | `arg(name)` 返回 `process.argv[i+1]` 即使 undefined。`--resolution`（无值）和缺失不可区分。Fix: `argv[i+1] === undefined` 时 `fail()`。 |
| P2 | 9/10 | `bench.ts:47-54` | `readJson` 直接 `as T` 强转未校验的 JSON。损坏的 `models.json`/`cases.json` 触发混乱的下游错误。Fix: 校验必需字段或上 zod。 |
| P2 | 9/10 | `bench.ts:82` | `casesCfg.products` 若缺失（虽然类型必填），未受控 JSON 会抛原始 TypeError。Fix: `casesCfg.products ?? []`。 |
| P2 | 9/10 | `bench.ts:233` | 全部失败时 `process.exit(EXIT_USAGE)`（=1，用法错误）。其实是运行失败，exit code 误导 CI。Fix: 单独 `EXIT_NO_SUCCESS`。 |
| P2 | 9/10 | `report.ts:143` | `<a href="./${escapeAttr(r.outPath)}">` 安全，但同模板里 `src="${productThumbs[k]}"` 未转义。当前 `productThumbs` 值总是 data URI 所以安全，但建议防御性 `escapeAttr`。 |
| P3 | 9/10 | `report.ts:53-57` | `PRICE_HINT` 一堆内联费率字面量（0.039/0.134…），无来源/日期，会和真实定价漂移。Fix: 集中 + 注释来源日期。 |
| P3 | 9/10 | `openrouter.ts:62`/`fal.ts:46`/`volcengine.ts:58` | 超时魔数 `120_000`/`180_000` 重复，无常量。Fix: `DEFAULT_TIMEOUT_MS`。 |
| P3 | 8/10 | `volcengine.ts:4`/`fal.ts:4`/`models-list.ts:4`/`openrouter.ts:6` | host URL 硬编码为模块常量，只有 Volcengine 支持 base URL env 覆盖（`ARK_BASE_URL`）。不一致，影响可测性。 |
| P3 | 9/10 | `openrouter.ts:97`/`fal.ts:85` | `chatUrl.split(",")[1]` 假设恰好一个逗号；多逗号的 data URI 会截断 base64。Fix: `url.slice(url.indexOf(",") + 1)`。 |
| P3 | 9/10 | `bench.ts:221-226` | 3 个 `writeFileSync` 非原子，`stamp()` 秒级精度 → 同秒并发 bench 互相覆盖。Fix: tmp+rename，stamp 加毫秒。 |
| P3 | 9/10 | `types.ts:11`/`report.ts:11` | `provider` 默认 `"openrouter"` 在 bench.ts 多处用 `??` 重复，无单一来源。Fix: `defaultProvider()` helper。 |

**已验证 OK：** 无硬编码 secret（全部 env：`OPENROUTER_API_KEY`/`FAL_KEY`/`ARK_API_KEY`）；`safeName` 正确防路径穿越；3 个 provider client 都有 `res.ok` 检查 + 超时（除二次下载 fetch）；HTML 转义在各自上下文正确。

**测试盲区：** 3 个 fetch client、bench 编排、cost 提取、models-list——最易出 bug 的 HTTP 解析层零覆盖，只有 `report.ts` 纯函数和 `buildArkBody` 有测。

---

## install.sh / scripts/check-update.sh（已纳管）

| 级别 | 置信度 | 位置 | 问题与修复 |
|---|---|---|---|
| P1 | 8/10 | `check-update.sh:86-88` | `touch LAST_CHECK` 后才写 `LATEST_TAG`/`LATEST_MAIN`，**无原子 rename**。SIGINT 中途 → 缓存半写（新时间戳 + 空 tag），静默压制更新通知 24h。Fix: 写 tmp 再 `mv`。 |
| P2 | 9/10 | `install.sh:5,8,14` + README | curl \| bash 模式，无 checksum 校验。Fix: 发布 sha256 并校验，或至少把"先看再跑"作为主推路径。 |
| P2 | 7/10 | `install.sh:75-94` | heredoc 直接执行 repo 里的 Python（操作 `$HERMES_SKILLS_DIR`、还 `os.unlink`），等价于"下载即执行任意 Python"，根因同上。Fix: pin 到签名 tag 并验签后再跑。 |
| P2 | 8/10 | `install.sh:149` | `npm install` 跑 lifecycle scripts（用户权限）。可接受但需文档化信任边界。 |
| P2 | 8/10 | `install.sh` + `check-update.sh` | `ETSY_SKILLS_HOME`/`ECOMMERCE_SKILLS_HOME` 等 env 无路径校验。设成 `/etc` 就往那 clone。Fix: 校验路径在 `$HOME` 或已知前缀下。 |
| P2 | 7/10 | `check-update.sh:18` | `mkdir -p "$CACHE_DIR" 2>/dev/null \|\| exit 0` 吞掉 mkdir 错误。CACHE_DIR 不可写时脚本静默 exit 0，更新通知永不触发。Fix: 首次失败记一条 stderr。 |
| P2 | 7/10 | `check-update.sh:12` | `mkdir -p` 无 mode，目录继承 umask。低敏感（无 secret）但模式本身值得修。Fix: `mkdir -p -m 0700`。 |
| P3 | 6/10 | `install.sh:128` | `chmod +x` 两个特定文件，不存在时在 `set -e` 下报错。Fix: `[[ -e ... ]]` 守卫。 |
| P3 | 6/10 | `install.sh:161` | `git describe --tags --always` 无 tag 时 emit short sha，报告成"版本：xxx"略误导。 |
| P3 | 6/10 | `install.sh:105,119` | backup=`$dst.bak.$(date +%s)` 秒级，同秒第二次备份覆盖第一次。Fix: 加 `$$`。 |
| P3 | 7/10 | `install.sh:50` | `git merge --ff-only "@{u}"` 要求配置 upstream，未配置时错误被 warn 吞掉。 |

---

## tools/Pinterest-autopin（未纳管，但公开）

⚠️ 这块代码**对外公开但不经父仓库 review/CI**——所以下面每一条都该按"生产暴露面"看。

### 最严重：stuck-row / 无回收 簇

| 级别 | 置信度 | 位置 | 问题与修复 |
|---|---|---|---|
| P1 | 9/10 | `worker.py:297-302` + `_eligible_for_prepare` | prepare 路径写 `preparing` 后无 `prepare_expires_at` 过期回收。崩溃中途 → 行永久卡在 `preparing`。Fix: prepare 资格也判 `prepare_expires_at` 过期。 |
| P1 | 8/10 | `worker_state.py` `can_reclaim` | **从未被调用**。意味着 `publishing` 卡死的行（崩溃后）也永远回收不了——只有初始 `eligible_for_publish`（要求 `approved`）会跑。这是真实正确性 bug。Fix: 接上 reclaim 过期 `publishing`。 |
| P1 | 8/10 | `feishu_cli.py:154-159` | `compare_update_record` 在 `lark` flavor **无条件返回 `{updated:False, matched:False}`，根本不调 API**。后果：用 lark flavor + `feishu_atomic` 锁时，锁永远 miss → publish **静默** `skipped=1`，不报错。Fix: 配置组合非法时显式报错而非静默跳过。 |
| P1 | 8/10 | `worker.py:434-460` | `source_image_path` 等字段从 Feishu 记录直接读，原样 `shutil.copyfile` 后上传。操作者把字段设成 `/etc/passwd`/任意绝对路径就被复制外传。Fix: 校验路径在允许根目录下。 |
| P1 | 7/10 | `worker.py:434-460` | 同上路径未查 symlink（TOCTOU）。`shutil.copyfile` 会跟随 symlink。Fix: `Path.resolve()` 拒绝逃逸 + `O_NOFOLLOW`。 |

### 其它问题

| 级别 | 置信度 | 位置 | 问题与修复 |
|---|---|---|---|
| P2 | 7/10 | `worker.py:533-534` | `_create_run` `except Exception: return` 吞掉所有异常且不记日志。run-history 是审计轨迹，静默丢失破坏可追溯性。 |
| P2 | 7/10 | `pin_draft.py` 全模块 | **死代码**。worker 实际用 `content_generation.generate_pin_draft`（确定性规则，**无 LLM**），`pin_draft.validate_draft` 等从未被生产路径调用。Fix: 删除或接上；注意 README/evals 暗示有 LLM 但实际没有。 |
| P2 | 8/10 | `worker.py:445` `_publish_image` | 死代码，只有 `_publish_images` 被调用。 |
| P2 | 8/10 | `worker.py:274-330` | `prepare()` 无 `finally` 释放，且 `_update_pin`（失败时把状态写回）自己再抛异常 → 行卡死无回收路径。 |
| P2 | 7/10 | `worker.py:475,479` | `_refetch` 用 `f'record_id="{record_id}"'` 裸插值，没用同文件其它地方用的 `_field_equals_expr` 转义。 |
| P2 | 7/10 | `runtime_lock.py:89-110` + `worker.py:271-272` | `publish()` 的 `finally` 里 `lock.release` 自己可能抛（Feishu CLI 挂掉时），掩盖真实 publish 结果。Fix: release 包自己的 try/except + 日志。 |
| P2 | 6/10 | `feishu_cli.py:74` | `_is_retryable_message` 用子串 `" 5"` 匹配 5xx，会误命中含 " 5" 的正常消息。Fix: 收紧到 `\b5\d\d\b`。 |
| P3 | 8/10 | `feishu_pinterest_worker.py:148` | `except (ConfigError, RuntimeErrorConfig, Exception)` 重复，`Exception` 已覆盖前两者。Fix: `except Exception as exc`。 |
| P3 | 9/10 | `onboarding.py:114-116` | `hermes_ok` 的 `or`/`and` 优先级组合脆弱，`local_dev=True` 时短路 True 而不查 agent/job env。Fix: 显式括号。 |
| P3 | 7/10 | `content_generation.py:467,474` | `_trim_title`/`_limit_text` 用 `rsplit(" ",1)[0]`，若前 95 字符无空格（一个超长词）返回 `""` → 空标题流向下游。Fix: 回退到硬截断串。 |
| P3 | 8/10 | `skill_update.py:39` | `update_checker` 结果 `ok: True` 混 `checked: False`，语义混乱。 |

**已验证 OK：** 所有 `subprocess.run`/`execFileSync` 都是 list 形参无 `shell=True`，无 `os.system`/`eval`/`exec`；无硬编码 secret；所有 `urlopen` 都带 timeout，无 `verify=False`；附件下载用 `_safe_filename` 防穿越。

---

## 跨项目共性问题

1. **非原子文件写到处都是：** `runner.ts`、`bench.ts`、`check-update.sh`、`worker.py` 的状态写都缺 tmp+rename。而 `fit-report.ts` 已经证明了正确写法——应该把 `writeAtomic` 提到 `shared/` 复用。
2. **fetch 无超时反复出现：** `models-list`、`google-trends-chinese`、`fal`/`volcengine` 二次下载、CDP fetch。建议在 `shared/` 放一个带默认超时的 `fetchJson` 工具。
3. **测试覆盖偏科：** 纯函数/解析器测得好，HTTP client 和编排层（最易出 bug 的地方）几乎零覆盖。trend-radar 和 image-synth 都有这毛病。
4. **环境变量路径无校验：** `install.sh` 和 `check-update.sh` 都直接信任 `*_HOME` 类 env。

---

## 修复优先级建议

### 第一优先（线上正确性 / 安全）

| # | 问题 | 模块 | 工作量 |
|---|---|---|---|
| 1 | stuck-row 回收簇（prepare + publish 无回收 + `can_reclaim` 死代码） | Pinterest | 中 |
| 2 | `source_image_path` 路径校验 + symlink 防护 | Pinterest `worker.py:434` | 小 |
| 3 | `lark` flavor + `feishu_atomic` 静默失败 → 显式报错 | Pinterest `feishu_cli.py:154` | 小 |
| 4 | `models-list.ts:17` fetch 加超时 | image-synth | 一行 |
| 5 | `bench.ts:67` seed NaN 校验 | image-synth | 一行 |
| 6 | `check-update.sh:86-88` 原子写缓存 | scripts | 小 |

### 第二优先（仓库治理）

| # | 问题 | 工作量 |
|---|---|---|
| 7 | S1: Pinterest-autopin 改 submodule 或纳管 | 中（需决策） |
| 8 | Pinterest 历史提交 secret 扫描 | 小（跑工具） |
| 9 | S2: 目录命名大小写统一 | 小 |

### 第三优先（质量改进，机械修复居多）

- 第三方 fetch 加超时/SSRF 校验（fal/volcengine 二次下载、google-trends-chinese、CDP fetch）
- `readJson` 加 schema 校验
- 死代码清理（`pin_draft.py`、`_publish_image`、未用的 `worker_state` helper）
- 非原子写统一改 `writeAtomic`
- exit code 语义修正（`bench.ts:233`）
- 魔数集中（超时、price hint）

---

## 附录：审核方法说明

- **审查覆盖：** trend-radar（8 文件 + 6 测试）、image-synth（7 文件 + 2 测试）、shell（2 文件）、Pinterest-autopin（15 文件）全部完整读取。
- **头部 finding 二次核验：** S1（git remote 实测）、Pinterest stuck-row（`can_reclaim` 调用点实测）、`lark` flavor 静默失败（`feishu_cli.py:154-159` 实测）、`runner.ts` 非原子写（实测）、`models-list.ts` 无超时（实测）、3 个 provider client 的 `res.ok`+timeout（实测）均已经过直接读取代码确认。
- **未覆盖：** Pinterest 历史 git log 的 secret 扫描；端到端运行测试；浏览器自动化（Playwright）的实际行为验证。
