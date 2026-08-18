import { afterEach, describe, it, expect, vi } from "vitest";
import { fetchLatest, parseArgs } from "../runner.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

describe("fetchLatest", () => {
  it("bounds the service request with an abort signal", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchLatest("https://trend.example", "secret", { geo: "US" })).resolves.toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://trend.example/latest?geo=US",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(timeoutSpy).toHaveBeenCalledWith(15_000);
  });

  it("maps request timeouts to the network exit code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        Object.assign(new Error("The operation was aborted due to timeout"), {
          name: "TimeoutError",
        })
      )
    );

    await expect(
      fetchLatest("https://trend.example", "secret", { geo: "US" })
    ).rejects.toMatchObject({ exitCode: 3 });
  });
});
