/**
 * 命脉 B spike —— 证明 HubStudio 能起 Etsy 指纹环境,且 Playwright 能经 CDP 接管 Messages 页。
 * 只读 + 把光标停在 Messages 页,绝不发送、绝不关你的 HubStudio 窗口。
 *
 * 跑法(HubStudio 客户端必须在运行):
 *   cd spikes/etsy-dm && npm i
 *   HUB_LOCAL_API=http://127.0.0.1:6873 HUB_CONTAINER_CODE=<你的Etsy环境ID> npm run spike:cdp
 *
 * 过:能起环境 + 连上 + 读到 Messages 页且登录态在 → 地基稳。
 * 不过:报错 / 返回没 debuggingPort / 端口连不上 → 整条方案卡这儿,先解决再谈别的。
 */
import { chromium, type Browser } from "playwright";

const HUB_LOCAL_API = process.env.HUB_LOCAL_API ?? "http://127.0.0.1:6873"; // HubStudio 客户端「API」面板确认
const CONTAINER_CODE = process.env.HUB_CONTAINER_CODE; // 环境ID:/api/v1/env/list 或客户端里拿

if (!CONTAINER_CODE) {
  console.error("缺 HUB_CONTAINER_CODE(你的 Etsy 环境ID)。");
  process.exit(1);
}

async function main() {
  // 1) 启动 HubStudio 环境
  const startRes = await fetch(`${HUB_LOCAL_API}/api/v1/browser/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ containerCode: CONTAINER_CODE }),
    // 若你的本地 API 需要鉴权,在这里加 Authorization 头(app_id/app_secret 换的 token)
  });
  const payload: any = await startRes.json();
  console.log("HubStudio start 返回:", JSON.stringify(payload));

  // 2) 取 debuggingPort(兼容 data 嵌套 / 顶层两种返回结构)
  const node = payload?.data ?? payload;
  const port = node?.debuggingPort;
  if (!port) {
    console.error("返回里没有 debuggingPort —— 命脉B 当场失败,看上面 payload 的实际字段名。");
    process.exit(2);
  }
  const cdpUrl = `http://127.0.0.1:${port}`;
  console.log("CDP endpoint:", cdpUrl);

  // 3) Playwright 经 CDP 接管已经带指纹的浏览器
  let browser: Browser | null = null;
  try {
    browser = await chromium.connectOverCDP(cdpUrl);
    const ctx = browser.contexts()[0];
    const page = ctx.pages()[0] ?? (await ctx.newPage());

    await page.goto("https://www.etsy.com/your/conversations", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    console.log("URL:", page.url());
    console.log("Title:", await page.title());

    const title = await page.title();
    const loggedIn = !page.url().includes("/signin") && !title.includes("Sign in");
    console.log("登录态?", loggedIn);

    const rows = page.locator("a[href*='/conversations/'], [data-conversation-id]");
    console.log("会话类元素数量:", await rows.count(), "(选择器大概率要按当前 DOM 微调)");

    console.log("\n>>> 看一眼浏览器(应停在 Messages、已登录)。15 秒后断开连接,什么都不发送。");
    await page.waitForTimeout(15_000);
    console.log("done —— 没有发送任何消息。");
  } finally {
    // connectOverCDP 的 close() 只断开连接,HubStudio 浏览器服务端继续运行(不会关你的窗口)。
    // 注意:别用 process.exit(0),否则连接失败也会被当成成功退出,掩盖命脉B 的真实结果。
    await browser?.close();
  }
}

main().catch((e) => {
  console.error("命脉B 失败:", e);
  process.exit(1);
});
