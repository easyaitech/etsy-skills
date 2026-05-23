import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { sha256File } from "../manifest.js";
import { processBatch } from "../processor.js";

async function writeImage(path: string, color: string, width = 900, height = 900): Promise<void> {
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color,
    },
  })
    .jpeg()
    .toFile(path);
}

describe("processBatch", () => {
  it("creates 2:3 outputs and does not mutate sources", async () => {
    const root = mkdtempSync(join(tmpdir(), "photo-style-"));
    const workspace = join(root, "workspace");
    const sources = join(root, "sources");
    const refs = join(root, "refs");
    await Promise.all([
      sharp({ create: { width: 1, height: 1, channels: 3, background: "white" } }).toFile(join(root, "seed.png")),
    ]);
    mkdirp(workspace);
    mkdirp(sources);
    mkdirp(refs);
    const source = join(sources, "IMG_0001.jpg");
    await writeImage(source, "#8a6f55");
    await writeImage(join(refs, "ref.jpg"), "#d4c2aa");
    const beforeHash = sha256File(source);

    const { manifest, manifestPath } = await processBatch({
      workspace,
      sourcesDir: sources,
      refsDir: refs,
      styleName: "soft natural",
      metadataByBasename: {
        "IMG_0001.jpg": {
          sku: "SKU-001",
          platformTargets: {
            pinterest: {
              board: "Gift Ideas",
              link: "https://example.com/listing/1",
              title: "Gift",
              description: "Gift description",
              altText: "A gift photo",
            },
          },
        },
      },
    });

    expect(existsSync(manifestPath)).toBe(true);
    expect(manifest.items).toHaveLength(1);
    expect(manifest.items[0].status).toMatch(/pending|failed/);
    expect(sha256File(source)).toBe(beforeHash);
    const outputPath = manifest.items[0].outputPath;
    expect(outputPath).toBeTruthy();
    const metadata = await sharp(outputPath as string).metadata();
    expect(metadata.width).toBe(1000);
    expect(metadata.height).toBe(1500);
  });

  it("records incomplete Pinterest metadata as warning", async () => {
    const root = mkdtempSync(join(tmpdir(), "photo-style-"));
    const workspace = join(root, "workspace");
    const sources = join(root, "sources");
    const refs = join(root, "refs");
    mkdirp(workspace);
    mkdirp(sources);
    mkdirp(refs);
    await writeImage(join(sources, "IMG_0001.jpg"), "#8a6f55");
    await writeImage(join(refs, "ref.jpg"), "#d4c2aa");

    const { manifest } = await processBatch({
      workspace,
      sourcesDir: sources,
      refsDir: refs,
      styleName: "soft",
    });

    expect(manifest.items[0].qa.warnings).toContain("Pinterest target metadata is incomplete");
  });

  it("records unsupported source formats as failed manifest items", async () => {
    const root = mkdtempSync(join(tmpdir(), "photo-style-"));
    const workspace = join(root, "workspace");
    const sources = join(root, "sources");
    const refs = join(root, "refs");
    mkdirp(workspace);
    mkdirp(sources);
    mkdirp(refs);
    writeFileSync(join(sources, "raw.heic"), "not processed");
    await writeImage(join(refs, "ref.jpg"), "#d4c2aa");

    const { manifest } = await processBatch({
      workspace,
      sourcesDir: sources,
      refsDir: refs,
      styleName: "soft",
    });

    expect(manifest.items).toHaveLength(1);
    expect(manifest.items[0]).toMatchObject({
      sourcePath: join(sources, "raw.heic"),
      outputPath: null,
      status: "failed",
      qa: { result: "fail" },
    });
    expect(manifest.items[0].qa.errors[0]).toMatch(/Unsupported source image format/);
  });
});

function mkdirp(path: string): void {
  mkdirSync(path, { recursive: true });
}
