# Etsy Listing 读取工具 Skill 契约更新计划

## 业务目标

让 `etsy-skills` 正确认识已经上线的两个 Etsy Listing 只读工具，使 Agent 在读取、分析和优化现有 Listing 时使用线上真实数据，不再把 Base 当作线上 Listing 的事实来源，也不误用绑定店主账号的浏览器插件批量抓取公开 URL。

## 范围

- 为两个只读工具建立一份跨 skill 复用的共享契约。
- 更新 `listing-catalog` 的触发条件与现有 Listing 工作流。
- 更新工具架构、README 和变更记录，使安装后的 Agent 能选择正确入口。
- 发布一个新的 `etsy-skills` patch 版本，并验证安装/升级入口可获取该版本。

## 非目标

- 不修改 `yanggedianzhang` 中已经上线的工具实现、接口或历史 Base 比对代码。
- 不恢复自动巡检，不新增 cron、定时扫描或后台自动流量。
- 不实现 Etsy Listing 写入、批量修改或跨平台发布工具。
- 不把读取结果自动写入 Base；任何 Base 写入仍遵守既有预览、确认和写穿规则。
- 不新增顶层 skill；读取能力是共享工具契约，由现有业务 skill 消费。

## 实现边界与步骤

1. 新增 `shared/etsy-listing-read.md`，记录入口选择、输入模式、限制、版本化输出、错误/完整度解释、安全与风控边界。
2. 更新 `listing-catalog/SKILL.md`：
   - 加入读取、分析和优化现有 Etsy Listing 的触发语义；
   - 自有后台 Listing 使用 admin read；公开 URL、竞品或公开批量使用 public read；
   - 线上真实数据与 Base 商品目录职责分离；
   - 只读工具不得被描述为已经修改 Etsy。
3. 更新 `shared/tools-architecture.md` 的落地现状，登记两个工具的真实执行拓扑。
4. 更新 README 和 CHANGELOG；按仓库既有 tag 发布流程发布 patch 版本。
5. 保持 `shared/backend-api-access.md` 为通用鉴权唯一来源，新契约只引用，不复制令牌实现。

## 测试策略

- 使用仓库脚本或等价静态检查验证所有 Markdown 相对链接无悬空。
- 检查 `etsy-stack.json`、安装脚本和版本文档仍一致。
- 用全文检索验证：
  - public read 明确禁止浏览器插件批量抓取；
  - admin read 仅用于店主明确授权的后台读取；
  - `tenantId` 来自注入环境变量，不允许店铺名替代；
  - 巡检继续暂停；
  - Base 不再作为线上 Listing 事实来源。
- 运行仓库现有测试/doctor/check 命令中与文档和安装包有关的门禁。

## 验收标准

- 对“读取公开 Listing URL”请求，skill 明确路由到 public read，不依赖 Base 或店主插件。
- 对“读取自己的 Etsy 后台 Listing”请求，skill 明确路由到 admin read，并执行登录/Challenge/429 风控停止。
- 对“优化现有 Listing”请求，Agent 先读取真实线上数据，再生成建议；无法读取时明确失败，不用 Base 或用户口述伪装线上事实。
- 文档完整描述 single、batch、shop、数量限制和 `etsy-listing-read/v1` 结果语义。
- 不出现自动巡检、自动写 Etsy、自动写 Base 或伪造空值的新增承诺。
- 新版本可通过仓库既有安装/升级入口发现，发布 tag 与 README 安装版本一致。

## 发布与回滚

- 从最新 `origin/main` 的隔离 `codex/` 分支实施，经 PR 合并。
- 按仓库现有 Git tag/Release 流程发布 patch 版本，不臆造新的部署系统。
- 发布后用远端 tag、README 安装链接和 `check-update`/版本命令做 canary。
- 回滚方式是撤销该文档提交或把安装 tag 回退到上一稳定版本；不涉及生产数据迁移或工具开关。
