# UI 代码变更：修复服务商「实例来源」切 K8s 池后提交无反应

> **日期**: 2026-10-26 ｜ **前置**: `775da80`（2026-10-03「扩展 Provider 实例来源」）｜ **上游依据**: `ai-gateway-web-test/docs/providers/02-功能测试用例/02-创建与编辑.md` PR-C-20~24
> **对照接口**: `design-docs/api-define/OpenAPI接口定义/providers.md` §1 数据模型 / §3 校验规则（`instance_source` 枚举、`k8s_pool_name` 必填、`k8s_instance_pool` 只读）
> **状态**: 原型 ✅（无需改动）· UI 代码 ✅ · 02 文档 ✅ · 测试 ✅（providers 68 条相关用例复跑全绿，新增 5 条）· 手册 ⬜ ｜ **菜单/路由变更**: 无

编辑既有服务商时把「实例来源」从 `人工维护实例池（instance_pool）` 切到 `K8s 实例池（k8s_pool）` 后点击提交，**界面无任何反应**：无提示、无网络请求、控制台无报错。根因是 `ProviderUpsert.vue` 引用了组件内从未定义的 `isK8sPool`；补定义后暴露出同文件的第二处缺陷——切走再切回会丢失已填的人工实例行（与 PR-C-22 预期冲突）。两处一并修复。

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 服务商 · 创建/编辑抽屉 | 补齐 `isK8sPool` 计算属性，k8s 模式提交不再静默 return（此前功能整体不可用） | ✅ UI |
| 服务商 · 创建/编辑抽屉 | 切到 k8s 池时存档人工实例行，切回时按存档重建（PR-C-22 原值保留） | ✅ UI |

## 2. 接口变更（diff）

无。`PATCH /providers/{name}` / `POST /providers` 的字段与语义均未变；修复后 k8s 模式提交体为 `{instance_source:'k8s_pool', k8s_pool_name, ...}`，不含 `instance_pool`、不含 `k8s_instance_pool`，与 `providers.md` §3 一致（后端对显式携带 `k8s_instance_pool` 仍返回 422）。

## 3. 原型变更（无）

原型只覆盖列表页，不含创建/编辑抽屉。验收依据取 02 文档 PR-C-20~24。

## 4. UI 代码变更

文件：`src/modules/Providers/components/ProviderUpsert.vue`

```diff
@@ computed @@
+        isK8sPool() {
+            return this.formData.instance_source === 'k8s_pool';
+        },
+        // 切到 K8s 池时 InstancePool 会被 v-else 卸载，切回时用切走前的快照重建人工实例行
+        manualPoolRestore() {
+            if (this.manualPoolDraft && this.formData.instance_source !== 'k8s_pool') {
+                return this.manualPoolDraft;
+            }
+            return this.instancePoolData;
+        },

@@ 模板 InstancePool @@
-          :instancePoolData="instancePoolData"
+          :instancePoolData="manualPoolRestore"

@@ data @@
+            manualPoolDraft: null,

@@ watch 'formData.instance_source' @@
+            if (val === 'k8s_pool') {
+                this.manualPoolDraft = cloneDeep(this.livePool || []);
+            }

@@ applyProvider @@
+            this.manualPoolDraft = null;
```

### 4.1 缺陷一：提交静默无反应（`isK8sPool` 未定义）

- **失效链路**：模板 `v-if="formData.instance_source === 'k8s_pool'"` 渲染池名输入框，`InstancePool` 走 `v-else` 被**卸载**；`handleSubmit` 里 `if (this.isK8sPool)` 恒 `false` → 走人工池分支 → `this.$refs.instancePool` 已不存在 → `if (!poolRef || typeof poolRef.validateAndExport !== 'function') return;` **静默返回**。表单校验是通过的（池名留空才会提示「请填写 K8s 池名称」），所以用户看到的是「点了没反应」。
- **连带影响**：`buildPayload` 同样判断该属性，即使进入提交也只会带 `instance_pool`、不带 `k8s_pool_name`，服务端将返回 422，即该模式下创建/编辑**整体不可用**。
- **引入**：commit `775da80` 同一次提交给 `ProviderView.vue`（详情页）加了同名计算属性，给 `ProviderUpsert.vue` 只加了使用、未加定义。同类前科：2026-10-15 修过的 `activePool` 未定义（「获取」按钮恒置灰）亦由该提交引入，当时只修那一处。

### 4.2 缺陷二：切来源丢失已填实例行（PR-C-22）

- `InstancePool` 仅在 `instance_pool` 模式挂载，内部 `formData.instances` 是行数据唯一来源；切到 k8s 后组件销毁，切回时按 `props.instancePoolData`（= 服务端回填值，创建态为空）重建 → 用户手填的行被清空。
- 修复采用「切走前存档、切回时消费」的一次性快照（`manualPoolDraft`），**不**把子组件 emit 的实时数据回灌 prop，避免 prop 抖动引发 `applyInstancePoolData` 反复重建（该组件 `instancePoolData` 为 deep watch + immediate，实时回灌会造成每次按键一轮 apply/emit 循环）。

## 5. 静态检查（新增门禁）

`vue/no-undef-properties`（eslint-plugin-vue 8.7.1 已内置）可报出根级未定义属性，但对 `formData.xxx` 这类嵌套属性全仓有 23 条误报，故新增只查**根级**属性的脚本：

- 文件：`scripts/check-undefined-props.js`，命令：`npm run check:undefined-props`
- 判定：`this.<name>`（非 `$`/`_` 前缀）必须在 options 的 data / computed / methods / props / watch / inject / provide / filters 中声明，或在本文件内被 `this.<name> = ...` 赋过值
- 反向验证：移除此处修复后脚本报 `ProviderUpsert.vue:954 / :982  this.isK8sPool 未在组件 options 中声明`；修复后 79 个 `.vue` 全量零告警

## 6. 测试变更（ai-gateway-web-test）

- `pages/providers/ProviderPage.js`：新增实例来源相关封装（`selectInstanceSource` / `expectInstanceSourceOptions` / `fillK8sPoolName` / `expectInstanceListHidden` / `getInstanceRowValue` 等）
- `tests/providers/test_02_provider_upsert.spec.js`：补实现 PR-C-20~24 共 5 条（此前仅文档定义，spec 从未引用任何 `k8s` 字样）
- `api/provider-api-utils.js`：新增 `createProviderRawViaApi`（PR-C-23 预期 3：显式携带 `k8s_instance_pool` → 422）
- `scripts/check-case-coverage.js` + `scripts/case-coverage-allowlist.json`：文档用例 ID 与 spec 引用的一致性门禁（`npm run check:case-coverage`），当前 86 条文档用例中 80 条已自动化、6 条登记为暂不自动化并写明原因
- 结果：`test_02` + `test_06` 合计 **57 通过 / 0 失败**；`test_03` + `test_07` 合计 **11 通过 / 0 失败**
- PR-C-21 为该缺陷的回归用例：移除修复后运行必失败（`submitEditAndWait` 等不到 PATCH，15s 超时）

## 7. 验收与偏差

- 修复前实测：编辑 `provider_mv86remt_12`（`instance_pool`）→ 切 k8s → 填池名 → 提交，抽屉不关、无 toast、无请求；浏览器控制台无异常。
- 修复后实测：同上操作 → 抽屉关闭、列表刷新，`GET /providers/{name}` 返回 `instance_source: k8s_pool`、`k8s_pool_name` 生效，休眠 `instance_pool` 原值保留。
- 已知偏差：`k8s_pool_name` 一旦写入无法通过接口清空（后端仅校验非空串格式），切回 `instance_pool` 后该字段以「休眠值」形式保留在记录上，不影响生效池；如需真正清空须后端支持 null。