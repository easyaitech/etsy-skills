import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { renderApprovalArtifacts } from "../approval.js";
import { type PhotoStyleManifest } from "../manifest.js";

function manifestFixture(outputPath: string): PhotoStyleManifest {
  return {
    schemaVersion: "1.0",
    batchId: "batch",
    createdAt: "2026-05-23T00:00:00.000Z",
    workspace: "/tmp/workspace",
    style: {
      name: "xuan-paper-soft-light",
      mode: "hermes-image2",
      promptVersion: "hermes-image2-prompt.md",
      aspectRatio: "3:4",
    },
    items: [
      {
        id: "item-001",
        sourcePath: "/tmp/source.jpg",
        sourceSha256: "sha",
        sourceMtimeMs: 1,
        outputPath,
        status: "pending",
        qa: { result: "pass", warnings: [], errors: [] },
        processing: {
          mode: "hermes-image2",
          model: "gpt-image-2",
          aspectRatio: "3:4",
          promptVersion: "hermes-image2-prompt.md",
          generatedAt: "2026-05-23T00:00:00.000Z",
        },
        metadata: {},
        approval: null,
        adapterResults: [],
      },
      {
        id: "item-002",
        sourcePath: "/tmp/bad.jpg",
        sourceSha256: "sha",
        sourceMtimeMs: 1,
        outputPath: null,
        status: "failed",
        qa: { result: "fail", warnings: [], errors: ["bad"] },
        processing: null,
        metadata: {},
        approval: null,
        adapterResults: [],
      },
    ],
  };
}

describe("renderApprovalArtifacts", () => {
  it("does not pre-approve pending items in the approval template", () => {
    const dir = mkdtempSync(join(tmpdir(), "photo-style-"));
    const output = join(dir, "out.jpg");
    writeFileSync(output, "fake");
    const manifestPath = join(dir, "manifest.json");

    const artifacts = renderApprovalArtifacts(manifestFixture(output), manifestPath);
    const template = JSON.parse(readFileSync(artifacts.templatePath, "utf8")) as {
      approved: string[];
      rejected: Array<{ id: string; reason: string }>;
    };

    expect(template.approved).toEqual([]);
    expect(template.rejected).toEqual([{ id: "item-002", reason: "qa failed" }]);
  });
});
