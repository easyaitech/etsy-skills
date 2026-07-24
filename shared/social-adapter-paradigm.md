# 社媒发布 Adapter 共享范式

`pinterest-autopin`（已上线）与 `xiaohongshu-autopost`（staged）是同一套范式的兄弟 adapter：把电商店铺的「商品 + 素材 + 品牌」组装成平台发布物，并作为 `social-publisher` 的平台输出适配器。本文收敛两者（以及未来新平台 adapter）共用的**平台无关骨架**——三层架构、队列表模型、模式分类、job 生命周期、架构边界。

**平台差异（专属字段、素材规格、端点契约、capability、文案语言、staged 红线、dispatch 细节）留在各 adapter 自己的 `SKILL.md` / `references/publishing-flow.md` 里，本文不覆盖它们**；本文只做结构去重，不改变任何 adapter 的触发路由、模式语义、红线和守卫，与各 adapter 文档的平台专属描述冲突时以各 adapter 文档为准。

---

## 三层架构（谁负责什么）

发布动作不由 Hermes 本机的 Playwright / Chrome profile 完成，而是分三层：

1. **Hermes（大脑）**：读商品、素材变体、品牌规则，按平台语言生成文案；模式 B 只写 `社媒发布队列` 草稿，模式 C/D 才把已确定内容交给服务器执行。
2. **yanggedianzhang 服务器（控制面）**：校验租户、保存平台 job 状态、加锁、发放素材下载地址、记录 test / final 结果（平台需要时还热下发填表 recipe）。
3. **租户浏览器插件（执行面）**：在租户自己的浏览器登录态里打开平台发布页、填表、上传服务器给的素材，并把结果回传服务器。插件版本必须带该平台的 capability；安装 / 升级提示由服务器返回，Hermes 只把 `userMessage` 原样转述给用户。

底层执行模型见 [`tools-architecture.md`](tools-architecture.md)（tier 2 范式：服务器控制面 + 浏览器插件，Hermes 不持 Chrome / token / 队列）。**服务器端点的具体契约（URL、鉴权方式、请求体）完全归各 adapter 自己的 `references/publishing-flow.md`**，本文不作统一断言。

---

## 队列表模型（`社媒发布队列`）

- 跨平台 `社媒发布队列` 的 **source of truth 在 `publish-composer`**（表 owner）；每个 adapter 只负责 `平台 = <本平台>` 行的语义准备、服务器 job 创建和结果回写，与 composer 同一张表，不另建子队列表。
- **一条 Base 记录 = 一个平台一次发布**（per-platform 语义）；发布成功后这一行只回写一个 `发布 URL`；失败重发 = 同条 attempt++，不新建。
- 发布图只引用 `Asset Variants 派生素材` 的平台规格变体（`assets-library` 模式 E 派生，含 AI metadata 清理）；adapter **不自己裁切 / 清理图片**，缺变体反向请求 assets-library 模式 E。未授权的 UGC 绝不进入排队流程。
- 商品型发布的 `链接` 必须来自 `Products 商品` 表的 `分享链接`，不临时拼平台 URL。
- 平台专属字段只在真实发布器已读取时写；不默认扩 typed extension / 自由 JSON。

---

## 模式分类（B 内容合同 / C 手动发布 / D 自动发布）

- **模式 B（组草稿）= 内容合同，不是后端发布功能**：Hermes 一次性生成内容字段并与用户沟通确认；后端把这些字段当作已确认输入，只校验、传递和记录；缺字段时 fail-closed，不生成、不改写、不补全文案。每次只组一条，不批量。
- **模式 C（手动发某条）**：Hermes 亲自调服务器端点建 test job → 用户目视确认 → confirm-publish 转 final。逐条人工把关，适合首发 / 拿不准的内容。
- **模式 D（无人值守自动发布）**：Hermes **不亲自调发布端点**，只把已审核的行标成 `自动发布=true` + `状态=已批准` + `计划发布时间`，交给 ECS 常驻 dispatch 自动建 publish job、插件真发、结果回写。dispatch 到点直发、无逐条人工确认闸——人工把关点前移到「标记」那一下，标记 = 授权无人值守发到真实平台。dispatch 的合格条件 / 建表校验 / 撤回规则归有模式 D 的 adapter（当前只有 Pinterest）与 `social-publisher`。
- adapter 未必开放全部模式：`staged` 的 adapter（注册表见 [`../social-publisher/references/adapter-registry.md`](../social-publisher/references/adapter-registry.md)）只组草稿 + 人工发布清单，**不创建真实 server publish job**；产品侧放行改 `enabled` 后才解锁真发。

---

## Job 生命周期（test → confirm-publish → final）

> 下图与本节出现的端点形状均为**范式示意**；真实 URL、鉴权与请求体一律以各 adapter 的 publishing-flow 契约为准。

```text
`社媒发布队列` 草稿（平台 = <本平台>）
   │
   ├─[0] 校验业务字段与素材授权（素材必须已能由服务器提供给插件下载）
   ├─[1] Hermes 调服务器 POST /api/tools/<platform>/jobs 创建 test job
   ├─[2] 浏览器插件领取 test job、下载素材、在平台发布页填表（不点发布）、回传结果
   ├─[3] 用户目视确认 test 页面；不 OK → 改 Base / 改素材 / 重建 test job
   ├─[4] 用户在对话里说"发吧 / publish / final"
   ├─[5] Hermes 调服务器 POST /api/tools/<platform>/jobs/confirm-publish
   │       将 test_succeeded job 转成 publish job
   └─[6] 插件领取 publish job 并回传 resultUrl → 按 §结果回写 落回队列表
```

各平台端点的请求体字段、成功响应形态等契约在该 adapter 的 `references/publishing-flow.md`，本文不重复。

- **test job 的安全边界**：填表和预览，不代表已经发布；用户必须目视确认平台页面。
- 创建 test job 成功后，把 `jobId` 写入 `社媒发布队列` 的 `外部队列 ID`（或表里已有的 `ECS job ID`），状态改成 `发布中`（test 阶段）、备注 `待测试确认`——`测试中` / `待测试确认` 不是独立状态值，状态留在枚举内的 `发布中`。
- **final 前置**：用户在对话里明确说"发 / publish / 真发 / final"；test 没过的不进 final。返回 `JOB_NOT_TESTED` 说明 test 没成功或还没回传结果，不要绕过。

### 创建 Job 的公共错误处理

| HTTP / error | 含义 | Hermes 怎么处理 |
|---|---|---|
| `401 UNAUTHORIZED` | Hermes 工具密钥错误或缺失 | 停止，提示管理员修服务器配置 |
| `404 TENANT_BINDING_NOT_FOUND` | 租户没有 server binding | 停止，提示管理员先绑定租户 |
| `409 BROWSER_TOOL_INSTALL_REQUIRED` | 服务器还没看到该租户插件上线 | 把响应里的 `userMessage` 原样转述给用户，不编 token |
| `426 BROWSER_TOOL_UPGRADE_REQUIRED` | 插件版本低或缺该平台 capability | 把响应里的 `userMessage` 原样转述给用户 |
| `503 HERMES_TOOL_DISABLED` | 服务器未启用 Hermes tool | 停止，提示管理员配置服务端 |

安装 / 升级类错误不算发布失败；队列表保持发布前状态（具体状态名与降级出口见各平台 publishing-flow）。

### Test 结果处理

| 状态 | 含义 | Hermes 怎么处理 |
|---|---|---|
| `test_succeeded` | 插件已完成 test 填表 | 让用户确认页面是否正确 |
| `test_failed` | 插件未能完成 test | 读取失败 note → 按该平台 publishing-flow 的失败列合同回写，修正后重建 test job |
| `claimed_for_test` 长时间不变 | 插件领取后掉线或浏览器关闭 | 等 lease 过期后可重新领取；不要创建重复 job |

用户说内容 / 素材 / 链接不对时，回到 Base 修改源字段（必要时回 assets-library 模式 E 改变体），再重新创建 test job。

### 结果回写（[6]）

发布结果由 adapter（执行状态列 owner）回写 `社媒发布队列`：成功 = 状态推进到「已发」+ 回写公开 `发布 URL`（拿不到公开 URL 不能标已发）；失败 = 状态推进到「失败」+ 按各平台 publishing-flow 的失败列合同回写。**具体列名、失败分类枚举、尝试计数 / 清空规则等合同细节完全归各平台的 publishing-flow.md**，本文不作统一断言。

平台结果列（如 `平台 post id`）与事件日志追加规则按各 adapter 自己的 publishing-flow 合同执行（`状态` 状态机见 [`../publish-composer/references/base-schema.md`](../publish-composer/references/base-schema.md) § 表 2）。幂等：插件迟到上报不得造成重复发布（同 `jobId` 只回写一次）。回写前按通用协议列出改动让用户确认，回执遵守 [`store-base-architecture.md`](store-base-architecture.md) §Base 写穿不变量。

---

## 架构边界（Hermes 不持有什么）

- Hermes 不直接读浏览器登录态，不直接点击平台页面，不保存 cookie / token / 密码，不把本地绝对图片路径传给浏览器。
- 素材必须先变成服务器能授权下载的 asset，插件再从服务器拉取 Blob/File 上传。
- Hermes 不持 Chrome profile、不跑 Playwright、不持队列、不自己跑巡检定时器——自动发布的巡检 / 锁 / 重试循环归 ECS 常驻 dispatch。
- `browserToolToken` 由管理员发放给插件选项页；Hermes 不编造、不回显、不持久化 token，也不把它写进 Base 或对话。
- 服务器端点的鉴权按各 adapter 的 publishing-flow 契约执行；skill 侧纪律统一：不编造、不回显、不持久化任何密钥 / token，也不把它写进 Base 或对话。

---

## 新平台 adapter 写作清单（接新平台的最小差异集）

新平台 adapter 复用本文骨架，只需给出以下平台差异（服务侧接入契约——认证边界 / 输入映射 / 校验 / 回写等 7 项——另见 [`../social-publisher/references/adapter-registry.md`](../social-publisher/references/adapter-registry.md) § Adapter 接入契约）：

1. **平台字段**：`社媒发布队列` 里该平台真实读取的专属列（如 Pinterest 的 `Board (Pinterest)` / `Alt Text (EN)`；小红书 staged 期间专属字段先进人工发布清单）+ typed extension（`XxxExt`）的启用条件。
2. **素材规格**：该平台的变体比例与规格（如 Pinterest 2:3、小红书 3:4 封面 / 商品图），由 assets-library 模式 E 派生；adapter 只引用变体文件链接。
3. **端点对**：`POST /api/tools/<platform>/jobs` + `POST /api/tools/<platform>/jobs/confirm-publish`，请求体字段契约写在该 adapter 的 `references/publishing-flow.md`。
4. **capability 名**：浏览器插件需具备的 capability（如 `pinterest` / `xiaohongshu`），服务器据此返回 409 / 426 安装升级提示。
5. **staged → enabled 放行流程**：先在 adapter-registry 注册为 `staged`（只组草稿 + 人工发布清单，不建真实 server job）；产品侧明确批准对外开放后把该行改 `enabled`，模式 C 才解锁真发。
6. **文案语言与平台红线**：平台默认输出语言（如 Pinterest 英文 / 小红书中文）与平台专属红线守卫，写在该 adapter 的 SKILL.md。
