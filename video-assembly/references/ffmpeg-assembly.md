# FFmpeg 装配命令参考

## 参数化调用原则

**禁止字符串拼接**。所有文件路径和动态值作为独立数组元素传递给进程 spawn，不经过 shell 解释。

```python
# 正确：参数化
subprocess.run([
    "ffmpeg",
    "-i", hook_path,
    "-i", body_path,
    "-i", close_path,
    "-i", music_path,
    "-filter_complex", filter_graph,
    "-map", "[vfinal]",
    "-map", "3:a",
    "-shortest",
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-y", output_path
])

# 错误：字符串拼接（命令注入风险）
# os.system(f"ffmpeg -i {hook_path} ...")
```

## 标准 filter_complex

### 视频标准化 + 拼接 + 文字叠加

```
[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];
[1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];
[2:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v2];
[v0][v1][v2]concat=n=3:v=1:a=0[vout];
[vout]drawtext=text='OVERLAY_TEXT':fontfile=FONTFILE:fontsize=48:fontcolor=white:x=(w-text_w)/2:y=SAFE_Y[vfinal]
```

### 变量替换

| 变量 | 来源 | 说明 |
|------|------|------|
| `OVERLAY_TEXT` | 从产品卖点 + BRAND.md 生成 | 需 escape 单引号（`'` → `'\''`）和冒号（`:` → `\\:`） |
| `FONTFILE` | `references/config.md` §字体路径 | CJK 字体文件绝对路径 |
| `SAFE_Y` | 平台安全区查表 | tiktok=h*0.75, instagram=h*0.78, pinterest=h*0.85, xiaohongshu=h*0.72 |

## 音乐处理

```
-shortest -af "afade=t=out:st=FADE_START:d=2"
```

- `-shortest`：视频结束时音乐自动截断
- `afade=out`：最后 2 秒淡出，避免突然截断
- `FADE_START` = 视频总时长 - 2（由拼接前计算得出）

## Thumbnail 抽帧

```bash
ffmpeg -i OUTPUT.mp4 -vframes 1 -q:v 2 OUTPUT_thumb.jpg
```

从成品视频第一帧（即 Hook 开头）抽取封面图。

## 输出规格

| 参数 | 值 | 说明 |
|------|------|------|
| 分辨率 | 1080×1920 | 9:16 竖屏（MVP 唯一规格） |
| 编码 | H.264 (libx264) | 兼容性最好 |
| preset | fast | 速度与质量平衡 |
| CRF | 23 | 视觉质量好 + 文件不太大 |
| 音频 | AAC 128kbps | 社交平台标准 |

## 输出路径

```
<workspace>/output/video-assembly/<product_id>/<job_id>.mp4
<workspace>/output/video-assembly/<product_id>/<job_id>_thumb.jpg
```

输出路径也存为工作区相对路径到 video_jobs 表的 `output_path` 字段。
