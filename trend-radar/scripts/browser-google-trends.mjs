#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function requirePlaywright() {
  const candidates = [
    process.cwd(),
    path.resolve(__dirname, "../../tools/Pinterest-autopin"),
    path.resolve(__dirname, "../../../tools/Pinterest-autopin"),
  ];
  for (const base of candidates) {
    try {
      const req = createRequire(path.join(base, "package.json"));
      return req("playwright");
    } catch {
      // try next
    }
  }
  throw new Error("Cannot find playwright. Install it or keep tools/Pinterest-autopin/node_modules available.");
}

function argValue(name, fallback = undefined) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function ensureAllowed(keyword, geo) {
  if (keyword !== "Chinese") {
    throw new Error("trend-radar v0 only allows keyword=Chinese");
  }
  if (geo !== "US") {
    throw new Error("trend-radar v0 only allows geo=US");
  }
}

function stripGooglePrefix(text) {
  return text.replace(/^\)\]\}',?\s*/, "");
}

function normalizeRelatedPayload(payload, meta) {
  const out = [];
  const widgets = [];
  if (payload?.default) widgets.push(payload.default);
  if (Array.isArray(payload?.default?.rankedList)) widgets.push(payload.default);
  if (Array.isArray(payload?.rankedList)) widgets.push(payload);

  for (const widget of widgets) {
    const rankedLists = widget.rankedList || [];
    for (const [listIndex, rankedList] of rankedLists.entries()) {
      const rankedKeyword = rankedList.rankedKeyword || [];
      for (const item of rankedKeyword) {
        const label =
          item.query ||
          item.topic?.title ||
          item.topic?.mid ||
          item.title ||
          item.name ||
          "";
        if (!label) continue;
        out.push({
          source: "google_trends_browser",
          window: meta.windowLabel,
          signal_type: listIndex === 1 ? `${meta.signalType}_rising` : `${meta.signalType}_top`,
          ranked_list_index: listIndex,
          label,
          growth: item.formattedValue || item.value?.toString?.() || "",
          link: item.link || "",
        });
      }
    }
  }
  return out;
}

function parseInterestOverTime(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  let inTable = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "x\ty1") {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    const match = line.match(/^(.+?)\t(\d+)$/);
    if (!match) {
      if (rows.length > 0) break;
      continue;
    }
    rows.push({ date: match[1], value: Number(match[2]) });
  }
  return rows;
}

function detectPageStatus({ title, text, rawResponseCount, normalizedCount }) {
  const failures = [];
  if (/429|Too Many Requests/i.test(`${title}\n${text}`)) {
    failures.push("google_429_too_many_requests");
  }
  if (/Oops! Something went wrong/i.test(text)) {
    failures.push("google_page_error");
  }
  if (/doesn't have enough data/i.test(text)) {
    failures.push("google_related_data_insufficient");
  }
  if (rawResponseCount === 0 && normalizedCount === 0) {
    failures.push("no_related_response_captured");
  }
  return failures.length === 0 ? "ok" : "partial";
}

async function runWindow({ chromium, keyword, geo, windowLabel, dateParam, outDir, profileDir, headless }) {
  const slug = windowLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const targetDir = path.join(outDir, slug);
  await fs.mkdir(targetDir, { recursive: true });

  const url = new URL("https://trends.google.com/trends/explore");
  url.searchParams.set("date", dateParam);
  url.searchParams.set("geo", geo);
  url.searchParams.set("q", keyword);
  url.searchParams.set("hl", "en-US");

  const context = await chromium.launchPersistentContext(profileDir, {
    headless,
    viewport: { width: 1440, height: 1100 },
    locale: "en-US",
  });
  const page = context.pages()[0] || (await context.newPage());
  const captured = [];

  page.on("response", async (response) => {
    const responseUrl = response.url();
    if (!responseUrl.includes("/trends/api/widgetdata/relatedsearches")) return;
    try {
      const text = await response.text();
      const payload = JSON.parse(stripGooglePrefix(text));
      captured.push({ url: responseUrl, payload });
    } catch (error) {
      captured.push({ url: responseUrl, error: String(error) });
    }
  });

  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(9000);

  const title = await page.title().catch(() => "");
  const text = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
  await page.screenshot({ path: path.join(targetDir, "screenshot.png"), fullPage: true }).catch(() => {});

  const normalized = [];
  for (const item of captured) {
    const signalType = item.url.includes("relatedsearches") ? "related_searches" : "unknown";
    normalized.push(...normalizeRelatedPayload(item.payload, { windowLabel, signalType }));
  }

  const interestOverTime = parseInterestOverTime(text);
  const pageFailures = detectPageStatus({
    title,
    text,
    rawResponseCount: captured.length,
    normalizedCount: normalized.length,
  });

  const result = {
    source: "google_trends_browser",
    keyword,
    geo,
    window: windowLabel,
    date_param: dateParam,
    page_url: url.toString(),
    title,
    captured_at: new Date().toISOString(),
    status: pageFailures,
    failures:
      pageFailures === "partial"
        ? [
            ...(/429|Too Many Requests/i.test(`${title}\n${text}`) ? ["google_429_too_many_requests"] : []),
            ...(/Oops! Something went wrong/i.test(text) ? ["google_page_error"] : []),
            ...(/doesn't have enough data/i.test(text) ? ["google_related_data_insufficient"] : []),
            ...(captured.length === 0 && normalized.length === 0 ? ["no_related_response_captured"] : []),
          ]
        : [],
    raw_response_count: captured.length,
    raw_files: [],
    normalized,
    interest_over_time: interestOverTime,
    page_text_path: path.join(targetDir, "page-text.txt"),
    screenshot_path: path.join(targetDir, "screenshot.png"),
  };

  await fs.writeFile(path.join(targetDir, "page-text.txt"), text, "utf8");
  let index = 0;
  for (const item of captured) {
    index += 1;
    const rawPath = path.join(targetDir, `related-${index}.json`);
    await fs.writeFile(rawPath, JSON.stringify(item, null, 2), "utf8");
    result.raw_files.push(rawPath);
  }
  await fs.writeFile(path.join(targetDir, "normalized.json"), JSON.stringify(result, null, 2), "utf8");
  await context.close();
  return result;
}

async function main() {
  const keyword = argValue("keyword", "Chinese");
  const geo = argValue("geo", "US");
  const outDir = argValue("out-dir");
  const profileDir = argValue(
    "profile-dir",
    path.join(process.env.HOME || ".", ".config", "etsy-skills", "trend-radar", "google-profile"),
  );
  const headless = argValue("headed", "false") !== "true";
  ensureAllowed(keyword, geo);
  if (!outDir) throw new Error("--out-dir is required");

  const { chromium } = requirePlaywright();
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(profileDir, { recursive: true });

  const windows = [
    { windowLabel: "7d", dateParam: "now 7-d" },
    { windowLabel: "30d", dateParam: "today 1-m" },
  ];
  const results = [];
  for (const win of windows) {
    results.push(await runWindow({ chromium, keyword, geo, outDir, profileDir, headless, ...win }));
  }
  const summaryPath = path.join(outDir, "google-trends-summary.json");
  await fs.writeFile(summaryPath, JSON.stringify({ results }, null, 2), "utf8");
  console.log(summaryPath);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
