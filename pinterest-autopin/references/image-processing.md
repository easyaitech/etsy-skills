# Image Processing（Pinterest 发布图片处理流程）

所有进入 Pin Queue 的图片在写入 Base **之前**统一生成一份发布副本：AI metadata / AI watermark 清理 + 无损压缩。处理后的图片存到 `<workspace>/.cache/pinterest-autopin/processed/`，原始素材不动。

多图 pin（轮播）时每张图独立走同一流程，输出路径各自独立。

本流程遵守 [`shared/ai-image-sanitization.md`](../../shared/ai-image-sanitization.md)：只处理计划发布到 Pinterest 的副本，不处理素材库原图或待处理素材。

---

## 前置工具

| 工具 | 用途 | 安装 |
|------|------|------|
| `remove-ai-watermarks` | 只清 AI metadata / AI visible watermark | `uv tool install git+https://github.com/wiltodelta/remove-ai-watermarks.git` |
| `jpegoptim` | JPEG 无损压缩（不 strip metadata） | `brew install jpegoptim` |
| `optipng` | PNG 无损压缩（不 strip metadata） | `brew install optipng` |

模式 A 安装阶段用 `which` 检查；缺 `remove-ai-watermarks` 时优先提示 `ecommerce-stack ai-cleaner update`（旧命令 `etsy-stack ai-cleaner update` 兼容）。在 Hermes profile 隔离环境下，安装器可能把可执行文件装到 profile 沙箱内的 `~/.local/bin/remove-ai-watermarks`（该 `~` 不是系统用户 HOME），导致它不在当前 PATH、`ai-cleaner status` 仍显示未安装；此时可直接用该绝对路径执行 metadata 检查/清理。缺 `jpegoptim` / `optipng` 时提示 `brew install jpegoptim optipng`。

---

## 四步处理（单张）

### Step 1：复制到处理目录

```bash
mkdir -p <workspace>/.cache/pinterest-autopin/processed
cp <原始路径> <workspace>/.cache/pinterest-autopin/processed/<原始文件名>
```

不在原始素材上操作。幂等判断：已有同名文件时比较 mtime（`stat -f %m`），源文件更新才覆盖。素材只有飞书链接时用 `lark-drive` 直接下载到 `processed/`。

### Step 2：只清 AI metadata

```bash
remove-ai-watermarks metadata <processed_path> --check
remove-ai-watermarks metadata <processed_path> --remove --keep-standard
```

这一步只移除 AI 相关字段，保留 Author / Copyright / Title 等标准字段。不要再用 `exiftool -all=` 或压缩工具的 strip-all 参数；它们会删除非 AI metadata，不符合本 stack 的发布副本边界。

### Step 3：清 AI visible watermark（条件触发）

仅当素材来自 AI 合成，或素材备注 / sidecar 含 `[AI 合成]` 时执行：

```bash
remove-ai-watermarks visible <processed_path> -o <processed_path> --strip-metadata
```

检测不到支持的 AI visible watermark 时不强行擦除。不要删除用户或品牌主动加上的商标、版权水印、署名水印。

默认不跑 `remove-ai-watermarks invisible` / `all`：这会用 diffusion 重写整张图像，可能改变商品纹理、文字和边缘。只有用户明确要求隐形 AI watermark 清理，并接受画面可能变化时才使用。

### Step 4：无损压缩

压缩必须保留非 AI metadata；不要使用 strip 参数。

| 格式 | 命令 |
|------|------|
| JPEG | `jpegoptim <processed_path>` |
| PNG | `optipng -o2 <processed_path>` |
| WebP / 其他 | 跳过压缩，只做 Step 2 / Step 3 |

---

## 多图处理（轮播 pin）

轮播 pin 有 2-5 张图，每张图独立走上面的四步流程。处理时注意：

1. **按顺序逐张处理**——不要并发（避免输出记录和文件名冲突）
2. **文件名冲突**：如果多张素材原始文件名相同（来自不同目录），在 `processed/` 写入时加序号后缀避免覆盖。命名规则：`{原始文件名不含扩展名}-{序号}.{扩展名}`，序号从 1 开始，仅在冲突时添加
3. **全部处理完成后再进入下一步**——任何一张处理失败时整条 pin 中止，提示用户处理失败的具体图片
4. **处理结果**：输出路径列表，顺序与用户选择的素材顺序一致，作为 Pin Queue Base `image 路径` 的值（每行一个路径）

### 示例（3 张图的轮播 pin）

```bash
# 图 1
cp /原始/cup-front.jpg <workspace>/.cache/pinterest-autopin/processed/cup-front.jpg
remove-ai-watermarks metadata <workspace>/.cache/pinterest-autopin/processed/cup-front.jpg --remove --keep-standard
jpegoptim <workspace>/.cache/pinterest-autopin/processed/cup-front.jpg

# 图 2
cp /原始/cup-detail.jpg <workspace>/.cache/pinterest-autopin/processed/cup-detail.jpg
remove-ai-watermarks metadata <workspace>/.cache/pinterest-autopin/processed/cup-detail.jpg --remove --keep-standard
jpegoptim <workspace>/.cache/pinterest-autopin/processed/cup-detail.jpg

# 图 3
cp /原始/cup-lifestyle.jpg <workspace>/.cache/pinterest-autopin/processed/cup-lifestyle.jpg
remove-ai-watermarks metadata <workspace>/.cache/pinterest-autopin/processed/cup-lifestyle.jpg --remove --keep-standard
jpegoptim <workspace>/.cache/pinterest-autopin/processed/cup-lifestyle.jpg
```

---

## 处理结果

- **单图 pin**：输出路径 = `<workspace>/.cache/pinterest-autopin/processed/<原始文件名>`
- **轮播 pin**：输出路径列表，每个路径各占一行，作为 Pin Queue Base 的 `image 路径` 值

两种情况都作为 `request.json` 的 `images` 数组元素中的 `path` 字段。

调用方需要在 Pin Queue Base 的备注 / 失败原因等可审计字段中记录：

```json
{
  "aiSanitization": {
    "status": "applied",
    "tool": "remove-ai-watermarks",
    "steps": ["metadata", "visible"],
    "invisibleOptIn": false
  }
}
```

如果无 AI metadata 且未检测到可见 AI watermark，`status` 写 `checked-noop`。

---

## 禁止事项

- 不要改原始素材文件
- 不要用有损压缩（Pinterest 会再压一次，双重劣化）
- 不要跳过 AI metadata / AI watermark 清理 gate
- 不要用 `exiftool -all=` / `jpegoptim --strip-all` / `optipng -strip all` 清空所有 metadata
- 不要因为轮播图片多就跳过某张图的处理——每张都必须走完整流程
