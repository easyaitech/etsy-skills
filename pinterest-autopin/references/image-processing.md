# Image Processing（图片处理流程）

所有进入 Pin Queue 的图片在写入 Base **之前**统一走一遍处理：清除元数据 + 无损压缩。处理后的图片存到 `<workspace>/.cache/pinterest-autopin/processed/`，原始素材不动。

多图 pin（轮播）时每张图独立走同一流程，输出路径各自独立。

---

## 前置工具

| 工具 | 用途 | 安装 |
|------|------|------|
| `exiftool` | 清除 EXIF / IPTC / XMP / GPS 等元数据 | `brew install exiftool` |
| `jpegoptim` | JPEG 无损压缩 | `brew install jpegoptim` |
| `optipng` | PNG 无损压缩 | `brew install optipng` |

模式 A 安装阶段用 `which` 检查；缺哪个提示用户 `brew install`。

---

## 三步处理（单张）

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

## 多图处理（轮播 pin）

轮播 pin 有 2-5 张图，每张图独立走上面的三步流程。处理时注意：

1. **按顺序逐张处理**——不要并发（避免 `exiftool` 进程冲突）
2. **文件名冲突**：如果多张素材原始文件名相同（来自不同目录），在 `processed/` 写入时加序号后缀避免覆盖。命名规则：`{原始文件名不含扩展名}-{序号}.{扩展名}`，序号从 1 开始，仅在冲突时添加
3. **全部处理完成后再进入下一步**——任何一张处理失败时整条 pin 中止，提示用户处理失败的具体图片
4. **处理结果**：输出路径列表，顺序与用户选择的素材顺序一致，作为 Pin Queue Base `image 路径` 的值（每行一个路径）

### 示例（3 张图的轮播 pin）

```bash
# 图 1
cp /原始/cup-front.jpg <workspace>/.cache/pinterest-autopin/processed/cup-front.jpg
exiftool -all= -overwrite_original <workspace>/.cache/pinterest-autopin/processed/cup-front.jpg
jpegoptim --strip-all <workspace>/.cache/pinterest-autopin/processed/cup-front.jpg

# 图 2
cp /原始/cup-detail.jpg <workspace>/.cache/pinterest-autopin/processed/cup-detail.jpg
exiftool -all= -overwrite_original <workspace>/.cache/pinterest-autopin/processed/cup-detail.jpg
jpegoptim --strip-all <workspace>/.cache/pinterest-autopin/processed/cup-detail.jpg

# 图 3
cp /原始/cup-lifestyle.jpg <workspace>/.cache/pinterest-autopin/processed/cup-lifestyle.jpg
exiftool -all= -overwrite_original <workspace>/.cache/pinterest-autopin/processed/cup-lifestyle.jpg
jpegoptim --strip-all <workspace>/.cache/pinterest-autopin/processed/cup-lifestyle.jpg
```

---

## 处理结果

- **单图 pin**：输出路径 = `<workspace>/.cache/pinterest-autopin/processed/<原始文件名>`
- **轮播 pin**：输出路径列表，每个路径各占一行，作为 Pin Queue Base 的 `image 路径` 值

两种情况都作为 `request.json` 的 `images` 数组元素中的 `path` 字段。

---

## 禁止事项

- 不要改原始素材文件
- 不要用有损压缩（Pinterest 会再压一次，双重劣化）
- 不要跳过元数据清理（AI 生成图也可能带隐藏元数据）
- 不要因为轮播图片多就跳过某张图的处理——每张都必须走完整三步
