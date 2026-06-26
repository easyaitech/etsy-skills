# 三模型生图对比 harness

给同一组「商品实拍图 + prompt」同时打 **Nano Banana Pro / GPT Image 2 / Seedream 4.5**,产出横向对比图 + 评分表,用来肉眼选出最适合你店铺的模型,再接回 [`image-synth`](../SKILL.md)。

> **接入(2026-06 live 核对)**:Nano Banana Pro + GPT Image 2 走 **OpenRouter**(`OPENROUTER_API_KEY`);Seedream 4.5 **不在 OpenRouter**,走字节原生 **火山引擎方舟**(`ARK_API_KEY`,即 `ark-` 开头的 key)。所以要两个 key。
> (fal 是 Seedream 的备选路线,见 `fal.ts`;默认走火山方舟——国内直连最快最便宜。)

> 这是**一次性选型工具**,不是 image-synth 的运行时依赖。选定模型后可以留着,等新模型出了再重跑。

---

## 一、准备(一次性)

```bash
cd image-synth/scripts
npm install
```

**配 key**(两个:OpenRouter `sk-or-...` + 火山方舟 `ark-...`)。别写进 repo,二选一:

```bash
# A) 环境变量
export OPENROUTER_API_KEY=sk-or-xxxx   # Nano Banana Pro + GPT Image 2
export ARK_API_KEY=ark-xxxx            # Seedream 4.5(火山方舟)
# 国际区(BytePlus)再加:export ARK_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3

# B) 建 scripts/.env(已被 .gitignore 忽略),写两行:
#    OPENROUTER_API_KEY=sk-or-xxxx
#    ARK_API_KEY=ark-xxxx
# 然后跑的时候加 --env-file=.env(见下)
```

> 只想先比 OpenRouter 上那两个?把 `models.json` 里 Seedream 那条删掉,就只需要 `OPENROUTER_API_KEY`。
> Seedream 想走 fal 而非火山方舟?把 `models.json` 里 Seedream 的 `provider` 改回 `fal`、`slug` 改回 `fal-ai/bytedance/seedream/v4.5/edit`,并配 `FAL_KEY`。

**放实拍图 + 改测试档**:编辑 [`cases.json`](cases.json)
- `products[].imagePath` → 改成你真实商品实拍图的路径(绝对路径或相对本目录)
- 多个 SKU 就多加 `product`,复制 `case` 指过去
- `prompt` 可按 `BRAND.md` 语调微调;商品身份由参照图带,prompt 只管场景/氛围/构图

---

## 二、核对模型 slug(建议先跑一次)

OpenRouter 的模型 slug 偶尔会变(尤其 GPT 这条)。先列一下当前可用的:

```bash
npm run models
```

把带 ★ 的正确 slug 填回 [`models.json`](models.json)。(生图时若某模型报 404,也是来这儿核对。)

---

## 三、预览(不花钱)→ 真跑(花钱)

```bash
# 预览:打印计划 + 估算成本,不调 API
npm run bench

# 确认后真跑(15 次生图 ≈ $1–2)
npm run bench -- --run

# 用 .env 里的 key 真跑
npx tsx --env-file=.env bench.ts --run

# 只跑某一档 / 降到 1K 先粗筛省钱
npm run bench -- --run --only hero-white
npm run bench -- --run --resolution 1K
```

跑完产物落在 `bench-out/<时间戳>/`:
- **`comparison.html`** — 横向对比 grid(左列参照实拍图,逐行对比三模型,点图看大图)← 主要看这个
- **`scores.csv`** — 评分表,已自动填好成本/耗时,你手填 1–5 分
- **`results.json`** — 原始结果(含每次真实 `usage.cost`)

---

## 四、怎么打分(评分标准)

打开 `comparison.html` 对着参照实拍图逐格看,在 `scores.csv` 按 1–5 打:

| 维度 | 看什么 | 权重 |
|---|---|---|
| **保形** | 商品形态/材质/比例/Logo 跟实拍图一致吗?(模式 A 命门) | 高 |
| **清晰度** | 细节锐利度、有没有糊/塑料感 | 高 |
| **文字** | 若图上有文字/标签,拼写对不对、清不清楚 | 中 |
| **氛围** | 跟 `BRAND.md` 气质契合吗、好不好看 | 中 |
| **提示词遵循** | 该有的元素(白底/手持/留白)到位吗 | 中 |

> 模式 A(电商图)重「保形 + 清晰度」;模式 B(社媒图)重「氛围 + 文字 + 留白」,保形可放宽。
> 成本/耗时表里已自动记,作参考,别让它主导——质量优先。

加权各模型总分,选高的那个。

---

## 五、成本说明

- OpenRouter 两个模型:真实花费由 `usage.cost` 回,记在 `results.json`/`scores.csv`,**不靠估**。
- Seedream(火山方舟):响应不带美元费用,按单价表记 ~$0.04/张(估);真实计费以火山控制台为准。
- 预览里的估算用粗略单价表(`report.ts` 的 `PRICE_HINT`),仅供下决心前心里有数。
- 想省:先 `--resolution 1K` 粗筛 → 选定模型后,正式出图再上 2K/4K(对应之前聊的「草稿→升清」打法)。

---

## 六、选完之后

把胜出模型告诉我,我把它接进 `image-synth` 的 step 7 生图(用一个 `IMAGE_MODEL` 配置位,默认胜出者,可按图档切换),并把当前「Hermes 自带能力」那段架构改成外部生图 adapter。这步建议走一遍 stack 的 plan review 再落地。

---

## 文件一览

| 文件 | 作用 |
|---|---|
| `bench.ts` | 主 runner(预览/真跑/落报告;按 provider 分发) |
| `openrouter.ts` | OpenRouter `/images` 客户端(Nano Banana Pro + GPT Image 2)+ 实拍图转 data URI |
| `volcengine.ts` | 火山方舟客户端(Seedream 4.5,默认路线;`watermark:false`) |
| `fal.ts` | fal.ai 客户端(Seedream 备选路线) |
| `report.ts` | 纯函数:对比 HTML / 评分 CSV / 成本估算 / 宽高换算(有单测) |
| `models-list.ts` | 列 OpenRouter 可用图片模型 slug(Seedream 不在此,它走 fal) |
| `models.json` | 三个候选模型 + slug(可改) |
| `cases.json` | 测试档 + 你的实拍图路径(要改) |
| `__tests__/report.test.ts` | vitest 单测(`npm test`) |
