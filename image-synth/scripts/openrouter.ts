// OpenRouter 生图客户端 — POST /api/v1/images
// 一个 endpoint,换 model slug 即换模型;参照图走 input_references(base64 data URL)。
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const ENDPOINT = "https://openrouter.ai/api/v1/images";

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/** 读本地图片 → data URI,用作参照图 */
export function fileToDataUri(path: string): string {
  const buf = readFileSync(path);
  const ext = extname(path).toLowerCase().replace(".", "");
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export interface GenerateOpts {
  apiKey: string;
  slug: string;
  prompt: string;
  /** 参照图(data URI 或 http(s) URL),喂给 input_references */
  references: string[];
  aspectRatio: string;
  resolution: string;
  outputFormat?: string;
  seed?: number;
  timeoutMs?: number;
}

export interface GenerateOutput {
  /** base64 图(不含 data: 前缀) */
  b64: string;
  /** OpenRouter 回的真实花费(美元),拿不到则 null */
  cost: number | null;
  raw: unknown;
}

function dataUriPayload(dataUri: string): string {
  const comma = dataUri.indexOf(",");
  return comma >= 0 ? dataUri.slice(comma + 1) : "";
}

export async function generateImage(opts: GenerateOpts): Promise<GenerateOutput> {
  const body = {
    model: opts.slug,
    prompt: opts.prompt,
    n: 1,
    aspect_ratio: opts.aspectRatio,
    resolution: opts.resolution,
    output_format: opts.outputFormat ?? "png",
    ...(opts.seed != null ? { seed: opts.seed } : {}),
    input_references: opts.references.map((url) => ({ type: "image_url", image_url: { url } })),
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 120_000);
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new OpenRouterError(`网络错误 / 超时: ${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new OpenRouterError(`HTTP ${res.status}（${opts.slug}）`, res.status, text.slice(0, 600));
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new OpenRouterError(`返回不是合法 JSON（${opts.slug}）`, res.status, text.slice(0, 300));
  }

  // 兼容两种响应：images endpoint 的 data[].b64_json,以及 chat 风格的 images[].image_url.url
  const b64Json = json?.data?.[0]?.b64_json;
  const chatUrl = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  let b64: string | undefined = b64Json;
  if (!b64 && typeof chatUrl === "string") {
    b64 = chatUrl.startsWith("data:") ? dataUriPayload(chatUrl) : undefined;
  }
  if (!b64) {
    throw new OpenRouterError(
      `响应里没拿到图（${opts.slug}）`,
      res.status,
      JSON.stringify(json).slice(0, 400),
    );
  }

  const cost = typeof json?.usage?.cost === "number" ? json.usage.cost : null;
  return { b64, cost, raw: json };
}
