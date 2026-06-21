# Publishing Flow（模式 C 的执行手册）

模式 C 的 step-by-step。从 `社媒发布队列` 表中的一行草稿走到 Pinterest 上一条已发的 pin。

---

## 总体流程

```
`社媒发布队列` 表草稿
   │
   ├─[0] 解析 <workspace> = `etsy-stack workspace`
   │       runtime 目录 = <workspace>/.cache/pinterest-autopin/runtime/
   │
   ├─[0.5] 图片处理守卫（支持单图 / 多图）
   │     └─ 所有 image 路径已在 processed/、文件存在且有 AI 清理记录 → 跳过
   │     └─ 否则 → 逐张：复制/下载 → AI metadata / watermark 清理 → 无损压缩 → 用 processed 路径
   │
   ├─[1] 渲染 request.json (<runtime>/{pin_id}.json)
   │
   ├─[2] validate ── 校验 JSON 字段（不打开浏览器）
   │     └─ 失败 → 修 JSON / 改 Base 字段，重试
   │
   ├─[3] test ──── 弹 Chrome 填表，不点发布
   │     └─ 用户目视确认 → 通过
   │     └─ 用户说"裁切错了 / 文案截断了 / 顺序不对" → 改 Base 字段，回 [1]
   │
   ├─[4] 用户在对话里说"发吧 / publish"
   │
   └─[5] final ─── 真发
         ├─ 成功 → 回写 发布 URL / 状态=已发 / 发布时间
         └─ 失败 → 按 §错误恢复 分类，回写状态=失败/失败原因
```

每一步的输出都是 stdout 一行 JSON（Pinterest-autopin 的契约），解析 `ok` / `pinUrl` / `result`。

---

## [0.5] 图片处理守卫

模式 B 的 step 3.8 已经对图片做过处理，`image 路径` 应指向 `<workspace>/.cache/pinterest-autopin/processed/` 下的文件。模式 C 在构造 request.json 前做一次守卫检查：

1. 读 `社媒发布队列` 表中该行的 `image 路径`（多图时按行拆分）
2. **逐张检查**：如果路径以 `<workspace>/.cache/pinterest-autopin/processed/` 开头、文件存在，且该行备注 / sidecar / 处理记录中有 `aiSanitization` 结果 → 该张跳过
3. 未通过检查的图片按 `image-processing.md` 的四步流程处理，处理完后用 processed 路径替换
4. **全部图片通过后**才进 [1]；任何一张处理失败 → 中止，提示用户具体哪张图有问题

---

## request.json 构造

模板见 `assets/request-template.json`。下文 `<runtime>` 代指 `<workspace>/.cache/pinterest-autopin/runtime`，由 `etsy-stack workspace` 解析得到（见 SKILL.md §对外的实操接口）。

从 `社媒发布队列` 表中的一行映射：

| `社媒发布队列` 表字段 | request.json key | 说明 |
|---|---|---|
| `image 路径` + `Alt Text (EN)` | `images` | 数组，每个元素 `{ "path": "...", "altText": "..." }`。单图和轮播都用这个字段；见下方 § images 数组构造 |
| `标题` | `title` | 直接拷 |
| `Board (Pinterest)` | `board` | 直接拷 |
| `链接` | `link` | 直接拷；空字符串就省略字段 |
| `描述` | `description` | 直接拷 |
| —（固定值）| `creationUrl` | 默认省略走 Pinterest-autopin 默认值；日本店可显式传 `https://jp.pinterest.com/pin-creation-tool/` |
| —（固定值）| `chromeProfile` | 永远是 `~/.config/pinterest-autopin/chrome-profile`（绝对路径，运行时把 `~` 展开） |

### images 数组构造

1. 把 `image 路径` 按换行拆分为路径列表，去掉空行和首尾空白；这个顺序就是上传顺序
2. 把 `Alt Text (EN)` 按独占一行的 `---` 拆分为 alt text 列表，去掉每段首尾空白
3. 校验：路径数 = alt text 数，不等时中止并提示用户修正 Base 字段
4. 校验 `发布类型`：单图必须 1 张；多图轮播必须 2-5 张
5. 按位置一一配对，生成 `images` 数组：

```json
{
  "images": [
    { "path": "/abs/path/to/processed/cup-front.jpg", "altText": "A pale sage green ceramic teacup..." },
    { "path": "/abs/path/to/processed/cup-detail.jpg", "altText": "Close-up of the cup's glazed rim..." },
    { "path": "/abs/path/to/processed/cup-lifestyle.jpg", "altText": "Three cups arranged on a wooden shelf..." }
  ],
  "title": "Morning Mist Tea Cup — handmade ceramic for slow mornings",
  "board": "Handmade Ceramics",
  "link": "https://www.etsy.com/shop/.../listing/...",
  "description": "A small ceramic cup for the quiet first sip of the day...",
  "chromeProfile": "/Users/john/.config/pinterest-autopin/chrome-profile"
}
```

单图 pin 时 `images` 数组只有 1 个元素，格式完全一致——工具端不需要区分单图/多图逻辑。

不要从 `关联素材` 字段推导顺序。飞书关联字段只用于追溯素材记录，真正发布顺序永远来自 `image 路径` 的行顺序。

写文件路径：`<runtime>/{pin_id}.json`

`<runtime>` 目录如不存在先 `mkdir -p` 创建。建议用户把 `.cache/` 加进工作区根的 `.gitignore`——runtime 数据是 ephemeral 的，不该进 git。

---

## 三阶段约定

`npm run pin:*` 都需要切到 Pinterest-autopin 工具源码目录（`~/code/etsy-skills/tools/Pinterest-autopin/`）跑，但 `--input` 必须给 `<runtime>/{pin_id}.json` 的**绝对路径**——工具 cwd 不在工作区，相对路径会找不到。

### Stage 1: validate

```bash
cd ~/code/etsy-skills/tools/Pinterest-autopin
npm run pin:validate -- --input <runtime>/{pin_id}.json
```

**期望输出**（成功）：

```json
{"ok": true, "mode": "validate", ...}
```

**失败处理**：解析错误信息 → 通常是 JSON 字段缺失 / 路径错 / link 不是 absolute http(s) → 改 request.json 或回 `社媒发布队列` 表改字段，再来。validate 阶段失败不算入 `社媒发布队列` 表的「发布尝试次数」（没真跑浏览器）。

**多图额外校验**：
- `images` 数组不为空
- 每个元素的 `path` 是绝对路径且文件存在
- 每个元素的 `altText` 非空且 ≤ 500 字符
- 轮播 pin 时 `images` 长度在 2-5 之间

### Stage 2: test

```bash
npm run pin:test -- --input <runtime>/{pin_id}.json
```

会弹一个 Chrome 窗口，自动跳到 Pinterest pin 创建页，自动上传图、填 title / description / altText / link / 选 board。**不会点发布**。

**让用户目视确认**：
- 图片有没有被 Pinterest 自动裁切丢掉关键内容（特别是横版图，Pinterest 默认 2:3 显示）
- 文案有没有截断
- board 选对没有
- **（轮播 pin 额外）** 图片顺序是否正确、每张图的 alt text 是否匹配

让用户在对话里回 OK / 不 OK 配理由。

**失败处理**：
- `loggedIn: false` → 走 §错误恢复 § 登录失效
- `board not found` → 走 §错误恢复 § board 不存在
- 其它 → 让用户截图 Chrome 窗口看看（本 skill 不直接看 Chrome）

### Stage 3: final

**前置**：用户在对话里明确说"发 / publish / 真发 / final"。test 没过的不要进 final。

```bash
npm run pin:publish -- --input <runtime>/{pin_id}.json
```

**期望输出**（成功）：

```json
{"ok": true, "mode": "final", "pinUrl": "https://www.pinterest.com/pin/123456789012345678/", ...}
```

**回写 `社媒发布队列` 表**（用 `lark-base`）：

```
- 状态: 已发
- 发布 URL: {pinUrl}
- 发布时间: {now in YYYY-MM-DD HH:mm}
```

回写前按通用协议**列出改动让用户确认**。

**失败回写**：

```
- 状态: 失败
- 失败原因: {分类} - {原文截断到 100 字符}
- 发布尝试次数: +1
```

---

## 错误恢复

### 登录失效（`loggedIn: false`）

Pinterest 偶尔强制重登（特别是几周不操作后）。

1. 跑 `npm run pin:check-login -- --chrome-profile ~/.config/pinterest-autopin/chrome-profile`
2. 让用户在弹出的 Chrome 里手工重新登录（同 runtime-setup.md § 5）
3. 用户登录完成后，重跑失败的 stage

不替用户输凭据。重登过程不算发布尝试次数。

### board 不存在（`board not found`）

`社媒发布队列` 表里的 board 名和 Pinterest 后台不一致。

1. 让用户去 Pinterest 后台核对实际 board 名（大小写、空格、特殊字符敏感）
2. 用户改完后：
   - 如果是 Pinterest 后台拼写错 → 用户在 Pinterest 后台改 board 名
   - 如果是 `社媒发布队列` 表字段填错 → 用 `lark-base` 改这一行的 `Board (Pinterest)`，并把单选选项也修正
3. 重跑

### JSON 校验失败

通常是 image 不是绝对路径 / link 不是 absolute http(s) / image 文件不存在。

多图时额外注意：`images` 数组元素数和 alt text 数不一致 / 某张图路径不存在。

直接看错误信息 → 改 request.json（改根源在 `社媒发布队列` 表字段）→ 重跑 validate。

### 网络 / Pinterest 临时错误（5xx / timeout）

可能 Pinterest 临时抽风。

- 第一次失败 → 等 30 秒，自动重试一次
- 第二次还失败 → 状态停在 `失败`，告诉用户人工介入（盲目继续重试可能触发 Pinterest 风控）

### 未知错误

`ok: false` 但归不到上面任何类。

- 把 `stderrTail` 完整给用户看
- 状态停在 `失败`，发布尝试次数 +1，等用户人工决策

---

## 不要做的事

- **不要绕过 test 直接 final**（除非用户明确豁免——首次发某 board / 首次用某素材尺寸时尤其不要绕）
- **不要并发跑多个 final**（同一 Chrome profile 不能多开；多发会让 Pinterest-autopin 抢 profile 锁失败）
- **不要替用户解 Pinterest 的人机验证 / 二次验证**（违反 user_privacy 中"never bypass CAPTCHA"原则）
- **不要在失败后把 request.json 删掉**——保留在 `<runtime>/{pin_id}.json` 便于复盘
- **不要把任何 stdout / stderr 里出现的疑似登录态字符串（cookie 片段、token）写进 Base 或对话**——哪怕用户问"什么错"，也只回错误**类型**和最关键的一句原文
- **不要手动拆分轮播 pin 为多个单图 pin 发布**——轮播是一个 pin 对象，必须一次性发布
