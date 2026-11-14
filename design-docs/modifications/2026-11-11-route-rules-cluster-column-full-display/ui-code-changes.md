# UI 代码变更：路由规则列表「目标 / 降级集群」列完整展示

> **日期**: 2026-11-11 ｜ **分支**: `ai-gateway-web-rainway` `v0.1.0-dev`
> **上游依据**: 用户反馈——路由规则列表中「目标集群/模型」「降级集群/模型」被省略号裁剪，需鼠标悬浮 Tooltip 才能看全，要求直接展示全量信息
> **对照接口**: 无改动（`targets[]` 的 `cluster_name` / `model` / `weight`，`fallbacks[]` 的 `cluster_name` / `model` 均不变）
> **状态**: UI 代码 ✅（eslint + 构建通过）｜ **菜单/路由变更**: 无

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 验证 |
| ----------- | -------- | ---- |
| 路由表详情 · 规则列表「目标集群/模型」列（`RouteTable/components/RouteRules.vue`，`targets`） | 去掉 `Tooltip` 与省略号裁剪；每个条目放在一个块级容器里独占一行，`Tag` 自身按内容收缩（`display: inline-block` + `max-width: 100%`），只有文本超过单元格宽度时才换行，边框不会拉满整格；格式仍为 `cluster/model: weight%` | eslint + 构建 |
| 路由表详情 · 规则列表「降级集群/模型」列（同文件 `fallbacks`） | 同上，格式仍为 `cluster/model`（无 weight）；空列表显示 `-` | eslint + 构建 |
| `RouteRules.vue` 内 `buildRuleColumns` | 抽出 `renderClusterTags(h, items, formatText)` 供两列复用（两列此前除文案外完全相同） | — |
| `RouteRules.vue` 的 `<style>` | 删除仅服务于旧 Tooltip 的 `.ivu-table-cell .ivu-tooltip { max-width: 100% }`，本组件已无 Tooltip | — |

## 2. 接口变更（diff）

无。

## 3. 规则细节与取舍

- **必须覆盖 iView `Tag` 的固定高度**：`.ivu-tag` 默认 `height: 22px; line-height: 22px; overflow: hidden`，只放开 `white-space` 会让换行后的第二行被裁掉，因此行内样式显式声明 `height: auto`、`overflow: visible`、`line-height: 20px`。
- **独占一行但不撑满整格**：每个条目外面套一个块级 `<div>`（带 `margin-bottom: 4px`）保证纵向排列，`Tag` 本身用 `display: inline-block` + `max-width: 100%` 按内容收缩——短文本边框只包住文字，长文本到单元格边界后才折行。早期实现用 `display: block; width: 100%` 会让短文本也撑出一条整格宽的边框，故弃用。
- **单元格随内容长高**：iView `.ivu-table-cell` 的 `overflow: hidden` 只裁横向溢出，换行后行高自动增加，无需为两列设置固定列宽。
- **`word-break: break-all`**：集群名 / 模型名通常是无空格的长标识符，仅靠 `white-space: normal` 不会折行，必须允许任意字符处断行。
- **保留 `Tag` 外观**：沿用 `Tag` 承载文本以维持视觉一致（浅灰底、圆角、12px）。
- **空值占位**：`targets` / `fallbacks` 为空时显示 `-`，与同表其它列一致（`targets` 此前为空时渲染空白）。
- **无 i18n 变更**：展示格式与文案键均沿用原有定义。

## 4. 既有用例影响

- 若自动化用例按 `.ivu-tooltip` 或 `title` 悬浮断言这两列，需改为直接断言 `Tag` 文本（`cluster/model[: weight%]`）。
- 行高随条目数量与文本长度变化，按固定行高定位元素的用例需改为按行文本定位。

## 5. 验收清单

- [x] eslint 通过（`RouteRules.vue` 无告警）。
- [x] `npm run build` 通过（仅既有包体积警告）。
- [ ] 浏览器复验：`cluster_name` 或 `model` 较长时换行完整显示，无省略号、无悬浮提示。
- [ ] 浏览器复验：多 target / 多 fallback 规则每个条目各占一行；空列表显示 `-`。