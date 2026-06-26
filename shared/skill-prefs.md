# 客户偏好覆盖层（skill-prefs）

> 让**单个客户**微调**某个 skill** 的行为——不改 skill 本体、不 fork、升级零冲突。
> 本文件是 skill 引擎与客户覆盖之间的**不变契约**。各 skill 通过 [`preamble.md`](preamble.md) §客户偏好覆盖 统一接入。

## 为什么需要这层

skill 是**共享只读、会持续升级**的产品引擎。客户的个性化诉求如果直接改 skill 本体，就变成 fork——从此与升级分叉、每次升级都要做 merge。本层把"定制"从"改引擎"变成"在引擎上叠一层薄薄的、每客户隔离的覆盖"：

- 升级 = 整个换掉 skill 引擎，**覆盖层原封不动**；
- 每次调用时引擎读入覆盖层 → 合并 → 客户习惯生效；
- 全程**没有 merge**。

## 先分清：你想定制的到底是哪一类

| 想定制的东西 | 归宿 | 用什么维护 |
|---|---|---|
| 品牌语气 / 文案口吻 / 视觉原则 | `BRAND.md` | `shop-foundation` 沉淀流程（**不是** skill-prefs） |
| 店铺事实（处理时间 / 政策 / 公告） | `SHOP.md` | `shop-foundation` |
| 销售平台规则 / 买家语言 / 字段限制 | `COMMERCE_PLATFORM.md` | `shop-foundation` |
| **某个 skill 的工作流 / 阈值 / 增删步骤 / 追加产出段** | **`skill-prefs/<skill>.md`** | **本层** |
| 方法论知识 / 写作 SOP（如 listing 文案手艺） | `knowledge/wiki/` + Knowledge Cards（含拷入的种子；**evidence 非 instruction**，压不过平台硬规则与闸门） | `business-knowledge`；种子机制与两层冲突规则见 [`knowledge-seeds.md`](../business-knowledge/seeds/knowledge-seeds.md) |
| 安全 / 合规 / QA 闸 / 写入确认 / 平台硬规则 | 不可覆盖 | —— |

> 原则：**品牌级、跨 skill 的"我们是谁 / 我们的事实"走基座文件**（BRAND / SHOP / COMMERCE_PLATFORM，被多个 skill 读取）；**只影响单个 skill "怎么干活"的旋钮走 skill-prefs**。两者不重叠——拿不准时优先沉淀进基座文件。

## 文件位置与命名

```
<workspace>/skill-prefs/<skill-name>.md
```

- `<workspace>` 由 `ecommerce-stack workspace` 解析（见 preamble §工作区路径解析），**每客户隔离**，从不落到 `~/.hermes/skills`。
- `<skill-name>` 与 manifest 中的 skill 目录名一致（如 `listing-catalog`、`pinterest-autopin`）。
- 文件可选——不存在就用纯默认行为，不报错。

## 能覆盖什么 / 不能覆盖什么

**可以**（口味 / 工作流旋钮）：

- 输出风格与格式偏好（长度上限、是否用 emoji、分段方式、字段顺序……能用一句话声明的）
- 可选步骤的开关（"跳过 X 步""默认带上 Y 段"）
- 阈值 / 默认值（在 skill 允许的范围内）
- 在 skill 既有产出末尾**追加**一段固定内容

**不可以**（红线，覆盖层一律无效）：

- 安全 / 合规 / 平台硬规则（不自动发布、不自动改库存、AI 发布图清洗、平台字段硬限制……）
- [`preamble.md`](preamble.md) §写入前的通用约束（先解析工作区根、展示拟写内容、等用户确认）
- QA / 差异化闸门，以及依赖降级协议里 BLOCK 级依赖的硬阻塞语义
- 让 skill 去读 / 写工作区之外的路径，或越权访问别的店铺数据

> 各 skill 的 SKILL.md 可在"特有禁区"里进一步**收紧**本表，但不能放宽红线。

## 优先级（compose 顺序，从高到低）

```
安全 / 合规 / QA 闸                    ← 永远最高，不可被覆盖
  └─ BRAND / SHOP / COMMERCE_PLATFORM  ← 品牌级真相（冲突时压过 skill-prefs）
       └─ skill-prefs/<skill>.md        ← 本客户、本 skill 的工作流 / 风格旋钮
            └─ skill 默认行为
```

skill-prefs 只在"默认行为"与"品牌级真相未规定"的空隙里生效。它**不能**推翻 BRAND / SHOP 里已明确的品牌原则——那是更高一级的客户意图；冲突时以基座文件为准，并提示用户去 `shop-foundation` 调整。安全 / QA 红线永远压在最上面。

## 升级兼容（这层存在的全部意义）

因为覆盖层与 skill 引擎是**物理分离**的两份东西：

1. `ecommerce-stack update` 只换引擎（`~/.hermes/skills` 软链指向的源码），**不碰** `<workspace>/skill-prefs/`；
2. 升级后第一次调用，引擎重新读入覆盖层 → 合并；
3. **没有 merge、没有冲突**。

唯一要维护的是**契约稳定**：skill 认哪些偏好项、读哪些字段，当成版本化的 API——尽量只增不改；必须改时在 CHANGELOG 标注并给迁移说明。

**失配处理（compat 检查）**：升级后若某条客户偏好引用了当前 skill 不再认识的东西，skill **不要静默忽略**，按 [`dependency-protocol.md`](dependency-protocol.md) 的降级协议报一条 DEGRADE：

> ⚠️ DEGRADE：`skill-prefs/<skill>.md` 里的「X」当前版本已不支持（{原因}）。本次按默认行为执行，请确认删除或改写该偏好。

`ecommerce-stack doctor` 也会做一次结构性体检：列出工作区里的 skill-prefs，并标记目标 skill 已不在 manifest 的失配文件。

## 文件格式

纯 markdown，人类可读、声明式。推荐结构：

```markdown
# listing-catalog · 客户偏好

> 本文件只覆盖本 skill 的工作流 / 风格旋钮；品牌语气与店铺事实请走 BRAND.md / SHOP.md。

## 风格
- 标题 ≤ 60 字符
- 不使用 emoji

## 工作流
- 跳过：{某个可选步骤}
- 总是追加：{固定段落 / 免责声明}

## 阈值
- {参数} = {值}
```

每条尽量一句话、声明式。复杂逻辑不要塞这里——那是"该给 base 加扩展点"的信号（见下）。

## 当偏好足够通用：提拔回 base

如果一条偏好其实对很多客户都有用，别让它停在某个客户的 skill-prefs 里：把它**提拔**成 base 的一个配置项 / preset，upstream 进本仓库 git。这样全体客户都能用，该客户也回归纯 base。

**反过来**：当一个定制连 skill-prefs 都表达不了、只能改 skill 内部逻辑时，这是"base 缺了扩展点"的产品信号——**补扩展点，不要给单个客户 fork**。每次被迫 fork，都该触发一次"base 该不该加扩展点"的复盘。

## agent 运行时怎么用

每个 skill 在解析工作区根之后、产出之前：

1. 若 `<workspace>/skill-prefs/<本skill>.md` 存在，读入作为本客户覆盖；
2. 在不触碰上面红线的前提下，让覆盖**优先于默认行为**；
3. 发现失配偏好 → 按上面的 DEGRADE 模板提示，不静默；
4. 覆盖层**从不**写到 `~/.hermes/skills`——它只活在客户工作区里（见 preamble §技能目录写入禁令）。
