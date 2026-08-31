# 退役基础设施（retired-infra）

已退役基础设施的**唯一真源**（#120）：每条退役物的永久边界只在此处定义。各 skill 的执行点收敛为一句级守卫 + 指向本文件；**安全关键闸（如 P0 退役闸）保留完整守卫原文 + 指向**，只把历史背景收敛到此处。**退役 ≠ 删除**——文档与历史保留，但永不恢复使用。

**不在本文件范围**（各有其主，勿混入）：仍在兼容期的旧环境变量 / 旧命令（`ETSY_*` / `etsy-stack`，README §自定义安装路径）；存量工作区的 `COMMERCE_PLATFORM.md`（`shared/platform-config.md` §存量工作区的 COMMERCE_PLATFORM.md）；封存（shelved）能力（`shared/platform-config.md` §封存协议——封存是「建成不开放」，退役是「不再使用」）；`image-synth` 的 `retired/` 目录（数据回滚文件夹，非基础设施）。

## 1. 旧 Hermes 自动发布 job `d99651079542`（P0 永久退役闸）

- **是什么**：Mac mini Hermes 上的旧 job `ETSY Social Publisher / Publishing Queue 到期自动发布`（同批其余旧发布 cron 在切换 ECS 时已一并有意暂停）。
- **为什么退役**：自动发布的巡检 / 锁 / 重试 / 死信已上收 ECS 常驻 dispatch；旧 job 与 dispatch 并行会造成**重复发布**。
- **永久边界**：保持 paused 或 removed；**永不 resume、run、重建或修复它的本地路径**；发现它已启用或报错 → 只停用并如实回报，不执行旧发布脚本；用户要自动发布只走 ECS dispatch。
- **判据 / 反误读**：Mac mini 上旧发布 cron 的 `paused` 状态与自动发布是否工作**完全无关**——别拿它当「发布停了 / 在等恢复」的证据；发没发只看店铺总 Base `社媒发布队列` 行。

## 2. 旧本地 Pinterest Playwright 工具

- **是什么**：早期在 Hermes / Mac mini 本地跑 Playwright + Chrome profile 的 Pinterest 发布工具。
- **为什么退役**：发布执行归三层架构的租户浏览器插件（Hermes 大脑 / ECS 控制面 / 插件），登录态不属于 Hermes。
- **永久边界**：Hermes 不跑本地 Playwright / Chrome profile、不读浏览器登录态、不存 cookie / token / 密码；Pinterest 发布只走 `pinterest-autopin` → 服务器工具 → 插件。
- **判据**：`PINTEREST_AUTOPIN_HOME` / `PINTEREST_AUTOPIN_REPO` 只服务旧工具迁移排查，新 Pinterest 发布链路**不读取**（见 README §自定义安装路径）。

## 3. 已退役 `etsy-dm` 端点（旧会话查询 / 回复草稿 / 订单消息发送）

- **是什么**：Etsy 客户消息的旧后端路径：会话查询、回复草稿、按订单发消息。
- **为什么退役**：客户消息已上收 ECS 控制面正式工具，服务端负责鉴权、客户绑定、持久化、幂等与结果状态。
- **永久边界**：**不得调用、不得降级回旧工具**；不再回填草稿、不降级执行。
- **正式路径**：`etsy_customer_messages_get` / `etsy_customer_messages_publish`（经 `/api/hermes/etsy/tools/customer-messages/*`，契约见 `shared/etsy-agent-tools.md` 与 `orders-customers/references/etsy-message-tools.md`）。

---

## 新增退役物的流程

能力上收 / 替换后，先在本文件加条目（是什么 / 为什么 / 永久边界 / 判据），再把各执行点的旧表述收敛为一句守卫 + 指向本文件；迁移期「双跑验证、旧路径只读、人工验收后切换」的原则见 `shared/tools-architecture.md` 末节。
