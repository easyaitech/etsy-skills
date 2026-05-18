import { describe, it, expect } from "vitest";
import { buildExploreUrl } from "../sources/google-trends.js";

describe("buildExploreUrl", () => {
  it("encodes simple keyword", () => {
    expect(buildExploreUrl("summer dress", "US")).toBe(
      "https://trends.google.com/trends/explore?q=summer%20dress&geo=US"
    );
  });

  it("encodes special characters", () => {
    const url = buildExploreUrl("father's day", "US");
    expect(url).toContain("father");
    expect(url).toContain("day");
    expect(url).toContain("geo=US");
  });

  it("encodes non-ASCII characters", () => {
    const url = buildExploreUrl("连衣裙", "US");
    expect(url).toContain("q=");
    expect(url).toContain("geo=US");
    expect(decodeURIComponent(url)).toContain("连衣裙");
  });

  it("preserves geo parameter", () => {
    expect(buildExploreUrl("test", "GB")).toContain("geo=GB");
    expect(buildExploreUrl("test", "JP")).toContain("geo=JP");
  });
});
