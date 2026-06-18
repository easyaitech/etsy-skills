<!--
商品页 / listing 文案标准模板。Agent 写新商品页时按此结构产出，整篇展示给用户确认后再写入 Base。
- 文案语调：参考 <workspace>/BRAND.md
- 政策段：引用 <workspace>/SHOP.md 原文，不要自己编
- 平台规则：参考 <workspace>/COMMERCE_PLATFORM.md；Etsy 可使用 references/etsy-seo.md 内置 preset，小红书可使用 references/xiaohongshu-commerce.md 内置 preset
- 输出三块：(1) 文案预览  (2) 平台关键词 / 属性  (3) 类目与平台字段
-->

# 商品页 / Listing 文案模板

## (1) 文案预览

### 标题 / Title
```
{{按 COMMERCE_PLATFORM.md 的目标平台语言、长度和关键词顺序生成；Etsy preset 为 Title ≤ 140 chars}}
```

### 描述 / Description

```
段 1（开场）：
{{1-2 句。从品牌视角写"为什么这件东西存在"或"它解决什么"。语气：BRAND.md 的"应该说"}}

段 2（物件本身）：
{{3-5 句。材质、工艺特征、感官细节、手作差异说明}}

段 3（使用场景）：
{{2-3 句。具体使用场景、与什么搭配、给读者画一个画面}}

段 4（规格）：
- Dimensions: {{尺寸}}
- Weight: {{重量}}
- Capacity: {{容量}}
- Material: {{材质摘要}}
- {{其他相关规格}}

段 5（注意事项）：
- {{是否手洗 / 微波适用 / 烘干注意}}
- {{手作差异说明：每件略有不同，烧窑色差等}}
- {{定制规则：如果接受定制，加工时长、加价等}}

段 6（政策——引用 SHOP.md 原文）：
- Processing time: {{从 SHOP.md 取}}
- Shipping: {{从 SHOP.md 取}}
- Returns: {{从 SHOP.md 取}}

段 7（可选 — 钩到 About）：
{{1 句。引到关于主理人/品牌的故事，链接 About 页或邀请关注店铺}}
```

---

## (2) 平台关键词 / 属性

### 关键词 / Tags（复制用）
```text
{{按 COMMERCE_PLATFORM.md 的数量、长度、分隔符输出；Etsy preset 为 13 个 tag，用半角逗号分隔}}
```

> 写入 Base 的 `关键词 / Tags` 字段也使用同样格式；非 Etsy 平台不要强行凑 13 个。
> 小红书没有 Etsy 式 13 tags；需要把搜索词、卖点词、类目词写入 `SEO / 搜索关键词` 或 `小红书产品参数 JSON` 的可确认字段，不要伪造后台标签。

### 材质 / 平台属性（复制用）
```text
{{按 COMMERCE_PLATFORM.md 输出；Etsy preset 为 13 个 material，用半角逗号分隔}}
```

> 写入 Base 的 `材质 / 属性` 字段也使用同样格式；平台枚举不确定时留空并标注需要用户在后台确认。

---

## (3) 平台专属字段

- **平台字段 JSON**：`{{只写 COMMERCE_PLATFORM.md 已配置或用户已确认的字段}}`
- **Etsy preset**：Sustainability / Occasion / Holiday 等必须从 Etsy 后台字段选项中选择；不确定留空。
- **小红书 preset**：按 `小红书品牌 ID`、`小红书末级类目 ID`、`小红书商品特色`、`小红书产品参数 JSON`、`小红书 FAQ JSON`、`小红书 SPL/SPV 规格 JSON` 等字段输出；不知道 ID 时写“待后台确认”，不要编造。

---

## (4) 类目与属性

- **Category / 类目**：`{{平台类目层级；不确定时标注需用户后台确认}}`
- **Primary attribute 1**：`{{}}`
- **Primary attribute 2**：`{{}}`
- ...

---

## SEO 自检

Etsy：写完按 `references/etsy-seo.md` 末尾的"SEO 自检清单"逐条核对。

非 Etsy：按 COMMERCE_PLATFORM.md 的平台规则逐条核对；缺规则就标注未知，不能套 Etsy 规则。

---

## 写完之后

整篇展示给用户 → 等用户确认或调整 → 写入 Base 该 SKU 行（用 lark-base 更新 标题 / 描述 / 关键词 / 属性 / 类目 / 平台字段 JSON）→ 提示用户"这条文案可以复制到目标平台后台对应商品页了"。
