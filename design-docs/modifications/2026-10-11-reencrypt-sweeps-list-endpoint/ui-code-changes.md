# UI 代码变更文档

> **前置**：[2026-10-10 批量任务与密钥收敛](../2026-10-10-batch-tasks-and-key-reencrypt/ui-code-changes.md)（密钥收敛模块首次引入，仅 POST + GET by task_id，无列表接口）
> **对照接口**：`security.md`（本次新增 §3 `GET /security/reencrypt-sweeps` + §1 新增 `created_by` + 三处语义对齐）
> **对照原型**：`prototype-design/pages/security.html`（重写）、`prototype-design/assets/js/mock-data.js`（新增 `reencryptSweeps` 数据集）
> **状态**：**原型已完成（已 Review）** · **UI 代码待实施（阶段 2 后续）**

本次迭代是上一轮「密钥收敛模块」的**增量**：后端 commit `50b2866 feat(security): reencrypt-sweeps 补充 GET 列表端点（历史翻查/过滤分页/created_by）+ 三处契约对齐` 为 `security/reencrypt-sweeps` 补充了 **GET 列表端点**，并对外暴露 `created_by`，同时把 `summary`/`duration_ms`/`error` 三处语义在文档中与实现对齐。

上一轮原型/代码把「无列表接口」作为前提（历史任务仅本会话内累积、进入页面不调用任何接口）。本次变更据新接口改为 **消费 GET 列表接口**（服务端过滤 + offset 分页 + 排序），并在列表与详情中新增 **触发者 `created_by`**、对齐 **running（summary 空 / duration 0 / finished_at 空）/ dry-run（`error="dry_run"` 语义标记）** 语义。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 状态 |
| ----------- | -------- | ---- |
| 密钥收敛 · 历史任务列表 | **消费新增的 `GET /security/reencrypt-sweeps`**（原先「无列表接口、仅本会话累积」作废）：筛选栏（任务状态 / 变换方向 / 扫描范围 / 预演模式 / 开始时间起止）+ **offset 分页**（`page`/`page_size`，默认 1/20）+ **列头排序**（`sort_by` 仅 `started_at`/`task_id`，默认 `started_at desc`）；列 = 任务ID / 状态(tag) / 变换方向 / 扫描范围 / 预演 / **触发者(`created_by`)** / 开始时间 / 耗时(ms) / 操作（详情）；**运行中任务同样出现在列表中** | ✅ 原型 · ⬜ UI |
| 密钥收敛 · 运行中任务横幅 | 运行中任务改由**列表结果**识别（`list` 中 `status=running` 项），进度经 `GET /{task_id}` 轮询；running 时 `summary` 为空对象、`duration_ms=0`、`finished_at` 为空（横幅统计显示「任务运行中，统计将于完成后写入。」） | ✅ 原型 · ⬜ UI |
| 密钥收敛 · 详情抽屉 | 新增 **触发者(`created_by`)** 行；running 时：耗时显示 `-`、summary 区显示「任务运行中，统计将于完成后写入。」；`scope` 决定渲染哪张统计表（`all` 两张 / `providers` 一张 / `api_keys` 一张）；**dry-run 任务 `error="dry_run"` 以蓝色语义提示展示，不走红色失败告警**；其余 `error`（如 `executor lost`）走红色告警 | ✅ 原型 · ⬜ UI |
| 密钥收敛 · 触发（POST） | 触发语义不变（POST 全可选，409 单例互斥携带持有者 `task_id`）；触发后**刷新列表**（新任务以 running 出现在列表首位或经轮询更新） | ✅ 原型 · ⬜ UI |
| mock 数据集 | `mock-data.js` 新增 `reencryptSweeps.list`（8 条语义化记录 + 16 条分页填充行 = 24 条，演示 2 页） | ✅ 原型 |

> 本次**无新增菜单 / 无路由变更**：密钥收敛页面（`ReencryptSweep.list`）入口沿用上一轮。

---

## 2. 接口依据

### 2.1 新增 `GET /open-api/v1/security/reencrypt-sweeps`（列表）

**接口**：`GET /open-api/v1/security/reencrypt-sweeps`（FeatureSecurity(scope=System)+`read`；只读，**不写操作日志**）。

**Query 参数（全可选）**：

| 参数 | 类型 | 默认 | 说明 | 合法性条件 |
| ---- | ---- | ---- | ---- | ---- |
| `status` | string | - | 按任务状态过滤 | 仅 `running` / `succeeded` / `failed` |
| `mode` | string | - | 按行级变换方向过滤 | 仅 `reencrypt` / `decrypt` |
| `scope` | string | - | 按扫描范围过滤 | 仅 `all` / `providers` / `api_keys` |
| `dry_run` | bool | - | 按是否只扫描过滤 | true / false |
| `start_time` | string | - | 按 `started_at` 过滤下界（含） | 合法 RFC3339 时间 |
| `end_time` | string | - | 按 `started_at` 过滤上界（含） | 合法 RFC3339 时间；**早于 `start_time` 时 422** |
| `page` / `page_size` | int | 1 / 20 | 分页 | 见 `00-common.md`；`page_size` 1-100，超出截断为 100 |
| `sort_by` / `sort_order` | string | `started_at` / `desc` | 排序 | `sort_by` 有效字段**仅 `started_at`、`task_id`**，其他值**忽略并回落默认**；`sort_order` 仅 `asc`/`desc` |

**返回**：`{ list: []SweepTask, pagination: { page, page_size, total } }`（`total` 为过滤后总记录数）。

**约束**：

- 默认按 `started_at` 倒序（新→旧）。
- **运行中任务同样出现在列表中**，其字段为库内已落库值（`summary` 为空对象、`duration_ms` 为 0、`finished_at` 为空、`error` 为空串）。
- dry-run 任务 `status=succeeded`、`error` 固定为 `"dry_run"`（非空、非失败）。
- 错误码：401 / 402（无 FeatureSecurity 权限）/ 422（过滤值非法或 `end_time` 早于 `start_time`，字段级归因）。

### 2.2 任务对象新增 `created_by`（列表与 GET by task_id 均返回）

| 字段 | 类型 | 说明 | 取值 |
| ---- | ---- | ---- | ---- |
| `created_by` | string | 任务**触发者名称** | 系统记录，**未识别触发者时为空串**；不含任何密钥或密文材料；列表排障追溯用 |

> POST 触发响应**不变**（不含 `created_by`）。

### 2.3 三处语义对齐（文档修正，实现行为不变）

| 位置 | 修正前（文档） | 修正后（=实现行为） |
| ---- | ---- | ---- |
| §1 `duration_ms` | "running 时为当前已耗时" | **完成时写入最终耗时；running 时为 0** |
| §3（GET by task_id） | "含实时 `summary` 与 `duration_ms`" | `summary` **完成时按表分组落库、running 时为空对象**；`duration_ms` running 为 0；进度经轮询观察 `status` 翻转，完成后读 `summary` |
| §1 `error` | "仅 `failed` 时非空" | `failed` 时为可归因错误；**dry-run 成功任务固定为 `"dry_run"`**；其余为空 |

> 对齐来源：`ai-gateway-api/design-docs/modifications/2026-10-10-reencrypt-sweeps-list-endpoint/`（`api-changes.md` + `change-summary.md`）。

---

## 3. 原型变更（已完成，已 Review）

### 3.1 `prototype-design/pages/security.html`（重写）

| 区域 | 变更前（上一轮原型，285 行） | 变更后（本轮，451 行） |
| ---- | ---- | ---- |
| 数据来源 | **无列表接口**；历史表格仅本会话内触发过的任务 | `state.rows = MockData.reencryptSweeps.list`（**GET 列表数据，含运行中任务**） |
| 常量 | `SWEEP_TOTALS` | 新增 `COMPLETE_SUMMARY`（完成时落库统计）、`STATUS_TAG_TYPES`、`DEFAULT_SORT={key:'started_at',order:'desc'}` |
| 历史任务区 | 简单终态表格（任务ID / 状态 / 变换方向 / 开始时间 / 操作） | **筛选栏 + `IvuUI.pageTable` offset 分页 + 列头排序 + 9 列**（含 `created_by`、预演、耗时） |
| 筛选栏 | 无 | `renderFilterBar()`：任务状态 / 变换方向 / 扫描范围 / 预演模式 下拉 + 开始时间起止 `type="date"` + 查询 / 重置（对齐 Query 参数） |
| 分页 | 无（列表不分页） | `applyFilter()`（客户端对齐 Query 语义）+ `getPageData()`（offset 切片）+ `IvuUI.pageTable({pageSize,currentPage,total})` |
| 排序 | 无 | `Prototype.bindPageTableSort(table,state,paintList)`；可排序列 `sortable:true`，仅 `task_id` / `started_at`（对齐 `sort_by` 有效字段） |
| 运行中横幅 | 独立渲染（`runningTask()` 唯一） | 保持「唯一 running」语义；running 来自列表结果；`paintRunning()` 局部刷新 |
| 详情抽屉 | 任务ID / 状态 / 变换方向 / 预演模式 / 扫描范围 / 活跃密钥ID / 起止时间 / 耗时 / 两张统计 / 错误 | `detailBody()` **新增「触发者」行**；running 时耗时显示 `-`、统计块显示「任务运行中，统计将于完成后写入。」；**按 `scope` 只渲染对应统计块**；`errorBlock()` 对 `dry_run` 走蓝色 `.sec-note`，其余走红色 `.sec-error` |
| 触发 | `onTrigger()` 本地拦截 409 | 不变（`runningTask()` 存在时展示 409 文案 + toast）；触发后 `unshift` 新任务（running、`summary:{}`、`duration_ms:0`、`finished_at:''`、`created_by: MockData.user.name`）并 `startPolling` |
| 轮询 | 每 800ms 递增 scanned/rewritten | 保持 800ms；**running 期间 summary 保持空对象**（对齐"完成时才落库"）；5 tick 后 `finishTask()` 一次性落库 `summary`/`duration_ms=8200`/`finished_at`，`error = dry_run ? 'dry_run' : ''` |
| 局部刷新 | — | `renderPage()` 仅构建一次；轮询用 `paintRunning()`+`paintList()` 局部刷新，**避免清空筛选输入 / 关闭抽屉**；筛选栏不随 `paintList` 重绘以保留输入 |
| CSS | 触发区 / 统计块 / 错误 | 新增 `.sec-filter-bar` / `.sec-filter-item` / `.sec-note` / `.sec-summary-block` 等 |

### 3.2 `prototype-design/assets/js/mock-data.js`（新增数据集）

- 在 `batchTasks` 之后新增 `reencryptSweeps: { list: [...] }`，**8 条语义化记录**覆盖：
  - `status`：`running` / `succeeded` / `failed`；
  - `mode`：`reencrypt` / `decrypt`（`decrypt` 记录 `active_key_id:0`）；
  - `scope`：`all` / `providers` / `api_keys`（按 scope 只含对应统计表）；
  - `dry_run`：含 `error="dry_run"` 的 succeeded 记录；
  - `failed`：`error="executor lost"` / `error="db connection reset"`；
  - `created_by`：`admin` / `operator-chen` / `operator-li`。
- 随后 IIFE 追加 **16 条分页填充行**（`rsp-01J8H1001`~`1016`，base 2026-09-18 每 20h 递增，`i%4` 为 dry_run、`i%7` 为 failed）→ **共 24 条**，可演示 2 页（`page_size=20`）。

---

## 4. UI 实施（`src/`，待实施）

> 按 `design-docs/README.md` 顺序：api-define → 模块/组件 → 路由 → 状态 → i18n。本次无路由/菜单变更。

### 4.1 `src/modules/Security/index.vue`（修改）

| 区域 | 变更前 | 变更后 |
| ---- | ---- | ---- |
| 数据来源 | `data().tasks = []`（**无列表接口**：仅本页触发过的任务在会话内累积） | 新增 `fetchList()`：`GET security/reencrypt-sweeps`（`openapi:true`，params = 筛选 + 分页 + 排序），`mounted` 调用 |
| 列表数据 | `historyTasks = tasks.filter(非 running)` | **由接口 `Data.list` 驱动**（含 running 项）；`pagination` 驱动分页器 |
| 筛选 | 无 | 筛选栏：`status` / `mode` / `scope` / `dry_run`（Select）+ `start_time` / `end_time`（DatePicker）+ 查询 / 重置；变更即**重新 `fetchList`**（`page` 复位 1） |
| 分页 | 无 | **服务端 offset 分页**：`:page.sync` / `page_size`（默认 1/20），翻页 / 改页长 → `fetchList` |
| 排序 | 无 | 列头排序（`sortable:'custom'`）：仅 `started_at` / `task_id` 可排；`sort_by` / `sort_order` 变更 → `fetchList`；其他字段不提供排序（对齐"其他值回落默认"） |
| 运行中任务 | `runningTask = tasks.find(running)`（本地） | 由**列表结果**识别（`list.find(status==='running')`）或本地轮询对象；进度经 `pollTask`（`GET /{task_id}`）更新 |
| 历史表格列 | 5 列：任务ID / 状态 / 变换方向 / 开始时间 / 操作 | **9 列**：任务ID / 状态(tag) / 变换方向 / 扫描范围 / 预演 / **触发者(`created_by`)** / 开始时间 / 耗时(ms，running 显示 `-`) / 操作（详情） |
| 触发后 | `tasks.unshift(data)` | `POST` 成功后 `fetchList()`（新任务以 running 出现在列表）+ 对 `task_id` 轮询；完成后再次 `fetchList()` 落库统计 |
| 409 处理 | 本地 `runningTask` 拦截 + 响应解析 | 不变（本地先拦 + 409 响应提取持有者 `task_id`）；提示"不排队、直接轮询该任务" |

### 4.2 `src/modules/Security/components/SweepView.vue`（修改）

| 区域 | 变更前 | 变更后 |
| ---- | ---- | ---- |
| 触发者 | 无 | 新增 `created_by` 行（空串显示 `-`） |
| 耗时 | 恒显示 `durationMs(duration_ms||0)` | running 时显示 `-`；完成后显示 `{ms} ms` |
| 统计块 | 恒渲染 providers + api_keys 两张 | **按 `scope` 只渲染对应表**（`all` 两张 / `providers` 一张 / `api_keys` 一张）；`summary` 为空（running）时显示「任务运行中，统计将于完成后写入。」 |
| 错误提示 | `error` 非空即红色 `Alert` | `error==='dry_run'` → 蓝色语义提示（预演任务说明），**不红**；其余 `error`（含 `executor lost`）→ 红色 `Alert` |

### 4.3 i18n `src/i18n/zh.js` / `en.js`（修改）

新增文案（示例）：

| key | 中文 | 场景 |
| --- | ---- | ---- |
| `security.columnScope` | 扫描范围 | 列表列头 |
| `security.columnDryRun` | 预演 | 列表列头 |
| `security.columnCreatedBy` | 触发者 | 列表列头 |
| `security.columnDuration` | 耗时(ms) | 列表列头 |
| `security.filterStatus` / `filterMode` / `filterScope` / `filterDryRun` | 任务状态 / 变换方向 / 扫描范围 / 预演模式 | 筛选栏 |
| `security.filterStartTime` / `filterEndTime` | 开始时间起 / 止 | 筛选栏 |
| `security.search` / `reset` | 查询 / 重置 | 筛选栏按钮 |
| `security.createdBy` | 触发者 | 详情行 |
| `security.summaryRunning` | 任务运行中，统计将于完成后写入。 | running 统计占位 |
| `security.dryRunNote` | 预演任务（dry_run）：rewritten 为"将要重写"的行数，未落库。 | dry-run 语义提示（蓝） |
| `security.allOption` | 全部 | 筛选项空值 |
| `security.dryRunYes` / `dryRunNo` | 是 / 否 | 筛选 & 列表预演列 |
| `security.pageTotal` | 共 {total} 条 | 分页（若需要） |

> 既有 key（`conflictPrefix`/`triggerSuccess`/`taskNotFound`/`status*`/`mode*`/`scope*`/`summary*` 等）保留。

---

## 5. 验收清单

**列表接口消费（#1）**

- [ ] 进入页面即调用 `GET security/reencrypt-sweeps`（默认 `page=1`、`page_size=20`、`sort_by=started_at`、`sort_order=desc`）
- [ ] 筛选栏 6 项与 Query 一致：`status`(3 枚举) / `mode`(2 枚举) / `scope`(3 枚举) / `dry_run`(bool) / `start_time` / `end_time`(RFC3339)
- [ ] 变更筛选后 `page` 复位为 1 并重新请求；「重置」清空全部筛选并复位排序
- [ ] 分页为服务端 offset 分页（`page`/`page_size`），由响应 `pagination` 驱动；`page_size` 上限 100
- [ ] 列头仅 `started_at` / `task_id` 可排序；切换排序重新请求
- [ ] 表格 9 列与 §2.1 字段一致；状态以 tag 展示、颜色语义正确

**运行中 / 完成语义（#2）**

- [ ] **运行中任务出现在列表中**，其 `summary` 为空对象、`duration_ms=0`、`finished_at` 为空、`error` 为空串；页面不报错
- [ ] 运行中横幅唯一；进度经 `GET /{task_id}` 轮询 `status`，完成后（`succeeded`/`failed`）停止轮询并刷新列表
- [ ] 详情 running 时耗时显示 `-`、统计区显示「任务运行中，统计将于完成后写入。」
- [ ] 触发后新任务以 running 出现在列表；完成后 `summary` 落库、耗时显示最终值

**created_by（#3）**

- [ ] 列表新增「触发者」列，取 `created_by`；空串显示 `-`
- [ ] 详情新增「触发者」行；POST 触发响应不含 `created_by`（前端不依赖）

**dry-run（#4）**

- [ ] dry-run 成功任务 `error="dry_run"` 以**蓝色语义提示**展示，**不走红色失败告警**
- [ ] `failed` 任务的 `error`（如 `executor lost`）以红色告警展示

**scope 渲染（#5）**

- [ ] `scope=all` 渲染 providers + api_keys 两张统计块
- [ ] `scope=providers` 仅渲染 providers 统计块；`scope=api_keys` 仅渲染 api_keys 统计块

**触发 / 错误码（#6）**

- [ ] 运行中重复触发 → 409 提示携带持有者 `task_id`，明确"不排队、直接轮询该任务"
- [ ] 422（`end_time` 早于 `start_time` / 过滤值非法）给可读提示（后端字段级归因）
- [ ] `404`（按 task_id 轮询不存在）给可读提示

**通用**

- [ ] 原型 `security.html` 与 Vue 展示/交互一致
- [ ] `npm run lint` 通过
- [ ] 页面无控制台告警（无缺失 i18n key）

---

## 5.1 接口合法性校验 ↔ UI 校验实现 对照核查

| 模块 | 接口合法性条件 | UI 校验实现位置（计划） | 结论 |
| ---- | ------------- | ---------------- | ---- |
| 列表 · 过滤 | `status` 3 枚举 / `mode` 2 枚举 / `scope` 3 枚举 / `dry_run` bool | `Security/index.vue` 筛选栏 Select 固定枚举（`dry_run` 为「全部/是/否」→ 仅在选中时传布尔） | ⬜ 待实现 |
| 列表 · 时间 | `start_time`/`end_time` 合法 RFC3339；`end_time` 早于 `start_time` 时 422 | 前端 DatePicker → 提交前转 RFC3339；破坏性区间后端 422 时给可读提示 | ⬜ 待实现 |
| 列表 · 分页 | `page`/`page_size`（默认 1/20，上限 100） | 分页组件固定 `page_size` 选项（≤100） | ⬜ 待实现 |
| 列表 · 排序 | `sort_by` 仅 `started_at`/`task_id`；`sort_order` 仅 `asc`/`desc` | 仅对这两列开放 `sortable:'custom'` | ⬜ 待实现 |
| 触发 | `mode` 2 枚举 / `scope` 3 枚举 / `dry_run` bool；409 单例互斥 | 触发区 Select 固定枚举 + 触发前 `running` 检测 + 409 提示 | ⬜ 待实现 |

> 校验实现细节对齐原型文案（如「409 已有任务运行中，task_id: {id}，请等待完成；可直接轮询该任务，不排队。」），保证原型 → UI 文案一致。

---

## 6. 变更文件清单

### 原型（已完成）

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `prototype-design/pages/security.html` | 重写 | 消费 GET 列表：筛选栏 + offset 分页 + 列头排序 + 9 列（含 `created_by`）+ running/dry-run 语义 + 详情触发者行 |
| `prototype-design/assets/js/mock-data.js` | 已修改 | 新增 `reencryptSweeps.list`（8 语义 + 16 填充 = 24 条） |

### 接口文档（已同步，阶段 1）

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `api-define/OpenAPI接口定义/security.md` | 已更新 | 新增 §3 `GET /security/reencrypt-sweeps`（75 行 diff）；§1 新增 `created_by`；三处语义对齐 |

### UI 代码（待实施）

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `src/modules/Security/index.vue` | 修改 | 消费列表接口 + 筛选栏 + 服务端分页/排序 + `created_by` 列；触发后刷新列表 |
| `src/modules/Security/components/SweepView.vue` | 修改 | 触发者行 + running/dry-run 语义 + 按 scope 渲染统计块 |
| `src/i18n/zh.js` / `src/i18n/en.js` | 修改 | §4.3 文案 |

---

## 7. 注意事项

1. **列表接口取代「无列表接口」前提**：上一轮文档中「无列表接口」「进入页面不调用任何接口」「历史表格仅本会话累积」等表述**本次作废**，以本文件为准；原型/代码均改为消费 `GET /security/reencrypt-sweeps`。

2. **running 任务的字段语义**：列表中运行中任务的 `summary` 为空对象、`duration_ms=0`、`finished_at` 为空、`error` 为空串；**不得**在 UI 上把 `duration_ms=0` 误显示为「耗时 0 ms」（running 应显示 `-`），也不得把空 `summary` 误显示为「0/0/0 统计」（应显示"运行中，待完成后写入"）。

3. **dry-run 的 `error="dry_run"` 不是失败**：`status=succeeded` 且 `error="dry_run"` 的任务是**成功的预演**，UI 必须以蓝色语义提示展示，禁止走红色失败 `Alert`（否则语义误导）。

4. **分页为服务端 offset 分页**：使用全局 `page`/`page_size`（默认 1/20，上限 100），与 `00-common.md` 一致；**不是** `/batches` 的主键游标分页。`pagination.total` 为**过滤后**总记录数，分页器总数取该值。

5. **排序字段受限**：`sort_by` 有效字段**仅 `started_at`、`task_id`**，其他值后端忽略并回落 `started_at`；UI 仅对这两列开放排序，避免出现"点了排序但结果不变"的困惑。

6. **`created_by` 可能为空串**：未识别触发者时为空串；列表/详情显示 `-`。POST 触发响应**不含** `created_by`，前端不得依赖其存在。

7. **scope 决定统计表渲染范围**：`providers`/`api_keys` 单表 scope 的 `summary` 只含对应表键；详情应**按 scope 只渲染对应统计块**，不渲染空表。

8. **时间过滤语义**：`start_time`/`end_time` 按 `started_at` 过滤，均为**含**边界；`end_time` 早于 `start_time` 时后端 422，前端需给可读提示。

9. **无 DDL / 无迁移 / 无菜单变更**：本次为加法兼容（仅新增 GET 端点与响应字段），无数据库结构变更、无新菜单、无路由变更。

---

## 8. 关联文档

| 文档 | 说明 |
| ---- | ---- |
| `api-define/OpenAPI接口定义/security.md` | 密钥收敛任务接口（含新增 §3 列表端点） |
| `api-define/OpenAPI接口定义/00-common.md` | 全局分页 `page`/`page_size` / 排序 `sort_by`/`sort_order` 约定 |
| `prototype-design/pages/security.html` | 密钥收敛原型（本轮重写，已 Review） |
| `design-docs/modifications/2026-10-10-batch-tasks-and-key-reencrypt/ui-code-changes.md` | 上一轮（密钥收敛模块首次引入） |
| `ai-gateway-api/design-docs/modifications/2026-10-10-reencrypt-sweeps-list-endpoint/api-changes.md` | 后端侧 API 变更说明（本次列表端点） |
| `ai-gateway-api/design-docs/modifications/2026-10-10-reencrypt-sweeps-list-endpoint/change-summary.md` | 后端侧变更摘要与决策依据 |
| `design-docs/README.md` | 变更流程与代码实现顺序 |