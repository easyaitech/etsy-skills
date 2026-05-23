import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { renderApprovalArtifacts, applyApprovalFile } from "./approval.js";
import { readManifest } from "./manifest.js";
import { writePinterestPayload } from "./pinterest-adapter.js";

const EXIT_USAGE = 1;
const EXIT_PROCESSING = 3;

export type ParsedArgs =
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

function isHelpRequested(argv: string[]): boolean {
  return argv.slice(2).some((arg) => arg === "--help" || arg === "-h" || arg === "help");
}

function printUsage(stream: NodeJS.WriteStream): void {
  stream.write(`用法:
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
