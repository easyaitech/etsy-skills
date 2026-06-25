# 中心后端生图契约 (image-synth ↔ backend)

> image-synth step 7 经 `terminal` 调本契约出图。生图是**按张收费的外部 API**(GPT Image 2 / OpenRouter),放在中心后端是为了 **一份 key + 中心配额/计费 + 换模型只改一处**(与 17track/logistics-tracking 同结论)。
> **端点是薄控制面,不是新生图引擎。** 生成本身**复用现成工具**(OpenRouter,见 [`../scripts/openrouter.ts`](../scripts/openrouter.ts) ~60 行);端点只加 ① per-profile token 鉴权 ② 按租户配额/计费 ③ model allowlist ④ idempotency 去重 ⑤ 日志脱敏,然后转发给现成工具。**别在端点里重写生成。** 共享 key + 多租户是它存在的唯一理由——单租户/每租户自带 key 时这层可省,skill 直接调现成工具。
> 本文档是 skill 侧与后端侧的唯一对齐源。后端实现见后端仓库。

## Endpoint
```
POST {BACKEND_BASE}/image/generate
Headers:
  Authorization: Bearer <per-profile token>     # 不是 body 里的 tenant!见“鉴权”
  Content-Type: application/json
  Idempotency-Key: <本次请求唯一 id>            # 重试复用同一个 → 后端去重
```

## Request
```jsonc
{
  "prompt":        "<最终 prompt>",
  "references":    ["<base64 data url>", ...],   // 商品实拍图 0..N(见“参照图上限”)
  "aspect_ratio":  "3:4",                        // "1:1"|"4:5"|"3:4"|"2:3"|...
  "resolution":    "1K",                         // "1K"|"2K"|"4K"
  "quality_tier":  "standard",                   // 可选;后端映射到 allowlist 模型
  "seed":          12345                          // 可选
}
```
- **不传 `model` slug**。模型由**后端 allowlist** 决定(默认 `openai/gpt-5.4-image-2`)。client 至多给 `quality_tier`,后端映射。(防租户点贵模型 / 绕安全)
- **参照图上限**(后端校验,超限 422):单张 ≤ 8MB、总数 ≤ 10、mime ∈ {jpeg,png,webp}。建议 mini 侧先压缩到长边 ≤ 2048。

## Response
```jsonc
// 200
{
  "image_b64":     "<png base64>",
  "mime":          "image/png",
  "width":         768,
  "height":        1024,
  "model":         "openai/gpt-5.4-image-2",   // 后端实际用的模型
  "cost":          0.046,                       // 可能为 null(上游没回)→ 后端按单价兜底估并置 cost_estimated:true
  "cost_estimated": false,
  "request_id":    "<后端请求 id>",
  "attempt":       1
}
```
- skill 把 `image_b64` 写盘;sidecar `.json` 落 `model / request_id / cost / cost_estimated / backend / attempt`(对齐 [output-layout.md](output-layout.md) sidecar schema)。

## Errors(JSON,绝不静默)
```jsonc
4xx { "error": { "code": "quota_exceeded"|"bad_params"|"refs_too_large"|"unauthorized", "message": "..." } }
5xx { "error": { "code": "upstream"|"timeout", "message": "..." } }
```
skill 行为:`quota_exceeded`→报「配额用尽」;`timeout`/`upstream`/网络→报「生图服务不可达/超时」+ 退避重试**一次**(复用同 Idempotency-Key);仍败→停,不对缺失图跑 QA。

## 鉴权(关键,防伪造)
- **不能只靠 body 里的 `tenant`** —— 同一 mini 多个租户 profile 共用一个 Tailscale 机器身份,body 字段可伪造,中心配额就形同虚设。
- **每 profile 一个签名 token**(install 时下发,存 profile 内),后端按 token 反查 tenant + 校验。tenant 不再由 client 自报。

## 计费/配额(防双扣、防漏记)
- **reserve → commit/refund 账本 + Idempotency-Key 去重**,不是裸 `check+decrement`:
  - 收到请求:按 Idempotency-Key 查;命中已完成 → 直接返缓存结果(不重复调上游、不重复扣)。
  - 未命中:reserve 配额 → 调 OpenRouter → 成功 commit(扣 + 记 cost)/ 失败 refund。
- 计费口径:**按成功出图的 attempt 计**(QA 失败重试是新 attempt,各计各的;上游失败不计)。

## 同步 vs 异步(v1 决定)
- **v1 同步**:后端超时 **180s**(GPT 通常 <60s,见过一次 887s 偶发) → 超时返 `5xx timeout`;Idempotency-Key 保证重试不重复扣。
- 若延迟成慢性 → 升级 async(submit→poll job),本期不做。

## 隐私(多租户中心化必备)
- 日志**脱敏**:base64 参照图、prompt 全文**不入日志**(只记 hash/尺寸/字节数)。
- 图片在后端的保留期:出图返回后即删除中转副本(或明确 TTL),不长期留存租户实拍图。
- 中心配额/用量 Base 表**按租户行级隔离**。
- OpenRouter 数据出境:在租户协议/说明里告知。

## 不属于本契约
- 升清(草稿→升清):独立 fast-follow。
- 看图(anchor / QA):留 Hermes `vision_analyze`,不走后端。
