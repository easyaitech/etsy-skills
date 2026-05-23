import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { renderApprovalArtifacts, applyApprovalFile } from "./approval.js";
import { type PhotoStyleMetadata, readManifest } from "./manifest.js";
import { writePinterestPayload } from "./pinterest-adapter.js";
import { processBatch } from "./processor.js";

const EXIT_USAGE = 1;
const EXIT_CONFIG = 2;
const EXIT_PROCESSING = 3;

export type ParsedArgs =
  | {
      command: "style-batch";
      sources: string;
      refs: string;
      styleName: string;
      metadata?: string;
      workspace?: string;
    }
  | {
      command: "render-approval";
      manifest: string;
    }
  | {
      command: "apply-approval";
      manifest: string;
      approvalFile: string;
    }
  | {
      command: "pinterest-payload";
      manifest: string;
      out: string;
    };

export function parseArgs(argv: string[]): ParsedArgs | null {
  const args = argv.slice(2);
  const command = args.shift();
  if (!command) return null;

  const flags = parseFlags(args);
  if (!flags) return null;

  if (command === "style-batch") {
    const sources = flags.get("--sources");
    const refs = flags.get("--refs");
    const styleName = flags.get("--style-name");
    if (!sources || !refs || !styleName) return null;
    return {
      command,
      sources,
      refs,
      styleName,
      metadata: flags.get("--metadata"),
      workspace: flags.get("--workspace"),
    };
  }

  if (command === "render-approval") {
    const manifest = flags.get("--manifest");
    if (!manifest) return null;
    return { command, manifest };
  }

  if (command === "apply-approval") {
    const manifest = flags.get("--manifest");
    const approvalFile = flags.get("--approval-file");
    if (!manifest || !approvalFile) return null;
    return { command, manifest, approvalFile };
  }

  if (command === "pinterest-payload") {
    const manifest = flags.get("--manifest");
    const out = flags.get("--out");
    if (!manifest || !out) return null;
    return { command, manifest, out };
  }

  return null;
}

function parseFlags(args: string[]): Map<string, string> | null {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!key.startsWith("--")) return null;
    const value = args[i + 1];
    if (!value || value.startsWith("--")) return null;
    flags.set(key, value);
    i++;
  }
  return flags;
}

function resolveWorkspace(explicit?: string): string | null {
  if (explicit) return existsSync(explicit) ? resolve(explicit) : null;
  const envWs = process.env.ETSY_WORKSPACE;
  if (envWs) return existsSync(envWs) ? resolve(envWs) : null;
  let dir = process.cwd();
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, ".etsy-workspace"))) return dir;
    dir = dirname(dir);
  }
  return null;
}

function isHelpRequested(argv: string[]): boolean {
  return argv.slice(2).some((arg) => arg === "--help" || arg === "-h" || arg === "help");
}

function printUsage(stream: NodeJS.WriteStream): void {
  stream.write(`用法:
  photo-style style-batch --sources DIR --refs DIR --style-name NAME [--metadata FILE] [--workspace DIR]
  photo-style render-approval --manifest FILE
  photo-style apply-approval --manifest FILE --approval-file FILE
  photo-style pinterest-payload --manifest FILE --out FILE
`);
}

async function main(): Promise<void> {
  if (isHelpRequested(process.argv)) {
    printUsage(process.stdout);
    return;
  }

  const parsed = parseArgs(process.argv);
  if (!parsed) {
    printUsage(process.stderr);
    process.exit(EXIT_USAGE);
  }

  if (parsed.command === "style-batch") {
    const workspace = resolveWorkspace(parsed.workspace);
    if (!workspace) {
      process.stderr.write("错误: 找不到工作区。设置 $ETSY_WORKSPACE、传 --workspace，或运行 etsy-stack init。\n");
      process.exit(EXIT_CONFIG);
    }
    const metadataByBasename = parsed.metadata
      ? (JSON.parse(readFileSync(parsed.metadata, "utf8")) as Record<string, PhotoStyleMetadata>)
      : undefined;
    try {
      const { manifest, manifestPath } = await processBatch({
        workspace,
        sourcesDir: parsed.sources,
        refsDir: parsed.refs,
        styleName: parsed.styleName,
        metadataByBasename,
      });
      const artifacts = renderApprovalArtifacts(manifest, manifestPath);
      process.stdout.write(
        JSON.stringify(
          {
            manifestPath,
            approvalHtml: artifacts.htmlPath,
            approvalTemplate: artifacts.templatePath,
            itemCount: manifest.items.length,
          },
          null,
          2
        ) + "\n"
      );
    } catch (err: unknown) {
      process.stderr.write(`错误: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(EXIT_PROCESSING);
    }
    return;
  }

  if (parsed.command === "render-approval") {
    const manifest = readManifest(parsed.manifest);
    const artifacts = renderApprovalArtifacts(manifest, resolve(parsed.manifest));
    process.stdout.write(JSON.stringify(artifacts, null, 2) + "\n");
    return;
  }

  if (parsed.command === "apply-approval") {
    const manifest = applyApprovalFile(parsed.manifest, parsed.approvalFile);
    process.stdout.write(
      JSON.stringify(
        {
          manifest: parsed.manifest,
          approved: manifest.items.filter((item) => item.status === "approved").length,
          rejected: manifest.items.filter((item) => item.status === "rejected").length,
        },
        null,
        2
      ) + "\n"
    );
    return;
  }

  if (parsed.command === "pinterest-payload") {
    const manifest = readManifest(parsed.manifest);
    mkdirSync(dirname(resolve(parsed.out)), { recursive: true });
    const payload = writePinterestPayload(manifest, resolve(parsed.out));
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    return;
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err: unknown) => {
    process.stderr.write(`错误: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(EXIT_PROCESSING);
  });
}
