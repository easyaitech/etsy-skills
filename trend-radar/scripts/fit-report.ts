import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

export const EXIT_PARSE = 4;

type Decision = "可做" | "观察" | "不做";
type Confidence = "high" | "medium" | "low";
type ContextStatus = "found" | "missing";

interface TrendItem {
  keyword: string;
  source: string;
  geo: string;
  rank: number;
  growth_label: string;
  category: string;
  captured_at: string;
  trend_url: string;
}

interface TrendRunOutput {
  generated_at: string;
  source: string;
  geo: string;
  item_count: number;
  schema_version: string;
  evidence?: {
    screenshot?: string;
    html_snapshot?: string;
  };
  items: TrendItem[];
}

interface ProductContext {
  sku: string;
  category: string;
  title: string;
  description: string;
  tags: string[];
  seoKeywords: string[];
  status: string;
}

interface BusinessContext {
  files: {
    brand: ContextStatus;
    shop: ContextStatus;
    brandMarketing: ContextStatus;
    marketingPlatform: ContextStatus;
  };
  text: string;
  productCache: ContextStatus;
  products: ProductContext[];
}

interface TrendEvidence {
  keyword: string;
  source: string;
  geo: string;
  rank: number;
  growth_label: string;
  category: string;
  captured_at: string;
  trend_url: string;
}

interface MergedTrend {
  keyword: string;
  normalized_keyword: string;
  evidence: TrendEvidence[];
}

interface CandidateProduct {
  sku: string;
  category: string;
  title: string;
  reason: string;
}

export interface FitReportItem {
  keyword: string;
  normalized_keyword: string;
  chinese_meaning: string;
  search_intent: string;
  decision: Decision;
  confidence: Confidence;
  human_decision: null;
  human_decision_at: null;
  source_summary: string;
  evidence: TrendEvidence[];
  candidate_products: CandidateProduct[];
  reasons: {
    brand_shop_fit: string;
    product_fit: string;
    marketing_scene_fit: string;
    platform_fit: string;
  };
  suggested_angle: string;
  boundaries: string[];
  explanation_source: "deterministic";
}

export interface FitReport {
  generated_at: string;
  date: string;
  geo: string;
  schema_version: "1.0";
  trend_sources: string[];
  business_context: {
    brand: ContextStatus;
    shop: ContextStatus;
    brand_marketing: ContextStatus;
    marketing_platform: ContextStatus;
    product_cache: ContextStatus;
    product_count: number;
  };
  summary: {
    adopt: number;
    watch: number;
    reject: number;
    total: number;
  };
  items: FitReportItem[];
}

export interface FitReportOptions {
  workspace: string;
  date: string;
  geo: string;
  maxItems: number;
}

export class FitReportError extends Error {
  exitCode: number;

  constructor(message: string, exitCode = EXIT_PARSE) {
    super(message);
    this.name = "FitReportError";
    this.exitCode = exitCode;
  }
}

export function normalizeKeyword(keyword: string): string {
  return keyword.toLowerCase().trim().replace(/\s+/g, " ");
}

function isReportJson(filename: string): boolean {
  return (
    filename === "fit-report.json" ||
    filename === "latest.json" ||
    filename === "latest-fit-report.json" ||
    filename.startsWith("fit-report.")
  );
}

function assertTrendRun(value: unknown, filepath: string): TrendRunOutput {
  if (!value || typeof value !== "object") {
    throw new FitReportError(`趋势源文件格式错误: ${filepath}`);
  }
  const candidate = value as Partial<TrendRunOutput>;
  if (
    typeof candidate.source !== "string" ||
    typeof candidate.geo !== "string" ||
    !Array.isArray(candidate.items)
  ) {
    throw new FitReportError(`趋势源文件缺少必要字段: ${filepath}`);
  }
  return candidate as TrendRunOutput;
}

export function loadTrendRuns(
  workspace: string,
  date: string,
  geo: string
): TrendRunOutput[] {
  const dir = join(workspace, "outputs", "trend-radar", date);
  if (!existsSync(dir)) {
    throw new FitReportError(`找不到趋势输出目录: ${dir}`);
  }

  const runs: TrendRunOutput[] = [];
  for (const filename of readdirSync(dir).sort()) {
    if (!filename.endsWith(".json") || isReportJson(filename)) continue;

    const filepath = join(dir, filename);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(filepath, "utf8"));
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new FitReportError(`无法解析趋势源文件 ${filepath}: ${detail}`);
    }

    const run = assertTrendRun(parsed, filepath);
    if (run.geo.toUpperCase() !== geo.toUpperCase()) continue;
    if (run.items.length > 0) runs.push(run);
  }

  if (runs.length === 0) {
    throw new FitReportError(`没有找到 ${date} / ${geo} 的可用趋势源 JSON`);
  }

  return runs;
}

function readOptionalFile(path: string): { status: ContextStatus; text: string } {
  if (!existsSync(path)) return { status: "missing", text: "" };
  return { status: "found", text: readFileSync(path, "utf8") };
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(asString).filter(Boolean);
  const text = asString(value);
  if (!text) return [];
  return text
    .split(/[,，\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeProduct(raw: unknown): ProductContext {
  const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    sku: asString(item.sku ?? item.SKU),
    category: asString(item.category ?? item["品类"]),
    title: asString(item.title ?? item["Title (EN)"] ?? item["标题"]),
    description: asString(
      item.description ?? item["Description (EN)"] ?? item["描述"]
    ),
    tags: asStringArray(item.tags ?? item.Tags),
    seoKeywords: asStringArray(
      item.seoKeywords ?? item.seo_keywords ?? item["SEO 关键词"]
    ),
    status: asString(item.status ?? item["状态"]),
  };
}

function loadProductCache(workspace: string): {
  status: ContextStatus;
  products: ProductContext[];
} {
  const path = join(
    workspace,
    ".cache",
    "trend-radar",
    "business-context",
    "product-catalog.json"
  );
  if (!existsSync(path)) return { status: "missing", products: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new FitReportError(`无法解析商品上下文缓存 ${path}: ${detail}`);
  }

  let rows: unknown[];
  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { products?: unknown[] }).products)
  ) {
    rows = (parsed as { products: unknown[] }).products;
  } else {
    throw new FitReportError(
      `商品上下文缓存格式错误: ${path} 必须是数组或 { "products": [...] }`
    );
  }

  return {
    status: "found",
    products: rows.map(normalizeProduct).filter((product) => product.sku),
  };
}

export function loadBusinessContext(workspace: string): BusinessContext {
  const brand = readOptionalFile(join(workspace, "BRAND.md"));
  const shop = readOptionalFile(join(workspace, "SHOP.md"));
  const brandMarketing = readOptionalFile(join(workspace, "BRAND_MARKETING.md"));
  const marketingPlatform = readOptionalFile(join(workspace, "MARKETING_PLATFORM.md"));
  const productCache = loadProductCache(workspace);

  return {
    files: {
      brand: brand.status,
      shop: shop.status,
      brandMarketing: brandMarketing.status,
      marketingPlatform: marketingPlatform.status,
    },
    text: [brand.text, shop.text, brandMarketing.text, marketingPlatform.text]
      .filter(Boolean)
      .join("\n\n"),
    productCache: productCache.status,
    products: productCache.products,
  };
}

export function mergeAndDedupe(runs: TrendRunOutput[]): MergedTrend[] {
  const grouped = new Map<string, MergedTrend>();

  for (const run of runs) {
    for (const item of run.items) {
      const normalized = normalizeKeyword(item.keyword);
      if (!normalized) continue;

      const existing =
        grouped.get(normalized) ??
        ({
          keyword: item.keyword,
          normalized_keyword: normalized,
          evidence: [],
        } satisfies MergedTrend);

      existing.evidence.push({
        keyword: item.keyword,
        source: item.source,
        geo: item.geo,
        rank: item.rank,
        growth_label: item.growth_label,
        category: item.category,
        captured_at: item.captured_at,
        trend_url: item.trend_url,
      });
      existing.evidence.sort((a, b) => a.rank - b.rank);
      grouped.set(normalized, existing);
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const bestA = Math.min(...a.evidence.map((entry) => entry.rank));
    const bestB = Math.min(...b.evidence.map((entry) => entry.rank));
    return bestA - bestB || a.keyword.localeCompare(b.keyword);
  });
}

function keywordTerms(keyword: string): string[] {
  return normalizeKeyword(keyword)
    .split(/[^a-z0-9\u4e00-\u9fff]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3 || /[\u4e00-\u9fff]/.test(term));
}

function textHasAnyTerm(text: string, terms: string[]): boolean {
  const normalized = normalizeKeyword(text);
  return terms.some((term) => normalized.includes(term));
}

const GENERIC_PRODUCT_TERMS = new Set([
  "custom",
  "decor",
  "gift",
  "gifts",
  "home",
  "idea",
  "ideas",
  "meaning",
  "meanings",
  "name",
  "names",
  "personalized",
]);

const TERM_MEANINGS: Record<string, string> = {
  aaron: "亚伦",
  agent: "特工 / 代理人",
  ancient: "古代的",
  art: "艺术",
  birthday: "生日",
  brandon: "布兰登",
  california: "加州",
  chicken: "鸡肉",
  chinese: "中国 / 中文 / 中式",
  clarke: "克拉克",
  decor: "装饰",
  dragon: "龙",
  drama: "短剧 / 剧集",
  food: "食物 / 美食",
  gift: "礼物",
  gifts: "礼物",
  hairstyles: "发型",
  mayor: "市长",
  meaning: "含义 / 寓意",
  makeup: "妆容",
  name: "名字",
  nails: "美甲",
  off: "离开 / 非校内",
  oil: "石油 / 油",
  recipes: "食谱",
  reserve: "储备",
  salad: "沙拉",
  shadow: "影子",
  shirilla: "希里拉",
  spy: "间谍",
  spring: "春季",
  tattoo: "纹身",
  zodiac: "生肖",
};

function chineseMeaning(keyword: string): string {
  if (/[\u4e00-\u9fff]/.test(keyword)) return keyword;
  const terms = keywordTerms(keyword);
  const translated = terms.map((term) => TERM_MEANINGS[term] ?? term).join(" + ");
  return translated || keyword;
}

function searchIntent(keyword: string): string {
  const normalized = normalizeKeyword(keyword);
  const has = (pattern: RegExp) => pattern.test(normalized);

  if (has(/recipe|food|chicken|salad|oil/)) {
    return "食谱/饮食灵感型搜索：用户大概率在找做法、菜单灵感、食材搭配或相关生活方式内容。";
  }
  if (has(/nail|hairstyle|makeup|tattoo/)) {
    return "造型审美型搜索：用户大概率在找图片灵感、风格参考、教程或可收藏的视觉方案。";
  }
  if (has(/gift|birthday|meaning|name|zodiac|dragon|art|decor/)) {
    return "礼物/寓意/文化灵感型搜索：用户大概率在找有含义的礼物、文化解释、装饰灵感或可购买对象。";
  }
  if (has(/spy|mayor|agent|arrest|california/)) {
    return "新闻事件型搜索：用户大概率在追踪近期新闻、人物争议或事件背景，不一定适合直接商业化承接。";
  }
  if (has(/drama|shadow|celebrity|brandon|clarke|shirilla|aaron/)) {
    return "人物/娱乐事件型搜索：用户大概率在查人物、剧集、比赛或社交媒体热点信息。";
  }
  if (has(/off campus|student|school|college|university/)) {
    return "教育/生活决策型搜索：用户大概率在找校园外住宿、学生生活安排或相关服务信息。";
  }
  if (has(/chinese/)) {
    return "泛中国文化兴趣型搜索：用户可能在找中式风格、中文含义、文化解释、食物、艺术或礼物灵感，需要结合具体词再判断。";
  }
  return `泛信息探索型搜索：用户大概率在了解「${keyword}」是什么、相关图片/新闻/灵感或下一步行动。`;
}

function sourceDisplayName(source: string): string {
  const names: Record<string, string> = {
    "google-trends": "Google Trends 总榜",
    "google-trends-chinese": "Google Trends Chinese 榜",
    "pinterest-trends": "Pinterest Trends 总榜",
    "pinterest-chinese": "Pinterest Trends Chinese 榜",
    "erank-trend-buzz": "eRank Trend Buzz Etsy 30日榜",
  };
  return names[source] ?? source;
}

function sourceSummary(evidence: TrendEvidence[]): string {
  return evidence
    .map((entry) => `${sourceDisplayName(entry.source)} rank ${entry.rank}${entry.growth_label ? ` (${entry.growth_label})` : ""}`)
    .join("；");
}

function matchedTerms(text: string, terms: string[]): string[] {
  const normalized = normalizeKeyword(text);
  return terms.filter((term) => normalized.includes(term));
}

function hasStrongProductMatch(
  productText: string,
  trend: MergedTrend,
  terms: string[]
): { matched: string[]; isStrong: boolean } {
  const normalizedText = normalizeKeyword(productText);
  const matched = matchedTerms(productText, terms);
  const exactPhrase = normalizedText.includes(trend.normalized_keyword);
  const hasHighSignalSingleTerm = matched.some(
    (term) =>
      /[\u4e00-\u9fff]/.test(term) ||
      (term.length >= 5 && !GENERIC_PRODUCT_TERMS.has(term))
  );

  return {
    matched,
    isStrong: exactPhrase || matched.length >= 2 || hasHighSignalSingleTerm,
  };
}

function matchProducts(
  trend: MergedTrend,
  products: ProductContext[]
): CandidateProduct[] {
  const terms = keywordTerms(trend.keyword);
  return products
    .map((product) => {
      const productText = [
        product.sku,
        product.category,
        product.title,
        product.description,
        product.tags.join(" "),
        product.seoKeywords.join(" "),
      ].join(" ");
      const match = hasStrongProductMatch(productText, trend, terms);
      if (!match.isStrong) return null;

      const reason = product.category
        ? `关键词与 ${product.category} / SKU 文案有重合: ${match.matched.join(", ")}`
        : `关键词与 SKU 文案有重合: ${match.matched.join(", ")}`;
      return {
        sku: product.sku,
        category: product.category,
        title: product.title,
        reason,
      } satisfies CandidateProduct;
    })
    .filter((item): item is CandidateProduct => Boolean(item))
    .slice(0, 5);
}

function deterministicFit(
  trend: MergedTrend,
  context: BusinessContext
): FitReportItem {
  const terms = keywordTerms(trend.keyword);
  const products = matchProducts(trend, context.products);
  const foundationHit = context.text ? textHasAnyTerm(context.text, terms) : false;
  const hasMarketingContext =
    context.files.brandMarketing === "found" ||
    context.files.marketingPlatform === "found";

  let decision: Decision = "不做";
  let confidence: Confidence = "low";
  if (products.length > 0 && (foundationHit || hasMarketingContext)) {
    decision = "可做";
    confidence = foundationHit ? "high" : "medium";
  } else if (products.length > 0 || foundationHit || trend.keyword.toLowerCase().includes("chinese")) {
    decision = "观察";
    confidence = "medium";
  }

  const boundaries: string[] = [];
  if (context.productCache === "missing") {
    boundaries.push("Product context cache missing: SKU-level matching skipped.");
  }
  for (const [label, status] of Object.entries(context.files)) {
    if (status === "missing") boundaries.push(`${label} missing: lower confidence.`);
  }
  if (decision === "不做") {
    boundaries.push("不要为了追热点强行改写商品或品牌事实。");
  }

  const sourceNames = Array.from(new Set(trend.evidence.map((entry) => entry.source))).join(", ");
  const productFit =
    products.length > 0
      ? `命中 ${products.length} 个候选 SKU / 品类。`
      : context.productCache === "missing"
        ? "未读取商品上下文缓存，只能做品类级判断。"
        : "没有找到自然匹配的现有 SKU。";

  return {
    keyword: trend.keyword,
    normalized_keyword: trend.normalized_keyword,
    chinese_meaning: chineseMeaning(trend.keyword),
    search_intent: searchIntent(trend.keyword),
    decision,
    confidence,
    human_decision: null,
    human_decision_at: null,
    source_summary: sourceSummary(trend.evidence),
    evidence: trend.evidence,
    candidate_products: products,
    reasons: {
      brand_shop_fit: foundationHit
        ? "关键词与品牌/店铺/营销基座文本有语义重合。"
        : "未在品牌/店铺/营销基座中找到明确重合。",
      product_fit: productFit,
      marketing_scene_fit:
        hasMarketingContext && decision !== "不做"
          ? "可进入人工判断，看是否归属到现有营销场景。"
          : "缺少足够营销场景证据，先不要生成 brief。",
      platform_fit: `趋势证据来自 ${sourceNames || "unknown"}，平台方向需人工确认。`,
    },
    suggested_angle:
      decision === "可做"
        ? `围绕「${trend.keyword}」找一个现有 SKU 的自然营销切入点。`
        : decision === "观察"
          ? `观察「${trend.keyword}」是否连续出现，再决定是否转入 brief。`
          : `暂不围绕「${trend.keyword}」产出内容。`,
    boundaries,
    explanation_source: "deterministic",
  };
}

export function buildFitReport(
  runs: TrendRunOutput[],
  context: BusinessContext,
  options: Pick<FitReportOptions, "date" | "geo" | "maxItems">
): FitReport {
  const items = mergeAndDedupe(runs)
    .slice(0, options.maxItems)
    .map((trend) => deterministicFit(trend, context));
  const summary = {
    adopt: items.filter((item) => item.decision === "可做").length,
    watch: items.filter((item) => item.decision === "观察").length,
    reject: items.filter((item) => item.decision === "不做").length,
    total: items.length,
  };

  return {
    generated_at: new Date().toISOString(),
    date: options.date,
    geo: options.geo,
    schema_version: "1.0",
    trend_sources: Array.from(new Set(runs.map((run) => run.source))).sort(),
    business_context: {
      brand: context.files.brand,
      shop: context.files.shop,
      brand_marketing: context.files.brandMarketing,
      marketing_platform: context.files.marketingPlatform,
      product_cache: context.productCache,
      product_count: context.products.length,
    },
    summary,
    items,
  };
}

function renderEvidence(evidence: TrendEvidence[]): string {
  return evidence
    .map(
      (entry) =>
        `  - ${entry.source}: rank ${entry.rank}, ${entry.growth_label || "n/a"}, ${entry.trend_url}`
    )
    .join("\n");
}

export function renderMarkdown(report: FitReport): string {
  const context = report.business_context;
  const sections = report.items.map((item, index) => {
    const products =
      item.candidate_products.length > 0
        ? item.candidate_products
            .map(
              (product) =>
                `  - ${product.sku}${product.category ? ` / ${product.category}` : ""}: ${product.reason}`
            )
            .join("\n")
        : "  - 无明确 SKU 命中";
    const boundaries =
      item.boundaries.length > 0
        ? item.boundaries.map((boundary) => `  - ${boundary}`).join("\n")
        : "  - 无额外边界";

    return `## Trend ${index + 1}: ${item.keyword}

- Decision: ${item.decision}
- Confidence: ${item.confidence}
- 关键词来源: ${item.source_summary}
- 中文含义: ${item.chinese_meaning}
- 搜索意图: ${item.search_intent}
- Human decision:
  - [ ] adopt
  - [ ] watch
  - [ ] reject
- Source evidence:
${renderEvidence(item.evidence)}
- Why this may fit:
  - Brand/shop fit: ${item.reasons.brand_shop_fit}
  - Product/SKU fit: ${item.reasons.product_fit}
  - Marketing scene fit: ${item.reasons.marketing_scene_fit}
  - Platform fit: ${item.reasons.platform_fit}
- Candidate products:
${products}
- Suggested angle:
  - ${item.suggested_angle}
- Boundaries:
${boundaries}
`;
  });

  return `# Weekly Trend Fit Report — ${report.date}

Generated: ${report.generated_at}
Geo: ${report.geo}
Trend sources: ${report.trend_sources.join(", ") || "none"}

## Business Context

- BRAND.md: ${context.brand}
- SHOP.md: ${context.shop}
- BRAND_MARKETING.md: ${context.brand_marketing}
- MARKETING_PLATFORM.md: ${context.marketing_platform}
- Product context cache: ${context.product_cache}
- Product count: ${context.product_count}

## Summary

- 可做: ${report.summary.adopt}
- 观察: ${report.summary.watch}
- 不做: ${report.summary.reject}
- Total: ${report.summary.total}

${sections.join("\n")}
`;
}

function writeAtomic(path: string, content: string): void {
  const tmpPath = `${path}.tmp`;
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, path);
}

export function writeFitReport(
  workspace: string,
  report: FitReport
): { markdownPath: string; jsonPath: string; latestMarkdownPath: string } {
  const outDir = join(workspace, "outputs", "trend-radar", report.date);
  mkdirSync(outDir, { recursive: true });

  const markdownPath = join(outDir, "fit-report.md");
  const jsonPath = join(outDir, "fit-report.json");
  const latestMarkdownPath = join(workspace, "outputs", "trend-radar", "latest-fit-report.md");

  writeAtomic(jsonPath, JSON.stringify(report, null, 2) + "\n");
  writeAtomic(markdownPath, renderMarkdown(report));
  writeAtomic(latestMarkdownPath, renderMarkdown(report));

  return { markdownPath, jsonPath, latestMarkdownPath };
}

export function generateFitReport(options: FitReportOptions): {
  report: FitReport;
  markdownPath: string;
  jsonPath: string;
  latestMarkdownPath: string;
} {
  const runs = loadTrendRuns(options.workspace, options.date, options.geo);
  const context = loadBusinessContext(options.workspace);
  const report = buildFitReport(runs, context, options);
  const paths = writeFitReport(options.workspace, report);
  return { report, ...paths };
}
