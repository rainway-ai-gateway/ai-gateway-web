# UI 代码变更：修复服务商抽屉「获取」按钮永久置灰

> **日期**: 2026-10-15 ｜ **前置**: 无 ｜ **上游依据**: `ai-gateway-web-test/docs/providers/02-功能测试用例/02-创建与编辑.md` PR-C-09（「获取」置灰条件：未选协议或未填实例地址任一不满足时置灰，条件满足后可用）
> **对照接口**: `design-docs/api-define/OpenAPI接口定义/providers.md` §2.6 触发模型发现（`POST /providers/tools/discover-models`，Body 取实例池首个有效实例的 `addr`/`port`）｜ **对照原型**: `prototype-design/pages/providers.html`
> **状态**: 原型 ✅（无需改动）· UI 代码 ✅ · 02 文档 ⬜ · 测试 ✅（`tests/providers/` 91 条：90 通过 / 0 失败 / 1 跳过，2026-10-15）· 手册 ⬜ ｜ **菜单/路由变更**: 无

`ProviderUpsert.vue` 的 `canDiscoverModels` 计算属性取了一个**从未定义**的数据源 `this.activePool`（`activePool` 全仓仅此一处引用），求值结果为 `undefined`，`formatInstancePoolForApi(undefined, schema)` 恒返回空数组，因此「获取」按钮**永久置灰**，模型发现（discover-models）功能整体不可用——用户只能手工录模型。本次把该行改回与同文件 `endpointHostDisplay` / `buildDiscoverPayload` 一致的实例池取值。

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 服务商 · 创建/编辑抽屉 | 「获取」按钮按「已选模型协议 + 实例池至少一个有效 addr」正确计算可用态（此前恒置灰） | ✅ UI |

## 2. 接口变更（diff）

无。`POST /providers/tools/discover-models` 的端点、字段与执行逻辑（`providers.md` §2.6）均未变，本次只是让前端恢复调用它的能力。

## 3. 原型变更（无）

`prototype-design/pages/providers.html` 只覆盖列表页（列、搜索行、操作列按钮），**不含创建/编辑抽屉与「获取」按钮**，故无原型可改，本轮原型状态记为「无需改动」。按钮的启用条件以 02 文档 PR-C-09 为验收依据。

## 4. UI 代码变更

文件：`src/modules/Providers/components/ProviderUpsert.vue`

```diff
@@ canDiscoverModels() @@   // 约 548 行
-            const pool = this.activePool;
+            const pool = this.livePool.length ? this.livePool : this.instancePoolData;
```

- **根因**：`activePool` 在该组件中不存在（`data` 只有 `instancePoolData` / `livePool`，`livePool` 由 `onPoolChange` 与实例池回填维护），`formatInstancePoolForApi(undefined, schema)` 恒得空数组 → `instances.some(item => item.addr)` 恒 `false` → `canDiscoverModels()` 恒 `false` → 模板 `:disabled="!canDiscoverModels"` 恒为 `disabled`。
- **引入**：commit `775da80`（2026-10-03「扩展 Provider 实例来源」）在改写该计算属性时写入了未定义变量。
- **一致性核对（改动后）**：同文件三处实例池取值完全一致 —— `:538`（`endpointHostDisplay`）、`:548`（`canDiscoverModels`）、`:811`（`buildDiscoverPayload`）均为 `this.livePool.length ? this.livePool : this.instancePoolData`；全仓 `activePool` 引用已清零（`grep -rn "activePool" src/` 无输出）。
- **验收要点**：① 已选协议 + 实例池存在有效 addr → 「获取」可点；② 清空协议、或清空实例地址任一不满足 → 置灰（PR-C-09）；③ 可点后点击「获取」发出的 `discover-models` 请求体取该实例的 `addr`/`port`/`uri`，返回后回填模型 Tag（PR-C-08）。
- **默认行为无变化**：`livePool` 在实例池回填与编辑时会同步为实例池副本，取值与实例池表单一致；未选协议仍直接返回 `false`（该分支未改动）。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| PR-C-08（`tests/providers/test_02_provider_upsert.spec.js`） | 已通过（复跑） | 断言本就正确（点击「获取」→ 校验请求体 → 断言模型 Tag 回填）；此前因按钮恒置灰在点击处超时，修产品后转绿 |
| PR-C-09（同上） | 已通过（复跑） | 断言「置灰 / 可用」条件与 02 文档一致，此前 `expectDiscoverEnabled` 失败；修产品后转绿 |
| PR-C-10（同上） | 已通过（复跑） | 用例经「获取」验证回填路径（含点击「获取」），此前同样卡在点击超时；修产品后转绿 |
| PR-V-13（`tests/providers/test_06_provider_validation.spec.js`） | 已通过（复跑） | 「mock 回填含重复模型名 → 提交被拦截」经「获取」触发，此前点击超时；修产品后转绿 |
| PR-C-12（同上 spec，`test_02`） | 已通过（复跑） | 依赖「获取成功回填」前置；本轮同批修掉列表前端分页定位（A 类）后一并通过，无需改断言 |
| 其余 providers 用例（A 类 53 条） | 已通过（复跑） | 归因为用例 / 封装未适配「前端分页 20 条/页」，改用封装按名称筛选定位（`expectProviderRowVisibleByName` / 行操作自动定位），断言内容未改；详见 `ai-gateway-web-test/docs/providers/02-功能测试用例/00-索引与映射.md` |

## 6. 下游影响（阶段 3/4/5 输入）

- 02 文档：`docs/providers/02-功能测试用例/01-服务商列表.md` 已按产品实际校准「表格展示全部服务商记录」表述（首页 20 条 + 前端分页，PR-L-07）；PR-C-08/09/10/12、PR-V-13 的既有预期即本次修复后的行为，无需改文案。
- 测试：`tests/providers/` 全模块复跑已通过（90 通过 / 0 失败 / 1 跳过）；PR-C-08/09/10/12、PR-V-13 转绿。
- 用户手册：若手册含「获取」按钮置灰截图或说明，需按启用条件复核截图（本轮未改手册）。
- 部署：8180 为 `configs/dev-server.js` 开发服务（webpack-dev-middleware，随源码热编译），改 `src/` 后已即时生效，无需另行部署；如需发布到静态产物环境，需 `npm run build` 后部署新产物。

## 7. 验收与偏差

无偏差。修复后实测（8180 开发服务，页面为源码编译产物）：创建抽屉默认（已选 `openai`、实例地址为空）「获取」置灰；填入实例地址后可点；编辑抽屉（实例池已回填 `172.19.1.187:13801`）「获取」可点，点击后按 mock 返回回填模型 Tag；编辑抽屉 `provider_mv86remt_12`（实例池第 1 行 `127.0.0.1:80`）「获取」可点；清空模型协议后重新置灰。