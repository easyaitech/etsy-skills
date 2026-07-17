# 知识种子 + 租户两层架构

> 本文件是「公共方法论知识怎么发、租户怎么拿、冲突怎么算」的架构不变量。
> 种子机制实现见 [`README.md`](README.md)；
> 店主长期偏好（服务端「我的偏好」设置层）见 [`../../shared/skill-prefs.md`](../../shared/skill-prefs.md)。

## 两层，不是多层

逻辑上只有公共默认与租户个性化两层（租户个性化物理上可落 workspace，或存服务端偏好注册表）：

```
公共引擎（~/.hermes/skills，只读，ecommerce-stack update 整包换）
  ├ skill 能力逻辑
  ├ 不可覆盖闸门：安全 / 合规 / QA / 写入前确认 / 平台硬规则
  └ 可拷贝/可选默认：平台 preset（引用 live）、知识种子 seeds/（拷贝即拥有）
租户 workspace（<workspace>/，每客户隔离）
  └ BRAND/SHOP/COMMERCE_PLATFORM + knowledge/（含拷入的种子）+ Base（店主偏好在服务端，不落工作区）
```

`skill-prefs.md`（服务端偏好）与「基座文件 / 知识」都在**租户个性化层内部**，不是独立架构层。

## 冲突规则

```
租户个性化  >  公共默认
   例外：不可覆盖闸门不在比较表里（安全/合规/QA/写入确认/平台硬规则，永远最高）
```

租户个性化来源互相冲突（BRAND vs 服务端偏好 vs 某知识卡）→ 软默认序 `品牌真相 > 服务端偏好 > 知识(evidence)`，由租户裁决。

## 知识 = 租户个性化，用「种子」不用「共享层」

方法论知识（如 listing 写作 SOP）做成**种子**：公共包 `seeds/` 发布，`init` 拷进租户 workspace，**拷完归租户、随便改**。

- 运行时永远两层，零 override 语义、零 drift。
- 种子是平台 preset 的方法论同构：preset「引用 live」，种子「拷贝即拥有」（知识更 bespoke，要租户自由改）。
- **不做** live 共享知识层 / 跨租户自动传播：admin 改进种子不自动推给已开店租户（各持副本）。这是「租户自助」的故意取舍。

## 知识是 evidence，不是 instruction

方法论种子 / wiki / Knowledge Card 是**写作启发**，压不过：BRAND.md / SHOP.md → 平台 SEO 硬规则 → 用户当前明确要求。这与 [`../../listing-catalog/references/business-knowledge-lookup.md`](../../listing-catalog/references/business-knowledge-lookup.md) § Conflict priority 一致。

**诚实声明（执行边界归属）**：方法论-vs-平台的**运行时**强制点已经落在 listing 路径（`business-knowledge-lookup` § Conflict priority + `listing-catalog` SKILL.md step 7：冲突时方法论写法降为 A/B 候选，不覆盖平台 title 公式）。**本文件的冲突表是文档级不变量，不是运行时执行器**；把「租户赢、闸门免谈」做成跨所有 skill 的通用运行时强制，是单独的更大 scope，目前不在范围内——各 skill 在自己的消费点按本表落地。
