# Ads Manager 轮播发布安全与 CDP 诊断补充（2026-05）

适用：FuBlessings Pinterest 自动发布 / 补发到期 Pin，尤其是 2–5 张图轮播 Pin 经 Pinterest Business Ads Manager 发布时。

## 本次沉淀的关键结论

1. **公开 Pin URL 是唯一成功标准**
   - 只接受 `https://<pinterest-domain>/pin/<digits>/`。
   - 不接受 Ads Manager create/campaign URL、preview URL、API signal 里的 UUID、或页面 `finalUrl`。

2. **Ads Manager draft 不等于已发布**
   - 看到 `广告总计 (1)`、`Ad total (1)`、`1 - 1 of 1 ads` 只能说明创建了广告草稿/素材。
   - 若 profile `_created/`、API response capture 都找不到公开 `/pin/<digits>/`，应分类失败：`ads_draft_created_no_public_url`。

3. **绝不能自动点击外层 campaign 发布按钮**
   - organic carousel 的发布动作应在 Pin builder 内完成。
   - 外层 `Review selected Pins` / campaign `Publish` 属于广告投放链路，可能产生费用。
   - 自动恢复策略不能把外层广告发布当作“继续下一步”。

4. **Board 选择要精确匹配可见下拉项**
   - 中文 Ads Manager 页面里 `getByText(candidate, { exact:false }).first()` 可能点到容器/body。
   - 更稳做法：`exact:true`、遍历可见匹配项、优先点更靠后的弹层项；fallback 再 `.last()`。

## 推荐工具侧行为

- final publish 后，先监听 Pinterest API response，递归查找公开 `/pin/<digits>/` URL。
- 若 API 没捕获到，再去 profile `_created/` 按当前标题查找。
- 若仍没有公开 Pin URL，但页面呈现 Ads draft/creative 迹象，抛结构化错误：

```json
{
  "code": "ads_draft_created_no_public_url",
  "message": "ADS_DRAFT_CREATED_NO_PUBLIC_PIN_URL: Ads Manager 已创建广告草稿/素材，但未发现可验证的公开 Pin URL；不要点击外层推广计划“发布”按钮。"
}
```

- Python wrapper 的 `find_pin_url()` 只能从 result/stdout 中接受 `/pin/<digits>/` URL，不能把 `finalUrl` 原样作为成功 URL。

## 自动发布脚本 / cron 行为

当 `scripts/pinterest_auto_publish_due.py` 收到 `ads_draft_created_no_public_url`：

1. 该 Pin 写失败或保持待人工复核，失败原因只写摘要。
2. 不继续重试同一条，避免反复创建 Ads draft。
3. 不继续批量发布后续到期 Pin。
4. 保持或暂停 Hermes cron，直到 check-login 与 final publish 重新验证稳定。

## CDP / check-login 诊断坑点

1. 本机 `http_proxy` 可能干扰 localhost CDP 检查。
   - 用 curl 检查时必须加：
     ```bash
     NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost curl -sS http://127.0.0.1:9225/json/version
     ```
   - Python 侧请求 `/json/version` 建议显式禁用代理：`urllib.request.ProxyHandler({})`。

2. `/json/version` 可达不等于 Playwright CDP handshake 可用。
   - 可能出现 WebSocket 已连接但 `chromium.connectOverCDP()` 初始化超时。
   - 先清理残留 Chrome AutoPin profile 进程，再重启独立 profile；必要时清理 `SingletonLock`、`SingletonSocket`、`SingletonCookie`。

3. 非 CDP persistent profile 可能不复用 Ads Manager 登录态。
   - 如果 `check-login` 报 `Pinterest login required at https://ads.pinterest.com/`，需要用户在同一个 Chrome profile 中人工重登。
   - 不输入用户凭据，不绕过验证码/二次验证。

4. 用户完成人工登录后，**不要关闭登录窗口**。
   - 用户明确偏好：登录完成的 Pinterest/FuBlessings Chrome 窗口保持打开，后续发布与 `check-login` 复用该 live Chrome/CDP。
   - 登录后立即验证：
     ```bash
     NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost curl -sS --max-time 3 http://127.0.0.1:9225/json/version
     python3 tools/pinterest_publish_pin.py \
       --mode check-login \
       --no-default-chrome-profile \
       --creation-url 'https://ads.pinterest.com/ads/create/' \
       --timeout 180
     ```
   - 成功信号：`chromeCdp.reachable=true`、`port=9225`、`ok=true`，`finalUrl` 进入 `ads.pinterest.com/advertiser/.../ads/create/`。
   - 若只需重弹窗口，不要杀 Chrome；用 `open -na "Google Chrome" --args --user-data-dir=<pinterest-autopin chrome-profile> --remote-debugging-port=9225 --new-window https://ads.pinterest.com/ads/create/` 打开同一 profile。

## 回写与对用户汇报

- 飞书 `pin_url` 只写公开 `/pin/<digits>/`。
- 失败原因写错误 code + 一句话摘要，不粘贴含 token/cookie/session 的 stdout/stderr。
- 对用户说明“已安全失败/未标已发/未点击外层广告发布”。