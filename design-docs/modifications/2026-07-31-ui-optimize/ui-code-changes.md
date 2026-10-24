# UI 代码变更文档

> 说明：本文档基于 `openapi-doc-diff.md`（新旧 OpenAPI 接口定义核对报告）、新版 `ai-gateway-api/design-docs/api-define/OpenAPI接口定义/` 以及 `00-common.md` 公共参数类型校验定义，与 `ai-gateway-web/src/` 当前源码逐一核对，记录 UI 变更项及实施状态。
>
> **最后核对**：2026-07-31（与当前源码对齐，全部变更项均已落地）
>
> **文档维护**：2026-10-17 移除 3 处失效链接 `clusters-instance-pool-api-issues.md`（该文件在 `ai-gateway-web` / `ai-gateway-api` 全仓及本工作区均不存在，从未提交），按纯文件名引用保留。

---

## 1. 变更优先级总览

| 优先级 | 变更点 | 影响模块 | 状态 | 备注 |
|--------|--------|----------|------|------|
| P0 | `clusters.model_mappings` 字段重命名 | 集群管理 | 已修改 | 已统一为 `source_model`/`target_model` |
| P0 | `UserName` 校验重写 | 用户管理 | 已修改 | `UserNameRegCheck` 已对齐 1-64、首尾限制、保留名 |
| P0 | `Password` 校验重写 | 用户管理 | 已修改 | 8-128 字符、禁空白、不等于用户名/逆序 |
| P0 | `TokenName` 校验新增 | 用户管理 | 已修改 | `TokenNameRegCheck` + `CreateToken.vue` 完整校验 |
| P0 | `ClusterName` 校验重写 | 集群管理 | 已修改 | `ClustersNameRegCheck` 已对齐 1-64、首尾限制；Input `maxlength="64"` |
| P1 | APIKey `description` 长度上限改为 ≤511 | APIKey | 已修改 | `DESCRIPTION_MAX_LENGTH = 511` |
| P1 | Entity `name` 增加格式校验 | Entity | 已修改 | 长度 1-64、禁控制字符、禁首尾空白 |
| P1 | `RouteRule` 去重逻辑修正 | 路由规则 | 已修改 | 按 `(ClusterName, Model)` 去重；允许同集群多目标 |
| P1 | `RateLimitPolicy` TPM/RPM 组合重复检测 | APIKey/Entity | 已修改 | `validateRateLimitPolicy` 内组合键去重 |
| P1 | `TPMConfig` / `RPMConfig` 字段范围修正 | APIKey/Entity | 已修改 | `max_tokens`/`max_requests` 允许 0；`name` 限制 1-128 |
| P1 | `Hostname` 域名模式补充 RFC 1123 校验 | 集群管理 | 已修改 | `isHostname()` 用于实例池域名模式 |
| P1 | 移除 `sticky_sessions.session_sticky_type` 字段 | 集群管理 | 已修改 | 新版 OpenAPI 已删除该字段 |
| P1 | 补充 `sticky_sessions.enabled` 开关 | 集群管理 | 已修改 | 新版 `sticky_sessions` 新增 `enabled` 字段 |
| P1 | `clusters` 描述长度/控制字符校验 | 集群管理 | 已修改 | 描述长度 0-256，禁止控制字符 |
| P1 | 超时时间/写缓存大小必须 > 0 | 集群管理 | 已修改 | 有值时须 > 0；`req_write_buffer_size` 已校验 > 0 |
| P1 | `retries` 字段重命名为 `max_retry_in_cluster` | 集群管理 | 已修改 | 全模块已统一为 `max_retry_in_cluster` |
| P1 | 健康检查 `host` 允许为空且使用 `Hostname` 校验 | 集群管理 | 已修改 | 非必填；非空时用 `isHostname()`，允许 IP |
| P1 | 健康检查 `statuscode` 范围修正 | 集群管理 | 已修改 | 须为 0 或 100-599；`failnum` 默认 3 |
| P1 | `instance_pool.weight` 输入与校验 | 集群管理 | 已修改 | IP 模式展示 weight、总和须为 100；域名模式固定 100 |
| P1 | `llm_config.service_name` / `group` 移除 | 集群管理 | 已修改 | 表单/复查/提交均已移除 |
| P1 | 实例池 hostname/ip 分离提交 | 集群管理 | 已修改 | 域名模式只传 `hostname`；IP 模式只传 `ip` |
| P1 | 集群 API 默认值与必填对齐 | 集群管理 | 已修改 | `basic`/被动健康检查/LLM 默认值；非必填字段去掉 required |
| P1 | 删除旧响应兼容逻辑 | 集群管理 | 已修改 | 移除 `Name`/`Addr`/`sub_clusters`/`max_retry_in_subcluster` 等回退 |
| P2 | `llm_config.key` 长度放宽至 512 | 集群管理 | 已修改 | `validKey` 仅校验 `length > 512` |
| P2 | `model_endpoint.schema` 默认 `https` | 集群管理 | 已修改 | 初始值/重置/回显兜底均为 `https` |
| P2 | `EntityTypeName` 首尾限制 | Entity | 已修改 | 正则 `/^[a-z0-9]([a-z0-9_-]{0,30}[a-z0-9])?$/` |
| P2 | 公共校验函数统一在 `const.js` 维护 | 全局 | 已修改 | 主要校验函数已对齐；AIModel 由接口下拉选择，无需前端校验 |

---

## 2. P0 级变更（必须立即修改）

### 2.1 `clusters.model_mappings` 字段重命名

**背景**：新版 OpenAPI 将 `model_mappings` 数组元素字段从 `key`/`value` 重命名为 `source_model`/`target_model`。

**核对结果**（2026-07-31 已修改）：
- `GatewayConfig.vue`、`Review.vue` 已统一使用 `source_model`/`target_model`。

**影响文件**：
- `src/modules/Clusters/components/GatewayConfig.vue`
- `src/modules/Clusters/components/Review.vue`

**具体修改**：
1. `GatewayConfig.vue`：
   - 模板中 `model.key` → `model.source_model`，`model.value` → `model.target_model`。
   - `changeMappingKey` / `changeMappingValue` 方法名改为 `changeMappingSource` / `changeMappingTarget`。
   - 默认数据、表单校验、提交过滤统一使用 `source_model`/`target_model`。
2. `Review.vue`：
   - `displayModelMappings` 中 `item.key` → `item.source_model`，`item.value` → `item.target_model`。
   - 展示表格同步修改。
3. 确认后端返回的 `llm_config.model_mappings` 已经使用新字段名，否则前端回显为空。

**参考**：`openapi-doc-diff.md` 3.9 / `clusters.md`

---

### 2.2 `UserName` 校验重写

**背景**：新版定义 `UserName` 长度 1-64；仅字母、数字、`_`、`-`、`.`；不得以 `.`、`-`、`_` 开头或结尾；全局唯一；保留名 `admin`/`root`/`system` 等不可用。

**核对结果**（2026-07-31 已修改）：
- `src/utils/const.js` 中 `UserNameRegCheck()` 已重写：长度 1-64、字符集 `_`/`-`/`.`、首尾限制、保留名 `admin`/`root`/`system`。
- `CreateUser.vue` 已接入新校验；i18n `user.tipNameRule` 已更新。

**影响文件**：
- `src/utils/const.js`
- `src/modules/User/components/CreateUser.vue`
- `src/modules/User/components/UpdatePassword.vue`（如使用）
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- 重写 `UserNameRegCheck`：长度 1-64、字符集、首尾限制、保留名校验。
- 更新 `CreateUser.vue` 调用新函数。
- 更新 i18n 提示文案 `user.tipNameRule`。

**参考**：`ui-common-type-alignment.md` 12 / `00-common.md`

---

### 2.3 `Password` 校验重写

**背景**：新版定义 `Password` 长度 8-128；不含空白字符；不能等于 `user_name` 或其逆序。

**核对结果**（2026-07-31 已修改）：
- `src/utils/const.js` 中 `PasswordRegCheck(value, userName)` 已重写：8-128 字符、禁空白、不等于用户名及其逆序。
- `CreateUser.vue`、`UpdatePassword.vue` 已传入 `user_name` 调用新校验；i18n `user.tipPasswordRule` 已更新。

**影响文件**：
- `src/utils/const.js`
- `src/modules/User/components/CreateUser.vue`
- `src/modules/User/components/UpdatePassword.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- 重写 `PasswordRegCheck(value, userName)`：8-128 字符、禁止空白、不等于 user_name、不等于 user_name 逆序。
- 更新 `CreateUser.vue` 和 `UpdatePassword.vue` 的 validator，传入 `user_name`。
- 更新 i18n 提示文案 `user.tipPasswordRule`。

**参考**：`ui-common-type-alignment.md` 13 / `00-common.md`

---

### 2.4 `TokenName` 校验新增

**背景**：新版定义 `TokenName` 长度 1-64；仅字母、数字、`_`、`-`、`.`；不得以 `.`、`-`、`_` 开头或结尾；全局唯一；保留名 `admin`/`system`/`default`；不含空白。

**核对结果**（2026-07-31 已修改）：
- `src/utils/const.js` 已新增 `TokenNameRegCheck()`：规则类似 `UserName`，保留名为 `admin`/`system`/`default`。
- `CreateToken.vue` 已接入完整校验；i18n `user.tipTokenNameRule` 已新增。

**影响文件**：
- `src/utils/const.js`
- `src/modules/User/components/CreateToken.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- 在 `utils/const.js` 新增 `TokenNameRegCheck()`。
- 在 `CreateToken.vue` 中增加完整校验。
- 新增 i18n 提示文案 `user.tipTokenNameRule`。

**参考**：`ui-common-type-alignment.md` 14 / `00-common.md`

---

### 2.5 `ClusterName` 校验重写

**背景**：新版定义 `ClusterName` 长度 1-64；仅字母、数字、`_`、`-`、`.`；不得以 `.`、`-`、`_` 开头或结尾；全局唯一；不含空白。

**核对结果**（2026-07-31 已修改）：
- `src/utils/const.js` 中 `ClustersNameRegCheck()` 已对齐 1-64 字符、首尾 `.`/`_`/`-` 限制。
- `BaseConfig.vue` 已增加 `maxlength="64"`。

**影响文件**：
- `src/utils/const.js`
- `src/modules/Clusters/components/BaseConfig.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- 重写 `ClusterNameRegCheck`：长度 1-64、首尾限制、字符集。
- `BaseConfig.vue` 中 Input 增加 `maxlength="64"`。
- 更新 i18n 提示文案 `cluster.tipClusterNameRule`。

**参考**：`ui-common-type-alignment.md` 15 / `00-common.md`

---

## 3. P1 级变更（建议本轮同步修改）

### 3.1 APIKey `description` 长度上限改为 ≤511

**背景**：新版 OpenAPI 定义 `description` 必填且长度 ≤511（<512）。

**核对结果**（2026-07-31 已修改）：
- `src/modules/APIKey/components/Upsert.vue` 中 `DESCRIPTION_MAX_LENGTH = 511`；校验为 `value.length > 511`。

**影响文件**：
- `src/modules/APIKey/components/Upsert.vue`

**具体修改**：
- 将 `DESCRIPTION_MAX_LENGTH` 从 `512` 改为 `511`。
- 可选更新 `apiKey.descriptionLengthError` 文案。

**参考**：`openapi-doc-diff.md` 3.1 / `api-keys.md`

---

### 3.2 Entity `name` 增加格式校验

**背景**：新版定义 `name` 为 1-64 字符；无控制字符；无前导/尾随空白；全局唯一。

**核对结果**（2026-07-31 已修改）：
- `EntityUpsert.vue` 中 `validateName` 已补充：非空、禁首尾空白、长度 ≤64、禁控制字符（`\x00-\x1F\x7F`）。

**影响文件**：
- `src/modules/Entity/components/EntityUpsert.vue`

**具体修改**：
- 在 `validateName` 中补充：
  - 去除前后空白后长度 1-64。
  - 检查是否包含控制字符。
  - 检查是否有前导/尾随空白。

**参考**：`openapi-doc-diff.md` 3.3 / `entities.md`

---

### 3.3 `RouteRule` 去重逻辑修正

**背景**：新版定义 `targets` 内 `(ClusterName, Model)` 组合不能重复，且允许同一集群不同 Model。

**核对结果**（2026-07-31 已修改）：
- `RuleForm.vue` 中 `validateDuplicate()` 已改为检查 `(ClusterName, Model)` 元组重复。
- `getClusters()` 已移除对已选 ClusterName 的过滤，允许同集群多目标。
- `RouteRules.vue` 提交前已校验 `rules[].name` 组内唯一。

**影响文件**：
- `src/modules/RouteTable/components/RuleForm.vue`
- `src/modules/RouteTable/components/RouteRules.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- `validateDuplicate()` 改为检查 `(ClusterName, Model)` 元组重复（空 Model 视为 `""`）。
- 移除 `getClusters()` 中对已选 ClusterName 的过滤，允许同集群多目标。
- `RouteRules.vue` 提交前校验 `rules[].name` 组内唯一。
- 更新 i18n 文案 `route.targetClusterDuplicate`，区分「集群重复」与「目标组合重复」。

**参考**：`ui-common-type-alignment.md` 6 / `00-common.md`

---

### 3.4 `RateLimitPolicy` TPM/RPM 组合重复检测

**背景**：新版定义同一 `RateLimitPolicy` 内，TPM/RPM 组合字段不可重复。

**核对结果**（2026-07-31 已修改）：
- `APIKey/Upsert.vue` 与 `Entity/EntityUpsert.vue` 的 `validateRateLimitPolicy` 内已实现 TPM/RPM 组合重复检测。
- TPM 组合键：`(model, window_minutes, max_tokens, step_minutes)`。
- RPM 组合键：`(model, window_minutes, max_requests)`。

**影响文件**：
- `src/modules/APIKey/components/Upsert.vue`
- `src/modules/Entity/components/EntityUpsert.vue`

**具体修改**：
- 新增 `validateTpmDuplicate()` / `validateRpmDuplicate()`。
- TPM 检查 `(model, window_minutes, max_tokens, step_minutes)` 组合。
- RPM 检查 `(model, window_minutes, max_requests)` 组合。

**参考**：`ui-common-type-alignment.md` 9 / `00-common.md`

---

### 3.5 `TPMConfig` / `RPMConfig` 字段范围修正

**背景**：新版定义 `max_tokens` / `max_requests` 为非负整数（≥0）；`name` 长度 1-128。

**核对结果**（2026-07-31 已修改）：
- `validateTpmMaxTokens` / `validateRpmMaxRequests` 已改为 `value < 0` 报错（允许 0）。
- `InputNumber` 的 `:min` 对 `max_tokens`/`max_requests` 已改为 `0`。
- `validateTpmRuleName` / `validateRpmRuleName` 已增加 `trim().length` 1-128 检查及组内名称唯一校验。

**影响文件**：
- `src/modules/APIKey/components/Upsert.vue`
- `src/modules/Entity/components/EntityUpsert.vue`

**具体修改**：
- `validateTpmMaxTokens` / `validateRpmMaxRequests` 改为 `value < 0` 报错（允许 0）。
- `InputNumber` 的 `:min` 从 `1` 改为 `0`。
- `validateTpmRuleName` / `validateRpmRuleName` 增加 `trim().length` 1-128 检查。
- 补充 i18n 名称长度错误提示。

**参考**：`ui-common-type-alignment.md` 10-11 / `00-common.md`

---

### 3.6 `Hostname` 域名模式补充 RFC 1123 校验

**背景**：新版定义 Hostname 总长 ≤255、每标签 ≤63、标签不得以 `-` 开头或结尾、长度 ≥2。

**核对结果**（2026-07-31 已修改）：
- `src/utils/const.js` 已新增 `isHostname()`：RFC 1123 标签校验，同时允许 IPv4/IPv6。
- `InstancePool.vue` 域名模式已改用 `isHostname()` 替代 `validator.isFQDN`。

**影响文件**：
- `src/modules/Clusters/components/InstancePool.vue`
- `src/utils/const.js`

**具体修改**：
- 新增 `validateHostname()` 或 `isHostname()`，按 `.` 拆分标签逐项校验。
- 正则：`/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/` 逐标签。
- 域名/IP 均 `trim().length >= 2`。

**参考**：`ui-common-type-alignment.md` 1 / `00-common.md`

---

### 3.7 移除 `sticky_sessions.session_sticky_type` 字段

**背景**：新版 OpenAPI 中 `clusters.sticky_sessions` 只保留 `enabled`、`hash_strategy`、`hash_header`，已删除 `session_sticky_type` 字段。

**核对结果**（2026-07-31 已修改）：
- `BaseConfig.vue`、`Review.vue` 中 `session_sticky_type` 表单/展示已删除。
- 相关 i18n 文案（`stickySessions`、`instanceSessionPersistence`、`subClusterSessionPersistence`）已移除。

**影响文件**：
- `src/modules/Clusters/components/BaseConfig.vue`
- `src/modules/Clusters/components/Review.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- 删除 `BaseConfig.vue` 中 `session_sticky_type` 的 `FormItem`、校验规则、默认数据、`sessionStickyOptions`。
- 删除 `Review.vue` 中 `session_sticky_type` 展示。
- 删除 `i18n` 中 `stickySessions`、`instanceSessionPersistence`、`subClusterSessionPersistence` 文案。

**参考**：`clusters.md`

---

### 3.8 补充 `sticky_sessions.enabled` 开关

**背景**：新版 `clusters.sticky_sessions` 数据模型新增 `enabled` 布尔字段，默认 `false`；只有 `enabled = true` 时才需要配置 `hash_strategy`/`hash_header`。

**核对结果**（2026-07-31 已修改）：
- `BaseConfig.vue` 已增加 `sticky_sessions.enabled` 开关；`hash_strategy`/`hash_header` 仅在 `enabled === 'true'` 时显示。
- `index.vue` 中 `formatStickySessionsForApi()` / `formatStickySessionsForEdit()` 负责提交/回显布尔值转换。
- `Review.vue` 已展示 `enabled` 状态，并仅在启用时显示后续字段。

**影响文件**：
- `src/modules/Clusters/components/BaseConfig.vue`
- `src/modules/Clusters/components/index.vue`
- `src/modules/Clusters/components/Review.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- 在 `BaseConfig.vue` 增加 `sticky_sessions.enabled` 下拉开关（`true`/`false`）。
- `hash_strategy`、`hash_header` 表单项仅在 `enabled === 'true'` 时显示。
- `index.vue` 增加 `formatStickySessionsForApi()` / `formatStickySessionsForEdit()` 负责提交/回显布尔值转换；`enabled = false` 时重置策略为默认值。
- `Review.vue` 展示 `enabled` 状态，并仅在启用时显示后续字段。
- 新增 i18n `cluster.stickySessionsEnabled`。

**参考**：`clusters.md` 表：会话保持

---

### 3.9 `clusters` 描述长度/控制字符校验

**背景**：新版定义 `description` 可选；若传入，长度 0-256 字符，不能包含控制字符。

**核对结果**（2026-07-31 已修改）：
- `BaseConfig.vue` 已增加 `validateDescription`：长度 ≤ 256，禁止控制字符（`\x00-\x1F\x7F`）。
- i18n `cluster.descriptionLengthError`、`cluster.descriptionControlCharsError` 已新增。

**影响文件**：
- `src/modules/Clusters/components/BaseConfig.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- 在 `BaseConfig.vue` 增加 `validateDescription`：长度 ≤ 256，禁止控制字符（`\x00-\x1F\x7F`）。
- 新增 i18n `cluster.descriptionLengthError`、`cluster.descriptionControlCharsError`。

**参考**：`clusters.md` 字段说明

---

### 3.10 超时时间/写缓存大小必须 > 0

**背景**：新版 `clusters.basic.timeouts.*` 各项以及 `buffers.req_write_buffer_size` 均须为 > 0 的整数。

**核对结果**（2026-07-31 已修改）：
- `Timeout.vue` 中 `timeoutValidate` 已改为有值时 `value <= 0` 报错（空值跳过）。
- `BaseConfig.vue` 中 `validateReqWriteBufferSize` 已增加 > 0 和最大值校验。
- i18n `cluster.timeoutValueMustGreaterThanZero`、`cluster.reqWriteBufferSizeMustGreaterThanZero` 已新增。

**影响文件**：
- `src/modules/Clusters/components/Timeout.vue`
- `src/modules/Clusters/components/BaseConfig.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- `Timeout.vue`：`timeoutValidate` 改为 `value <= 0` 报错。
- `BaseConfig.vue`：`validateReqWriteBufferSize` 增加 > 0 和最大值校验。
- 新增 i18n `cluster.timeoutValueMustGreaterThanZero`、`cluster.reqWriteBufferSizeMustGreaterThanZero`。

**参考**：`clusters.md` 表：超时设置、表：连接设置/重试设置

---

### 3.11 `retries` 字段重命名为 `max_retry_in_cluster`

**背景**：新版 OpenAPI 中 `basic.retries` 字段为 `max_retry_in_cluster`，并说明底层对应 `max_retry_in_subcluster`。UI 应与新接口字段名保持一致。

**核对结果**（2026-07-31 已修改）：
- `Timeout.vue`、`BaseConfig.vue`、`index.vue`、`Review.vue` 已统一使用 `max_retry_in_cluster`。
- 提交/回显均不再使用 `max_retry_in_subcluster`；i18n 已改为 `cluster.maxRetryInCluster`。

**影响文件**：
- `src/modules/Clusters/components/Timeout.vue`
- `src/modules/Clusters/components/BaseConfig.vue`
- `src/modules/Clusters/components/index.vue`
- `src/modules/Clusters/components/Review.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- `Timeout.vue`：prop 路径、v-model、rule 改为 `max_retry_in_cluster`。
- `BaseConfig.vue`：默认数据改为 `{ max_retry_in_cluster: 2 }`，移除 `max_retry_cross_subcluster`。
- `index.vue`：`handelData()` 提交 `{ max_retry_in_cluster }`；`changeData()` 仅读取 `max_retry_in_cluster`，缺失时用默认值 `2`。
- `Review.vue`：展示 `max_retry_in_cluster`。
- i18n：`cluster.maxRetryInSubcluster` → `cluster.maxRetryInCluster`。

**参考**：`clusters.md` 表：重试设置

---

### 3.12 健康检查 `host` 允许为空且使用 `Hostname` 校验

**背景**：新版定义 `passive_health_check.host` 非必填，为空时使用 `instance_pool` 首个实例的 `hostname`；若传入，应为 `Hostname` 类型（允许 IP）。

**核对结果**（2026-07-31 已修改）：
- `PassiveHealthCheck.vue` 中 `host` 已改为非必填（`required: false`）。
- 非空时使用 `isHostname()` 校验，允许 IP 地址；复用 `instancePool.invalidDomain` 文案。

**影响文件**：
- `src/modules/Clusters/components/PassiveHealthCheck.vue`
- `src/utils/const.js`（已提供 `isHostname`）
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- `host` 规则 `required` 改为 `false`。
- 非空时使用 `isHostname()` 校验，允许 IP 地址。
- 复用现有 `instancePool.invalidDomain` 文案提示格式错误。

**参考**：`clusters.md` 表：被动健康检查

---

### 3.13 健康检查 `statuscode` 范围修正

**背景**：新版定义 `passive_health_check.statuscode` 须为 `0` 或 `100-599` 的整数。

**核对结果**（2026-07-31 已修改）：
- `statuscode` 校验器已限制为 0 或 100-599 的非负整数。
- i18n `cluster.healthCheckStatuscodeRangeError` 已新增。
- `failnum` 默认值已从 `10` 改为 `3`。

**影响文件**：
- `src/modules/Clusters/components/PassiveHealthCheck.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- 自定义 `statuscode` 校验器：非负整数，且为 `0` 或 `100-599`。
- 新增 i18n `cluster.healthCheckStatuscodeRangeError`。
- 顺手将 `failnum` 默认值从 `10` 改为 `3`（与新版默认值一致）。

**参考**：`clusters.md` 表：被动健康检查

---

### 3.14 `instance_pool.weight` 输入与校验

**背景**：新版 `instance_pool[].weight` 必填，取值范围 `[0,100]`，且同一集群内至少有一个实例 `weight > 0`。

**核对结果**（2026-07-31 已修改）：
- IP 模式：表格展示 weight 列，单实例 `[0,100]`，多实例权重总和须为 100，至少一个 `weight > 0`。
- 域名模式：固定 weight = 100（只读展示）。
- 新建 IP 实例默认 weight = 100；新增行默认 weight = 0，需用户调整至总和 100。

**影响文件**：
- `src/modules/Clusters/components/InstancePool.vue`
- `src/modules/Clusters/components/Review.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`（`tipDuplicateIp` 等）

**具体修改**：
- 增加 weight 列与 `instanceWeightRules`、`getWeightSumError()` 校验。
- `formatInstanceForApi()` 携带用户填写的 weight。
- 复查页 IP 列表增加 weight 列；域名模式展示 weight=100。

**参考**：`clusters.md` Instance 结构

---

### 3.15 `llm_config.service_name` / `group` 移除

**背景**：新版 v0.3.0 已从 `llm_config` 删除 `service_name`、`group`，改为通过 `provider_type` + `models` 描述 AI 服务；后端 `LLMConfig` 已无这两个字段。

**核对结果**（2026-07-31 已修改）：
- `GatewayConfig.vue` 已移除「服务名称」「分组」表单项及 `validServiceName` 校验。
- `Review.vue` 复查页已移除对应展示行。
- `GatewayConfig.vue` / `components/index.vue` 提交前 `delete service_name`、`delete group`。

**影响文件**：
- `src/modules/Clusters/components/GatewayConfig.vue`
- `src/modules/Clusters/components/Review.vue`
- `src/modules/Clusters/components/index.vue`

**具体修改**：
- 移除 `service_name`、`group` 表单项及校验。
- 复查页移除对应展示行。
- 提交 `llm_config` 前过滤已删除字段；编辑回显时 `applyLlmConfigData` 同步删除。

**参考**：`clusters.md` 表：LLM配置；`clusters-instance-pool-api-issues.md` 问题三

---

### 3.16 实例池 hostname/ip 分离提交

**背景**：按产品约定，域名模式与 IP 模式向 API 提交不同字段组合（域名仅 `hostname`，IP 仅 `ip`），与 OpenAPI 文档「Instance 同时含 hostname/ip」的完整结构存在 intentional 差异。

**核对结果**（2026-07-31 已修改）：
- 域名模式：`formatInstanceForApi()` 仅输出 `{ hostname, weight, ports }`。
- IP 模式：仅输出 `{ ip, weight, ports }`。
- 域名模式判定：单实例且 `hostname` 非空、`ip` 为空。
- IP 重复校验：按 `ip` 去重（不再按 `ip:port`）。

**影响文件**：
- `src/modules/Clusters/components/InstancePool.vue`
- `src/modules/Clusters/components/GatewayConfig.vue`（`getInstanceEndpointHosts`）
- `src/modules/Clusters/components/Review.vue`

**参考**：`clusters.md` Instance 结构；`clusters-instance-pool-api-issues.md` 问题二

---

### 3.17 集群 API 默认值与必填对齐

**背景**：新建默认值、表单必填性与 `clusters.md` 推荐值及「必填 N/Y」列对齐。

**核对结果**（2026-07-31 已修改）：

| 区域 | 变更 |
|------|------|
| `BaseConfig` 超时默认值 | 50000/50000/30000/30000/60000 |
| `sticky_sessions.hash_header` 默认 | `''`（关闭时提交清空） |
| `PassiveHealthCheck` | 字段标签与 API 一致；全部非必填；空值提交补默认（3/1000/''/'/'/0） |
| `Timeout` | 超时非必填（有值时须 >0）；`max_retry_in_cluster` 须 ≥0 |
| `GatewayConfig` | `provider_type`、`model_endpoint` 非必填；未填 endpoint 时默认 `https` + `/v1/models` |
| 提交格式化 | `components/index.vue` 内联：`formatBasicForApi`、`formatLlmConfigForApi`、`formatStickySessionsForApi`；`PassiveHealthCheck.vue` 导出 `formatPassiveHealthCheckForApi` |

**影响文件**：
- `src/modules/Clusters/components/BaseConfig.vue`
- `src/modules/Clusters/components/Timeout.vue`
- `src/modules/Clusters/components/PassiveHealthCheck.vue`
- `src/modules/Clusters/components/GatewayConfig.vue`
- `src/modules/Clusters/components/index.vue`
- `src/modules/Clusters/index.vue`（详情抽屉 `sticky_sessions` 回显修正）
- `src/i18n/zh.js`、`src/i18n/en.js`

**参考**：`clusters.md` §1 数据模型及各参数表

---

### 3.18 删除旧响应兼容逻辑

**背景**：后端响应已对齐 OpenAPI，UI 不再映射 BFE 旧字段或从 `sub_clusters` 回退读取。

**核对结果**（2026-07-31 已修改）：
- `getClusterInstancePool()` 仅读取 `cluster.instance_pool` 数组。
- `normalizeInstance()` 仅处理 `hostname`、`ip`、`weight`、`ports.Default`。
- `parseInstancePool()` 仅接受数组。
- `detectInstanceMode()` 仅依据「单实例 + hostname 非空 + ip 空」判定域名模式。
- 移除 `max_retry_in_subcluster` 回显回退。

**影响文件**：
- `src/modules/Clusters/components/InstancePool.vue`
- `src/modules/Clusters/components/index.vue`

**参考**：`clusters.md`；`clusters-instance-pool-api-issues.md` 问题一

---

## 4. P2 级变更（建议后续优化）

### 4.1 `EntityTypeName` 首尾限制

**背景**：新版定义 `EntityTypeName` 不能以 `-` 或 `_` 开头或结尾。

**核对结果**（2026-07-31 已修改）：
- `EntityTypeUpsert.vue` 正则已改为 `/^[a-z0-9]([a-z0-9_-]{0,30}[a-z0-9])?$/`。
- i18n `entity.typeNameFormatError` / `entity.typeNameRule` 已补充首尾限制说明。

**影响文件**：
- `src/modules/Entity/components/EntityTypeUpsert.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- 正则改为 `/^[a-z0-9]([a-z0-9_-]{0,30}[a-z0-9])?$/`。
- 补充「不得以 `-`/`_` 开头或结尾」提示。

**参考**：`ui-common-type-alignment.md` 16 / `00-common.md`

---

### 4.2 公共校验函数统一在 `const.js` 维护

**背景**：前端已有公共校验文件 `src/utils/const.js`，部分校验函数需与新版 `00-common.md` 对齐并统一各模块引用。

**核对结果**（2026-07-31 已修改）：
- 已完成：`UserNameRegCheck`、`PasswordRegCheck`、`ClustersNameRegCheck`、`TokenNameRegCheck`、`isHostname()`。
- **无需新增 AIModel 校验**：各模块（APIKey、Entity、路由规则、TPM/RPM）的模型字段均通过接口获取模型列表并以下拉/多选呈现，用户无法输入非法模型名，故不需要 `AIModelRegCheck()`。

**影响文件**：
- `src/utils/const.js`

**具体修改**：
- 修正 `UserNameRegCheck()`：移除 `@`，增加长度 1-64、首尾限制、保留名校验。
- 修正 `PasswordRegCheck()`：改为 8-128 字符、禁空白、不等于用户名/逆序。
- 修正 `ClustersNameRegCheck()`：增加 64 字符上限、首尾 `.`/`_`/`-` 限制。
- 新增 `TokenNameRegCheck()`：规则类似 `UserName`，保留名不同。
- 新增 `isHostname()`：RFC 1123 标签/长度约束。
- 保持 `isIpv4Address`、`isCidr`、`isIpv4Cidr` 等已对齐函数，统一各模块引用。

**参考**：`ui-common-type-alignment.md` 附录 / `00-common.md`

---

### 4.3 `llm_config.key` 长度放宽至 512

**背景**：新版定义 `llm_config.key` 可选；若传入，长度 0-512 字符。

**核对结果**（2026-07-31 已修改）：
- `GatewayConfig.vue` 中 `validKey` 已改为仅校验 `length > 512` 报错（编辑未变更时跳过）。
- i18n `gatewayConfig.formatInvalid` 文案已更新。

**影响文件**：
- `src/modules/Clusters/components/GatewayConfig.vue`
- `src/i18n/zh.js`、`src/i18n/en.js`

**具体修改**：
- 将 `validKey` 改为仅校验 `length > 512` 报错。
- 更新 `gatewayConfig.formatInvalid` 文案为"服务鉴权 Key 长度不能超过 512 个字符"。

**参考**：`clusters.md` 表：LLM配置

---

### 4.4 `model_endpoint.schema` 默认 `https`

**背景**：新版定义 `llm_config.model_endpoint.schema` 默认值为 `https`。

**核对结果**（2026-07-31 已修改）：
- `GatewayConfig.vue` 中三处 `schema` 默认值（初始 formData、`resetLlmForm`、`applyLlmConfigData` 兜底）均已改为 `https`。
- `index.vue` 中 `formatLlmConfigForApi()` 未填 endpoint 时亦默认 `https`。

**影响文件**：
- `src/modules/Clusters/components/GatewayConfig.vue`

**具体修改**：
- 将三处 `schema` 默认值统一改为 `https`（初始 formData、`resetLlmForm`、`applyLlmConfigData` 兜底）。

**参考**：`clusters.md` 表：Endpoint

---

## 5. 待确认事项

1. **`clusters.model_mappings` 后端返回字段**：确认后端 `GET /clusters/{cluster_name}` 返回的 `llm_config.model_mappings` 已经使用 `source_model`/`target_model`，否则前端回显为空。
2. **APIKey `key` 字段格式校验**：新版定义 `key` 1-128 字符且仅字母/数字/`-`/`_`，但当前 UI 中 `key` 为系统生成或导入，建议确认导入场景是否需要增加格式校验。
3. **RateLimitPolicy「不限制并发」语义**：当前 UI 将 `max_concurrency=-1` 视为未配置，需与后端确认是否允许仅配置 TPM/RPM 而不配置并发。

---

## 6. 实施建议顺序

1. **P0** — 全部已完成 ✅：
   - ~~`clusters.model_mappings` 字段重命名~~
   - ~~ClusterName / UserName / Password / TokenName 校验重写~~
2. **P1** — 全部已完成 ✅：
   - ~~集群模块 OpenAPI 对齐（weight、LLM 字段、默认值、旧响应兼容删除等）~~
   - ~~APIKey `description` 长度上限~~
   - ~~Entity `name` 格式校验~~
   - ~~RouteRule 去重逻辑、RateLimitPolicy 组合重复检测、TPM/RPM 范围修正、Hostname 校验~~
3. **P2** — 全部已完成 ✅：
   - ~~EntityTypeName 首尾限制~~
   - ~~`llm_config.key` 长度、`model_endpoint.schema` 默认值~~
   - ~~公共校验函数统一（`UserName`/`Password`/`TokenName`/`ClusterName`/`isHostname`）~~
4. **测试覆盖**：重点回归集群创建/编辑、用户创建/改密、Token 创建、路由规则编辑、限流配置等场景。GUI 测试用例见 `gui-test-for-ai-gateway/docs/`（2026-07-31 已与本文档对齐）。

---

## 7. 参考文档

- `design-docs/modifications/2026-07-31-ui-optimize/openapi-doc-diff.md`
- `design-docs/modifications/2026-07-31-ui-optimize/ui-common-type-alignment.md`
- `ai-gateway-api/design-docs/api-define/OpenAPI接口定义/` 新版拆分文档
- `ai-gateway-web/design-docs/api-define/OpenAPI接口定义.md` 旧版单文件
- `ai-gateway-web/design-docs/api-define/OpenAPI接口定义/00-common.md`
- `src/modules/Clusters/components/GatewayConfig.vue`
- `src/modules/Clusters/components/Review.vue`
- `src/modules/Clusters/components/BaseConfig.vue`
- `src/modules/Clusters/components/InstancePool.vue`
- `src/modules/Clusters/components/Timeout.vue`
- `src/modules/Clusters/components/PassiveHealthCheck.vue`
- `src/modules/Clusters/components/index.vue`
- `src/modules/Clusters/index.vue`
- `src/modules/APIKey/components/Upsert.vue`
- `src/modules/Entity/components/EntityUpsert.vue`
- `src/modules/Entity/components/EntityTypeUpsert.vue`
- `src/modules/RouteTable/components/RuleForm.vue`
- `src/modules/RouteTable/components/RouteRules.vue`
- `src/modules/User/components/CreateUser.vue`
- `src/modules/User/components/UpdatePassword.vue`
- `src/modules/User/components/CreateToken.vue`
- `src/utils/const.js`
