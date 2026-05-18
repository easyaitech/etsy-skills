import { existsSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

interface TrendItem {
  keyword: string;
  source: string;
  geo: string;
  rank: number;
  growth_label: string;
  category: string;
  captured_at: string;
  trend_url: string;
}

interface TrendRunOutput {
  generated_at: string;
  source: string;
  geo: string;
  item_count: number;
  schema_version: string;
  evidence: {
    screenshot: string;
    html_snapshot: string;
  };
  items: TrendItem[];
}

interface TrendSource {
  name: string;
  fetch(opts: { geo: string }): Promise<{
    items: TrendItem[];
    screenshotPath: string;
    snapshotPath: string;
  }>;
}

// Exit codes: 1=usage, 2=config/workspace, 3=network, 4=parse/selector
const EXIT_USAGE = 1;
const EXIT_CONFIG = 2;
const EXIT_PARSE = 4;

const KNOWN_SOURCES = ["google-trends"] as const;
const GEO_ALLOWLIST: Record<string, string[]> = {
  "google-trends": ["US", "GB", "AU", "CA", "DE", "FR", "JP", "BR", "IN"],
};

function resolveWorkspace(): string | null {
  const envWs = process.env.ETSY_WORKSPACE;
  if (envWs) {
    if (existsSync(envWs)) return resolve(envWs);
    return null;
  }

  let dir = process.cwd();
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, ".etsy-workspace"))) return dir;
    dir = dirname(dir);
  }
  return null;
}

function printUsage(): void {
  process.stderr.write(
    `用法: trend-fetch <source> [--geo GEO]

数据源: ${KNOWN_SOURCES.join(", ")}

选项:
  --geo GEO    地区代码 (默认: US)

示例:
  trend-fetch google-trends
  trend-fetch google-trends --geo GB
`
  );
}

export function parseArgs(argv: string[]): {
  source: string;
  geo: string;
} | null {
  const args = argv.slice(2);
  if (args.length === 0) return null;

  const source = args[0];
  if (!source || source.startsWith("-")) return null;

  let geo = "US";
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--geo" && args[i + 1]) {
      geo = args[i + 1].toUpperCase();
      i++;
    }
  }

  return { source, geo };
}

async function loadSource(name: string): Promise<TrendSource> {
  const mod = await import(`./sources/${name}.js`);
  return mod.default as TrendSource;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (!parsed) {
    printUsage();
    process.exit(EXIT_USAGE);
  }

  const { source, geo } = parsed;

  if (!KNOWN_SOURCES.includes(source as (typeof KNOWN_SOURCES)[number])) {
    process.stderr.write(`错误: 未知数据源 "${source}"\n可用: ${KNOWN_SOURCES.join(", ")}\n`);
    process.exit(EXIT_USAGE);
  }

  const allowedGeos = GEO_ALLOWLIST[source];
  if (allowedGeos && !allowedGeos.includes(geo)) {
    process.stderr.write(
      `错误: "${source}" 不支持地区 "${geo}"\n可用: ${allowedGeos.join(", ")}\n`
    );
    process.exit(EXIT_USAGE);
  }

  const workspace = resolveWorkspace();
  if (!workspace) {
    process.stderr.write(
      `错误: 找不到工作区\n设置 $ETSY_WORKSPACE 或在工作区根目录运行 etsy-stack init\n`
    );
    process.exit(EXIT_CONFIG);
  }

  const today = new Date().toISOString().slice(0, 10);
  const outDir = join(workspace, "outputs", "trend-radar", today);
  mkdirSync(outDir, { recursive: true });

  process.env.TREND_RADAR_OUT_DIR = outDir;

  const trendSource = await loadSource(source);

  let result;
  try {
    result = await trendSource.fetch({ geo });
  } catch (err: unknown) {
    if (err instanceof Error && "exitCode" in err) {
      process.stderr.write(`错误: ${err.message}\n`);
      process.exit((err as unknown as { exitCode: number }).exitCode);
    }
    throw err;
  }

  if (result.items.length === 0) {
    process.stderr.write(`错误: ${source} 返回 0 条结果，不覆盖 latest.json\n`);
    process.exit(EXIT_PARSE);
  }

  const output: TrendRunOutput = {
    generated_at: new Date().toISOString(),
    source,
    geo,
    item_count: result.items.length,
    schema_version: "1.0",
    evidence: {
      screenshot: result.screenshotPath,
      html_snapshot: result.snapshotPath,
    },
    items: result.items,
  };

  const datedPath = join(outDir, `${source}-${geo}.json`);
  writeFileSync(datedPath, JSON.stringify(output, null, 2) + "\n");

  const latestDir = join(workspace, "outputs", "trend-radar");
  const latestPath = join(latestDir, "latest.json");
  copyFileSync(datedPath, latestPath);

  process.stdout.write(datedPath + "\n");
}

const isDirectRun =
  process.argv[1]?.endsWith("runner.ts") ||
  process.argv[1]?.endsWith("runner.js");
if (isDirectRun) main();
