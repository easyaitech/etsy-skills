import { describe, it, expect } from "vitest";
import { parseArgs } from "../runner.js";

describe("parseArgs", () => {
  it("parses source with default geo", () => {
    const result = parseArgs(["node", "runner.ts", "google-trends"]);
    expect(result).toEqual({ source: "google-trends", geo: "US" });
  });

  it("parses source with explicit geo", () => {
    const result = parseArgs([
      "node",
      "runner.ts",
      "google-trends",
      "--geo",
      "GB",
    ]);
    expect(result).toEqual({ source: "google-trends", geo: "GB" });
  });

  it("parses pinterest source", () => {
    const result = parseArgs(["node", "runner.ts", "pinterest-chinese"]);
    expect(result).toEqual({ source: "pinterest-chinese", geo: "US" });
  });

  it("uppercases geo", () => {
    const result = parseArgs([
      "node",
      "runner.ts",
      "google-trends",
      "--geo",
      "gb",
    ]);
    expect(result).toEqual({ source: "google-trends", geo: "GB" });
  });

  it("returns null for no arguments", () => {
    expect(parseArgs(["node", "runner.ts"])).toBeNull();
  });

  it("returns null when first arg is a flag", () => {
    expect(parseArgs(["node", "runner.ts", "--geo", "US"])).toBeNull();
  });
});
