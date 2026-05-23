import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { type PhotoStyleManifest } from "../manifest.js";
import { buildPinterestPayload } from "../pinterest-adapter.js";

function manifestFixture(outputPath: string): PhotoStyleManifest {
  return {
    schemaVersion: "1.0",
    batchId: "batch",
    createdAt: "2026-05-23T00:00:00.000Z",
    workspace: "/tmp/workspace",
    style: {
      name: "soft",
      referenceImages: [],
      stats: { brightness: 0.5, saturation: 0.5 },
    },
    items: [
      {
        id: "item-001",
        sourcePath: "/tmp/source.jpg",
        sourceSha256: "sha",
        sourceMtimeMs: 1,
        outputPath,
        status: "approved",
        qa: { result: "pass", warnings: [], errors: [] },
        processing: {
          fit: "contain",
          width: 1000,
          height: 1500,
          brightnessFactor: 1,
          saturationFactor: 1,
        },
        metadata: {
          sku: "SKU-001",
          platformTargets: {
            pinterest: {
              board: "Gift Ideas",
              link: "https://example.com/listing/1",
              title: "Custom Gift",
              description: "A custom gift.",
              altText: "A custom gift in soft light.",
            },
          },
        },
        approval: { decision: "approved", decidedAt: "2026-05-23T00:00:00.000Z" },
        adapterResults: [],
      },
      {
        id: "item-002",
        sourcePath: "/tmp/source2.jpg",
        sourceSha256: "sha",
        sourceMtimeMs: 1,
        outputPath,
        status: "rejected",
        qa: { result: "pass", warnings: [], errors: [] },
        processing: null,
        metadata: {},
        approval: { decision: "rejected", decidedAt: "2026-05-23T00:00:00.000Z" },
        adapterResults: [],
      },
    ],
  };
}

describe("buildPinterestPayload", () => {
  it("builds rows for approved items only", () => {
    const dir = mkdtempSync(join(tmpdir(), "photo-style-"));
    const output = join(dir, "out.jpg");
    writeFileSync(output, "fake");
    const payload = buildPinterestPayload(manifestFixture(output));
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0]).toMatchObject({
      pinType: "单图",
      sku: "SKU-001",
      board: "Gift Ideas",
      sourceManifestItemId: "item-001",
    });
    expect(payload.blocked).toHaveLength(0);
  });

  it("blocks approved items with missing required fields", () => {
    const dir = mkdtempSync(join(tmpdir(), "photo-style-"));
    const output = join(dir, "out.jpg");
    writeFileSync(output, "fake");
    const manifest = manifestFixture(output);
    manifest.items[0].metadata.platformTargets = { pinterest: { board: "Gift Ideas" } };
    const payload = buildPinterestPayload(manifest);
    expect(payload.rows).toHaveLength(0);
    expect(payload.blocked[0].reasons).toContain("Pinterest link missing");
  });
});
