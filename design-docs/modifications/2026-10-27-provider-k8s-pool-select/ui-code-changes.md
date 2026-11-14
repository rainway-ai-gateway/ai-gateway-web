# UI 代码变更：服务商实例来源选 K8s 时改为下拉选择 K8s 实例池

> **日期**: 2026-10-27（10-28 按上游 `6a4af3a` 校准） ｜ **前置**: [2026-10-26-provider-instance-source-submit-fix](../2026-10-26-provider-instance-source-submit-fix/ui-code-changes.md) ｜ **上游依据**: ai-gateway-api `v0.1.0-dev` @ `6a4af3a`（#290 新增 `k8s-pools.md` + #289 完整方案：**`k8s_instance_pool` 镜像字段彻底删除**，`k8s_pool_name` 上限 64 → 128）
> **对照接口**: [k8s-pools.md](../../api-define/OpenAPI接口定义/k8s-pools.md)、[providers.md](../../api-define/OpenAPI接口定义/providers.md) ｜ **对照原型**: `prototype-design/pages/providers.html` + `assets/js/provider-upsert.js`
> **状态**: 原型 ✅ · UI 代码 ✅（2026-10-28 实现，lint 通过） · 02 文档 ✅（5 份，PR-C-25/PR-D-05 新增） · 测试 ✅（2026-10-28 实跑：providers 三文件 70 条 → 68 通过 / 2 跳过 / 0 失败） · 手册 ⬜ ｜ **菜单/路由变更**: 无

服务商「实例池」卡片中，实例来源选 `k8s_pool` 时，原来的「K8s 池名称」**自由文本输入**改为**下拉选择**，选项来自新增只读接口 `GET /open-api/v1/k8s_pools`；详情页实例列表改为调用 `GET /open-api/v1/k8s_pools/{name}` 取池内实时实例。上一轮「可手填任意合法池名」的交互前提作废，PR-C-24（填不存在的池名不拦截）不再适用。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 模型服务商 › 添加/编辑 | `k8s_pool` 分支的池名输入框改为下拉，选项来自 `/k8s_pools` | 原型 ✅ / 代码 ✅ |
| 模型服务商 › 详情 | K8s 分支的实例列表改为调用 `GET /k8s_pools/{name}` 取池内实时实例 | 原型 ✅ / 代码 ✅ |

## 2. 接口变更（diff，仅 UI 相关）

- 新增 `GET /open-api/v1/k8s_pools` → 返回 `Data.list[]`（`name` / `instance_count` / `last_sync_time`），不分页、空列表返回 `[]`；鉴权 `FeatureK8sPool + ActionRead`。→ **表单下拉选项来源**。
- 新增 `GET /open-api/v1/k8s_pools/{name}` → 返回池内 `instances[]`（`addr` / `port` / `weight` / 只读 `disable`）；池不存在 404、空池 200 + `instances: []`。→ **详情页实例来源**。
- `providers.md` · `k8s_pool_name` 合法性条件：长度 1-**64** → 1-**128** 字符（其余字符规则不变）。→ **前端校验同步放宽**。
- `providers.md` · **`k8s_instance_pool` 字段已彻底删除**：响应中不再返回，请求体携带按未知字段静默忽略。→ **UI 代码中所有该字段的读写引用必须移除**（原「携带返回 422」校验不复存在）。

## 3. 原型变更

| 文件 | 变更点 | 变更前 → 变更后 |
| ---- | ------ | --------------- |
| `assets/js/mock-data.js` | 池数据源 | `k8sPoolNames: string[]` → `k8sPools: [{name, instance_count, last_sync_time}]`（对齐 `GET /k8s_pools` 的 `Data.list`）+ `k8sPoolInstances: {<池名>: Instance[]}`（对齐 `GET /k8s_pools/{name}` 的 `Data.instances`，含只读 `disable`）；mock provider 数据同步**删除 `k8s_instance_pool` 字段**（对齐上游字段删除） |
| `assets/js/provider-upsert.js` · `renderK8sPoolBody` | 池名控件 | `<input list="proto-k8s-pool-names">` + `<datalist>` → `<select class="proto-k8s-pool-name">`，首项「请选择 K8s 实例池」 |
| 同上 | 空池列表 | 无 → 选项文案「暂无可用的 K8s 实例池」且 `select` 置灰 |
| 同上 | 已保存但池已删除 | 无 → 追加一项 `<池名>（池不存在）` 并保持选中，避免打开表单即丢配置 |
| `assets/js/provider-upsert.js` · `validate` | 校验文案与长度 | 「K8s 池名称必填」/ 1–64 → 「请选择 K8s 实例池」/ 1–128 |
| `assets/js/provider-upsert.js` · `K8S_POOL_NAME_TIP` | 帮助说明 | 手填名称规则 → 说明「从 `GET /k8s_pools` 下拉选择，控制台只读」+ 128 字符规则 |
| `assets/js/provider-upsert.js` · `fetchK8sPoolDetail` | 新增数据函数 | 无 → 按池名返回池详情（`instances` / `instance_count` / `last_sync_time`），池不存在返回 `null`（对应 404） |
| `assets/js/provider-upsert.js` · `effectivePool` | 有效池数据源 | k8s 模式读 provider 的 `k8s_instance_pool` 镜像 → 实时读 `GET /k8s_pools/{name}`（影响「模型列表 · 获取」按钮置灰判断：k8s 模式下按池内实例地址判断） |
| `assets/js/provider-upsert.js` · `renderDetail` | 详情实例列表数据源 | provider 的 `k8s_instance_pool` 镜像 → `GET /k8s_pools/{name}` 实时实例（表头「IP地址」→「实例地址」）；空池提示「当前池暂无实例（空池为合法状态）」，池不存在提示「K8s 池不存在（≡ 零实例）」 |

自测（`python3 -m http.server` + 浏览器）：
- 表单：添加服务商 → 实例来源切 `k8s_pool` → 渲染下拉 3 个池（`llm-inference-pool` / `deepseek-prod-pool` / `openai-shared-pool`），**下拉下方不展示实例数/同步时间等辅助小字** → 切回 `instance_pool` 恢复「实例形态 + 实例 IP 列表」。
- 详情：`anthropic`（`instance_source=k8s_pool`、`k8s_pool_name=llm-inference-pool`）→ 实例池 Card 展示 `10.0.0.11 / 10.0.0.12 / 10.0.0.13`（端口 8000、权重 100），与池接口返回一致。

## 4. UI 代码变更（2026-10-28 已按本清单实现，`npm run lint` 通过）

> 实现时补充一处清单外改动：`provider.k8sPoolNameRule` 文案中长度上限同步 64 → 128（zh/en）。

### 4.1 `src/modules/Providers/components/ProviderUpsert.vue`

| 位置 | 改动 |
| ---- | ---- |
| 模板 k8s 分支（约 45–53 行） | `Input`（`placeholder=provider.k8sPoolNamePlaceholder`）→ `Select`（`v-model="formData.k8s_pool_name"`，建议加 `filterable` 支持搜索）；选项来自新 data `k8sPoolOptions` |
| 数据加载（methods 新增） | 打开抽屉及 `instance_source` 切到 `k8s_pool` 时，调 `GET /open-api/v1/k8s_pools` 拉取选项；**`applyProvider` 中对已是 `k8s_pool` 的编辑对象显式调用**（值无变化时 watcher 不触发，否则下拉为空、提交不拦截）；请求失败按现有 `$Message.error` toast 处理，保留旧选项不清空 |
| 空池 / 池已删除降级 | 返回空列表 → 渲染禁用项「暂无可用的 K8s 实例池」；当前 `k8s_pool_name` 不在返回列表中 → 追加选中项「`<名>`（池不存在）」（与原型一致） |
| `validateK8sPoolName`（约 484–494 行） | 留空提示 `provider.k8sPoolNameRequired` 改为「请选择 K8s 实例池」；`K8sPoolNameRegCheck` 格式校验保留（兜底历史脏数据）；规则补充 `required: true`（标签显示红色 `*`）且触发时机由 `blur` 改为 `change`（下拉选择即时校验） |
| data / 回填 | 删除 `k8sInstancePool`（约 507 行）与 `applyProvider` 中 `cloneDeep(data.k8s_instance_pool)`（约 651 行）——字段已删除 |
| `buildPayload` k8s 分支（约 957–960 行） | 提交逻辑不变（仅 `k8s_pool_name`）；注释更新：镜像字段已删除，不再是「请求体禁止携带」 |
| `canDiscoverModels` / `endpointHostDisplay`（约 550–563 行） | k8s 模式下有效池改为按 `formData.k8s_pool_name` 调 `GET /k8s_pools/{name}` 取实例判断（替换现有人工池回退逻辑在 k8s 分支的行为） |

### 4.2 `src/modules/Providers/components/ProviderView.vue`

| 位置 | 改动 |
| ---- | ---- |
| k8s 分支实例表（约 42–63、213–214 行） | 数据源 `currentData.k8s_instance_pool` → 打开详情时调 `GET /open-api/v1/k8s_pools/{k8s_pool_name}`；404 → 「K8s 池不存在（≡ 零实例）」；200 空数组 → 空池文案「当前池暂无实例（空池为合法状态）」；表头「IP地址」→「实例地址」 |
| 404 状态判定（`currentData` watcher，2026-10-28 缺陷修复） | `src/utils/request.js` 响应拦截器对 HTTP 错误 **resolve** `error.response` 而非 reject，原 `.catch` 分支为死代码（404 时 `k8sPoolState` 恒空、误显示空池文案）→ 改为在 `.then` 中判断 `res.status === 404` 置 `notfound`，并加 `unneedTips` 抑制 404 全局错误弹窗；已由 `PR-D-05` 场景③ 自动化实测通过 |
| 标签 i18n（约 44 行） | `provider.k8sPoolName` 文案「K8s 池名称」→「K8s 实例池」 |

### 4.3 `src/utils/const.js`

| 位置 | 改动 |
| ---- | ---- |
| `K8sPoolNameRegCheck`（约 60–72 行） | 长度上限 64 → 128（`value.length > 64` → `> 128`；正则 `{0,62}` → `{0,126}`），注释同步 |

### 4.4 `src/i18n/zh.js` / `src/i18n/en.js`（`provider.*`）

| 类型 | key | 中文值 |
| ---- | --- | ------ |
| 修改 | `k8sPoolName` | K8s 实例池 |
| 修改 | `k8sPoolNameRequired` | 请选择 K8s 实例池 |
| 修改 | `k8sPoolEmpty` | 当前池暂无实例（空池为合法状态） |
| 新增 | `k8sPoolSelectPlaceholder` | 请选择 K8s 实例池 |
| 新增 | `k8sPoolNoOptions` | 暂无可用的 K8s 实例池 |
| 新增 | `k8sPoolNotFound` | K8s 池不存在（≡ 零实例） |
| 删除 | `k8sPoolNamePlaceholder` | —（下拉无 placeholder，首项占位） |

### 4.5 验收

- `npm run lint` 通过；
- 按 §3「自测」两场景走查真实环境（runtime 已部署 `6a4af3a`）：表单下拉选项、空池降级、详情页实例列表。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| PR-C-20（实例来源单选 + k8s 分支渲染池名输入框） | 微调 | 「K8s 池名称**输入框**」→「K8s 实例池**下拉**」，新增断言：选项来自 `GET /k8s_pools` |
| PR-C-21（K8s 模式不展示镜像实例列表） | 微调 | 「填写池名称」步骤改为「下拉选择池」；「不展示镜像表 / 提交体仅含 `k8s_pool_name`」断言不变 |
| PR-C-22（切换实例来源联动） | 微调 | 切 k8s 后断言控件由输入框改为下拉 |
| PR-C-24（池名引用无需预先存在） | 跳过 | UI 已无手填入口，下拉只能选既有池；后端「池不存在 ≡ 零实例」契约未变，该场景改由接口层用例覆盖（恢复条件：重新开放手填） |
| PR-V-19（`k8s_pool_name` 校验） | 微调 | 留空提示「请填写 K8s 池名称」→「请选择 K8s 实例池」；长度上限 64 → 128；字符格式用例改为「下拉不存在非法值，格式校验仅对历史脏数据生效」 |
| PR-V-20（`k8s_instance_pool` 只读） | 跳过 | 字段已彻底删除（上游 `6a4af3a`），「请求体携带返回 422」与「详情页读镜像」断言前提均不复存在；实时实例展示由新增详情页用例（读 `/k8s_pools/{name}`）覆盖 |
| PR-V-21（k8s 模式 `instance_pool` 休眠保留） | 微调 | 步骤中「填写池名」改为「下拉选择池」，断言不变 |
| PR-D-04（详情页 K8s 分支） | 微调 | 只读字段标签「K8s 池名称」→「K8s 实例池」；实例列表数据源由 provider 的 `k8s_instance_pool` 镜像改为 `GET /k8s_pools/{name}` 实时实例，用例前置数据需先在 `k8s_pools` 造池（或断言空池/池不存在两种降级文案） |
| `tests/providers/test_02_provider_upsert.spec.js:1290`（实例来源切换用例） | 微调 | `expectK8sPoolNameVisible/Placeholder` 改为下拉可见 + 选项断言 |
| `tests/providers/test_03_provider_detail.spec.js:143`（详情页实例池断言） | 微调 | K8s 分支不再断言 `k8s_instance_pool` 镜像行，改为断言 `/k8s_pools/{name}` 返回的实例（空池文案「当前池暂无实例（空池为合法状态）」） |

## 6. 下游影响（阶段 3/4/5 输入）

- 02 文档：`docs/providers/02-功能测试用例/02-创建与编辑.md`（PR-C-20~24）、`06-字段校验矩阵.md`（PR-V-19）、`03-详情页验证.md`（PR-D-04）按上表微调；新增 2 个用例：① **K8s 实例池下拉选项与 `GET /k8s_pools` 一致 + 空池列表降级**；② **详情页按 `/k8s_pools/{name}` 展示池内实例（含空池 / 池不存在两种降级）**。
- 测试：`tests/providers/test_02_provider_upsert.spec.js`、`test_03_provider_detail.spec.js`；`pages/providers` 封装需新增下拉选择/选项断言方法与「池内实例表」读取方法。
- 用户手册：`docs/zh-cn/05-model-provider.md`（§5.4 实例池 —— 当前手册**未记载实例来源分支**，需补齐「人工维护实例池 / K8s 实例池」下拉与 K8s 池下拉选择、详情页按池展示实时实例）及对应截图；菜单名称/层级/顺序未变，**章节无需重排**，但 `site/` 仍需按阶段 5 常规流程重建并用 `verify-manual-site.js` 自检。
