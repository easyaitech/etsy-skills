---
name: video-assembly
description: 从已标记的视频片段库（clips 表）批量装配短视频，支持 TikTok / Instagram / Pinterest / 小红书等目标平台的安全区和 video_jobs 记录。三种模式：(1) "建库 / 导入片段 / 打标签"——扫描文件夹 + AI 辅助标签 + 写入 clips 表；(2) "生成视频 / 批量装配 / 给 SKU 出视频 / 小红书视频"——按兼容性组合 + FFmpeg 拼接 + 回写 video_jobs；(3) "审核视频 / review"——列出已生成视频供人工 approve/reject。
---

# Video Assembly — 社交媒体短视频模块化装配线

把电商店铺的「产品 + 视频片段库 + 品牌底座」按兼容性规则批量组合成短视频（Hook + Body + Close），用 FFmpeg 本地拼接输出 MP4。

**架构**：本 skill 维护**语义层**（clips 表管片段元数据、video_jobs 表管生成记录），物理视频处理使用本地 FFmpeg。

**对外的实操接口**：
- 飞书 Base（用 `lark-base` skill 操作店铺总 Base 内 clips / video_jobs 表 + 反查 `Products 商品` 表）
- 工作区根目录的 BRAND.md（用 `shop-foundation` 维护）
- FFmpeg 本地命令行（`brew install ffmpeg`）
- CJK 字体文件（如 NotoSansCJK）
- 本 skill 自带脚本（`video-assembly/scripts/`）

**脚本清单**（Hermes 可直接调用）：

| 脚本 | 用途 | 输入 | 输出 |
|------|------|------|------|
| `check-deps.sh [workspace]` | 前置就绪检查 | workspace 路径 | JSON：ok/missing |
| `scan-clips.sh <dir> [workspace]` | 扫描片段元数据 | 片段文件夹 | JSONL：每行一个片段 |
| `extract-frames.sh <video> <out_dir> [n]` | 提取代表帧 | 视频文件 | 帧文件路径列表 |
| `combine.sh --clips-json FILE [--exclude-json FILE] [--limit N]` | 生成兼容组合 | clips JSON | JSONL：组合候选 |
| `assemble.sh --hook --body --close --music --output --fontfile --platform [--text] [--thumb]` | 单条 FFmpeg 拼接 | 各文件路径 | JSON：结果 |
| `batch-assemble.sh --clips-json --workspace --platform --music-dir --fontfile [--limit] [--exclude-json]` | 批量装配 | 配置 | JSONL：逐条结果 |

所有脚本位于 `$INSTALL_DIR/video-assembly/scripts/`，Hermes 通过绝对路径调用。

> 「工作区根」指 `ecommerce-stack workspace`（旧命令 `etsy-stack workspace` 兼容）解析出的绝对路径——见 shop-foundation §工作区路径解析。本 skill 读 BRAND.md 或写输出前必须先调一次该命令；解析失败按 shop-foundation 的指引停下问用户，不要猜路径。

---

## 启动检查（每次激活）

开始向用户输出之前，**静默**执行一次：

```
bash "${ECOMMERCE_SKILLS_HOME:-${ETSY_SKILLS_HOME:-$HOME/.local/share/etsy-skills}}/scripts/check-update.sh"
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
| 4 | clips 表已存在 | 先读 `<workspace>/docs/store-base.md`，确认店铺总 Base 内已配置 `clips` 表；迁移期可只读旧独立 Clips 数据源 | 「clips 表还没建。要现在在店铺总 Base 里建吗？我会按 schema 引导你。」 |
| 5 | video_jobs 表已存在（仅 Mode B） | 先读 `<workspace>/docs/store-base.md`，确认店铺总 Base 内已配置 `video_jobs` 表；迁移期可只读旧独立 Video Jobs 数据源 | 「video_jobs 表还没建。要现在在店铺总 Base 里建吗？」 |
| 6 | `BRAND_MARKETING.md` 存在 | 检查 `<workspace>/BRAND_MARKETING.md` 是否存在 | 「营销策略底座还没建。要用 shop-foundation 建立吗？我会引导你完成营销策略访谈。」 |
| 7 | `MARKETING_PLATFORM.md` 存在 | 检查 `<workspace>/MARKETING_PLATFORM.md` 是否存在 | 「平台内容策略还没建。要用 shop-foundation 建立吗？我会引导你定义各平台的内容规范。」 |

**路由规则**：
- 任何一项失败 → 提议进入 Mode A；用户同意后直接开始 Mode A 流程
- 用户说"以后再说" → 尊重，不反复催促；告知用户「好的，需要时随时说」

---

## 依赖关系（每次装配 / 审核前必读）

| 来源 | 提供什么 | 怎么用 |
|---|---|---|
| `<workspace>/BRAND.md` | 文案语调 / 品牌关键词 | overlay 文案遵守品牌调性；CTA 用品牌话术 |
| `<workspace>/BRAND_MARKETING.md` | 营销定位 / 人群 / 情感触点 / 场景矩阵 / 红线 | overlay 文案的情感锚点；视频选题归属场景矩阵；红线过滤 |
| `<workspace>/MARKETING_PLATFORM.md` | 目标平台的内容规范 / 配比 / 视频脚本模板 | 视频时长、结构、视觉规范按目标平台章节执行；配比指导选题优先级 |
| `Products 商品` 表（listing-catalog）| `product_id` / 标题 / 核心卖点 | 筛选片段 + 生成 overlay 文案 |
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
1. 解析工作区根（`ecommerce-stack workspace`，旧命令 `etsy-stack workspace` 兼容），得到 `$WS`
2. 如 clips 表不存在，按 `references/clips-table-schema.md` 用 `lark-base` 在店铺总 Base 内创建或补齐 clips 表；若店铺总 Base 不存在，先展示 one-shop-one-base 方案并等用户确认
3. 如 video_jobs 表不存在，按 `references/video-jobs-table-schema.md` 用 `lark-base` 在店铺总 Base 内创建或补齐 video_jobs 表
4. 用户提供片段文件夹路径（相对于 workspace root）
5. 扫描片段元数据：
   ```bash
   video-assembly/scripts/scan-clips.sh <clips_dir> "$WS"
   ```
   输出 JSONL，每行含 file/rel_path/duration_sec/width/height
6. 逐个片段引导打标签：
   - **必填**：stage（hook/body/close）、product_id（duration_sec 已自动获取）
   - **可选**：style_tags、mood、overlay_text、compatible_with
7. AI 辅助标签建议：提取代表帧后做视觉分析
   ```bash
   video-assembly/scripts/extract-frames.sh "$WS/<file_path>" /tmp/frames 3
   ```
   对提取的帧图片分析画面内容，建议 style_tags 和 mood
8. 写入 clips 表（`approved = false`，用户后续审核通过后改为 true）
9. 引导设置兼容性：基于相同产品 + 相似 style_tags 自动生成初始建议，用户确认或调整
10. 提示用户：「片段已入库。请逐条审核后将 approved 改为 true，之后可用 Mode B 批量装配。」

### 模式 B：批量装配（batch assembly）

**进入条件**：
- 用户要生成视频 / 批量装配 / 给某 SKU 出视频
- **前置就绪检查全部通过**

**执行步骤**：
1. 解析工作区根（`ecommerce-stack workspace`，旧命令 `etsy-stack workspace` 兼容），得到 `$WS`
2. 运行前置就绪检查：
   ```bash
   video-assembly/scripts/check-deps.sh "$WS"
   ```
   任何一项失败 → 按失败话术回复，停止
3. 一次性收集输入（不要边做边追问）：
   - 目标产品（product_id 或产品名）
   - 生成数量（默认 5）
   - 目标平台（tiktok / instagram / pinterest / xiaohongshu，默认 tiktok）
4. 用 `lark-base` 从 clips 表筛选：`product_id = 目标` AND `approved = true`
5. **空结果处理**：
   - 无 approved 片段 → 告知「该产品下没有已审核的片段。请先用 Mode A 导入并审核片段。」
   - 有片段但某 stage 缺失 → 告知「缺少 {stage} 类型的片段，无法组合完整视频。」
6. 导出筛选结果为 JSON 文件：`/tmp/clips-$PRODUCT_ID.json`
7. 从 video_jobs 表导出已有组合为 exclude JSON：`/tmp/exclude-$PRODUCT_ID.json`
8. 生成组合候选：
   ```bash
   video-assembly/scripts/combine.sh --clips-json /tmp/clips-$PRODUCT_ID.json \
     --exclude-json /tmp/exclude-$PRODUCT_ID.json --limit $NUM
   ```
   如输出含 `"error"` → 按错误类型告知用户
9. 为每个组合生成 overlay 文案：从产品卖点 + BRAND.md + MARKETING_PLATFORM.md 提取，简短有力；小红书默认中文，海外平台默认英文，配置优先
10. 逐条执行 FFmpeg 装配：
    ```bash
    video-assembly/scripts/assemble.sh \
      --hook "$WS/<hook_file>" \
      --body "$WS/<body_file>" \
      --close "$WS/<close_file>" \
      --music "<matched_music>" \
      --output "$WS/output/video-assembly/$PRODUCT_ID/$JOB_ID.mp4" \
      --text "<overlay_copy>" \
      --fontfile "<fontfile_from_check_deps>" \
      --platform "$PLATFORM"
    ```
    或批量模式：
    ```bash
    video-assembly/scripts/batch-assemble.sh \
      --clips-json /tmp/clips-$PRODUCT_ID.json \
      --workspace "$WS" \
      --platform "$PLATFORM" \
      --music-dir "$WS/assets/music" \
      --fontfile "<fontfile>" \
      --limit $NUM \
      --exclude-json /tmp/exclude-$PRODUCT_ID.json
    ```
11. 解析结果 JSONL，对每条：
    - `ok=true` → 用 `lark-base` 写 video_jobs（status=generated, output_path, thumb_path, music_track）
    - `ok=false` + `duration_too_*` → 跳过，不写表
    - `ok=false` + `ffmpeg_failed` → 写 video_jobs（status=error, error_msg）
12. 汇总报告：「生成 X 条 / 跳过 Y 条（时长不合规）/ 失败 Z 条。输出目录：`output/video-assembly/$PRODUCT_ID/`」

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
| xiaohongshu | h×0.72 | 保守避开底部互动栏与标题区；具体以 MARKETING_PLATFORM.md 校准 |

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
- **listing-catalog**：读 `Products 商品` 表取产品信息（product_id / 标题 / 卖点）
- **assets-library**：视频片段独立管理在 clips 表，不复用图片素材表；但原始素材文件可放在 assets-library 管理的同一目录结构下
- **content-asset-pool**：小红书 / TikTok / Instagram / Pinterest 视频通过发布任务池排队；本 skill 只生成视频文件和 video_jobs 记录，不执行真实发布
- **pinterest-autopin**：MVP 独立运行；后续迭代可能将 approved 视频自动进入 pinterest-autopin 发布队列

---

## 工作语言

通用规则见 shop-foundation §工作语言。本 skill 特有：
- overlay 文案语言由 MARKETING_PLATFORM.md / COMMERCE_PLATFORM.md 决定；小红书默认中文，海外平台默认英文
- 与用户的交互用**中文**
- clips / video_jobs 表字段标签按 schema 文件中的规范
