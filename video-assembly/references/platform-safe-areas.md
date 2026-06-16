# 平台安全区参考

## 问题

社交媒体平台在短视频底部叠加 UI 元素（按钮、描述文字、头像等），如果 overlay 文字放在这些区域会被遮挡。

## 安全区定义

drawtext filter 的 `y` 参数按目标平台设置：

| Platform | y 表达式 | 像素值 (1920h) | 被遮挡的 UI |
|----------|----------|----------------|-------------|
| tiktok | `h*0.75` | 1440 | 底部：点赞/评论/分享按钮 + 描述文字 + 音乐信息 |
| instagram | `h*0.78` | 1498 | Reels 底部：用户名 + 描述 + 音频标签 |
| pinterest | `h*0.85` | 1632 | Video Pin 底部描述栏较窄 |
| xiaohongshu | `h*0.72` | 1382 | 保守避开底部互动栏与标题区；具体以 MARKETING_PLATFORM.md 校准 |

## 在 filter_complex 中使用

```
drawtext=text='TEXT':fontfile=FONT:fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h*0.75
```

将 `0.75` 替换为目标平台对应的系数。

## 注意事项

- 以上数值基于 2026 年初各平台 UI 布局和保守安全区策略，平台可能随时调整
- 安全策略：宁可偏高（文字靠上）也不要偏低（被遮挡）
- 如果文字较长需要分行，第二行 y 值再加 fontsize*1.5
- x 居中公式 `(w-text_w)/2` 对所有平台通用
