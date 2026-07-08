# One Shop One Base 架构

本 stack 的推荐数据架构是：**一个店铺 = 一个飞书多维表格 Base；一个业务对象 = Base 内的一张表**。

不要把商品、素材、发布任务、订单、客户、供应商塞进同一张万能表；也不要为每个 skill 默认创建彼此独立的 Base。默认应先解析店铺总 Base，再在其中创建或定位目标表。

---

## 核心原则

1. **店铺总 Base 是业务数据入口**：每个店铺只维护一个主要 `app_token`，所有业务表都在该 Base 里。
2. **表承载业务对象**：Products、Orders、Customers、Suppliers、Assets、社媒发布队列、Knowledge Cards 等各自独立成表；SKU 是 `Products 商品` 表里的行，不再单独成 SKU 表。
3. **建库只开 4 张基础表**：新客户新建店铺总 Base 时，默认只创建 `Products 商品` / `Orders 订单` / `Customers 客户` / `Suppliers 供应商` 四张表。素材池、社媒发布队列、知识卡片等都是扩展表，**第一次真正用到对应 skill 时再补建**，不在建库时一次性全开。
4. **relation 优先**：同 Base 内表之间优先使用关联字段；跨 Base 只作为迁移期兼容，不作为新方案默认。
5. **SKU 不因合并改名**：SKU 是 `Products 商品` 表的业务主键，合并只改变数据组织方式，不改变 SKU 编码。若确需规范化，新增 `旧 SKU` / `SKU Alias` 字段，不覆盖原值。
6. **社媒发布队列单表多平台**：所有平台的发布任务（含 Pinterest pin）都进 `社媒发布队列` 一张表，用 `平台` 字段区分；不再为 Pinterest 单建执行队列表，Pinterest 行就是 `平台 = Pinterest` 的记录。
7. **Markdown 基座不搬进 Base 替代**：BRAND.md、SHOP.md、COMMERCE_PLATFORM.md、BRAND_MARKETING.md、MARKETING_PLATFORM.md 仍是工作区根目录文件；Base 只记录结构化运营数据。
8. **客户共享入口只给店铺总 Base**：不默认创建或共享飞书 Wiki / 知识库给客户；需要给客户看业务数据时，共享该店铺总 Base，并用高级权限限定可见表、视图、字段和记录。
9. **机器人权限绑定到单店铺 Base**：飞书机器人和 Hermes Agent 默认只拿当前店铺总 Base 及必要云盘文件夹权限，不申请全空间、全知识库或跨店铺权限。
10. **迁移只追加不破坏**：迁移期保留旧 Base token / 旧 table_id / 旧 record_id / 迁移日期 / 迁移状态字段；旧 Base 不删除、不清空，直到人工验收。

---

## 默认人读视图原则

建表或补字段后，不等于把所有字段都展示给运营。每张表至少维护一个默认人读视图，并按各 skill 的“默认视图字段”清单设置可见字段。

1. **可见字段只放运营每天要扫、判断、编辑的字段**：状态、业务主键、标题 / 客户 / 订单、金额 / 时间、下一步动作、失败原因、公开链接等。
2. **技术字段默认隐藏但保留**：外部 job id、执行锁、重试时间、同步游标、事件日志、平台 raw JSON、迁移字段、只给自动化消费的中间状态。
3. **敏感或核算字段开独立视图**：成本、利润、供应商、客户隐私、汇率 / 运费成本等不放默认视图，按角色需要另开财务 / 内部视图。
4. **平台扩展字段按需显示**：只有对应平台真的启用、且人需要核对时才展示；未启用平台和仅供 API 同步的字段默认隐藏。
5. **隐藏不等于删除**：清理字段前先确认没有代码、公式、自动化或历史迁移依赖；默认只调整视图可见性。

---

## 推荐表结构

店铺总 Base 建议命名：

```text
{店铺名}-运营中枢
```

### 建库默认创建（4 张基础表）

新客户建库时只开这 4 张：

| 逻辑键 | 表名 | 归属 skill | 说明 |
|---|---|---|---|
| `products` | `Products 商品` | listing-catalog | 商品 + SKU 合并：商品级故事 / 品类 / 平台 listing 聚合 + SKU / 成本 / 售价 / 库存 / 平台商品 ID；一行 = 一个可售 SKU |
| `orders` | `Orders 订单` | orders-customers | 订单、发货、ship by、追踪号、履约状态 |
| `customers` | `Customers 客户` | orders-customers | 客户、标签、复购、客服上下文 |
| `suppliers` | `Suppliers 供应商` | supplier-foundation | 供应商、采购来源、主用/备用/淘汰 |

### 按需补充的扩展表（首次用到对应 skill 时再建）

| 逻辑键 | 表名 | 归属 skill | 说明 |
|---|---|---|---|
| `assets` | `Assets 素材池` | assets-library | canonical 成品（图片/视频）、授权、检索；schema 唯一 owner |
| `asset_variants` | `Asset Variants 派生素材` | assets-library | 平台发布副本变体（裁切/封面/清理），派生自 canonical |
| `publishing_queue` | `社媒发布队列` | publish-composer（owner）/ social-publisher / pinterest-autopin / xiaohongshu-autopost | 跨平台发布任务 PublishIntent 的 source of truth；用 `平台` + typed extension 区分 |
| `knowledge_cards` | `Knowledge Cards 知识卡片` | business-knowledge | 业务知识卡片、引用次数、brief 关联 |

表名可以本地化，但逻辑键必须稳定，便于各 skill 读取配置。

---

## Base 写穿不变量（single source of truth）

**店铺总 Base 是它承载的一切运营数据的唯一准绳。对话只是过程，Base 才是状态。**

任何对 Base 承载对象的新增 / 修改 / 删除（商品、SKU、订单、客户、供应商、素材、发布队列、知识卡片、标签、状态、备注……），在**真正写进 Base 之前都视为「未完成」**。这是全 stack 的硬不变量，任何 skill、任何模式、skill-prefs 都不能豁免。

### 写穿协议（每次改 Base 都按这个收口）

1. **先落库，再报完成**：在同一个 turn 内，必须先用 `lark-base` 把改动写进目标表 / 行，拿到成功返回，**之后**才能对用户说"已加上 / 已改好 / 已录入"。绝不能凭对话内容当成已落地。
2. **确认与落库不跨 turn**：`shared/preamble.md` §写入前的通用约束的「展示 → 等确认 → 落盘」闸门照旧（草稿 / diff 仍要先给用户看、等同意）。但用户一旦确认，**落库必须在本 turn 内紧接着发生**，不能把"确认"留在这轮、"写入"拖到下一轮（中间那次写入最容易丢）。用户在指令里已经把改动讲死、无歧义的直接字段改动（如"把这个 SKU 库存改成 5"），预览可以压缩成一行 diff，但写入照样必须真实落到 Base 才算完。
3. **写后回执（必须带飞书链接）**：落库成功后，回复里**必须**附上一条可点击的飞书 Base 链接，让用户一键跳过去核对到底改了什么——这是回执的硬性组成，不是可选项。
   - 优先给**深链**（定位到改动的那张表 / 视图，能定位到记录更好），用户点开就看到本次改动的行；拿不到深链时退而给店铺总 Base 链接。
   - 链接从 `<workspace>/docs/store-base.md` 记录的 Base / 表信息拼，或用 `lark-base` 返回的链接。**交付形式只用飞书分享链接本身**——飞书 Base / 表的 URL 即许可的交付物（即便 URL 里天然带 app_token / table_id）；禁的是把 app_token / table_id / record_id / field_id 当作**裸 ID 单独写进正文**，不是禁链接（见 §工作区配置文件）。
   - **链接构造配方（照此拼，不要临场发挥或偷懒跳过）**：`base_token` / `table_id` / 飞书域名从 `<workspace>/docs/store-base.md` 读，或从本次建表 / 写记录时 `lark-base` 的返回里取。默认走第 1 种（零副作用、本地拼字符串），只有需要精确定位到改动那一行、且值得多一次写调用时才升级到第 2 种：
     1. **表 / 视图深链（默认，首选）**：`https://{飞书域名}/base/{base_token}?table={table_id}`；该表配了默认人读视图就再拼 `&view={view_id}`，用户点开直接落在改动的那张表。纯拼 URL，不调接口、不新增分享面，满足"发我看一眼改没改对"的绝大多数场景。
     2. **记录深链（可选升级，要点到改动的那一行时用）**：跑 `lark-cli base +record-share-link-create --base-token <base_token> --table-id <table_id> --record-ids <record_id>`，把返回的官方记录分享链接给用户，点开直接落在改动的那条记录。注意这是一次**写操作**（生成分享链接、扩了分享面），只在定位到具体记录确有价值时才用，不必每次写都调。
     3. **Base 兜底链接（前两者都拿不到时）**：`https://{飞书域名}/base/{base_token}`，退到店铺总 Base 首页。
   - 回执形如："已写入《Products 商品》该 SKU 行 → {飞书链接}"。让用户随时知道"对话说的 = Base 里的"，且能自己点进去验。
   - **彻底拿不到任何链接时的兜底**（store-base.md 没登记链接、`lark-base` 也没返回）：不要卡死在硬要求上，也不要伪造链接——如实回执"已写入《表》某行，但本工作区暂无可用的飞书链接"，并提示用户补全 `<workspace>/docs/store-base.md` 的 Base / 表信息，下次即可带链接。写入本身照常算完成。
4. **写失败要如实说**：`lark-base` 报错 / 权限不足 / 表不存在时，**不许**继续用"已写入"的口吻收尾。如实告诉用户哪一步没成、Base 当前仍是旧值，并给下一步（补权限 / 建表 / 重试）。

### 反模式（命中即是 bug）

- ❌ 在对话里答应或展示了改动，却没调用 `lark-base`，Base 原封不动。
- ❌ 把草稿 / 回答当成交付物，对话说"加好了"而记录没动。
- ❌ 先回复"改好了"再去写（或压根忘了写）；写入失败还按成功口吻收尾。
- ❌ 同一字段对话里一个值、Base 里另一个值——两者出现分歧时，**以 Base 为准**，并立即把 Base 写成双方约定的最终值，消除分歧。

> 一句话：**没写进 Base，就不算做完；做完了，必须有 Base 回执。**

---

## 工作区配置文件

推荐在工作区根目录维护：

```text
<workspace>/docs/store-base.md
```

内容至少包含 4 张基础表，扩展表建好后再追加行：

```markdown
# Store Base

店铺：{店铺名}
店铺总 Base：{不要在公开输出中暴露 token；内部操作可用 app_token}

| 逻辑键 | 表名 | table_id | 旧 Base | 旧 table_id | 迁移状态 |
|---|---|---|---|---|---|
| products | Products 商品 |  |  |  | planned |
| orders | Orders 订单 |  |  |  | planned |
| customers | Customers 客户 |  |  |  | planned |
| suppliers | Suppliers 供应商 |  |  |  | planned |
```

扩展表（assets / publishing_queue / knowledge_cards）在第一次建表后再补登记行；没建的表不必预先占位。

面向用户的回复不要暴露 Base token、table_id、record_id、file token、field_id 等敏感内部 ID。需要交付时给飞书链接或说明“已写入配置文件”。

---

## 共享与权限边界

默认共享模型：

1. **每个客户 / 店铺独立一个店铺总 Base**。不要把多个客户放进同一个 Base 后再靠记录筛选隔离。
2. **客户只访问店铺总 Base**。业务知识里的 raw / weekly / wiki / briefs markdown 是内部工作区材料；需要结构化引用时沉淀到 `Knowledge Cards 知识卡片` 表，不额外共享知识库。
3. **启用高级权限后再共享给客户**。客户角色默认只读；需要协作填写时，只开放明确表、明确字段和明确视图。
4. **默认关闭复制、下载、打印和创建副本**，除非用户明确要求开放。
5. **敏感表和字段默认不对客户开放**：成本、利润、供应商、内部备注、执行锁、客户隐私、平台账号等只给内部角色或机器人最小权限。

机器人 / Agent 权限：

- Hermes Agent 和飞书机器人使用独立角色，权限限定在当前店铺总 Base 的必要表。
- 日常运行角色不要是 Base admin；只有迁移、建表、改 schema 或配置高级权限时才使用管理员身份。
- 若某个工作流确实需要访问云盘素材库，权限只给该店铺素材库文件夹，不给整个云空间。

---

## 解析顺序

skill 需要读写 Base 时按顺序定位：

1. 解析工作区根：`ecommerce-stack workspace`。
2. 读取 `<workspace>/docs/store-base.md` 或未来等价的机器可读配置。
3. 若配置存在且目标逻辑键有 table_id：使用店铺总 Base + 对应表。
4. 若配置缺失：
   - 建库场景：默认只创建 4 张基础表（products / orders / customers / suppliers）。
   - 补扩展表场景（assets / publishing_queue / knowledge_cards）：在已有店铺总 Base 内**按需新建该表**，不顺手把其他没用到的表一起建出来。
   - 迁移期查询场景：可兼容旧的独立 Base，但必须提示这是 legacy fallback。
5. 不要为新模块默认创建独立 Base，除非用户明确要求隔离。

---

## 迁移流程

迁移多个旧 Base 到店铺总 Base 时，必须分阶段：

1. **盘点**：列出旧 Base、table、字段、记录数、关键唯一键。
2. **建目标表**：先在店铺总 Base 创建目标表和字段；不删除旧表。
3. **导入小样本**：每张表先迁移 3-5 行，验证字段类型、附件、relation 和链接。
4. **全量导入**：批量迁移，保留 `旧 Base` / `旧 table_id` / `旧 record_id` / `迁移批次`。
5. **读回验证**：分页读回，按唯一键和记录数核验；relation 表单独抽样验证。
6. **双写观察**：迁移后一段时间只写新表，旧表只读；发现问题可回滚。
7. **切换 skill 配置**：所有 skill 都读取店铺总 Base 的 table_id。
8. **归档旧 Base**：人工验收后再改名为 `归档-...`；不要自动删除。

---

## 最小兼容策略

为了降低风险，推荐迁移顺序：

1. `Products 商品`：先保证商品、SKU、分享链接和平台商品 ID 稳定（旧的独立 `Products` 与 `SKUs` 两表合并进一张 `Products 商品` 表，SKU 保持原编码）。
2. `Orders` / `Customers` / `Suppliers`：补齐另外 3 张基础表。
3. `Assets` / `社媒发布队列`：需要做内容发布时再建立素材池和跨平台发布队列。
4. `Knowledge Cards` / `Clips` / `Video Jobs`：其余扩展表按业务节奏最后迁移。

历史上分散的 `Pinterest Queue` 数据并入 `社媒发布队列`（`平台 = Pinterest` 的行），保留 `pin_id` 作为 `任务 ID`；迁移期旧 Pinterest 队列只读，验收后归档，不再单独维护一张 Pinterest 表。
