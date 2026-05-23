---
name: photo-style
description: 批量把真实商品照片做轻量统一风格化，生成平台无关的发布副本、batch manifest 和本地审批 contact sheet；审批通过后可生成 Pinterest Queue 写入 payload，供 pinterest-autopin / 未来 Instagram 等平台 adapter 消费。只调光影、色温、对比度、阴影、清晰度和 2:3 适配，不改原图、不改商品内容、不替换背景、不加文字/边框/贴纸。适用于用户说"把照片统一风格 / 照片处理后入 Pinterest 队列 / 批量修图发布 / Photo Style"等。
layer: application
depends-on: [shop-foundation, assets-library]
---

# Photo Style

`photo-style` 负责把真实照片加工成平台可发布的副本。它不负责 Pinterest 登录、board 管理、最终发布，也不接管素材库。

核心边界：

- 输入：已经备份到素材库 `待处理/` 或本地测试批次的真实照片 + 已批准的风格参考图。
- 输出：`<workspace>/.cache/photo-style/batches/{batch_id}/` 下的处理图、manifest、审批页和平台 adapter payload。
- 审批：v0 必须人工批准。未批准、QA 失败、缺 SKU/board/link 的图片不能写入平台队列。
- 原图：永远不改、不覆盖、不删除。

> 共享引导（版本检查 / 工作区解析 / 写入约束 / 工作语言 / 经营原则）见 [`shared/preamble.md`](../shared/preamble.md)，降级协议见 [`shared/dependency-protocol.md`](../shared/dependency-protocol.md)。

---

## 执行模式

### 模式 A：style batch（照片批量风格化）

进入条件：

- 用户已有一批拍好的照片，希望统一成同一视觉风格。
- 用户提供 5-10 张已批准的成品参考图。
- 用户目标是后续发 Pinterest / Instagram / 其他社媒，但当前只要求先产出发布副本和审批清单。

执行步骤：

1. 解析工作区根目录：`etsy-stack workspace`。
2. 确认输入：
   - source photos 目录或本地文件清单。
   - reference images 目录或文件清单。
   - 可选 metadata JSON：按文件名提供 SKU、listing URL、Pinterest board、title/description/alt text。
   - style name：一句短标签，如 `soft-natural-light`。
3. 运行：
   ```bash
   photo-style style-batch --sources <dir> --refs <dir> --style-name <name> [--metadata <json>]
   ```
4. 脚本顺序处理每张图，输出：
   - `processed/`：2:3 发布副本。
   - `manifest.json`：平台无关 batch manifest。
   - `approval.html`：本地审批 contact sheet。
   - `approval-template.json`：用户批准/拒绝结果模板。
5. 打开或展示 `approval.html`，让用户批量看图。

禁止事项：

- 不用 AI 重绘。
- 不替换背景。
- 不加文字、边框、贴纸、排版元素。
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
photo-style style-batch
  ├─ read reference set
  ├─ make 2:3 publish copies
  ├─ run QA gates
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

v0 的 QA 是保守预检，不假装能完全识别“商品是否被改”。脚本能稳定检查：

- 输出尺寸和比例。
- 原图 hash 不变。
- 文件存在与格式支持。
- 风格处理是否成功。
- 是否缺 SKU/board/link 等下游必填字段。

商品文字、书法字、边缘和材质是否被改，仍由审批 contact sheet 人眼确认。v0 选择轻量修图而不是 AI 重绘，目的就是降低这类风险。

---

## 与其他 skill 的协作

- `assets-library`：提供素材入口和归档边界。`photo-style` 不替代 B1/B2；处理后的发布副本如需长期入库，仍走 `assets-library` B2 promote。
- `pinterest-autopin`：消费 approved manifest items 对应的 Pinterest payload。发布、test、final 仍由 `pinterest-autopin` 负责。
- `image-synth`：不是 v0 主路径。AI 合成图仍走 `image-synth`，不要把 `photo-style` 扩成重绘工具。

---

## 工作语言

通用规则见 [`shared/preamble.md`](../shared/preamble.md) §工作语言。本 skill 特有：

- 对用户说明用中文。
- 输出给 Pinterest 的 title / description / alt text 用英文。
- 文件名和 manifest 字段名用英文。
