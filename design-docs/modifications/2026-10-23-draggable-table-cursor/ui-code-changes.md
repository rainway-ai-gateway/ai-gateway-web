# UI 代码变更：可拖拽表格行统一显示「小手」光标

> **日期**: 2026-10-23 ｜ **前置**: [2026-10-23 批量任务游标分页](../2026-10-23-batch-list-cursor-pagination/ui-code-changes.md) ｜ **上游依据**: 无接口变更（交互优化，用户反馈）
> **对照接口**: 无 ｜ **对照原型**: `prototype-design/pages/{route-tables,batches}.html`（原型未实现拖拽排序，无对应改动）
> **状态**: 原型 ✅（无需改动） · UI 代码 ✅ · 02 文档 ✅ · 测试 ✅ · 手册 ✅ ｜ **菜单/路由变更**: 无

多个模块的规则表支持编辑模式下拖拽调整顺序（路由规则 / AI 缓存规则 / 流量镜像规则 / AI 上下文压缩规则），但鼠标移上去没有指针提示，用户不容易发现行可拖。本次在**共享 `pageTable` 组件**统一加 `cursor: grab`（按下 `grabbing`），四个模块一次性生效且后续新接入的拖拽表格自动具备。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 路由规则详情 · 规则列表 | 编辑模式下可拖拽行显示「小手」，按下「抓紧」；查看模式不显示 | ✅ |
| AI 缓存规则 · 规则列表 | 同上（共用 `pageTable`） | ✅ |
| 流量镜像规则 · 规则列表 | 同上 | ✅ |
| AI 上下文压缩 · 规则列表 | 同上 | ✅ |

## 4. UI 代码变更

- `src/components/table/pageTable.vue`（scoped 样式，**唯一实现点**）：
  - `::v-deep .ivu-table-tbody tr[draggable='true'] { cursor: grab; }`
  - `::v-deep .ivu-table-tbody tr[draggable='true']:active { cursor: grabbing; }`
  - 用行属性选择器而不是「编辑模式」类名：iView 仅在 `:draggable` 为 true 时给行加 `draggable="true"`（四个模块均为 `:draggable="mode === 'edit'"`），光标因此自动跟随可拖拽状态——进编辑模式出现，退出即消失。
- 未在各模块重复写样式，避免四处漂移（路由模块初稿曾写在 `RouteRules.vue`，已回收到 `pageTable`）。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| `RT-D-28`（`tests/route/test_11_route_rule_drag_reorder.spec.js`） | 已微调 | 首个用例新增「编辑模式行显示 grab 光标」步骤；退出编辑模式补「不显示 grab」断言 |
| `AC-DR-01`（`tests/ai-cache/test_07_ai_cache_drag_leave.spec.js`） | 已微调 | 视图/编辑/退出三步分别补光标断言（null / grab / null） |
| `TM-DR-01`（`tests/traffic-mirror/test_07_traffic_mirror_drag_leave.spec.js`） | 已微调 | 同上 |
| `AX-DR-01`（`tests/ai-context/test_07_ai_context_drag_leave.spec.js`） | 已微调 | 同上 |
| `pages/{route,ai-cache,traffic-mirror,ai-context}/*Page.js` | 已微调 | 四个页面对象各新增 `expectRuleRowsCursorStyle(page, expected)`：读取行 `getComputedStyle().cursor`，`'grab'` 断言相等、`null` 断言不等 |
| 其余用例 | 无影响 | 光标为纯展示样式，不影响拖拽落点、提交置灰、离开拦截等行为 |

## 6. 下游影响

- 02 文档：`docs/route-management/02-功能测试用例/02-路由规则详情.md` §2.28；`docs/ai-cache/…/07-拖拽排序与离开拦截.md`（AC-DR-01）；`docs/traffic-mirror/…/07-…`（TM-DR-01）；`docs/ai-context/…/07-…`（AX-DR-01）——均补充「可拖拽光标」预期。
- 测试：四个 drag spec + 四个页面对象（见 §5）。
- 用户手册：`07-route.md`、`08-ai-cache-rules.md`（两处）、`09-traffic-mirror-rules.md`、`11-ai-context.md` 的拖拽说明补「鼠标移到行上会变成小手光标」；站点已重建，`build-manual-site.js` / `verify-manual-site.js` 均 **0 问题**。
- 原型：`pages/route-tables.html` 等未实现拖拽排序，本次不涉及；后续原型补拖拽时需同步同一属性选择器样式。

## 7. 验收结果（2026-10-23）

- 四个 drag spec 定向复跑：**合计 22/22 通过、0 失败、0 跳过**（route `test_11` 3 条、ai-cache `test_07` 7 条、traffic-mirror `test_07` 6 条、ai-context `test_07` 6 条）；编辑模式 `cursor` 实测为 `grab`，视图模式不为 `grab`。证据 [report/test-report-20261023-180558.md](../../../../ai-gateway-web-test/report/test-report-20261023-180558.md)。
- `npm run lint`（web）：exit 0。
- 手册重建与自检：0 问题（757 内部链接、94 图片）。