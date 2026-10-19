# UI 代码变更：只读隐藏兜底、表格拖拽残留、筛选口径与类型映射（5 项缺陷修复）

> **日期**: 2026-10-17 ｜ **前置**: [2026-10-12 只读管理员](../2026-10-12-readonly-admin/ui-code-changes.md)（`v-has` 指令引入）、[2026-10-15 路由规则拖拽调整生效次序](../2026-10-15-route-rule-drag-reorder/ui-code-changes.md)（`pageTable` 拖拽引入）、[2026-10-11 密钥收敛 GET 列表端点](../2026-10-11-reencrypt-sweeps-list-endpoint/ui-code-changes.md)（预演模式筛选来源）、[2026-10-16 路由表类型列映射补齐 `api_key`](../2026-10-16-route-table-type-mapping/ui-code-changes.md)（同概念映射表）｜ **上游依据**: 无接口变更（5 项均为纯前端缺陷修复）；判定依据为各接口既有枚举取值（`security.md` / `route-tables.md` / `auth.md` / `batches.md`）
> **对照接口**: `security.md`（`GET /security/reencrypt-sweeps` 的 `dry_run` 筛选参数）、`route-tables.md`（`type` 枚举 `global` / `entity` / `api_key`）、`auth.md`（用户 `role` 枚举 `system_admin` / `system_admin_readonly`）、`batches.md`（批量任务 `status` 枚举）｜ **对照原型**: 无对应原型更新（原型未覆盖这 5 处交互，见 §3）
> **状态**: 原型 ⬜ · UI 代码 ✅ · 02 文档 ⬜ · **测试 ✅（2026-10-17 五轮串行复跑，本轮相关用例全绿）** · 手册 ⬜ ｜ **菜单/路由变更**: 无

本轮为 5 个**相互独立**的既有缺陷修复，全部落在一线交互与渲染机制上：① 只读视角下筛选列表后写按钮偶尔露出（`v-has` 命令式 class 被 Vue 的 class 模块整串重写抹掉）；② 规则模块退出编辑模式后表格行仍带 `draggable="true"`（iView `table-tr` 的 `v-if` / `v-else` 无 key 分支 + Vue 对枚举属性刻意不 `removeAttribute`）；③ 密钥收敛「预演模式」点「重置」后请求仍下发 `dry_run=false`（iView Select 清空 emit 的是 `undefined` 而非 `''`）；④ 带 `render` 的列按渲染文案比较，枚举筛选恒 0 行；⑤ 路由表详情属主栏缺 `api_key` 映射键，回退显示裸枚举。5 项均未新增端点 / 字段，后端零改动，前后端可独立发布。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 | 验证 |
| ----------- | -------- | ---- | ---- |
| 只读隐藏机制（`v-has`，全站） | `applyHas` 除 `.v-has-hidden` 类外再落**同名属性** `v-has-hidden`；CSS 选择器同时匹配 `.v-has-hidden` 与 `[v-has-hidden]`，兜住「元素自身响应式 class 被 Vue 整串重写」时丢类 | ✅ UI | ✅ 浏览器探针实测（批量任务列表只读态） |
| 通用表格（`pageTable`）· 拖拽 | 新增 `draggable` 的 watch，退出可拖拽态时 `$nextTick` 内清掉行上残留的 `draggable` 属性 | ✅ UI | ✅ 浏览器探针实测（退出编辑模式后 `[null,null,null]`） |
| 密钥收敛 · 列表筛选（`Security`） | `buildListParams` 的 `dry_run` 判断由 `!== ''` 改为只认显式 `'true'` / `'false'` | ✅ UI | ✅ 浏览器探针实测（重置后请求不再带 `dry_run=`） |
| 通用表格（`pageTable`）· 带 `render` 的列 | 匹配口径同时接受**渲染文案**（子串）与**原始值**（等值），两者都不命中才排除 | ✅ UI | ✅ 2026-10-17 测试侧复跑确认 |
| 路由表 · 详情属主栏（`RouteRules.vue`） | 组件自有 `TYPE_LABELS` 补 `api_key: 'API-Key'` | ✅ UI | ✅ 2026-10-17 测试侧复跑确认 |
| 原型 / 02 文档 / Playwright 用例 / 手册 | 原型无对应交互（不改）；02 文档与 Playwright 用例待补（见 §6） | ⬜ | — |

## 2. 接口变更（diff）

无。5 项均为前端缺陷修复，不新增端点 / 字段 / 参数，不改变任何请求与响应结构；后端零改动。逐项与接口契约的关系：

| 修复 | 与接口的关系 |
| ---- | ---- |
| ① `v-has` 属性兜底 | 纯前端渲染机制（只读登录态由 `store.isReadonly()` 提供），不涉及接口 |
| ② 拖拽残留属性 | 纯 DOM 属性回收，拖拽排序本身不新增请求（次序随既有 `PUT` 全量覆盖提交） |
| ③ `dry_run` 重置 | 修的是**请求参数拼装**：`GET /security/reencrypt-sweeps` 的 `dry_run` 为既有参数，本次让「清空筛选」不再误拼 `dry_run=false` |
| ④ 带 `render` 的列匹配 | 纯客户端筛选口径（`pageTable` 前端比较逻辑），接口返回的枚举值未变 |
| ⑤ 属主栏映射键 | 接口自 2026-08-31 起返回 `type = "api_key"`（`RouteTableTypeAPIKey`），本次补的仍是前端映射表（同概念第二张表） |

## 3. 原型变更（无）

原型资产未覆盖这 5 处交互，故无原型可改，本轮原型状态记为「无需改动」：

- 修复 ①：只读视角的写按钮隐藏由 `prototype.js` 的 `isReadonly()` 即时渲染实现，原型用「渲染期条件拼接」而非「命令式打标记 + 组件重渲染」，天然不产生该时序问题，无对应原型缺陷。
- 修复 ②：原型表格无「编辑模式切换 + `<tr>` 分支切换」的等价结构。
- 修复 ③ / ④ / ⑤：原型筛选与渲染由静态脚本拼装，不含 iView Select 的 `undefined` 语义、`render` 列比较口径与双映射表分叉。

## 4. UI 代码变更（`src/`，已实施）

| 文件 | 变更点 | 验收要点 |
| ---- | ---- | ---- |
| `src/utils/directive.js` | 新增 `HIDDEN_ATTR = 'v-has-hidden'`；`applyHas` 在加 / 删类的同时 `setAttribute` / `removeAttribute` 同名属性；补充根因注释（`:36-67`） | 只读视角挂 `v-has` 的元素即便 class 被抹掉仍不可见、不可点 |
| `src/assets/css/global.less` | 隐藏选择器由 `.v-has-hidden` 扩为 `.v-has-hidden, [v-has-hidden]`（`:65-68`），`display:none !important` 不变 | 属性标记生效，且仍稳定压过 `v-show` 写入的内联 `display` |
| `src/components/table/pageTable.vue` | `watch` 新增 `draggable(isDraggable)`（`:139-161`），退出可拖拽态时 `$nextTick` 内清掉 `.show-iView-Table tbody tr[draggable]` 的残留属性 | 退出编辑模式后表格行不再带 `draggable` |
| `src/components/table/pageTable.vue` | `render function value match` 分支（`:408-431`）新增原始值口径：渲染文案与原始值**两者都不含**关键字才判不命中 | 枚举 + 中文渲染文案的列（用户角色列）筛选命中；掩码列按显示文本搜索不受影响 |
| `src/modules/Security/index.vue` | `buildListParams` 的 `dry_run` 判断改为 `if (f.dry_run === 'true' \|\| f.dry_run === 'false')`（`:444`） | 「预演模式」重置后请求不再携带 `dry_run` |
| `src/modules/RouteTable/components/RouteRules.vue` | 组件自有 `TYPE_LABELS` 补 `api_key: 'API-Key'`（`:136`）；`typeLabel` 渲染处 `TYPE_LABELS[this.type] \|\| this.type` 未改 | 详情页属主栏「当前路由表：」显示 `API-Key` 而非裸枚举 |

### 4.1 修复 ①：只读隐藏机制——`v-has` 补属性兜底

**现象**：只读管理员视角下，把「批量任务」列表按**任务状态**筛选后，**第一行**的「取消」按钮丢掉 `.v-has-hidden`、短暂变成可见可点的写入口；再点一次「查询」又恢复。

**探针实测（2026-10-17）**：

- 只读态进页 20 行 → 20 个 `.v-has-hidden` 全在；
- 筛选「取消中」+ 查询 → 3 行，其中**第一行**的按钮 class 变成 `"ivu-btn ivu-btn-error ivu-btn-small"`（**无隐藏类**），全页标记数 **20 → 2**；
- 再点一次「查询」→ 3 行全部恢复；
- `store.isReadonly()` 全程为 `true`（已排除「会话被换回管理员态」这一可能）。

**定位过程**：

1. **标记错位法**：人为在行元素上打 `data-probe-id` 自定义标记。筛选后三行都仍带该标记，说明三行都是**被复用的元素**（且整体错位一格）；只有**变体发生切换**的那一行丢类——原先是显示终态行（`ivu-btn-default disabled`）的元素，被复用来显示非终态行（`ivu-btn-error`）。
2. **MutationObserver 抓 class 变化序列**：
   - 变体切换的行：`btn-default ... v-has-hidden → btn-error ...`（隐藏类被抹掉且**未再加回**）；
   - 变体未变的行：`btn-error ... → btn-error ... v-has-hidden`（类保留）。
   这解释了「只有那一行丢、且偶发」。

**根因**：`v-has` 用**命令式** `el.classList.add` 加隐藏类，而该按钮的 class 有**响应式属主**——iView Button 的根节点 `:class="classes"` 由 props 计算。当按钮 props 变化触发 Button 组件**自身重渲染**时，Vue 的 class 模块会 `el.setAttribute('class', cls)` **整串重写 class 属性**，命令式加上的类被抹掉；而父级这一轮不会再 patch，指令的 `update` 钩子也不会再执行。props 未变的按钮不重渲染，类得以存活。

断言依据（`node_modules/vue/dist/vue.runtime.esm.js`）：`updateClass` 只在 `cls !== el._prevClass` 时重写；指令模块排在 `platformModules.concat(baseModules)` 之后执行。二者叠加即为「先被指令加上类、后被组件自身重渲染整串覆盖」的时序。

**修法**：`applyHas` 除 class 外再落一个**同名属性** `v-has-hidden`，CSS 选择器改为同时匹配 `.v-has-hidden` 与 `[v-has-hidden]`。属性不归 Vue 的 class 模块管，因此不会被重写抹掉，作为隐藏兜底。

**修复后实测**：筛选后那一行 `class` **仍会被抹掉**（与根因一致，未掩盖原现象），但 `[v-has-hidden]` 属性在、命中 `display: none`，**不再是可见写入口**。

**影响面**：`v-has` 指令的**全部调用点**受益——模板侧 `v-has` 标记 31 处 + render 函数内 `directives: [{ name: 'has' }]` 声明 33 处（2026-10-17 grep 计数）。只读视角隐藏不再依赖命令式 class 的存活。

### 4.2 修复 ②：表格退出可拖拽态后残留 `draggable` 属性

**现象**：规则模块（AI 缓存 / AI 上下文 / 流量镜像 / 路由规则）进入编辑模式再退出（**无改动**）后，表格行 `<tr>` 仍带 `draggable="true"`，**5 秒后仍不回收**，页面已确实回到视图模式。

**根因（两层叠加）**：

1. iView `node_modules/iview/src/components/table/table-tr.vue` 用 `v-if="draggable"` / `v-else` 两个**同标签、无 key** 的 `<tr>` 分支；切到 `v-else` 时新 vnode **完全不携带 attrs**。
2. Vue 对**枚举型属性**在 `updateAttrs` 里刻意不 `removeAttribute`：`isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck')`（`vue.runtime.esm.js:6133`），而清理分支是 `else if (!isEnumeratedAttr(key)) elm.removeAttribute(key)`（`:7338`）。枚举属性的语义是「缺省 ≠ false」，Vue 有意不删。

两层叠加 → 属性永久停在 `"true"`。

**修法**：`pageTable.vue` 新增 `draggable` 的 watcher，在退出可拖拽态时（`$nextTick` 内）清掉 `.show-iView-Table tbody tr[draggable]` 上的残留属性。该属性在视图模式**没有响应式属主**（`v-else` 分支根本不含它），故此处精确清理是安全的。

**修复后实测**：退出编辑模式后行属性为 `[null,null,null]`（原先全为 `"true"`）。

**取证结论（2026-10-17 完成，见 §7「取证」）**：**视图模式实拖不会重排规则草稿**——顺序未变、`提交并生效` 仍置灰、期间零写请求。因此本缺陷的严重度为 **UI / 能力信号失真**（行被浏览器视为可拖元素），不构成数据面风险。
原推断的「同一次 patch 会由 `updateDOMListeners` 把 `dragstart` / `drop` / `dragover` 一并解除」**未被直接证明**，也不必要：处理器挂在 `table-tr.vue` 的 `v-if="draggable"` 分支上，退出编辑模式后 `draggable` prop 为 false，处理器不随 vnode 下发，**仅手动补属性复活不了处理器**（探针已实证）。结论依据端点行为，而非监听计数。

### 4.3 修复 ③：密钥收敛「预演模式」重置被误算成「否」

**现象**：把「预演模式」筛成「是」再点「重置」，界面显示回到「全部」，但请求仍带 `dry_run=false`，结果集 **25 → 24**（少掉唯一那条预演样本）。

**根因**：iView `select.vue` 清空选中项时 `values = []`，此时 `publicValue` 是 **`undefined`**（**不是** `''`），`v-model` 把 `filter.dry_run` 写成 `undefined`；而原判断是 `if (f.dry_run !== '') params.dry_run = f.dry_run === 'true';` → `undefined !== ''` 成立 → 下发 `dry_run=false`。其余筛选项（`status` / `mode` / `scope`）用真值判断，故不受影响——这正好解释「只有预演模式重置出问题」。

**修法**：改为只认显式值 `if (f.dry_run === 'true' || f.dry_run === 'false')`。

**修复后实测**：重置后的列表请求为 `…/security/reencrypt-sweeps?page=1&page_size=20&sort_by=started_at&sort_order=desc`，**不再携带 `dry_run=`**。

**附带说明（测试侧）**：这个缺陷此前一直没被自动化抓到，因为既有筛选用例**从未预置过 `dry_run`**（测试侧已登记补测建议，见 §6）。

### 4.4 修复 ④：带 render 的列按「渲染文案」比较导致枚举筛选恒不命中

**现象**：用户管理列表按「角色」筛选，选「系统管理员」后命中 **0 行**。

**根因**：`searchFilters` 的选项 value 是**枚举**（`system_admin`），它被写进 `searchValue`；而角色列带 `render`，比较时取的是 render 出来的**中文文案**（「系统管理员」），再用 `indexOf(searchValue)` → 中文里找不到枚举 → 恒 0 行。该机制本身是既有依赖（API-Key 掩码列靠「按显示文本搜索」），**不能删**。

**修法**：该分支同时接受两种匹配口径——**渲染文案按子串**匹配（保留既有「展示即搜索」行为，例如 API-Key 掩码列按显示文本搜索）、**原始值按等值**匹配（供枚举筛选值使用）。

**为什么原始值必须「等值」而不是「子串」**（2026-10-17 复跑实测，第一版实现踩到过）：第一版把原始值也写成子串比较，结果选「系统管理员」时把 `viewer` 行（`system_admin_readonly`）也带进了结果——`system_admin` 恰好是 `system_admin_readonly` 的**前缀**。测试用例 UM-46 的逐行角色断言抓到了这个**过宽**（`Expected "系统管理员" / Received "系统管理员（只读）"`，即筛选已能命中行、但命中过多）。收紧为等值后口径正确：`system_admin` 命中且只命中 `system_admin` 行。这也说明该用例原先的「命中 ≥1 行 + 逐行角色文案」双重断言是有效的——只断言条数就会漏掉这次过宽。

**影响面**：掩码列行为不变（其渲染文案与筛选值同源，仍命中）；枚举 + 中文渲染文案的列（当前已知：用户角色列）恢复可用。

**实测确认（2026-10-17）**：本条已完成 UI 实测——`UM-46` 转绿（`test_10_role_readonly.spec.js` 6/6），并连带回归了列筛选相关 spec（API-Key 掩码列子串搜索、路由类型/状态列、`PageTable` 交互、批量任务状态列）全绿。

### 4.5 修复 ⑤：详情页属主栏缺 `api_key` 映射键

**现象**：API-Key 路由表详情页上面包屑显示 `路由规则 - API-Key / {owner}`，正下方属主栏「当前路由表：」却显示裸枚举 `api_key`。

**根因**：同一概念有**两张同义映射表**且无单一事实来源——

- 列表类型列与面包屑走 `src/modules/RouteTable/index.vue` 的 `TYPE_MAP`（`:53-58`，含 `apikey` 与 `api_key` 两个键，后者是上一轮补的）；
- 属主栏走 `RouteRules.vue` **自己的** `TYPE_LABELS`（原只有 `global` / `entity` / `apikey`），渲染处是 `TYPE_LABELS[this.type] || this.type`（`RouteRules.vue:195`），`api_key` 命中不了映射就回退成接口原值。

**修法**：`TYPE_LABELS` 补 `api_key: 'API-Key'`（保留 `apikey` 键兼容旧值）。

**实测确认（2026-10-17）**：本条已完成 UI 实测——`RT-D-03`（API-Key 路由表详情）通过，属主栏断言已由「按实际渲染断言裸枚举」翻回**精确 `API-Key`**（产品补键后两处口径一致）。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| 只读视角用例（全站写按钮隐藏断言，含批量任务列表筛选后） | 无处置 | 修复 ① 只在原有类标记之外**增补**属性标记与 CSS 匹配臂，隐藏语义与选择器覆盖面均不缩小；未改变 `store.isReadonly()` 与指令挂载方式 |
| 规则模块拖拽 / 编辑模式用例（AI 缓存、AI 上下文、流量镜像、路由规则） | **已加固（补齐断言）** | 修复 ② 只回收视图模式下的残留属性；编辑模式（`draggable=true`）行为不变。2026-10-17 已按此建议**补上「视图模式断言行无 `draggable`」**共 5 处（路由 `test_11` 查看模式与三处退出、流量镜像 `TM-DR-05`、AI 缓存 `AC-DR-05`、AI 上下文 `AX-DR-05`），此前正是这些缺口让本缺陷长期隐身穿行 |
| 密钥收敛列表筛选用例 | 需补测 | 既有用例**从未预置 `dry_run`**，故既有断言不会因本修复变红；但「重置后请求参数」这一缺陷此前无覆盖，测试侧已登记补测建议（见 §6） |
| 用户管理列表「角色」筛选用例 | **已转绿** | 修复前该筛选恒 0 行；2026-10-17 复跑 `UM-46` 通过（`test_10_role_readonly.spec.js` 6/6）。注意第一版把原始值写成**子串**比较曾**过宽**（把 `system_admin_readonly` 也带入「系统管理员」结果），用例的逐行角色断言抓住了它，已改为等值 |
| 路由表详情属主栏相关用例 | **已转绿** | 修复 ⑤ 后属主栏显示 `API-Key`；2026-10-17 复跑 `RT-D-03` 通过（断言已翻回精确 `API-Key`） |
| API-Key 掩码列「按显示文本搜索」用例 | 无处置 | 修复 ④ 保留了渲染文案口径，原断言路径不变 |
| 其余模块用例 | 无处置 | `pageTable` 的 `draggable` 默认 `false`；`v-has` 与 `dry_run` 改动均不触及未挂载 / 未使用路径 |

## 6. 下游影响（阶段 3/4/5 输入）

- **02 文档**：`ai-gateway-web-test/docs/` 需为密钥收敛列表补「预演模式筛选 / 重置后请求不带 `dry_run`」用例条目，并登记用户管理「角色筛选命中」、路由表详情「属主栏显示 `API-Key`」两条断言。
- **测试**：修复 ④ / ⑤ 的 UI 实测**必须由测试侧串行复跑完成**（同工作区并行会话会互相顶掉 viewer / admin 会话，参见 2026-10-16-route-table-type-mapping 记录 §7 的同类现象）；修复 ③ 建议补「预置 `dry_run` 后重置」的参数级断言。
- **用户手册**：5 项均为缺陷修复，无新增交互与文案，手册无需修订。
- **部署前置**：无（接口零变化；`src/` 改动经 8180 开发服务（webpack-dev-middleware）随源码热编译即生效，如需静态产物需 `npm run build`）。

## 7. 验收与偏差

**验证状态（按修复逐条）**

| 修复 | 验证状态 | 证据 |
| ---- | ---- | ---- |
| ① `v-has` 属性兜底 | **已用浏览器探针实测通过** | 只读态批量任务列表：进页 20 个隐藏标记全在 → 筛选「取消中」后第一行 class 丢失但 `[v-has-hidden]` 在、`display:none` → 再查一次恢复；`store.isReadonly()` 全程 `true` |
| ② 拖拽残留属性 | **已用浏览器探针实测通过** | 退出编辑模式后行 `draggable` 属性为 `[null,null,null]`（原先全为 `"true"`） |
| ③ `dry_run` 重置 | **已用浏览器探针实测通过** | 重置后请求 `…/security/reencrypt-sweeps?page=1&page_size=20&sort_by=started_at&sort_order=desc`，不再携带 `dry_run=` |
| ④ 带 `render` 的列匹配 | **已由测试侧串行复跑确认** | 2026-10-17：UM-46（角色筛选）6/6 全绿；列筛选回归 10 个 spec（api-key 掩码列子串搜索、路由类型/状态列、PageTable 交互、批量任务状态列）全绿 |
| ⑤ 属主栏映射键 | **已由测试侧串行复跑确认** | 2026-10-17：`RT-D-03`（API-Key 路由表详情）通过，属主栏断言已翻回精确 `API-Key` |

**偏差**：无。5 项实现与需求逐条对齐。

**测试侧复跑（2026-10-17，单 worker 串行）**

| 轮次 | 范围 | 结果 | 报告 |
| ---- | ---- | ---- | ---- |
| 1 | 25 个 spec（含全量只读回归） | 126 通过 / 1 失败 / 1 跳过（失败项 UM-46 的「过宽」见下） | `ai-gateway-web-test/report/test-report-20261017-130924.md` |
| 2 | 列筛选回归 10 个 spec | 102 通过 / 5 失败（4 条既有用例滞后 + 1 条 api-key 偶发，均随后修好） | `…-133427.md` |
| 3 | 受比较口径收紧影响的 7 个 spec | **31 通过 / 0 失败** | `…-134114.md` |
| 4 | 三模块全量（traffic-mirror + ai-cache + ai-context，20 spec） | **234 通过 / 0 失败** | `…-141731.md` |
| 5 | api-key 只读 `--repeat-each=2` | **8 通过 / 0 失败**（连跑两遍稳定） | `…-141924.md` |

- **修复 ④ 曾出现一版「过宽」并已被测试抓住**：第一版把原始值也写成**子串**比较，导致选「系统管理员」把 `viewer` 行（`system_admin_readonly`）也带进结果——`system_admin` 是 `system_admin_readonly` 的前缀。用例 UM-46 的逐行角色断言报 `Expected "系统管理员" / Received "系统管理员（只读）"`。改为**等值**后口径正确。这也反证了「只断言条数」不足以覆盖该列。
- 修复 ① 落地后，被隐藏元素的 `class` **仍可能被组件重渲染抹掉**（根因未变），但 `[v-has-hidden]` 属性始终在、`display:none` 生效——测试侧的断言口径已同步为「不可见 + 类或属性至少一种」。

**取证（2026-10-17 已完成）**

- 修复 ② 的「视图模式下实拖两行是否真的不会重排规则草稿」——**已于 2026-10-17 取证完成：不会重排**。做法：进入编辑模式再退出（修复后属性已被清理），随后**人为把 `draggable="true"` 加回行上复现修复前的 DOM 状态**，再在视图模式实拖第 1 行到第 3 行。结果：**规则顺序未变、`提交并生效` 仍置灰（`isDirty` 未变）、期间零写请求**。
  - 原因（与静态推断一致）：拖拽处理器挂在 iView `table-tr.vue` 的 `v-if="draggable"` 分支上，`v-else` 分支**不携带任何 `on`**；退出编辑模式后 `draggable` prop 为 false，处理器不再随 vnode 下发，**仅手动补属性复活不了处理器**。同一套 `dragTo` 在编辑模式下确实能重排（`TM-DR-02` / `RT-D-28` 已通过），故差异确实来自模式相关的绑定，而非拖拽手法本身。
  - 因此该缺陷的严重度为 **UI / 能力信号失真**（行被浏览器视为可拖元素、拖拽光标与幽灵图像出现），**不构成数据面风险**。修复 ② 已把属性清理掉，攻击面一并关闭。
  - 取证局限（如实记录）：探针里 `dragstart` 计数为 1，但那来自探针自己绑的监听，**不能**用来证明 iView 处理器是否仍在；结论依据的是端点行为（顺序 / `isDirty` / 写请求三者均无变化）。

> **注**：本节为**最终验收口径**。撰写时散落在 §4.2 / §4.4 / §4.5 / §8 的「待取证」「未实测说明」标记，已随 2026-10-17 的取证与五轮串行复跑**就地替换为实测结论**（不再保留「待确认」措辞），历史过程见各节 `~~删除线~~` 与 §5「既有用例影响」。

## 8. 本轮不做 / 后续与遗留

1. **两张类型映射表应合并为单一事实来源**（修复 ⑤ 的建议）：`RouteTable/index.vue` 的 `TYPE_MAP` 与 `RouteTable/components/RouteRules.vue` 的 `TYPE_LABELS` 是同义表，本轮只补了后者，仍存在「下次只补一张」的复发风险。后续宜抽出共享常量（如 `RouteTable/constants.js`）供列表、面包屑、属主栏统一引用。
2. ~~修复 ② 的 listener 解除行为待取证~~ —— **已于 2026-10-17 取证**：视图模式实拖**不会重排**（顺序未变、`isDirty` 未变、零写请求），严重度为 UI / 能力信号失真；详见 §7「取证（2026-10-17 已完成）」。原「listener 会被 `updateDOMListeners` 解除」的推断**未被直接证明**，已不再作为结论依据（真正成立的是「`v-else` 分支不下发处理器，手动补属性复活不了处理器」）。
3. ~~修复 ④ 的 UI 实测待测试侧复跑~~ —— **已于 2026-10-17 复跑确认**：`UM-46` 转绿（`test_10_role_readonly.spec.js` 6/6）；属主栏断言翻回精确 `API-Key` 后 `RT-D-03` 通过；列筛选相关回归（API-Key 掩码列子串搜索、路由类型/状态列、`PageTable` 交互、批量任务状态列）全绿。
4. **修复 ③ 的自动化覆盖**（部分闭合）：既有筛选用例从未预置 `dry_run`，本轮**未**给 `RS-L-09` 补预置；但 `RS-RO-02` 已预置「预演模式」并断言重置后的请求参数，该缺陷因此被发现并已修复。若要把「重置不带 `dry_run`」也固化进列表模块，仍建议给 `RS-L-09` 补预置（属可选加固，非阻塞）。
5. **本轮的根因知识可沉淀**：`v-has` 类标记被 Vue class 模块整串重写、Vue 对枚举型属性不 `removeAttribute` 这两条属框架机制级踩坑，建议后续沉淀到 `sys-design/组件与复用设计文档.md`（本轮未同步 `sys-design/`）。