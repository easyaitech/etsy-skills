import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

export type ItemStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "failed"
  | "queued"
  | "adapter_failed";

export interface PinterestTarget {
  board?: string;
  link?: string;
  title?: string;
  description?: string;
  altText?: string;
}

export interface PhotoStyleMetadata {
  sku?: string;
  platformTargets?: {
    pinterest?: PinterestTarget;
    [platform: string]: unknown;
  };
}

export interface QaResult {
  result: "pass" | "warn" | "fail";
  warnings: string[];
  errors: string[];
}

export interface ProcessingInfo {
  mode: "hermes-image2";
  model: string;
  aspectRatio: "3:4";
  promptVersion: string;
  generatedAt: string;
  sidecarPath?: string;
}

export interface ApprovalInfo {
  decision: "approved" | "rejected";
  decidedAt: string;
  reason?: string;
}

export interface AdapterResult {
  platform: string;
  status: "queued" | "failed";
  at: string;
  message?: string;
}

export interface ManifestItem {
  id: string;
  sourcePath: string;
  sourceSha256: string;
  sourceMtimeMs: number;
  outputPath: string | null;
  status: ItemStatus;
  qa: QaResult;
  processing: ProcessingInfo | null;
  metadata: PhotoStyleMetadata;
  approval: ApprovalInfo | null;
  adapterResults: AdapterResult[];
}

export interface PhotoStyleManifest {
  schemaVersion: "1.0";
  batchId: string;
  createdAt: string;
  workspace: string;
  style: {
    name: string;
    mode: "hermes-image2";
    promptVersion: string;
    aspectRatio: "3:4";
  };
  items: ManifestItem[];
}

export interface ApprovalInput {
  approved?: string[];
  rejected?: Array<string | { id: string; reason?: string }>;
}

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function writeManifest(path: string, manifest: PhotoStyleManifest): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(tmp, path);
}

export function readManifest(path: string): PhotoStyleManifest {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as PhotoStyleManifest;
  validateManifest(parsed);
  return parsed;
}

export function validateManifest(manifest: PhotoStyleManifest): void {
  if (manifest.schemaVersion !== "1.0") {
    throw new Error(`Unsupported manifest schemaVersion: ${manifest.schemaVersion}`);
  }
  if (!manifest.batchId || !manifest.createdAt || !manifest.workspace) {
    throw new Error("Manifest missing required top-level fields");
  }
  const ids = new Set<string>();
  for (const item of manifest.items) {
    if (ids.has(item.id)) throw new Error(`Duplicate manifest item id: ${item.id}`);
    ids.add(item.id);
    if (!item.sourcePath || !item.sourceSha256 || !item.status) {
      throw new Error(`Manifest item ${item.id} missing trace fields`);
    }
    if (item.outputPath && !existsSync(item.outputPath) && item.status !== "failed") {
      throw new Error(`Manifest item ${item.id} outputPath does not exist: ${item.outputPath}`);
    }
  }
}

export function applyApproval(manifest: PhotoStyleManifest, approval: ApprovalInput): PhotoStyleManifest {
  const byId = new Map(manifest.items.map((item) => [item.id, item]));
  const now = new Date().toISOString();

  for (const id of approval.approved ?? []) {
    const item = byId.get(id);
    if (!item) throw new Error(`Unknown approved item id: ${id}`);
    if (item.status === "failed" || item.qa.result === "fail") {
      throw new Error(`Cannot approve failed item: ${id}`);
    }
    if (item.status !== "pending" && item.status !== "rejected") {
      throw new Error(`Cannot approve item ${id} from status ${item.status}`);
    }
    item.status = "approved";
    item.approval = { decision: "approved", decidedAt: now };
  }

  for (const entry of approval.rejected ?? []) {
    const id = typeof entry === "string" ? entry : entry.id;
    const reason = typeof entry === "string" ? "manual rejection" : entry.reason || "manual rejection";
    const item = byId.get(id);
    if (!item) throw new Error(`Unknown rejected item id: ${id}`);
    if (item.status === "queued") throw new Error(`Cannot reject queued item: ${id}`);
    item.status = "rejected";
    item.approval = { decision: "rejected", decidedAt: now, reason };
  }

  return manifest;
}

export function markQueued(
  manifest: PhotoStyleManifest,
  ids: string[],
  platform: string,
  message?: string
): PhotoStyleManifest {
  const now = new Date().toISOString();
  const byId = new Map(manifest.items.map((item) => [item.id, item]));
  for (const id of ids) {
    const item = byId.get(id);
    if (!item) throw new Error(`Unknown queued item id: ${id}`);
    if (item.status !== "approved") throw new Error(`Cannot queue item ${id} from status ${item.status}`);
    item.status = "queued";
    item.adapterResults.push({ platform, status: "queued", at: now, message });
  }
  return manifest;
}
