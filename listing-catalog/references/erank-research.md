# eRank 调研指南（可选环节）

> eRank 是 Etsy 第三方 SEO / 竞品工具——**用户在 eRank 网页上完成调研**，把数据贴回对话。本 skill 不做爬取、不替用户登录（eRank 无 API）。
>
> **进入条件见 SKILL.md 模式 B step 5**。命中后，按本文件里命中的节点向用户发问。

## 节点速查

| 节点 | 触发时机（模式 B 内）| 用户产出 | 喂给 |
|---|---|---|---|
| ① 选品验证 | step 1 之前（新品立项）| 搜索量 / 竞品数 / 价格 / 趋势 | 立项 go/no-go |
| ② 关键词词库 | step 4 后、step 7 前（最常用）| 13 个候选 tag 词 | step 7 title + tags |
| ③ 标题模式参考 | step 7 出 title 草稿时 | top 5–10 竞品 title | title 词序 |
| ④ Tag 反查验证 | step 7 写完 13 tag 后 | 竞品 tag 配置 | step 8 确认前 |
| ⑤ 定价对标 | step 9 上架前 | 价格分布 | description 段 1-2 "贵的理由" |

---

## 节点 ① 选品验证

**何时**：模式 B step 1 之前——新品立项阶段，决定要不要做这个 SKU
**目的**：确认这个角度有需求、不是红海

**让用户去 eRank 做的事**：

1. 打开 **Keyword Tool**，输入 1–2 个核心品类词（如 `wood fired tea cup`、`yunomi`）
2. 记下 4 个数：**Etsy Searches（月搜索量）/ Etsy Competition（竞品数）/ Average Price / Average Heart Count**
3. 打开 **Top Listings**，搜同一个词，看前 10 名 listing 的 **销量 / 价格 / 上架时长**
4. （可选）**Trend Buzz** 看这个词最近 6 个月的趋势走向

**贴回对话的格式**：

```
关键词：wood fired tea cup
- Etsy Searches: 1,420/月
- Etsy Competition: 18,300
- Average Price: $42
- Average Hearts: 87
- Top 10 listing 价格区间：$28–$95
- Top 1 上架时长：2 年
- 趋势：近 3 个月稳定上升
```

**判断标准**（skill 拿到数据后做这个判断）：

| 信号 | 含义 | 建议 |
|---|---|---|
| 搜索量 < 500/月 | 需求太小 | 换关键词或换品 |
| Competition > 50k 且自身没差异化 | 红海 | 换长尾切入 |
| Average Price 远低于用户预期定价 | 定价压力 | 提醒用户做"为什么贵"的文案准备 |
| 趋势下行 | 衰退期 | 缓做 / 不做 |

---

## 节点 ② 关键词词库（最高 ROI 的环节）

**何时**：模式 B step 4（读 etsy-seo.md）之后、step 7 出草稿之前
**目的**：拿到 13 个高质量候选 tag + 标题素材，避免凭感觉编词

**让用户去 eRank 做的事**：

1. **Keyword Tool** 输主词，往下翻 **Long Tail Keywords** 区
2. 按 `etsy-seo.md` Tags 段的 5 组 13 tag 分配公式找词。eRank 侧的额外筛选标准：
   - 核心品类词组 → 搜索量 ≥ 1k
   - 工艺/材质词组 → competition < 20k 优先
   - 共同甜蜜点：**搜索量 100–5000 + competition < 20k**（大词卷不过，纯小词没流量）

**贴回对话的格式**：

```
核心词：wood fired tea cup (1.4k/18k) / yunomi (980/12k) / handmade ceramic mug (3.2k/45k)
工艺词：wood fired pottery (820/9k) / unglazed ceramic (560/6k) / hand thrown (2.1k/28k)
场景词：daily tea ritual (310/3k) / morning tea cup (440/5k) / mindful drinking (180/2k)
受众词：tea lover gift (5.8k/52k) / housewarming gift (12k/180k)
风格词：wabi sabi (4.2k/38k) / earthy decor (1.8k/22k)
```

格式要点：每个词后面跟 `(搜索量/competition)`，方便 skill 写 title 时挑词。

**skill 拿到这批词后**：直接驱动 title + 13 tags 撰写，不再凭感觉编。

---

## 节点 ③ 标题结构参考

**何时**：模式 B step 7 出 title 草稿时
**目的**：看竞品在 Etsy 算法里"被验证有效"的标题模式

**让用户去 eRank 做的事**：

1. **Top Listings** 搜核心主词
2. 截图或复制前 5–10 名 listing 的完整 title 贴回来
3. （可选）按 sales 排序看 best sellers 的 title

**skill 拿到标题列表后做的分析**：

- 第一个词的高频选择（多数都是品类核心词？还是修饰词？）
- 长尾词的位置（前段 / 后段？）
- 是否带情感词 / 礼物词 / 季节词
- 哪些词**没有人用**——可能是机会点，也可能是废词

**禁忌**：不抄整条 title，只抽词序模式 + 用词偏好；抄整条 → Etsy 算法判定为重复，反而压排名。

---

## 节点 ④ Tag 反查 / 验证

**何时**：模式 B step 7 写完 13 tag 后、step 8 确认前
**目的**：交叉验证候选 tag，看相似 top listing 的 tag 配置

**让用户去 eRank 做的事**（二选一）：

**方案 A — Tag Suggestions**：
1. 进 **Listing Audit** 或 **Tag Suggestions**
2. 输入你的草稿 title，eRank 反推推荐的 13 tag
3. 把推荐 tag 列表贴回来

**方案 B — 反查竞品 tag**：
1. **Top Listings** 找 1–2 条相似的 best seller
2. 点进去看 eRank 显示的它的 13 tag（eRank Pro 可见）
3. 把这两条 listing 的 tag 列表贴回来

**贴回对话的格式**：

```
我的 13 tag 草稿：[列出来]

竞品 A（销量 1.2k）的 tag：[13 个]
竞品 B（销量 800）的 tag：[13 个]
```

**skill 拿到后的动作**：对照差集——竞品都用了你没用的词，要不要补？你用了竞品都没用的词，是机会还是废词？

---

## 节点 ⑤ 定价对标

**何时**：listing 文案确认后、用户准备去 Etsy 后台上架前（在模式 B 之外，但顺带提醒）
**目的**：定价落在合理分位，避免高于 90 分位却没"贵的理由"

**让用户去 eRank 做的事**：

1. **Keyword Tool** 看主词的 **Average Price**
2. **Top Listings** 同主词的前 20 个 listing 的价格分布（最低 / 中位 / 最高）
3. **Top Sellers** 看同品类 top 店的价格策略

**贴回对话的格式**：

```
主词 Average Price: $42
Top 20 价格分布：低 $22 / 中位 $38 / 高 $95
我打算定价：$58
```

**skill 的判断**：

| 你的定价位置 | 含义 | 文案动作 |
|---|---|---|
| 低于中位 | 价格优势位 | 文案弱化"高端"调性，强调"日常可得" |
| 中位 ~ 75 分位 | 主流位 | 按 BRAND.md 标准调性写 |
| 75 ~ 90 分位 | 偏高 | description 段 1-2 必须有故事 / 工艺差异化 |
| > 90 分位 | 高端区 | 必备：手作叙事 + 限量 / 编号 / 工艺师介绍，否则转化崩 |

---

## 边界

- eRank 是**输入侧的数据源补强**，不替代任何现有 step——BRAND.md / SHOP.md / 产品图 / Base 仍是必读
- 缺数据时不要硬等：按 BRAND + 产品图推断写出来，上线后看表现再迭代
