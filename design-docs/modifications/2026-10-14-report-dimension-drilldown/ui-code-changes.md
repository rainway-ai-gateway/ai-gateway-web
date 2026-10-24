# UI 代码变更：数据报表图表维度下钻与过滤栏清理

> **日期**: 2026-10-14 ｜ **前置**: [2026-10-12 EPP 运行时参数](../2026-10-12-epp-runtime-params/ui-code-changes.md) ｜ **上游依据**: api-define（`report.md` §2.2/2.3/2.4 的 `dimension` 参数）+ 2026-09-27 报表字段变更（api 仓 `modifications/2026-09-27-report-cache-mirror-intent-fields`）
> **对照接口**: `report.md`（`GET /report/timeseries` / `rankings` / `distribution` 的 `dimension` 参数）｜ **对照原型**: `prototype-design/pages/report.html`
> **状态**: 原型 ✅ · UI 代码 ✅ · 02 文档 ✅ · 测试 ✅ · 手册 ✅ ｜ **菜单/路由变更**: 无

2026-09-27 的报表字段变更在后端已完整落地（明细 +10 列、聚合 +3 维度、logs +5 过滤、总览 +3 组指标，四后端均可用），但**前端界面只落了一半**：总览图表无维度下钻入口（维度全部写死），且总览过滤栏误加了 3 个从未接线的选择器（「缓存状态 / 镜像命中 / 意图答案」——按接口设计它们不是通用过滤参数，明细工具栏已有生效的同名过滤）。本次原型已按变更完整意图补齐（维度下钻 + 移除死控件），UI 代码待按原型实施。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 数据报表 · 总览过滤栏 | 移除「缓存状态 / 镜像命中 / 意图答案」3 个未接线的选择器（对齐接口设计：通用过滤仅 start/end/models/apikey_ids/providers/hosts/stream/status_codes） | ✅ 原型 · ⬜ UI |
| 数据报表 · 排行图 | 标题改「排行」，旁加维度下拉（10 项：模型/提供商/API Key/主机/状态码/协议/模式/缓存状态/镜像命中/意图答案）；修正取数 | ✅ 原型 · ⬜ UI |
| 数据报表 · 占比/分布饼图 | 两个饼图各加维度下拉（7 项可选）；标题改「占比 / 分布」（维度可变后原标题会误导）；修正提供商饼图原错读 `protocol` 维度数据的问题 | ✅ 原型 · ⬜ UI |
| 数据报表 · 时序图 | 图区上方新增「拆分维度」下拉（不分维度 / 缓存状态 / 镜像命中 / 意图答案），选中后 QPS / Token / 延迟三图按维度桶拆多序列；缓存 Token 图保持 kind 拆分不参与 | ✅ 原型 · ⬜ UI |
| 数据报表 · 明细页签 | 不变（过滤与列已完整生效，是本轮设计的参照基准） | — |

## 2. 接口变更（diff）

本轮**无新增端点 / 字段 / 参数**。`dimension` 参数新增取值 `ai_cache_status` / `mirror_hit` / `ai_intent_answer` 于 2026-09-27 已在 `timeseries` / `rankings` / `distribution` 三个端点落地（2026-10-01 对齐 Doris、2026-10-02 新增 ClickHouse / StarRocks 后端后四后端均可用）；`cache_status` / `mirror_hit` / `intent_question` / `intent_answer` / `intent_source` 五个过滤参数已在 `logs` 端点落地。**本轮仅做前端暴露**，接口契约零变化。

## 3. 原型变更（已完成，已 Review）

### 3.1 `prototype-design/pages/report.html`

| 区域 | 变更点 |
| ---- | ---- |
| `state.filters` 初始化 / `buildFilterBar()` / `readFilters()` / `resetFilters()` / `populateSelectOptions()` | 五处联动移除「缓存状态 / 镜像命中 / 意图答案」死选择器及其状态读写 |
| `state` | 新增 `chartDims: { ranking: 'model', pieProvider: 'provider', pieStatus: 'status', tsSplit: '' }` |
| 排行图卡片 | 标题改「排行」+ 维度下拉 `dim-ranking`（10 项），切换后按 `reportRankings[dim]` 前 10 重渲染 |
| 两个饼图卡片 | 各加维度下拉（`dim-pie-provider` / `dim-pie-status`，7 项），数据经 `dimItems(dim)`（distData → reportDistribution → reportRankings 回退）取数；提供商饼图修正原错读 `distData.protocol` |
| 时序图区 | 「拆分维度」控件位于**总览过滤栏行尾**（状态码之后、查询按钮之前，后按用户决策从时序图区独占行移入，见 §7-4）；选中后 QPS / Token / 延迟经 `splitSeriesByDim` 按维度桶拆多序列（QPS 拆 value、Token 拆 input/output/total、延迟拆 avg/max；图例「桶名」或「桶名 字段名」）；缓存 Token 图不参与 |
| CSS | `.chart-card h4 select.chart-dim`（标题旁下拉）+ `.ts-split-bar`（拆分维度工具行） |

**原型已实机验证**（echarts 实际渲染）：过滤栏只剩 6 个通用过滤项；维度下拉切换后图表按 mock 数据重渲染（排行切镜像命中 → '1'/'0' 两条柱；拆分维度切缓存状态 → QPS 拆 3 条序列且数值与演示比例 0.72/0.20/0.08 吻合）；明细页签过滤与列不受影响；无 JS 报错。

## 4. UI 代码变更（`src/`，待实施）

| 文件 | 变更点 | 验收要点 |
| ---- | ---- | ---- |
| `src/modules/Report/index.vue` | 移除总览过滤栏「缓存状态 / 镜像命中 / 意图答案」3 个选择器；`filters` 状态、`buildFilterParams` 注释、`resetFilters`、`loadFilterOptions` 中对应项一并清理；**过滤栏行尾新增「拆分维度」选择器**（`tsSplit` 状态，切换即调 `overview.setTsSplit`，不触发整页查询；重置时同步清空） | 过滤栏 = 6 个通用过滤项 + 拆分维度；明细工具栏过滤不受影响 |
| `src/modules/Report/components/Overview.vue` | 排行图加维度下拉（10 项，默认 model）；两个饼图各加维度下拉（默认 protocol / status，数据按维度从 distribution 接口取）；**拆分维度逻辑改为 `setTsSplit(value)` 公共方法**（原时序图区工具条已移除，由父组件过滤栏联动 QPS/Token/延迟三张时序图）；`loadCharts` 传 dimension | 切换维度后对应图表数据变化；默认态与现状一致 |
| `src/i18n/zh.js` / `en.js` | `report.*` 新增：维度下拉标签与选项文案（缓存状态/镜像命中/意图答案/拆分维度/不分维度/排行/占比/分布等） | 无缺失 key |
| `docs/zh-cn/12-report.md` 与截图（阶段 5 处理） | 12.2 全局过滤栏（6 项）、12.4 图表（维度下拉、拆分维度）、重截 `14-report-filter-bar.png` 等 | 手册与实现一致 |

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| `RP-R-08` / `RP-R-09` / `RP-R-11` / `RP-R-12` | 微调 | 断言前提被本变更推翻（总览过滤栏移除「缓存状态 / 镜像命中 / 意图答案」死控件、排行与饼图改为维度下钻取数）；已按新设计改写步骤/预期/断言，编号与优先级不变（RP-R-08 / RP-R-11 更名），2026-10-14 阶段 4 完成——`tests/report/test_06_report_rankings_distribution.spec.js` 相关 spec 40 条全绿，明细见 [report 00-索引](../../../../ai-gateway-web-test/docs/report/02-功能测试用例/00-索引与映射.md) |
| `RP-F-06` | 微调 | 「重置」不再复位时间范围（重置只清空 6 项通用过滤 + 行尾「拆分维度」并自动重查）；已按新行为修正断言（`tests/report/test_04_report_filters.spec.js`），编号与优先级不变 |
| `RP-L-04 ~ RP-L-08` | 无处置 | 全量回归中失败的原因为**环境数据窗口**（报表库演示数据因时区偏移落在默认查询窗口外 → `count = 0`），非用例前提失效；演示数据移入有效窗口后 21/21 全绿，用例本身不改（2026-10-15 收尾复跑再次复现同因，已在 report 00-索引把 `test_02` 登记为「环境数据依赖」） |
| `RP-O-12` | 微调 | **本变更引入的用例滞后（2026-10-15 全量回归归因，此前误判为「与本次变更无关的历史问题」，已更正）**：`Overview.load()` 由「8 请求同一 `Promise.all`、任一失败即全局 `$Message('加载失败')`」改为「核心请求 + 图表请求分离、图表请求各自 `.catch(() => {})` 隔离」——单图表失败不再触发全局提示，而用例仍等待全局提示。已按新契约改写场景二断言（图表空态 + 指标卡正常 + **全局提示与 `console.error` 均不出现**），场景一（核心请求失败仍弹全局提示）保留；02 用例拆为两个场景，`tests/report/test_01_report_overview.spec.js` 19/19 通过 |

> 说明：本表为 2026-10-14 阶段 4 收尾与 2026-10-15 全量回归的实际处置结论回填（原件此前只写「既有 logs 维度过滤用例不变」，未逐条列明受影响用例与处置）。

## 6. 下游影响（阶段 3/4/5 输入）

- **02 文档**：`ai-gateway-web-test/docs/report/` 需补——图表维度下钻（rankings/distribution/timeseries 的 dimension 切换交互）、拆分维度多序列展示、过滤栏 6 项变更；既有 logs 维度过滤用例不变。
- **测试**：Playwright 用例——切换排行维度至 `ai_cache_status`/`mirror_hit`/`ai_intent_answer` 断言请求参数与图表更新；拆分维度断言 timeseries 请求携带 dimension 且多序列渲染；过滤栏无死控件。
- **用户手册**：`12-report.md` 12.2 过滤栏（去 3 项）、12.4 图表小节（维度切换、拆分维度）、12.9 权限与错误（dimension 不支持时报错？）、截图更新。
- **部署前置**：无（接口零变化，前后端可独立发布；前端早于后端发布仅表现为维度切换报错，可接受）。

## 7. 验收与偏差（暂定）

1. **饼图标题改「占比 / 分布」**：维度可变后原标题「提供商占比 / 状态码分布」会误导，与排行图「排行」同理简化。
2. **拆分维度仅作用于 QPS / Token / 延迟三张图**：缓存 Token 图已按 `cache_read`/`cache_write` 两条 kind 序列展示，叠加维度拆分易读性差，不参与。
3. **时序拆分语义**：真实接口按 `dimension` 参数返回多条（按维度桶）序列，与原型 mock 的「单序列按比例拆」演示效果一致；前端实现以接口实际返回为准。
4. **「拆分维度」控件位置与生效时机（2026-10-14 用户决策）**：从时序图区独占行移至**总览过滤栏行尾**（状态码之后、查询按钮之前），UI 与原型同步修改；**与过滤栏其他控件保持一致——选中后需点击「查询」才生效**（`applyFilters` / `onTabChange` 时经 `overview.load(params, tsSplit)` 传入并联动 QPS/Token/延迟三张时序图），「重置」同步清空并重新查询。原 `.ts-split-bar` 样式与即时联动逻辑在两端均已移除。
