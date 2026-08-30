---
status: accepted
---

# 封存小红书 adapter,专注 Etsy

(2026-07-24 产品决策,2026-08-30 补记入档)

小红书电商 adapter(`xiaohongshu-autopost`)的后端三件——服务器工具 `/api/tools/xiaohongshu/jobs` + `/confirm-publish`、插件 `xiaohongshu` capability、服务端热下发笔记 recipe——与发布契约均已就绪,但产品决定现阶段专注 Etsy,小红书不对用户开放:收到任何小红书相关请求,统一说明封存边界、引导回 Etsy、STOP;不组草稿、不建队列行、不出人工发布清单、不做对账。曾考虑 manual-only 软开放(只出人工清单让店主手发),否决:仍会分散运营注意力,且暗示能力可用。

解封不是一处开关,验收清单见 `social-publisher/references/adapter-registry.md` §小红书解封;封存协议的唯一真源在 `shared/platform-config.md` §封存协议(本 ADR 记录决策与理由,不承载协议正文)。
