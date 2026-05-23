---
name: photo-style
description: 用 Hermes Agent 集成的 GPT image-2，把真实商品照片按固定摄影提示词改成 3:4 专业摄影风格图；要求高度还原原图内容，只改变摄影气质、光影和背景质感。输出先人工审批，再按需入 assets-library 或生成 Pinterest Queue payload。不保留本地 Sharp 修图 fallback。适用于用户说"把照片统一风格 / 照片处理后入 Pinterest 队列 / 批量修图发布 / Photo Style"等。
layer: application
depends-on: [shop-foundation, assets-library]
---

# Photo Style

`photo-style` 负责把真实照片加工成平台可发布的摄影风格副本。它不负责 Pinterest 登录、board 管理、最终发布，也不接管素材库。

核心边界：

- 输入：已经备份到素材库 `待处理/` 或本地测试批次的真实照片。
- 主路径：Hermes Agent 的 GPT image-2 生图能力，使用原图作 reference image，提示词见 [`references/hermes-image2-prompt.md`](references/hermes-image2-prompt.md)。
- 输出：`<workspace>/.cache/photo-style/batches/{batch_id}/` 下的生成图、prompt/QA sidecar、manifest、审批页和平台 adapter payload。
- 审批：v0 必须人工批准。未批准、QA 失败、缺 SKU/board/link 的图片不能写入平台队列。
- 原图：永远不改、不覆盖、不删除。

> 共享引导（版本检查 / 工作区解析 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 执行模式

### 模式 A：Hermes image-2 style（主路径）

进入条件：

- 用户已有一批拍好的照片，希望统一成同一视觉风格。
- 用户接受使用 Hermes Agent 集成的 GPT image-2 做参考图生成。
- 用户目标是后续发 Pinterest / Instagram / 其他社媒，但当前只要求先产出发布副本和审批清单。

执行步骤：

1. 解析工作区根目录：`etsy-stack workspace`。
2. 确认输入：
   - source photos 目录或本地文件清单。
   - 可选 metadata JSON：按文件名提供 SKU、listing URL、Pinterest board、title/description/alt text。
   - batch label：一句短标签，如 `xuan-paper-soft-light`。
3. 对每张 source photo：
   - 用 Hermes 看图能力先读原图，记录主体、文字、材质、颜色、构图和任何必须保持的细节。
   - 调 Hermes Agent 集成的 GPT image-2，传原图作 reference image，长宽比设为 3:4，prompt 使用 [`references/hermes-image2-prompt.md`](references/hermes-image2-prompt.md) 的原文。
   - 严格生成 1 张；不要一次让模型发散多个版本。
4. 把生成图保存到：
   ```bash
   <workspace>/.cache/photo-style/batches/{batch_id}/generated/
   ```
   同目录写 sidecar JSON，记录 source path、prompt version、aspect ratio、Hermes/image model、生成时间和 QA 结果。
5. 输出：
   - `generated/`：3:4 生成图。
   - `manifest.json`：平台无关 batch manifest。
   - `approval.html`：本地审批 contact sheet。
   - `approval-template.json`：用户批准/拒绝结果模板。
6. 打开或展示 `approval.html`，让用户批量看图。

禁止事项：

- 不改变图片内容、商品形态、手写字、姓名、文字、Logo、数量或相对位置。
- 不把它扩成新产品概念图；这里只做同一照片的摄影风格版本。
- 不加文字、边框、贴纸、排版元素。
- 不做大红大金、符咒感、风水感、宗教感、旅游纪念品感。
- 不处理客户 UGC 授权，UGC 仍由 `assets-library` / `orders-customers` 处理公开授权。

### 模式 B：apply approval（应用审批结果）

进入条件：

- 模式 A 已生成 `manifest.json`。
- 用户已在 `approval-template.json` 或对话中给出批准/拒绝列表。

执行：

```bash
photo-style apply-approval --manifest <manifest.json> --approval-file <approval.json>
```

审批规则：

- `pending` 可以变成 `approved` 或 `rejected`。
- `qa.result = fail` 的图片不能批准。
- 未知 ID 直接报错，不静默忽略。
- 拒绝项必须保留 reason，哪怕 reason 是 `manual rejection`。

### 模式 C：Pinterest payload（生成 Pinterest Queue 写入 payload）

进入条件：

- manifest 中已有 `approved` items。
- 每个 approved item 有 Pinterest 目标字段：SKU、board、link、title、description、alt text。

执行：

```bash
photo-style pinterest-payload --manifest <manifest.json> --out <payload.json>
```

输出：

- `payload.json`：可给 `pinterest-autopin` / `lark-base` 写入 Pin Queue 的字段清单。

本模式只生成 payload，不直接写飞书 Base。写入前仍按 `pinterest-autopin` 的 Pin Queue schema 预览字段并等用户确认。

---

## 数据流

```text
assets-library 待处理/ 或本地测试批次
        │
        ▼
Hermes GPT image-2 style generation
  ├─ read source photo as reference image
  ├─ apply fixed photo-style prompt
  ├─ generate 3:4 publish candidate
  ├─ run vision + human QA gates
  ├─ write manifest.json
  └─ render approval.html
        │
        ▼
photo-style apply-approval
        │ approved only
        ▼
photo-style pinterest-payload
        │
        ▼
pinterest-autopin Pin Queue Base
```

---

## QA gates

详见 [`references/qa-gates.md`](references/qa-gates.md)。

v0 的 QA 不假装能完全证明“内容没有被改”。Hermes 看图能力先做结构化对比，人工审批仍是最终闸门。必须检查：

- 输出尺寸和比例是 3:4。
- 原图 hash 不变。
- 商品主体、手写文字、姓名、Logo、数量、相对位置没有明显改变。
- 风格命中：柔光、自然阴影、米白 / 宣纸白背景、纸纤维或真实材质痕迹。
- 禁区未命中：大红大金、符咒感、风水感、宗教感、旅游纪念品感、促销海报感。
- 是否缺 SKU/board/link 等下游必填字段。

---

## 与其他 skill 的协作

- `assets-library`：提供素材入口和归档边界。`photo-style` 不替代 B1/B2；处理后的发布副本如需长期入库，仍走 `assets-library` B2 promote。
- `pinterest-autopin`：消费 approved manifest items 对应的 Pinterest payload。发布、test、final 仍由 `pinterest-autopin` 负责。
- `image-synth`：负责“新画面 / 新场景 / 电商或社媒合成图”。`photo-style` 只做“基于同一张照片的摄影风格版本”；如果用户要换场景、加道具或创作新构图，切到 `image-synth`。

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：

- 对用户说明用中文。
- 输出给 Pinterest 的 title / description / alt text 用英文。
- 文件名和 manifest 字段名用英文。
