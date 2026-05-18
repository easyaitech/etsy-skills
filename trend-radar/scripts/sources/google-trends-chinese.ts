import { writeFileSync } from "node:fs";
import { join } from "node:path";

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

export class TrendFetchError extends Error {
  constructor(message: string, public exitCode: number) {
    super(message);
    this.name = "TrendFetchError";
  }
}

const EXIT_CONFIG = 2;
const EXIT_NETWORK = 3;
const EXIT_PARSE = 4;
const TARGET_RELATED_COUNT = 50;
const RELATED_QUERY = "Chinese";

type SerpApiRelatedQuery = {
  query?: string;
  value?: string;
  link?: string;
};

type SerpApiRelatedTopic = {
  topic?: {
    title?: string;
    type?: string;
  };
  value?: string;
  link?: string;
};

type SerpApiResponse = {
  error?: string;
  related_queries?: {
    rising?: SerpApiRelatedQuery[];
    top?: SerpApiRelatedQuery[];
  };
  related_topics?: {
    rising?: SerpApiRelatedTopic[];
    top?: SerpApiRelatedTopic[];
  };
};

type Candidate = {
  keyword: string;
  value?: string;
  link?: string;
  category: string;
};

function buildSerpApiUrl(geo: string, dataType: "RELATED_QUERIES" | "RELATED_TOPICS"): string {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new TrendFetchError(
      "缺少 SERPAPI_KEY，无法获取 Chinese 相关趋势词",
      EXIT_CONFIG
    );
  }
  const params = new URLSearchParams({
    engine: "google_trends",
    q: RELATED_QUERY,
    geo,
    date: "now 7-d",
    data_type: dataType,
    api_key: apiKey,
  });
  return `https://serpapi.com/search.json?${params.toString()}`;
}

async function fetchSerpApi(geo: string, dataType: "RELATED_QUERIES" | "RELATED_TOPICS"): Promise<SerpApiResponse> {
  try {
    const res = await fetch(buildSerpApiUrl(geo, dataType), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new TrendFetchError(
        `SerpApi ${dataType} 请求失败：HTTP ${res.status}`,
        EXIT_NETWORK
      );
    }
    const data = (await res.json()) as SerpApiResponse;
    if (data.error) {
      throw new TrendFetchError(`SerpApi ${dataType} 返回错误：${data.error}`, EXIT_NETWORK);
    }
    return data;
  } catch (err) {
    if (err instanceof TrendFetchError) throw err;
    throw new TrendFetchError(
      `SerpApi ${dataType} 请求失败：${err instanceof Error ? err.message : String(err)}`,
      EXIT_NETWORK
    );
  }
}

const googleTrendsChinese = {
  name: "google-trends-chinese" as const,

  async fetch(opts: { geo: string }): Promise<{
    items: TrendItem[];
    screenshotPath: string;
    snapshotPath: string;
  }> {
    const geo = opts.geo;
    const capturedAt = new Date().toISOString();
    const tempDir =
      process.env.TREND_RADAR_OUT_DIR ||
      join(process.cwd(), ".trend-radar-tmp");
    const rawPath = join(tempDir, `google-trends-chinese-${geo}-serpapi.json`);

    const queryData = await fetchSerpApi(geo, "RELATED_QUERIES");

    const candidates: Candidate[] = [
      ...(queryData.related_queries?.rising || []).map((item) => ({
        keyword: item.query || "",
        value: item.value,
        link: item.link,
        category: `Rising query related to ${RELATED_QUERY}`,
      })),
      ...(queryData.related_queries?.top || []).map((item) => ({
        keyword: item.query || "",
        value: item.value,
        link: item.link,
        category: `Top query related to ${RELATED_QUERY}`,
      })),
    ];

    let topicData: SerpApiResponse | undefined;
    // RELATED_QUERIES can contain fewer than 50 unique rows because rising/top overlap.
    // Supplement with RELATED_TOPICS to keep the final Chinese-related output at Top 50.
    if (new Set(candidates.map((item) => item.keyword.toLowerCase()).filter(Boolean)).size < TARGET_RELATED_COUNT) {
      topicData = await fetchSerpApi(geo, "RELATED_TOPICS");
      candidates.push(
        ...(topicData.related_topics?.rising || []).map((item) => ({
          keyword: item.topic?.title || "",
          value: item.value,
          link: item.link,
          category: `Rising topic related to ${RELATED_QUERY}${item.topic?.type ? ` / ${item.topic.type}` : ""}`,
        })),
        ...(topicData.related_topics?.top || []).map((item) => ({
          keyword: item.topic?.title || "",
          value: item.value,
          link: item.link,
          category: `Top topic related to ${RELATED_QUERY}${item.topic?.type ? ` / ${item.topic.type}` : ""}`,
        }))
      );
    }

    writeFileSync(
      rawPath,
      JSON.stringify({ related_queries: queryData, related_topics: topicData }, null, 2) + "\n"
    );

    const seen = new Set<string>();
    const related = candidates.filter((item) => {
      const query = item.keyword.trim();
      if (!query) return false;
      const key = query.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const items = related.slice(0, TARGET_RELATED_COUNT).map((item, i) => ({
      keyword: item.keyword,
      source: "google-trends-chinese",
      geo,
      rank: i + 1,
      growth_label: item.value || "N/A",
      category: item.category,
      captured_at: capturedAt,
      trend_url:
        item.link ||
        `https://trends.google.com/trends/explore?q=${encodeURIComponent(item.keyword)}&geo=${encodeURIComponent(geo)}&date=now%207-d`,
    }));

    if (items.length === 0) {
      throw new TrendFetchError(
        "Chinese 相关趋势词返回 0 条结果，不覆盖 latest.json",
        EXIT_PARSE
      );
    }

    if (items.length < TARGET_RELATED_COUNT) {
      process.stderr.write(
        `警告: Chinese 相关趋势词只解析到 ${items.length} 条（期望 ${TARGET_RELATED_COUNT}）\n`
      );
    }

    return { items, screenshotPath: rawPath, snapshotPath: rawPath };
  },
};

export default googleTrendsChinese;
