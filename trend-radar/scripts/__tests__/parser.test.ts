import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTrendingPage } from "../sources/google-trends.js";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "../fixtures", name), "utf-8");

describe("parseTrendingPage", () => {
  it("extracts keywords from normal trending page", () => {
    const html = fixture("google-trends-normal.html");
    const results = parseTrendingPage(html);

    expect(results.length).toBeGreaterThanOrEqual(5);
    expect(results[0].keyword).toBe("summer dress");
    expect(results[0].growth_label).toBe("+5,000%");
    expect(results[0].category).toBe("Fashion");
  });

  it("extracts all 5 keywords from fixture", () => {
    const html = fixture("google-trends-normal.html");
    const results = parseTrendingPage(html);

    const keywords = results.map((r) => r.keyword);
    expect(keywords).toContain("summer dress");
    expect(keywords).toContain("father's day gifts");
    expect(keywords).toContain("pool float");
    expect(keywords).toContain("sunscreen");
    expect(keywords).toContain("graduation gifts");
  });

  it("parses growth labels correctly", () => {
    const html = fixture("google-trends-normal.html");
    const results = parseTrendingPage(html);

    const byKeyword = Object.fromEntries(results.map((r) => [r.keyword, r]));
    expect(byKeyword["father's day gifts"].growth_label).toBe("Breakout");
    expect(byKeyword["pool float"].growth_label).toBe("+2,400%");
  });

  it("returns empty array for empty page", () => {
    const html = fixture("google-trends-empty.html");
    const results = parseTrendingPage(html);
    expect(results).toEqual([]);
  });

  it("returns empty array for blank HTML", () => {
    expect(parseTrendingPage("")).toEqual([]);
    expect(parseTrendingPage("<html><body></body></html>")).toEqual([]);
  });

  it("deduplicates keywords (case-insensitive)", () => {
    const html = `
      <a href="/trends/explore?q=Test+Keyword&geo=US">Test Keyword</a>
      <a href="/trends/explore?q=test+keyword&geo=US">test keyword</a>
    `;
    const results = parseTrendingPage(html);
    expect(results.length).toBe(1);
  });

  it("decodes URL-encoded keywords", () => {
    const html = `<a href="/trends/explore?q=father%27s+day&geo=US">father's day</a>`;
    const results = parseTrendingPage(html);
    expect(results[0].keyword).toBe("father's day");
  });

  it("handles category from context window", () => {
    const html = fixture("google-trends-normal.html");
    const results = parseTrendingPage(html);
    const sunscreen = results.find((r) => r.keyword === "sunscreen");
    expect(sunscreen?.category).toBe("Health");
  });
});
