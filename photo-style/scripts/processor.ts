import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";
import {
  type ManifestItem,
  type PhotoStyleManifest,
  type PhotoStyleMetadata,
  type StyleStats,
  sourceTrace,
  writeManifest,
} from "./manifest.js";

const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const OUTPUT_WIDTH = 1000;
const OUTPUT_HEIGHT = 1500;

export interface BatchOptions {
  workspace: string;
  sourcesDir: string;
  refsDir: string;
  styleName: string;
  metadataByBasename?: Record<string, PhotoStyleMetadata>;
}

interface ImageStats {
  brightness: number;
  saturation: number;
}

export function listSupportedImages(dir: string): string[] {
  return listInputFiles(dir).filter((path) => SUPPORTED_EXTENSIONS.has(extname(path).toLowerCase()));
}

function listInputFiles(dir: string): string[] {
  if (!existsSync(dir)) throw new Error(`Directory does not exist: ${dir}`);
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isFile()) out.push(resolve(path));
  }
  return out.sort();
}

async function computeImageStats(path: string): Promise<ImageStats> {
  const image = sharp(path).resize(64, 64, { fit: "inside" }).removeAlpha().raw();
  const { data, info } = await image.toBuffer({ resolveWithObject: true });
  let brightness = 0;
  let saturation = 0;
  const pixels = info.width * info.height;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    brightness += (r + g + b) / 3;
    saturation += max === 0 ? 0 : (max - min) / max;
  }
  return {
    brightness: brightness / pixels,
    saturation: saturation / pixels,
  };
}

export async function computeReferenceStats(referenceImages: string[]): Promise<StyleStats> {
  if (referenceImages.length === 0) throw new Error("No reference images found");
  const stats = await Promise.all(referenceImages.map((path) => computeImageStats(path)));
  return {
    brightness: average(stats.map((item) => item.brightness)),
    saturation: average(stats.map((item) => item.saturation)),
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function uniqueOutputPath(dir: string, sourcePath: string, used: Set<string>): string {
  const parsedExt = extname(sourcePath).toLowerCase() === ".png" ? ".png" : ".jpg";
  const stem = basename(sourcePath, extname(sourcePath)).replace(/[^a-zA-Z0-9_-]+/g, "-");
  let candidate = join(dir, `${stem}_2x3${parsedExt}`);
  let seq = 1;
  while (used.has(candidate) || existsSync(candidate)) {
    candidate = join(dir, `${stem}_2x3-${seq}${parsedExt}`);
    seq++;
  }
  used.add(candidate);
  return candidate;
}

export async function processBatch(opts: BatchOptions): Promise<{ manifest: PhotoStyleManifest; manifestPath: string }> {
  const workspace = resolve(opts.workspace);
  const sourceImages = listInputFiles(opts.sourcesDir);
  const referenceImages = listSupportedImages(opts.refsDir);
  const styleStats = await computeReferenceStats(referenceImages);
  const safeStyleName = opts.styleName.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "style";
  const date = new Date().toISOString().slice(0, 10);
  const batchId = `${date}-${safeStyleName}`;
  const batchDir = join(workspace, ".cache", "photo-style", "batches", batchId);
  const processedDir = join(batchDir, "processed");
  mkdirSync(processedDir, { recursive: true });

  const usedOutputs = new Set<string>();
  const items: ManifestItem[] = [];
  let itemSeq = 1;
  for (const sourcePath of sourceImages) {
    const id = `item-${String(itemSeq).padStart(3, "0")}`;
    itemSeq++;
    const trace = sourceTrace(sourcePath);
    const metadata = opts.metadataByBasename?.[basename(sourcePath)] ?? {};
    if (!SUPPORTED_EXTENSIONS.has(extname(sourcePath).toLowerCase())) {
      items.push({
        id,
        sourcePath,
        ...trace,
        outputPath: null,
        status: "failed",
        qa: {
          result: "fail",
          warnings: [],
          errors: [`Unsupported source image format: ${extname(sourcePath) || "(none)"}`],
        },
        processing: null,
        metadata,
        approval: null,
        adapterResults: [],
      });
      continue;
    }

    const outputPath = uniqueOutputPath(processedDir, sourcePath, usedOutputs);
    try {
      const sourceStats = await computeImageStats(sourcePath);
      const brightnessFactor = clamp(styleStats.brightness / Math.max(sourceStats.brightness, 0.01), 0.85, 1.15);
      const saturationFactor = clamp(styleStats.saturation / Math.max(sourceStats.saturation, 0.01), 0.8, 1.2);
      await sharp(sourcePath)
        .rotate()
        .modulate({
          brightness: brightnessFactor,
          saturation: saturationFactor,
        })
        .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
          fit: "contain",
          background: { r: 250, g: 248, b: 244 },
        })
        .toFile(outputPath);

      const qa = await qaForOutput(sourcePath, outputPath, metadata, brightnessFactor, saturationFactor);
      items.push({
        id,
        sourcePath,
        ...trace,
        outputPath,
        status: qa.result === "fail" ? "failed" : "pending",
        qa,
        processing: {
          fit: "contain",
          width: OUTPUT_WIDTH,
          height: OUTPUT_HEIGHT,
          brightnessFactor: round(brightnessFactor),
          saturationFactor: round(saturationFactor),
        },
        metadata,
        approval: null,
        adapterResults: [],
      });
    } catch (err: unknown) {
      items.push({
        id,
        sourcePath,
        ...trace,
        outputPath: null,
        status: "failed",
        qa: {
          result: "fail",
          warnings: [],
          errors: [err instanceof Error ? err.message : String(err)],
        },
        processing: null,
        metadata,
        approval: null,
        adapterResults: [],
      });
    }
  }

  const manifest: PhotoStyleManifest = {
    schemaVersion: "1.0",
    batchId,
    createdAt: new Date().toISOString(),
    workspace,
    style: {
      name: opts.styleName,
      referenceImages,
      stats: {
        brightness: round(styleStats.brightness),
        saturation: round(styleStats.saturation),
      },
    },
    items,
  };
  const manifestPath = join(batchDir, "manifest.json");
  writeManifest(manifestPath, manifest);
  return { manifest, manifestPath };
}

async function qaForOutput(
  sourcePath: string,
  outputPath: string,
  metadata: PhotoStyleMetadata,
  brightnessFactor: number,
  saturationFactor: number
): Promise<ManifestItem["qa"]> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const outMeta = await sharp(outputPath).metadata();
  if (outMeta.width !== OUTPUT_WIDTH || outMeta.height !== OUTPUT_HEIGHT) {
    errors.push(`Output dimensions are ${outMeta.width}x${outMeta.height}, expected ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}`);
  }
  const srcMeta = await sharp(sourcePath).metadata();
  if ((srcMeta.width ?? 0) < 800 || (srcMeta.height ?? 0) < 800) {
    warnings.push("Source image is smaller than recommended for Pinterest 2:3 output");
  }
  const sourceRatio = (srcMeta.width ?? OUTPUT_WIDTH) / Math.max(srcMeta.height ?? OUTPUT_HEIGHT, 1);
  const targetRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;
  if (Math.abs(sourceRatio - targetRatio) > 0.55) {
    warnings.push("Source aspect ratio is far from 2:3; output may contain visible padding");
  }
  if (Math.abs(brightnessFactor - 1) > 0.12 || Math.abs(saturationFactor - 1) > 0.15) {
    warnings.push("Strong style adjustment applied; review carefully");
  }
  const pinterest = metadata.platformTargets?.pinterest;
  if (!metadata.sku || !pinterest?.board || !pinterest.link) {
    warnings.push("Pinterest target metadata is incomplete");
  }
  return {
    result: errors.length > 0 ? "fail" : warnings.length > 0 ? "warn" : "pass",
    warnings,
    errors,
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
