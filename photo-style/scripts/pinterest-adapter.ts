import { existsSync, writeFileSync } from "node:fs";
import { type ManifestItem, type PhotoStyleManifest } from "./manifest.js";

export interface PinterestPayloadRow {
  pinType: "单图";
  sku: string;
  board: string;
  imagePath: string;
  title: string;
  description: string;
  altText: string;
  link: string;
  sourceManifestItemId: string;
}

export interface PinterestPayload {
  rows: PinterestPayloadRow[];
  blocked: Array<{ id: string; reasons: string[] }>;
}

export function buildPinterestPayload(manifest: PhotoStyleManifest): PinterestPayload {
  const rows: PinterestPayloadRow[] = [];
  const blocked: PinterestPayload["blocked"] = [];
  for (const item of manifest.items.filter((entry) => entry.status === "approved")) {
    const reasons = pinterestBlockReasons(item);
    if (reasons.length > 0) {
      blocked.push({ id: item.id, reasons });
      continue;
    }
    const target = item.metadata.platformTargets?.pinterest;
    rows.push({
      pinType: "单图",
      sku: item.metadata.sku as string,
      board: target?.board as string,
      imagePath: item.outputPath as string,
      title: target?.title as string,
      description: target?.description as string,
      altText: target?.altText as string,
      link: target?.link as string,
      sourceManifestItemId: item.id,
    });
  }
  return { rows, blocked };
}

export function writePinterestPayload(
  manifest: PhotoStyleManifest,
  outPath: string
): PinterestPayload {
  const payload = buildPinterestPayload(manifest);
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function pinterestBlockReasons(item: ManifestItem): string[] {
  const reasons: string[] = [];
  const target = item.metadata.platformTargets?.pinterest;
  if (!item.outputPath || !existsSync(item.outputPath)) reasons.push("output image missing");
  if (!item.metadata.sku) reasons.push("sku missing");
  if (!target?.board) reasons.push("Pinterest board missing");
  if (!target?.link) reasons.push("Pinterest link missing");
  if (!target?.title) reasons.push("Pinterest title missing");
  if (!target?.description) reasons.push("Pinterest description missing");
  if (!target?.altText) reasons.push("Pinterest alt text missing");
  if (item.qa.result === "fail") reasons.push("QA failed");
  return reasons;
}
