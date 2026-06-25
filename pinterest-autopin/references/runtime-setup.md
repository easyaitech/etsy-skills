# Runtime Setup（首次接入 Pinterest）

只在 SKILL.md 模式 A 触发。当前推荐架构是：

```text
Hermes 生成 / 判断 / 调服务器工具
        ↓
yanggedianzhang 服务器保存 Pinterest job 状态
        ↓
现有浏览器插件用租户 Chrome 登录态执行 Pinterest 页面
```

不要安装新的 Pinterest 专用插件；继续扩展已经存在的 Etsy DM / 养个店长浏览器插件。不要在 Hermes/Mac mini 上准备独立 Chrome profile。

---

## 角色与边界

| 角色 | 负责什么 | 不负责什么 |
|---|---|---|
| Hermes | 读 Base、生成 pin 文案、调用服务器工具接口、转述安装 / 升级提示 | 不跑 Playwright、不保存浏览器登录态、不保存 browserToolToken |
| yanggedianzhang 服务器 | 租户鉴权、job 状态机、执行锁、素材下载地址、test/final 结果 | 不持有用户 Pinterest 密码 |
| 浏览器插件 | 在租户 Chrome 登录态里打开 Pinterest、填表、上传服务器 asset、回传结果 | 不决定文案、不维护业务队列 |
| 用户 / 管理员 | 安装插件、保存 browserToolToken、登录 Pinterest、必要时人工确认 final | 不需要把 Pinterest 密码交给 Hermes |

---

## 服务器前置

管理员侧确认：

1. yanggedianzhang 已部署 Pinterest browser tool flow。
2. 租户已有 service binding。
3. 已为租户 mint `browserToolToken`。
4. Hermes tool 调用服务端时使用服务器配置的 tool secret；不要把 secret 写进 `社媒发布队列` 或对话。
5. 浏览器插件最低版本满足服务器要求，并带 `pinterest` capability。

如果这些条件缺失，Hermes 调用 `POST /api/tools/pinterest/jobs` 时会收到：

- `409 BROWSER_TOOL_INSTALL_REQUIRED`
- `426 BROWSER_TOOL_UPGRADE_REQUIRED`
- `401 UNAUTHORIZED`
- `503 HERMES_TOOL_DISABLED`

处理方式见 `publishing-flow.md`。其中 `userMessage` 是面向用户的安装 / 升级话术，应原样转述。

---

## 用户侧插件安装 / 升级

当服务器返回安装或升级提示时，让用户按提示操作。通用步骤如下：

1. 向管理员获取最新的浏览器插件文件夹或压缩包，以及自己的 `browserToolToken`。
2. 打开 Chrome，进入 `chrome://extensions/`。
3. 打开右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择插件文件夹；升级时可替换旧文件夹后点“重新加载”。
5. 打开插件的“扩展程序选项”，填写：
   - `Bridge Base URL`: `https://yanggedianzhang.com`
   - `browserToolToken`: 管理员发放的 token
6. 保存后回到 Hermes 对话继续。

注意：

- 不要新建第二个 Pinterest 插件。
- 不要把 `browserToolToken` 写入 Base、BRAND.md、SHOP.md 或任何业务文档。
- 如果插件选项页不存在或版本太旧，要求用户安装最新插件包。
- Pinterest 登录在用户自己的 Chrome 中完成；Hermes 不输入账号密码、不处理二次验证。

---

## Base / 工作区准备

模式 A 仍需要准备业务队列：

1. 解析工作区根：`ecommerce-stack workspace`（旧命令 `etsy-stack workspace` 兼容）。
2. 在店铺总 Base 内创建 / 补齐 `社媒发布队列` 表；Pinterest 行 schema 见 `pin-queue-base-schema.md`。
3. 为 Pinterest 建推荐视图：Pinterest、Pinterest 草稿、Pinterest 已发、Pinterest 失败。
4. 确认 `Products 商品` 表有 `分享链接`，`Assets 素材池` 表能标记 Pinterest 候选和公开授权。

工作区 `.cache/` 可以继续用于图片发布副本处理，但它不是浏览器插件的输入源。插件只能拿服务器返回的 asset URL。

---

## 输出给用户的“接入完成”清单

模式 A 完成后，用一个块告诉用户：

```text
Pinterest 发布已接入：

服务器控制面：已启用
浏览器插件：已安装 / 已升级
插件能力：pinterest
`社媒发布队列` 表：{Base 链接}
Pinterest 登录态：由你的 Chrome 浏览器保存

下一步可以：
- “给 SKU TEACUP-001 出一条 pin 试试”（进入模式 B）
- “测试这条 Pinterest 草稿”（进入模式 C test）
```

如果无法验证插件在线，不要写“已安装 / 已升级”；改写成“等待插件上线，服务器会在创建任务时返回安装或升级提示”。

---

## 故障排查

### `BROWSER_TOOL_INSTALL_REQUIRED`

服务器还没有看到该租户的可用插件。把响应里的 `userMessage` 转给用户。常见原因：

- 插件未安装。
- 插件选项页没有保存 `Bridge Base URL`。
- `browserToolToken` 填错。
- 用户装的是旧 Etsy DM 插件，还没有 Pinterest capability。

### `BROWSER_TOOL_UPGRADE_REQUIRED`

插件版本低于服务器要求，或没有 `pinterest` capability。把响应里的 `userMessage` 转给用户，让用户更新同一个插件安装包。

### 插件在线但 Pinterest 页面没填好

让用户截图插件浮层 / Pinterest 页面。不要回退到 Hermes 本机 Playwright；这属于浏览器执行器 adapter 的问题，应在插件和服务器 job 结果里记录失败原因。

### Pinterest 弹了人机验证 / 二次验证

不替用户过验证。让用户在自己的 Chrome 里完成后，再重新领取或重跑任务。
