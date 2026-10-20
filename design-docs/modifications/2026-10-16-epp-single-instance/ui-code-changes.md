# UI 代码变更：EPP 分配粒度收敛为实例组（每组恰好 1 个实例）

> **日期**: 2026-10-16 ｜ **前置**: 无 ｜ **上游依据**: api commit `7666426` / `65f1864`（PR #248）；api-define `epp-assignments.md`、`epp-pool.md` diff
> **对照接口**: design-docs/api-define/OpenAPI接口定义/epp-assignments.md、epp-pool.md ｜ **对照原型**: design-docs/prototype-design/pages/epp.html、assets/js/mock-data.js
> **状态**: 原型 ✅ · UI 代码 ✅ · 02 文档 ⬜ · 测试 ⬜ · 手册 ⬜ ｜ **菜单/路由变更**: 无

本次将 EPP 调度分配的粒度由「实例 / 主备对」收敛为「**实例组（group）**」，且每组**恰好 1 个实例**；分配视图与覆写接口不再下发/接收主实例，删除「主实例 / 备实例 / 状态（降级）」三列与覆写抽屉的主实例下拉。上一轮 `2026-09-08-epp-scheduling-integration` 的「`cluster → {group, primary}` + 读时展开 standby、可 degraded」前提作废。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| EPP 实例池 | 每组实例数由「1~2（主+备）」改为「恰好 1 个」；实例数列显示 `N / 1`，组内已有 1 个实例时「+添加实例」禁用并提示 | 已改 |
| EPP 调度分配 | 分配表只保留「集群名称 / 实例组 / 操作」，删除主/备/状态列 | 已改 |
| EPP 调度分配·覆写抽屉 | 删除「主实例 ID」下拉与 body 提示行，请求体只发 `{ group_name }` | 已改 |

## 2. 接口变更（diff）

**GET /epp-assignments**（分配全量视图）

- `Data.clusters[]` 元素：`{cluster, group, primary, standby, degraded}` → `{cluster, group}`
- `clusters`：由「全部 EPP cluster 展开视图（含未分配）」→「**有效分配**列表（未分配 cluster 不出现在此列表）」
- `clusters[].group`：由「未分配时为 `null`」→「恒为有效组名」
- `unassigned_clusters`：语义收敛为「EPP 模式但无有效分配」（含从未分配与分配悬空），不再区分 degraded
- `idle_groups`：语义不变（未承担任何 cluster 分配的组），说明去掉「备角色不计入占用」表述

**PUT /epp-assignments/{cluster}**（手工覆写）

- 请求体：`{ group_name, primary_instance_id }` → `{ group_name }`
- 合法性条件：`group_name` 须存在于 `/epp-pool` 且**非空**；删除 `primary_instance_id` 相关约束
- 返回 `Data`：`{cluster, group, primary, standby}` → `{cluster, group}`
- 副作用：由「bump server_data_conf」→「bump epp_data / server_data_conf」

**GET / PATCH /epp-pool**（实例池）

- 每组实例数：`1 个（仅主）或 2 个（主+备）` → **恰好 1 个**；拒绝空组与 ≥2 个实例的组
- `instances` 保留数组形态，为未来多实例扩容预留

## 3. 原型变更

`assets/js/mock-data.js`

- `eppPool.groups`：g1/g2/g3 由各 2 实例 → 各 1 实例（g1=`epp-a`、g2=`epp-c`、g3=`epp-e`）
- `eppAssignments.clusters`：`{cluster, group, primary, standby, degraded}` → `{cluster, group}`；`unassigned_clusters: []`、`idle_groups: ['g3']` 保留

`pages/epp.html`

- Tab1 实例数列：`(g.instances || []).length + ' / 2'` → `+ ' / 1'`
- Tab1「+添加实例」：上限判断 `instCount >= 2` → `>= 1`，提示「每组最多 2 个（主+备）」→「每组恰好 1 个实例」
- Tab1 保存校验：`insts.length > 2` → `> 1`，报错「每组仅主+备，最多 2 个」→「每组恰好 1 个实例」
- Tab2 表格列：删除「主实例」「备实例」「状态」三列，保留「集群名称 / 实例组 / 操作」
- Tab2 覆写抽屉：删除「主实例 ID」下拉及其联动，并删除 body 底部提示行（原「留空 = 自动分配 / 跟随组默认主实例」）
- Tab2 事件：删除组变更联动主实例的监听；确认回调只写 `cluster.group = groupName`

## 4. UI 代码变更

- [Assignments.vue](file:///Users/apple/Desktop/ai-gateway-workspaces/ai-gateway-web/src/modules/EppPool/components/Assignments.vue)
  - `columns` 删除 `primary` / `standby` / `status(degraded)` 三列 → 验收：分配表仅「集群名称 / 实例组 / 操作」
  - 删除 `primaryOptions` 计算属性、`overridePrimary` 数据项、`onGroupChange` 方法及抽屉「主实例 ID」Select 行 → 验收：抽屉只剩「实例组」下拉
  - `openOverride` 去掉 `overridePrimary` 赋值；`confirmOverride` 请求体 `{ group_name, primary_instance_id }` → `{ group_name }`
  - 删除抽屉 body 底部提示行（`eppAssignment.overrideHint` 移除）→ 验收：抽屉不再展示该提示文案
- [Pool.vue](file:///Users/apple/Desktop/ai-gateway-workspaces/ai-gateway-web/src/modules/EppPool/components/Pool.vue)
  - 实例数列 render：裸数字 → `${count} / 1` → 验收：实例数列显示 `N / 1`（与原型一致）
  - 展开区内「+添加实例」按钮：`insts.length >= 1` 时 `disabled` 并降级为 default 样式，右侧追加提示「每组恰好 1 个实例」 → 验收：组内已有 1 个实例时按钮禁用且展示该提示
  - `addInstance`：`if (insts.length >= 2)` → `>= 1` → 验收：组内已有 1 个实例时「+添加实例」禁用/提示
  - `validatePool`：在「非空组」校验基础上增加「每组恰好 1 个」校验 → 验收：组内实例数 ≠ 1 时保存被拦截并提示
- [zh.js](file:///Users/apple/Desktop/ai-gateway-workspaces/ai-gateway-web/src/i18n/zh.js) / [en.js](file:///Users/apple/Desktop/ai-gateway-workspaces/ai-gateway-web/src/i18n/en.js)
  - `eppPool.instanceCountMax`：「每组最多 2 个实例（主+备）」→「每组恰好 1 个实例」
  - `eppPool.groupInstanceExactlyOne`（新增）：保存校验「第 {index} 组须恰好 1 个实例」
  - `eppAssignment` 删除 `primary` / `standby` / `status` / `normal` / `degraded` / `noStandby` / `selectPrimary` / `overrideHint`（抽屉不再展示提示行）

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| EP-POOL-03 | 微调 | 断言由实例数列 `N / 2` → `N / 1`（[epp.html](file:///Users/apple/Desktop/ai-gateway-workspaces/ai-gateway-web/design-docs/prototype-design/pages/epp.html) Tab1 实例数列变更） |
| EP-POOL-05 | 微调 | 「组内已有 2 个实例时禁用」→「已有 1 个时禁用」；提示文案改「每组恰好 1 个实例」 |
| EP-ASGN-01 | 微调 | 列断言 `集群名称/实例组/主实例/备实例/状态/操作` → `集群名称/实例组/操作` |
| EP-ASGN-04 | 微调 | `idle_groups` 空/占用语义随「不再展开 standby」简化，前置数据由双实例改单实例 |
| EP-ASGN-05 | 微调 | 「降级」状态列已删除，原降级展示断言改为「未分配列表 `unassigned_clusters`」验证 |
| EP-ASGN-06 | 微调 | 覆写抽屉去掉「主实例下拉」，请求体 `{group_name, primary_instance_id}` → `{group_name}` |
| EP-RO-02 | 微调 | 只读视角列说明由「主实例/备实例/状态等列」→「集群名称/实例组列」 |
| 其余用例 | 无 | 本次变更未触及其余用例的断言前提 |

## 6. 下游影响（阶段 3/4/5 输入）

- 02 文档：修改 `02-功能测试用例/01-EPP实例池管理.md`（EP-POOL-03/05）、`02-EPP调度分配.md`（EP-ASGN-01/04/05/06）、`03-只读视角.md`（EP-RO-02）；同步 `01-测试场景概览.md` 的验收要点与前置数据（每组实例数）；`00-索引与映射.md` 生命周期回写
- 测试：`tests/epp-pool/test_01_epp_pool.spec.js`、`test_02_epp_assignments.spec.js`、`test_03_epp_pool_readonly.spec.js`
- 用户手册：`docs/zh-cn` EPP 章节（EPP 实例池「每组实例数」、EPP 调度分配字段/覆写说明）；未触及菜单名称/层级/顺序，无需章节重排与重编号
