# 如何添加新数据源

## DataSource 合约

每个数据源是 `sources/` 目录下的一个 TypeScript 模块，默认导出一个对象：

```typescript
interface TrendSource {
  name: string;
  fetch(opts: { geo: string }): Promise<{
    items: TrendItem[];
    screenshotPath: string;
    snapshotPath: string;
  }>;
}
```

## 添加步骤

1. 在 `scripts/sources/` 下创建 `<source-name>.ts`
2. 实现 `TrendSource` 接口并 `export default`
3. 在 `runner.ts` 的 `KNOWN_SOURCES` 数组中添加 source name
4. 在 `runner.ts` 的 `GEO_ALLOWLIST` 中添加该 source 支持的地区
5. 添加测试：`__tests__/<source-name>-parser.test.ts` + HTML fixture
6. 运行 `npm test` 确认通过

## 命名规则

- 文件名 = source name = CLI 参数（如 `google-trends` → `sources/google-trends.ts` → `trend-fetch google-trends`）
- evidence 文件：`<source-name>-screenshot.png`、`<source-name>-snapshot.html`

## 迭代路径

| 版本 | Source | 文件 |
|------|--------|------|
| v0.1 | google-trends | `sources/google-trends.ts` |
| v0.2 | google-trends-chinese | `sources/google-trends-chinese.ts` |
| v0.3 | pinterest-trends | `sources/pinterest-trends.ts` |
| v0.4 | pinterest-chinese | `sources/pinterest-chinese.ts` |
