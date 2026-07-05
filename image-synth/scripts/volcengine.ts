// 火山引擎方舟(Volcengine ModelArk)生图客户端 — 给 Seedream 4.5 用(字节原生平台)。
// 同步 endpoint:POST {base}/images/generations;参照图走 image(收 base64 data URL);Bearer 鉴权。
// base 默认中国区 cn-beijing,可用 ARK_BASE_URL 覆盖(如 BytePlus 国际区)。
const DEFAULT_BASE = "https://ark.cn-beijing.volces.com/api/v3";
const DEFAULT_TIMEOUT_MS = 180_000;

export class ArkError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string,
  ) {
    super(message);
    this.name = "ArkError";
  }
}

export interface ArkGenerateOpts {
  apiKey: string;
  /** model id,例如 "doubao-seedream-4-5-251128" */
  slug: string;
  prompt: string;
  /** 参照图(base64 data URL 或 http URL) */
  references: string[];
  width: number;
  height: number;
  seed?: number;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ArkGenerateOutput {
  b64: string;
  /** 方舟响应不带美元费用,返 null,由调用方用单价表兜底 */
  cost: number | null;
  raw: unknown;
}

async function downloadImageAsBase64(url: string, timeoutMs: number): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ArkError("生成图 URL 不是合法 URL");
  }
  if (parsed.protocol !== "https:") {
    throw new ArkError("生成图 URL 必须是 https");
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let imgRes: Response;
  try {
    imgRes = await fetch(parsed.toString(), { signal: ctrl.signal });
  } catch (e) {
    throw new ArkError(`下载生成图网络错误 / 超时: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    clearTimeout(timer);
  }
  if (!imgRes.ok) throw new ArkError(`下载生成图失败 HTTP ${imgRes.status}`, imgRes.status);
  return Buffer.from(await imgRes.arrayBuffer()).toString("base64");
}

/** 纯函数:拼方舟请求体。watermark 必须 false,否则方舟默认给图加"AI生成"水印,对比不公平 */
export function buildArkBody(opts: Pick<ArkGenerateOpts, "slug" | "prompt" | "references" | "width" | "height" | "seed">) {
  return {
    model: opts.slug,
    prompt: opts.prompt,
    // 单图传字符串,多图传数组(方舟两种都收)
    image: opts.references.length === 1 ? opts.references[0] : opts.references,
    size: `${opts.width}x${opts.height}`,
    response_format: "b64_json" as const,
    watermark: false,
    sequential_image_generation: "disabled" as const,
    ...(opts.seed != null ? { seed: opts.seed } : {}),
  };
}

export async function arkGenerate(opts: ArkGenerateOpts): Promise<ArkGenerateOutput> {
  const base = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
  const body = buildArkBody(opts);

  const ctrl = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new ArkError(`网络错误 / 超时: ${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new ArkError(`HTTP ${res.status}（${opts.slug}）`, res.status, text.slice(0, 600));
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ArkError(`返回不是合法 JSON（${opts.slug}）`, res.status, text.slice(0, 300));
  }

  const item = json?.data?.[0];
  let b64: string | undefined = item?.b64_json;
  // 兜底:若返的是 url 而非 b64,再 GET 一次拿字节
  if (!b64 && typeof item?.url === "string") {
    b64 = await downloadImageAsBase64(item.url, timeoutMs);
  }
  if (!b64) {
    throw new ArkError(`响应里没拿到图（${opts.slug}）`, res.status, JSON.stringify(json).slice(0, 400));
  }

  return { b64, cost: null, raw: json };
}
