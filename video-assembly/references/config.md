# Video Assembly 配置

## 字体路径

CJK 字体文件用于 FFmpeg drawtext filter。推荐使用 Noto Sans CJK：

### macOS 默认位置

```
/System/Library/Fonts/STHeiti Light.ttc
```

或手动安装 NotoSansCJK 后：

```
/Library/Fonts/NotoSansCJKsc-Regular.otf
```

### 安装 NotoSansCJK（如不存在）

```bash
brew install font-noto-sans-cjk-sc
```

安装后路径通常为：
```
~/Library/Fonts/NotoSansCJKsc-Regular.otf
```

### 配置方式

在工作区创建 `.video-assembly.yaml`：

```yaml
fontfile: /Library/Fonts/NotoSansCJKsc-Regular.otf
```

如未配置，skill 按以下顺序尝试：
1. `<workspace>/.video-assembly.yaml` 中的 `fontfile`
2. `/Library/Fonts/NotoSansCJKsc-Regular.otf`
3. `~/Library/Fonts/NotoSansCJKsc-Regular.otf`
4. `/System/Library/Fonts/STHeiti Light.ttc`

全部找不到时触发前置就绪检查失败。

## 音乐目录

```
<workspace>/assets/music/
```

按 mood 标签命名子文件夹是可选的好习惯：

```
assets/music/
├── energetic/
│   ├── upbeat-01.mp3
│   └── drive-02.mp3
├── calm/
│   ├── ambient-01.mp3
│   └── soft-piano-02.mp3
└── cozy/
    └── acoustic-01.mp3
```

如果没有子文件夹，音乐匹配退化为随机选择。

## 输出目录

```
<workspace>/output/video-assembly/
```

自动按 product_id 创建子目录。
