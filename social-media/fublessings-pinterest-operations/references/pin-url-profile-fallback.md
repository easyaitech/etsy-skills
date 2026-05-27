# Pin URL 获取失败后的首页回查兜底

适用场景：Pinterest AutoPin 已点击发布按钮，但 stdout、`/tmp/published_pin_url.txt`、页面跳转或工具 JSON 都没有拿到公开 `/pin/<digits>/` URL。

## 核心规则

1. 不要立刻判定失败，也不要盲目再次发布。
2. 先访问 FuBlessings 账号首页：`https://jp.pinterest.com/FuBlessings/`。
3. 从首页/对应 Board 最近公开 Pin 中提取 `/pin/<digits>/` URL。
4. 用以下信息匹配目标 Pin：
   - Runtime JSON 的 `title`
   - `board`
   - 商品/站点 `link`
   - 图片视觉或 alt text/标题线索
   - Pin Queue 中尚未记录过的最新 URL
5. 找到唯一匹配 URL：回写 Pin Queue `状态=已发`、`pin_url`、`发布时间`，并清空 `失败原因`。
6. 首页/Board 找不到对应 Pin：才判定发布失败，并保留失败原因供人工复核。

## 自动化建议

- 在自动发布和手动重试脚本里维护一份“已记录 Pin URL”集合。
- 发布后若直接 URL 提取失败，则抓取 FuBlessings 首页最近若干个 `/pin/` 链接。
- 优先选择“不在已记录集合里”的最新 URL；若有多条候选，必须进一步匹配 title/board/link，不能随便取第一条。
- 成功回填后同步本地内容稿与 `docs/pinterest-autopin-setup.md`。

## 安全边界

- Ads Manager create/campaign/preview URL 不算成功。
- API signal UUID、页面 `finalUrl`、广告草稿 URL 不算成功。
- 只有公开可访问的 `/pin/<digits>/` URL 才能写入 `pin_url`。
- 若首页没有出现目标 Pin，不要再次点击发布按钮；保持失败并等待人工判断。