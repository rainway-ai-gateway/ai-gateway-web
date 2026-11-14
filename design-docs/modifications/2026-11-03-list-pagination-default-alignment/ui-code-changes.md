# UI 代码变更：列表接口分页对齐——/api-keys 真分页 + 下拉/映射按需全量（最终态）

> **日期**: 2026-11-03（2026-11-04 按 api #306 终局回退 entities/entity-types 相关改动）｜ **前置**: [2026-11-03 缺价处置动作](../2026-11-03-price-miss-action-report-price-miss-and-quota-cap/ui-code-changes.md) ｜ **上游依据**: `ai-gateway-api` 最终对齐版本 `71e2513`，关键提交：`84bee7e #303`（api-keys/entities/entity-types 无参回填 1/20）、**`03fdba4 #306`（/entities 与 /entity-types 无参恢复返回完整列表——登记例外）**、`8ad4d62 #295`（规则集合替换并发 409）；api-define 已按 e2e 工作流阶段 1.6 整体同步
> **对照接口**: `00-common.md`（通用分页基线 + 登记例外清单：providers、entities、entity-types 无参全量）、`api-keys.md` §2.2（严格 422，**无参仍 1/20 分页**）、`route-tables.md`（分页接口，handler 尚无 #303 式改造，无参全量为隐式契约）｜ **对照原型**: 无原型变更
> **状态**: 原型 ⬜（无需改动）· UI 代码 ✅（lint 通过，构建部署）· 02 文档 ⬜（无受影响用例）· 手册 ⬜ ｜ **菜单/路由变更**: 无

## 1. 变更总览（最终态）

| 页面 / 模块 | 最终处理 | 理由 |
| ----------- | -------- | ---- |
| API Key 列表（`ApiKeyList.vue`） | **服务端真分页**（pageTable server-pagination） | `/api-keys` 无参仍只给 20 条（#303 未恢复），必须分页 |
| 集群删除引用检测（`Clusters/index.vue`） | **整段移除**（2026-11-04 用户决策）：删除集群不再做前端引用预检/失败后的 route-tables 全表扫描与引用弹窗，删除失败直接 toast 后端返回的错误消息 | 后端删除路径自带引用校验（`RouteRuleManager.ClusterDeleteChecker` / `RouteRulesManager.ClusterDeleteChecker`，冲突返回 409 + 规则名），如 `Rule %s Refer To This Cluster`；前端扫描属重复实现且依赖无参全量（实测 `/route-tables` 无参只回 20 条） |
| Entity 列表 / Entity 类型列表 / EntityUpsert / RouteTable | **全部回退**为 #303 之前的原始无参调用（2026-11-04 用户决策） | `/entities`、`/entity-types` 无参已恢复全量，无需循环拉全 |
| `/providers` 相关调用 | **不改** | 登记例外，无参全量 |

> **过程记录**：#303 后首版曾对 entities/entity-types 的 5 处调用改 `fetchAllList` 循环拉全 + 三个列表页真分页；api #306 恢复这两个接口的无参全量后按契约对齐原则回退（恢复至 `10b1acb`）；引用检测经「修复→回退」后按用户决策整段移除（后端自带 409 校验）；APIKey Upsert 关联 Entity 下拉随之回退无参直取。终局仅保留 `ApiKeyList` 真分页一处实质改动。

## 2. 接口行为基线（最终以 #303 + #306 为准）

| 接口 | 无参行为 | 显式分页 |
|------|---------|---------|
| `/entities`、`/entity-types` | **返回全量**，`page=1, page_size=total`（#306 恢复，登记例外） | 分页 + clamp（page_size>100→100） |
| `/api-keys` | `page=1, page_size=20` 首页（#303，未恢复） | 严格语义，page_size>100 → 422 |
| `/providers` | 全量（登记例外，未变） | page_size 上限 1000 |
| `/route-tables` | **默认 1/20 首页**（handler 无条件回填并下推分页，`endpoints.go:52-64`；curl 实测：22 张表无参只回 20） | 分页 + clamp（page_size>100→100） |

## 3. UI 代码变更（`src/`，最终态）

- **真分页（1 处）**：`ApiKeyList.vue` 的 `pageTable` 开启 `server-pagination`（`:total` / `:current-page` / `:page-size` / `@on-page-change`，范式同 OperationLogs），`fetchData` 按服务端分页拉取，`total` 取 `pagination.total`。列搜索/排序为 pageTable 客户端口径，仅作用于当前页（使用率低，暂不改造）。
- **（已删）fetchAllList**：曾新增 `src/utils/paged-list.js` 循环拉全工具（api-keys 映射、route-tables 扫描、APIKey Upsert 关联 Entity 下拉三处消费）；2026-11-04 终局——引用检测整段移除（见变更总览）、`/entities` 已被 #306 恢复无参全量（APIKey Upsert 关联 Entity 下拉回退无参直取），**工具与全部消费一并清除，未进入最终代码**。
- **回退（5 处，恢复至 `10b1acb` 原始代码）**：`EntityUpsert.fetchEntityTypeList`、`EntityList`（列表主数据 + 类型筛选下拉 + entity-list prop + 父级列名）、`EntityTypeList.fetchData`、`RouteTable.fetchEntityNames`、`Clusters` 的 entities 属主映射。

## 4. 不改动的部分及理由

- **`/providers` 相关调用**：登记例外，无参仍全量。
- **RouteTable 主列表 / model-prices / operation-logs / security**：本就带参分页，无影响（model-prices provider 下拉 `page_size=1000` 合法，该接口上限 1000）。
- **规则集合 409**（#295）：统一 `$request` 错误处理 toast 后端消息（含 retry later 指引），不新增重试逻辑。
- **CORS / 405 / Req-ID**（#297/#298）：HTTP 层增强，UI 同源无感知。
- **其余无参调用**（clusters、batches、certificates、各规则集合、epp-pool、k8s_pools 等）：接口无分页结构，返回全量是契约内行为。

## 5. 既有用例影响

| 对象 | 影响 | 处置 |
| ---- | ---- | ---- |
| `tests/` 下 api-utils / pages 封装 | 测试不直连这些列表端点（grep 无命中） | 无处置 |
| 既有 UI 自动化用例 | 回退后各页面行为与 #303 之前一致；ApiKeyList 改分页但现有用例造数规模 <20 | 无处置 |
| 报表/集群等其它模块 | 接口行为未变或已适配 | 无处置 |

## 6. 验收清单

- [x] api 行为 curl 实测（部署版本 `71e2513`）：`/entities`、`/entity-types` 无参全量；`/api-keys` 无参 1/20。
- [x] ApiKeyList 真分页 lint 通过、构建部署；`paged-list.js` 已随全部消费清除。
- [x] 回退的 5 处与 `10b1acb` 逐字节一致（`git checkout 10b1acb --`）。
- [ ] 浏览器复验（提交前）：API Key 列表分页、删除集群引用弹窗（route-tables 扫描路径）。
- [ ] 02 文档：无受影响用例；如后续补 ApiKeyList 分页交互用例再登记。
