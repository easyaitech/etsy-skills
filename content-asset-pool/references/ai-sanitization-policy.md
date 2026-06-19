# AI Sanitization Policy

本策略定义内容素材池中的“发布副本”处理边界。它补充共享协议 [`shared/ai-image-sanitization.md`](../../shared/ai-image-sanitization.md)，但更强调跨平台素材池的状态记录。

---

## 原图永不覆盖

固定模型：

```text
原图
  ↓ 复制
发布副本
  ↓ 清 metadata / provenance / 压缩 / 平台适配
用于发布
```

硬规则：

- 原图永远保留。
- 不删除原图。
- 不移动原图表达发布状态。
- 不用处理后的文件替换原图链接。
- 所有清理、压缩、尺寸处理、平台适配都只作用在发布副本。

---

## 默认清理范围

对发布副本默认执行：

- EXIF 清理
- XMP 清理
- C2PA 清理
- OpenAI provenance 清理
- prompt 信息清理
- 软件生成记录清理
- 其他可检测 AI metadata 清理
- 无损或轻度压缩

处理结果写回素材池：

```text
AI 清理状态 = 已清 metadata
发布副本本地路径 = <workspace>/.cache/content-asset-pool/processed/...
发布副本 hash = ...
```

如确认无需处理：

```text
AI 清理状态 = 无需处理
备注 = checked-noop, no AI metadata/provenance detected
```

---

## 默认不处理的范围

默认不做：

- 像素级隐形水印去除
- diffusion 重绘
- 画面修复
- 改变商品纹理、边缘、文字的处理
- 破坏性压缩

原因：商品图片经常包含文字、手工笔触 / 纹样、商品边缘和细节纹理。像素级处理可能破坏商品还原度和文字 / 细节可信度。

如果图片包含大量文字、手工纹样、尺寸表、商品细边、透明边缘或复杂材质，默认写：

```text
像素级水印处理 = 不建议
```

---

## 像素级处理的确认门

只有用户明确确认后，才能对发布副本做像素级处理。例如用户说：

```text
这批图可以做像素级处理
```

执行前必须提示：

- 处理只作用在发布副本。
- 可能改变笔画、边缘、纹理或细节。
- 处理后需要人工看图确认。

处理后写：

```text
像素级水印处理 = 已处理
备注 = pixel-level processing user-approved, output manually reviewed
```

如用户未确认但存在疑似隐形水印风险：

```text
像素级水印处理 = 需用户确认
AI 清理状态 = 需人工复核
```

---

## 失败处理

- metadata 清理失败：阻塞发布任务，不拿未处理图继续排队。
- 工具缺失：提示在 Hermes Agent 实际运行机器安装或使用共享协议中的 metadata-only fallback。
- 上传发布副本失败：保留本地发布副本路径和 hash，记录失败原因；不要覆盖原图。
- 处理后 hash 缺失：不写 `已清 metadata`，先补 hash 或标 `需人工复核`。
