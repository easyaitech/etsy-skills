# 节日日历

> Etsy 流量大头是礼物 / 节日场景。这份日历给 listing-catalog 的 step 5.5（[gift-scenario.md](gift-scenario.md)）查节日时机用——**输入「计划上架日」**，输出未来 60 天命中的节日 + 关联礼物词。
>
> 默认聚焦 Etsy 主流市场（美 / 欧 / 澳）。海外华人节日做可选 section（默认关闭）。

last_updated: 2026-01-15

> ⏰ skill 读本文件时检查 `last_updated`：超过 365 天 → 在输出末尾打提示「holiday-calendar.md 已超过一年未更新，移动节日日期可能过时」。**每年初过一遍**移动节日的具体日期。

---

## 提前期规则（这是整份文件的核心）

| 提前期窗口 | 适用 | 理由 |
|---|---|---|
| 节日前 **90 天**起 | tags 槽（13 个之一可加节日词） | tags 是 SEO 索引输入，需要给 Etsy 算法更长的攒权重时间 |
| 节日前 **60 天**起 | title 加节日词 | title 是用户可见文本，太早加节日词显廉价（5 月还卖"圣诞礼物"） |
| 节日前 **30 天**内 | description 段 3 礼物语境强化（命名节日 + 包装服务） | 临门一脚的转化文案 |

「节日前 X 天」 = 节日日期 - **计划上架日**（默认 = today，可由用户在 step 5.5 Q4 覆盖）。

---

## 主节日清单（西方主导，默认启用）

每个节日字段：**日期规则** / **核心礼物词** / **典型受众**。

### Valentine's Day — 2 月 14 日（固定）
- 关联礼物词：`valentines day gift` / `gift for her` / `gift for him` / `couples gift` / `romantic gift`
- 典型受众：伴侣 / 暗恋对象 / 单身（self-love 角度）

### Mother's Day — 5 月第二个周日（移动）
- 2026: 5/10 · 2027: 5/9 · 2028: 5/14
- 关联礼物词：`mothers day gift` / `gift for mom` / `gift for new mom` / `from daughter` / `from son`
- 典型受众：母亲 / 婆婆 / 岳母 / 祖母

### Father's Day — 6 月第三个周日（移动）
- 2026: 6/21 · 2027: 6/20 · 2028: 6/18
- 关联礼物词：`fathers day gift` / `gift for dad` / `gift for grandpa` / `from daughter` / `from son`
- 典型受众：父亲 / 公公 / 岳父 / 祖父

### Graduation Season — 5-6 月（窗口期）
- 关联礼物词：`graduation gift` / `for graduate` / `class of 2026` / `dorm decor`
- 典型受众：高中 / 大学 / 研究生毕业生
- 提前期特殊：从 4 月初就开始有流量，比固定节日提早 30 天

### Wedding Season — 5-10 月（窗口期）
- 关联礼物词：`wedding gift` / `bridal shower gift` / `for the couple` / `engagement gift` / `bride to be`
- 典型受众：新人 / 伴娘伴郎 / 婚礼宾客
- 提前期特殊：婚礼日期对每对新人不同；不走"全网提前 60 天"，全年常驻 wedding tags 在 Wedding Season 内即可

### Halloween — 10 月 31 日（固定）
- 关联礼物词：`halloween gift` / `spooky decor` / `gothic gift`
- 典型受众：自购为主、儿童家庭、cosplay 爱好者
- 注：礼物属性弱，主要是「装饰 / 派对用品」流量；除非品类本身契合（蜡烛、装饰品），否则跳过

### Thanksgiving — 11 月第四个周四（移动）
- 2026: 11/26 · 2027: 11/25 · 2028: 11/23
- 关联礼物词：`thanksgiving gift` / `host gift` / `hostess gift` / `friendsgiving`
- 典型受众：聚会主人 / 家庭聚餐
- 注：感恩节本身礼物量小，但 Thanksgiving → Black Friday → Christmas 一条龙，提前期可与圣诞合并

### Christmas — 12 月 25 日（固定）
- 关联礼物词：`christmas gift` / `holiday gift` / `xmas gift` / `stocking stuffer` / `secret santa`
- 典型受众：家人 / 朋友 / 同事 / 全员覆盖
- 提前期特殊：**Etsy 圣诞流量从 10 月底开始爬升**——tag 窗口前移到 9 月底（提前 90 天用足）；title 加圣诞词 10/25 起

### Hanukkah — 12 月（移动，希伯来历）
- 2026: 12/4-12/12 · 2027: 11/24-12/2
- 关联礼物词：`hanukkah gift` / `chanukah gift` / `jewish holiday gift`
- 典型受众：犹太家庭 / 8 天每天送一份
- 注：与 Christmas 同期，可在 12 月初前用作差异化关键词

### Easter — 春分后第一个满月后第一个周日（移动）
- 2026: 4/5 · 2027: 3/28 · 2028: 4/16
- 关联礼物词：`easter gift` / `easter basket` / `for kids`
- 典型受众：儿童为主，少量成人
- 注：礼物属性中等，主要儿童品类

---

## 通用送礼场景（不绑定具体节日）

这些是常驻流量、不走"提前期 60-90 天"，**全年都可加**。step 5.5 Q3 命中时直接进礼物词库。

| 场景 | 关联礼物词 | 典型受众 |
|---|---|---|
| 生日（universal） | `birthday gift` / `for her birthday` / `for his birthday` / `milestone birthday` / `30th birthday` | 全员 |
| 周年纪念 | `anniversary gift` / `1 year anniversary` / `wedding anniversary` / `for couples` | 伴侣 |
| 入新居 | `housewarming gift` / `new home gift` / `move in gift` / `apartment warming` | 朋友 / 家人 / 同事 |
| 新生儿 / Baby Shower | `baby shower gift` / `for new mom` / `baby gift` / `gender neutral baby` | 准父母 / 朋友 |
| 谢师 / Teacher Appreciation | `teacher gift` / `teacher appreciation` / `end of year teacher` | 学生家长 |
| 退休 | `retirement gift` / `for retirement` | 同事 / 家人 |
| 慰问 / Sympathy | `sympathy gift` / `condolence gift` | 朋友家人 |
| 自我犒赏 | `self care gift` / `treat yourself` | 自购 |

---

## 东方节日（可选 section，默认关闭）

> 仅在店铺主打海外华人客户时启用。SHOP.md 未来如果加 `target_market: chinese-overseas` 字段，本 section 默认开启。

### Lunar New Year / 春节 — 农历正月初一（移动）
- 2026: 2/17 · 2027: 2/6 · 2028: 1/26
- 关联礼物词：`lunar new year gift` / `chinese new year gift` / `year of the [zodiac]`
- 典型受众：华人家庭 / 朋友互赠

### Mid-Autumn Festival / 中秋 — 农历八月十五（移动）
- 2026: 9/25 · 2027: 9/15
- 关联礼物词：`mid autumn gift` / `mooncake season` / `family reunion`
- 典型受众：华人家庭

---

## 节日命中查询格式（给 skill 用）

step 5.5 Q4 调用本文件时，按以下逻辑：

```
输入：计划上架日 = YYYY-MM-DD
输出：在「上架日 + 90 天」窗口内命中的节日列表，按距离从近到远排序

每条命中：
- 节日名 (节日日期, 距上架日 X 天)
- 进 tag 资格：是 / 否（距 ≤ 90 天）
- 进 title 资格：是 / 否（距 ≤ 60 天）
- 进 description 强化资格：是 / 否（距 ≤ 30 天）
- 关联礼物词：[本节日的关联词列表]
```

例：

```
输入：计划上架日 = 2026-04-25

命中：
- Mother's Day (2026-05-10, 距 15 天)
  - tag ✅  title ✅  description ✅
  - 词：mothers day gift / gift for mom / gift for new mom / from daughter / from son
- Graduation Season (2026-05/全月, 距 6-36 天)
  - tag ✅  title ✅  description ✅
  - 词：graduation gift / for graduate / class of 2026 / dorm decor
- Father's Day (2026-06-21, 距 57 天)
  - tag ✅  title ✅  description ❌（>30 天）
  - 词：fathers day gift / gift for dad / from daughter / from son
- Wedding Season (5-10 月窗口，全程命中)
  - tag ✅  title ✅  description ❌（按婚礼日期定）
  - 词：wedding gift / bridal shower gift / for the couple
```

如果窗口内 0 命中：本节点跳过，记录「无节日命中」，不打断流程。

---

## 维护规则

1. **每年 1 月**过一遍移动节日日期，更新顶部 `last_updated`
2. 新增节日时同步加：日期规则 + 核心礼物词（≤ 5 词）+ 典型受众 + 提前期特殊说明（如有）
3. 不要塞商业大促（黑五 / 网一 / Prime Day）—— 那些走 etsy-seo.md 的「季节性 / 节日 / 大促」段，不在本文件范围
4. 词条质量优先于数量：每个节日 3-5 个核心词够用，多了反而稀释
