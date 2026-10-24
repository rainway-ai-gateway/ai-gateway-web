# UI 代码变更：报表「目标模型」筛选口径修正 + 路由规则解除跨列表去重

> **日期**: 2026-10-23 ｜ **前置**: [2026-10-22 描述字节口径与缓存条件唯一](../2026-10-22-desc-bytes-and-cache-cond-unique/ui-code-changes.md) ｜ **上游依据**: issue [#129](https://github.com/rainway-ai-gateway/ai-gateway-web/issues/129)（报表「模型」筛选）、issue [#128](https://github.com/rainway-ai-gateway/ai-gateway-web/issues/128)（路由规则备用组合，clone 自 api issue #269，已 closed）
> **对照接口**: `report.md` §2.3（`dimension=model` → `ai_target_model`；`models` 参数过滤目标模型）、`00-common.md` RouteRule（仅约束「同一 `targets` 数组内」组合唯一） ｜ **对照原型**: `prototype-design/pages/report.html`
> **状态**: 原型 ✅ · UI 代码 ✅ · 02 文档 ✅ · 测试 ✅ · 手册 ✅ ｜ **菜单/路由变更**: 无

报表顶部过滤栏的「模型」多选实际过滤的是**目标模型**（`ai_target_model`），但选项取自日志排行，会把只作为请求别名出现的模型名一并列出；本次改为只列各集群实际支持的模型（`llm_config.models`），并把界面文案改为「目标模型」。路由规则侧解除「目标与备用跨列表同键拦截」，两者各自列表内去重即可。均无接口变更。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 数据报表 · 维度过滤 | 「模型」→「目标模型」，选项改为各集群 `llm_config.models` 并集（不再取日志排行） | ✅ |
| 数据报表 · 排行图维度下拉 | 维度文案「模型」→「目标模型」（`dimension=model` 即目标模型） | ✅ |
| 路由规则 · 目标/备用组合 | 取消 targets ↔ fallbacks 跨列表比较，同一组合允许同时出现在两侧 | ✅ |

## 3. 原型变更

- `prototype-design/pages/report.html`（维度筛选区，:474）：`<label>路由模型</label>` → `<label>目标模型</label>`。
- `prototype-design/pages/report.html`（排行维度下拉，:655）：`['模型','model']` → `['目标模型','model']`。
- 路由规则原型未实现跨列表校验，无需改动。

## 4. UI 代码变更

- `src/modules/Report/index.vue`
  - 新增 `loadTargetModelOptions()`：`GET /clusters` → 汇总各集群 `llm_config.models` → 去空、去重、排序后填充「目标模型」多选；`loadFilterOptions()` 不再请求 `dimension=model` 排行（保留 apikey / provider / host）。
  - 验收：下拉仅出现集群配置的模型；仅作请求别名的模型名不出现；选值后 `models` 参数仍按 `ai_target_model` 过滤。
- `src/modules/RouteTable/components/RuleForm.vue`
  - `validateTargetModelUnique` / `validateFallbackModelUnique` 删除与另一列表的比较块；`getDuplicateErrorMessage` 去掉跨类型分支，仅保留 `route.targetDuplicate` / `route.fallbackDuplicate`。
  - 验收：目标与备用填同一 `(cluster_name, model)` 可本地保存成功；同一列表内重复仍被拦截。
- `src/i18n/zh.js` / `src/i18n/en.js`：`report.models` = 目标模型 / Target model、`report.modelsPlaceholder` = 选择目标模型 / Select target model；删除随跨列表校验下线的 `route.clusterModelUsedInTarget` / `route.clusterModelUsedInFallback`。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| `RP-R-08`（`test_06`） | 已微调 | 过滤栏选项请求由 4 个 dimension 改为 3 个（`FILTER_OPTION_DIMENSIONS = ['apikey','provider','host']`），断言数量与集合同步；等待条件不再等第 4 个 rankings 请求 |
| `RP-R-11`（`test_06`） | 已微调 | 同上：3 个 dimension 请求均 200、均携带 `limit=50`，集合比对同步 |
| `RP-R-12`（`test_06`） | 无断言改动（已通过） | 用例以 API 直接验证 `rankings?dimension=model`，接口未变；首轮超时源自同批次过滤栏选项断言的等待条件，复跑 26/26 通过 |
| `RP-F-09`（`test_04`）、`RP-T-0x`（`test_05`） | 已微调 | 过滤栏标签序列由硬编码 `'模型'` 改为 `rp.DOC.filterLabels.model`；`ReportPage.js` 的 `filterLabels.model` 与 `RANKING_DIM_OPTIONS` / `PIE_UNSUPPORTED_DIMS` 文案同步为「目标模型」 |
| `RP-R-13`（`test_06`） | 已微调 | 排行维度下拉默认选中项由 `'模型'` 改为 `rp.DOC.filterLabels.model`（目标模型） |
| `RT-V-12-1 A`（`test_07_route_target_model_dedup.spec.js`） | 已微调 | 由「跨列表同键拦截」改为「允许保存」：本地保存成功、抽屉关闭、规则行出现，随后清理 |

## 6. 下游影响（阶段 3/4/5 输入）

- 02 文档：`docs/report/01-测试场景概览.md`（过滤项与前置数据文案）、`02-功能测试用例/06-过滤栏与页签.md`（步骤/预期/选项来源）、`03-排行与分布新维度.md`（维度文案与默认选中）、`00-索引与映射.md`（RP-R-13~17 描述）；`docs/route-management/01-测试场景概览.md`（测试目标）、`02-功能测试用例/03-字段校验矩阵.md`（§3.0 总则、矩阵两行、RT-V-12-1 去重范围/场景 A/预期/覆盖表 + 新增 2026-10-23 修订说明）。
- 测试：`tests/report/test_04/05/06`、`tests/route/test_07`（见 §5）；`pages/report/ReportPage.js` 的标签与维度常量同步。
- 用户手册：`17-report.md`（过滤栏 `models` 行、排行维度表、饼图不含项、默认态、明细 `requested_models` 对照说明）、`07-route.md`（备用集群组合规则、校验规则清单）、`20-appendix.md`（两类「组合不能重复」错误提示的行）。`docs/zh-cn/site/` 已重建，`build-manual-site.js` / `verify-manual-site.js` 均 **0 问题**。

## 7. 验收结果（2026-10-23）

- 控制台：dev server（8180）已热编译本次改动，产物中可检索到「目标模型」「选择目标模型」，旧跨列表文案已消失。
- 首轮：report `test_04/05/06` + route `test_07` 共 **51 例：48 通过 / 3 失败**；3 例失败均为过滤栏选项请求数仍按旧口径（4 个 dimension）等待，属用例滞后。
- 修正后复跑：`test_04` + `test_06` **26/26 通过**；`test_05` 首轮已通过；route `test_07` 首轮 **11/11 通过**（含 RT-V-12-1 A 改为允许保存）。
- 手册：`build-manual-site.js` 与 `verify-manual-site.js` 均 0 问题（757 内部链接、94 图片）。