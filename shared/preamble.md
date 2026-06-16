# Stack 共享引导

所有 skill 激活时，在处理用户请求之前，按顺序执行以下步骤。

---

## 版本检查

开始向用户输出之前，**静默**执行一次：

```
bash "${ECOMMERCE_SKILLS_HOME:-${ETSY_SKILLS_HOME:-$HOME/.local/share/etsy-skills}}/scripts/check-update.sh"
```

- 脚本自带 24h 缓存，重复调用没成本
- 如果它打印了一行 `💡 …` 提示，把它**原样**附在你最终回复的最后一行；没输出就当无事发生
- **不要**解读、不要展开、不要主动建议立刻升级
- 如果脚本不存在（用户没装 stack 或自己挪了位置），跳过这一步，不要报错

---

## 工作区路径解析

所有 skill 涉及的工作区文件（BRAND.md / SHOP.md / BRAND_MARKETING.md / MARKETING_PLATFORM.md / COMMERCE_PLATFORM.md / Base 导出 / .cache/ 等），**必须落到统一的「工作区根目录」**——不是当前 cwd、不是 `$HOME`、不是任何猜测路径。在 Hermes profile 隔离环境下 `$HOME` 是 profile sandbox HOME（不是系统用户 HOME），靠 `~/` 推路径会让文件落到错误位置。

### 解析顺序（不变契约）

每次 skill 准备读/写工作区文件之前，**先**调用：

```
ecommerce-stack workspace
```

1. 优先读 `$ECOMMERCE_WORKSPACE` 环境变量；指向不存在目录则报错退出（不静默 fallback）
2. 兼容旧 `$ETSY_WORKSPACE` 环境变量；指向不存在目录则报错退出（不静默 fallback）
3. 否则从 cwd 向上查找 `.ecommerce-workspace` 标记文件，找到则取该文件所在目录
4. 兼容旧 `.etsy-workspace` 标记文件
5. 都没有 → 退出非零，不做任何猜测

旧命令 `etsy-stack workspace` 仍可用，但新文档默认写 `ecommerce-stack`。

### 解析失败时

停下问用户，绝不退而求其次写到 cwd 或 `$HOME`：

> 「我没法确定电商工作区在哪。可以二选一：
> ① 告诉我工作区的绝对路径，我用 `ECOMMERCE_WORKSPACE` 环境变量指过去；
> ② 或者你确认当前目录就是工作区根，我跑 `ecommerce-stack init` 在这里写一个 `.ecommerce-workspace` 标记。」

只有用户在对话里明确确认后才落盘。

### 解析成功后

把返回的绝对路径作为本次任务所有文件操作的根。后续提到「工作区根」「根目录」一律指这个解析结果，不要混用 cwd。

### 不允许的写法

- 写死 `/Users/...` 这类机器绝对路径
- 用 `~/workspaces/...` 或任何 `~` 前缀做兜底
- 候选路径探测（"如果 A 不存在就试 B"）

> stack 的安装路径（默认仍是 `~/.local/share/etsy-skills`、`~/.hermes/skills`，保留旧路径用于升级兼容）走 `$HOME` 是有意为之——Hermes profile 隔离场景下落到 profile HOME 是预期行为。**只有「工作区数据路径」走严格解析**，两类不要混淆。

---

## 平台配置

平台差异不写进通用流程。每次 skill 要输出商品页文案、媒体规则、客服话术、订单字段或平台发布任务前，先按 [`shared/platform-config.md`](platform-config.md) 读取 `<workspace>/COMMERCE_PLATFORM.md`。

- 目标平台是 Etsy 或小红书且 `COMMERCE_PLATFORM.md` 缺失：允许使用仓库内对应 preset，但要说明这是内置平台规则。
- 目标平台不是 Etsy / 小红书且配置缺失：停止并引导用户先用 `shop-foundation` 建立或补齐 `COMMERCE_PLATFORM.md`，不要猜平台限制。
- 同一工作区多平台并行时，先确认目标平台；不能把 Etsy 的 tag、图片槽位、SEO 或客服规则套到国内平台。

---

## 飞书 Base 命名约定

所有 skill 创建或搜索飞书 Base 表时，统一使用 **`{店铺名}-{表名}`** 格式。`{店铺名}` 取自 `<workspace>/SHOP.md` 的「店铺名」字段（§店铺基础）。

| skill | 表名 |
|---|---|
| listing-catalog | `{店铺名}-商品` |
| orders-customers | `{店铺名}-订单库`、`{店铺名}-客户库` |
| supplier-foundation | `{店铺名}-供应商管理` |
| business-knowledge | `{店铺名}-知识卡片` |
| assets-library | `{店铺名}-素材索引` |
| content-asset-pool | `{店铺名}-素材发布池`、`{店铺名}-发布任务` |
| social-publisher | `{店铺名}-发布任务`、平台适配器队列（如 `{店铺名}-Pin Queue`） |
| pinterest-autopin | `{店铺名}-Pin Queue` |
| video-assembly | `{店铺名}-Clips`、`{店铺名}-Video Jobs` |

搜索表时用 `{店铺名}-` 前缀做过滤，避免多店铺在同一飞书空间时撞名。

---

## 写入前的通用约束

无论哪个 skill、哪种模式，写入或修改工作区文件前必须：

1. **先解析工作区根**（见上一节），路径必须来自 `ecommerce-stack workspace` 或兼容旧命令 `etsy-stack workspace`
2. 用代码块完整展示拟写入/修改的内容（含目标绝对路径）
3. 等用户的明确同意（"好"、"可以"、"写吧"、"嗯"等）
4. 确认后落盘

**Hermes cron 例外（仅限输出型报告）**：如果用户明确配置了 Hermes 定时任务，并在配置时确认了固定输出目录与文件命名规则，则 cron 运行时可以在该目录下写入新的时间戳报告 / JSON / raw evidence 文件，不需要每次再等人工确认。这个例外只适用于"追加新输出文件"，不能修改 BRAND.md / SHOP.md / Base 导出 / 既有业务文件，也不能覆盖旧报告。

各 skill 可在自身 SKILL.md 里追加特有禁区，但不能豁免上述通用约束。

---

## 工作语言

- 与用户的全部对话均使用**中文**
- 面向买家的输出语言由 `COMMERCE_PLATFORM.md` 的「买家语言」决定；Etsy / Pinterest 等海外平台默认英文，国内平台按配置输出中文或双语
- 飞书 Base 字段标签中英混用（各 skill 的 schema 文件里给规范）
- 基座文件（BRAND.md / SHOP.md 等）内容为中文；SHOP.md 的 About / Announcement / Greeting Message 例外（英文原文，线上保留）

---

## 经营原则

读 [`shared/ethos.md`](ethos.md)，在 skill 遇到裁量空间时按其中原则判断。
