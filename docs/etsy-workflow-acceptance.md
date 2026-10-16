# #134 运行验收记录

## 当前状态

最小工具链路已实机跑通，上传执行位已修复并在隔离入口验证。当前修订图仍因严格保真和上游原生规格限制未通过最终交付验收；两次生成式修订后停止，等待是否改用保留原件像素的确定性合成。其余完整流程项未验证，不写 Base、不发布 Etsy。下文按时间保留各阶段证据。

## 初始环境状态（历史）

代码与技能迁移可在本仓验证；本次开发环境没有可调用的 Hermes `image_generate` / `vision_analyze` 及已授权店铺运行会话。**真实生图、看图、飞书上传/预览、Base 同步及完整上架场景尚未验证，不能标为全流程完成。** 不用本机 Codex 图像工具代替 Hermes 验收，不因缺运行环境降低门槛。

## 实机验收入口

在可使用本项目技能的测试租户会话，使用有权使用的真实商品素材、已有研究回传和明确的任务范围。记录工具 schema/实际能力、输入素材身份、交付版本与检查结果，不保存凭据。以下每项只有取得真实证据后才勾选。

- [ ] 独立定义：缺品牌基座仍能交调研任务书；默认等待回传；完整研究包不重复调研；证据不足补研究，通过后交 HTML 与同版本源稿。
- [ ] 独立图片：Hermes 实际接收原始图片、全部关键参考和编辑目标；不支持时明确阻断，不默默转纯文字。方案、主图及批量授权按源流程执行。
- [ ] 四项图片检查：平台适配、原件与跨图保真、手机端表达/裁切、实际文件规格均检查；最终清理和复检后才交图库，包内文件与清单一致。
- [ ] 独立填写稿：使用已有最终图片而不重新生成；逐图查看后写 ALT，HTML 离线资源与复制内容可用。图片缺失或事实未全时仅按预稿规则交付。
- [ ] 完整流程：定义确认后接图片，最终图库验收及适用确认后接 builder；无需用户逐次点名，保留每个业务确认节点。
- [ ] 局部修改：仅修图/文案不扩大为重新定位；更换图片后同步受影响的缩略图、图序、ALT、变体及文案。
- [ ] 云空间交付：返回本租户真实成功链接和同版本图片预览；大文件不通过降低最终规格迁就上限，失败明确报告，不能把本机路径称为交付。
- [ ] 写入边界：文件生成不增加审批；不自动建库；视觉确认不授权素材入库；只同步已确认且授权字段；模拟或实际写入失败仍能交文件且不谎报成功。不写 Etsy。
- [ ] 升级后：旧技能不可被运行路由调用；社媒缺素材时等待成品或跳过，不调用 Etsy 图片技能；目录读取、现有发布和小红书封存保持原行为。

## 自动检查入口

沿用仓库 CI 的 frontmatter、Markdown 链接、Listing 读取、客服契约和 Python unittest；安装测试在临时本地 Git 远端上调用真实安装器验证新安装/升级与用户文件保护，npm 安装边界隔离。清理工具 CLI 测试验证外部安装命令使用固定版本，不证明图像清理效果。保留 trend-radar 的 Node 测试、类型检查及依赖审计，不保留已删除图片脚本的作业。

## 2026-10-14 本地验证结果

- Python 完整套件：111 项通过（包含真实安装器的新安装/升级与固定清理版本测试）。
- trend-radar Node 套件：28 项通过；TypeScript 类型检查通过。
- frontmatter：18 个技能通过；Markdown 相对链接：387 条通过；Listing 读取与客服契约检查通过；Shell 语法、diff 空白检查通过。
- 源文件指纹与本地引入来源逐文件比对通过。
- code-review 两轴独立评审：Standards 0 项发现；Spec 0 项发现。审查基点为迁移前提交 cfd494cd4d68dfa5ca4a1fff84b6c64c421f0005。
- **首次依赖审计未通过（已由下述后续修复解决）**：保留的 trend-radar 依赖存在 1 moderate、1 high、2 critical（npm 报告），涉及 Vitest/@vitest/mocker、tinypool、source-map-js。其 package/lock 与迁移前相同，属于既有依赖问题；未在本次技能替换中自动执行跨主版本升级。现有 CI 的 high 阈值会受此阻断，不能称 CI 全绿。
- 没有推送、部署或完成真实 Hermes/飞书验收；上述运行场景仍保持未勾选。


## 2026-10-14 依赖修复复验

- Vitest 3.2.7 → 4.1.11，旧 tinypool 依赖链移除；source-map-js 1.2.1 → 1.2.2。只更新依赖声明和锁文件，未改业务逻辑、测试断言或降低审计阈值。
- 已核对 [Vitest 4 官方迁移说明](https://v4.vitest.dev/guide/migration.html) 与包的 Node/Vite 兼容范围，保留现有 Vite 7。
- `npm ci` 从锁文件重装成功；`npm audit --audit-level=low` 返回 0 vulnerabilities。
- 在 Node 22.23.3（与 CI 同一主版本）运行 28 项 Node 测试及 TypeScript 类型检查，全部通过。
- 111 项 Python 测试、frontmatter、Markdown 链接、Listing 读取与客服契约检查通过。
- 依赖审计阻断已解除；未推送或运行远端 CI，真实 Hermes/飞书验收仍由有环境权限的执行者完成。

## 2026-10-14 隔离环境（未勾选实机项）

本地 `main` 为 `b2138c32402da205dc2bbab86407a33b4a57b505`，包含未推送的 `9d2b5a0d27d7a1eb780e1051ddedad281e078d23`。已把该工作树同步到生产机 `/var/lib/hermes-acceptance-134/etsy-skills`，并在 `/var/lib/hermes-acceptance-134/profile` 装好技能软链。该目录不在 `/var/lib/hermes/.hermes/profiles` 下，`etsy-skills-sync` 不会把它收成 `origin/main`。

未推送、未改任何正式 profile 的技能软链、未重启网关。核对时共享 clone 仍是 `de61a35`，四个正式网关仍为 active，profiles 下没有指向该隔离目录的软链。旧技能 `image-brief` / `image-synth` 不在隔离 profile 的技能目录里。三个新技能软链解析到上述工作树。`ecommerce-stack workspace` 解析到隔离工作区，工作区没有品牌基座。AI 清理命令在这台机器上是 `remove-ai-watermarks` 0.45.1。

飞书上传和 Base 使用店主自己的 `tenant_etsy_fublessings` 数据面（本机 `127.0.0.1:4173`），因为隔离 profile 没有自己的店铺云空间。技能文件没有装进该租户的正式网关。出图凭据用全局 `auth.json` 软链，不复制 token；复制会在刷新时把一次性 refresh token 拆成两份。

在该 `HERMES_HOME` 里加载 `codex-capped` 后，实机 schema 为：provider「ChatGPT 出图（不限）」，model `gpt-image-2-high`，modalities `text`+`image`，`image_url` 与最多 16 张 `reference_image_urls` 都在参数里，`is_available()` 为真。看图工具注册名是 `vision_analyze`（模型 `doubao-seed-2.1-turbo`，密钥走方舟 provider，与正式 profile 一样没有单独的 vision key）。这只证明工具已注册且出图凭据可读，没有调用生图、看图、上传或 Base。

上面清单仍全部未勾选。本次请求没有附上真实商品照片和调研回传；`~/Downloads/FuBlessings-listing-draft` 只有填写稿和 HTML，没有可当参考图的成品照片。在素材和确认到达前不开始定位、生图或目录写入，也不发布 Etsy。

## 2026-10-14 最小冒烟（冰箱贴主图）

**结论：工具链路冒烟通过，图片质量未通过最终交付验收。** 这张图不是可上架成品。

范围仍是一张成品图、一次明确改图。只覆盖生图、看图、清理、飞书交付。清单其余项继续标为未验证，不作为本次前置条件，也不在这次补测。

原图是店主提供的冰箱贴成品照，文件 SHA-256 `33a5596b2e5efe094fc796275f2912abbcbfd553ff11ef0344a22a099d0cca24`，170532 字节，JPEG，768×1024。改图要求：能看出是冰箱贴，并说明上面的中文可以定制。

- 生图：隔离 profile 的 `codex-capped` → `openai-codex`，模型 `gpt-image-2-high`。请求走 `images/edits`，`input_image_count=1`，送入字节 SHA-256 与原图相同。回执 `success=true`，`modality=image`，`imagegen_request_id=32b668bc-ea4d-45cf-ac19-b54b0f821e71`。请求写的是 quality `high`、size `1536x1024`；接口回执 `reported_quality=low`、`reported_size=1086x1448`。落盘文件实际 1086×1448 PNG，SHA-256 `8f06e3dd35f928a7a1dc693397f3701c9b9ac0c1feb53415f983ec2bf6d5e9f7`。短边低于图片技能的 2400 交付门槛。尺寸和质量与请求不符，是图片质量未通过的证据。
- 看图：`vision_analyze`（`doubao-seed-2.1-turbo`）对原图回答没有冰箱、中文是「富贵」、英文是 “For your new home”。对编辑图回答能看出贴在带把手的冰箱门上，读到 “Custom Chinese wording”、中文「富贵” 和 “For your new home”；并称红印挡住「贵」的右侧、画面有拼贴感，把 “Custom Chinese wording” 和卡片上的 “For your new home” 都记成额外标语。两次调用都是 `success=true`。额外文字和商品保真问题是图片质量未通过的证据。
- 清理：`remove-ai-watermarks` 0.45.1。`visible` 报告 `No known visible mark detected`，退出码 2，未生成文件，记为可见标记未检出。按技能把原编辑件复制为临时副本后做 `metadata --remove --keep-standard`。复查 `No AI metadata found`。清理前后像素逐点相同，尺寸仍是 1086×1448；文件 SHA-256 变为 `d73abd0e23210d5ed8c4e947f1b7b9a79db03deb1d7d69272ecfd24d7856299c`（元数据变化）。工具同时指出存在 OpenAI 隐形/元数据水印，并说明 SynthID 这类像素水印不在本次处理内。没有跑 `all` / `invisible`。
- 飞书：`upload_to_drive --folder 输出` 回执 `ok=true`，目录「素材库/输出」，文件名 `smoke-134-fridge-magnet-custom-wording.png`，2018358 字节，与清理后文件大小一致。链接 `https://my.feishu.cn/file/Q51wbQy2uoEQT3xz4A1cpFm1nyd`。这次没有通过飞书聊天再发一张图片预览。上传成功只证明文件进了云盘，不把该图升为可上架成品。
- 上传脚本执行位：Git 索引是 `100644`，本地工作树是 `-rw-r--r-- scripts/drive_upload_tool.py`。隔离树用 `rsync -az --delete`（排除 `node_modules`、`__pycache__`、`.DS_Store`）从本机 `/Users/johnz/code/etsy-skills/` 同步到 `/var/lib/hermes-acceptance-134/etsy-skills/`，`-a` 保住了不可执行权限。随后没有跑 `install.sh`（它会 `fetch` 并切到 `origin/main`，冲掉未推送的 `9d2b5a0`），只在 `/var/lib/hermes-acceptance-134/profile/bin/upload_to_drive` 手工软链到 `/var/lib/hermes-acceptance-134/etsy-skills/scripts/drive_upload_tool.py`。直接执行该软链退出码 126、`Permission denied`。`install.sh` 第 155–156 行本来会 `chmod +x` 这个脚本再做软链；正式分发器 `tools/ops/etsy-skills-sync.sh` 的 `ensure_agent_wrappers` 在补 `/var/lib/hermes/.local/bin/upload_to_drive` 时也会 `chmod +x` 目标脚本。这次两条都没走到。冒烟时只对隔离树上的 `scripts/drive_upload_tool.py` 执行了 `chmod 755`，当前为 `-rwxr-xr-x`；该权限不在 Git 里。正式共享 clone `/var/lib/hermes/.local/share/etsy-skills/scripts/drive_upload_tool.py` 在 22:40 已是可执行，与这次隔离 rsync 不是同一条路径。
- 未验证：Base 写入、素材入库、Etsy 发布、调研、产品定义、填写稿、四项图片验收里的手机裁切。本次不补这些项。


## 后续修复与证据更正

保留上面的原始回执，补充判断更正：`Custom Chinese wording` 是店主明确授权的新增说明，不能记为擅加文字；`For your new home` 在原始照片的贺卡上就存在，也不能记为模型凭空生成。红印与下方书法的重叠在原件中已经存在，需对照原件判断变化，不应为消除看图告警而重绘商品。原记录中的保真/额外文字结论不直接作为最终判据。

上传执行位已经复现：未执行安装器时直接调用软链会 Permission denied。源码改为可执行，并增加真实软链 `--help` 回归测试（修复前失败、修复后通过）；仅同步该脚本到隔离目录后，隔离软链也可直接执行，无需手动 chmod。正式 profile 未改。

Hermes provider 当前将非法画幅值回退为 landscape；只接受 landscape/square/portrait。接入协议新增枚举映射与回执核对规则，禁止拿请求参数当实际规格。原生 Codex 图片后端可忽略请求 quality/size，provider 源码已有明确说明；本次不修改共享 Hermes 安装或谎报上游已修复。正确 portrait 请求仍得到 low / 1086×1448，说明该能力限制仍存在。


### 两次修订与处理边界

两次修订都使用原始商品照片作为实际 image_url，未以生成版替代身份来源。第二次使用合法 portrait 枚举，请求 1024×1536/high，回执 low/1086×1448，request id `9f3809f5-daff-42d1-85c3-1cf6eeafce2b`。第一版修订回执 medium/1086×1448，也未兑现 high。未更换供应商、未改正式 profile 或共享 provider。

Hermes vision_analyze 对原件/第二次修订的并排图复检：冰箱吸附关系自然、拼贴感改善、仅有授权文字，但书法笔画、红印和织锦花纹存在重绘差异。不能证明严格保真，因此仍是 **DRAFT_NOT_FOR_LISTING**。查看了完整预览及 300px 方形裁切，主体和授权说明可见；这不抵消保真失败。按连续失败停止规则，不再生成重试，不把放大后的草稿当成合格成品。

该草稿完成清理：可见标记未检出，元数据复查未检出，清理前后像素逐点相同。输出 SHA-256 `b1cfa2fbae1ccf95b05b65fa4ae75ccc07c96631ff3eda6450dedd19aedbf93f`，1086×1448。没有处理或验证隐形水印。

新增软链入口回归测试后 Python 全套 112 项通过，frontmatter、相对链接、Listing 读取与客服契约通过。保留初始冒烟证据；上游原生高质量/精确尺寸及严格商品保真仍未通过，不能标记本次所有问题解决。已向店主提出切换为保留原商品像素的确定性抠图合成，等待制作方式确认；不扩大到完整九项验收。

修订草稿上传回执 `ok=true`，目录「素材库/输出」，文件名 `DRAFT-not-for-listing-fridge-magnet-v3.png`，2261323 字节；[飞书草稿下载](https://my.feishu.cn/file/DVeVb7nKMogyZdxBsXacFQ11nHd)。没有写 Base、没有登记正式素材、没有发布 Etsy。当前聊天可提供独立预览；未向未指定的飞书会话发送消息。

本轮代码评审：Standards 0 项，Spec 0 项可修代码发现。未将上游限制与草稿质量记为已解决。

## 2026-10-16 发布整合验证

三个本地提交在发布分支 rebase 到远端 `de61a35`，保留 #133 客服卡授权修复，并将 #132 的完整清理、复检、哈希复用与失败阻断协议接到 `etsy-listing-images`；不恢复旧图片技能或 JPEG 降级。

- 112 项 Python 测试、28 项 Node 测试、TypeScript 类型检查通过；387 条相对链接、18 个技能 frontmatter 与 Listing/客服契约通过；依赖审计 0 漏洞。
- 生产机独立目录 `/var/lib/hermes-acceptance-release-20261016` 使用实际 Hermes v2026.9.24 的 `scan_skill_commands` 和 `skill_view(preprocess=False)`：三个新技能均可索引、读取，两个旧图片技能不可读取。此验证未向客户发送消息，未写经营数据。
- 本次发布验收目标为三个技能的可发现、可加载、安装升级与正式分发。10 月 14 日的图片质量限制和未验证的完整业务流程保持原记录，不据此声称生成图片均可上架。
