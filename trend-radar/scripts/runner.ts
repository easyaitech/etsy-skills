import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { FitReportError, generateFitReport } from "./fit-report.js";

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

const KNOWN_SOURCES = [
  "google-trends",
  "google-trends-chinese",
  "pinterest-trends",
  "pinterest-chinese",
  "erank-trend-buzz",
] as const;
const FIT_REPORT_COMMAND = "fit-report";
const GEO_ALLOWLIST: Record<string, string[]> = {
  "google-trends": ["US", "GB", "AU", "CA", "DE", "FR", "JP", "BR", "IN"],
  "google-trends-chinese": ["US", "GB", "AU", "CA", "DE", "FR", "JP", "BR", "IN"],
  "pinterest-trends": ["US", "GB", "CA", "AU", "DE", "FR", "IT", "ES", "BR", "MX"],
  "pinterest-chinese": ["US", "GB", "CA", "AU", "DE", "FR", "IT", "ES", "BR", "MX"],
  "erank-trend-buzz": ["US", "GB", "CA", "AU", "DE", "FR", "IN"],
};

function writeAtomic(path: string, content: string): void {
  const tmpPath = `${path}.${process.pid}.tmp`;
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, path);
}

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
      trend-fetch fit-report [--date YYYY-MM-DD] [--geo GEO] [--max-items N]

数据源: ${KNOWN_SOURCES.join(", ")}

选项:
  --geo GEO       地区代码 (默认: US)
  --date DATE     fit-report 使用的输出日期 (默认: today)
  --max-items N   fit-report 最多分析的趋势词数量 (默认: 200)

示例:
  trend-fetch google-trends
  trend-fetch google-trends-chinese
  trend-fetch pinterest-trends
  trend-fetch pinterest-chinese
  trend-fetch erank-trend-buzz
  trend-fetch google-trends --geo GB
  trend-fetch fit-report --date 2026-05-18
`
  );
}

export type ParsedArgs =
  | {
      command: "fetch";
      source: string;
      geo: string;
    }
  | {
      command: "fit-report";
      source: typeof FIT_REPORT_COMMAND;
      geo: string;
      date: string;
      maxItems: number;
    };

export function parseArgs(argv: string[]): ParsedArgs | null {
  const args = argv.slice(2);
  if (args.length === 0) return null;

  const source = args[0];
  if (!source || source.startsWith("-")) return null;

  let geo = "US";
  let date = new Date().toISOString().slice(0, 10);
  let maxItems = 200;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--geo" && args[i + 1]) {
      geo = args[i + 1].toUpperCase();
      i++;
    } else if (source === FIT_REPORT_COMMAND && args[i] === "--date" && args[i + 1]) {
      date = args[i + 1];
      i++;
    } else if (
      source === FIT_REPORT_COMMAND &&
      args[i] === "--max-items" &&
      args[i + 1]
    ) {
      const parsedMax = Number(args[i + 1]);
      if (!Number.isInteger(parsedMax) || parsedMax <= 0) return null;
      maxItems = parsedMax;
      i++;
    } else {
      return null;
    }
  }

  if (source === FIT_REPORT_COMMAND) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    return { command: "fit-report", source, geo, date, maxItems };
  }

  return { command: "fetch", source, geo };
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

  if (parsed.command === "fit-report") {
    const workspace = resolveWorkspace();
    if (!workspace) {
      process.stderr.write(
        `错误: 找不到工作区\n设置 $ETSY_WORKSPACE 或在工作区根目录运行 etsy-stack init\n`
      );
      process.exit(EXIT_CONFIG);
    }

    try {
      const result = generateFitReport({
        workspace,
        date: parsed.date,
        geo,
        maxItems: parsed.maxItems,
      });
      process.stdout.write(result.markdownPath + "\n");
      return;
    } catch (err: unknown) {
      if (err instanceof FitReportError) {
        process.stderr.write(`错误: ${err.message}\n`);
        process.exit(err.exitCode);
      }
      throw err;
    }
  }

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
  const outputJson = JSON.stringify(output, null, 2) + "\n";
  writeAtomic(datedPath, outputJson);

  const latestDir = join(workspace, "outputs", "trend-radar");
  const latestPath = join(latestDir, "latest.json");
  writeAtomic(latestPath, outputJson);

  process.stdout.write(datedPath + "\n");
}

const isDirectRun =
  process.argv[1]?.endsWith("runner.ts") ||
  process.argv[1]?.endsWith("runner.js");
if (isDirectRun) main();
