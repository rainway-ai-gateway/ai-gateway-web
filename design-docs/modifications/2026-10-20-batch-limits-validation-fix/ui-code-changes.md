# UI 代码变更：修复仅配置批量限流时无法保存

> **日期**: 2026-10-20 ｜ **前置**: [2026-10-10 批量任务与密钥收敛](../2026-10-10-batch-tasks-and-key-reencrypt/ui-code-changes.md)（批量限流 `batch_limits` 首次引入，见该文 #3）｜ **上游依据**: GitHub issue #124；`ai-gateway-api/lib/validate/validate.go:467-508`、`ai-gateway-api/lib/validate/validate_test.go:294-325`、`ai-gateway-api/test/integration/tests/api_key/batch_limits/batch_limits_test.go:41-88`
> **对照接口**: `design-docs/api-define/OpenAPI接口定义/00-common.md` §9 `RateLimitPolicy`（`rules.batch_limits` 为四种合法维度之一）｜ **对照原型**: `design-docs/prototype-design/assets/js/api-key-upsert.js`、`entity-upsert.js`（原型未实现「至少一条规则」前置校验，无需改动）
> **状态**: 原型 ✅（无需改动）· UI 代码 ✅ · 02 文档 ✅（新增 EM-K-67 / EM-E-62）· 测试 ✅（Playwright 新增 2 条通过 + 受影响用例复跑通过；`eslint` + `npm run build` + 后端 `go test`）· 手册 ⬜ ｜ **菜单/路由变更**: 无

Issue #124：通过 OpenAPI `PATCH /open-api/v1/api-keys/{id}` 可以只配置 `rate_limit_policy.rules.batch_limits`，同样配置在 UI 提交时被表单校验拦截。根因是前端「启用限流时至少配置一条规则」的校验只认 `tpm` / `rpm` / `max_concurrency`，漏掉了 `batch_limits`；后端校验与集成用例均把 `batch_limits` 视为合法维度，因此这是 UI 与接口契约不一致的缺陷。本次只在 API Key / Entity 两个表单补齐该维度，未改后端。

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 | 验证 |
| ----------- | -------- | ---- | ---- |
| API Key · 新建/编辑表单 | 「至少一条限流规则」校验纳入 `batch_limits`，仅填批量限流可保存 | ✅ UI | ✅ `eslint` / `npm run build`；后端契约单测通过 |
| Entity · 新建/编辑表单 | 同上（EntityUpsert 为同一份校验逻辑的复制） | ✅ UI | ✅ `eslint` / `npm run build` |
| i18n（`apiKey` / `entity` 命名空间） | 校验提示补充「配置批量限流」 | ✅ UI | ✅ `eslint` |
| 原型 / 02 文档 / 手册 | 原型无该校验（不改）；02 文档与手册待补（见 §6） | ⬜ | — |

## 2. 接口变更（diff）

无。`RateLimitPolicy` 的字段与合法性条件未变，本次是让 UI 校验与既有契约对齐：

| 依据 | 内容 |
| ---- | ---- |
| `ai-gateway-api/lib/validate/validate.go:475-480` | `hasTpm` / `hasRpm` / `hasConcurrency` / `hasBatch` 四者任一成立即通过；`batch_limits` 单独配置合法 |
| `ai-gateway-api/lib/validate/validate_test.go:294-325` | `TestRateLimitPolicy_BatchLimits`：`BatchLimits: &shared.BatchLimits{}` 单独存在时断言 `NoError` |
| `ai-gateway-api/endpoints/openapi_v1/api_key/checker.go:44,81` | 创建 / 更新（含 PATCH）均调用 `validate.RateLimitPolicy`，issue 中的 curl 走同一校验 |
| `ai-gateway-api/test/integration/tests/api_key/batch_limits/batch_limits_test.go:41-88` | 集成用例以「只传 `batch_limits`」的 body 创建 API Key 并断言成功 |

## 3. 原型变更（无）

`prototype-design/assets/js/api-key-upsert.js` / `entity-upsert.js` 只做字段级校验（规则名、窗口、负数等），未实现「启用时至少一条规则」的表单级前置校验，因此不存在同样的拦截逻辑，也无需为本次修复补原型交互。原型状态记为「无需改动」。

## 4. UI 代码变更

| 文件 | 变更点 | 验收要点 |
| ---- | ---- | ---- |
| `src/modules/APIKey/components/Upsert.vue` | `validateRateLimitPolicy` 增加 `hasBatchLimits`（`:716-742`） | 仅填批量限流 + 最大并发「不限制」时可提交 |
| `src/modules/Entity/components/EntityUpsert.vue` | 同一校验逻辑同步补齐（`:666-687`） | Entity 表单同样可保存 |
| `src/i18n/zh.js` | `apiKey.rateLimitRuleRequired`（`:617`）、`entity.rateLimitRuleRequired`（`:787`）补充批量限流 | 提示与实际校验一致 |
| `src/i18n/en.js` | 同上（`:638`、`:835`） | 英文提示同步 |

```diff
@@ validateRateLimitPolicy / APIKey Upsert.vue
         const maxConcurrency =
           that.formData.rate_limit_policy.rules.max_concurrency;
+        const batchLimits =
+          that.formData.rate_limit_policy.rules.batch_limits || {};
         ...
+        const hasBatchLimits = BATCH_LIMIT_FIELDS.some(
+          (f) => Number(batchLimits[f.key]) > 0
+        );
-        if (!hasTpmRules && !hasRpmRules && !hasEffectiveMaxConcurrency) {
+        if (
+          !hasTpmRules &&
+          !hasRpmRules &&
+          !hasEffectiveMaxConcurrency &&
+          !hasBatchLimits
+        ) {
           callback(new Error(this.$t("apiKey.rateLimitRuleRequired")));
```

- **根因**：`validateRateLimitPolicy` 的「至少一条规则」判断只看 `tpm.length`、`rpm.length` 与 `max_concurrency` 的并发模式；批量限流虽已有完整输入、回显与提交组装（`collectBatchLimits`），但未被计入该判断。
- **触发条件**：`max_concurrency` 为 `-1` / 缺省（UI 回显为「不限制」）且 `tpm`、`rpm` 为空。issue 中的 API Key 由 OpenAPI 创建，`rules` 里只有 `batch_limits`，编辑打开后 `initFormData` 把 `max_concurrency` 补为 `-1`，提交即被拦截；新建时选择「不限制」并只填批量限流同样触发。
- **引入**：commit `1a26337`（2026-10-12「新增批处理任务与密钥收敛模块」）给两个表单各追加批量限流区块（`Upsert.vue` 该 commit 为纯新增 110 行），未同步更新既有的「至少一条规则」校验。
- **一致性核对**：`hasBatchLimits` 的判定口径与提交组装 `collectBatchLimits` 一致（仅统计 `> 0` 的维度）；全空时 `collectBatchLimits` 返回 `null`、不提交 `batch_limits`，此时仍要求 TPM/RPM/并发之一，与原行为一致。
- **验收要点**：① 编辑仅含 `batch_limits` 的 API Key，直接提交成功，请求体保留原有 `batch_limits`；② 仅填批量限流 + 并发「不限制」的新建场景可提交；③ 四项批量限流全空且无 TPM/RPM/并发时，仍提示「请添加 TPM/RPM 规则、配置批量限流，或将最大并发设为…」；④ Entity 表单行为一致。

## 5. 既有用例影响

UI 自动化位于独立仓库 `ai-gateway-web-test`（本仓库无组件/表单单测），本次同步补齐用例与自动化：

| 验证项 | 命令 | 结果 |
| ---- | ---- | ---- |
| 前端 Lint | `npx eslint src/modules/APIKey/components/Upsert.vue src/modules/Entity/components/EntityUpsert.vue src/i18n/zh.js src/i18n/en.js --quiet` | ✅ 通过 |
| 前端构建 | `npm run build`（Node 20.19.4） | ✅ 通过（仅资源体积告警；本机默认 Node 12 因 `css-minimizer-webpack-plugin` 的 `node:os` 报错，属环境版本问题） |
| 后端契约单测 | `go test ./lib/validate -run 'TestRateLimitPolicy' -v` | ✅ `TestRateLimitPolicy` / `TestRateLimitPolicy_BatchLimits` 通过 |
| 后端存储/导出单测 | `go test ./model/rate_limit_policy -run Batch -v` | ✅ 批量限流透传与导出用例通过 |
| 新增 UI 用例 EM-K-67 | `npx playwright test tests/api-key/test_03_api_key_rate_limit_fields.spec.js -g "EM-K-67"` | ✅ 通过（2026-10-20）：仅填批量限流 + 并发「不限制」创建成功，请求体断言 `tpm=[]`、`rpm=[]`、`max_concurrency=-1`、`batch_limits` 四维一致 |
| 新增 UI 用例 EM-E-62 | `npx playwright test tests/entity-management/test_03_entity_org_create_rate_limit.spec.js -g "EM-E-62"` | ✅ 通过（2026-10-20）：Entity 同场景创建成功，请求体断言同上 |
| 受影响既有用例 | EM-K-24、EM-K-44、EM-E-20 | ✅ 通过（2026-10-20 复跑）：四维全空且无 TPM/RPM/并发时仍被拦截，提示文案与新文案匹配 |

## 6. 下游影响

- 02 文档：已在 `ai-gateway-web-test` 补充 EM-K-67（API-Key）与 EM-E-62（Entity）「仅配置批量限流可保存」，并同步 EM-K-24 / EM-E-20 等既有用例的提示文案与字段校验矩阵。
- 测试：已新增 `ai-gateway-web-test/tests/api-key/test_03_api_key_rate_limit_fields.spec.js`（EM-K-67）与 `ai-gateway-web-test/tests/entity-management/test_03_entity_org_create_rate_limit.spec.js`（EM-E-62）自动化，页面对象新增 `fillApiKeyBatchLimitField(s)` / `fillEntityBatchLimitField(s)` 辅助方法；2026-10-20 单条复跑通过。
- 用户手册：若手册描述「启用限流必须配置 TPM/RPM 或并发」，需同步为「TPM/RPM/最大并发/批量限流四者其一」。
- 接口文档：`ai-gateway-api` 的 `00-common.md` §9 与前端本地副本 `design-docs/api-define/OpenAPI接口定义/00-common.md` §9 均已同步为四者至少其一（同批修正）。

## 7. 验收清单

- [x] 已在 `modifications/` 下创建本次变更目录。
- [x] 变更说明（本文件）已填写。
- [x] `design-docs/api-define/OpenAPI接口定义/00-common.md` §9 与 `object-relations.md` 的限流规则说明已同步（上游 `ai-gateway-api` 同批修正）。
- [x] `sys-design/各模块实现细节设计/APIKey管理.md`、`Entity管理.md` 的限流校验口径已同步。
- [x] 代码已实现并通过 `npm run lint`。
- [x] `npm run build` 通过。
- [x] UI 端到端验证：EM-K-67 / EM-E-62 新增用例通过，EM-K-24 / EM-K-44 / EM-E-20 复跑通过（2026-10-20）。
- [x] 02 文档：EM-K-67 / EM-E-62 及提示文案、字段校验矩阵、索引与自动化映射已同步。
- [ ] 用户手册补充。