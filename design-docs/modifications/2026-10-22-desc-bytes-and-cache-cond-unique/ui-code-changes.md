# UI 代码变更：描述长度改按 UTF-8 字节判定 + AI 缓存规则 cond 集合内唯一

> **日期**: 2026-10-22 ｜ **前置**: [2026-10-20 批量限流校验修正](../2026-10-20-batch-limits-validation-fix/ui-code-changes.md) ｜ **上游依据**: api-define 同步（api 仓库 `5fb471d`：`42c50c5` 内联 `batch_limits` 契约补齐、`#244` 描述长度改字节口径、`#258`/`#261` ai-cache-rules）
> **对照接口**: `certificates.md` / `clusters.md` / `entities.md` / `entity-types.md` / `ai-cache-rules.md` / `api-keys.md` ｜ **对照原型**: `prototype-design/pages/{api-key.html, ai-cache.html}`、`assets/js/{api-key-upsert.js, entity-upsert.js, cluster-upsert.js, mock-data.js}`
> **状态**: 原型 ✅ · UI 代码 ✅ · 02 文档 ✅ · 测试 ✅ · 手册 ✅ ｜ **菜单/路由变更**: 无

后端已把四处 `description` 的长度判定从「字符」改为「UTF-8 字节」，实测 200 个汉字（200 字符 / 600 字节）在集群、Entity、Entity 类型上均返回 `422 Param Illegal: description length must be <= 256/255`，而现 UI 按 `String.length` 判定会放行并提交——本次把这四处判定与文案改为字节口径，并给 AI 缓存规则补 `cond` 集合内唯一的前端拦截（后端已 422 且拒绝后集合零变更）。同时收口 Entity 类型描述上限（1024 → 255 字节）并接通原型中 API-Key / Entity 批量限流的死代码。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 证书管理 | 描述校验由 2-256 字符改为 2-256 字节 | ⬜ |
| AI 业务集群（基础配置） | 集群描述校验由 0-256 字符改为 0-256 字节 | ⬜ |
| Entity 管理 | Entity 描述校验改为 0-255 字节；补 `entity.batchLimitsTip` 提示行 | ⬜ |
| Entity 类型 | 描述上限由 1024 收口为 0-255 字节，并补控制字符校验 | ⬜ |
| AI 缓存规则 | 新增/编辑规则时校验 `cond` 集合内唯一（编辑排除自身） | ⬜ |
| 原型 · API-Key / Entity | 接通批量限流死代码：提交组装、查看抽屉展示、输入绑定与提交前校验 | ⬜ |

## 2. 接口变更（diff）

- `certificates.md` §1 / §2.1 → `description`：变更前「2-256 字符」→ 变更后「2-256 字节（按 UTF-8 字节计）」。必填与控制字符约束不变。
- `clusters.md` §1 / §2.1 / §2.2 → `description`：「0-256 字符」→「0-256 字节」。
- `entities.md` §1 / §2.1 / §2.2 / §2.3 → `description`：「0-255 字符」→「0-255 字节」。
- `entity-types.md` §1 / §2.1 / §2.2 → `description`：「0-255 字符」→「0-255 字节」；§2.2（PATCH）原为空白，本次补齐与 §1 同口径的长度与控制字符说明（**该端点此前 UI 侧无任何校验，本次一并按 255 字节收口**）。
- `ai-cache-rules.md` §1 / §3 → 新增「同一集合内 `rules[].cond` 不得重复（逐字节比较），重复即 422 且集合不变」；响应说明「校验 `rules` 中规则 `name` 与 `cond` 是否重复（均集合内唯一）」，由「仅名称唯一」改为名称与条件双唯一。
- `api-keys.md` §2.1 / `entities.md` §2.x → 补内联 `rate_limit_policy.rules.batch_limits` 的生效口径与示例（**UI 已实现，本次无代码变更**，仅作为 Entity 提示行的依据）。

## 3. 原型变更

- `prototype-design/pages/ai-cache.html`（本地保存 / 提交前查重，约 :587-591）：只按 `name` 查重 → 增加 `cond` 逐字节查重（编辑排除自身），命中提示「生效条件已存在，集合内必须唯一」且不入集合。
- `prototype-design/assets/js/api-key-upsert.js`：`bindBatchLimitInputs` / `validateBatchLimitsForm` / `collectBatchLimits` / `renderBatchLimitsDetail`（:110-183）此前**无调用点** → 渲染后绑定输入、提交前校验、提交体组装 `batch_limits`、查看抽屉展示批量限流；查看抽屉（:1440-1446）由仅 TPM/RPM → 追加批量限流明细。
- `prototype-design/pages/api-key.html`（提交路径，约 :297）：仅配额校验 → 追加 `validateBatchLimitsForm` 调用。
- `prototype-design/assets/js/entity-upsert.js`：查看抽屉（:479-486）追加批量限流明细；Entity 描述校验（:57-63）由 `length > 255` 字符 → 255 字节；Entity 类型描述（:539）`maxlength=1024` → 255 字节并补控制字符校验。
- `prototype-design/assets/js/cluster-upsert.js`（描述校验，:36-42）：`length > 256` 字符 → 256 字节 + 控制字符。
- `prototype-design/assets/js/mock-data.js`（:478-501）：AI 缓存三条 mock 规则移除已废弃的 `created_at` / `updated_at`。
- 证书：原型无证书页面，描述校验改动只落在 `src/`。

## 4. UI 代码变更

- `src/utils/const.js`：新增导出 `utf8ByteLength(value)`（`TextEncoder` 计 UTF-8 字节）；`CertDescriptionRegCheck` 由 `value.length` 2-256 改为字节数 2-256。验收：256 字节 ASCII 通过；200 汉字（600 字节）拦截。
- `src/modules/Cert/components/Create.vue`（:125-137）：沿用 `CertDescriptionRegCheck`，错误文案改用新的字节口径文案。
- `src/modules/Clusters/components/BaseConfig.vue`（:200-212）：`value.length > 256` → `utf8ByteLength(value) > 256`。验收：与后端 `PATCH /clusters/{name}` 的 422 边界一致。
- `src/modules/Entity/components/EntityUpsert.vue`：描述校验（:602-618）改字节数 0-255（保留模板 `maxlength=255` 按字符截断，超长多字节输入由校验拦截）；批量限流区段（:521 前）补 `entity.batchLimitsTip` 提示行（key 已存在，此前未被引用）。
- `src/modules/Entity/components/EntityTypeUpsert.vue`：`maxlength` / 校验上限（:40、:88-90）由 1024 改为 255 字节，改自定义 validator 补控制字符校验，补 `typeDescriptionTip` 提示行，错误文案由 `apiKey.descriptionLengthError`（"512 字符"）改为 Entity 类型专属的字节口径文案。
- `src/modules/AICache/index.vue`（本地保存 :633-642、提交并生效 :657-663）：在既有 `name` 查重旁增加 `cond` 逐字节查重（编辑排除自身），命中提示重复且不入集合。
- `src/i18n/zh.js` / `src/i18n/en.js`：集群（zh :482 / en :503）、Entity（zh :738 / en :772）、证书（zh :1199 / en :1289）共 6 处文案「字符 / characters」→「字节 / bytes」，另新增 Entity 类型 3 个 key 与 AI 缓存 `tipCondDuplicate`（zh/en 同步）。`apiKey.descriptionLengthError`（512 字符）属 API-Key 口径，不在本次范围，未改。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| `AC-C-02`（`tests/ai-cache/test_02_ai_cache_upsert.spec.js:83`） | 已微调（造数工具） | 根因是共享造数 `buildTestRule` 的默认 `cond` 固定为 `req_path_in("/v1/chat/completions", false)`，与 mock 集合内规则或环境既有 `demo-cache-last-question` 相同。已把默认 `cond` 改为按规则名唯一：`req_header_value_in("x-test-rule", "<name>", false)`（`api/ai-cache-api-utils.js:163-175`），用例断言不变 |
| `AC-L-13`（`test_01_ai_cache_list.spec.js:454`） | 已微调 | 走真实集合，`demo-cache-last-question` 已占该 `cond`，本地保存被拦；新增规则改用 `default_t()`，PUT 顺序/无时间戳断言不变 |
| `AC-L-14`（`test_01_ai_cache_list.spec.js:495`） | 已微调 | 同上，`cond` 改为 `default_t()` |
| `AC-L-15`（`test_01:521`）及其它经 `ensureAiCacheRuleExistsViaApi` 造数的用例（`AC-C-13`、`AC-C-17`、`AC-DEL-05`） | 无断言改动 | 首轮失败均源于造数 422（`duplicate ai cache rule cond`），随 `buildTestRule` 默认 `cond` 唯一化恢复，断言本身未变 |
| `AC-C-16`（`test_02:621`）、`AC-V-13`（`test_04:587`） | 已微调 | 同一集合内新增多条规则时共用 `default_t()`，被 `cond` 唯一校验拦截；改为逐条使用 `req_header_value_in("x-test-rule", "<规则名>", false)` 后通过，断言（语义缓存布尔值 / 请求体归一化）不变 |
| `AC-V-11`（`tests/ai-cache/test_04_ai_cache_validation.spec.js:516`） | 已微调 | 提交后 GET 断言 `created_at`/`updated_at` 存在 → 改为 `toBeUndefined()`，标题同步为「响应不返回逐规则时间」 |
| `AC-DEL-04`（`tests/ai-cache/test_03_ai_cache_view_delete.spec.js:590`） | 已微调 | 循环断言每条规则带时间戳 → 改为断言 `toBeUndefined()`，标题同步 |
| `AC-C-06`（`test_02:263-293`） | 无影响 | 编辑语义排除自身，且 mock 集合只有一条规则 |
| `tests/entity-management/test_10_entity_description.spec.js:216-245` | 无影响（已通过） | 断言 `maxlength=255` 截断与 255 字符提交成功，均为 ASCII；保留模板 `maxlength`，只把校验改为字节口径 |
| `RM-BC-39`（`tests/cluster/test_05_business_cluster_field_validation.spec.js:103`） | 已微调 | 断言文案常量改为「集群描述不能超过256字节（按 UTF-8 字节计）」（`pages/resource/ResourcePageCommon.js:68`），并补 200 汉字（600 字节）与控制字符两个负向步骤、256 字节 ASCII 上界通过步骤 |
| `tests/api-key/test_01_api_key_create.spec.js:715` | 无影响 | API-Key 描述仍为 512 字符口径（`api-keys.md` 未变），不在本次范围 |
| 证书描述用例 | 无影响 | `tests/cert/**` 当前被 `playwright.config.js` 的 `testIgnore` 排除（证书菜单 2026-09-11 已移除）；`CM-C-04` 的 spec 属跳过态 |

## 6. 下游影响（阶段 3/4/5 输入）

- 02 文档（阶段 3 已完成，21 个文件 / 5 个模块；**原则：只改既有用例，未新增用例编号**）：`entity-management`（`EM-DESC-03` 改为「描述字节长度与控制字符校验」）、`entity-type`（`EM-T-02` 创建 / `EM-T-10` 编辑补 255 字节 + 控制字符 + `maxlength` 与提示行）、`ai-cache`（`AC-C-09`/`AC-C-10` 名称与生效条件双查重、`AC-L-15` 提交前双查重、`AC-V-03` 名称与条件集合内唯一；`AC-C-13`、`AC-V-11`、`AC-DEL-04` 按「无逐规则时间戳」改写）、`cert-management`（`CM-C-04` 改为「描述必填与长度/字符校验（2-256 字节）」）、`business-cluster`（`RM-BC-39` 改为 0-256 字节 + 控制字符边界）。各模块 01 均已在「核心变更依据」追加本轮链接，统计与编号区间恢复原值。
- 测试（阶段 4，已完成首轮执行）：**不新增 spec 文件**，在既有 spec 内补/改断言——
  - 造数工具：`api/ai-cache-api-utils.js` 的 `buildTestRule` 默认 `cond` 由固定串改为按规则名唯一（`req_header_value_in("x-test-rule", "<name>", false)`），修复多处「造数 422 duplicate ai cache rule cond」的连带失败。
  - 已改断言：`test_01_ai_cache_list.spec.js`（AC-L-13 / AC-L-14 换用 `default_t()`）、`test_02_ai_cache_upsert.spec.js`（AC-C-16 第二条规则换唯一 `cond`）、`test_04_ai_cache_validation.spec.js`（AC-V-11 改「不含时间戳」；AC-V-13 规则二/三换唯一 `cond`）、`test_03_ai_cache_view_delete.spec.js`（AC-DEL-04 改「不含时间戳」）、`tests/cluster/test_05_business_cluster_field_validation.spec.js`（RM-BC-39 文案常量 + 200 汉字/控制字符/256 字节上界；常量在 `pages/resource/ResourcePageCommon.js`）。
  - 未新增断言（文档已覆盖、本轮按「只改既有用例」不扩）：AC-C-09/AC-C-10/AC-L-15/AC-V-03 的 `cond` 查重步骤待后续补断言时直接在既有 spec 内扩展。

## 7. 验收结果（2026-10-22）

- 环境：后端二进制 `5fb471d`（8183，PID 97318）；控制台 dev server 8180，产物已含本次改动（可检索到 `TextEncoder`、`生效条件已存在`）。
- 首轮：8 个受影响 spec **75 通过 / 12 失败**。失败归因：造数 `cond` 冲突（7 条）、时间戳断言过期（2 条）、集群文案过期（1 条）、同集合多条规则共用 `default_t()`（2 条）。
- 修复后复跑：ai-cache 4 个 spec + cluster `test_05` **67 通过 / 2 失败**；定向复跑 `AC-C-16`、`AC-V-13` **2/2 通过**。
- 剩余：无失败用例；`entity-management/test_10`、`entity-type/test_01`、`test_02` 首轮即通过。
- 用户手册（阶段 5 已完成）：`03-ai-business-cluster.md:58`（集群说明 0-256 字节）、`15-entity.md:63`（Entity 描述 0-255 字节）、`14-entity-type.md:34`（类型描述 255 字节 + 控制字符 + 常显提示）、`08-ai-cache-rules.md`（:67 提交前名称与表达式双查重、:85 表达式行补集合内唯一、:106 本地保存拦截说明、:203 注意事项改写）、`20-appendix.md`（补「生效条件已存在」覆盖 AI 缓存规则 + 新增描述字节上限错误行）；另 `13-batch-tasks.md:119` 更新 `purpose`（由任务方向映射）与 `filename`（缺失显示 `-`）口径。**无菜单/章节增删，故未重编号**；`docs/zh-cn/site/` 已重建，`build-manual-site.js` 与 `verify-manual-site.js` 均 **0 问题**（顺带修正 `deploy.md` 指向站点外 `branding/README.md` 的失效链接，并让 verify 脚本对代码块内的 `.js` 文本免误报）。截图未重拍：字段与布局未变，仅校验文案变化。`05-model-provider.md:63` 保持「256 字符」——Provider 描述口径未变（`providers.md` 未在本次 diff 内）。