# Etsy DM 起草脑(本地,自用)

收扩展发来的对话 `{thread}`,读 **BRAND.md / SHOP.md / COMMERCE_PLATFORM.md + 客服 SOP**,调 **OpenRouter** 起草客服回复,回 `{draft}`。跑在 Mac mini(和 HubStudio 同机)。

复用的是 `orders-customers` skill 那套脑逻辑(品牌语调 + 政策原文 + 场景话术),所以草稿是"你",不是套话机器人。

## 跑起来
```bash
cd spikes/etsy-dm/brain
npm i
cp .env.example .env     # 然后填:OPENROUTER_API_KEY + ETSY_WORKSPACE + MODEL
npm start
```
启动日志会告诉你 BRAND/SHOP/PLATFORM/SOP 有没有读到(✓/✗)、用的哪个模型。

自检:浏览器开 `http://127.0.0.1:8787/health` 应返回 `{ok:true,...}`。

## 和扩展对上
扩展 `background.js` 的 `BRAIN_URL` 默认就是 `http://127.0.0.1:8787/draft` —— 脑跑起来 + 扩展点一下刷新 ↻,就从 stub 切真草稿了。

## 契约
`POST /draft` body `{"thread": "整条对话文本"}` → `{"draft": "回复正文"}`。
扩展不变、脑可换:以后 Hermes 若有可编程入口,把 `server.ts` 里 OpenRouter 那段换成调 Hermes 即可,契约不动。

## 注意
- 只听 `127.0.0.1`(本机),不对外。
- `.env` 不进仓库(`.gitignore` 已含)。
- 改了 BRAND/SHOP/SOP 要**重启**脑(启动时读一次)。
