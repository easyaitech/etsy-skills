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

function ensureAllowed(keyword) {
  if (keyword !== "Chinese") {
    throw new Error("trend-radar v0 only allows keyword=Chinese");
  }
}

function extractHashtagLikeTerms(text) {
  const terms = new Map();
  const hashtagMatches = text.match(/#[A-Za-z0-9_]+/g) || [];
  for (const term of hashtagMatches) terms.set(term.toLowerCase(), term);
  const chineseMatches = text.match(/\b[A-Za-z0-9_]*chinese[A-Za-z0-9_]*\b/gi) || [];
  for (const term of chineseMatches) terms.set(term.toLowerCase(), term);
  return Array.from(terms.values()).slice(0, 100);
}

async function attemptSearch(page, keyword) {
  const selectors = [
    'input[type="search"]',
    'input[placeholder*="Search" i]',
    'input[name="q"]',
    'input',
  ];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count().catch(() => 0)) === 0) continue;
    try {
      await locator.fill(keyword, { timeout: 3000 });
      await locator.press("Enter", { timeout: 3000 });
      await page.waitForTimeout(5000);
      return true;
    } catch {
      // try next
    }
  }
  return false;
}

async function main() {
  const keyword = argValue("keyword", "Chinese");
  const outDir = argValue("out-dir");
  const profileDir = argValue(
    "profile-dir",
    path.join(process.env.HOME || ".", ".config", "etsy-skills", "trend-radar", "exolyt-profile"),
  );
  const headless = argValue("headed", "false") !== "true";
  ensureAllowed(keyword);
  if (!outDir) throw new Error("--out-dir is required");

  const { chromium } = requirePlaywright();
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    headless,
    viewport: { width: 1440, height: 1100 },
    locale: "en-US",
  });
  const page = context.pages()[0] || (await context.newPage());
  const visited = [];

  const urls = [
    "https://exolyt.com/",
    "https://exolyt.com/hashtag/chinese",
    "https://exolyt.com/hashtags/chinese",
    "https://exolyt.com/search?q=Chinese",
  ];

  let bestText = "";
  let bestUrl = "";
  let searched = false;
  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(5000);
      if (!searched) searched = await attemptSearch(page, keyword);
      const text = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
      const finalUrl = page.url();
      const loginRequired = /\/auth\/login|reason=expired|login|sign in/i.test(`${finalUrl}\n${text}`);
      const containsKeyword = /chinese/i.test(`${finalUrl}\n${text}`);
      visited.push({ url, final_url: finalUrl, text_length: text.length, login_required: loginRequired, contains_keyword: containsKeyword });
      const currentScore = (containsKeyword ? 100000 : 0) + (loginRequired ? -50000 : 0) + text.length;
      const bestScore =
        (/chinese/i.test(`${bestUrl}\n${bestText}`) ? 100000 : 0) +
        (/\/auth\/login|reason=expired|login|sign in/i.test(`${bestUrl}\n${bestText}`) ? -50000 : 0) +
        bestText.length;
      if (currentScore > bestScore) {
        bestText = text;
        bestUrl = finalUrl;
      }
    } catch (error) {
      visited.push({ url, error: String(error) });
    }
  }

  const links = await page
    .locator("a")
    .evaluateAll((anchors) =>
      anchors
        .map((a) => ({ text: a.textContent?.trim() || "", href: a.href || "" }))
        .filter((a) => a.text || a.href)
        .slice(0, 300),
    )
    .catch(() => []);

  const anyLoginRequired = visited.some((item) => item.login_required);
  const bestLooksRelevant = /chinese/i.test(`${bestUrl}\n${bestText}`);
  const terms = bestLooksRelevant && !/\/auth\/login|reason=expired/i.test(bestUrl) ? extractHashtagLikeTerms(bestText) : [];
  const result = {
    source: "exolyt_browser",
    keyword,
    hashtag: "#chinese",
    geo: "US",
    captured_at: new Date().toISOString(),
    status: anyLoginRequired && terms.length === 0 ? "login_required" : terms.length > 0 ? "ok" : "partial",
    page_url: bestUrl,
    visited,
    extracted_terms: terms,
    links: links.filter((link) => /chinese|hashtag|trend|tiktok/i.test(`${link.text} ${link.href}`)).slice(0, 100),
    page_text_path: path.join(outDir, "page-text.txt"),
    screenshot_path: path.join(outDir, "screenshot.png"),
    notes:
      anyLoginRequired && terms.length === 0
        ? "Exolyt redirected to login or expired session. Re-run with a logged-in profile, ideally with --headed true for first setup."
        : terms.length === 0
          ? "No hashtag-like terms extracted. The page may be gated, lack matching data, or Exolyt markup changed."
          : "",
  };

  await fs.writeFile(path.join(outDir, "page-text.txt"), bestText, "utf8");
  await page.screenshot({ path: path.join(outDir, "screenshot.png"), fullPage: true }).catch(() => {});
  const resultPath = path.join(outDir, "exolyt-browser.json");
  await fs.writeFile(resultPath, JSON.stringify(result, null, 2), "utf8");
  await context.close();
  console.log(resultPath);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
