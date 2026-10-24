# UI 代码变更：规则模块拖拽排序、离开拦截与复制、路由表默认启用筛选

> **日期**: 2026-10-15 ｜ **前置**: [2026-10-15 路由规则拖拽调整生效次序](../2026-10-15-route-rule-drag-reorder/ui-code-changes.md) ｜ **上游依据**: api-define（`ai-cache-rules.md` / `traffic-mirror-rules.md` / `ai-context-rules.md` 的 `rules`「规则列表，按顺序匹配」+ `route-tables` 列表接口）
> **对照接口**: `ai-cache-rules.md` / `traffic-mirror-rules.md` / `ai-context-rules.md`（`PUT`，body 内 `rules` 数组顺序）/ `route-tables.md`（`GET`，`enabled` 筛选参数）｜ **对照原型**: 无对应原型更新
> **状态**: 原型 ⬜ · UI 代码 ✅ · 02 文档 ⬜ · 测试 ⬜ · 手册 ⬜ ｜ **菜单/路由变更**: 无

AI 缓存、流量镜像、AI 上下文三个规则模块与路由规则同属「集合级规则、数组顺序即匹配优先级」的交互族，但此前只有路由规则支持编辑模式拖拽排序；三个兄弟模块只能「删除 + 新增」重排，且切换菜单时未提交的改动会被静默丢弃。本轮把路由规则页已验证的四件套（拖拽排序 + 提示行、脏数据守卫、提交并生效置灰、未提交离开拦截）平移到三个兄弟模块，并给路由规则页补行内「复制」、给路由表列表加默认「启用」筛选。

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| AI 缓存规则（`AICache/index.vue`） | 规则 `pageTable` 编辑模式开启拖拽 + 提示行；`onRuleDragDrop` 重排 `rules`；「提交并生效」脏数据前置灰；新增 `beforeRouteLeave` 未提交拦截 | ✅ UI |
| 流量镜像规则（`TrafficMirror/index.vue`） | 同上（拖拽只改 `rules`，`tableRules` 计算属性自动重算） | ✅ UI |
| AI 上下文规则（`AIContext/index.vue`） | 同上（mode 字段为 `rulesMode`、脏数据为 `isRulesDirty`） | ✅ UI |
| 路由规则（`RouteRules.vue`） | 「提交并生效」脏数据前置灰；行操作新增「复制」（`-copy` 后缀、插入源行下方） | ✅ UI |
| 路由表列表（`RouteTable/index.vue`） | 「状态」筛选默认「启用」（首次请求即带 `enabled` 筛选） | ✅ UI |
| i18n（`zh.js` / `en.js`） | `aiCache` / `trafficMirror` / `aiContext` 三个命名空间各新增 `dragToChangeOrder` | ✅ UI |
| 原型 / 02 文档 / Playwright 用例 / 手册截图 | 待补（见 §5、§6） | ⬜ |

## 2. 接口变更（diff）

本轮**无新增端点 / 字段 / 参数**。规则次序语义早已由接口层确定（三个规则模块的 `PUT` 均为全量覆盖式提交，`rules` 数组顺序即匹配顺序），本次仅把「数组顺序」暴露到兄弟模块界面；`GET route-tables` 的 `enabled` 筛选参数为既有参数，本次只是让前端默认带上它。请求体结构、字段名、错误码均零变化，**后端与数据面无需改动，前后端可独立发布**。

## 3. 原型变更（未做）

原型未覆盖本轮任何交互（兄弟模块拖拽、离开确认、复制按钮、列表默认筛选均无对应原型页更新），以 UI 代码先行落地，原型补齐与 Review 列为后续工作（见 §6）。

## 4. UI 代码变更（`src/`，本轮已完成）

| 文件 | 变更点 | 验收要点 |
| ---- | ---- | ---- |
| `src/modules/AICache/index.vue` | 规则 `pageTable` 增加 `:draggable="mode === 'edit'"` 与 `@dragDrop="onRuleDragDrop"`；下方加 `.drag-tip` 提示行（`aiCache.dragToChangeOrder`）；新增 `onRuleDragDrop(startIndex, endIndex)`（`cloneDeep` 副本上先 `splice` 摘出再按落点下标插入，赋值回 `rules`，**不**重新编号——行按钮按 `name` 实时 `findRowIndex` 定位）；「提交并生效」加 `:disabled="!isDirty"`；新增 `beforeRouteLeave`（编辑态且脏时弹 `aiCache.exitConfirm`，确定放行 / 取消拦截） | 编辑模式可拖拽且提示行仅编辑态可见；拖拽后行按钮仍指向正确规则；无改动时提交按钮置灰；带改动切菜单弹确认 |
| `src/modules/TrafficMirror/index.vue` | 同上（命名空间 `trafficMirror`）；拖拽只重排 `this.rules`，展示用 `tableRules` 计算属性（补 `_removeHeadersText`）自动重算 | 同上路基；镜像目标列等派生展示随拖拽即时刷新 |
| `src/modules/AIContext/index.vue` | 同上（mode 字段 `rulesMode`、脏数据 `isRulesDirty`、命名空间 `aiContext`） | 同上；规则行按 `cond` 定位，拖拽天然精确 |
| `src/modules/RouteTable/components/RouteRules.vue` | 「提交并生效」加 `:disabled="!isDirty"`；行操作新增「复制」按钮（`v-has`，`type="success"`，置于最左，调用 `onCopyRule(row.index)`）；新增 `onCopyRule(index)`：深拷贝源行并剔除 `index` / `_index` / `_rowKey`，新名 `原名-copy`（截断到 64 字符、重名自动 `-copy2`…），插入源行下一行后 `refreshRuleIndex()`；操作列 `width` 150 → 220；「目标集群和模型」之后新增「备用集群和模型」列（`fallbacks`，标签 + 悬停 Tooltip，无备用显示 `-`）；以上细节见 §10 | 无改动时提交置灰；复制行紧跟源行、名称唯一、提交体不含内部字段；三个行按钮不换行；备用列与目标列展示一致 |
| `src/modules/RouteTable/index.vue` | 「状态」列定义加 `searchValue: 'true'`；`data().searchParams` 初始值改为 `{ enabled: 'true' }` | 首屏列表只展示已启用路由表，搜索行状态筛选默认选中「启用」 |
| `src/i18n/zh.js` / `src/i18n/en.js` | `aiCache` / `trafficMirror` / `aiContext` 命名空间在 `exitConfirm` 后各加 `dragToChangeOrder`（zh：拖动表格可修改生效次序 / en：Drag rows to change the matching order） | 三模块提示行中英双语正常 |

- **三个兄弟模块的脏数据 computed 原本已带守卫**（`mode !== 'edit' || originalRows === null` 返回 `false`，与 `RouteRules` 同形），本轮仅消费它做置灰与路由守卫，未改动其语义，`exitEditMode` 行为不变。
- **`beforeRouteLeave` 拦截范围**：仅规则编辑模式（`mode === 'edit'` / `rulesMode === 'edit'`）且脏时拦截；AI 缓存的语义设置 Tab、AI 上下文的设置 Tab 不在拦截范围（其「取消」本就无二次确认，是既有设计）。
- **路由表列表 query 直达不受影响**：`openFromQuery()`（APIKey / Entity / Clusters 页跳转 `?type&owner&rule`）直接打开规则详情视图，不触碰 `searchParams`，默认启用筛选不会丢失。
- **默认无行为变化**：`pageTable` 的 `draggable` 默认 `false`；其余未开启拖拽的页面行为与变更前一致。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| 路由表列表用例（假设无默认状态筛选） | 需更新 | 首屏请求现在默认带 `enabled=true`，只返回已启用路由表；断言全量列表或停用表可见性的用例需先清空 / 切换状态筛选 |
| 点击「提交并生效」的用例（规则页 ×4） | 需更新 | 未做任何改动时按钮置灰，直接点击不生效；用例需先产生改动（新增 / 编辑 / 删除 / 拖拽 / 复制 / 改启用状态）再提交 |
| 兄弟模块切换菜单的用例 | 需更新 | AI 缓存 / 流量镜像 / AI 上下文在编辑态且有未提交改动时切菜单会弹「确认离开」Modal，用例需先处理该弹窗（确定 / 取消） |
| 其余模块用例 | 无处置 | `pageTable` `draggable` 默认 `false`；路由规则页除新增复制按钮外交互不变 |

## 6. 下游影响（阶段 3/4/5 输入）

- **02 文档**：`ai-gateway-web-test/docs/` 需补四个规则页「拖拽排序」「复制规则」「未提交离开拦截」「提交置灰」的用例与映射条目，以及路由表列表「默认启用筛选」用例。
- **测试**：Playwright 用例——编辑模式下拖拽行后断言提交体数组顺序；复制按钮生成 `-copy` 名称且提交体无内部字段；未提交改动切菜单弹确认（确定丢弃 / 取消停留）；列表首屏请求断言 `enabled=true`。
- **用户手册**：`ai-gateway-user-manual/06-route.md` 已随本轮更新（提交置灰说明、状态筛选默认值）；**该手册没有 AI 缓存 / 流量镜像 / AI 上下文章节**，无需修订；截图待补（复制按钮与置灰态截图仍为旧版）。
- **文档站**：`ai-gateway-web/docs/zh-cn/15-ai-cache-rules.md` / `16-traffic-mirror-rules.md` / `18-ai-context.md` 已更新，其生成的孪生页面 `docs/zh-cn/site/*.html` 未手工修改，需由构建脚本重新生成（本轮未执行）。
- **部署前置**：无（接口零变化）。

## 7. 验收与偏差

1. **拖拽落点语义沿用维护者决策**：被拖拽行插入到落点行的原始位置（先移除再按落点原始下标插入），与路由规则页一致。
2. **兄弟模块不重新编号**：路由规则页靠客户端 `row.index` 定位行、拖拽后必须 `refreshRuleIndex()`；三个兄弟模块的行按钮在点击时按 `name`（AI 上下文按 `cond`）实时 `findRowIndex`，天然免疫次序变化，因此拖拽后**不**做重编号，也未引入 `index` 字段。
3. **提交置灰口径**：`isDirty` / `isRulesDirty` 在「非编辑模式」或「无基准快照」时恒为 `false`，因此视图模式、初次进入编辑模式未改动时按钮均置灰；改动回滚回原始状态后自动恢复置灰。
4. **本轮无偏差**：实现与需求逐条对齐。

## 8. 本轮不做 / 已知限制

1. **拖拽仅页内有效**：`pageTable` 客户端分页、默认每页 20 条，跨页移动需调大每页条数或分多次拖拽。
2. **拖拽后回到第 1 页且列搜索 / 列排序被重置**：这是 `pageTable` 对 `tableData` 变化的既有行为（新增 / 编辑 / 删除同样触发），与路由规则页一致，非本次引入。
3. **「复制」仅编辑模式可见**：查看模式行操作不变（仅「查看」）；复制的规则名默认带 `-copy` 后缀，仍受表内唯一性约束（重名自动递增序号）。
4. **AI 上下文行定位按 `cond`**：该模块规则无 `name` 字段、以生效条件为身份，拖拽与行按钮定位都以 `cond` 为键，因此即使规则名缺失拖拽也是精确的。
5. **离开拦截只管规则编辑态**：语义设置（AI 缓存）、全局设置（AI 上下文）的未保存改动不在 `beforeRouteLeave` 拦截范围，维持既有「取消即丢弃」行为。

## 9. 当日缺陷修复：默认筛选在修改其他筛选条件后丢失

- **现象**：路由表列表默认「启用」筛选仅在首次请求生效；用户再选择「类型」等其他筛选后，请求中 `enabled=true` 丢失，停用的数据混入结果。
- **根因**：列定义上的预置 `searchValue`（`RouteTable/index.vue` 状态列）只作用于下拉框显示与父组件初始 `searchParams`；共享 `pageTable` 的 `searchMessage` 从未收录该默认值，服务端分页下任何一次筛选变更都会以「本次变更的键」整体替换父组件参数，默认值随之被丢弃。`ModelPrices` 的预置 provider 筛选存在同一隐患。
- **修复**：`src/components/table/pageTable.vue` 的 `columns` watcher 在 `serverPagination` 下把列上非空的预置 `searchValue` 种入 `searchMessage`（键已存在或值为空时不覆盖/不种入）。用户主动清除后不再种入，默认值不「粘滞」。
- **验证**（Playwright 真机，请求级断言）：默认请求带 `enabled=true` → 选类型后请求同时带 `type=…&enabled=true` → 清除状态后请求不带 `enabled`（停用的 Global 表可见）→ 全部清除后请求完全无筛选；`ModelPrices` 带 `?provider=test` 预置时改其他筛选后请求仍保留 `provider=test`；报表明细等无预置筛选的服务端分页页回归正常。

## 10. 当日补充调整（复制按钮位置样式、操作列宽、备用集群列）

§4 中「复制按钮插入编辑/删除之间」的表述以本节为准，三处后续调整均按维护者反馈落地：

1. **复制按钮位置与样式**：行操作顺序调整为「复制（`type="success"`）→ 编辑（primary）→ 删除（error）」，复制按钮置于最左——复制视为高频「新增」操作，应更醒目。
2. **操作列加宽**：操作列 `width` 由 150 调整为 220，容纳三个 small 按钮不换行。
3. **新增「备用集群和模型」列**：位于「目标集群和模型」列之后，展示 `fallbacks`（`cluster_name/model` 标签 + 鼠标悬停 Tooltip，样式与目标列一致；无备用时显示 `-`；支持搜索与列头排序，列头排序仅影响展示、不影响生效次序）。i18n 复用既有 `route.fallbackClusterAndModel`（zh：备用集群和模型 / en：Backup Cluster and Model），无新增 key。`docs/zh-cn/10-route.md` §10.3 列表列说明同步更新，操作列描述改为「复制/编辑/删除」。
