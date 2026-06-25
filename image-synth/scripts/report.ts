// 纯函数:对比 grid HTML + 评分表 CSV + 成本估算。无 IO,便于单测。
import type { BenchCase, GenResult, ModelSpec } from "./types.js";

/** 安全文件名/目录名 */
export function safeName(s: string): string {
  return s.replace(/[^a-z0-9._-]/gi, "_");
}

/** 把 negative 统一拼到 prompt 尾部,保证三模型吃到同样的反向词 */
export function composePrompt(c: Pick<BenchCase, "prompt" | "negative">): string {
  return c.negative ? `${c.prompt}\n\nAvoid: ${c.negative}` : c.prompt;
}

const RES_LONG_SIDE: Record<string, number> = { "1K": 1024, "2K": 2048, "4K": 4096 };

/** aspectRatio("w:h")+resolution → {width,height},长边封顶 maxSide(fal/Seedream 最大 2048)。fal 要显式宽高 */
export function dimsFor(aspectRatio: string, resolution: string, maxSide = 2048): { width: number; height: number } {
  const [aRaw, bRaw] = aspectRatio.split(":").map(Number);
  const a = aRaw > 0 ? aRaw : 1;
  const b = bRaw > 0 ? bRaw : 1;
  const long = Math.min(RES_LONG_SIDE[resolution] ?? 2048, maxSide);
  // 长边给 long,短边按比例;再各自封顶
  let width: number;
  let height: number;
  if (a >= b) {
    width = long;
    height = Math.round((long * b) / a);
  } else {
    height = long;
    width = Math.round((long * a) / b);
  }
  return { width: Math.min(width, maxSide), height: Math.min(height, maxSide) };
}

/** 把尺寸抬到最小像素门槛(保持长宽比)并对齐到 multiple 的整数倍。Seedream 火山方舟要求 ≥3,686,400 像素 */
export function ensureMinPixels(
  dims: { width: number; height: number },
  minPixels: number,
  multiple = 16,
): { width: number; height: number } {
  let { width, height } = dims;
  const px = width * height;
  if (px < minPixels) {
    const s = Math.sqrt(minPixels / px);
    width = Math.ceil(width * s);
    height = Math.ceil(height * s);
  }
  const snap = (n: number) => Math.ceil(n / multiple) * multiple;
  return { width: snap(width), height: snap(height) };
}

/** 干跑用的粗略单价(美元/张)。真实成本以 OpenRouter usage.cost 为准 */
export const PRICE_HINT: Record<string, Record<string, number>> = {
  "nano-banana-pro": { "1K": 0.039, "2K": 0.134, "4K": 0.24 },
  "gpt-image-2": { "1K": 0.04, "2K": 0.12, "4K": 0.2 },
  "seedream-4.5": { "1K": 0.04, "2K": 0.04, "4K": 0.04 },
};

export function priceHint(modelKey: string, resolution: string): number | null {
  return PRICE_HINT[modelKey]?.[resolution] ?? null;
}

export function estimateRun(cases: BenchCase[], models: ModelSpec[]): { total: number; hasUnknown: boolean } {
  let total = 0;
  let hasUnknown = false;
  for (const c of cases) {
    for (const m of models) {
      const p = priceHint(m.key, c.resolution);
      if (p == null) hasUnknown = true;
      else total += p;
    }
  }
  return { total: Math.round(total * 1000) / 1000, hasUnknown };
}

/** 评分表 CSV:每个 case×model 一行,自动填成本/耗时,人工填 1-5 分 */
export function buildScoresCsv(results: GenResult[]): string {
  const header = [
    "case_id",
    "mode",
    "model",
    "保形_1-5",
    "清晰度_1-5",
    "文字_1-5",
    "氛围_1-5",
    "提示词遵循_1-5",
    "成本USD",
    "耗时ms",
    "状态",
    "备注",
  ];
  const rows = results.map((r) =>
    [
      r.caseId,
      r.mode,
      r.modelLabel,
      "",
      "",
      "",
      "",
      "",
      r.cost ?? "",
      r.ms ?? "",
      r.ok ? "ok" : `FAIL: ${r.error ?? ""}`,
      "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export interface HtmlOpts {
  runStamp: string;
  cases: BenchCase[];
  models: ModelSpec[];
  results: GenResult[];
  /** product.key -> data URI(实拍图缩略,嵌进 HTML 方便对比保形) */
  productThumbs: Record<string, string>;
  /** case.id -> 该 case 引用的 product.key 列表(有序) */
  caseRefs: Record<string, string[]>;
}

/** 横向对比 grid:行=case(含实拍图参照),列=模型 */
export function buildComparisonHtml(opts: HtmlOpts): string {
  const { runStamp, cases, models, results, productThumbs, caseRefs } = opts;
  const byKey = new Map<string, GenResult>();
  for (const r of results) byKey.set(`${r.caseId}::${r.modelKey}`, r);

  const cell = (caseId: string, m: ModelSpec): string => {
    const r = byKey.get(`${caseId}::${m.key}`);
    if (!r || !r.ok || !r.outPath) {
      return `<td class="fail"><div class="x">✗ 失败</div><div class="err">${escapeHtml(r?.error ?? "未生成")}</div></td>`;
    }
    const meta = `${r.cost != null ? "$" + r.cost.toFixed(3) : "成本?"} · ${r.ms ?? "?"}ms`;
    return `<td><a href="./${escapeAttr(r.outPath)}" target="_blank"><img src="./${escapeAttr(r.outPath)}" loading="lazy"></a><div class="meta">${meta}</div></td>`;
  };

  const rows = cases
    .map((c) => {
      const keys = caseRefs[c.id] ?? [];
      const thumbs = keys
        .map((k, i) => (productThumbs[k] ? `<img class="ref" title="图${i + 1}: ${escapeAttr(k)}" src="${productThumbs[k]}">` : ""))
        .filter(Boolean)
        .join("");
      const ref = thumbs || `<div class="noref">无实拍图</div>`;
      const modelCells = models.map((m) => cell(c.id, m)).join("");
      return `<tr>
  <td class="caseinfo">
    <div class="cid">${escapeHtml(c.id)}</div>
    <div class="badge mode-${c.mode}">模式 ${c.mode}</div>
    <div class="spec">${escapeHtml(c.aspectRatio)} · ${escapeHtml(c.resolution)}</div>
    <div class="note">${escapeHtml(c.note ?? "")}</div>
    <div class="reflbl">参照实拍图 ↓</div>${ref}
  </td>
  ${modelCells}
</tr>`;
    })
    .join("\n");

  const head = models.map((m) => `<th>${escapeHtml(m.label)}<div class="slug">${escapeHtml(m.slug)}</div></th>`).join("");

  return `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<title>生图三模型对比 — ${escapeHtml(runStamp)}</title>
<style>
  body{font:14px/1.5 -apple-system,system-ui,"PingFang SC",sans-serif;margin:24px;color:#1a1a1a;background:#fafafa}
  h1{font-size:20px} .sub{color:#666;margin-bottom:16px}
  table{border-collapse:collapse;width:100%} td,th{border:1px solid #e0e0e0;padding:8px;vertical-align:top;text-align:center}
  th{background:#f0f0f0;font-size:13px} th .slug{font-weight:400;color:#999;font-size:11px;font-family:monospace}
  img{max-width:300px;max-height:300px;border-radius:6px;display:block;margin:0 auto;background:#fff}
  .caseinfo{text-align:left;width:200px;background:#fcfcfc}
  .cid{font-weight:700;font-size:15px} .spec{color:#666;font-family:monospace;font-size:12px;margin:2px 0}
  .note{color:#888;font-size:12px;margin:6px 0} .reflbl{color:#aaa;font-size:11px;margin-top:8px}
  .ref{max-width:80px;max-height:80px;border:1px solid #ccc;display:inline-block;margin:2px;border-radius:4px;vertical-align:top} .noref{color:#bbb;padding:20px;border:2px dashed #eee}
  .badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;color:#fff}
  .mode-A{background:#2563eb} .mode-B{background:#9333ea}
  .meta{color:#666;font-size:12px;font-family:monospace;margin-top:4px}
  .fail{background:#fff5f5} .fail .x{color:#c00;font-weight:700} .fail .err{color:#a00;font-size:11px;word-break:break-all}
</style></head><body>
<h1>生图三模型对比 <span style="color:#999">— ${escapeHtml(runStamp)}</span></h1>
<div class="sub">左列是参照实拍图,逐行对比三个模型。点图看大图。打分填同目录的 <code>scores.csv</code>。</div>
<table>
<thead><tr><th class="caseinfo">测试档 / 参照图</th>${head}</tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
}
function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}
