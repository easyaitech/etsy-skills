# Ads Manager Pin 图生成器：Board 选择必须限定在右侧面板

## 触发场景

发布 Pinterest 轮播 Pin 时，工具走 Ads Manager 的 `Pin 图生成器`。页面左侧同时存在推广计划设置区域，其中 `定位详情 > 地点` 也有搜索输入框。

如果自动化用全页 `Search/搜索` 输入框或全页文本匹配来选择 Board，可能把 Board 名（如 `Chinese Calligraphy Meanings`）填入左侧 `地点` 搜索框，导致提示“未找到结果”，而右侧 Pin 图生成器的 Board 仍未选择。

## 用户纠正

用户截图指出：当画面左侧 `定位详情 > 地点` 中出现 Board 名时，说明自动化选错位置了。正确位置是右侧 `Pin 图生成器` 顶部附近的 `选择图板` 按钮/下拉框。

## 修复原则

1. Ads Manager 轮播发布中，Board 选择器、Board 搜索框、Board 候选项点击都必须限定在右侧 `Pin 图生成器` 面板内。
2. 不要用全页 `.last()` / 全页 `input[placeholder*=Search]` / 全页 `getByText(board)` 作为 Board 操作 fallback。
3. 若无法确认右侧 Board 下拉已打开，应安全中止，明确报错：为避免误填左侧 `定位详情 > 地点`，不继续发布。
4. 不要用 `Escape` 清理下拉状态；在 Ads Manager 中它可能关闭整个 Pin 图生成器 modal。
5. 可用坐标/区域守卫：候选元素 `boundingBox().x` 必须在页面右侧面板范围内（例如大于 viewport 宽度的 45%），再执行点击或填入。
6. 失败时不要盲目继续 final publish，避免生成错误广告草稿或错误 Pin。

## 已验证代码模式

在 `publish_playwright.js` 中采用类似模式：

- `isRightSideLocator(locator, page, minXRatio)`：检查元素可见且位于右侧。
- `firstVisibleRightSide(locator, page, minXRatio)`：只从右侧候选里选第一个可见元素。
- `findAdsManagerBoardSelector(page, dialog)`：优先找右侧 `选择图板 / Select board / Board` 按钮，再 fallback 到 `data-test-id="board-dropdown-select-button"`。
- `clickBoardCandidate(page, candidate, { minXRatio })`：候选项和 DOM fallback 均过滤 `getBoundingClientRect().x >= minX`。
- 搜索框使用 `firstVisibleRightSide(searchInputs, page, 0.45)`；找不到就中止。

## 回归测试建议

- 添加测试确认源码包含右侧区域守卫与防误填报错。
- 测试点：
  - Board 搜索不再使用全页 `.last()`。
  - 搜索输入来自 `firstVisibleRightSide(searchInputs, page, 0.45)`。
  - DOM fallback 也包含 `getBoundingClientRect().x >= minX`。
  - 错误文案包含“避免误填左侧 定位详情 > 地点”。

## 与重试流程的关系

若失败记录原因是 `未能确认 Board 已选中`，先修/验证上述右侧面板限定逻辑，再重试。不要在旧逻辑下继续重试同一轮播 Pin。