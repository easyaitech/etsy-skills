/**
 * 命脉 A spike —— Etsy 新私信通知邮件:会不会来、多快、含不含全文、能不能解析出会话。
 *
 * 先手动制造信号(脚本只负责"看落地的邮件长啥样"):
 *   1. Etsy → Account → Emails,确认买家私信(Convos)通知已开;
 *   2. 用另一个账号给自己店连发 2-3 条私信(测会不会被 digest 合并);
 *   3. 再在你正登录在线时发一条(测在线是否抑制通知);
 *   4. 掐表:邮件多久到 / 有没有合并漏发 / 含不含全文 / 能否认出哪个会话。
 *
 * 跑法:
 *   cd spikes/etsy-dm && npm i
 *   IMAP_HOST=imap.gmail.com IMAP_USER=you@example.com IMAP_PASS='应用专用密码' npm run spike:email
 *
 * 过:稳定"一条私信一封邮件" + 能解析出会话 → C 成立(全文是 bonus)。
 * 不过:会合并 / 会漏 / 解析不出 → 回退轮询路线 A。
 */
import { ImapFlow } from "imapflow";

const host = process.env.IMAP_HOST;
const user = process.env.IMAP_USER;
const pass = process.env.IMAP_PASS; // 应用专用密码,不是登录密码
const fromHint = process.env.ETSY_FROM ?? "etsy.com"; // 发件域名按实际微调(可能是 transaction.etsy.com)

if (!host || !user || !pass) {
  console.error("缺 IMAP_HOST / IMAP_USER / IMAP_PASS(应用专用密码)。");
  process.exit(1);
}

function previewBody(raw: string): string {
  const sep = raw.indexOf("\r\n\r\n");
  const body = sep >= 0 ? raw.slice(sep + 4) : raw;
  // 去掉 quoted-printable 软换行,够 spike 看个大概(真实现用 mailparser 正经解码)
  return body.replace(/=\r\n/g, "").slice(0, 700);
}

async function main() {
  const client = new ImapFlow({ host, port: 993, secure: true, auth: { user, pass }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const uids = (await client.search({ from: fromHint }, { uid: true })) || [];
    const last = uids.slice(-8);
    console.log(`匹配 ${uids.length} 封来自「${fromHint}」的邮件,看最近 ${last.length} 封:\n`);
    for await (const msg of client.fetch(last, { uid: true, envelope: true, source: true })) {
      const env = msg.envelope;
      const raw = msg.source ? msg.source.toString("utf8") : "";
      console.log("=".repeat(60));
      console.log("date   :", env?.date);
      console.log("from   :", env?.from?.map((a) => a.address).join(", "));
      console.log("subject:", env?.subject);
      console.log("body 预览:\n", previewBody(raw));
      console.log("\n  ↑ 自问:这是一条私信一封邮件吗?正文含买家私信全文吗?认得出是哪个会话/哪个买家吗?");
    }
    if (last.length === 0) {
      console.log("没匹配到邮件 —— 确认:(a) 通知开了吗 (b) 发件域名对吗(试 ETSY_FROM=transaction.etsy.com)");
    }
  } finally {
    lock.release();
    await client.logout();
  }
}

main().catch((e) => {
  console.error("命脉A 失败:", e);
  process.exit(1);
});
