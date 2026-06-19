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
| `来源` | 链接 / 多行文本 | 是 | 原始来源、周报链接或 wiki 链接 |
| `记录日期` | 日期 | 是 | 创建日期 |
| `适用场景` | 多选 | 是 | listing / Pinterest / TikTok / 拍摄 / 选品 / 供应链 / 客服 / marketing_brief |
| `关键词标签` | 多选 / 文本 | 是 | SKU、品类、材质、节日、受众、渠道、场景词 |
| `建议动作` | 多行文本 | 是 | 可以怎么用于业务动作 |
| `有效状态` | 单选 | 是 | active / watch / expired / rejected |
| `知识页链接` | 链接 / 文本 | 否 | 指向 `<workspace>/knowledge/wiki/*.md` 或周报 |

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
