# Prompt 词库映射规则

> SKILL.md step 3 + step 5 引用本文档。

---

## 5 类词库定义

| 词库 | 内容 | 主源 | 缺失策略 |
|---|---|---|---|
| **mood** | 整体气质 / 配色 / 光线 / 构图 / 道具白名单 / 后期方向 | BRAND.md § 视觉原则 + shoot-brief §B | BRAND 缺则降级为通用气质，不偷编品牌词 |
| **shot-spec** | 角度 / 背景 / 主体位置 / 景深 / 镜头长 | shoot-brief §C 当前槽位段（模式 A）/ social-platform-specs.md（模式 B） | 缺则按槽位 / 平台默认值 |
| **anchor** | 商品主体 / 材质 / 色 / 比例 / Logo 位置 / 关键纹理 | Hermes 看图能力看实拍图（必须）+ `Products 商品` 表 SKU 行（可选） | **不允许缺**——anchor 是保商品形态的根 |
| **negative** | 视觉禁区原文 | BRAND.md § 视觉禁区 **唯一**来源 | BRAND 缺则段留空 + 加通用兜底（无竞品 logo / 无水印） |
| **format** | 长宽比 / 分辨率 / 输出格式 | 目标槽位（模式 A）/ 目标平台（模式 B） | **不允许缺**——盘点输入时阻塞反问 |

---

## mood 词库映射规则

### 来源 1：BRAND.md § 视觉原则

| BRAND 字段 | mood 字段 | 抽取规则 |
|---|---|---|
| § 视觉原则 整体气质（首条） | mood.整体气质 | 取首条主观点 + 1 个具象修饰，≤ 20 字；翻译成英文短语 |
| § 视觉原则 主色（hex 如有） | mood.配色 | hex 值优先（如 `#5A6F4A`）；缺 hex 则用色彩家族词（"muted earth tones, sage green palette"）|
| § 视觉原则 排版构图原则 | mood.构图 | 抽"留白 / 黄金分割 / 平铺 / 对称"等具象规则 |
| § 视觉原则 道具白名单 | mood.道具白名单 | ≤ 5 个名词；超出时取与当前槽位最相关的 5 个 |

### 来源 2：shoot-brief.md §B Mood 段（如有）

直接用 §B 已抽好的字段（光线 / 后期方向）补 mood 词库的剩余字段：

| §B 字段 | mood 字段 |
|---|---|
| 光线 | mood.光线 |
| 后期方向 | mood.后期方向 |

### 来源 3：用户口述（无 brief 无 BRAND 时的兜底）

让用户答 3 个问题：氛围 / 光线 / 主色调。映射到 mood.整体气质 / mood.光线 / mood.配色 三个字段；其他字段留空（生图工具按默认）。

### 矛盾解决

- BRAND § 视觉原则 与 shoot-brief §B 矛盾时：以 BRAND 为准（品牌底座 > 单次拍摄方案），把 §B 不一致的部分作为"用户偏离了 BRAND，要不要回 shop-foundation 沉淀"提示

---

## shot-spec 词库映射规则

### 模式 A：按目标销售平台查 shoot-brief.md §C

目标平台是 Etsy 时，槽位 ID 取值见 [`assets-library/references/etsy-listing-photo-slots.md § 3`](../../assets-library/references/etsy-listing-photo-slots.md#3-槽位-id-与-assets-素材池-表-用途标签-字段对齐)（contract source）。每个槽位 ID 对应 shoot-brief.md §C 同名段；映射规则：

- **hero / scale / size-chart / packaging / variation / brand-story**：读 §C 同名段，抽取「画面 / 角度 / 背景 / 后期方向」→ shot-spec.主体描述 / 角度 / 背景 / 后期
- **detail**（槽位 5/6/7）：读 §C `Detail-1 / Detail-2 / Detail-3`（用户指定哪条），抽微距 / 景深 / 焦点区域
- **lifestyle**：读 §C Lifestyle，用户挑特定场景行；抽画面 / 道具 → shot-spec.场景
- **context / comparison**（社区惯例槽位，无 §C 对应段）：用户口述对齐

目标平台是小红书时，读取 `listing-catalog/references/platforms/xiaohongshu.md` 的商品图 / 使用指南图 / 图文详情图规则：

- **商品图**：优先抽商品主体、规格 / 颜色差异、清晰白底或轻场景背景；避免把小红书种草封面文案混入商品主图
- **使用指南图**：抽步骤、使用场景、注意事项的可视化镜头；允许少量中文标注，但必须走文字可读 QA
- **图文详情图**：抽卖点解释、参数、材质或对比信息；如需要文字，先让用户确认文案

其他销售平台只按 `COMMERCE_PLATFORM.md` 对应平台章节映射，不把 Etsy 槽位或小红书字段套过去。

### 模式 B：读 social-platform-specs.md 对应平台

按"目标平台"输入查 social-platform-specs.md 拿：尺寸 / 安全区 / 文字密度建议 / 视觉权重重心。映射到 shot-spec.主体位置 + shot-spec.文字区。

### shoot-brief 缺失时的槽位默认值

| 槽位 | 默认 shot-spec |
|---|---|
| hero | "single product, centered, 45° elevated angle, white background, soft even lighting" |
| detail | "macro close-up, shallow depth of field, focus on key texture/joint/logo" |
| lifestyle | "product in use context, natural environment, human element optional, golden ratio composition" |
| scale | "product alongside common reference (hand / coin / common household object), same plane" |
| packaging | "product partially revealed from packaging, branded box / card / wrap visible" |
| variation | "grid layout, uniform lighting and angle across variants" |

---

## anchor 词库映射规则

### Hermes 看图能力提取（必须）

让 Hermes 看图能力看输入实拍图，按以下 5 维度结构化提取：

| 字段 | 提取目标 | 例 |
|---|---|---|
| anchor.subject | 主体名词（中文 → 英文）| "a ceramic teacup" |
| anchor.material | 材质（视觉判断）| "hand-thrown stoneware, matte glaze" |
| anchor.color | 主色 + 副色 | "sage green body with cream rim" |
| anchor.proportion | 比例（粗略，可从相对参照物推）| "shallow bowl, height-to-width ≈ 1:2" |
| anchor.logo | Logo 位置（如可见）| "small embossed mark on bottom outside" |
| anchor.texture | 关键纹理（如有特征）| "hand-thrown finger ridges visible" |

多张实拍图时取**一致信息**（多图都有的特征作 anchor，单图独有的可作选填修饰）。

### 选填来源：`Products 商品` 表 SKU 行（如已建）

精确化 anchor.subject——把视觉提取的"a ceramic teacup"升级为"a {品类}：{title 英文}"：

| Base 字段 | 加进 anchor 哪段 |
|---|---|
| title | anchor.subject 后缀（"... — {title}"）|
| 品类 | anchor.category（兜底，缺 title 时用）|
| SEO 关键词 | anchor.keywords（≤ 3 个，加进 prompt 末尾的 style hint）|

### anchor 缺失的硬约束

anchor **不允许缺**——这是保商品形态不跑偏的核心。如果实拍图不存在或无法看图，**阻塞**回到 SKILL.md step 2 让用户给路径。

---

## negative 词库映射规则

### 唯一来源：BRAND.md § 视觉禁区

**逐条复制原文**翻译成英文短语（禁区文案 **不做 paraphrase**——避免漏关键禁区元素，与 assets-library shoot-brief-template.md §B 段约定一致）。

例：

| BRAND § 视觉禁区原文（中文） | negative prompt 段（英文）|
|---|---|
| 不出现塑料感 | no plastic appearance |
| 不用工业冷光 | no industrial cold lighting |
| 不出现西方工业风家具 | no western industrial-style furniture |
| 不用模特做主角 | no model as primary subject |

### 通用兜底（始终加）

无论 BRAND 是否存在，negative 段必加：

```
no watermark, no text overlay [mode A only], no competitor branding, no AI-generated artifacts (extra fingers, distorted text, etc.)
```

模式 B 的 `no text overlay` 仅在用户**没有**指定叠层文案时加；指定了叠层文案则改为 `text overlay must match: "{文案}"`。

### BRAND 缺失时

negative 段只剩通用兜底；同时在 prompt 展示给用户时加一句 ⚠️ 提示："BRAND.md 未建立——本图未应用品牌视觉禁区，建议回 shop-foundation 建库后重新审视该输出"。

---

## format 词库映射规则

### 模式 A：按目标销售平台定

目标平台是 Etsy 时：

| 槽位 | 长宽比 | 建议分辨率 | 备注 |
|---|---|---|---|
| hero | **4:3** | 2700 × 2025 | Etsy 主图推荐尺寸；竖图也行但搜索结果会被裁切 |
| detail | 1:1 | 2000 × 2000 | 微距用方图最稳 |
| lifestyle | 1:1 或 4:3 | 2400 × 1800 | 4:3 给场景留更多上下文 |
| scale | 1:1 | 2000 × 2000 | |
| size-chart | 4:3 | 2400 × 1800 | 平铺 + 标尺需要横向空间 |
| packaging | 1:1 或 4:3 | 2400 × 1800 | 看是否拍开箱过程 |
| variation | 1:1（网格）| 2400 × 2400 | 高分辨率给网格细节 |
| brand-story | 4:3 | 2400 × 1800 | 工坊环境通常需要横向构图 |

目标平台是小红书时：

| 用途 | 长宽比 | 建议分辨率 | 备注 |
|---|---|---|---|
| 商品图 | 1:1 或 3:4 | 800 × 800 或 750 × 1000 | 以 `platforms/xiaohongshu.md` 和后台类目要求为准 |
| 使用指南图 | 3:4 | 750 × 1000 | 可承载步骤说明；文字需可读 |
| 图文详情图 | 3:4 或后台允许比例 | 750 × 1000 起 | 卖点、参数、材质说明需用户确认 |

其他销售平台按 `COMMERCE_PLATFORM.md` 的媒体规则定；缺配置时阻塞，不猜尺寸。

### 模式 B：按平台定（详见 social-platform-specs.md）

主流平台速查（详细规范见 social-platform-specs.md）：

| 平台 | 长宽比 | 分辨率 |
|---|---|---|
| Pinterest pin | 2:3 | 1000 × 1500 |
| Instagram post | 1:1 | 1080 × 1080 |
| Instagram Story / Reel cover | 9:16 | 1080 × 1920 |
| 小红书图文 / 商品种草图 | 3:4 | 750 × 1000 |
| Twitter/X post | 16:9 | 1600 × 900 |
| Facebook post | 1.91:1 | 1200 × 628 |

### format 不允许缺

如果用户既没指定槽位（模式 A）也没指定平台（模式 B），SKILL.md step 2 必须阻塞反问——本 skill **不替用户拍板**输出尺寸。

---

## 最终 prompt 拼装

5 类词库填好后，按以下英文模板拼装为 1 段 prompt + 1 段 negative prompt 喂给生图工具。

### 模板

```
Product: {anchor.subject}, {anchor.material}, {anchor.color}, {anchor.proportion}{; anchor.logo if applicable}{; anchor.texture if applicable}.

Composition: {shot-spec.角度}, {shot-spec.背景}, {shot-spec.主体位置 / 焦点区域 / 场景}.

Mood: {mood.整体气质}; lighting: {mood.光线}; color palette: {mood.配色}; props (whitelist): {mood.道具白名单 join ", "}; post-processing: {mood.后期方向}.

Format: {format.长宽比} aspect ratio, {format.分辨率} resolution, photorealistic product photography.
```

Negative prompt（独立传，如生图工具支持；不支持则附在 prompt 末尾）：

```
{negative 原文翻译 join ", "}, no watermark, {mode-A: no text overlay | mode-B: text overlay must match "{文案}" if specified else no text overlay}, no competitor branding, no AI artifacts.
```

### prompt 段顺序的设计理由

- **anchor 起头**：现代 image gen 模型对 prompt 起头部分权重最高——把商品锚点放最前，最大化保形几率
- **shot-spec 第二**：定义"怎么拍这个东西"
- **mood 第三**：氛围 / 风格修饰是"调味"，权重稍低
- **format 末尾**：分辨率 / 长宽比是 hard constraint，模型按格式参数读，不靠 prompt 体现
- **negative 单独传**：生图工具如果支持独立的 negative prompt 字段（多数 SDXL / FLUX 系支持），单独传精度更高

---

## 用户口述 brief 时的对齐流程

如果输入是用户口述（既不是 shoot-brief.md 路径也不是反向触发 in-memory），按以下 ≤ 3 轮对齐成结构化短 brief：

**第 1 轮**：一次问全：

> 「告诉我三件事：① 这是什么商品（一句话）② 想要什么场景或氛围（具体到能想象的画面）③ 主要色调和光线偏好」

**第 2 轮**：把答复结构化展示给用户预览：

```
解析到的 brief：
- mood.气质：{用户答的氛围 → 译英}
- mood.光线：{用户答的光线 → 译英}
- mood.配色：{用户答的色调 → 译英}
- shot-spec.场景：{从用户口述提炼的画面}
- shot-spec.角度：{从场景推断；用户没指定时默认 45° elevated}
- shot-spec.背景：{从场景推断；用户没指定时按槽位 default}
```

**第 3 轮**：让用户微调或确认。如果用户还在犹豫，**不要继续追问**——建议用户先回 assets-library 模式 D 出正式 brief 再回来。

3 轮内对齐不上就降级为"用户先出正式 brief"——避免无限轮聊天消耗用户耐心。

---

## 修订历史

| 版本 | 日期 | 改动 |
|---|---|---|
| v1 | 2026-05-07 | 初版：5 类词库定义、映射规则、最终 prompt 拼装模板 |
| v2 | 2026-06-16 | 模式 A 改为按目标销售平台分流，增加小红书商品图 / 使用指南图 / 图文详情图规则 |
