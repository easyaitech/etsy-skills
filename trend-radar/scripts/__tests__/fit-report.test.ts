import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  FitReportError,
  buildFitReport,
  generateFitReport,
  loadBusinessContext,
  loadTrendRuns,
  mergeAndDedupe,
  normalizeKeyword,
  renderMarkdown,
  writeFitReport,
} from "../fit-report.js";

const DATE = "2026-05-18";
const GEO = "US";

let workspaces: string[] = [];

afterEach(() => {
  for (const workspace of workspaces) {
    rmSync(workspace, { recursive: true, force: true });
  }
  workspaces = [];
});

function makeWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "trend-fit-"));
  workspaces.push(workspace);
  return workspace;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

function sourceRun(source: string, items: Array<{ keyword: string; rank: number }>) {
  return {
    generated_at: "2026-05-18T12:00:00.000Z",
    source,
    geo: GEO,
    item_count: items.length,
    schema_version: "1.0",
    evidence: {
      screenshot: `/tmp/${source}.png`,
      html_snapshot: `/tmp/${source}.html`,
    },
    items: items.map((item) => ({
      keyword: item.keyword,
      source,
      geo: GEO,
      rank: item.rank,
      growth_label: "+5,000%",
      category: "Gifts",
      captured_at: "2026-05-18T12:00:00Z",
      trend_url: `https://example.com/${encodeURIComponent(item.keyword)}`,
    })),
  };
}

function writeTrendRun(
  workspace: string,
  source: string,
  items: Array<{ keyword: string; rank: number }>
): void {
  writeJson(
    join(workspace, "outputs", "trend-radar", DATE, `${source}-${GEO}.json`),
    sourceRun(source, items)
  );
}

function writeBusinessContext(workspace: string): void {
  writeFileSync(
    join(workspace, "BRAND.md"),
    "Custom Chinese calligraphy gifts with warm, personal meaning.\n"
  );
  writeFileSync(join(workspace, "SHOP.md"), "店铺名: Test Shop\n");
  writeFileSync(
    join(workspace, "BRAND_MARKETING.md"),
    "生日礼物、朋友礼物、name meaning、personalized gift。\n"
  );
  writeFileSync(
    join(workspace, "MARKETING_PLATFORM.md"),
    "Pinterest focuses on gift search and visual story pins.\n"
  );
  writeJson(
    join(
      workspace,
      ".cache",
      "trend-radar",
      "business-context",
      "product-catalog.json"
    ),
    {
      products: [
        {
          SKU: "BM-001",
          "品类": "Bookmark",
          "Title (EN)": "Custom Chinese Calligraphy Bookmark",
          "Description (EN)": "Personalized name meaning birthday gift for a friend.",
          Tags: ["custom bookmark", "name meaning", "friend gift"],
          "SEO 关键词": ["Chinese name meaning gift", "personalized bookmark"],
          "状态": "草稿",
        },
      ],
    }
  );
}

describe("fit report helpers", () => {
  it("normalizes keywords without stemming or translation", () => {
    expect(normalizeKeyword("  Chinese   Name Meaning  ")).toBe(
      "chinese name meaning"
    );
    expect(normalizeKeyword("中文 名字")).toBe("中文 名字");
  });

  it("loads all source JSONs for a date and ignores report JSON", () => {
    const workspace = makeWorkspace();
    writeTrendRun(workspace, "google-trends", [{ keyword: "Chinese name meaning", rank: 1 }]);
    writeTrendRun(workspace, "pinterest-chinese", [{ keyword: "Chinese Name Meaning", rank: 2 }]);
    writeFileSync(
      join(workspace, "outputs", "trend-radar", DATE, "fit-report.json"),
      "{bad json"
    );

    const runs = loadTrendRuns(workspace, DATE, GEO);
    expect(runs.map((run) => run.source)).toEqual([
      "google-trends",
      "pinterest-chinese",
    ]);
  });

  it("filters source JSONs by requested geo", () => {
    const workspace = makeWorkspace();
    writeTrendRun(workspace, "google-trends", [{ keyword: "Chinese name meaning", rank: 1 }]);
    writeJson(
      join(workspace, "outputs", "trend-radar", DATE, "google-trends-GB.json"),
      { ...sourceRun("google-trends", [{ keyword: "UK trend", rank: 1 }]), geo: "GB" }
    );

    const runs = loadTrendRuns(workspace, DATE, GEO);
    expect(runs).toHaveLength(1);
    expect(runs[0].geo).toBe(GEO);
  });

  it("names malformed source JSON files", () => {
    const workspace = makeWorkspace();
    const path = join(workspace, "outputs", "trend-radar", DATE, "google-trends-US.json");
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "{bad json");

    expect(() => loadTrendRuns(workspace, DATE, GEO)).toThrow(FitReportError);
    expect(() => loadTrendRuns(workspace, DATE, GEO)).toThrow(path);
  });

  it("throws when no source files exist for a date", () => {
    const workspace = makeWorkspace();
    mkdirSync(join(workspace, "outputs", "trend-radar", DATE), { recursive: true });

    expect(() => loadTrendRuns(workspace, DATE, GEO)).toThrow(
      `没有找到 ${DATE} / ${GEO} 的可用趋势源 JSON`
    );
  });

  it("loads missing product cache as a degraded context", () => {
    const workspace = makeWorkspace();
    writeFileSync(join(workspace, "BRAND.md"), "Chinese calligraphy gift\n");

    const context = loadBusinessContext(workspace);
    expect(context.productCache).toBe("missing");
    expect(context.products).toEqual([]);
    expect(context.files.brand).toBe("found");
    expect(context.files.brandMarketing).toBe("missing");
  });

  it("loads product cache when the cache root is an array", () => {
    const workspace = makeWorkspace();
    writeJson(
      join(
        workspace,
        ".cache",
        "trend-radar",
        "business-context",
        "product-catalog.json"
      ),
      [{ SKU: "BM-001", "品类": "Bookmark" }]
    );

    const context = loadBusinessContext(workspace);
    expect(context.productCache).toBe("found");
    expect(context.products).toHaveLength(1);
    expect(context.products[0].sku).toBe("BM-001");
  });

  it("rejects product cache with an unsupported shape", () => {
    const workspace = makeWorkspace();
    writeJson(
      join(
        workspace,
        ".cache",
        "trend-radar",
        "business-context",
        "product-catalog.json"
      ),
      { items: [] }
    );

    expect(() => loadBusinessContext(workspace)).toThrow(FitReportError);
    expect(() => loadBusinessContext(workspace)).toThrow(
      "必须是数组或 { \"products\": [...] }"
    );
  });

  it("merges duplicate normalized keywords while preserving evidence", () => {
    const runs = [
      sourceRun("google-trends", [{ keyword: "Chinese name meaning", rank: 1 }]),
      sourceRun("pinterest-chinese", [{ keyword: " Chinese  Name Meaning ", rank: 3 }]),
    ];

    const merged = mergeAndDedupe(runs);
    expect(merged).toHaveLength(1);
    expect(merged[0].evidence.map((entry) => entry.source)).toEqual([
      "google-trends",
      "pinterest-chinese",
    ]);
  });

  it("builds decisions with deterministic rules", () => {
    const workspace = makeWorkspace();
    writeBusinessContext(workspace);
    const context = loadBusinessContext(workspace);
    const runs = [
      sourceRun("google-trends", [
        { keyword: "Chinese name meaning", rank: 1 },
        { keyword: "random celebrity drama", rank: 2 },
      ]),
    ];

    const report = buildFitReport(runs, context, {
      date: DATE,
      geo: GEO,
      maxItems: 10,
    });

    expect(report.items[0]).toMatchObject({
      keyword: "Chinese name meaning",
      decision: "可做",
      confidence: "high",
      human_decision: null,
      human_decision_at: null,
    });
    expect(report.items[0].candidate_products[0].sku).toBe("BM-001");
    expect(report.items[1].decision).toBe("不做");
  });

  it("does not treat a single generic product term as a SKU match", () => {
    const workspace = makeWorkspace();
    writeFileSync(
      join(workspace, "BRAND.md"),
      "Custom Chinese calligraphy gifts with warm, personal meaning.\n"
    );
    writeJson(
      join(
        workspace,
        ".cache",
        "trend-radar",
        "business-context",
        "product-catalog.json"
      ),
      {
        products: [
          {
            SKU: "NT-001",
            "品类": "Office",
            "Title (EN)": "Name Tag Holder",
            "Description (EN)": "Reusable name label organizer.",
          },
        ],
      }
    );

    const report = buildFitReport(
      [sourceRun("google-trends", [{ keyword: "Chinese name meaning", rank: 1 }])],
      loadBusinessContext(workspace),
      { date: DATE, geo: GEO, maxItems: 10 }
    );

    expect(report.items[0].candidate_products).toEqual([]);
    expect(report.items[0].decision).toBe("观察");
  });

  it("marks SKU matching skipped when product cache is missing", () => {
    const context = loadBusinessContext(makeWorkspace());
    const report = buildFitReport(
      [sourceRun("google-trends-chinese", [{ keyword: "Chinese zodiac gift", rank: 1 }])],
      context,
      { date: DATE, geo: GEO, maxItems: 10 }
    );

    expect(report.items[0].decision).toBe("观察");
    expect(report.items[0].boundaries).toContain(
      "Product context cache missing: SKU-level matching skipped."
    );
  });

  it("renders markdown with summary and human review checkboxes", () => {
    const workspace = makeWorkspace();
    writeBusinessContext(workspace);
    const report = buildFitReport(
      [sourceRun("google-trends", [{ keyword: "Chinese name meaning", rank: 1 }])],
      loadBusinessContext(workspace),
      { date: DATE, geo: GEO, maxItems: 10 }
    );

    const markdown = renderMarkdown(report);
    expect(markdown).toContain("# Weekly Trend Fit Report");
    expect(markdown).toContain("- 可做: 1");
    expect(markdown).toContain("- [ ] adopt");
    expect(markdown).toContain("BM-001");
  });

  it("writes dated report files and latest markdown", () => {
    const workspace = makeWorkspace();
    writeBusinessContext(workspace);
    writeTrendRun(workspace, "google-trends", [{ keyword: "Chinese name meaning", rank: 1 }]);

    const result = generateFitReport({
      workspace,
      date: DATE,
      geo: GEO,
      maxItems: 10,
    });

    expect(readFileSync(result.markdownPath, "utf8")).toContain(
      "Weekly Trend Fit Report"
    );
    expect(readFileSync(result.latestMarkdownPath, "utf8")).toContain(
      "Chinese name meaning"
    );
    const json = JSON.parse(readFileSync(result.jsonPath, "utf8"));
    expect(json.items[0].human_decision).toBeNull();
  });

  it("does not replace latest markdown when latest write fails", () => {
    const workspace = makeWorkspace();
    writeBusinessContext(workspace);
    const report = buildFitReport(
      [sourceRun("google-trends", [{ keyword: "Chinese name meaning", rank: 1 }])],
      loadBusinessContext(workspace),
      { date: DATE, geo: GEO, maxItems: 10 }
    );
    const latestPath = join(workspace, "outputs", "trend-radar", "latest-fit-report.md");
    mkdirSync(join(latestPath, ".."), { recursive: true });
    writeFileSync(latestPath, "old latest\n");
    mkdirSync(`${latestPath}.tmp`);

    expect(() => writeFitReport(workspace, report)).toThrow();
    expect(readFileSync(latestPath, "utf8")).toBe("old latest\n");
  });
});
