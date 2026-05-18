import { describe, it, expect } from "vitest";
import {
  buildPinterestTrendsUrl,
  filterPinterestTrendsByIncludedKeyword,
  parsePinterestTrendsText,
} from "../sources/pinterest.js";

const overviewText = `
Trends
Pinterest Trends
Trends in the spotlight
1
Colorful Nail Designs
400% MoM • Popular in Fashion
2
Garden and Yard Ideas
200% MoM • Popular in Gardening and Home Decor
3
Travel Aesthetic Destinations
Popular in Travel
Shopping trends
Search trends
Preview table of keyword search trends
Keywords

Weekly change

Monthly change

Yearly change

mothers day gifts

200%

1,500%

20%

teacher appreciation gifts

90%

1,000%

-20%

mothers day crafts for kids

100%

1,000%

30%
View the full list
Editors' Picks
`;

describe("parsePinterestTrendsText", () => {
  it("extracts monthly search-trend keywords before spotlight fallback rows", () => {
    const results = parsePinterestTrendsText(overviewText);

    expect(results[0]).toEqual({
      keyword: "mothers day gifts",
      growth_label: "1,500% MoM",
      category: "Search trends",
    });
    expect(results[1]).toEqual({
      keyword: "teacher appreciation gifts",
      growth_label: "1,000% MoM",
      category: "Search trends",
    });
    expect(results.map((item) => item.keyword)).toContain("Colorful Nail Designs");
  });

  it("falls back to spotlight trends when a keyword table is absent", () => {
    const results = parsePinterestTrendsText(`
      Trends in the spotlight
      1
      Colorful Nail Designs
      400% MoM • Popular in Fashion
      2
      Travel Aesthetic Destinations
      Popular in Travel
      Shopping trends
    `);

    expect(results).toEqual([
      {
        keyword: "Colorful Nail Designs",
        growth_label: "400% MoM",
        category: "Fashion",
      },
      {
        keyword: "Travel Aesthetic Destinations",
        growth_label: "N/A",
        category: "Travel",
      },
    ]);
  });

  it("returns an empty array for blank or unrelated text", () => {
    expect(parsePinterestTrendsText("")).toEqual([]);
    expect(parsePinterestTrendsText("Log in Sign up Trends")).toEqual([]);
  });
});

describe("filterPinterestTrendsByIncludedKeyword", () => {
  it("keeps only trends that include the requested keyword", () => {
    const items = [
      {
        keyword: "chinese wedding gift",
        growth_label: "200% MoM",
        category: "Search trends",
      },
      {
        keyword: "mothers day gifts",
        growth_label: "1,500% MoM",
        category: "Search trends",
      },
    ];

    expect(filterPinterestTrendsByIncludedKeyword(items, "chinese")).toEqual([
      items[0],
    ]);
  });
});

describe("buildPinterestTrendsUrl", () => {
  it("builds monthly US trends URL", () => {
    expect(buildPinterestTrendsUrl("US")).toBe(
      "https://trends.pinterest.com/search?country=US&trendsPreset=1"
    );
  });

  it("adds keyword include filter", () => {
    expect(buildPinterestTrendsUrl("US", "chinese")).toBe(
      "https://trends.pinterest.com/search?country=US&trendsPreset=1&keywordsToInclude=chinese"
    );
  });
});
