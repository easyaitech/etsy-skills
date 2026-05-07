# 礼物场景调研指南（强制环节）

> Etsy 上买家的搜索意图大头是礼物场景——搜「mom birthday gift」的人不会同时搜「ceramic tea cup」。listing 必须同时回答两件事：① 这是什么 ② 谁会买它、什么场合送。
>
> 礼物场景**不是**「跟产品本身无关的 SEO 词」——是产品「关系维度」的输入。把它当末端点缀会让文案两层皮（前段讲匠心 + 末尾贴节日 tag），所以必须从输入端结构化收集。
>
> **进入条件见 SKILL.md 模式 B step 5.5**。永远跑（< $20 SKU 走轻问法分支）。

## 节点速查

| 节点 | 触发时机（模式 B 内）| 用户产出 | 喂给 |
|---|---|---|---|
| 5.5 礼物场景调研 | step 5（eRank，可选）之后、step 7 出草稿之前 | 礼物词库（4 类）+ 长尾语义短语（高客单档）| step 7 title 第 2-3 词 + 13 tags 中礼物槽 + description 段 3 礼物语境 |

本环节只有 **1 个节点**——但内部按客单价分 3 档运行（< $20 轻问法 / $20-$50 完整 / ≥ $50 完整 + 长尾）。

---

## 进入条件 / 时序

**何时**：模式 B step 5（eRank 调研，可选）**之后**、step 7（出 title + tags + description 草稿）**之前**

**为什么在 eRank 之后**：eRank 节点 ② 的关键词词库（如有跑）作为礼物词的对标参考——可以看竞品在哪些礼物词上拿量。如果 eRank 跳过了，5.5 仍然跑，step 7 中其余非礼物 tag 槽（按客单价档为 9-10 个）回退到「品类 + 工艺 / 材质 + 使用场景 + 风格」由 LLM 按现有 [etsy-seo.md](etsy-seo.md) 规则填。

**为什么是强制**：现有流程把礼物维度当可选 → 80% listing 不会有礼物词 → 漏吃 Etsy 礼物搜索流量。礼物维度提升到输入级，与 BRAND.md / SHOP.md / eRank 的「输入 → 词库 → 文案」范式同构。

**前置依赖**：
- `BRAND.md`（必读）——挑词时按品牌语调过滤
- `SHOP.md`（必读）——`offers_gift_wrap` / `offers_greeting_card` 字段（如有）取包装服务词；没有就跳过该类
- `holiday-calendar.md`（按需读）——Q4 节日时机查询

**客单价档分流**（看 Base 该 SKU 的 `售价 (USD)`）：

| 档位 | 价格 | 流程 |
|---|---|---|
| < $20 | 低价 | **轻问法**：只问 Q1，跳过 Q2-Q5；tag 礼物槽固定 3 个、纯节日词 |
| $20-$50 | 主流 | **完整 5 问**；tag 礼物槽 4 个，节日词 + 受众词为主 |
| ≥ $50 | 高客单 | **完整 5 问 + 长尾语义短语**（喂 title 第 2-3 词与 description 段 3，不进 tag）；tag 礼物槽 3 个，长尾偏受众场景而非节日大词 |

如果 SKU 还没建 Base 行（新品先建后写文案），按用户口头给的预期售价分档。

---

## 让用户做的事（5 问）

按顺序问，每问一道。**不要并发问全 5 题**——前面的答案影响后面是否需要问。

### Q1 礼物倾向（永远问）

> 这条 listing 主要是给谁买的？
> A. **自购为主** —— 买家是给自己用，礼物场景是少数
> B. **送礼为主** —— 大多数买家是为了送礼
> C. **兼顾** —— 自购与送礼都有

**分支**：
- A → **跳过 Q2-Q5**，直接进生成步骤；礼物词库只填「场景词」（基于产品本身的 use context，如 `daily ritual gift` 这类弱礼物词），其余三类空
- B / C → 继续 Q2

**< $20 轻问法补丁**：无论 A/B/C，都跳过 Q2-Q5；轻问法档位下，礼物词库由 Q1 + 当前节日命中（自动查 holiday-calendar）共同生成 3 个纯节日词

### Q2 受众类型（多选，初版 4 项）

> 想送给什么关系的人？（多选）
> - 家人（母 / 父 / 配偶 / 子女）
> - 朋友
> - 同事
> - 伴侣

注：初版只放 4 个高频项以控对话长度。运营熟稔后可以在本文件加（祖辈 / 师生 / 邻居 等），但**不要一开始就放 10 个**——长选项让用户对话疲劳。

### Q3 场景（多选，初版 4 项，节日单独走 Q4）

> 什么场合送？（多选）
> - 生日
> - 周年纪念
> - 入新居 / 搬家
> - 婚礼 / 订婚

**注**：「节日相关」**不在 Q3** —— 节日单独走 Q4，避免与 Q3 重叠。

### Q4 节日时机（按上架日查 holiday-calendar）

> 计划什么时候上架这条 listing？（默认 = today，可覆盖到未来某日）

skill 收到日期后查 [holiday-calendar.md](holiday-calendar.md)：

- 在「上架日 + 90 天」窗口内有命中节日 → 列出来让用户勾选哪些相关
- 0 命中 → 本节点跳过，记录「无节日命中」，**不打断流程**

输出格式（命中时）：

```
计划上架日：2026-04-25
未来 90 天命中节日：
  □ Mother's Day (2026-05-10, 距 15 天) — tag ✅ title ✅ description ✅
  □ Graduation Season (2026-05 全月) — tag ✅ title ✅ description ✅
  □ Father's Day (2026-06-21, 距 57 天) — tag ✅ title ✅
  □ Wedding Season (5-10 月窗口) — tag ✅ title ✅
请勾选与本 SKU 受众/调性相关的：
```

### Q5 受众画像（仅在 Q1 = B/C 时问）

> 收礼人画像：
> - 性别倾向：her / him / them / kids / 不明确
> - 年龄段：teen / young adult / adult / senior（可跳过，如果不重要）
> - 关系紧密度：亲密（家人 / 伴侣）/ 一般（朋友 / 同事）/ 礼节性（客户 / 老板）

**为什么要问**：性别 / 年龄直接驱动 Etsy 高频 filter tag——`gift for her` / `gift for him` / `gift for kids` 是站内被显式筛选的标签。「亲密度」决定文案温度（亲密 → 个人化叙事；礼节性 → 干净不张扬）。

---

## 贴回对话的格式

5 问跑完后 skill 整理成礼物词库，按 4 类 + 1 长尾整理。**这是 step 7 写 title / tags / description 的直接输入**。

```
礼物词库（SKU: TEACUP-007 / 售价 $58 / 高客单档）

受众词（来自 Q2 + Q5）：
- gift for mom / gift for new mom / from daughter / from son（Q2 家人 + Q5 her + 亲密）
- gift for tea lover（域内通用，不绑定关系）

场景词（来自 Q3）：
- housewarming gift / new home gift / move in gift（Q3 入新居）

节日词（来自 Q4 命中节日）：
- mothers day gift / gift for mom（Mother's Day 距 15 天，tag + title 双资格）
- graduation gift / for graduate（Graduation Season 全月，tag + title）

包装服务词（来自 SHOP.md，本店未提供礼盒服务）：
（空）

长尾语义短语（高客单档专用，仅供 title / description 段 3，不进 tag 槽）：
- "a thoughtful gift for someone moving into their first home"
- "for the friend who measures their mornings in tea"
```

低客单档（< $20 轻问法）的格式简化：

```
礼物词库（SKU: COASTER-003 / 售价 $14 / 低价档轻问法）

节日词（自动查 holiday-calendar 命中）：
- mothers day gift / gift for mom
- birthday gift（全年常驻）
- graduation gift（5-6 月窗口期）
```

---

## skill 拿到这批词后做什么

直接驱动 step 7 三个产出：

### 1. 驱动 title 第 2-3 词

按 [etsy-seo.md § Title](etsy-seo.md#title最重要) 的公式：`[核心品类词] + [核心修饰词] + [礼物维度] + [次要属性] + [情感词]`

礼物维度槽位优先级：节日词命中 > 受众词 > 场景词。例：

- 命中 Mother's Day + 高客单 + 受众=母亲 + 场景=入新居：
  `Handmade Wood-Fired Tea Cup, Mother's Day Gift for Tea Lover, Unglazed Ceramic Yunomi for Daily Ritual`
- 自购为主（Q1=A）：礼物维度槽位**空着**，title 第 3 位回退到次要属性

### 2. 驱动 13 tag 中的礼物槽

按客单价档分配（位移规则见 [etsy-seo.md § Tags](etsy-seo.md#tags13-个槽全部填满)），礼物槽数从「使用场景」槽位移而来，不动品类 / 工艺槽：

| 档位 | 礼物槽数 | 优先填什么 |
|---|---|---|
| < $20 | 3 | 纯节日词（mothers day gift / christmas gift / birthday gift） |
| $20-$50 | 4 | 节日词 + 受众词（gift for mom / housewarming gift / wedding gift / mothers day gift） |
| ≥ $50 | 3 | 受众 + 场景为主，少节日大词（gift for tea lover / housewarming gift / wedding gift） |

### 3. 驱动 description 段 3 礼物语境

按 [etsy-seo.md § Description](etsy-seo.md#description) 的段 3 双小段模板写：

- ① 使用语境（保留原内容）
- ② 礼物语境（仅当 Q1 ≠ A 时填）：受众 + 关系（来自 Q2/Q5）+ 场合（来自 Q3）+ 节日（来自 Q4，若距 ≤ 30 天）

### 4. BRAND.md 三条硬过滤

在生成礼物词库**之前**先过滤候选词，过 3 条规则：

1. **与 BRAND.md「避免说」清单不冲突**——读 BRAND.md 的避免说段，候选词若上榜直接淘汰
2. **不含品牌语调禁忌形容词**——硬黑名单：`adorable` / `perfect` / `luxury` / `premium` / `top quality` / `100% authentic` / `must have` / `unique` / `amazing` / `beautiful gift`（这些是商业感 / 空话词，跟 BRAND.md 的手作 / 极简 / 复古调性都冲突）
3. **与 BRAND.md「应该说」同语域**——如果 BRAND.md 标记的语调是「手作 / wabi-sabi / 极简」，礼物词库里不应出现「sparkly / cute / festive bling」类工业感词

通过的进词库；**不通过的列在 skill 输出末尾的「过滤掉的候选词」段**——让用户看到决策理由，能反过来纠正 BRAND.md（如果某个被过滤的词其实是品牌新方向）。

输出末尾段示例：

```
过滤掉的候选词（不进词库）：
- "perfect mothers day gift" — 含 BRAND 禁忌词 "perfect"
- "adorable tea lover gift" — 含 BRAND 禁忌词 "adorable"
- "festive christmas mug" — 与 BRAND「极简」语调冲突（"festive" 太喧闹）
```

---

## 边界

- **不替用户上 Etsy**——只产词库 + 驱动文案，上 Etsy 走原 SKILL.md step 9（用户在后台手动复制）
- **包装服务词不强行生造**——SHOP.md 没说店铺提供礼盒服务，就**不要**编出 `gift wrapped` / `with greeting card` 进词库
- **节日命中 0 不打断流程**——记录「无节日命中」继续走，节日维度本来就不是每条 listing 都需要
- **跟 eRank 节点的复用**——如果 eRank 节点 ② 跑过且词库里已有礼物相关词，本环节可以直接采纳，**不要重复让用户挑词**；只问 Q1-Q5 这 5 个判断题，词库由 eRank + 节日命中合并生成
- **轻问法档位（< $20）的代价**——只问一道题、词库浅；如果某个低价 SKU 是品牌主推 / 走礼物渠道（婚礼 favor / 圣诞限量），用户可以手动覆盖到完整问法
- **每条 listing 5.5 都要跑一遍**——批量上新时不能跳过；如果用户在批量场景下嫌烦，建议先按"主推 SKU 走完整 / 长尾 SKU 走轻问法"分批跑，**而不是**整批跳过
