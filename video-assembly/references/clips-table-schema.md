# Clips 表 Schema（飞书 Base）

表名：`{店铺名}-Clips`

## 字段定义

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clip_id | 文本 | ✓ | 唯一标识，格式 `clip-{uuid-short}` |
| stage | 单选 | ✓ | `hook` / `body` / `close` |
| product_id | 关联 | ✓ | 关联 products 表 |
| style_tags | 多选 | | 极简 / 暖调 / 冷调 / 动感 / 安静 / 手工感 / 自然光 |
| mood | 单选 | | energetic / calm / cozy / playful / elegant |
| overlay_text | 文本 | | 片段上的文字内容（如有），仅用于记录参考 |
| duration_sec | 数字 | ✓ | 片段时长（秒），由 ffprobe 自动获取 |
| file_path | 文本 | ✓ | 工作区相对路径（如 `assets/clips/hook-001.mp4`） |
| compatible_with | 多选 | | 可兼容的其他 clip_id 列表。**空值 = 与同一 product_id 下所有片段兼容** |
| approved | 复选框 | ✓ | 是否通过人工审核（默认 false） |
| created_at | 日期 | ✓ | 入库时间（自动填写） |

## 单选项枚举

### stage
- hook
- body
- close

### mood
- energetic
- calm
- cozy
- playful
- elegant

### style_tags
- 极简
- 暖调
- 冷调
- 动感
- 安静
- 手工感
- 自然光

## 推荐视图

| 视图名 | 筛选条件 | 用途 |
|--------|----------|------|
| 全部片段 | 无 | 总览 |
| 已审核 | approved = true | Mode B 取数源 |
| 待审核 | approved = false | Mode A 后续标注 |
| 按产品 | 按 product_id 分组 | 查看单产品库存 |

## file_path 规范

- 必须是工作区相对路径，不含 workspace root 前缀
- 示例：`assets/clips/candle-set/hook-warm-01.mp4`
- 运行时拼接：`$(ecommerce-stack workspace)/assets/clips/candle-set/hook-warm-01.mp4`（旧命令 `etsy-stack workspace` 兼容）
- 不允许出现 `~`、`$HOME`、绝对路径

## compatible_with 语义

- **有值**：只能与列出的 clip_id 组合（精确控制）
- **空值**：与同一 product_id 下所有 approved 片段兼容（宽松默认）
- MVP 阶段（片段库 <50 条）推荐大部分留空，只对已知不兼容的组合做限制
- 超过 50 条时考虑迁移到标签组合级别的兼容规则（见 TODOS.md P2）
