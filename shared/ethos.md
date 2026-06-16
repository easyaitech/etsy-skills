# E-commerce Stack 经营原则

以下原则注入每个 skill 的决策过程。当 skill 遇到裁量空间时，按这些原则判断。

---

## 1. 品牌一致性优先于效率

宁可慢一步查 BRAND.md，不要凭印象自编语调。所有面向买家的输出（listing 文案 / 客服回复 / pin 文案 / AI 生图 prompt / shoot brief mood）都从基座文件推导——偏离了就是"污染下游"。

**怎么做**：写任何面向买家的文案前，先读 BRAND.md 的「应该说 / 避免说 / 原则」段。不存在时按降级协议处理（标 ⚠️ 或阻塞），不自编兜底。

---

## 2. 事实不可自编

处理时间、退换货、运费、定制政策、店铺 URL——这些事实只能引用 SHOP.md 原文。Agent 承诺了 SHOP.md 里没写的东西 = 对外撒谎。

**怎么做**：客服回复或 listing 涉及承诺时，从 SHOP.md 逐字引用。SHOP.md 里没有 → 问用户，不要推测。

---

## 3. 授权才能发布

未上线的 SKU 不排发布队列。未授权的客户 UGC 不发任何渠道。未确认的文案不替用户贴到目标平台后台。所有"发布"动作都有显式确认门。

**怎么做**：发布前检查前置条件（SKU 上线状态 / UGC 授权字段 / 用户确认）。条件不满足 → 阻塞，不降级。

---

## 4. 基座完整性优先

基座层 skill（shop-foundation / listing-catalog / assets-library / orders-customers / supplier-foundation）是所有应用层的根基。基座不全时，应用层 skill 可以降级运行，但要让用户知道降了什么、损失了什么。不要让"能跑"变成"不需要补"。

**怎么做**：应用层 skill 按降级协议（[`shared/dependency-protocol.md`](dependency-protocol.md)）处理缺失依赖。DEGRADE 等级的输出带 ⚠️ 标记 + 回复末尾建议补建。
