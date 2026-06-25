# 把 6 张实拍图放进 samples/

你在对话里贴的图只在聊天上下文里,没落到磁盘,API 要的是文件。把它们存到 `image-synth/scripts/samples/`,文件名严格如下(`cases.json` 按这些名字找图):

| 文件名 | 对应你上传的图 | prompt 里 | 实物尺寸 |
|---|---|---|---|
| `01-bookmark.jpg` | 蓝底"欢喜"书签(雪地那张) | 图1 书签(主体) | 7×21cm |
| `02-wrapping.jpg` | 手工纸/包装纸(折纸那张截图) | 图2 包装纸 | 20×50cm |
| `03-envelope.jpg` | 牛皮纸红框信封 | 图3 信封 | 11×22cm |
| `04-letter.jpg` | "欢喜 / Joy that overflows"那封信 | 图4 信 | 21×28cm |
| `05-knot.jpg` | 浅咖金黄中国结 | 图5 中国结 | 4.5×8cm |
| `06-tassel.jpg` | **流苏(图6)** — 见下方说明 | 图6 流苏(书签挂坠,要蓝色) | 7cm |

> 后缀 `.jpg`/`.png`/`.webp` 都行,但要和 `cases.json` 里的一致(默认 `.jpg`;如果是 png 就把 cases.json 里对应 imagePath 改后缀)。

## ⚠️ 图6 流苏待确认

我只在对话里数到 **5 张**清晰的图,你的 prompt 却引用了 **6 张**(图6 是单独的"流苏7cm")。两种处理:
- 若你有**单独的流苏照片**(prompt 想要蓝色 7cm)→ 存成 `06-tassel.jpg`。
- 若没有,中国结那张就是流苏来源 → 把它也存一份成 `06-tassel.jpg`(prompt 文字已说明"改成蓝色"),或告诉我,我把 cases.json 的图6 直接指到 `05-knot.jpg`。

## 两种存图方式

**A) 直接存进 samples/**(在 Mac 上操作最直接)
把 6 个文件拖进 `image-synth/scripts/samples/`,按上表命名即可。

**B) 丢到下载文件夹我来接手**
AirDrop / 存到 Mac 的 `~/Downloads`,按 `1.jpg`…`6.jpg` 命名(顺序 = 图1..图6),告诉我一声,我帮你拷进 samples/ 并改成对应名字。

存好后:`cd image-synth/scripts && npx tsx --env-file=.env bench.ts --run`
(或先 `... bench.ts` 预览不花钱)
