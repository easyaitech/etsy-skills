---
name: video-assembly
description: 从已标记的视频片段库（clips 表）批量装配短视频。三种模式：(1) "建库 / 导入片段 / 打标签"——扫描文件夹 + AI 辅助标签 + 写入 clips 表；(2) "生成视频 / 批量装配 / 给 SKU 出视频"——按兼容性组合 + FFmpeg 拼接 + 回写 video_jobs；(3) "审核视频 / review"——列出已生成视频供人工 approve/reject。
---

# Video Assembly — 社交媒体短视频模块化装配线

把 Etsy 店铺的「产品 + 视频片段库 + 品牌底座」按兼容性规则批量组合成短视频（Hook + Body + Close），用 FFmpeg 本地拼接输出 MP4。

**架构**：本 skill 维护**语义层**（clips 表管片段元数据、video_jobs 表管生成记录），物理视频处理使用本地 FFmpeg。

**对外的实操接口**：
- 飞书 Base（用 `lark-base` skill 操作 clips / video_jobs 表 + 反查商品 Base）
- 工作区根目录的 BRAND.md（用 `shop-foundation` 维护）
- FFmpeg 本地命令行（`brew install ffmpeg`）
- CJK 字体文件（如 NotoSansCJK）

> 「工作区根」指 `etsy-stack workspace` 解析出的绝对路径——见 shop-foundation §工作区路径解析。本 skill 读 BRAND.md 或写输出前必须先调一次该命令；解析失败按 shop-foundation 的指引停下问用户，不要猜路径。

---

## 启动检查（每次激活）

开始向用户输出之前，**静默**执行一次：

```
bash ~/.local/share/etsy-skills/scripts/check-update.sh
```

脚本自带 24h 缓存。如果它打印了一行 `💡 …` 提示，把它**原样**附在你最终回复的最后一行；没输出就当无事发生。**不要**解读、不要展开。

如果脚本不存在，跳过这一步，不要报错。

---

## 前置就绪检查（Mode B / C 入口守卫）

用户触发 Mode B 或 Mode C 时，在执行任何业务逻辑之前，**静默**按编号顺序逐项检查，任何一项失败即停止后续检查，直接按该项的失败话术回复并提议进入 Mode A。

| # | 检查项 | 怎么检查 | 失败时怎么说 |
|---|--------|----------|-------------|
| 1 | FFmpeg 已安装 | `which ffmpeg` 返回非空 | 「FFmpeg 还没装。要现在装吗？跑 `brew install ffmpeg` 即可。」 |
| 2 | CJK 字体文件存在 | 检查 `references/config.md` §字体路径 中配置的 fontfile 路径是否存在 | 「CJK 字体文件找不到。要下载 NotoSansCJK 吗？我来引导你设置。」 |
| 3 | 音乐文件夹非空 | 扫描 `<workspace>/assets/music/` 目录，至少有一个 .mp3/.m4a/.wav 文件 | 「音乐文件夹是空的。请在 `<workspace>/assets/music/` 放入至少一个免版权音乐文件。」 |
| 4 | clips 表已存在 | 用 `lark-base` 搜索名称含 `Clips` 的 Base 表 | 「clips 表还没建。要现在建吗？我会按 schema 引导你。」 |
| 5 | video_jobs 表已存在（仅 Mode B） | 用 `lark-base` 搜索名称含 `Video Jobs` 的 Base 表 | 「video_jobs 表还没建。要现在建吗？」 |

**路由规则**：
- 任何一项失败 → 提议进入 Mode A；用户同意后直接开始 Mode A 流程
- 用户说"以后再说" → 尊重，不反复催促；告知用户「好的，需要时随时说」

---

## 依赖关系（每次装配 / 审核前必读）

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` | 文案语调 / 品牌关键词 | overlay 文案遵守品牌调性；CTA 用品牌话术 |
| 商品 Base（listing-catalog）| `product_id` / 标题 / 核心卖点 | 筛选片段 + 生成 overlay 文案 |
| clips 表（本 skill）| 片段元数据 + 兼容性规则 | Mode B 组合源 |
| video_jobs 表（本 skill）| 生成记录 + 状态 | 去重 + 审核 |
| 本地音乐文件 | 背景音乐 | 按 mood 标签匹配 |

如 BRAND.md 缺失，装配前主动提示用户先用 shop-foundation 建立。

---

## 核心概念

### 片段结构

每条短视频由三段拼接：
- **Hook**（0-5s）：抓注意力的开头
- **Body**（5-20s）：展示产品 / 使用场景
- **Close**（2-5s）：CTA / logo / 结尾

### 兼容性规则

`compatible_with` 字段控制哪些片段可以组合：
- **有值**：只能与列出的 clip_id 搭配
- **空值**：与同一 product_id 下所有片段兼容（默认宽松策略，降低冷启动标注成本）

MVP 阶段（<50 片段）使用 clip_id 级别精确匹配；超过 50 片段时迁移到标签组合级别。

### 文件路径

clips 表的 `file_path` 存储**工作区相对路径**（相对于 workspace root）。运行时拼接：`$WORKSPACE_ROOT` + `/` + `file_path`。

---

## 三种执行模式

### 模式 A：建库（clip ingestion）

**进入条件**：
- 用户要导入片段 / 建库 / 打标签
- 项目下尚无 clips 表
- 或 Mode B/C 就绪检查失败后用户同意进入 Mode A

**执行步骤**：
1. 解析工作区根（`etsy-stack workspace`）
2. 如 clips 表不存在，按 `references/clips-table-schema.md` 用 `lark-base` 建表
3. 如 video_jobs 表不存在，按 `references/video-jobs-table-schema.md` 建表
4. 用户提供片段文件夹路径（相对于 workspace root）
5. 扫描文件夹中的视频文件（.mp4 / .mov / .avi）
6. 逐个片段引导打标签：
   - **必填**：stage（hook/body/close）、product_id、duration_sec
   - **可选**：style_tags、mood、overlay_text、compatible_with
7. AI 辅助标签建议：用 FFmpeg 提取 3 帧代表帧，做视觉分析建议 style/mood
   ```bash
   ffmpeg -i INPUT -vf "select='eq(n\,0)+eq(n\,N/2)+eq(n\,N-1)'" -vsync vfr -frames:v 3 frame_%d.jpg
   ```
   其中 N 通过 `ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 INPUT` 获取
8. 自动获取时长：`ffprobe -v error -show_entries format=duration -of csv=p=0 INPUT`
9. 写入 clips 表（`approved = false`，用户后续审核通过后改为 true）
10. 引导设置兼容性：基于相同产品 + 相似 style_tags 自动生成初始建议，用户确认或调整

### 模式 B：批量装配（batch assembly）

**进入条件**：
- 用户要生成视频 / 批量装配 / 给某 SKU 出视频
- **前置就绪检查全部通过**

**执行步骤**：
1. 解析工作区根
2. 一次性收集输入（不要边做边追问）：
   - 目标产品（product_id 或产品名）
   - 生成数量（默认 5）
   - 目标平台（tiktok / instagram / pinterest，默认 tiktok）
3. 用 `lark-base` 从 clips 表筛选：`product_id = 目标` AND `approved = true`
4. **空结果处理**：
   - 无 approved 片段 → 告知「该产品下没有已审核的片段。请先用 Mode A 导入并审核片段。」
   - 有片段但某 stage 缺失 → 告知「缺少 {stage} 类型的片段，无法组合完整视频。」
5. 按兼容性规则生成 Hook × Body × Close 组合候选：
   - 解析 `compatible_with`：空值 = 同产品全兼容
   - 笛卡尔积 → 过滤不兼容组合
6. 去重：排除 video_jobs 表中已生成过的组合（按 hook+body+close clip_id 三元组判断）
   - 无新组合 → 告知「所有兼容组合已生成过。建议补充新片段或调整兼容规则。」
7. 按生成数量截取前 N 个组合
8. 对每个组合执行：
   a. **总时长校验**：hook.duration + body.duration + close.duration，<10s 或 >60s 自动跳过并记录日志
   b. **匹配背景音乐**：从 `<workspace>/assets/music/` 按 mood 标签匹配（无精确匹配时随机选一首）
   c. **生成 overlay 文案**：从产品卖点 + BRAND.md 提取，简短有力（≤15 字）
   d. **FFmpeg 拼接**：按 `references/ffmpeg-assembly.md` 执行（参数化调用，非字符串拼接）
   e. **Thumbnail 抽帧**：从 hook 第一帧提取封面图
      ```bash
      ffmpeg -i OUTPUT.mp4 -vframes 1 -q:v 2 OUTPUT_thumb.jpg
      ```
   f. **结果处理**：
      - FFmpeg 成功 → 写 video_jobs（status=generated）
      - FFmpeg 失败 → 写 video_jobs（status=error, error_msg=stderr），继续下一条
9. 汇总报告：成功 X 条 / 跳过 Y 条 / 失败 Z 条，输出路径

### 模式 C：审核（review）

**进入条件**：
- 用户要审核视频 / review / 查看生成结果
- **前置就绪检查通过**（除 #5 video_jobs 表外）

**执行步骤**：
1. 用 `lark-base` 从 video_jobs 表筛选 `status = generated`
2. 列出待审核视频：job_id / 使用片段 / 产品 / 平台 / 输出路径
3. 用户逐条审核：
   - `approved` → 更新 status=approved
   - `rejected` → 更新 status=rejected
4. rejected 的组合标记为不再生成（后续 Mode B 去重时跳过）
5. 汇总：approved X 条 / rejected Y 条

---

## FFmpeg 调用规范

**必须使用参数化调用**，禁止字符串拼接构造命令。所有文件路径作为独立参数传递，防止文件名含特殊字符时的命令注入风险。

详见 `references/ffmpeg-assembly.md`。

---

## 平台安全区

drawtext 的 y 坐标按平台设置，避免文字被平台 UI 遮挡：

| Platform | Safe Area (y) | 原因 |
|----------|---------------|------|
| tiktok | h×0.75 | 底部按钮 + 描述区 |
| instagram | h×0.78 | Reels 底部 UI |
| pinterest | h×0.85 | Pin 底部描述栏较窄 |

详见 `references/platform-safe-areas.md`。

---

## 写入前的硬性约束

通用协议见 shop-foundation §写入前的硬性约束。本 skill 特有禁区：

- **file_path 必须是工作区相对路径**：不存绝对路径，跨机器可移植
- **不替用户选择音乐版权来源**：只用用户放在 `assets/music/` 下的文件，版权由用户自行保证
- **FFmpeg 调用参数化**：永远不用 shell 字符串拼接构造命令
- **总时长校验是硬护栏**：<10s 或 >60s 的组合静默跳过，不强行输出
- **clips 表写入用 lark-base 的 diff 风格预览** → 等确认 → 落盘
- **approved=false 的片段不参与组合**：只有人工审核通过的片段进入 Mode B

---

## 与其他 skill 的协作

- **shop-foundation**：读 BRAND.md 做文案；缺失时引导用户先建
- **listing-catalog**：读商品 Base 取产品信息（product_id / 标题 / 卖点）
- **assets-library**：视频片段独立管理在 clips 表，不复用图片素材表；但原始素材文件可放在 assets-library 管理的同一目录结构下
- **pinterest-autopin**：MVP 独立运行；后续迭代可能将 approved 视频自动进入 pinterest-autopin 发布队列

---

## 工作语言

通用规则见 shop-foundation §工作语言。本 skill 特有：
- overlay 文案默认**英文**（目标平台面向海外用户）
- 与用户的交互用**中文**
- clips / video_jobs 表字段标签按 schema 文件中的规范
