// v0.2 —— 读当前对话 thread + 把草稿填进 "Type your reply" 框(不发送)。
// 关键改动:① 读在「点击那刻」发生(切对话不会拿旧的);② 线程靠"可滚动容器里文本最多的那个"找,
// 不再瞎猜消息气泡;③ 内置「抓DOM」按钮,调试不用再贴 Console。
(function () {
  const TAG = "[etsy-dm v0.2]";
  if (window.__edmLoaded) return;
  window.__edmLoaded = true;
  console.log(TAG, "content script 已注入,URL:", location.href);

  const panel = document.createElement("div");
  panel.id = "edm-panel";
  panel.style.cssText =
    "position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#222;color:#fff;" +
    "font:13px/1.5 system-ui;padding:12px 14px;border-radius:10px;max-width:340px;box-shadow:0 4px 16px rgba(0,0,0,.35)";
  panel.innerHTML =
    '<b>Etsy DM 助手 v0.2</b>' +
    '<div id="edm-status" style="margin-top:4px;opacity:.85">就绪 —— 打开一条对话,再点下面</div>' +
    '<div id="edm-preview" style="margin-top:6px;font-size:12px;opacity:.6;max-height:48px;overflow:hidden"></div>' +
    '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
    '<button id="edm-draft" style="padding:6px 10px;border:0;border-radius:6px;cursor:pointer">生成草稿并填入(不发送)</button>' +
    '<button id="edm-dump" style="padding:6px 10px;border:0;border-radius:6px;cursor:pointer;background:#444;color:#fff">抓DOM</button>' +
    '</div>';
  document.body.appendChild(panel);
  const status = panel.querySelector("#edm-status");
  const preview = panel.querySelector("#edm-preview");

  function findReplyBox() {
    return (
      document.querySelector('textarea[placeholder="Type your reply"]') ||
      document.querySelector("textarea")
    );
  }

  // 线程 = 可滚动容器里 innerText 最多的那个(排除我的面板);找不到则从回复框往上找一个文本够多的祖先。
  function readThread() {
    const scrollers = [...document.querySelectorAll("body *")].filter((e) => {
      if (e.closest("#edm-panel")) return false;
      const s = getComputedStyle(e);
      return (
        (s.overflowY === "auto" || s.overflowY === "scroll") &&
        e.scrollHeight > e.clientHeight + 40 &&
        e.clientHeight > 120
      );
    });
    let best = null, bestLen = 0;
    for (const sc of scrollers) {
      const len = (sc.innerText || "").trim().length;
      if (len > bestLen) { bestLen = len; best = sc; }
    }
    if (!best) {
      let e = findReplyBox(), n = 0;
      e = e && e.parentElement;
      while (e && n < 8) {
        if ((e.innerText || "").length > 200) { best = e; break; }
        e = e.parentElement; n++;
      }
    }
    return best ? (best.innerText || "").trim() : "";
  }

  panel.querySelector("#edm-draft").addEventListener("click", async () => {
    const thread = readThread().slice(0, 4000);
    if (!thread) {
      status.textContent = "没读到对话内容 ❌ —— 先点开一条对话;还不行就点「抓DOM」发我";
      return;
    }
    preview.textContent = "读到:" + thread.slice(0, 120).replace(/\s+/g, " ");
    status.textContent = "找脑要草稿…";
    let reply;
    try {
      reply = await chrome.runtime.sendMessage({ type: "DRAFT", message: thread });
    } catch (e) {
      status.textContent = "调 background 失败 ❌:" + String(e);
      return;
    }
    const box = findReplyBox();
    if (!box) { status.textContent = "没找到回复框 ❌(对话没打开?)"; return; }
    box.value = reply.draft;
    box.dispatchEvent(new Event("input", { bubbles: true }));
    box.focus();
    status.textContent = "草稿已填入回复框 ✅(没发送,你来点发送)";
  });

  // 调试:把回复框祖先链 + 可滚动容器结构打到 Console 并复制到剪贴板
  panel.querySelector("#edm-dump").addEventListener("click", async () => {
    const L = [];
    const box = findReplyBox();
    L.push("REPLY BOX: " + (box ? `id=${box.id} ph="${box.placeholder}"` : "NONE"));
    let e = box, n = 0;
    while (e && n < 8) {
      L.push(`up${n} <${e.tagName.toLowerCase()}> class="${(e.className || "").toString().slice(0, 90)}" children=${e.children ? e.children.length : 0} textLen=${(e.innerText || "").length}`);
      e = e.parentElement; n++;
    }
    const scrollers = [...document.querySelectorAll("body *")].filter((x) => {
      const s = getComputedStyle(x);
      return (s.overflowY === "auto" || s.overflowY === "scroll") && x.scrollHeight > x.clientHeight + 40 && x.clientHeight > 120;
    });
    L.push("SCROLLERS: " + scrollers.length);
    scrollers.forEach((sc, si) =>
      L.push(`#${si} <${sc.tagName.toLowerCase()}> class="${(sc.className || "").toString().slice(0, 90)}" textLen=${(sc.innerText || "").length} :: "${(sc.innerText || "").trim().replace(/\s+/g, " ").slice(0, 60)}"`)
    );
    const out = L.join("\n");
    console.log(TAG, "\n" + out);
    try { await navigator.clipboard.writeText(out); } catch (_) {}
    status.textContent = "已抓 DOM → Console + 剪贴板,贴给作者";
  });
})();
