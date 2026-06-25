// v0.4 —— 接 yanggedianzhang 多租户后端的 Etsy-DM 渠道（替代早期本地 OpenRouter brain）。
// 插件 POST {etsyDmToken, thread} 给 bridge；后端按 token 路由到该客户的 Hermes profile 出草稿，回 {draft}。
// 不发送：草稿只填进 Etsy 回复框，由客户审后手动点发送。
//
// 每个客户装插件时配三处：
//   1) BRIDGE_URL     你的后端域名 + /api/etsy-dm/draft
//   2) ETSY_DM_TOKEN  该客户的租户 token（= 后端 tenantBindings.etsyDmToken）
//   3) manifest.json 的 host_permissions 里加上你的后端域名（否则 MV3 拦截跨域 fetch）
const BRIDGE_URL = "https://yanggedianzhang.com/api/etsy-dm/draft"; // 后端 Etsy-DM 入口
const ETSY_DM_TOKEN = ""; // 该客户的 etsyDmToken（= 后端 tenantBindings.etsyDmToken；待 mint）

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "DRAFT") return;
  (async () => {
    if (!BRIDGE_URL || !ETSY_DM_TOKEN) {
      sendResponse({ draft: "（未配置 BRIDGE_URL / ETSY_DM_TOKEN，见 background.js）" });
      return;
    }
    try {
      const r = await fetch(BRIDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + ETSY_DM_TOKEN
        },
        body: JSON.stringify({ etsyDmToken: ETSY_DM_TOKEN, thread: msg.message })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        sendResponse({ draft: "（后端 " + r.status + "：" + (data.error || "未知错误") + "）" });
        return;
      }
      sendResponse({ draft: data.draft ?? data.text ?? "（后端没返回 draft 字段）" });
    } catch (e) {
      sendResponse({ draft: "（调后端失败：" + String(e) + "）" });
    }
  })();
  return true; // 异步 sendResponse 必须 return true
});
