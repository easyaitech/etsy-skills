/**
 * 本地起草脑(自用)—— 收扩展的 {thread},读 BRAND/SHOP/COMMERCE_PLATFORM + 客服 SOP,
 * 调 OpenRouter 起草客服回复,回 {draft}。跑在 Mac mini(和 HubStudio 同机)。
 *
 * 跑:
 *   cd spikes/etsy-dm/brain && npm i
 *   # 填好 .env(见 .env.example)后:
 *   npm start
 *
 * 扩展 background.js 的 BRAIN_URL 默认就是 http://127.0.0.1:8787/draft,直接对上。
 */
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- 极简 .env 加载(无依赖)---
try {
  const envPath = join(__dirname, ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch { /* ignore */ }

const PORT = Number(process.env.PORT || 8787);
const KEY = process.env.OPENROUTER_API_KEY || "";
const WS = process.env.ETSY_WORKSPACE || "";
const MODEL = process.env.MODEL || "openai/gpt-4o-mini"; // 改成你想要的 OpenRouter 模型
const SOP_PATH = process.env.SOP_PATH || "";

function readIf(p: string): string {
  try { return existsSync(p) ? readFileSync(p, "utf8") : ""; } catch { return ""; }
}

// BRAND/SHOP/PLATFORM 在用户 workspace;SOP 默认用本仓 orders-customers 的客服话术。改了重启即可。
function loadContext() {
  const brand = WS ? readIf(join(WS, "BRAND.md")) : "";
  const shop = WS ? readIf(join(WS, "SHOP.md")) : "";
  const platform = WS ? readIf(join(WS, "COMMERCE_PLATFORM.md")) : "";
  const sopDefault = join(__dirname, "../../../orders-customers/references/order-handling.md");
  const sop = readIf(SOP_PATH || sopDefault);
  return { brand, shop, platform, sop };
}

function systemPrompt(ctx: ReturnType<typeof loadContext>): string {
  return [
    "你是这家 Etsy 店的客服,替店主起草买家私信(Conversations)的回复草稿。",
    "硬规则:严格遵守下面的品牌语调与客服姿态;涉及政策(处理时间/退换货/运输/定制)只引用 SHOP 原文,绝不自编承诺;回复语言与买家一致(Etsy 默认英文)。",
    "只输出回复正文本身 —— 不要前后解释、不要加引号、不要写「草稿:」之类前缀。",
    ctx.brand && "## BRAND(语调 / 客服姿态 / 边界)\n" + ctx.brand,
    ctx.shop && "## SHOP(政策原文,引用别自编)\n" + ctx.shop,
    ctx.platform && "## PLATFORM(平台买家语言 / 边界)\n" + ctx.platform,
    ctx.sop && "## 客服 SOP(场景话术)\n" + ctx.sop,
  ].filter(Boolean).join("\n\n");
}

const CTX = loadContext();

const server = http.createServer((req, res) => {
  // 扩展从 etsy.com 页面发来,放开 CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, model: MODEL, brand: !!CTX.brand, shop: !!CTX.shop, sop: !!CTX.sop }));
    return;
  }
  if (req.method !== "POST" || req.url !== "/draft") { res.writeHead(404); res.end("not found"); return; }

  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    try {
      const { thread } = JSON.parse(body || "{}");
      if (!thread) { res.writeHead(400); res.end(JSON.stringify({ error: "missing thread" })); return; }
      if (!KEY) { res.writeHead(200); res.end(JSON.stringify({ draft: "(脑未配置 OPENROUTER_API_KEY,见 .env)" })); return; }
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.4,
          messages: [
            { role: "system", content: systemPrompt(CTX) },
            { role: "user", content: "买家对话(最新在最下):\n\n" + thread + "\n\n请起草一条回复草稿。" },
          ],
        }),
      });
      const data: any = await r.json();
      const draft = data?.choices?.[0]?.message?.content?.trim() ||
        "(LLM 没返回内容:" + JSON.stringify(data).slice(0, 300) + ")";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ draft }));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ draft: "(脑出错:" + String(e) + ")" }));
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[etsy-dm brain] listening http://127.0.0.1:${PORT}/draft  model=${MODEL}`);
  console.log(`[etsy-dm brain] workspace=${WS || "(未设 ETSY_WORKSPACE)"}`);
  console.log(`[etsy-dm brain] context  BRAND ${CTX.brand ? "✓" : "✗"} | SHOP ${CTX.shop ? "✓" : "✗"} | PLATFORM ${CTX.platform ? "✓" : "✗"} | SOP ${CTX.sop ? "✓" : "✗"}`);
  if (!KEY) console.log("[etsy-dm brain] ⚠️  没读到 OPENROUTER_API_KEY,/draft 会回提示而非真草稿");
});
