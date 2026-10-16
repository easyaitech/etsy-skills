---
name: listing-catalog
description: "维护商品/SKU 目录、读取与分析现有 Etsy Listing；上架文案使用 etsy-listing-builder，实物库存使用 inventory。"
layer: foundation
---

# 商品目录 (Listing Catalog)

这个 skill 维护店铺总 Base 内商品 / SKU 目录，负责读取与分析现有 Etsy Listing。文案生成和修改统一委托 etsy-listing-builder；本 skill 负责授权字段的目录写入，不另写一套文案。

**对外的实操接口**：店铺总 Base 内的 `Products 商品` 表（通常用 `lark-base` skill 操作；在养个店长 Hermes 飞书直聊里，优先用后端只读工具 `POST /api/hermes/bitable/record-search` 查询；架构见 `../shared/store-base-architecture.md`）+ 工作区根目录的 BRAND.md / SHOP.md（用 `shop-foundation` skill 维护）。

> 共享引导（版本检查 / 工作区解析 / 客户偏好 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。
>
> Etsy 线上 Listing 的读取路由、限制、版本化结果与只读边界见
> [`shared/etsy-listing-read.md`](../shared/etsy-listing-read.md)。**线上事实来自该工具结果；
> Base 是内部目录 / 草稿 / 历史，不是当前 Etsy 页面的替代来源。**

---

## 资料与职责

品牌与店铺资料存在时读取；缺失不阻塞产品定义、图片和填写稿工作，不强制先建基座。商品目录读取需真实工具返回，线上事实按 Listing 只读契约获取；不能拿 Base 或用户口述冒充当前线上数据。店铺政策、商品事实与策略建议分别标明来源。

新品完整上架由 [etsy-product-definition](../etsy-product-definition/SKILL.md) → [etsy-listing-images](../etsy-listing-images/SKILL.md) → [etsy-listing-builder](../etsy-listing-builder/SKILL.md) 按范围推进；仅写稿或局部修改直接进入 builder。项目接入与缺资料规则见 [专业流程接入协议](../shared/etsy-professional-workflow.md)。

---

## 四种执行模式

### 模式 A：建表（首次建立商品 / SKU 表）

**进入条件**：
- 用户明确说要建商品库 / 商品目录 / listing 表 / SKU 表
- 店铺总 Base 尚未配置 `products`（`Products 商品`，商品 + SKU 合并）表
- 或已有表但 schema 不齐，要补字段

**执行步骤**：
1. 读 `../shared/store-base-architecture.md` 和 `references/base-schema.md`，了解 one-shop-one-base 与推荐字段集
2. 解析工作区根并读取 `<workspace>/docs/store-base.md`：
   - 若店铺总 Base 已存在：在其中创建或补齐 `Products 商品` 表
   - 若店铺总 Base 不存在：先向用户展示店铺总 Base 方案和表清单，等确认后再创建 `{店铺名}-运营中枢`
   - 迁移期若发现旧独立商品数据源，可作为 legacy fallback 查询，但新写入优先进入店铺总 Base
3. 按 schema 逐字段配置（核心字段必建；辅助字段视用户需要；小红书字段分组已封存，仅未来解封后按 `references/platforms/xiaohongshu.md` 加建），并按下方“默认视图字段”设置默认 Grid View
4. `Products 商品` 表必须保留原 SKU 字段作为业务主键；如需要内部稳定 ID，新增 `内部 ID` 字段，不要因迁移重命名 SKU
5. 落盘后告诉用户 Base 链接 + 表清单 + 字段清单 + 默认视图设置 + 可选的下一步（"导入第一条 SKU 试试")

> **不要硬塞无关字段**——通用核心字段必建；小红书字段分组仅在未来小红书解封启用时必建（当前封存，见 [`shared/platform-config.md`](../shared/platform-config.md)），辅助字段按需补。

### `Products 商品` 默认视图字段

建表、补字段或整理字段时，默认 Grid View 展示运营日常看商品状态、链接、价格、库存会用到的字段。平台原始字段、成本利润和同步字段默认隐藏，按场景另开视图。**`描述` 是店主日常要看的常用字段，一律进默认视图、不要隐藏**（2026-08-25 店主明确要求；它长不是隐藏的理由，飞书表格自己会截断显示）。其余长文案（`图片说明 / Alt`、`视频说明 / Alt`）仍走 Listing 文案视图。

- 已有表若使用 `Title (EN)`、`Description (EN)`、`Tags`、`Materials`、`售价 (HKD)`、`成本 (USD)` 等本地别名，按对应规范字段处理；整理视图不为了统一命名而重命名字段。
- 默认人读视图：`SKU`、`状态`、`销售平台`、`品类`、`标题`、`描述`、`分享链接`、`售价`、`库存`、`上线日`、`平台商品 ID`、`关键词 / Tags`、`照片链接`、`备注`。
- Listing 文案视图：`SKU`、`销售平台`、`状态`、`标题`、`描述`、`关键词 / Tags`、`分享链接`、`照片链接`、`视频链接`、`图片说明 / Alt`、`视频说明 / Alt`。
- **商品表不再有材质列**（老板 2026-08-27 拍板整体退场）：`材质 / 属性` / `Materials` 列已删除，不要重建、不要往任何列里写材质清单；材质只存在于 Etsy 后台本身。每日核对/平台回写也都不再碰材质。
- 默认隐藏但保留：`平台字段 JSON`、`成本`、`利润率`、`制作周期(天)`、`变体`、`SEO 关键词`、小红书 SPU / SPL / SPV / ITEM ID、审核状态、同步 JSON、海关 / 税务 / 原始响应字段，以及任何外部同步 ID。财务、平台同步、排障时再进专用视图。

### 模式 B：上架文案交接与授权目录同步

用户要写新商品页、重写标题/描述或调整 tags 时，交 [etsy-listing-builder](../etsy-listing-builder/SKILL.md)。已有线上 Listing 的修改先按模式 D 取事实基线；live read 失败不能声称已核对线上，可以按用户提供资料继续明确标识的草稿。

1. 传递已读取的商品资料、店铺政策、用户需求及确认范围，沿用上游定义和最终图库版本。不预先强制建 Base 行，不执行旧礼物倾向必填、固定标题公式或先写文案再出图的流程。
2. builder 按其专业流程交付填写稿；实际查看最终图片后才能生成最终 ALT。图片未完成时按其预稿规则处理。
3. 对用户已确认且明确授权写入的字段，列明目标商品与字段值后用实际可用 Base 写工具更新。已有明确授权不重复审批；文案确认不自动授权价格、库存等其他经营字段。
4. 未确认草稿、试售价建议、未知值不写成正式事实。配置或工具不可用时说明未同步，仍交付已完成文件，不反复要求用户上传已有资料。
5. 只有实际写成功才说“已写入”，附可点击的飞书 Base 链接，不暴露内部 ID。内部目录同步不代表 Etsy 发布；不自动上架。

### 可选业务知识

保留 [知识检索](references/business-knowledge-lookup.md) 的来源与使用边界；可把与当前问题相关的证据交给 builder。知识卡片是参考，不覆盖已确认定位或新技能的流程，缺失不阻塞交付。

### 模式 C：查询 / 更新现有商品

**进入条件**：
- 用户要看 / 改某 SKU 的字段（价格、状态、变体、SEO 关键词等）
- 或要批量查询（"哪些是上新预备"、"哪些还没写描述"）

**不进入本模式的一类问题**：问**实物库存**（"麻布袋还剩几个"、"这个成品还有货吗"、"记一下入库"、
"该补什么货"）一律转 `inventory` skill。本表的「库存」列是 Etsy 平台在售挂牌数量（由 listing 读取
自动回写），不是仓库里有几个；拿它回答"还剩多少"是答错了对象。

**执行步骤**：
1. **先判断当前运行环境是否有 Base 工具**：
   - 在完整 Codex / Lark 环境中：直接调用 `lark-base` skill 操作。本 skill 不重复实现 Base CRUD。
   - 在养个店长 Hermes 飞书直聊中：如果已注入后端只读 Base 工具，查询单个 SKU 时先调用 `POST /api/hermes/bitable/record-search`；店铺上下文 / `tenantId` 由当前 Hermes profile 或后端工具注入，不向用户索要、不自行编造。模型侧查询条件至少包含 `logicalTable=products`、`fieldName=SKU`、`value=<SKU>`；只有工具 schema 明确要求时才传 `tenantId`。`attachments[].assetUrl` 是可用的短期签名图片链接，可直接作为图片输入，不要让用户重复上传。
2. 如果 Base 工具返回未配置、无权限、表不存在、字段不存在或当前运行环境没有任何可调用 Base 工具：如实说明这一条真实卡点和下一步（让管理员接入/补配置，或请用户点机器人菜单打开资料表/发截图），**不要连续多轮换句式重复“我无法确认是否读到表”**。
3. 只有读到真实 Base 记录后，才可把字段标为目录事实。未配置时 builder 可以按用户资料继续并注明来源；不要用用户口述的 SKU 名称假装已查表。

本模式回答的是 **Base 内部目录**。用户问当前 Etsy 页面、公开 URL 或后台编辑器字段时，
转模式 D；不要把 Base 值包装成线上事实。

本 skill 只在以下场景介入：
- 字段语义不清时引用 `references/base-schema.md`
- 需要按品牌一致性校验改动（如改标题/描述）时，按"模式 B"流程跑

### 模式 D：读取 / 分析现有 Etsy Listing（只读）

**进入条件**：
- 用户给出 Etsy Listing / Shop URL，要求读取、抓取、分析或看竞品
- 用户明确要求查看自己 Etsy 后台 Listing 配置
- 模式 B 正在改 / 优化现有 Etsy Listing，需要当前线上事实基线

**执行步骤**：
1. 完整读取 [`../shared/etsy-listing-read.md`](../shared/etsy-listing-read.md)。
2. 统一调用 `etsy_listings_get`，用 `fields=public|seller_admin` 选择来源：
   - 公开 URL、竞品、公开批量 / Shop → `fields=public`
   - 店主明确要求自己的后台配置 → `fields=seller_admin`
3. Agent 输入不带 `tenantId` 或 token；运行时自动注入，不向用户索要、不用店铺名代替。
4. 只解释最终 `etsy-agent-tool/v1` 信封中的 Listing 数据；pending / requestId 不对用户展示。
5. 返回来源、关键真实字段、requested/result/truncated 和完整度限制。`unknown/raw`、
   `unavailable`、`excluded`、`errors` 不得静默遗漏或补成空值。
6. 用户只要读取 / 分析时到此结束，不写 Base。用户要优化时回模式 B，把 live data 当
   线上事实、Base 当内部目录上下文。

**硬边界**：
- public 批量禁止使用店主浏览器插件；admin 仅在店主明确要求时调用
- admin 遇登录失效、Challenge、429、额度或插件错误立即停止
- 两个工具都只读：不写 Etsy、不写 Base；不得宣称“已修改 / 已同步 / 已发布”
- Listing 自动巡检保持暂停，不新增 cron、Alarm 或自动抓取

---

## 写入前的硬性约束

通用约束见 [`shared/preamble.md`](../shared/preamble.md) §写入前的通用约束，**Base 写穿不变量**见 [`../shared/store-base-architecture.md`](../shared/store-base-architecture.md)（获准的 Base 更新只有实际写成功才算已同步；填写稿交付独立报告，写完带回执）。本 skill 特有禁区：

- **不替用户上架或发买家消息**：交接文案 + 维护 Base；真实发布遵守内置 Etsy preset 的自动化边界（见 [`shared/platform-config.md`](../shared/platform-config.md)），默认由用户在平台后台手动复制
- **新增 SKU 不要自动估价**：成本 / 售价让用户确认；可基于 Base 历史给"参考区间"，但不替用户拍板
- **改 Base 用 lark-base 的 diff 风格预览** → 等确认 → 落盘 → 回执；不要只在对话里报改动而不写 Base

---

## 与 shop-foundation 的回流关系

写 listing 过程中如果用户**纠正**了文案，且纠正反映品牌偏好（"这文案太冷了"），不要自己改——按 shop-foundation 的沉淀流程（`../shop-foundation/references/distillation-brand.md`）提示用户：

> 「这次的纠正背后好像是一条文案语调原则。你想沉淀进 BRAND.md 吗？沉淀完我用新原则重写这条 listing。」

让纠正流回 BRAND.md，下次所有 listing 都受益。

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：商品页输出语言按内置 Etsy preset 的「买家语言」——默认英文。Base 字段标签中英混用（schema 文件里给规范）。
