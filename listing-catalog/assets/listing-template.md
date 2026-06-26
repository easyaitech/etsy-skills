<!--
商品页 / listing 文案标准模板。Agent 写新商品页时按此结构产出，整篇展示给用户确认后再写入 Base。
- 文案语调：参考 <workspace>/BRAND.md
- 政策段：引用 <workspace>/SHOP.md 原文，不要自己编
- 平台规则：参考 <workspace>/COMMERCE_PLATFORM.md；Etsy 可使用 references/platforms/etsy.md 内置 preset，小红书可使用 references/platforms/xiaohongshu.md 内置 preset
- 输出三块：(1) 文案预览  (2) 平台关键词 / 属性  (3) 类目与平台字段
-->

# 商品页 / Listing 文案模板

## (1) 文案预览

### 标题 / Title
```
{{按 COMMERCE_PLATFORM.md 的目标平台语言、长度和关键词顺序生成；Etsy preset 为 Title ≤ 140 chars}}
```

### 描述 / Description

> **不固定段序**——按商品自然成文，覆盖下面这些要素即可。原则：讲故事不堆参数；开头几句最吃 SEO 与转化，把最值钱的放前面；政策口径引 SHOP.md 原文、不自编。

```
{{
- 开场：为什么这件东西存在 / 它解决什么（品牌视角，语气随 BRAND.md「应该说」）
- 物件本身：材质、工艺特征、感官细节、手作差异说明
- 使用语境：具体场景、与什么搭配，给读者画一个画面
- 礼物语境（非自购品才写）：送给谁 / 什么场合 / 在收礼人手里产生什么微小的日常变化（具体，避免 "perfect gift" 这类空话）
- 规格：尺寸 / 重量 / 容量 / 材质摘要（适合用 bullet）
- 注意事项：手洗 / 微波 / 烘干 / 手作差异 / 定制规则
- 政策：处理时间 / 运输 / 退换货 —— 引用 SHOP.md 原文
- （可选）钩到 About：一句话引到主理人 / 品牌故事或邀请关注店铺
}}
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

Etsy：写完按 `references/platforms/etsy.md` 末尾的"SEO 自检清单"逐条核对。

非 Etsy：按 COMMERCE_PLATFORM.md 的平台规则逐条核对；缺规则就标注未知，不能套 Etsy 规则。

---

## 写完之后

整篇展示给用户 → 等用户确认或调整 → 写入 Base 该 SKU 行（用 lark-base 更新 标题 / 描述 / 关键词 / 属性 / 类目 / 平台字段 JSON）→ 提示用户"这条文案可以复制到目标平台后台对应商品页了"。
