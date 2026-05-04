# 素材类型与处理方式

> 本文档帮助 Agent 在归档时**判断素材属于哪一类**，并相应给出建议。

| 类型 | 典型特征 | 归档目录 | 处理建议 |
|---|---|---|---|
| 摄影原图（RAW） | `.RAF`、`.CR2`、`.NEF` 等相机 RAW 格式；或大尺寸 `.JPG`（> 5 MB） | `1. 摄影/by-SKU/{SKU}/raw/` | 长期保留，**不删不改**；命名加日期 + 拍摄情境 |
| 摄影成图 | 调色裁切后的 `.JPG` / `.PNG`，准备上 Etsy 用 | `1. 摄影/by-SKU/{SKU}/edited/` | 命名按用途（listing-cover / detail / social）；旧版进 `_archive/` |
| 场景图 | 物件在真实场景里（手握、桌面、自然光） | `1. 摄影/by-SKU/{SKU}/scene/` | 比成图更"日常感"，体现 BRAND.md 视觉原则的"使用中"语境 |
| 视觉模板源文件 | `.PSD` / `.AI` / `.SKETCH` / `.FIG` | `2. 视觉模板/{purpose}/` | 模板是**复用资产**，每改一次新建变体而非覆盖；变体命名带语义（`_minimal-white` `_natural-textured`） |
| 字体源文件 | `.TTF` / `.OTF` / `.WOFF` | `3. 字体/{primary 或 fallback}/` | 必须与许可证一起归档；商用字体的合同 / 收据放同目录 |
| Logo & 品牌标识 | 透明底 PNG / SVG / 各尺寸 | `4. Logo & 品牌标识/{primary 或 monochrome}/` | 必须有透明底版本和单色版本；每次改 Logo 都新建变体不覆盖 |
| 包装物料 | 包装盒设计稿、感谢卡、贴纸 | `5. 物料 & 包装/{packaging-design 或 thank-you-card}/` | 与 SHOP.md "物料设置"段呼应；改版时保留旧版 |
| 客户隐私素材 | 客户提供的定制参考图 | `6. 受限/定制素材/{ORDER-XXXX}/` | **不进公开目录**；订单结束 1 年后可由用户决定是否清理（隐私优先） |
| 临时素材 | 还没决定归类的 | `7. 临时 (待整理)/` | 每月清理一次，超过 3 个月没归类的提醒用户决定 |

## 归档前的视觉合规自检

归档摄影成图 / 视觉模板时，对照 BRAND.md `§ 视觉原则` 自检——主动**提醒**而非否决：

- ❌ 出现 BRAND.md 视觉禁区列表里的元素（红黄金高饱和、龙凤祥云回字纹、Comic Sans 等） → 提醒用户："这张图含视觉禁区元素 X，确认要归档吗？"
- ❌ 视觉气质明显偏离品牌（比如品牌走素雅却归档了高反差 HDR 风格） → 同上
- ✅ 符合或基本符合 → 直接给归档建议

最终决策权在用户。本 skill 只负责提醒，不负责拒绝。

## RAW 文件的特殊处理

- 容量大（一张 RAW 可能 30-100 MB）—— 上传飞书云空间前确认用户的网络条件
- 一般用户不会反复编辑 RAW —— 只在`raw/`目录留一份；编辑过的成图进 `edited/`
- RAW 需要专门的工具打开（Lightroom 等），Agent **不要尝试预览或解析 RAW 文件内容**

## 多平台素材的归档策略

如果同一张图既要 Etsy 又要 Instagram 又要小红书，三种尺寸 / 比例都需要：

```
1. 摄影/by-SKU/TEACUP-001/edited/
├── TEACUP-001_listing-cover_01.jpg     ← Etsy 主图
├── TEACUP-001_listing-detail_01.jpg
├── TEACUP-001_social-square_01.jpg     ← Instagram 方图
└── TEACUP-001_social-portrait_01.jpg   ← 小红书竖图
```

不要为每个平台建子目录（`for-etsy/` `for-ig/`）—— 让用途出现在文件名里更易跨平台搜索。

## 命名 / 结构与现实的张力

理想命名永远不可能 100% 匹配现实。如果某个素材类型频繁打破规则（比如开始做视频，但 `folder-structure.md` 里没有视频目录），**不要硬塞进现有目录**——回到 `folder-structure.md` 看"何时新增顶层目录"那段，决定是否扩骨架。

## 与 listing-catalog 的协作

每次为某 SKU 归档新摄影后，提示用户：

> 「这条 SKU 的摄影目录有更新。要不要我请 listing-catalog 把商品 Base 该 SKU 的『照片链接』字段更新一下？」

不要直接调用 listing-catalog —— 由用户决定是否触发跨 skill 协作。
