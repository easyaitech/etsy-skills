import { describe, expect, it } from "vitest";
import {
  buildErankTrendBuzzApiPath,
  buildErankTrendBuzzPageUrl,
  parseErankTrendBuzzRows,
} from "../sources/erank-trend-buzz.js";

describe("parseErankTrendBuzzRows", () => {
  it("normalizes eRank Trend Buzz keyword rows", () => {
    const results = parseErankTrendBuzzRows([
      {
        keyword: "  personalized gift  ",
        change: null,
        avg_searches: { value: 1200, order_value: 1200 },
        avg_clicks: { value: 340, order_value: 340 },
        ctr: { order_value: 28.3 },
        competition: { value: 98765, order_value: 98765 },
        search_volume: 3000,
      },
      {
        keyword: "wedding sign",
        change: -12,
      },
    ]);

    expect(results[0]).toEqual({
      keyword: "personalized gift",
      growth_label:
        "Hot; avg searches 1,200; avg clicks 340; avg CTR 28.3%; Etsy competition 98,765; search volume 3,000",
      category: "eRank Trend Buzz / Etsy / Last 30 Days",
    });
    expect(results[1]).toEqual({
      keyword: "wedding sign",
      growth_label: "-12 change",
      category: "eRank Trend Buzz / Etsy / Last 30 Days",
    });
  });

  it("deduplicates keywords and skips malformed rows", () => {
    const results = parseErankTrendBuzzRows([
      { keyword: "" },
      { keyword: "Chinese name", change: 24 },
      { keyword: " chinese   name ", change: 30 },
    ]);

    expect(results).toEqual([
      {
        keyword: "Chinese name",
        growth_label: "+24 change",
        category: "eRank Trend Buzz / Etsy / Last 30 Days",
      },
    ]);
  });
});

describe("eRank Trend Buzz URLs", () => {
  it("builds the member page URL", () => {
    expect(buildErankTrendBuzzPageUrl("US")).toBe(
      "https://members.erank.com/trend-buzz/etsy/us/thirty"
    );
    expect(buildErankTrendBuzzPageUrl("GB")).toBe(
      "https://members.erank.com/trend-buzz/etsy/uk/thirty"
    );
  });

  it("builds the API path with eRank country codes", () => {
    expect(buildErankTrendBuzzApiPath("US")).toBe(
      "/api/trend-buzz?marketplace=etsy&country=USA&period=thirty&category=Keyword"
    );
    expect(buildErankTrendBuzzApiPath("GB")).toBe(
      "/api/trend-buzz?marketplace=etsy&country=GBR&period=thirty&category=Keyword"
    );
  });
});
