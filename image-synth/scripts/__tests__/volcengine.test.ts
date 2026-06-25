import { describe, expect, it } from "vitest";
import { buildArkBody } from "../volcengine.js";

const base = { slug: "doubao-seedream-4-5-251128", prompt: "a cup", width: 2048, height: 2048 };

describe("buildArkBody", () => {
  it("watermark 必须关(否则方舟默认加 AI 水印)", () => {
    expect(buildArkBody({ ...base, references: ["data:..."] }).watermark).toBe(false);
  });
  it("单张参照图 → image 是字符串", () => {
    expect(buildArkBody({ ...base, references: ["uri1"] }).image).toBe("uri1");
  });
  it("多张参照图 → image 是数组", () => {
    expect(buildArkBody({ ...base, references: ["a", "b"] }).image).toEqual(["a", "b"]);
  });
  it("size 拼成 WxH,response_format=b64_json", () => {
    const b = buildArkBody({ ...base, references: ["u"], width: 1365, height: 2048 });
    expect(b.size).toBe("1365x2048");
    expect(b.response_format).toBe("b64_json");
    expect(b.model).toBe("doubao-seedream-4-5-251128");
  });
  it("没 seed 时不带 seed 字段", () => {
    expect("seed" in buildArkBody({ ...base, references: ["u"] })).toBe(false);
    expect(buildArkBody({ ...base, references: ["u"], seed: 7 }).seed).toBe(7);
  });
});
