// v0.1 stub 脑 —— 先返回固定草稿,证明"content script → background → 取草稿 → 回填"这条线通。
// 验过机制后,把 BRAIN_URL 指向真脑:
//   自用:本地 Hermes 起草接口(http://127.0.0.1:<port>/draft)
//   产品:云端起草服务
// 契约统一:POST {message} → 200 {draft}
const BRAIN_URL = ""; // 留空 = 用本地 stub,不接真脑

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "DRAFT") return;
  (async () => {
    if (!BRAIN_URL) {
      const snippet = (msg.message || "").slice(0, 40);
      sendResponse({
        draft: "（stub 草稿)Hi, thanks for reaching out! Regarding “" + snippet + "…”, …",
      });
      return;
    }
    try {
      const r = await fetch(BRAIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg.message }),
      });
      const data = await r.json();
      sendResponse({ draft: data.draft ?? "(脑没返回 draft 字段)" });
    } catch (e) {
      sendResponse({ draft: "(调脑失败:" + String(e) + ")" });
    }
  })();
  return true; // 异步 sendResponse:必须 return true
});
