# Etsy 私信自动化 —— 命脉 spike

写第一行 v1 代码之前,先验两条命脉(见设计文档 `The Assignment`)。**任一不过,整条路线就改。** 这两个脚本只做验证,不是产品。

## 装
```bash
cd spikes/etsy-dm
npm i
```

## 命脉 B —— CDP 接管(`spike-cdp.ts`)
> 证明 HubStudio 能起 Etsy 指纹环境,Playwright 能经 CDP 接管 Messages 页。只读,不发送。

1. HubStudio 客户端 → 「API」面板,确认本地 API 地址(常见 `http://127.0.0.1:6873`)。
2. 拿你 Etsy 环境的 `containerCode`(环境列表 `/api/v1/env/list` 或客户端里)。
3. HubStudio 客户端保持运行,跑:
   ```bash
   HUB_LOCAL_API=http://127.0.0.1:6873 HUB_CONTAINER_CODE=你的环境ID npm run spike:cdp
   ```

- **过:** 能起环境 + 连上 + 读到 Messages 页且登录态在。
- **不过:** 报错 / 返回没 `debuggingPort` / 端口连不上 → 卡这儿,先解决再谈别的。

## 命脉 A —— 通知邮件(`spike-email.ts`)
1. Etsy → Account → Emails,确认买家私信(Convos)通知**已开**。
2. 用另一个号给自己店**连发 2–3 条**私信(测合并);再在**你在线时**发一条(测抑制)。
3. 邮箱开 IMAP + 生成**应用专用密码**,跑:
   ```bash
   IMAP_HOST=imap.gmail.com IMAP_USER=you@example.com IMAP_PASS='应用专用密码' npm run spike:email
   # 发件域名不对就加 ETSY_FROM=transaction.etsy.com
   ```

- **过:** 稳定"一条私信一封邮件" + 能解析出会话(全文是 bonus)。
- **不过:** 会合并 / 会漏 / 解析不出 → 回退轮询路线 A。

## 跑完
把两个脚本的输出贴回来。我据此定 v1 的触发器(邮件 vs 轮询)和驱动层(确认 CDP 可用),然后开始建。
