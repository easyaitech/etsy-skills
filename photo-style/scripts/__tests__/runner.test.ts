import { describe, expect, it } from "vitest";
import { parseArgs } from "../runner.js";

describe("parseArgs", () => {
  it("parses style-batch", () => {
    expect(
      parseArgs([
        "node",
        "runner.ts",
        "style-batch",
        "--sources",
        "sources",
        "--refs",
        "refs",
        "--style-name",
        "soft",
        "--metadata",
        "metadata.json",
      ])
    ).toEqual({
      command: "style-batch",
      sources: "sources",
      refs: "refs",
      styleName: "soft",
      metadata: "metadata.json",
      workspace: undefined,
    });
  });

  it("rejects missing style-batch required args", () => {
    expect(parseArgs(["node", "runner.ts", "style-batch", "--sources", "sources"])).toBeNull();
  });

  it("parses apply-approval", () => {
    expect(
      parseArgs([
        "node",
        "runner.ts",
        "apply-approval",
        "--manifest",
        "manifest.json",
        "--approval-file",
        "approval.json",
      ])
    ).toEqual({
      command: "apply-approval",
      manifest: "manifest.json",
      approvalFile: "approval.json",
    });
  });

  it("parses pinterest-payload", () => {
    expect(
      parseArgs([
        "node",
        "runner.ts",
        "pinterest-payload",
        "--manifest",
        "manifest.json",
        "--out",
        "payload.json",
      ])
    ).toEqual({
      command: "pinterest-payload",
      manifest: "manifest.json",
      out: "payload.json",
    });
  });
});
