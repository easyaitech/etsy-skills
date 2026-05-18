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

export interface ParsedPinterestTrend {
  keyword: string;
  growth_label: string;
  category: string;
}

export class TrendFetchError extends Error {
  constructor(message: string, public exitCode: number) {
    super(message);
    this.name = "TrendFetchError";
  }
}

const EXIT_NETWORK = 3;
const EXIT_PARSE = 4;
const TARGET_TREND_COUNT = 50;
const PINTEREST_COUNTRY_BY_GEO: Record<string, string> = {
  US: "US",
  GB: "GB",
  CA: "CA",
  AU: "AU",
  DE: "DE",
  FR: "FR",
  IT: "IT",
  ES: "ES",
  BR: "BR",
  MX: "MX",
};

function normalizeKeyword(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isPercentLine(value: string): boolean {
  return /^-?[\d,.]+%$/.test(value.trim());
}

function isNoiseLine(value: string): boolean {
  return (
    value.length < 2 ||
    value === "Keywords" ||
    value === "Weekly change" ||
    value === "Monthly change" ||
    value === "Yearly change" ||
    value === "Preview table of keyword search trends" ||
    value === "View the full list" ||
    value === "Search trends" ||
    value === "Trends in the spotlight" ||
    value === "Shopping trends" ||
    value === "Editors' Picks" ||
    value.startsWith("; Opens")
  );
}

function uniqueAppend(
  results: ParsedPinterestTrend[],
  seen: Set<string>,
  item: ParsedPinterestTrend
): void {
  const keyword = normalizeKeyword(item.keyword);
  if (!keyword || isNoiseLine(keyword)) return;
  const key = keyword.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  results.push({ ...item, keyword });
}

function parseSearchTrendTable(lines: string[]): ParsedPinterestTrend[] {
  const start = lines.findIndex((line) => line === "Keywords");
  if (start === -1) return [];

  const results: ParsedPinterestTrend[] = [];
  const seen = new Set<string>();

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === "View the full list" || line === "Editors' Picks") break;
    if (isNoiseLine(line) || isPercentLine(line)) continue;

    const changes: string[] = [];
    let cursor = i + 1;
    while (cursor < lines.length && changes.length < 3) {
      const next = lines[cursor];
      if (next === "View the full list" || next === "Editors' Picks") break;
      if (isPercentLine(next)) changes.push(next);
      cursor++;
    }

    if (changes.length >= 2) {
      uniqueAppend(results, seen, {
        keyword: line,
        growth_label: `${changes[1]} MoM`,
        category: "Search trends",
      });
      i = cursor - 1;
    }
  }

  return results;
}

function parseSpotlight(lines: string[]): ParsedPinterestTrend[] {
  const start = lines.findIndex((line) => line === "Trends in the spotlight");
  if (start === -1) return [];

  const results: ParsedPinterestTrend[] = [];
  const seen = new Set<string>();

  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === "Shopping trends" || lines[i] === "Search trends") break;
    if (!/^\d+$/.test(lines[i])) continue;

    const keyword = lines[i + 1];
    const detail = lines[i + 2] || "";
    if (!keyword || isNoiseLine(keyword)) continue;

    const growthMatch = detail.match(/(-?[\d,.]+%\s+MoM)/i);
    const categoryMatch = detail.match(/Popular in\s+(.+)$/i);
    uniqueAppend(results, seen, {
      keyword,
      growth_label: growthMatch ? growthMatch[1] : "N/A",
      category: categoryMatch ? categoryMatch[1].trim() : "Spotlight trends",
    });
  }

  return results;
}

export function parsePinterestTrendsText(text: string): ParsedPinterestTrend[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeKeyword(line))
    .filter(Boolean);

  const seen = new Set<string>();
  const results: ParsedPinterestTrend[] = [];
  for (const item of parseSearchTrendTable(lines)) {
    uniqueAppend(results, seen, item);
  }
  for (const item of parseSpotlight(lines)) {
    uniqueAppend(results, seen, item);
  }
  return results;
}

export function filterPinterestTrendsByIncludedKeyword(
  items: ParsedPinterestTrend[],
  keywordToInclude?: string
): ParsedPinterestTrend[] {
  if (!keywordToInclude) return items;
  const token = keywordToInclude.toLowerCase();
  return items.filter((item) => item.keyword.toLowerCase().includes(token));
}

export function buildPinterestTrendsUrl(
  geo: string,
  keywordToInclude?: string
): string {
  const country = PINTEREST_COUNTRY_BY_GEO[geo] || geo;
  const params = new URLSearchParams({
    country,
    trendsPreset: "1",
  });
  if (keywordToInclude) params.set("keywordsToInclude", keywordToInclude);
  return `https://trends.pinterest.com/search?${params.toString()}`;
}

function buildKeywordUrl(geo: string, keyword: string): string {
  return buildPinterestTrendsUrl(geo, keyword);
}

async function openPinterestContext(): Promise<{
  browser?: Browser;
  context: BrowserContext;
}> {
  const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : { headless: true };

  const profileDir = process.env.PINTEREST_TRENDS_PROFILE;
  if (profileDir) {
    mkdirSync(profileDir, { recursive: true });
    const context = await chromium.launchPersistentContext(profileDir, {
      ...launchOptions,
      locale: "en-US",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    return { context };
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  return { browser, context };
}

async function gotoWithRetry(page: Awaited<ReturnType<BrowserContext["newPage"]>>, url: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      return;
    } catch (err) {
      lastError = err;
      await page.waitForTimeout(2000 * attempt).catch(() => undefined);
    }
  }

  throw new TrendFetchError(
    `无法加载 Pinterest Trends 页面 — ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
    EXIT_NETWORK
  );
}

export async function fetchPinterestTrends(opts: {
  geo: string;
  source: string;
  keywordToInclude?: string;
}): Promise<{
  items: TrendItem[];
  screenshotPath: string;
  snapshotPath: string;
}> {
  const { geo, source, keywordToInclude } = opts;
  const url = buildPinterestTrendsUrl(geo, keywordToInclude);
  const capturedAt = new Date().toISOString();
  const tempDir =
    process.env.TREND_RADAR_OUT_DIR ||
    join(process.cwd(), ".trend-radar-tmp");

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;

  try {
    ({ browser, context } = await openPinterestContext());
  } catch (err) {
    throw new TrendFetchError(
      `无法启动浏览器 — ${err instanceof Error ? err.message : String(err)}`,
      EXIT_NETWORK
    );
  }

  try {
    const page = await context.newPage();
    await gotoWithRetry(page, url);
    await page.waitForTimeout(8000);

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(1000);
    }

    const renderedText = await page.locator("body").innerText().catch(() => "");
    const parsed = filterPinterestTrendsByIncludedKeyword(
      parsePinterestTrendsText(renderedText),
      keywordToInclude
    );

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const screenshotPath = join(tempDir, `${source}-${geo}-screenshot.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const htmlContent = await page.content();
    const snapshotPath = join(tempDir, `${source}-${geo}-snapshot.html`);
    writeFileSync(snapshotPath, htmlContent);

    if (parsed.length === 0) {
      if (keywordToInclude) {
        process.stderr.write(
          `警告: Pinterest Trends 页面没有返回包含 "${keywordToInclude}" 的关键词，未写入通用预览词\n`
        );
      }
      if (
        renderedText.includes("Log in to unlock") ||
        renderedText.includes("Ready to dive into Pinterest Trends?")
      ) {
        process.stderr.write(
          "警告: Pinterest Trends 只显示未登录页面，未解析到可用关键词\n"
        );
      }
      throw new TrendFetchError(
        "Pinterest Trends 返回 0 条结果，不覆盖 latest.json",
        EXIT_PARSE
      );
    }

    if (parsed.length < TARGET_TREND_COUNT) {
      process.stderr.write(
        `警告: Pinterest Trends 只解析到 ${parsed.length} 条（期望 ${TARGET_TREND_COUNT}），可能受未登录预览限制\n`
      );
    }

    const items: TrendItem[] = parsed.slice(0, TARGET_TREND_COUNT).map((p, i) => ({
      keyword: p.keyword,
      source,
      geo,
      rank: i + 1,
      growth_label: p.growth_label,
      category: p.category,
      captured_at: capturedAt,
      trend_url: buildKeywordUrl(geo, p.keyword),
    }));

    return { items, screenshotPath, snapshotPath };
  } finally {
    await context?.close();
    await browser?.close();
  }
}
