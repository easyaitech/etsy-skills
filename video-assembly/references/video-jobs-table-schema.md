# Video Jobs 表 Schema

表位置：店铺总 Base 内的 `video_jobs` 表。迁移期旧独立 Video Jobs 数据源只作为只读来源。

## 字段定义

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| job_id | 文本 | ✓ | 唯一标识，格式 `vj-{uuid-short}` |
| hook_clip_id | 关联 | ✓ | 使用的 Hook 片段（关联 clips 表） |
| body_clip_id | 关联 | ✓ | 使用的 Body 片段（关联 clips 表） |
| close_clip_id | 关联 | ✓ | 使用的 Close 片段（关联 clips 表） |
| product_id | 关联 | ✓ | 目标产品（关联 `Products 商品` 表） |
| music_track | 文本 | ✓ | 使用的背景音乐文件名 |
| overlay_copy | 文本 | | 叠加的文案内容 |
| platform | 单选 | ✓ | tiktok / instagram / pinterest / xiaohongshu |
| output_path | 文本 | | 输出文件路径（工作区相对路径） |
| thumb_path | 文本 | | 封面图路径（工作区相对路径） |
| status | 单选 | ✓ | pending / generated / approved / rejected / error |
| error_msg | 文本 | | FFmpeg 错误信息（仅 status=error 时有值） |
| generated_at | 日期 | | 生成时间 |
| reviewed_at | 日期 | | 审核时间 |

## 单选项枚举

### platform
- tiktok
- instagram
- pinterest
- xiaohongshu

### status
- pending — 已创建记录，等待 FFmpeg 处理
- generated — FFmpeg 成功，等待人工审核
- approved — 人工审核通过，可发布
- rejected — 人工审核不通过，不再使用
- error — FFmpeg 处理失败

## 状态机

```
pending ──FFmpeg 成功──→ generated ──人工审核──→ approved
   │                       │
   │                       └──人工审核──→ rejected
   │
   └──FFmpeg 失败──→ error
```

## 推荐视图

| 视图名 | 筛选条件 | 用途 |
|--------|----------|------|
| 待审核 | status = generated | Mode C 工作视图 |
| 已通过 | status = approved | 可发布列表 |
| 失败记录 | status = error | 排查 FFmpeg 问题 |
| 按产品 | 按 product_id 分组 | 查看产品视频产能 |

## 去重逻辑

Mode B 生成组合前，检查 video_jobs 表是否已存在相同的 (hook_clip_id, body_clip_id, close_clip_id) 三元组：
- 存在且 status ≠ error → 跳过（已生成或已审核）
- 存在且 status = rejected → 跳过（人工判定不可用）
- 存在且 status = error → 可重新生成（上次失败不应永久封锁）
- 不存在 → 新组合，可生成

## output_path 规范

- 工作区相对路径
- 格式：`output/video-assembly/<product_id>/<job_id>.mp4`
- thumb_path 格式：`output/video-assembly/<product_id>/<job_id>_thumb.jpg`
