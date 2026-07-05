// fal.ai 生图客户端 — 给 Seedream 4.5 用(它不在 OpenRouter)。
// 同步 endpoint:POST https://fal.run/<slug>;参照图走 image_urls(收 base64 data URI)。
// fal 返回的是图片 URL,需再 GET 一次拿字节。
const FAL_HOST = "https://fal.run";
const DEFAULT_TIMEOUT_MS = 180_000;

export class FalError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string,
  ) {
    super(message);
    this.name = "FalError";
  }
}

export interface FalGenerateOpts {
  apiKey: string;
  slug: string;
  prompt: string;
  /** 参照图(data URI 或 http URL),喂 image_urls */
  references: string[];
  width: number;
  height: number;
  seed?: number;
  timeoutMs?: number;
}

export interface FalGenerateOutput {
  b64: string;
  /** fal 响应一般不带费用,返 null,由调用方用单价表兜底 */
  cost: number | null;
  raw: unknown;
}

function dataUriPayload(dataUri: string): string {
  const comma = dataUri.indexOf(",");
  return comma >= 0 ? dataUri.slice(comma + 1) : "";
}

async function downloadImageAsBase64(url: string, timeoutMs: number): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new FalError("生成图 URL 不是合法 URL");
  }
  if (parsed.protocol !== "https:") {
    throw new FalError("生成图 URL 必须是 https");
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let imgRes: Response;
  try {
    imgRes = await fetch(parsed.toString(), { signal: ctrl.signal });
  } catch (e) {
    throw new FalError(`下载生成图网络错误 / 超时: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    clearTimeout(timer);
  }
  if (!imgRes.ok) throw new FalError(`下载生成图失败 HTTP ${imgRes.status}`, imgRes.status);
  return Buffer.from(await imgRes.arrayBuffer()).toString("base64");
}

export async function falGenerate(opts: FalGenerateOpts): Promise<FalGenerateOutput> {
  const body = {
    prompt: opts.prompt,
    image_urls: opts.references,
    image_size: { width: opts.width, height: opts.height },
    num_images: 1,
    ...(opts.seed != null ? { seed: opts.seed } : {}),
  };

  const ctrl = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${FAL_HOST}/${opts.slug}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new FalError(`网络错误 / 超时: ${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new FalError(`HTTP ${res.status}（${opts.slug}）`, res.status, text.slice(0, 600));
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new FalError(`返回不是合法 JSON（${opts.slug}）`, res.status, text.slice(0, 300));
  }

  const img = json?.images?.[0];
  const url: string | undefined = img?.url;
  if (!url) {
    throw new FalError(`响应里没拿到图（${opts.slug}）`, res.status, JSON.stringify(json).slice(0, 400));
  }

  // fal 通常回 https URL;偶尔回 data URI
  let b64: string;
  if (url.startsWith("data:")) {
    b64 = dataUriPayload(url);
  } else {
    b64 = await downloadImageAsBase64(url, timeoutMs);
  }
  if (!b64) throw new FalError(`生成图为空（${opts.slug}）`, res.status);

  return { b64, cost: null, raw: json };
}
