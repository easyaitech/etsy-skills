import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
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

export interface ParsedTrend {
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

export function parseTrendingPage(html: string): ParsedTrend[] {
  const results: ParsedTrend[] = [];

  // Google Trends trending-now page renders trend rows.
  // Each trending search has a container with the keyword text, traffic volume, and category.
  // We parse using regex on the rendered HTML to extract structured data.

  // Strategy: find all trending search items by looking for the pattern of
  // trend title elements followed by traffic/growth info.
  // The page uses a table-like structure with rows for each trending keyword.

  // Match trend rows: look for links to /trends/explore with keyword text
  const trendBlockRegex =
    /<a[^>]*href="\/trends\/explore\?[^"]*q=([^"&]+)[^"]*"[^>]*>([^<]*)<\/a>/gi;
  let match: RegExpExecArray | null;
  const seen = new Set<string>();
  const CONTEXT_WINDOW = 800;

  while ((match = trendBlockRegex.exec(html)) !== null) {
    const keyword = decodeURIComponent(match[1]).replace(/\+/g, " ").trim();
    if (!keyword || seen.has(keyword.toLowerCase())) continue;
    seen.add(keyword.toLowerCase());

    const afterMatch = html.slice(match.index, match.index + CONTEXT_WINDOW);
    const growthMatch = afterMatch.match(
      /(\+[\d,]+%|Breakout|&gt;\s*[\d,]+%|[\d,]+[KM]\+?)/i
    );
    const categoryMatch = afterMatch.match(
      /(?:category|topic|class="category")[^>]*>([^<]+)</i
    );

    results.push({
      keyword,
      growth_label: growthMatch ? growthMatch[1].replace(/&gt;/g, ">") : "N/A",
      category: categoryMatch ? categoryMatch[1].trim() : "All",
    });
  }

  // Fallback: if the regex above found nothing, try a broader pattern
  // Google Trends sometimes renders keywords in different structures
  if (results.length === 0) {
    const altRegex =
      /<div[^>]*class="[^"]*feed-item[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
    while ((match = altRegex.exec(html)) !== null) {
      const keyword = match[1].trim();
      if (!keyword || keyword.length < 2 || seen.has(keyword.toLowerCase()))
        continue;
      seen.add(keyword.toLowerCase());
      results.push({ keyword, growth_label: "N/A", category: "All" });
    }
  }

  return results;
}

export function buildExploreUrl(keyword: string, geo: string): string {
  return `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}&geo=${encodeURIComponent(geo)}`;
}

const googleTrends = {
  name: "google-trends" as const,

  async fetch(opts: { geo: string }): Promise<{
    items: TrendItem[];
    screenshotPath: string;
    snapshotPath: string;
  }> {
    const geo = opts.geo;
    const url = `https://trends.google.com/trending?geo=${encodeURIComponent(geo)}&hours=168`;
    const capturedAt = new Date().toISOString();

    const tempDir =
      process.env.TREND_RADAR_OUT_DIR ||
      join(process.cwd(), ".trend-radar-tmp");

    const browser = await chromium.launch({ headless: true }).catch((err) => {
      throw new TrendFetchError(
        `无法启动浏览器 — ${err.message}`,
        EXIT_NETWORK
      );
    });

    try {
      const context = await browser.newContext({
        locale: "en-US",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      });
      const page = await context.newPage();

      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch((err) => {
        throw new TrendFetchError(
          `无法加载页面 — ${err.message}`,
          EXIT_NETWORK
        );
      });

      // Dismiss Google consent overlay if present
      try {
        const consentBtn = page.locator(
          'button:has-text("Accept all"), button:has-text("I agree"), button:has-text("Accept")'
        );
        if (await consentBtn.first().isVisible({ timeout: 3000 })) {
          await consentBtn.first().click();
          await page.waitForTimeout(1000);
        }
      } catch {
        // No consent overlay — continue
      }

      // Wait for content to load
      await page.waitForTimeout(3000);

      // Scroll to trigger lazy-loaded content
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() =>
          window.scrollBy(0, window.innerHeight * 2)
        );
        await page.waitForTimeout(1500);
      }

      // Scroll back to top for screenshot
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      const screenshotPath = join(tempDir, `google-trends-${geo}-screenshot.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const htmlContent = await page.content();
      const snapshotPath = join(tempDir, `google-trends-${geo}-snapshot.html`);
      writeFileSync(snapshotPath, htmlContent);

      if (
        htmlContent.includes("unusual traffic") ||
        htmlContent.includes("captcha") ||
        htmlContent.includes("recaptcha")
      ) {
        throw new TrendFetchError(
          "检测到 CAPTCHA / 反自动化拦截",
          EXIT_PARSE
        );
      }

      // Parse trending keywords
      const parsed = parseTrendingPage(htmlContent);

      if (parsed.length === 0) {
        process.stderr.write(
          `警告: 从 HTML 中解析到 0 条趋势关键词\n`
        );
      } else if (parsed.length < 20) {
        process.stderr.write(
          `警告: 只解析到 ${parsed.length} 条（期望 ≥20），可能需要更新 selector\n`
        );
      }

      const items: TrendItem[] = parsed.map((p, i) => ({
        keyword: p.keyword,
        source: "google-trends",
        geo,
        rank: i + 1,
        growth_label: p.growth_label,
        category: p.category,
        captured_at: capturedAt,
        trend_url: buildExploreUrl(p.keyword, geo),
      }));

      return { items, screenshotPath, snapshotPath };
    } finally {
      await browser.close();
    }
  },
};

export default googleTrends;
