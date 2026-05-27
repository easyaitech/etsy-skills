# 重复发布 Bug 与 URL 提取加固（2026-05-27）

## 症状

同一条 Pin 在 Pinterest 上出现 3 条完全相同的发布记录，截图如下：

```
"Personalized Chinese Calligraphy Fridg..." × 3
```

## 根因分析

问题出在 `scripts/pinterest_auto_publish_due.py` 的 URL 提取和 Base upsert 链路：

### 1. URL 提取失败导致 Base 误判

- Pinterest-autopin 工具的 `final` 模式实际发布**成功**（Pinterest 上能看到 Pin）
- 工具把 pin URL 写入 3 个通道：
  - stdout 中的 `finalUrl` 字段（混在 ANSI 彩色日志里）
  - `/tmp/published_pin_url.txt` 单行文件
  - 工具内部的 `RESULT_JSON_PATH` JSON 文件
- 脚本原来的提取逻辑只有 1 层：`extract_json(safe_out)` → `find_pin_url(publish_json)`
- stdout 混入 `🟢[INFO]` / `🚀` 等 ANSI 彩色字符后，`extract_json` 的定位 `{ }` 可能抓错块，`find_pin_url` 找不到 `pinUrl` 键
- 脚本把这条记录标记为 `失败`，写入 `失败原因 = "final publish completed but no pin URL found"`

### 2. Upsert 本身失败导致记录"卡住"

- 脚本调用 `lark_upsert` 写回 Pin Queue Base
- lark-cli 偶尔遇到限流/超时，抛出 `RuntimeError`
- 因为无重试机制，Base 记录根本没被更新（仍是 `状态=待发/草稿`, `pin_url=空`）
- **这是最关键的一环**：如果 upsert 成功了，Base 会是 `状态=失败, 重试次数+=1`，最多再重试 1 次就停了（`MAX_RETRY=2`）。但因为 upsert 也失败了，记录卡在了 `待发` 状态。

### 3. 下一次 cron 重新选中同一行

- 30 分钟后，cron 再次扫描 Pin Queue
- 筛选条件：`状态 ∈ {待发, 草稿}`, `pin_url = 空`, `计划发布时间 <= 当前时间`, `重试次数 < 2`
- 卡住的记录满足所有条件 → **再次执行 final publish** → 同一条 Pin 被重复发布

## 修复方案

### URL 提取三层降级

```python
# 1. 优先读 stdout JSON
try:
    publish_json = extract_json(safe_out)
    pin_url = find_pin_url(publish_json)
except Exception:
    pass

# 2. 回退读 /tmp/published_pin_url.txt（工具成功发布后必定写入）
if not pin_url:
    pin_url = extract_pin_url_from_stdout(safe_out)  # 内部先试 /tmp 文件，再试正则

# 3. 最后用正则扫描 raw stdout
# PIN_URL_RE_RAW = r"https?://(?:[a-z0-9-]+\.)?pinterest\.com/pin/[^\s\"'<>,)]+"
```

### Upsert 指数退避重试

```python
def lark_upsert_with_retry(base_token, table_id, record_id, fields, max_retries=3):
    for attempt in range(1, max_retries + 1):
        try:
            return lark_upsert(base_token, table_id, record_id, fields)
        except Exception:
            if attempt < max_retries:
                time.sleep(min(2 ** attempt, 10))  # 2s → 4s → 10s
    raise  # 最后一次失败才抛出
```

所有 5 处 upsert 调用统一改为 `lark_upsert_with_retry`：
1. Runtime JSON 不存在 → 失败
2. Validate 失败 → 失败
3. Check-login 失败 → 仅更新失败原因（不更 status）
4. Final publish 失败 → 失败
5. **成功发布 → 已发**（最关键，防止记录卡住）

### 发布成功后清理 /tmp 文件

成功写入 Base 后立即 `PIN_URL_FILE.unlink(missing_ok=True)`，防止未来某次 cron 读到过期文件产生误判。

## 影响范围

- 影响所有通过 `pinterest_auto_publish_due.py` 自动发布的 Pin（目前每天 3 条）
- 不影响手动通过 skill Mode C 发布的流程（skill 层有自己的 URL 提取和 upsert 逻辑）
- 不影响 test 模式

## 防御检查清单

后续若怀疑重复发布，按顺序检查：

1. **Base 状态**：目标 Pin Queue 行的 `状态`、`pin_url`、`重试次数` 是否一致
2. **Pinterest 实际**：用户 profile / board 上是否真的出现多条相同内容
3. **/tmp 文件**：`ls /tmp/published_pin_url.txt` 是否存在过期内容
4. **Cron 输出**：查看 `cron/output/d99651079542/` 下对应时间段的输出文件，确认脚本 exit code 和 status
