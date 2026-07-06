import { describe, it, expect } from "vitest";
import { parseArgs } from "../runner.js";

describe("parseArgs", () => {
  it("parses pull with default geo", () => {
    const result = parseArgs(["node", "runner.ts", "pull"]);
    expect(result).toEqual({ command: "pull", geo: "US" });
  });

  it("parses pull with explicit geo", () => {
    const result = parseArgs(["node", "runner.ts", "pull", "--geo", "GB"]);
    expect(result).toEqual({ command: "pull", geo: "GB" });
  });

  it("uppercases geo", () => {
    const result = parseArgs(["node", "runner.ts", "pull", "--geo", "gb"]);
    expect(result).toEqual({ command: "pull", geo: "GB" });
  });

  it("rejects unknown command (old per-source fetch is gone)", () => {
    expect(parseArgs(["node", "runner.ts", "google-trends"])).toBeNull();
    expect(parseArgs(["node", "runner.ts", "pinterest-trends"])).toBeNull();
    expect(parseArgs(["node", "runner.ts", "erank-trend-buzz"])).toBeNull();
  });

  it("rejects pull with fit-report-only flags", () => {
    expect(parseArgs(["node", "runner.ts", "pull", "--date", "2026-05-18"])).toBeNull();
    expect(parseArgs(["node", "runner.ts", "pull", "--max-items", "25"])).toBeNull();
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
      geo: "GB",
      date: "2026-05-18",
      maxItems: 25,
    });
  });

  it("parses fit-report defaults", () => {
    const result = parseArgs(["node", "runner.ts", "fit-report"]);
    expect(result).toMatchObject({
      command: "fit-report",
      geo: "US",
      maxItems: 200,
    });
    expect(result && "date" in result ? result.date : "").toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    );
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
