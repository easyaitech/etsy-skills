#!/usr/bin/env node
const path = require('path');

function loadPlaywright() {
  const candidates = [
    'playwright',
    path.join(
      process.env.PINTEREST_AUTOPIN_DIR || '/Users/songchou/.hermes/profiles/etsy-fublessings/home/code/etsy-skills/tools/Pinterest-autopin',
      'node_modules',
      'playwright'
    )
  ];
  const errors = [];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (err) {
      errors.push(`${candidate}: ${err && err.message ? err.message.split('\n')[0] : err}`);
    }
  }
  throw new Error(`Cannot load Playwright. Tried: ${errors.join(' | ')}`);
}

const { chromium } = loadPlaywright();

const PROFILE_URL = process.env.PINTEREST_PROFILE_URL || 'https://jp.pinterest.com/FuBlessings/_created/';
const LIMIT = Number(process.env.PINTEREST_PROFILE_PIN_LIMIT || '20');
const HARD_TIMEOUT_MS = Number(process.env.PINTEREST_PROFILE_FINDER_TIMEOUT_MS || '45000');
const hardTimeout = setTimeout(() => {
  console.log(JSON.stringify({ ok: false, error: `profile finder hard timeout after ${HARD_TIMEOUT_MS}ms` }, null, 2));
  process.exit(2);
}, HARD_TIMEOUT_MS);
const CDP_PORTS = (process.env.PINTEREST_AUTOPIN_CDP_PORTS || process.env.PINTEREST_AUTOPIN_CDP_PORT || process.env.PINTEREST_CDP_PORT || '9225,9222')
  .split(',').map(s => s.trim()).filter(Boolean);

async function fetchJson(url, timeoutMs = 1500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function connectBrowser() {
  for (const port of CDP_PORTS) {
    const info = await fetchJson(`http://127.0.0.1:${port}/json/version`);
    if (info && info.webSocketDebuggerUrl) {
      const browser = await chromium.connectOverCDP(info.webSocketDebuggerUrl);
      return { browser, closeBrowser: async () => {}, via: `cdp:${port}` };
    }
  }
  const browser = await chromium.launch({ headless: true });
  return { browser, closeBrowser: async () => browser.close(), via: 'headless' };
}

function normalizePinUrl(url) {
  const m = String(url || '').match(/https?:\/\/(?:[a-z0-9-]+\.)?pinterest\.com\/pin\/(\d+)\/?/i);
  return m ? `https://jp.pinterest.com/pin/${m[1]}/` : '';
}

function uniqPins(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    item.url = normalizePinUrl(item.url);
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    out.push(item);
  }
  return out;
}

(async () => {
  let session;
  try {
    session = await connectBrowser();
    const context = session.browser.contexts()[0] || await session.browser.newContext();
    const page = await context.newPage();
    const candidateUrls = [
      PROFILE_URL,
      'https://jp.pinterest.com/FuBlessings/',
    ];
    let raw = [];
    let usedUrl = PROFILE_URL;
    for (const url of candidateUrls) {
      usedUrl = url;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      // Pinterest profile grids are lazy and can look loaded before pin anchors are
      // inserted. Wait explicitly; otherwise cron may falsely report zero pins.
      await page.waitForFunction(() => document.querySelectorAll('a[href*="/pin/"]').length > 0, null, { timeout: 10000 }).catch(() => {});
      // Trigger lazy-loaded profile/board pins, but keep this fallback fast enough
      // for cron. It is only a reconciliation aid, not the primary publish path.
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(700);
      }
      raw = await page.evaluate(() => Array.from(document.querySelectorAll('a[href*="/pin/"]')).map(a => ({
        url: new URL(a.getAttribute('href'), location.href).href.split('?')[0],
        text: (a.innerText || '').trim(),
        aria: a.getAttribute('aria-label') || '',
        title: a.getAttribute('title') || '',
        imgAlt: Array.from(a.querySelectorAll('img')).map(img => img.alt || '').filter(Boolean).join(' | ')
      })));
      if (raw.length) break;
    }
    const pins = uniqPins(raw).slice(0, LIMIT);
    console.log(JSON.stringify({ ok: true, via: session.via, profileUrl: PROFILE_URL, usedUrl, pins }, null, 2));
  } catch (err) {
    console.log(JSON.stringify({ ok: false, error: String(err && err.stack || err) }, null, 2));
    process.exitCode = 1;
  } finally {
    if (session) await session.closeBrowser().catch(() => {});
    clearTimeout(hardTimeout);
    // CDP connections keep websocket handles open when we intentionally avoid
    // closing the user's live Chrome. Exit explicitly so cron fallback cannot hang.
    if (session && String(session.via || '').startsWith('cdp:')) {
      process.exit(process.exitCode || 0);
    }
  }
})();
