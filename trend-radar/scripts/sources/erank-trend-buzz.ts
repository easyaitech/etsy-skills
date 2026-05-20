import { chromium, type Browser, type BrowserContext } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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

export interface ParsedErankTrend {
  keyword: string;
  growth_label: string;
  category: string;
}

interface ErankApiResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
}

export class TrendFetchError extends Error {
  constructor(message: string, public exitCode: number) {
    super(message);
    this.name = "TrendFetchError";
  }
}

const EXIT_NETWORK = 3;
const EXIT_PARSE = 4;
const TARGET_TREND_COUNT = 100;
const SOURCE = "erank-trend-buzz" as const;
const MARKETPLACE = "etsy";
const PERIOD = "thirty";
const CATEGORY = "Keyword";
const ERANK_COUNTRY_BY_GEO: Record<string, string> = {
  US: "USA",
  GB: "GBR",
  CA: "CAN",
  AU: "AUS",
  DE: "DEU",
  FR: "FRA",
  IN: "IND",
};
const ERANK_ROUTE_COUNTRY_BY_GEO: Record<string, string> = {
  US: "us",
  GB: "uk",
  CA: "ca",
  AU: "au",
  DE: "de",
  FR: "fr",
  IN: "in",
};

function normalizeKeyword(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return numericValue(record.order_value ?? record.value);
  }
  return null;
}

function formatNumber(value: number | null): string {
  return value === null ? "" : value.toLocaleString("en-US");
}

function formatChange(value: unknown): string {
  const change = numericValue(value);
  if (change === null) return value === null ? "Hot" : "N/A";
  if (change === 0) return "No Change";
  return `${change > 0 ? "+" : ""}${formatNumber(change)} change`;
}

function buildGrowthLabel(row: Record<string, unknown>): string {
  const parts = [formatChange(row.change)];
  const avgSearches = formatNumber(numericValue(row.avg_searches));
  const avgClicks = formatNumber(numericValue(row.avg_clicks));
  const ctr = numericValue(row.ctr);
  const competition = formatNumber(numericValue(row.competition));
  const searchVolume = formatNumber(numericValue(row.search_volume));

  if (avgSearches) parts.push(`avg searches ${avgSearches}`);
  if (avgClicks) parts.push(`avg clicks ${avgClicks}`);
  if (ctr !== null) parts.push(`avg CTR ${ctr}%`);
  if (competition) parts.push(`Etsy competition ${competition}`);
  if (searchVolume) parts.push(`search volume ${searchVolume}`);
  return parts.join("; ");
}

export function parseErankTrendBuzzRows(rows: unknown[]): ParsedErankTrend[] {
  const results: ParsedErankTrend[] = [];
  const seen = new Set<string>();

  for (const raw of rows) {
    const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const keyword = normalizeKeyword(asString(row.keyword));
    if (!keyword) continue;

    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      keyword,
      growth_label: buildGrowthLabel(row),
      category: "eRank Trend Buzz / Etsy / Last 30 Days",
    });
  }

  return results;
}

export function buildErankTrendBuzzPageUrl(geo: string): string {
  const country = ERANK_ROUTE_COUNTRY_BY_GEO[geo] || geo.toLowerCase();
  return `https://members.erank.com/trend-buzz/${MARKETPLACE}/${country}/${PERIOD}`;
}

export function buildErankTrendBuzzApiPath(geo: string): string {
  const country = ERANK_COUNTRY_BY_GEO[geo] || geo;
  const params = new URLSearchParams({
    marketplace: MARKETPLACE,
    country,
    period: PERIOD,
    category: CATEGORY,
  });
  return `/api/trend-buzz?${params.toString()}`;
}

async function openErankContext(): Promise<{
  browser?: Browser;
  context: BrowserContext;
  closeContext: boolean;
}> {
  const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : { headless: true };

  const cdpPort = process.env.ERANK_TREND_BUZZ_CDP_PORT;
  if (cdpPort) {
    const versionResponse = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
    const versionPayload = await versionResponse.json() as { webSocketDebuggerUrl?: string };
    if (!versionPayload.webSocketDebuggerUrl) {
      throw new Error(`CDP ${cdpPort} did not return webSocketDebuggerUrl`);
    }
    const cdpBrowser = await chromium.connectOverCDP(versionPayload.webSocketDebuggerUrl);
    const context = cdpBrowser.contexts()[0];
    if (!context) {
      await cdpBrowser.close().catch(() => undefined);
      throw new Error(`CDP ${cdpPort} did not return a browser context`);
    }
    return { context, closeContext: false };
  }

  const profileDir = process.env.ERANK_TREND_BUZZ_PROFILE;
  if (profileDir) {
    mkdirSync(profileDir, { recursive: true });
    const context = await chromium.launchPersistentContext(profileDir, {
      ...launchOptions,
      locale: "en-US",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    return { context, closeContext: true };
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  return { browser, context, closeContext: true };
}

function parseApiPayload(text: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new TrendFetchError(`eRank Trend Buzz API 返回非 JSON 数据 — ${detail}`, EXIT_PARSE);
  }

  if (Array.isArray(parsed)) return parsed;
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { data?: unknown[] }).data)
  ) {
    return (parsed as { data: unknown[] }).data;
  }

  const message =
    parsed && typeof parsed === "object" && "message" in parsed
      ? asString((parsed as { message?: unknown }).message)
      : "";
  throw new TrendFetchError(
    `eRank Trend Buzz API 返回格式无法识别${message ? `: ${message}` : ""}`,
    EXIT_PARSE
  );
}

const erankTrendBuzz = {
  name: SOURCE,

  async fetch(opts: { geo: string }): Promise<{
    items: TrendItem[];
    screenshotPath: string;
    snapshotPath: string;
  }> {
    const geo = opts.geo;
    const pageUrl = buildErankTrendBuzzPageUrl(geo);
    const apiPath = buildErankTrendBuzzApiPath(geo);
    const capturedAt = new Date().toISOString();
    const tempDir =
      process.env.TREND_RADAR_OUT_DIR ||
      join(process.cwd(), ".trend-radar-tmp");
    mkdirSync(tempDir, { recursive: true });

    let browser: Browser | undefined;
    let context: BrowserContext | undefined;
    let closeContext = true;

    try {
      ({ browser, context, closeContext } = await openErankContext());
    } catch (err) {
      throw new TrendFetchError(
        `无法启动 eRank 浏览器上下文 — ${err instanceof Error ? err.message : String(err)}`,
        EXIT_NETWORK
      );
    }

    try {
      const page = await context.newPage();
      await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((err) => {
        throw new TrendFetchError(
          `无法加载 eRank Trend Buzz 页面 — ${err.message}`,
          EXIT_NETWORK
        );
      });
      await page.waitForTimeout(5000);

      const apiResponse = await page.evaluate(async (path): Promise<ErankApiResponse> => {
        const response = await fetch(path, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          text: await response.text(),
        };
      }, apiPath).catch((err) => {
        throw new TrendFetchError(
          `无法调用 eRank Trend Buzz API — ${err instanceof Error ? err.message : String(err)}`,
          EXIT_NETWORK
        );
      });

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      const screenshotPath = join(tempDir, `${SOURCE}-${geo}-screenshot.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const htmlContent = await page.content();
      const snapshotPath = join(tempDir, `${SOURCE}-${geo}-snapshot.html`);
      writeFileSync(snapshotPath, htmlContent);

      if (!apiResponse.ok) {
        throw new TrendFetchError(
          apiResponse.status === 401 || apiResponse.status === 403
            ? "eRank Trend Buzz 需要已登录的 eRank 会员态；请设置 ERANK_TREND_BUZZ_PROFILE 或 ERANK_TREND_BUZZ_CDP_PORT"
            : `eRank Trend Buzz API 请求失败: ${apiResponse.status} ${apiResponse.statusText}`,
          apiResponse.status === 401 || apiResponse.status === 403 ? EXIT_PARSE : EXIT_NETWORK
        );
      }

      const parsed = parseErankTrendBuzzRows(parseApiPayload(apiResponse.text));
      if (parsed.length === 0) {
        throw new TrendFetchError(
          "eRank Trend Buzz 返回 0 条关键词，不覆盖 latest.json",
          EXIT_PARSE
        );
      }

      const items: TrendItem[] = parsed.slice(0, TARGET_TREND_COUNT).map((item, i) => ({
        keyword: item.keyword,
        source: SOURCE,
        geo,
        rank: i + 1,
        growth_label: item.growth_label,
        category: item.category,
        captured_at: capturedAt,
        trend_url: pageUrl,
      }));

      return { items, screenshotPath, snapshotPath };
    } finally {
      if (closeContext) await context?.close();
      await browser?.close();
    }
  },
};

export default erankTrendBuzz;
