// 三模型生图对比 harness — 共享类型

export type Provider = "openrouter" | "fal" | "ark";

export interface ModelSpec {
  /** 本地标签,用于目录名 / 评分表,例如 "nano-banana-pro" */
  key: string;
  /** 人读名,例如 "Nano Banana Pro (Gemini 3 Pro Image)" */
  label: string;
  /** 接入方:openrouter(默认)或 fal。Seedream 只在 fal 上 */
  provider?: Provider;
  /** 模型 slug。OpenRouter 例:"google/gemini-3-pro-image";fal 例:"fal-ai/bytedance/seedream/v4.5/edit"。OpenRouter 的用 `npm run models` 核对 */
  slug: string;
  /** 备注 */
  notes?: string;
}

export interface ModelsConfig {
  models: ModelSpec[];
}

export interface ProductRef {
  /** 逻辑键,case 用它引用,例如 "product-a" */
  key: string;
  /** 商品实拍图路径(绝对路径,或相对 scripts/ 目录) */
  imagePath: string;
}

export interface BenchCase {
  id: string;
  /** 单图参照:引用一个 ProductRef.key(向后兼容) */
  product?: string;
  /** 多图参照:有序引用多个 ProductRef.key(图1、图2…按此顺序喂模型)。给了就用这个 */
  products?: string[];
  /** A = 电商图(严格保形) / B = 社媒图(看氛围) */
  mode: "A" | "B";
  prompt: string;
  /** 反向词,会统一拼到 prompt 尾部("Avoid: ..."),保证三模型公平 */
  negative?: string;
  /** "1:1" | "4:5" | "2:3" ... */
  aspectRatio: string;
  /** "1K" | "2K" | "4K" */
  resolution: string;
  note?: string;
}

export interface CasesConfig {
  products: ProductRef[];
  cases: BenchCase[];
}

export interface GenResult {
  caseId: string;
  mode: "A" | "B";
  modelKey: string;
  modelLabel: string;
  slug: string;
  ok: boolean;
  /** 保存图相对 run 目录的路径,例如 "nano-banana-pro/hero-white.png" */
  outPath?: string;
  /** OpenRouter usage.cost 回的真实花费(美元) */
  cost?: number | null;
  ms?: number;
  error?: string;
}
