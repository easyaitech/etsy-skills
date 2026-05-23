import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  type PhotoStyleManifest,
  applyApproval,
  readManifest,
  sha256File,
  writeManifest,
} from "../manifest.js";

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

describe("manifest", () => {
  it("hashes files", () => {
    const dir = mkdtempSync(join(tmpdir(), "photo-style-"));
    const file = join(dir, "file.txt");
    writeFileSync(file, "hello");
    expect(sha256File(file)).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("writes and reads a valid manifest", () => {
    const dir = mkdtempSync(join(tmpdir(), "photo-style-"));
    const output = join(dir, "out.jpg");
    writeFileSync(output, "fake");
    const path = join(dir, "manifest.json");
    writeManifest(path, manifestFixture(output));
    expect(readManifest(path).items).toHaveLength(2);
  });

  it("applies approval and rejection", () => {
    const dir = mkdtempSync(join(tmpdir(), "photo-style-"));
    const output = join(dir, "out.jpg");
    writeFileSync(output, "fake");
    const manifest = applyApproval(manifestFixture(output), {
      approved: ["item-001"],
      rejected: [{ id: "item-002", reason: "bad crop" }],
    });
    expect(manifest.items[0].status).toBe("approved");
    expect(manifest.items[1].status).toBe("rejected");
    expect(manifest.items[1].approval?.reason).toBe("bad crop");
  });

  it("does not approve QA failed items", () => {
    const manifest = manifestFixture("/tmp/out.jpg");
    expect(() => applyApproval(manifest, { approved: ["item-002"] })).toThrow(
      /Cannot approve failed item/
    );
  });

  it("rejects unknown approval ids", () => {
    const manifest = manifestFixture("/tmp/out.jpg");
    expect(() => applyApproval(manifest, { approved: ["missing"] })).toThrow(
      /Unknown approved item/
    );
  });
});
