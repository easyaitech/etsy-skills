// 列出 OpenRouter 上所有「能输出图片」的模型 slug,用来核对 / 修正 models.json。
//   npm run models
// 不需要 key 也能列(models 列表是公开的);有 key 会更稳。
const ENDPOINT = "https://openrouter.ai/api/v1/models";

interface ORModel {
  id: string;
  name?: string;
  architecture?: { output_modalities?: string[]; modality?: string };
  pricing?: Record<string, string>;
}

async function main(): Promise<void> {
  const headers: Record<string, string> = {};
  if (process.env.OPENROUTER_API_KEY) headers.Authorization = `Bearer ${process.env.OPENROUTER_API_KEY}`;

  const res = await fetch(ENDPOINT, { headers });
  if (!res.ok) {
    console.error(`✗ HTTP ${res.status} 拉 models 列表失败`);
    process.exit(1);
  }
  const json = (await res.json()) as { data?: ORModel[] };
  const all = json.data ?? [];

  const isImage = (m: ORModel): boolean => {
    const mods = m.architecture?.output_modalities;
    if (Array.isArray(mods)) return mods.includes("image");
    return (m.architecture?.modality ?? "").includes("image");
  };

  const imageModels = all.filter(isImage);
  const want = ["gemini-3-pro-image", "gpt-image", "gpt-5-image", "seedream"];

  console.log(`\n共 ${imageModels.length} 个可输出图片的模型。\n`);
  console.log("★ = 跟我们三个候选相关(Nano Banana Pro / GPT Image / Seedream):\n");

  for (const m of imageModels.sort((a, b) => a.id.localeCompare(b.id))) {
    const hit = want.some((w) => m.id.toLowerCase().includes(w)) ? "★ " : "  ";
    console.log(`${hit}${m.id.padEnd(44)} ${m.name ?? ""}`);
  }
  console.log(`\n→ 把 ★ 行里对的 slug 填回 models.json。`);
}

main().catch((e) => {
  console.error(`✗ ${(e as Error).message}`);
  process.exit(1);
});
