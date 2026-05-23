<!--
listing 文案标准模板。Agent 写新 listing 时按此结构产出，整篇展示给用户确认后再写入 Base。
- 文案语调：参考 ./BRAND.md
- 政策段：引用 ./SHOP.md 原文，不要自己编
- SEO 要点：参考 references/etsy-seo.md
- 输出三块：(1) 文案预览  (2) Tags & Materials  (3) Category & Attributes
-->

# Listing 文案模板

## (1) 文案预览

### Title (≤ 140 chars)
```
{{Title — 第一个词是品类核心词，包含 1+ 长尾关键词，符合 BRAND.md 文案语调}}
```

### Description

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

## (2) Tags & Materials

### Tags（13/13，复制用）
```text
{{tag 1}},{{tag 2}},{{tag 3}},{{tag 4}},{{tag 5}},{{tag 6}},{{tag 7}},{{tag 8}},{{tag 9}},{{tag 10}},{{tag 11}},{{tag 12}},{{tag 13}}
```

> 写入 Base 的 `Tags` 字段也使用同样的一行文本格式：不同 tag 之间用半角逗号 `,` 分隔。

### Materials（13/13，复制用）
```text
{{material 1}},{{material 2}},{{material 3}},{{material 4}},{{material 5}},{{material 6}},{{material 7}},{{material 8}},{{material 9}},{{material 10}},{{material 11}},{{material 12}},{{material 13}}
```

> 写入 Base 的 `Materials` 字段也使用同样的一行文本格式：不同 material 之间用半角逗号 `,` 分隔。

---

## (3) Etsy 后台属性

- **Sustainability**（最多 3 个；不确定留空）：`{{从 Base 选项中选择，或留空}}`
- **Occasion**（单选；泛泛适合作礼物时留空）：`{{从 Base 选项中选择，或留空}}`
- **Holiday**（单选；只有明确节日主题时填写）：`{{从 Base 选项中选择，或留空}}`

---

## (4) Category & Attributes

- **Category**：`{{Etsy 类目层级，到叶子节点}}`
- **Primary attribute 1**：`{{}}`
- **Primary attribute 2**：`{{}}`
- ...

---

## SEO 自检

写完按 `references/etsy-seo.md` 末尾的"SEO 自检清单"逐条核对。

---

## 写完之后

整篇展示给用户 → 等用户确认或调整 → 写入 Base 该 SKU 行（用 lark-base 更新 Title/Description/Tags/Materials/Category 字段）→ 提示用户"这条文案可以复制到 Etsy 后台对应 listing 了"。
