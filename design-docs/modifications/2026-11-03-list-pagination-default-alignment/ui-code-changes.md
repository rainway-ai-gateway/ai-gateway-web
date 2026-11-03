# UI 代码变更：列表接口无参默认分页对齐（api issue #303 消费侧）

> **日期**: 2026-11-03 ｜ **前置**: [2026-11-03 缺价处置动作与报表缺价](../2026-11-03-price-miss-action-report-price-miss-and-quota-cap/ui-code-changes.md) ｜ **上游依据**: `ai-gateway-api` 拉取至 `1347d73`，含 `84bee7e fix(pagination): 列表接口无参时回填默认分页 1/20（issue #303）`、`8ad4d62 fix(rules): 规则集合整体替换并发冲突返回 409（#295）`、`c14bac7/db153ef fix(http): CORS 预检与 405 Allow（#298/#297）`；api-define 已按 e2e 工作流阶段 1.6 整体同步（`00-common.md` 拆出「默认值与截断（通用基线）」并登记 `/providers` 全量例外、分页非法值分严格/截断两类；`api-keys/entities/entity-types` pagination 说明同步）
> **对照接口**: `00-common.md`（通用分页基线）、`api-keys.md` §2.2（严格 422）、`entities.md` / `entity-types.md`（clamp）、`ai-cache-rules.md` / `ai-context-rules.md` / `traffic-mirror-rules.md`（集合整体替换 409）｜ **对照原型**: 无原型变更（纯请求参数补齐，无交互变化）
> **状态**: 原型 ⬜（无需改动）· UI 代码 ✅（lint 通过，已构建并同步 `ai-gateway-runtime/static/`；api 已重新编译部署并 curl 验证）· 02 文档 ⬜（影响评估见 §5，均为无处置）· 手册 ⬜ ｜ **菜单/路由变更**: 无

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 | 验证 |
| ----------- | -------- | ---- | ---- |
| Entity 列表 / Entity 类型列表（`EntityList.vue` / `EntityTypeList.vue`） | 列表主数据与类型筛选/下拉的 `GET entities` / `GET entity-types` 补 `page=1&page_size=100`（此前无参返回全量，#303 后仅 1/20） | ✅ UI | ✅ curl：无参→`page=1,page_size=20,total=5`；带参→生效值 |
| Entity 创建/编辑（`EntityUpsert.vue`） | 类型下拉 `GET entity-types` 补分页参数 | ✅ UI | 同上 |
| API Key 列表（`ApiKeyList.vue`） | 列表主数据 `GET api-keys` 补分页参数（该接口为严格 422 语义，100 为合法上限） | ✅ UI | ✅ curl：`/api-keys` 无参→`page=1,page_size=20,total=16` |
| 集群删除引用检测（`Clusters/index.vue`） | 属主标签映射的 `GET entities` / `GET api-keys` 补分页参数 | ✅ UI | 同上 |
| 路由表属主映射（`RouteTable/index.vue`） | `fetchEntityNames` 的 `GET entities` 补分页参数 | ✅ UI | 同上 |
| `/providers` 列表（`Providers/index.vue` 等） | **不改**：`providers.md` 登记例外「未传分页参数时返回全部记录、page_size=total、上限 1000」，#303 明确未动该 handler | ✅ 无需改动 | curl `/providers` 行为不变 |

## 2. 接口变更（diff）

api 侧行为变更（#303）：`/api-keys`、`/entities`、`/entity-types` 完全不传 `page`/`page_size` 时，由「返回全量 + `pagination.page=0/page_size=0`」改为「按 `page=1`、`page_size=20` 分页返回，响应回填生效值」；`pagination.total` 统一为**满足本次过滤条件的总条数**（api-keys 修掉了此前 total 只按 ProductName 统计的问题）；非法值语义按接口分两类（api-keys 严格 422；entities/entity-types clamp）。`/providers` 为例外保持全量。另规则集合整体替换（ai-cache / ai-context / traffic-mirror）并发冲突返回 409（`Conflict: collection is being replaced concurrently, retry later`）。

## 3. UI 代码变更（`src/`，已实施）

统一改法：上述 7 处「下拉/映射/无分页列表」调用补 `params: { page: 1, page_size: 100 }`（接口上限 100；api-keys 为严格语义，100 合法），并加注释标注 issue #303 背景。这些页面本就是无分页 UI（全量小表），拉满一页是最小修复；若未来数据量超 100，应改真分页（超出本变更范围）。

| 文件 | 调用点 |
| ---- | ---- |
| `src/modules/Entity/components/EntityList.vue` | `fetchEntityTypeList`（筛选下拉）+ 列表主数据 `GET entities` |
| `src/modules/Entity/components/EntityTypeList.vue` | `fetchData` 主数据 `GET entity-types` |
| `src/modules/Entity/components/EntityUpsert.vue` | `fetchEntityTypeList`（表单下拉） |
| `src/modules/APIKey/components/ApiKeyList.vue` | `fetchData` 主数据 `GET api-keys` |
| `src/modules/Clusters/index.vue` | 删除集群引用检测的 `GET entities` / `GET api-keys`（属主标签映射） |
| `src/modules/RouteTable/index.vue` | `fetchEntityNames`（属主映射） |

## 4. 不改动的部分及理由

- **`/providers` 相关调用**：登记例外，无参仍全量，行为不变。
- **规则集合 409**：UI 统一 `$request` 错误处理会把后端 `ErrMsg` toast 出来（消息本身含 retry later 指引），无专门交互；并发替换属极小概率，不新增重试逻辑。
- **CORS / 405 / Req-ID**：HTTP 层增强，UI 同源调用无感知。
- **其余列表接口**（clusters、route-tables、batches、model-prices、operation-logs 等）：#303 仅改三个 handler，这些接口无参行为不变（已核对代码变更范围）。

## 5. 既有用例影响（impact-scan：`分页 page_size 无参 entities entity-types api-keys`）

| 对象 | 影响 | 处置 |
| ---- | ---- | ---- |
| `tests/` 下 api-utils / pages 封装 | 测试不直连 `entities`/`entity-types`/`api-keys` 列表端点（grep 无命中）；UI 自动化经浏览器走修复后的带参请求 | **无处置** |
| 既有 UI 自动化用例的数据可见性 | 相关页面现最多展示 100 条/页；现有用例造数规模远小于 100，行可见性断言不受影响 | **无处置**（用例数据量超 100 时需改真分页，登记为后续事项） |
| 报表/集群等其它模块 | 接口无参行为未变 | **无处置** |

## 6. 验收清单

- [x] `GET /entities` 无参 → `page=1, page_size=20, total=满足过滤总条数`；`page_size=100` → 生效值（curl 实测）。
- [x] `GET /api-keys` 无参 → `page=1, page_size=20`（curl 实测）；`page_size=101` → 422（api 侧集成测试覆盖）。
- [x] `/providers` 无参 → 全量 + `page_size=total`（行为不变，未改 UI）。
- [x] UI 7 处调用补参后 lint 通过、构建部署完成。
- [x] api 重新编译部署（`1347d73` + 本地 bfe pin），8183 验证。
- [ ] 02 文档：无受影响用例（§5），无需新增；如后续相关页面改真分页再补用例。
