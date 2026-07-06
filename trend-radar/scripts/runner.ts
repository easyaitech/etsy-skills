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
    collected_by: string;
    via: string;
    revision: string;
  };
  items: TrendItem[];
}

// Exit codes: 1=usage, 2=config/workspace, 3=network/service, 4=empty(no data yet)
const EXIT_USAGE = 1;
const EXIT_CONFIG = 2;
const EXIT_NETWORK = 3;
const EXIT_EMPTY = 4;

const PULL_COMMAND = "pull";
const FIT_REPORT_COMMAND = "fit-report";

// 采集不再由本机 Chrome 抓取，而是由「管理员趋势采集插件」(admin-trend-extension) 用运营方
// 登录态在其浏览器里采集全平台热词、回传 ECS 上的 trend-radar 服务。本 skill 只从该服务读取
// 已采好的结构化数据。nginx 只放行 /trend-radar/ 前缀代理到服务；bare 域名走主应用。
const DEFAULT_TREND_RADAR_BASE_URL = "https://yanggedianzhang.com/trend-radar";

function trendRadarConfig(): { base: string; token: string } {
  const base = (process.env.TREND_RADAR_BASE_URL || DEFAULT_TREND_RADAR_BASE_URL).replace(/\/+$/, "");
  const token = String(process.env.TREND_RADAR_TOKEN || "").trim();
  return { base, token };
}

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
    `用法: trend-fetch pull [--geo GEO]
      trend-fetch fit-report [--date YYYY-MM-DD] [--geo GEO] [--max-items N]

采集已上收到「管理员趋势采集插件 → ECS trend-radar 服务」，本 CLI 不再本机抓取网页。

命令:
  pull            从 trend-radar 服务拉取插件已采集的最新各平台热词，落成 per-source JSON
  fit-report      读取当天各平台热词 JSON + 店铺/品牌/商品上下文，生成结合点报告

选项:
  --geo GEO       地区代码 (默认: US)
  --date DATE     fit-report 使用的输出日期 (默认: today)
  --max-items N   fit-report 最多分析的趋势词数量 (默认: 200)

环境变量:
  TREND_RADAR_TOKEN      访问 trend-radar 服务的 bearer（必需）
  TREND_RADAR_BASE_URL   服务地址（默认 ${DEFAULT_TREND_RADAR_BASE_URL}）

示例:
  trend-fetch pull
  trend-fetch pull --geo GB
  trend-fetch fit-report
  trend-fetch fit-report --date 2026-05-18 --max-items 50
`
  );
}

export type ParsedArgs =
  | {
      command: "pull";
      geo: string;
    }
  | {
      command: "fit-report";
      geo: string;
      date: string;
      maxItems: number;
    };

export function parseArgs(argv: string[]): ParsedArgs | null {
  const args = argv.slice(2);
  if (args.length === 0) return null;

  const command = args[0];
  if (!command || command.startsWith("-")) return null;
  if (command !== PULL_COMMAND && command !== FIT_REPORT_COMMAND) return null;

  let geo = "US";
  let date = new Date().toISOString().slice(0, 10);
  let maxItems = 200;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--geo" && args[i + 1]) {
      geo = args[i + 1].toUpperCase();
      i++;
    } else if (command === FIT_REPORT_COMMAND && args[i] === "--date" && args[i + 1]) {
      date = args[i + 1];
      i++;
    } else if (command === FIT_REPORT_COMMAND && args[i] === "--max-items" && args[i + 1]) {
      const parsedMax = Number(args[i + 1]);
      if (!Number.isInteger(parsedMax) || parsedMax <= 0) return null;
      maxItems = parsedMax;
      i++;
    } else {
      return null;
    }
  }

  if (command === FIT_REPORT_COMMAND) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    return { command: "fit-report", geo, date, maxItems };
  }

  return { command: "pull", geo };
}

// /latest 的 items 是「跨平台合并」后的形态：顶层是去重后的词 + best_rank + sources[]，每条真实
// 采集字段（rank / growth_label / category / trend_url）在 evidence[] 里按平台各一条。单平台过滤
// (?sources=<one>) 时 evidence[] 就是该平台对这个词的证据。
interface LatestEvidence {
  keyword?: string;
  source?: string;
  geo?: string;
  rank?: number;
  growth_label?: string;
  category?: string;
  captured_at?: string;
  trend_url?: string;
}
interface LatestMergedItem {
  keyword?: string;
  normalized_keyword?: string;
  best_rank?: number;
  sources?: string[];
  evidence?: LatestEvidence[];
}
interface LatestResponse {
  ok?: boolean;
  geo?: string;
  revision?: string;
  generated_at?: string;
  run_count?: number;
  runs?: Array<{ source: string; geo: string; generated_at?: string; item_count?: number }>;
  items?: LatestMergedItem[];
}

async function fetchLatest(
  base: string,
  token: string,
  params: Record<string, string>
): Promise<LatestResponse> {
  const query = new URLSearchParams(params).toString();
  const url = `${base}/latest?${query}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    throw Object.assign(new Error(`无法连接 trend-radar 服务 ${url}：${detail}`), {
      exitCode: EXIT_NETWORK,
    });
  }
  if (!response.ok) {
    const hint =
      response.status === 401 || response.status === 403
        ? "（TREND_RADAR_TOKEN 缺失或无效）"
        : "";
    throw Object.assign(new Error(`trend-radar 服务返回 ${response.status}${hint}`), {
      exitCode: EXIT_NETWORK,
    });
  }
  return (await response.json()) as LatestResponse;
}

function toTrendRunOutput(
  source: string,
  geo: string,
  generatedAt: string,
  revision: string,
  rawItems: LatestMergedItem[]
): TrendRunOutput {
  const items: TrendItem[] = rawItems
    .map((mergedItem, index): TrendItem | null => {
      const keyword = String(mergedItem.keyword || "").trim();
      if (!keyword) return null;
      // 真实采集字段在 evidence[] 里：优先取本平台那条，退化取第一条。
      const evidenceList = Array.isArray(mergedItem.evidence) ? mergedItem.evidence : [];
      const ev: LatestEvidence = evidenceList.find((e) => e && e.source === source) || evidenceList[0] || {};
      const evRank = Number(ev.rank);
      const bestRank = Number(mergedItem.best_rank);
      const rank = Number.isInteger(evRank) && evRank > 0
        ? evRank
        : Number.isInteger(bestRank) && bestRank > 0
          ? bestRank
          : index + 1;
      return {
        keyword,
        source: String(ev.source || source),
        geo: String(ev.geo || geo),
        rank,
        growth_label: String(ev.growth_label || "Hot"),
        category: String(ev.category || source),
        captured_at: String(ev.captured_at || generatedAt),
        trend_url: String(ev.trend_url || ""),
      };
    })
    .filter((item): item is TrendItem => item !== null)
    .sort((a, b) => a.rank - b.rank);

  return {
    generated_at: generatedAt,
    source,
    geo,
    item_count: items.length,
    schema_version: "1.0",
    evidence: {
      collected_by: "admin-trend-extension",
      via: "trend-radar-service /latest",
      revision,
    },
    items,
  };
}

async function pullFromService(geo: string, workspace: string): Promise<void> {
  const { base, token } = trendRadarConfig();
  if (!token) {
    process.stderr.write(
      `错误: 未配置 TREND_RADAR_TOKEN，无法访问 trend-radar 服务。\n` +
        `采集由管理员趋势采集插件完成，本 skill 只读取服务上的已采数据。\n`
    );
    process.exit(EXIT_CONFIG);
  }

  // 一次 /latest 拉总览：runs[] 告诉我们哪些平台本周有数据、各自采集时间；items[] 是跨平台合并结果。
  const overview = await fetchLatest(base, token, { geo, limit: "500" });
  const runs = Array.isArray(overview.runs)
    ? overview.runs.filter((run) => run.geo?.toUpperCase() === geo.toUpperCase())
    : [];
  if (runs.length === 0) {
    process.stderr.write(
      `错误: trend-radar 服务暂无 ${geo} 的热词数据（run_count=${overview.run_count ?? 0}）。\n` +
        `多半是管理员趋势采集插件本周还没跑成——请确认插件已加载、三个平台保持登录，插件每 3 小时/每次重载会自动补采。\n`
    );
    process.exit(EXIT_EMPTY);
  }

  const today = new Date().toISOString().slice(0, 10);
  const outDir = join(workspace, "outputs", "trend-radar", today);
  mkdirSync(outDir, { recursive: true });

  const revision = String(overview.revision || "");
  const written: Array<{ source: string; count: number }> = [];

  // 逐平台取回完整 items（/latest?sources=<单源> 过滤后返回该源自己的列表，不跨源合并/裁剪）。
  for (const run of runs) {
    const source = run.source;
    const perSource = await fetchLatest(base, token, { geo, sources: source, limit: "100" });
    const generatedAt = String(
      run.generated_at || perSource.generated_at || overview.generated_at || new Date().toISOString()
    );
    const output = toTrendRunOutput(
      source,
      geo,
      generatedAt,
      revision,
      Array.isArray(perSource.items) ? perSource.items : []
    );
    if (output.items.length === 0) continue;
    writeAtomic(join(outDir, `${source}-${geo}.json`), JSON.stringify(output, null, 2) + "\n");
    written.push({ source, count: output.items.length });
  }

  if (written.length === 0) {
    process.stderr.write(`错误: trend-radar 服务返回了 run 但没有可用热词条目（geo=${geo}）。\n`);
    process.exit(EXIT_EMPTY);
  }

  // latest.json 保留服务端合并总览（含 revision / runs / 跨平台 items），供 business-knowledge 等下游取用；
  // fit-report 读取时会跳过 latest.json，不影响 per-source 分析。
  const latestPath = join(workspace, "outputs", "trend-radar", "latest.json");
  writeAtomic(latestPath, JSON.stringify(overview, null, 2) + "\n");

  const summary = written.map((entry) => `${entry.source}(${entry.count})`).join(", ");
  process.stdout.write(`已从 trend-radar 服务拉取 ${written.length} 个平台：${summary}\n`);
  process.stdout.write(outDir + "\n");
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (!parsed) {
    printUsage();
    process.exit(EXIT_USAGE);
  }

  const workspace = resolveWorkspace();
  if (!workspace) {
    process.stderr.write(
      `错误: 找不到工作区\n设置 $ETSY_WORKSPACE 或在工作区根目录运行 etsy-stack init\n`
    );
    process.exit(EXIT_CONFIG);
  }

  if (parsed.command === "fit-report") {
    try {
      const result = generateFitReport({
        workspace,
        date: parsed.date,
        geo: parsed.geo,
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

  // command === "pull"
  try {
    await pullFromService(parsed.geo, workspace);
  } catch (err: unknown) {
    if (err instanceof Error && "exitCode" in err) {
      process.stderr.write(`错误: ${err.message}\n`);
      process.exit((err as unknown as { exitCode: number }).exitCode);
    }
    throw err;
  }
}

const isDirectRun =
  process.argv[1]?.endsWith("runner.ts") ||
  process.argv[1]?.endsWith("runner.js");
if (isDirectRun) main();
