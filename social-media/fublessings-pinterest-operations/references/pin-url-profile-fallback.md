# Pin URL 获取失败后的首页回查兜底

适用场景：Pinterest AutoPin 已点击发布按钮，但 stdout、`/tmp/published_pin_url.txt`、页面跳转或工具 JSON 都没有拿到公开 `/pin/<digits>/` URL。

## 核心规则

1. 不要立刻判定失败，也不要盲目再次发布。
2. 优先访问 FuBlessings 账号公开已创建页：`https://jp.pinterest.com/FuBlessings/_created/`；再访问主页 `https://jp.pinterest.com/FuBlessings/` 或对应 Board。`_created/` 更适合排查“已发布但 Pin Queue 仍失败/缺 URL”的记录，因为它按账号创建内容聚合显示。
3. 从 `_created/`、首页或对应 Board 的最近公开 Pin 中提取 `/pin/<digits>/` URL。
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
- 发布后若直接 URL 提取失败，则抓取 FuBlessings `_created` 页 / 首页最近若干个 `/pin/` 链接。
- Pinterest profile grid 是懒加载：脚本必须显式等待 `a[href*="/pin/"]` 出现并滚动数次；`_created` 返回空时回退主页 `https://jp.pinterest.com/FuBlessings/`，不要因为首屏暂时无 anchors 就判定失败。
- 抓取结果必须规范化为公开 `https://jp.pinterest.com/pin/<digits>/`，过滤 `/pin/<digits>/analytics`、Ads/preview/create/campaign URL 等非公开 Pin URL，否则会造成“多个未知 URL”歧义。
- 首页回查脚本如果放在 Etsy workspace，而 Playwright 依赖安装在 Pinterest-autopin 工具目录，不要要求 workspace 再安装一份依赖；脚本应从工具目录的 `node_modules/playwright` 兜底加载，或由 runner 设置 `NODE_PATH`。
- 只有当 `_created`/首页/Board 出现**唯一一个**不在已记录 URL 集合里的公开 `/pin/<digits>/`，且能匹配目标 title/board/link/图片线索时，才允许自动回填。
- 若出现多个未知 URL，说明可能已有重复发布、历史未回填或匹配信息不足；不要随便取最新一条，保持失败并转人工 reconcile。
- 若只拿到一个未知 URL，但当前未登录/公开页面无法看到标题、图片或链接，且不能与具体 Pin Queue 记录建立唯一对应，也不要硬回填；把该 URL 单独汇报为“未匹配公开 URL”，等待人工确认。
- 成功回填后同步本地内容稿与 `docs/pinterest-autopin-setup.md`。

## 安全边界

- Ads Manager create/campaign/preview URL 不算成功。
- API signal UUID、页面 `finalUrl`、广告草稿 URL 不算成功。
- 只有公开可访问的 `/pin/<digits>/` URL 才能写入 `pin_url`。
- 若首页没有出现目标 Pin，不要再次点击发布按钮；保持失败并等待人工判断。