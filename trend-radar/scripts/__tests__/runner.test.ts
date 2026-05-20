import { describe, it, expect } from "vitest";
import { parseArgs } from "../runner.js";

describe("parseArgs", () => {
  it("parses source with default geo", () => {
    const result = parseArgs(["node", "runner.ts", "google-trends"]);
    expect(result).toEqual({
      command: "fetch",
      source: "google-trends",
      geo: "US",
    });
  });

  it("parses source with explicit geo", () => {
    const result = parseArgs([
      "node",
      "runner.ts",
      "google-trends",
      "--geo",
      "GB",
    ]);
    expect(result).toEqual({
      command: "fetch",
      source: "google-trends",
      geo: "GB",
    });
  });

  it("parses pinterest source", () => {
    const result = parseArgs(["node", "runner.ts", "pinterest-chinese"]);
    expect(result).toEqual({
      command: "fetch",
      source: "pinterest-chinese",
      geo: "US",
    });
  });

  it("parses eRank Trend Buzz source", () => {
    const result = parseArgs(["node", "runner.ts", "erank-trend-buzz"]);
    expect(result).toEqual({
      command: "fetch",
      source: "erank-trend-buzz",
      geo: "US",
    });
  });

  it("uppercases geo", () => {
    const result = parseArgs([
      "node",
      "runner.ts",
      "google-trends",
      "--geo",
      "gb",
    ]);
    expect(result).toEqual({
      command: "fetch",
      source: "google-trends",
      geo: "GB",
    });
  });

  it("parses fit-report with date and max items", () => {
    const result = parseArgs([
      "node",
      "runner.ts",
      "fit-report",
      "--date",
      "2026-05-18",
      "--geo",
      "gb",
      "--max-items",
      "25",
    ]);
    expect(result).toEqual({
      command: "fit-report",
      source: "fit-report",
      geo: "GB",
      date: "2026-05-18",
      maxItems: 25,
    });
  });

  it("parses fit-report defaults", () => {
    const result = parseArgs(["node", "runner.ts", "fit-report"]);
    expect(result).toMatchObject({
      command: "fit-report",
      source: "fit-report",
      geo: "US",
      maxItems: 200,
    });
    expect(result && "date" in result ? result.date : "").toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    );
  });

  it("rejects unknown flags", () => {
    expect(parseArgs(["node", "runner.ts", "google-trends", "--date", "2026-05-18"])).toBeNull();
  });

  it("rejects invalid fit-report date", () => {
    expect(parseArgs(["node", "runner.ts", "fit-report", "--date", "20260518"])).toBeNull();
  });

  it("rejects invalid fit-report max items", () => {
    expect(parseArgs(["node", "runner.ts", "fit-report", "--max-items", "0"])).toBeNull();
  });

  it("returns null for no arguments", () => {
    expect(parseArgs(["node", "runner.ts"])).toBeNull();
  });

  it("returns null when first arg is a flag", () => {
    expect(parseArgs(["node", "runner.ts", "--geo", "US"])).toBeNull();
  });
});
