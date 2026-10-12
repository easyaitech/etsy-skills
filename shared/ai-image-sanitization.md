# AI 图片交付清理协议

使用 [wiltodelta/remove-ai-watermarks](https://github.com/wiltodelta/remove-ai-watermarks)，处理 AI metadata 和工具支持的可见 AI 水印。**这些操作不等于消除全部 AI 痕迹**；隐形水印、来源指纹和画面中的 AI 感必须分别说明，不能用一次“未检出”推断图片是真实摄影。

## 触发范围

- `image-synth`：生图、QA 和原图落盘后，作为发图交付前最后一步运行；用户只保存聊天图、不入库时同样执行。
- `assets-library` B2：最终 listing 图或社媒发布图在 promote 上传前运行。
- `pinterest-autopin`：发布副本写入队列 / 发布前运行。

始终保留原件：`image-synth/ai_raw/`、B1 dump 的 `待处理/`、内部参考图不原地处理。仅处理 AI 标记，保留商标、作者署名和版权水印。

## 前置检查

在 **Hermes 实际运行机器、同一执行用户**下检查命令与依赖，开发机安装不算：

```bash
command -v remove-ai-watermarks
remove-ai-watermarks --version
remove-ai-watermarks visible --help
```

默认流程需要 `visible` extra（包含元数据及 CPU 可见水印处理）；基础包本身不够。管理员安装到隔离工具环境，不改 Hermes Python 环境。已验证版本为 `0.45.1`：

```bash
uv tool install --force 'remove-ai-watermarks[visible]==0.45.1'
# 没有 uv 时使用 pipx 的隔离安装
pipx install --force 'remove-ai-watermarks[visible]==0.45.1'
```

确保可执行文件目录在 Hermes terminal 的 PATH 中。缺依赖、命令失败时保留原图、记录原始错误，停止最终交付 / 入库 / 发布，交管理员修复；不让店主重传图。仅清掉 metadata 的替代实现不能算此完整步骤成功。

## 单图流程

输入 `<source_path>` 为原图。每次用独立输出路径，避免拿上次文件冒充本次结果。`image-synth` 输出到 `<workspace>/.cache/image-synth/processed/{date}/`；其他调用方输出到 `.cache/ai-image-sanitizer/` 或自己的 processed 目录。

1. 记录原图 SHA-256、工具版本，检查原图可解码并记录尺寸、显示方向。
2. 在**保留元数据的原图**上识别可见 AI 标记（元数据可辅助判断），写独立临时副本：

   ```bash
   remove-ai-watermarks visible <source_path> -o <visible_tmp_path> --keep-metadata
   ```

   查看命令结果，不只看退出码：`Partial`、`Post-removal validation unavailable`、报错均为未通过，不能继续交付，也不自动反复擦除。若明确报告未检测到可见标记且未创建输出，复制原图到临时副本后继续；输出缺失但没有明确的未检出结论则报错。检测器未识别、但看图发现残留时也不能当通过；保留供人工核对，不强行擦角标或 Logo。
3. 从临时副本移除 AI 元数据并保留标准字段：

   ```bash
   remove-ai-watermarks metadata <visible_tmp_path> --remove --keep-standard -o <clean_path>
   remove-ai-watermarks metadata <clean_path> --check
   ```

   检查报告中 AI 字段确已清除；退出码为零本身不是“无残留”的证据。
4. 复检最终文件：可解码，尺寸 / 方向 / 色彩正常；`vision_analyze` 对照原图检查文字、书法笔画、Logo、商品轮廓和纹理。任何新增损伤或未完成检查均记 `failed`，不交付；成功后记录最终 SHA-256 与 `visualQa: passed`。原图保持不动。
5. 后续预览、上传、promote 使用这个最终副本。裁切、调色或再次生成后哈希已变，必须重新执行本协议；不能沿用旧记录。

## 隐形水印

普通流程不执行 `invisible` / `all`：它们会重新生成像素，可能改变商品与文字。记录 `invisibleStatus: not-run`，告知“已完成元数据与可见 AI 水印检查，隐形水印未处理 / 未验证”，不能宣称全部去痕。

用户要求处理隐形水印并接受像素重绘时，使用该工具的独立 `qwen-zimage` 依赖及 CUDA GPU 路径；在真正执行前说明此代价。运行环境不支持时，明确阻塞该请求，不能用 metadata 结果代替。对原图的独立副本运行：

```bash
remove-ai-watermarks invisible <source_path> -o <invisible_tmp_path> --force
```

此处 `--force` 仅限本次生图工具已确认来源的 AI 图片（不是拿检测结果未知的实拍图试验）。随后以此输出执行上面的可见水印、元数据与画质复检流程。即便命令成功，也只记录 `invisibleStatus: processed-unverified`；若有对应供应商验证器的真实结果，另存验证器、时间和结论，结果只针对这一个文件，不能推广为所有检测器均无法识别。

## 输出记录与复用

调用方在 sidecar / Base 备注 / 队列记录保留最小结果，生成提示词和原始来源记录留在内部，不写回交付图片。示例：

```json
{
  "aiSanitization": {
    "status": "applied",
    "tool": "remove-ai-watermarks",
    "toolVersion": "0.45.1",
    "steps": ["visible", "metadata"],
    "sourcePath": "<source_path>",
    "sourceSha256": "<original_sha256>",
    "outputPath": "<clean_path>",
    "outputSha256": "<final_sha256>",
    "metadataStatus": "verified-absent",
    "visibleStatus": "removed-validated",
    "invisibleStatus": "not-run",
    "visualQa": "passed"
  }
}
```

- 明确未检测到可见标记时 `visibleStatus: not-detected`；元数据和可见标记均无需改动时 `status: checked-noop`，仍须复检和记录。
- 失败记 `status: failed` 与错误原因；未做的步骤按未做记录，不伪造通过。
- 下游仅在 `status` 为 `applied` / `checked-noop`、元数据验证通过、可见标记为已验证移除或未检出、`visualQa: passed` 且**实际文件 SHA-256 等于 outputSha256**时复用交付副本。缺记录或哈希不符则重新执行；新增隐形水印要求按上节单独处理，旧的普通清理记录不能满足它。
