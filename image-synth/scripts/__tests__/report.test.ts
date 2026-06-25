import { describe, expect, it } from "vitest";
import {
  buildComparisonHtml,
  buildScoresCsv,
  composePrompt,
  dimsFor,
  ensureMinPixels,
  estimateRun,
  safeName,
} from "../report.js";
import type { BenchCase, GenResult, ModelSpec } from "../types.js";

const MODELS: ModelSpec[] = [
  { key: "nano-banana-pro", label: "Nano Banana Pro", slug: "google/gemini-3-pro-image" },
  { key: "seedream-4.5", label: "Seedream 4.5", slug: "bytedance-seed/seedream-4.5" },
];

const CASES: BenchCase[] = [
  { id: "hero-white", product: "p", mode: "A", prompt: "a hero", negative: "blurry", aspectRatio: "1:1", resolution: "2K" },
  { id: "social-pin", product: "p", mode: "B", prompt: "a pin", aspectRatio: "2:3", resolution: "2K" },
];

describe("safeName", () => {
  it("把斜杠/空格等替成下划线", () => {
    expect(safeName("google/gemini 3")).toBe("google_gemini_3");
    expect(safeName("hero-white.png")).toBe("hero-white.png");
  });
});

describe("composePrompt", () => {
  it("有 negative 时拼 Avoid", () => {
    expect(composePrompt({ prompt: "x", negative: "y" })).toBe("x\n\nAvoid: y");
  });
  it("没 negative 时原样", () => {
    expect(composePrompt({ prompt: "x" })).toBe("x");
  });
});

describe("estimateRun", () => {
  it("按单价表求和,2 档 × 2 模型 @2K", () => {
    const { total, hasUnknown } = estimateRun(CASES, MODELS);
    // nano 2K 0.134 + seedream 2K 0.04 = 0.174,两档 = 0.348
    expect(total).toBeCloseTo(0.348, 3);
    expect(hasUnknown).toBe(false);
  });
  it("未知模型 key 标 hasUnknown", () => {
    const { hasUnknown } = estimateRun(CASES, [{ key: "mystery", label: "M", slug: "x/y" }]);
    expect(hasUnknown).toBe(true);
  });
});

describe("dimsFor", () => {
  it("1:1 @2K → 2048×2048", () => {
    expect(dimsFor("1:1", "2K")).toEqual({ width: 2048, height: 2048 });
  });
  it("2:3 竖图 @2K → 长边在高", () => {
    expect(dimsFor("2:3", "2K")).toEqual({ width: 1365, height: 2048 });
  });
  it("4:5 @2K", () => {
    expect(dimsFor("4:5", "2K")).toEqual({ width: 1638, height: 2048 });
  });
  it("4K 被 maxSide=2048 封顶", () => {
    expect(dimsFor("1:1", "4K", 2048)).toEqual({ width: 2048, height: 2048 });
  });
});

describe("ensureMinPixels", () => {
  it("1K 3:4(768x1024)抬到 ≥3,686,400 像素", () => {
    const d = ensureMinPixels({ width: 768, height: 1024 }, 3_686_400);
    expect(d.width * d.height).toBeGreaterThanOrEqual(3_686_400);
    expect(d.width % 16).toBe(0);
    expect(d.height % 16).toBe(0);
    // 长宽比保持 ~3:4
    expect(d.width / d.height).toBeCloseTo(0.75, 1);
  });
  it("已达标的不缩小(2048x2048=4.19M)", () => {
    expect(ensureMinPixels({ width: 2048, height: 2048 }, 3_686_400)).toEqual({ width: 2048, height: 2048 });
  });
});

describe("buildScoresCsv", () => {
  it("表头 + 每个结果一行,失败行带 FAIL", () => {
    const results: GenResult[] = [
      { caseId: "hero-white", mode: "A", modelKey: "nano-banana-pro", modelLabel: "Nano Banana Pro", slug: "s", ok: true, cost: 0.13, ms: 900 },
      { caseId: "hero-white", mode: "A", modelKey: "seedream-4.5", modelLabel: "Seedream 4.5", slug: "s", ok: false, error: "HTTP 404", ms: 100 },
    ];
    const csv = buildScoresCsv(results);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3); // header + 2
    expect(lines[0]).toContain("保形_1-5");
    expect(csv).toContain("FAIL: HTTP 404");
    expect(csv).toContain("0.13");
  });
});

describe("buildComparisonHtml", () => {
  const results: GenResult[] = [
    { caseId: "hero-white", mode: "A", modelKey: "nano-banana-pro", modelLabel: "Nano Banana Pro", slug: "google/gemini-3-pro-image", ok: true, outPath: "nano-banana-pro/hero-white.png", cost: 0.13, ms: 900 },
    { caseId: "hero-white", mode: "A", modelKey: "seedream-4.5", modelLabel: "Seedream 4.5", slug: "bytedance-seed/seedream-4.5", ok: false, error: "boom", ms: 100 },
  ];
  const html = buildComparisonHtml({
    runStamp: "2026-06-24",
    cases: [CASES[0]],
    models: MODELS,
    results,
    productThumbs: { p: "data:image/png;base64,AAAA" },
    caseRefs: { "hero-white": ["p"] },
  });
  it("含模型表头和 slug", () => {
    expect(html).toContain("Nano Banana Pro");
    expect(html).toContain("google/gemini-3-pro-image");
  });
  it("成功格放图,失败格标失败", () => {
    expect(html).toContain('src="./nano-banana-pro/hero-white.png"');
    expect(html).toContain("✗ 失败");
    expect(html).toContain("boom");
  });
  it("嵌入实拍参照图", () => {
    expect(html).toContain("data:image/png;base64,AAAA");
  });
});
