# Hermes GPT Image-2 Prompt

本文件是 `photo-style` 主路径的固定提示词。运行时必须把原照片作为 reference image 传给 Hermes Agent 集成的 GPT image-2，并把宽高比设为 `3:4`。

## Prompt

基于此照片制作专业摄影照片：采用柔光效果。不要改变图片内容，高度还原图片里的内容。只调整图片的风格。提升图片的高级感。

### 整体气质
- 米白 / 宣纸白为主背景，辅以木色、浅灰、黑墨、少量朱红。
- 自然光优先，柔和阴影，保留纸纤维、墨色边缘、真实手写痕迹。
- 重点不是“中式装饰品”，而是“为某个具体的人准备的一份礼物”。
- 不做大红大金、符咒感、风水感、宗教感、旅游纪念品感。
- 不做促销海报感，不在图片上堆大量文字、价格、折扣、强 CTA。

将宽高比设为 3:4。

## Required Runtime Settings

- Reference image: the source photo.
- Output count: exactly 1 image.
- Aspect ratio: `3:4`.
- Content preservation: strict. Do not alter product shape, handwriting, names, text, logo, quantity, object placement, or meaningful marks.

## QA Questions

Ask Hermes vision to compare the source photo and generated image before approval:

1. Are the product subject, handwriting, names, visible text, logo, quantity, and object placement preserved?
2. Did the style move toward soft natural light, off-white / xuan-paper white, wood, light gray, black ink, and limited cinnabar red?
3. Are paper fibers, ink edges, and real handmade traces still visible where they existed in the source?
4. Did the image avoid red-gold luxury, talisman, feng shui, religious, tourist souvenir, poster, discount, price, and strong CTA feelings?
5. Is the output exactly 3:4?

If any answer is no, mark the item `rejected` or regenerate once with a stricter preservation instruction. Do not send failed images to platform queues.
