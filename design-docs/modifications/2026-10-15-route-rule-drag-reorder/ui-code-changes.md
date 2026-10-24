# UI 代码变更：路由规则拖拽调整生效次序

> **日期**: 2026-10-15 ｜ **前置**: [2026-10-14 数据报表图表维度下钻与过滤栏清理](../2026-10-14-report-dimension-drilldown/ui-code-changes.md) ｜ **上游依据**: api-define（`global-route-rules.md` §1 `rules`「规则列表，按顺序匹配」+ `entities.md` / `api-keys.md` 的 `route_rules.rules`）
> **对照接口**: `global-route-rules.md`（`PUT /global-route-rules`）/ `entities.md` / `api-keys.md`（`PATCH`，body 内 `route_rules.rules` 的数组顺序）｜ **对照原型**: `prototype-design/pages/route.html`
> **状态**: 原型 ⬜ · UI 代码 ✅ · 02 文档 ⬜ · 测试 ⬜ · 手册 ⬜ ｜ **菜单/路由变更**: 无

路由表内规则的**次序即匹配优先级**：BFE 按数组顺序逐条匹配表达式，**命中第一条即停止**。次序完全由提交时 JSON 数组的顺序承载（`PUT /global-route-rules` 与 Entity / API-Key 的 `PATCH` 均为全量提交），因此**后端无需任何改动**。但此前界面上没有任何调整次序的手段——用户只能「删除后重新添加」来把一条规则挪到前面，操作成本高且容易在删除与重建之间漏掉内容。本次在规则编辑模式下补齐行拖拽排序。

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 共享组件 `pageTable` | 新增「展示行 → `tableData` 原始下标」映射（`showSrcIndex` / `cloneShowSrcIndex` / `pageSrcIndex`），`dragDrop` 事件改派发**原始数组下标**；列筛选 / 列排序生效时不再移动错行 | ✅ UI |
| 路由规则编辑（`RouteRules.vue`） | 编辑模式下 `pageTable` 开启 `draggable` 并监听 `dragDrop`，拖拽后按「目标行原位置」插入并重新编号；查看模式无拖拽；列表下方加一行拖拽提示 | ✅ UI |
| 原型 `route.html` | 仍无拖拽交互，待补 | ⬜ 原型 |
| 02 文档 / Playwright 用例 / 手册截图 | 待补（见 §5、§6） | ⬜ |

## 2. 接口变更（diff）

本轮**无新增端点 / 字段 / 参数**。规则的次序语义早已在接口层确定（`global-route-rules.md` §1：`rules` 为「规则列表，按顺序匹配」，元素类型 `RouteRule`），本次仅把「数组顺序」这一既有语义暴露到界面上。请求体结构、字段名、错误码均零变化，**后端与数据面无需改动，前后端可独立发布**。

> 说明：传给后端的 `rules` 元素里不含次序字段，前端提交前会剔除内部字段（`index` / `_index` / `_rowKey`），次序只体现为数组元素位置。

## 3. 原型变更（未做）

`prototype-design/pages/route.html` 目前**仍没有拖拽交互**，规则列表只能通过新增 / 编辑 / 删除改变内容，无法调整次序。本轮以 UI 代码先行落地（需求明确、无需原型试错），原型补拖拽与本次变更的 Review 列为后续工作（见 §6）。

## 4. UI 代码变更（`src/`，本轮已完成）

| 文件 | 变更点 | 验收要点 |
| ---- | ---- | ---- |
| `src/components/table/pageTable.vue` | `data` 新增 `showSrcIndex` / `cloneShowSrcIndex` / `pageSrcIndex`；`tableData` watcher 两个分支、`searchTable` 清空与筛选四个分支、`sortChange` 三种情形均同步维护该映射；`handlePageData` 按页切片派生出 `pageSrcIndex`；`onDragDrop` 改为经 `pageSrcIndex` 查表后派发，映射缺失（`undefined`）时不派发 | 即使叠加列搜索或列排序，拖拽移动的仍是用户看到的那两行 |
| `src/modules/RouteTable/components/RouteRules.vue` | `pageTable` 增加 `:draggable="mode === 'edit'"` 与 `@dragDrop="onRuleDragDrop"`；新增 `onRuleDragDrop(startIndex, endIndex)`（`cloneDeep` 后先 `splice` 摘出被拖行，再按落点行**原始下标**插入，重新赋值 `rules` 并调用 `refreshRuleIndex()`）；编辑模式下列表下方新增 `.drag-tip` 提示行 | 拖拽后列表次序即时更新，重新编号后「编辑 / 删除」按钮仍指向正确规则；提交并生效后后端返回的次序与界面一致 |

- **插入位置语义（维护者决策）**：被拖拽行**插入到落点行的原始位置**（先移除再按落点行的原始下标插入），而不是「拖到目标之后」或「交换两行」。
- **i18n**：`route.dragToChangeOrder` 已存在于 `src/i18n/zh.js` / `en.js`（此前未被引用），本轮直接复用，**无需新增 key**。
- **默认无行为变化**：`draggable` 默认 `false`，除路由规则编辑模式外没有任何页面开启拖拽；未拖拽时展示顺序、分页、搜索、排序行为与变更前一致。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| `tests/route/*.spec.js`（7 个 spec） | 无处置 | 既有路由用例未覆盖「规则行次序」（`test_03` 中出现的"顺序"断言针对单条规则内 `fallbacks` 的展示顺序，与本变更无关）；本次不改变默认展示顺序、不改变接口契约与校验规则 |
| 其余模块用例 | 无处置 | `pageTable` 是共享组件，但 `draggable` 默认 `false`，未开启拖拽的页面 `pageSrcIndex` 只在内部维护、对外不可见 |

## 6. 下游影响（阶段 3/4/5 输入）

- **02 文档**：`ai-gateway-web-test/docs/route-management/` 需补「编辑模式拖拽调整规则次序」的用例与映射条目（含「列搜索 / 列排序下拖拽仍移动正确的行」这一回归点）。
- **测试**：Playwright 用例——编辑模式下把第 1 行拖到第 3 行后断言提交请求体（`PUT /global-route-rules` 或 `PATCH /entities|api-keys/{id}`）中 `rules` 的顺序变化；叠加列搜索或列排序后再拖拽，断言移动的是可见的那两行；查看模式下不存在拖拽句柄 / 不产生 `dragDrop`。
- **用户手册**：`06-route.md` §6.2 / §6.6 已随本轮更新；**截图待补**（`images/06-rules-list.png` 等编辑态截图为拖拽前的版本，`ai-gateway-web-test/scripts/capture-docs-screenshots.js` 重跑后才能反映拖拽提示行）。
- **文档站**：`docs/zh-cn/10-route.md` 已更新，其生成的孪生页面 `docs/zh-cn/site/*.html` **未手工修改**，需由 `docs/scripts/build-manual-site.js` 重新生成（本轮未执行）。
- **原型**：`prototype-design/pages/route.html` 补拖拽交互并 Review。
- **部署前置**：无（接口零变化）。

## 7. 验收与偏差

1. **「拖拽提示行」为临时补充**：设计上拖拽属于隐性交互，编辑模式下补一行 `拖动表格可修改生效次序` 的浅灰提示（`.drag-tip`），避免用户找不到入口；原型尚无对应元素，后续原型补齐时需一并确认文案与位置。
2. **列搜索 / 列排序下拖拽依然准确**：路由规则列使用 `sortable: 'custom'`（iView 不做内部排序，排序由 `pageTable` 自己完成），`pageTable` 在排序与分页切片时同步维护下标映射，因此叠加列搜索或列排序后，拖拽移动的仍是用户看到的那两行。`pageTable` 仅在列声明 `customSort`（排序完全交给父组件接管，本仓库当前没有任何列这样写，属兜底分支）时才清空映射、不派发事件。原型 / 手册不必描述该细节，但测试用例应覆盖列排序下的拖拽回归点。
3. **次序回显依赖后端**：切换路由表或刷新页面后列表按接口返回的数组顺序渲染，前端不再落任何本地次序状态；未提交的拖拽在退出编辑模式时随 `originalRules` 一起回滚。
4. **本轮只开放路由规则**：`pageTable` 的 `draggable` 仅由 `RouteRules.vue` 按编辑模式开启，其它列表（路由表列表、模型定价等）行为不变。

## 8. 本轮不做 / 已知限制

1. **仅支持当前页内拖拽**：`pageTable` 默认客户端分页、每页 20 条；拖拽只能在一页内调整次序，跨页移动需先调整每页条数或分多次拖拽。
2. **拖拽后列表回到第 1 页且列搜索 / 列排序状态被重置**：这是 `pageTable` 对 `tableData` 变化的既有行为（新增 / 编辑 / 删除同样触发），非本次引入。因此「先筛选再拖拽」时需注意筛选条件会被清空。
3. **列头排序只影响展示，不影响生效次序**：点击列头排序只改变当前视图，提交与匹配始终按数组顺序（即编辑模式下的拖拽结果）执行；列排序状态下拖拽同样按原始下标移动正确的行。
4. **查看模式没有拖拽**：`draggable` 只在 `mode === 'edit'` 时为真，查看模式既不显示拖拽提示也不响应拖拽。
5. **`customSort` 分支不派发拖拽事件（兜底，本仓库未使用）**：若某列声明 `column.customSort`，排序完全由父组件接管，展示顺序与原始下标无法对应，`pageTable` 会清空映射并使 `dragDrop` 不派发——表现为「拖了但没反应」，这是刻意的取舍（避免移动错行）。路由规则列用的是 `sortable: 'custom'`，不属于该分支，不受影响。
6. **被拖拽行的落点语义**：插入到**落点行的原始位置**（维护者决策），既非「拖到目标之后」，也非交换两行。