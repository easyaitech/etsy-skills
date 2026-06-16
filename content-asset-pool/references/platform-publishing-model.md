# Platform Publishing Model

本模型让同一套素材池兼容单图、多图、视频、图文笔记和未来平台。核心约束：**素材是素材，发布任务是任务**。

---

## 通用发布任务字段

所有平台发布任务至少包含：

- `平台`
- `发布类型`
- `关联素材`
- `素材顺序`
- `封面素材`
- `关联 SKU`
- `标题`
- `描述`
- `链接`
- `标签`
- `状态`
- `自动发布`
- `发布适配器`
- `外部队列 ID`
- `发布 URL`

平台专用字段可以放在 Publishing Queue 的 `平台字段 JSON`、平台子队列或备注中，不进入 Asset Pool 核心 schema。真实执行由 `social-publisher` 按 adapter registry 路由。

---

## 单图发布

适用：Pinterest 单图、Instagram 单图、小红书单图、Etsy Listing 单张图更新。

```text
发布类型 = 单图
关联素材 = ASSET-001
素材顺序 =
1. ASSET-001
封面素材 = ASSET-001
```

规则：

- 关联素材数量必须是 1。
- `素材顺序` 仍然要写，避免未来转成多图时丢顺序。

---

## 多图轮播

适用：Instagram carousel、Pinterest carousel、小红书多图笔记、Etsy Listing 多图组。

```text
发布类型 = 多图轮播
关联素材 = ASSET-001, ASSET-002, ASSET-003
素材顺序 =
1. ASSET-001
2. ASSET-002
3. ASSET-003
封面素材 = ASSET-001
```

规则：

- `关联素材` 可多值，但不代表顺序。
- 顺序只看 `素材顺序`。
- 封面默认第一张，但可人工指定。
- 如果平台有数量限制，由平台发布 skill 校验。例如 Pinterest carousel 可限制 2-5 张。

---

## 视频发布

适用：TikTok、Instagram Reels、小红书视频、Etsy Listing video。

```text
发布类型 = 视频
关联素材 = ASSET-VIDEO-001
封面素材 = ASSET-COVER-001
素材顺序 =
1. ASSET-VIDEO-001
```

规则：

- 视频本体和封面分开记录。
- 封面可以是视频代表帧，也可以是独立图片素材。
- 视频的 metadata / provenance 清理规则另按视频工具链执行；本 skill 仍记录 `发布副本链接`、`发布副本 hash` 和处理备注。

---

## 小红书图文

```text
发布类型 = 图文笔记
平台 = 小红书
关联素材 = ASSET-001, ASSET-002, ASSET-003
封面素材 = ASSET-001
素材顺序 =
1. ASSET-001
2. ASSET-002
3. ASSET-003
```

规则：

- 首图通常承担封面角色，但必须显式写 `封面素材`。
- 正文、标签、话题和标题属于 Publishing Queue，不写回素材池。
- 标题 / 正文 / 标签默认中文；如果 MARKETING_PLATFORM.md 要求双语，再按配置输出。
- 如一篇笔记复用商品素材，`链接` 可为空或填站外允许的落地页；商品型发布仍优先商品 Base `分享链接`。
- `平台字段 JSON` 可保存 `noteType=图文笔记`、话题列表、商品 ID、人工审核备注等；不知道的后台字段写 `待后台确认`。
- 当前 `social-publisher` 尚未启用小红书 adapter，本 skill 只生成小红书发布任务草稿，不登录、不上传、不发布。人工发布后可回填公开笔记 URL 做对账。

## 小红书视频

```text
发布类型 = 视频
平台 = 小红书
关联素材 = ASSET-VIDEO-001
封面素材 = ASSET-COVER-001
素材顺序 =
1. ASSET-VIDEO-001
```

规则：

- 视频本体和封面分开记录；封面可以是视频代表帧，也可以是独立图片素材。
- 标题、正文、标签和话题写在 Publishing Queue；视频文件和封面文件仍只作为素材引用。
- 平台尺寸、安全区和脚本模板以 MARKETING_PLATFORM.md 为准；缺配置时只建草稿，不声称已满足平台最佳实践。
- 当前 `social-publisher` 尚未启用小红书 adapter，发布动作交给未来小红书 adapter 或用户手动后台处理。

---

## Instagram Carousel

```text
发布类型 = 多图轮播
平台 = Instagram
关联素材 = ASSET-001, ASSET-002, ASSET-003
素材顺序 =
1. ASSET-001
2. ASSET-002
3. ASSET-003
```

规则：

- 平台裁切、安全区、hashtag 和 caption 由 Instagram 发布 skill 或后续平台规则处理。
- 素材池只记录素材和发布副本，不把 Instagram 专用字段写进素材池。

---

## Pinterest Carousel

```text
发布类型 = 多图轮播
平台 = Pinterest
关联素材 = ASSET-001, ASSET-002, ASSET-003
素材顺序 =
1. ASSET-001
2. ASSET-002
3. ASSET-003
```

协作规则：

- 下游 `social-publisher` 读取 Publishing Queue，并调用 `pinterest-autopin` adapter 创建或补齐 Pin Queue。
- Pin Queue 的 `关联 SKU` 写 SKU + 商品 record_id + 平台商品 ID（如 Etsy Listing ID / ASIN / item_id）。
- Pin Queue 的 `Link` 使用商品 Base `分享链接`，不临时拼任何平台商品 URL。
- Pinterest 发布成功后回写 `发布 URL` 到 Publishing Queue。
- `发布适配器 = pinterest-autopin`；`外部队列 ID` 保存 Pin Queue 的 `pin_id`。

---

## Etsy Listing

```text
发布类型 = 图文混合
平台 = Etsy
关联素材 = ASSET-001, ASSET-002, ASSET-003, ASSET-VIDEO-001
素材顺序 =
1. ASSET-001
2. ASSET-002
3. ASSET-003
4. ASSET-VIDEO-001
```

规则：

- Etsy Listing 的商品事实归 `listing-catalog`。
- 本 skill 只准备和追踪素材发布副本，不替用户上架或修改 Etsy 后台。
- `链接` 仍取商品 Base `分享链接`，如果是尚未上线 SKU，可留空并阻塞对外发布任务。
