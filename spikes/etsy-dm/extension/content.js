// v0.1 命脉验证 content script —— 证明:扩展能在 HubStudio 里跑、能读 Etsy 私信、能把草稿填进回复框。
// 不发送。选择器是「粗」的,按真实 DOM 调(v0.1 验的是"能不能跑",不是选择器准不准)。
(function () {
  const TAG = "[etsy-dm v0.1]";
  console.log(TAG, "content script 已注入,URL:", location.href);

  // 1) 注入可见面板 —— 证明扩展确实在这个页面跑起来了(最硬的一关)
  const panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;right:16px;bottom:16px;z-index:999999;background:#222;color:#fff;" +
    "font:13px/1.5 system-ui;padding:12px 14px;border-radius:10px;max-width:340px;" +
    "box-shadow:0 4px 16px rgba(0,0,0,.3)";
  panel.innerHTML =
    '<b>Etsy DM 助手 v0.1</b>' +
    '<div id="edm-status" style="margin-top:4px">已加载 ✅ 正在找最新私信…</div>' +
    '<button id="edm-draft" style="margin-top:8px;padding:6px 10px;border:0;border-radius:6px;cursor:pointer">' +
    '生成草稿并填入(不发送)</button>';
  document.body.appendChild(panel);
  const status = panel.querySelector("#edm-status");

  // 2) 读最新一条买家消息(选择器粗,按真实 DOM 调)
  function readLatestMessage() {
    const sels = [
      "[data-region='message']",
      ".conversation_message",
      "[class*='message'] [class*='body']",
    ];
    let nodes = [];
    for (const s of sels) {
      nodes = document.querySelectorAll(s);
      if (nodes.length) break;
    }
    const last = nodes[nodes.length - 1];
    return last ? last.textContent.trim().slice(0, 2000) : "";
  }

  // 3) 找回复框(选择器粗,按真实 DOM 调)
  function findReplyBox() {
    return document.querySelector(
      "textarea[name='message'], textarea[id*='message'], textarea, div[contenteditable='true']"
    );
  }

  const latest = readLatestMessage();
  status.textContent = latest
    ? "读到最新私信(" + latest.length + " 字)✅"
    : "没读到私信 ❌ —— content.js 里的选择器要按真实 DOM 调";

  // 4) 点按钮 → 调 background 要草稿(stub)→ 填进回复框,绝不发送
  panel.querySelector("#edm-draft").addEventListener("click", async () => {
    status.textContent = "找脑要草稿…";
    let reply;
    try {
      reply = await chrome.runtime.sendMessage({ type: "DRAFT", message: latest });
    } catch (e) {
      status.textContent = "调 background 失败 ❌:" + String(e);
      return;
    }
    const box = findReplyBox();
    if (!box) {
      status.textContent = "没找到回复框 ❌ —— 调选择器";
      return;
    }
    if (box.tagName === "TEXTAREA") {
      box.value = reply.draft;
    } else {
      box.textContent = reply.draft; // contenteditable
    }
    box.dispatchEvent(new Event("input", { bubbles: true }));
    box.focus();
    status.textContent = "草稿已填入回复框 ✅(没发送,你来点发送)";
  });
})();
