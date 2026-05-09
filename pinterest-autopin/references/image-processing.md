# Image Processing（图片处理流程）

所有进入 Pin Queue 的图片在写入 Base **之前**统一走一遍处理：清除元数据 + 无损压缩。处理后的图片存到 `<workspace>/.cache/pinterest-autopin/processed/`，原始素材不动。

---

## 前置工具

| 工具 | 用途 | 安装 |
|------|------|------|
| `exiftool` | 清除 EXIF / IPTC / XMP / GPS 等元数据 | `brew install exiftool` |
| `jpegoptim` | JPEG 无损压缩 | `brew install jpegoptim` |
| `optipng` | PNG 无损压缩 | `brew install optipng` |

模式 A 安装阶段用 `which` 检查；缺哪个提示用户 `brew install`。

---

## 三步处理

### Step 1：复制到处理目录

```bash
mkdir -p <workspace>/.cache/pinterest-autopin/processed
cp <原始路径> <workspace>/.cache/pinterest-autopin/processed/<原始文件名>
```

不在原始素材上操作。幂等判断：已有同名文件时比较 mtime（`stat -f %m`），源文件更新才覆盖。素材只有飞书链接时用 `lark-drive` 直接下载到 `processed/`。

### Step 2：清除元数据

```bash
exiftool -all= -overwrite_original <processed_path>
```

清除所有可写标签，保留 ICC Profile（色彩准确性）。

### Step 3：无损压缩

压缩工具的 strip 操作与 Step 2 有重叠，属于有意的双重保障——不要移除任何一步。

| 格式 | 命令 |
|------|------|
| JPEG | `jpegoptim --strip-all <processed_path>` |
| PNG | `optipng -o2 -strip all <processed_path>` |
| WebP / 其他 | 跳过，只做 Step 2 |

---

## 处理结果

输出路径 = `<workspace>/.cache/pinterest-autopin/processed/<原始文件名>`，作为 Pin Queue Base 的 `image 路径` 和 `request.json` 的 `image` 字段。

---

## 禁止事项

- 不要改原始素材文件
- 不要用有损压缩（Pinterest 会再压一次，双重劣化）
- 不要跳过元数据清理（AI 生成图也可能带隐藏元数据）
