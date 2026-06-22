# `Knowledge Cards 知识卡片` 表 Schema

表位置：

```text
店铺总 Base / Knowledge Cards 知识卡片
```

不要为知识卡片默认创建独立 Base。迁移期旧独立知识卡片数据源只能作为只读来源，验收后迁入店铺总 Base。

## 设计原则

- `Knowledge Cards 知识卡片` 表是行动索引，不是知识本体。
- 原始材料、周报、wiki、brief 正文都在 markdown。
- 一行 = 一张 Knowledge Card。
- 默认字段少，隐藏字段为未来自动化和健康检查预留。

## 可见字段（必建）

| 字段名 | 飞书字段类型 | 必填 | 说明 |
|---|---|---:|---|
| `标题` | 单行文本（主字段） | 是 | 卡片名，短而可扫 |
| `一句话摘要` | 多行文本 | 是 | 快速判断是否相关 |
| `卡片类型` | 单选 | 新卡必填 | `方法论` / `趋势` / `选品` / `定位` / `观察`；决定下游消费方式，见 §卡片类型与消费。存量迁移期可空，缺省按 `观察` 消费 |
| `来源` | 链接 / 多行文本 | 是 | 原始来源、周报链接或 wiki 链接 |
| `记录日期` | 日期 | 是 | 创建日期 |
| `适用场景` | 多选 | 是 | listing / Pinterest / TikTok / 拍摄 / 选品 / 供应链 / 客服 / marketing_brief |
| `关键词标签` | 多选 / 文本 | 是 | SKU、品类、材质、节日、受众、渠道、场景词 |
| `建议动作` | 多行文本 | 是 | 可以怎么用于业务动作 |
| `有效状态` | 单选 | 是 | active / watch / expired / rejected |
| `知识页链接` | 链接 / 文本 | 否 | 指向 `<workspace>/knowledge/wiki/*.md` 或周报 |

## 卡片类型与消费（gating）

`卡片类型` 决定下游怎么用这张卡，尤其是**要不要读 `知识页链接` 的 wiki 正文**：

| 类型 | 含义 | 下游消费 |
|---|---|---|
| `方法论` | 可执行的写作 / 运营 SOP（标题去 AI 味、description 开头规则、热点转化框架等）| **必须读 `知识页链接` 并把其中的清单 / 模板 / 正反例应用到产出**；卡面一句话只是指针，不是交付物 |
| `趋势` | 时效热点 / 季节信号 | 一句话摘要足够；带 `过期提醒日期`，受 [`card-extraction-rules.md`](card-extraction-rules.md) §Expiry sweep 清扫 |
| `选品` | 选品 / 竞品 / 供应链发现 | 一句话摘要 + 建议动作足够 |
| `定位` | 长效战略定位 / 品牌护城河 | 一句话摘要足够。**注意**：纯定位内容更应沉淀进 `BRAND_MARKETING.md` / `COMMERCE_PLATFORM.md`，不宜长期只活在 SKIP 级卡表里 |
| `观察` | 其他可审计观察（默认）| 一句话摘要足够 |

只有 `方法论` 卡会触发“强制读 wiki 并应用”（契约见 [`knowledge-card-lookup.md`](knowledge-card-lookup.md)）。未标类型的卡按 `观察` 处理（安全默认：不强制读 wiki，避免对每张卡都做昂贵的 wiki 读取）。

**迁移期回填**：把已有的写作 / 框架类卡（标题 / description 卡、热点转化框架、“一个模板拆多 listing”等）回填为 `方法论`；季节 / 热词卡回填 `趋势`；竞品 / 选品卡回填 `选品`；店铺级定位卡回填 `定位`。回填前后都走字段 diff 预览。

## 隐藏字段（推荐建）

| 字段名 | 飞书字段类型 | 用法 |
|---|---|---|
| `适用 SKU` | 文本 / 多选 | 只有明确绑定 SKU 时才填；默认不要求人维护 |
| `禁用场景` | 多选 / 文本 | 高风险卡片才填，例如“不适合非婚礼 SKU” |
| `过期提醒日期` | 日期 | Agent 根据来源性质推断；短期热点通常 30-60 天 |
| `引用次数` | 数字 | system-maintained, best-effort；采用卡片时递增 |
| `最后引用日期` | 日期 | system-maintained, best-effort；采用卡片时更新 |
| `最近使用结果` | 单选 / 文本 | v1 使用；用户采纳 / 用户拒绝 / 产生效果 |

`引用次数` 和 `最后引用日期` 不代表 v0 有完整 usage ledger。它们只是未来 health check 的低成本入口；回写失败不能阻塞 listing 或 brief 输出。

## 推荐视图

- **Active Cards**：`有效状态 in active, watch`
- **Listing 可用**：`有效状态 in active, watch` 且 `适用场景 includes listing`
- **Marketing Brief 可用**：`有效状态 in active, watch` 且 `适用场景 includes marketing_brief/Pinterest/TikTok/拍摄`
- **待观察**：`有效状态 = watch`
- **过期 / 拒绝**：`有效状态 in expired, rejected`

## 录入约定

写入前展示字段 diff，用户确认后再用 `lark-base` 新增记录。

每张卡片必须能回答：

1. 来源是什么？
2. 可以用于什么场景？
3. 建议动作是什么？
4. 边界或 caveat 是什么？

如果不能回答，先留在 weekly，不进 Base。
