# UI 代码变更：批量任务列表游标分页体验与正确性修正

> **日期**: 2026-10-23 ｜ **前置**: [2026-10-23 报表目标模型筛选与路由组合去重](../2026-10-23-report-target-model-filter-and-route-fallback-dedup/ui-code-changes.md) ｜ **上游依据**: 无接口变更（沿用 `batches.md` §2.2 主键游标分页：`cursor` + `limit`，响应 `next_cursor`）
> **对照接口**: `batches.md` §2.2（`limit` 默认 50 / 上限 200；不使用 `page` / `page_size`） ｜ **对照原型**: `prototype-design/pages/batches.html`、`assets/js/ivu-ui.js`
> **状态**: 原型 ✅ · UI 代码 ✅ · 02 文档 ✅ · 测试 ✅ · 手册 ✅ ｜ **菜单/路由变更**: 无

接口保持主键游标分页不动，本次只修 UI 侧：翻页条件快照、请求竞态、首页按钮、页码/条数提示、每页条数对齐接口默认、末页空页自动回退。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 批量任务列表 · 翻页 | 「首页」按钮 + 「第 N 页 / 本页 M 条」提示，翻页中按钮禁用 | ✅ |
| 批量任务列表 · 筛选 | 翻页按**已应用条件快照**请求，改筛选未查询不影响翻页口径 | ✅ |
| 批量任务列表 · 稳定性 | 请求序号丢弃过期响应；末页空页自动回退一页 | ✅ |
| 批量任务列表 · 每页条数 | `PAGE_LIMIT` 20 → 50（与接口默认一致，减少翻页次数） | ✅ |

## 3. 原型变更

- `assets/js/ivu-ui.js`（游标分页分支）：由「上一页 / 下一页」扩展为「首页 / 上一页 · 第 N 页 · 本页 M 条 / 下一页」，新增 `firstDisabled` / `pageIndex` / `pageCount` 选项。
- `pages/batches.html`：渲染分页时传入上述选项；新增「首页」按钮点击（清空游标栈）。
- `assets/css/prototype-overrides.css`：补批量任务分页条样式——容器左对齐（`text-align: left`）、按钮间距 8px、页码/条数 `margin-left: 12px` 与灰色 12px 字号、「下一页」左侧 16px，与正式 UI 的 `CursorPager` 保持一致。

## 4. UI 代码变更

- `src/modules/BatchTasks/index.vue`
  - 新增 `appliedFilter`：`onQuery` / `onReset` 时快照当前筛选，`fetchData()` 只读快照；`onQuery` / `onReset` / `onFirst` 同时重置 `nextCursor`。
  - 新增 `requestSeq`：每次请求自增，`then/catch/finally` 只处理最新序号的响应；翻页按钮统一 `:disabled="... || loading"`。
  - 新增「首页」按钮与 `pageIndex`（游标栈深度）、`pageCount`（本页条数）展示；分页条改为复用 `CursorPager` 组件（见下）。
  - 末页空列表（后端本页满 `limit` 仍返回 `next_cursor`）自动退回上一页，避免停在空表。
  - `PAGE_LIMIT` 20 → 50。
- 新增通用组件 `src/components/table/cursorPager.vue`（`CursorPager`）：props `hasPrev` / `hasNext` / `pageIndex` / `pageCount` / `loading`，events `first` / `prev` / `next`；适用于所有「`cursor` + `limit` + `next_cursor`」型接口。**不提供页码跳转与总数**——`pageTable` 的 `serverPagination` 需要 `total` + `currentPage/pageSize`，与游标模型不兼容。分页条**左对齐**（`justify-content: flex-start`，与表格左边界一致）；「下一页」左侧留 16px 间距（`.cursor-pager-next`），避免与页码/条数贴在一起。
- `src/i18n/zh.js` / `src/i18n/en.js`：分页文案上移到 `com` 命名空间（`firstPage` / `prevPage` / `nextPage` / `pageIndicator` / `pageCount`），供组件复用；删除 `batchTasks` 下同名分页键。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| `BT-L-01`（`test_01_batch_task_list.spec.js`） | 已微调 | `limit` 断言随 `PAGE_LIMIT=50`；新增首页按钮置灰、页码/条数文案、分页条与表格左对齐（容差 4px）、条件快照（改筛选未查询时第二页请求不携带该条件）断言 |
| `BT-L-10` | 已微调 | 首页断言补充「首页」按钮；新增「翻至末页 → 点首页回到第 1 页、按钮重新置灰」步骤 |
| `BT-L-11` | 已微调 | 空列表时「首页」按钮同样 `disabled` |
| `pages/batch-tasks/BatchTaskPage.js` | 已微调 | `PAGE_LIMIT` 同步为 50；新增 `firstButton` / `clickFirstPage` / `isFirstDisabled` / `pagerInfoTexts` 与文案常量；分页文案选择器改指组件内的 `.cursor-pager-info` |
| 其余批量任务用例 | 无影响 | 仅读取首页数据；`limit` 变大不改变置灰与筛选语义（取消类用例仍要求先造数恢复非终态样本） |

## 6. 下游影响（阶段 3/4/5 输入）

- 02 文档：`docs/batch-tasks/01-测试场景概览.md`（分页场景与分页数据前置：每页 50）、`02-功能测试用例/01-列表页.md`（BT-L-01 / BT-L-10 / BT-L-11）、`02-功能测试用例/03-取消.md`（首页 `limit=50` 说明）。
- 测试：`tests/batch-tasks/test_01_batch_task_list.spec.js`、`pages/batch-tasks/BatchTaskPage.js`。
- 用户手册：`13-batch-tasks.md`（页面构成、每页条数、翻页规则、注意事项、截图说明）。站点已重建，`build-manual-site.js` / `verify-manual-site.js` 均 **0 问题**。

## 7. 验收结果（2026-10-23）

- 环境：控制台 dev server（8180）已热编译；为验证两页翻页临时补 30 行 `batch-seed-26..55`（MySQL `open_bfe.batch_tasks`），验证后已删除，库恢复 25 行。
- `tests/batch-tasks/test_01_batch_task_list.spec.js`：**11/11 通过、0 跳过**（含真实第二页、首页回退、条件快照）；抽出 `CursorPager` 后复跑仍 **11/11 通过**，并新增「分页条与表格左对齐（容差 4px）」断言；左对齐/「下一页」16px 间距改动的定向复跑 **1/1 通过**。
- `npm run lint`（web）：exit 0；原型 `ivu-ui.js` 与 `pages/batches.html` 内联脚本 `node --check` 均通过。
- 控制台告警：批量任务列表进入时 `[Vue warn]` / `Invalid prop` 计数 **0**（`Tag` 颜色属性修复，见 §9）。
- 顺带修正运行库：MySQL `open_bfe.batch_files` 缺 `filename` 列（此前误对未启用的 SQLite 副本执行了 ALTER），已按 `db_ddl.sql` / `db_ddl_upgrade_to_0.0.11.sql` 补 `VARCHAR(256)`。

## 8. 仍受接口限制（不改接口无法解决）

- 无总条数、无跳页：`cursor` + `next_cursor` 不提供 count，页码只能由前端游标栈推算。
- 列表为 `ORDER BY id ASC`（旧→新）：跨页反转会打乱顺序，改为「新→旧」需改接口/SQL。

## 9. 附带修复：Tag 颜色属性误用（2026-10-23）

进入批量任务控制台时控制台告警 `[Vue warn]: Invalid prop: custom validator check failed for prop "type"`。根因：iView `Tag` 的 `type` 只接受 `border` / `dot`，颜色必须走 `color`（预设含 `default` / `primary` / `success` / `warning` / `error`…），而本模块把 `success` / `warning` / `default` 传给了 `type`，既触发告警，也使 Tag 未按预期上色。

- `src/modules/BatchTasks/index.vue`：列表「状态」「结算状态」两列渲染由 `props: { type: ... }` 改为 `props: { color: ... }`，方法更名 `statusTagType` / `settleTagType` → `statusTagColor` / `settleTagColor`。
- `src/modules/BatchTasks/components/BatchView.vue`：详情抽屉两处 `<Tag :type=...>` 改为 `<Tag :color=...>`，方法同步更名。
- 回归护栏：`tests/batch-tasks/test_01_batch_task_list.spec.js` 的 BT-L-01 增加控制台采集，断言进入列表页无 `[Vue warn]` / `Invalid prop`。
- 全局核查：`src/` 其余模块的 Tag 均已使用 `color`（`OperationLogs` / `EntityList` / `ApiKeyList` / `Cert` 等），Providers 的 `type: 'success'` 属 `Button`（合法），无同类问题。