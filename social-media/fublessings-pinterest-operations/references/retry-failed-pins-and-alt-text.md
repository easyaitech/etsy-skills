# 重试失败 Pin 与 Alt Text 非阻塞规则

适用场景：用户说“Pinterest 有几个失败的，重试一下”或 Pin Queue 中有 `状态=失败` / `失败原因` / `重试次数` 的记录需要处理。

## 重试前筛选

1. 从 FuBlessings Pin Queue 拉取记录，重点字段：`pin_id`、`状态`、`pin_url`、`重试次数`、`失败原因`、`计划发布时间`、`发布时间`。
2. 只重试仍未发布的记录：`pin_url` 为空且状态不是 `已发`。
3. 如果某条已经有公开 `/pin/<digits>/` URL，但 Base 仍是失败，按 `manual-reconcile-published-pin.md` 回填，不要再次发布。
4. 如果工具发布后获取不到 pin_url，但用户/日志显示可能已点击发布成功：先访问 FuBlessings 账号首页 `https://jp.pinterest.com/FuBlessings/` 或对应 Board，从最新公开 Pin 中按标题、图片、Board、链接匹配目标 Pin；若首页/Board 找到唯一匹配 Pin，则回填公开 URL 并标记已发；若首页/Board 找不到对应 Pin，才判定发布失败。详细规则见 `pin-url-profile-fallback.md`。
5. 每条重试前读取对应 runtime JSON，先 validate，再 publish；重试结果逐条回写 Base。
6. **重复发布防护（2026-05-27 加固）**：自动发布脚本 `pinterest_auto_publish_due.py` 已对 URL 提取做三层降级（stdout JSON → `/tmp/published_pin_url.txt` → 正则 raw stdout），且所有 upsert 自带指数退避重试 3 次。若 Base 仍误报失败但 Pin 已发布，不要盲目重试，先走人工 reconcile。

## 登录 / CDP 前置失败的处理

如果重试在 `check-login` 阶段失败，先区分两类情况：

1. **CDP 不可达 / Chrome 没开**：先恢复 live Chrome CDP（优先 9225，其次 9222），再重新跑 `check-login`；不要把这类前置失败当成一次真实发布失败。
2. **CDP 可达但 Pinterest 显示未登录**：停止发布，让用户在已打开的 Chrome 窗口里人工完成 Pinterest 登录。此时应保持 Pin 未发布状态，并把失败原因写成“等待 Pinterest 重新登录”；如脚本已经把 `重试次数` 误加到上限，手动回退到进入本次重试前的值，避免登录态问题耗尽发布重试额度。

恢复 CDP 时可用 macOS Chrome 直接启动 profile；若用 Hermes `terminal(background=true)` 启动长驻 Chrome，不要用 `nohup ... &` 这类 shell 级后台包装。启动后必须用 `curl http://127.0.0.1:9225/json/version` 验证端口真的可达，再进入 `check-login`。

## 成功回写

发布成功后回写：

- `状态=已发`
- `pin_url=<公开 https://.../pin/<digits>/ 链接>`
- `发布时间=<CST timestamp>`
- `失败原因=null`
- `重试次数`按现有工具/流程递增或保留实际值，不要清零伪造历史

最终复查 Base，按 Pin ID 汇报成功/失败和 URL。

## Alt Text 写入失败不应阻塞单图发布

已验证过的工具修复/运营规则：单图发布时，如果 Pinterest 页面或编辑器没有稳定暴露 Alt Text 输入框，或 Alt Text 写入/确认失败，但标题、描述、链接、Board 和公开 Pin URL 均可确认，则 Alt Text 写入失败不应阻塞发布。

处理口径：

- 工具层：Alt Text step 记录 warning，不抛 fatal error。
- 运营层：继续完成 publish，并以公开 `/pin/<digits>/` URL 作为成功判定。
- Base 回写：发布成功则清空失败原因；如需要保留内部诊断，写到本地日志/内容稿 Notes，不要让 Base 继续显示失败。
- 例外：如果 Alt Text 失败伴随图片上传、Board、链接或公开 URL 失败，则仍按发布失败处理。

## 发布按钮已点击但工具未拿到 URL：先人工回填，不要盲目再发

已见过单图 Pin 的情况：工具日志显示标题、Board、描述都填写成功，并且已经点击「发布」按钮，但停在 `https://jp.pinterest.com/pin-creation-tool/`，报「未能确认发布后的 Pin URL」。这不等于发布失败；Pinterest 可能已创建公开 Pin，只是页面没有跳转或 URL 提取失败。

处理顺序：

1. 先查看公开主页或目标 Board，例如 `https://jp.pinterest.com/FuBlessings/`、`https://jp.pinterest.com/fublessings/<board-slug>/`。
2. 抽取最新 Pin URL：页面 DOM 中查 `a[href*="/pin/"]`，或从主页「更多来自 FuBlessings 的创意点子」/Board 最新卡片读取公开 `/pin/<digits>/` URL。
3. 用 Runtime JSON 的 `title`、`board`、`link`、图片/内容顺序匹配到失败的 `pin_id`。若用户明确确认「这几条都已发布成功」且主页最新 Pin 数量与失败记录数量一致，可按发布时间/主页最新顺序做回填；仍不确定时不要猜，要求用户给具体 Pin URL。
4. 对匹配到的记录执行 reconcile：`状态=已发`、`pin_url=<公开 /pin/<digits>/ URL>`、`发布时间=<当前 CST 或用户确认时间>`、`失败原因=null`；`重试次数`保留历史值，不清零。
5. 同步更新本地内容稿与 `docs/pinterest-autopin-setup.md`。不要再次运行 final publish，避免重复发布同一素材。

经验映射：主页最新公开 Pin 常按最新在前排序；如果两个失败 Pin 是连续重试发布，最新两条 URL 可结合页面 title/Runtime title 分配。例如 title 为 `Small Chinese Calligraphy Magnet Gift` 的 Pin 页面 title 能直接确认对应记录；另一个相邻最新 URL 对应另一条失败记录。

## Ads Manager 轮播重试安全边界

轮播 Pin 仍必须遵守 Ads Manager 安全规则：

- Board 选择必须限定在右侧 `Pin 图生成器` 面板。
- 若无法确认右侧 Board 已选中，安全中止；不要点击左侧/外层广告推广计划的“发布”。
- 不要把 Board 名误填进左侧 `定位详情 > 地点`。
- 只接受公开 `/pin/<digits>/` URL；Ads Manager campaign/create URL 或广告草稿信号不算成功。

## 汇报格式

简洁列出：

- 已重新发送成功的 Pin ID + Pin URL
- 仍失败的 Pin ID + 精确失败原因
- 已回写飞书字段
- 若工具代码有本地修复，说明测试结果、分支和 commit，但不要把 session-specific commit 当成长期必需步骤
