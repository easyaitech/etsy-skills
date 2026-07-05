// 三模型生图对比 runner
//   预览(默认):  npm run bench
//   真跑(花钱):  npm run bench -- --run
//   只跑某档:     npm run bench -- --run --only hero-white
//   覆盖分辨率:   npm run bench -- --run --resolution 1K
//
// key 走环境变量:OPENROUTER_API_KEY(别写进 repo)。可用 `tsx --env-file=.env bench.ts`。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fileToDataUri, generateImage, OpenRouterError } from "./openrouter.js";
import { falGenerate, FalError } from "./fal.js";
import { arkGenerate, ArkError } from "./volcengine.js";
import {
  buildComparisonHtml,
  buildScoresCsv,
  composePrompt,
  dimsFor,
  ensureMinPixels,
  estimateRun,
  priceHint,
  safeName,
} from "./report.js";

/** Seedream 火山方舟最小像素门槛 */
const ARK_MIN_PIXELS = 3_686_400;
import type { CasesConfig, GenResult, ModelsConfig, Provider } from "./types.js";

const EXIT_USAGE = 1;
const EXIT_CONFIG = 2;
const EXIT_NO_SUCCESS = 3;

const HERE = dirname(fileURLToPath(import.meta.url));

function fail(code: number, msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(code);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const value = process.argv[i + 1];
  if (!value || value.startsWith("--")) fail(EXIT_USAGE, `--${name} 必须带值`);
  return value;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) fail(EXIT_CONFIG, `找不到配置文件: ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (e) {
    return fail(EXIT_CONFIG, `配置文件不是合法 JSON (${path}): ${(e as Error).message}`);
  }
}

function stamp(): string {
  // 本地 Node 脚本,Date 可用
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function main(): Promise<void> {
  const casesPath = resolve(HERE, arg("cases") ?? "cases.json");
  const modelsPath = resolve(HERE, arg("models") ?? "models.json");
  const outRoot = resolve(HERE, arg("out") ?? "bench-out");
  const resolutionOverride = arg("resolution");
  const seedArg = arg("seed");
  const seed = seedArg == null ? undefined : Number(seedArg);
  if (seed != null && !Number.isFinite(seed)) fail(EXIT_USAGE, "--seed 必须是数字");
  const only = arg("only")?.split(",").map((s) => s.trim());
  const onlyModel = arg("model")?.split(",").map((s) => s.trim());
  const doRun = flag("run");

  const modelsCfg = readJson<ModelsConfig>(modelsPath);
  const casesCfg = readJson<CasesConfig>(casesPath);
  let models = modelsCfg.models ?? [];
  if (onlyModel) models = models.filter((m) => onlyModel.includes(m.key));
  let cases = casesCfg.cases ?? [];
  if (only) cases = cases.filter((c) => only.includes(c.id));
  if (resolutionOverride) cases = cases.map((c) => ({ ...c, resolution: resolutionOverride }));

  if (!models.length) fail(EXIT_CONFIG, "models.json 里没有模型");
  if (!cases.length) fail(EXIT_CONFIG, "没有要跑的 case(检查 cases.json 或 --only)");

  const productByKey = new Map((casesCfg.products ?? []).map((p) => [p.key, p]));
  const caseRefs: Record<string, string[]> = {};
  for (const c of cases) {
    const keys = c.products ?? (c.product ? [c.product] : []);
    if (!keys.length) fail(EXIT_CONFIG, `case "${c.id}" 没指定参照图(product 或 products)`);
    for (const k of keys) {
      if (!productByKey.has(k)) fail(EXIT_CONFIG, `case "${c.id}" 引用了不存在的 product "${k}"`);
    }
    caseRefs[c.id] = keys;
  }

  // ---- 预览计划 + 估算成本 ----
  const est = estimateRun(cases, models);
  const provs = new Set<Provider>(models.map((m) => m.provider ?? "openrouter"));
  const keyHint = [
    provs.has("openrouter") ? "OPENROUTER_API_KEY" : null,
    provs.has("fal") ? "FAL_KEY" : null,
    provs.has("ark") ? "ARK_API_KEY" : null,
  ].filter(Boolean).join(" + ");
  console.log(`\n📋 计划:${cases.length} 档 × ${models.length} 模型 = ${cases.length * models.length} 次生图`);
  for (const m of models) console.log(`   • ${m.label}  [${m.provider ?? "openrouter"}: ${m.slug}]`);
  console.log(`   测试档:${cases.map((c) => `${c.id}(${c.resolution})`).join(", ")}`);
  console.log(`   需要 key:${keyHint}`);
  console.log(`   估算成本:~$${est.total}${est.hasUnknown ? "(部分档无单价表,实际以 usage.cost 为准)" : ""}`);

  if (!doRun) {
    console.log(`\n💡 这是预览,没真调 API。确认无误后加 --run 真跑(生图有成本)。`);
    console.log(`   例:npm run bench -- --run\n`);
    return;
  }

  const providersUsed = new Set<Provider>(models.map((m) => m.provider ?? "openrouter"));
  const orKey = process.env.OPENROUTER_API_KEY;
  const falKey = process.env.FAL_KEY;
  const arkKey = process.env.ARK_API_KEY;
  const arkBase = process.env.ARK_BASE_URL;
  const missing: string[] = [];
  if (providersUsed.has("openrouter") && !orKey) missing.push("OPENROUTER_API_KEY(Nano Banana Pro / GPT Image 2)");
  if (providersUsed.has("fal") && !falKey) missing.push("FAL_KEY(Seedream — fal 路线)");
  if (providersUsed.has("ark") && !arkKey) missing.push("ARK_API_KEY(Seedream 4.5 — 火山方舟)");
  if (missing.length) {
    fail(
      EXIT_USAGE,
      `缺 key:${missing.join("、")}\n   设好再跑,例:\n   export OPENROUTER_API_KEY=sk-or-...\n   export ARK_API_KEY=ark-...\n   或建 scripts/.env 写这些行,再 npx tsx --env-file=.env bench.ts --run`,
    );
  }

  // 解析 + 校验实拍图路径,转 data URI(只读被引用到的 product,每个一次)
  const referenced = new Set(Object.values(caseRefs).flat());
  const productThumbs: Record<string, string> = {};
  for (const key of referenced) {
    const p = productByKey.get(key)!;
    const imgPath = isAbsolute(p.imagePath) ? p.imagePath : resolve(dirname(casesPath), p.imagePath);
    if (!existsSync(imgPath)) {
      fail(EXIT_CONFIG, `product "${key}" 的实拍图不存在: ${imgPath}\n   → 把 cases.json 里 products[].imagePath 改成你的真实图片路径`);
    }
    productThumbs[key] = fileToDataUri(imgPath);
  }

  const runStamp = stamp();
  const outDir = join(outRoot, runStamp);
  mkdirSync(outDir, { recursive: true });
  console.log(`\n▶ 开跑 → ${outDir}\n`);

  const results: GenResult[] = [];
  for (const c of cases) {
    const refUris = caseRefs[c.id].map((k) => productThumbs[k]);
    const prompt = composePrompt(c);
    for (const m of models) {
      const t0 = Date.now();
      const provider: Provider = m.provider ?? "openrouter";
      const tag = `${c.id} × ${m.key}`;
      try {
        let out: { b64: string; cost: number | null };
        if (provider === "ark") {
          const baseDims = dimsFor(c.aspectRatio, c.resolution, 4096);
          const dims = ensureMinPixels(baseDims, ARK_MIN_PIXELS);
          if (dims.width !== baseDims.width || dims.height !== baseDims.height) {
            console.log(`     ↑ Seedream 最小像素门槛:${baseDims.width}x${baseDims.height} → ${dims.width}x${dims.height}`);
          }
          out = await arkGenerate({
            apiKey: arkKey!,
            slug: m.slug,
            prompt,
            references: refUris,
            ...dims,
            seed,
            baseUrl: arkBase,
          });
        } else if (provider === "fal") {
          out = await falGenerate({
            apiKey: falKey!,
            slug: m.slug,
            prompt,
            references: refUris,
            ...dimsFor(c.aspectRatio, c.resolution, 2048),
            seed,
          });
        } else {
          out = await generateImage({
            apiKey: orKey!,
            slug: m.slug,
            prompt,
            references: refUris,
            aspectRatio: c.aspectRatio,
            resolution: c.resolution,
            seed,
          });
        }
        const ms = Date.now() - t0;
        const modelDir = join(outDir, safeName(m.key));
        mkdirSync(modelDir, { recursive: true });
        const rel = `${safeName(m.key)}/${safeName(c.id)}.png`;
        writeFileSync(join(outDir, rel), Buffer.from(out.b64, "base64"));
        const costStr = out.cost != null ? `$${out.cost.toFixed(3)}` : `~$${priceHint(m.key, c.resolution) ?? "?"}`;
        console.log(`  ✓ ${tag.padEnd(34)} ${costStr.padStart(8)}  ${ms}ms`);
        results.push({
          caseId: c.id, mode: c.mode, modelKey: m.key, modelLabel: m.label, slug: m.slug,
          ok: true, outPath: rel, cost: out.cost, ms,
        });
      } catch (e) {
        const ms = Date.now() - t0;
        const withBody = e instanceof OpenRouterError || e instanceof FalError || e instanceof ArkError;
        const err = withBody ? `${e.message}${e.body ? " | " + e.body : ""}` : (e as Error).message;
        console.log(`  ✗ ${tag.padEnd(34)} ${err}`);
        if (withBody && (e.status === 404 || e.status === 400)) {
          const hint =
            provider === "ark" ? "核对火山方舟 model id / size" : provider === "fal" ? "核对 fal slug" : "跑 `npm run models` 核对";
          console.log(`     ↑ ${hint}:${m.slug}`);
        }
        results.push({
          caseId: c.id, mode: c.mode, modelKey: m.key, modelLabel: m.label, slug: m.slug,
          ok: false, error: err, ms,
        });
      }
    }
  }

  // ---- 落报告 ----
  writeFileSync(join(outDir, "results.json"), JSON.stringify({ runStamp, results }, null, 2));
  writeFileSync(join(outDir, "scores.csv"), "﻿" + buildScoresCsv(results)); // BOM 让 Excel 认 UTF-8
  writeFileSync(
    join(outDir, "comparison.html"),
    buildComparisonHtml({ runStamp, cases, models, results, productThumbs, caseRefs }),
  );

  const okCount = results.filter((r) => r.ok).length;
  const realCost = results.reduce((s, r) => s + (r.cost ?? 0), 0);
  console.log(`\n✅ 完成:${okCount}/${results.length} 成功,真实花费 $${realCost.toFixed(3)}`);
  console.log(`   对比图:   ${join(outDir, "comparison.html")}`);
  console.log(`   评分表:   ${join(outDir, "scores.csv")}`);
  if (okCount === 0) process.exit(EXIT_NO_SUCCESS);
}

main().catch((e) => fail(EXIT_USAGE, (e as Error).message));
