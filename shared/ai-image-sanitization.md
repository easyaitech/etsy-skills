# AI 发布图清理协议

本协议只处理**准备对外发布的图片副本**，目标是去掉 AI 相关 provenance 信号：

- AI metadata：C2PA / EXIF / XMP / PNG text chunks / 平台会识别成 "Made with AI" 的字段。
- AI visible watermark：目前按 `remove-ai-watermarks visible` 支持的 Gemini / Nano Banana sparkle logo。

参考工具：[wiltodelta/remove-ai-watermarks](https://github.com/wiltodelta/remove-ai-watermarks)。

---

## 触发范围

只在以下出口运行：

1. **最终 listing 图片**：`assets-library` 模式 B2 promote，且用途标签是 Etsy listing 槽位（`hero` / `detail` / `lifestyle` / 等）。
2. **计划发布到社交媒体的图片**：`assets-library` 模式 B2 promote，且用途标签包含社媒渠道（如 `Pinterest` / `Instagram Posts` / `Instagram Stories` / `Facebook` / `Twitter/X`）；以及 `pinterest-autopin` 写入 Pin Queue / 发布前的 processed 副本。

明确不处理：

- `assets-library` 模式 B1 dump 的 `待处理/` 原始素材。
- `image-synth` 刚生成落在 `.cache/image-synth/ai_raw/`、用户还没选择"入库"的图片。
- 只用于内部参考、拍摄 planning、视觉分析、素材检索、代表帧标注的图片。
- 用户或品牌主动加上的商标、版权水印、署名水印；本协议只处理 AI watermark。

---

## 处理原则

1. **只改发布副本，不改原始素材**。输出固定落到 `<workspace>/.cache/ai-image-sanitizer/` 或调用方自己的 processed 目录。
2. **只移除 AI 相关 metadata**。使用 `metadata --remove --keep-standard`，保留 Author / Copyright / Title 等标准字段。
3. **可见水印只处理工具明确支持并检测到的 AI logo**。检测不到时不强行擦除。
4. **不默认跑 `invisible` / `all`**。这两种模式会用 diffusion 重新生成像素，可能改变产品纹理、文字和边缘；只有用户明确要求"处理隐形 AI watermark"并接受画面可能变化时才用。
5. **失败即阻塞发布，不静默降级**。如果图片要对外发布但清理失败，停下告诉用户缺什么；不要拿未处理图继续排队或上传。
6. **metadata 工具缺失时允许安全 fallback**：如果 `remove-ai-watermarks` / `exiftool` 不可用，但仅需要清理 metadata，可用 Pillow 重新打开图片、`ImageOps.exif_transpose`、转换 RGB，并以 JPEG 重新保存且不传 EXIF/XMP/ICC/C2PA。处理后必须用字节/字符串扫描验证无 C2PA/OpenAI/EXIF/XMP/prompt 等标记。该 fallback 只用于 metadata 清理，不等同于 visible / invisible watermark 移除。

---

## 前置检查

发布出口在处理图片前先在 **Hermes Agent 实际运行的机器** 上检查：

```bash
command -v remove-ai-watermarks
```

IDE / 当前开发机有没有 clone `wiltodelta/remove-ai-watermarks` 不重要。真正执行图片处理的是 Hermes Agent 那台机器；只要那台机器 PATH 里有 `remove-ai-watermarks` 命令即可。

缺失时提示安装：

```bash
uv tool install git+https://github.com/wiltodelta/remove-ai-watermarks.git
```

如果没有 `uv`，用：

```bash
pipx install git+https://github.com/wiltodelta/remove-ai-watermarks.git
```

基础安装只要求 metadata 和 visible watermark 清理；不要为了默认流程安装 GPU extra。

如果 Hermes Agent 机器不能访问 GitHub，或没有 `uv` / `pipx`：

1. 停止发布，不上传未清理图片。
2. 告诉用户在 Hermes Agent 机器上先安装 `uv` 或 `pipx`，再执行 `etsy-stack ai-cleaner update`。
3. 如用户只能离线安装，让用户把已打包的 Python wheel / 本地 git checkout 放到 Hermes Agent 机器，再用 `uv tool install <本地路径>` 或 `pipx install <本地路径>` 安装。安装完成后重新跑发布流程。

---

## 单图流程

设输入为 `<source_path>`，输出为 `<clean_path>`：

1. 复制到清理输出目录，保留原始文件不动。
2. 检查 AI metadata：

   ```bash
   remove-ai-watermarks metadata <clean_path> --check
   ```

3. 移除 AI metadata，保留标准 metadata：

   ```bash
   remove-ai-watermarks metadata <clean_path> --remove --keep-standard
   ```

4. 如果图片来源是 AI 合成，或 sidecar / 备注含 `[AI 合成]`，再跑可见 AI watermark 清理：

   ```bash
   remove-ai-watermarks visible <clean_path> -o <clean_path> --strip-metadata
   ```

5. 如用户明确要求隐形 AI watermark 清理，先说明会重写像素，再使用：

   ```bash
   remove-ai-watermarks invisible <clean_path> -o <clean_path>
   ```

   不要在 listing 主图或含细小文字 / 尺寸表的图上默认使用。

---

## 输出记录

调用方需要在自己的 sidecar / Base 备注 / 队列记录里保留最小可审计信息：

```json
{
  "aiSanitization": {
    "status": "applied",
    "tool": "remove-ai-watermarks",
    "steps": ["metadata", "visible"],
    "sourcePath": "<source_path>",
    "outputPath": "<clean_path>",
    "invisibleOptIn": false
  }
}
```

如果无 AI metadata 且未检测到可见 AI watermark，`status` 写 `checked-noop`。
