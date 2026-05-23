import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { type ApprovalInput, type PhotoStyleManifest, applyApproval, writeManifest } from "./manifest.js";

export function renderApprovalArtifacts(manifest: PhotoStyleManifest, manifestPath: string): {
  htmlPath: string;
  templatePath: string;
} {
  const dir = dirname(manifestPath);
  const htmlPath = join(dir, "approval.html");
  const templatePath = join(dir, "approval-template.json");
  writeFileSync(htmlPath, renderHtml(manifest, dir));
  writeFileSync(
    templatePath,
    `${JSON.stringify(
      {
        approved: [],
        rejected: manifest.items
          .filter((item) => item.qa.result === "fail")
          .map((item) => ({ id: item.id, reason: "qa failed" })),
      },
      null,
      2
    )}\n`
  );
  return { htmlPath, templatePath };
}

export function applyApprovalFile(manifestPath: string, approvalPath: string): PhotoStyleManifest {
  const manifest = applyApproval(
    JSON.parse(readFileSync(manifestPath, "utf8")) as PhotoStyleManifest,
    JSON.parse(readFileSync(approvalPath, "utf8")) as ApprovalInput
  );
  writeManifest(manifestPath, manifest);
  return manifest;
}

function renderHtml(manifest: PhotoStyleManifest, baseDir: string): string {
  const rows = manifest.items
    .map((item) => {
      const output = item.outputPath
        ? `<img src="${escapeAttr(relative(baseDir, item.outputPath))}" alt="processed ${escapeAttr(item.id)}">`
        : `<div class="missing">No output</div>`;
      const source = `<img src="${escapeAttr(item.sourcePath)}" alt="source ${escapeAttr(item.id)}">`;
      return `<section class="item ${escapeAttr(item.qa.result)}">
  <h2>${escapeHtml(item.id)} · ${escapeHtml(item.status)}</h2>
  <div class="grid">
    <figure><figcaption>Source</figcaption>${source}</figure>
    <figure><figcaption>Processed</figcaption>${output}</figure>
  </div>
  <p><strong>SKU:</strong> ${escapeHtml(item.metadata.sku ?? "(missing)")}</p>
  <p><strong>Pinterest board:</strong> ${escapeHtml(item.metadata.platformTargets?.pinterest?.board ?? "(missing)")}</p>
  <p><strong>QA:</strong> ${escapeHtml(item.qa.result)}</p>
  <p><strong>Warnings:</strong> ${escapeHtml(item.qa.warnings.join("; ") || "none")}</p>
  <p><strong>Errors:</strong> ${escapeHtml(item.qa.errors.join("; ") || "none")}</p>
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Photo Style Approval · ${escapeHtml(manifest.batchId)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 24px; color: #1f2933; }
    .item { border: 1px solid #ccd3dc; border-radius: 8px; padding: 16px; margin: 0 0 18px; }
    .fail { border-color: #b42318; }
    .warn { border-color: #b7791f; }
    .pass { border-color: #2f855a; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    img { max-width: 100%; max-height: 420px; object-fit: contain; background: #f6f8fa; }
    figcaption { font-weight: 700; margin-bottom: 8px; }
    .missing { padding: 64px; background: #f6f8fa; color: #8a94a6; }
  </style>
</head>
<body>
  <h1>Photo Style Approval</h1>
  <p>Batch: ${escapeHtml(manifest.batchId)}</p>
  <p>Review the processed copy against the source. Only approve images where product shape, material, and text remain correct.</p>
  ${rows}
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
