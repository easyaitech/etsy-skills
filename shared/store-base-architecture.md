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
| `assets` | `Assets 素材池` | assets-library / content-asset-pool | 图片、视频、发布副本、授权、AI 清理状态 |
| `publishing_queue` | `社媒发布队列` | content-asset-pool / social-publisher / pinterest-autopin | 跨平台发布任务（含 Pinterest pin）的 source of truth；用 `平台` 字段区分 |
| `knowledge_cards` | `Knowledge Cards 知识卡片` | business-knowledge | 业务知识卡片、引用次数、brief 关联 |

表名可以本地化，但逻辑键必须稳定，便于各 skill 读取配置。

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
