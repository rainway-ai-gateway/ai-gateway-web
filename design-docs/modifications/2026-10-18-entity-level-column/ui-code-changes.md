# UI 代码变更：Entity 组织列表新增「级别（level）」列与筛选

> **日期**: 2026-10-18 ｜ **前置**: 无（独立需求，对应 `rainway-ai-gateway/ai-gateway-web` issue #123）｜ **上游依据**: `entities.md`（Entity 无 `level` 字段，级别由所属 Entity-Type 的 `level` 决定：`parent_id` 约束「父 Entity 对应 Entity-Type 的 level 必须小于本 Entity」）+ `entity-types.md`（`level` 取值 1-5，数字越小级别越高）
> **对照接口**: `entities.md`（`GET /entities` 的 `type` 字段）、`entity-types.md`（`GET /entity-types` 的 `type_name` / `level` 字段）｜ **对照原型**: `prototype-design/pages/entity.html`
> **状态**: 原型 ✅ · UI 代码 ✅ · 02 文档 ⬜（用例待补）· 测试 ⬜（Playwright 用例待补，测试环境未运行）· 手册 ✅（含离线站点 `docs/zh-cn/site/15-entity.html` 重新生成） ｜ **菜单/路由变更**: 无

issue #123：「在 entity 列表中，应该增加 级别（level）的显示和查询能力」。原列表中 Entity 的级别**无处可见**——级别只存在于 Entity 类型（`/entity-types` 的 `level`，1-5，数字越小级别越高），而 Entity 行只显示 `type`（类型名），用户无法判断某个组织的层级，也无法按级别筛选。本次在 **Entity 组织管理** 列表新增「级别」列（显示 + 下拉筛选 + 排序）。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 | 验证 |
| ----------- | -------- | ---- | ---- |
| Entity 组织管理 · 列表（`EntityList.vue`） | 新增「级别」列（`key: 'level'`），值取该行 `type` 在 Entity-Type 列表中的 `level`；`type` 已不存在时显示 `-` | ✅ UI | ✅ 浏览器实测（`1/2/3/4/-`，见 §7） |
| Entity 组织管理 · 列表筛选行 | 新增「级别」下拉筛选（选项 `1`-`5`，与「Entity 类型管理」的级别筛选一致），清空后列表恢复全量 | ✅ UI | ✅ 浏览器实测（选 `3` 仅剩 1 行，清空恢复 5 行，见 §7） |
| Entity 组织管理 · 列表排序 | 「级别」列可排序（复用 `pageTable` 客户端比较，数字按数值比较，级别缺失行排在最后） | ✅ UI | ✅ 浏览器实测（降序 `4,3,2,1,-`，见 §7） |
| 原型 / 02 文档 / Playwright 用例 | 原型已同步；02 文档与 Playwright 用例待补（见 §6） | ⬜ | — |

## 2. 接口变更（diff）

**无**。后端零改动、不新增端点 / 字段 / 参数：

- `GET /entities` 的返回体（`EntityParam`）**不含** `level`，Entity 的级别语义来自其 `type` 指向的 Entity-Type，因此前端用**已有的** `GET /entity-types` 结果做 `type → level` 映射（与该模块既有做法一致：`EntityUpsert.vue` 的「父Entity」下拉即用 `entity-types` 的 `level` 过滤可选父级）。
- 列表为**纯客户端**筛选与排序（`pageTable` 未启用 `serverPagination`，`GET /entities` 不带分页参数），故「查询能力」由前端列筛选实现，无需后端支持按 level 过滤的参数。

## 3. 原型变更

`prototype-design/pages/entity.html`：组织列表新增「级别」列（列定义、`enrichEntityRows` 按 `type` 反查 `MockData.entityTypes` 的 `level`、`filterEntityRows` 的 `level` 分支、搜索状态新增 `level: ''`、下拉筛选 `1`-`5`），与「Entity 类型管理」中已有的级别列写法保持一致。

## 4. UI 代码变更（`src/`，已实施）

| 文件 | 变更点 | 验收要点 |
| ---- | ---- | ---- |
| `src/modules/Entity/components/EntityList.vue` | ① `columns` 在「名称」之后、「描述」之前插入「级别」列（约 `:104-121`）：`title: $t('entity.level')`、`key: 'level'`、`minWidth: 100`、`sortable: 'custom'`、`searchable: true`、`searchType: 'select'` + `searchFilters`（`1`-`5`）、`render` 对空值显示 `-` | 列位于「名称」「描述」之间；表头文案跟随语言（`级别` / `Level`）；筛选行出现「请选择级别」下拉 |
| 同上 | ② `data` 新增 `entityTypeList: []`（约 `:266`） | — |
| 同上 | ③ `fetchData()` 改为 `Promise.all([fetchEntityTypeList(), GET entities])`，行数据新增 `level: this.getEntityLevel(item.type)`（约 `:409-439`） | 列表首屏即带级别；`type` 不存在时级别为 `undefined`，渲染为 `-`；`res` 为空（网络异常）时不再抛错 |
| 同上 | ④ 新增 `fetchEntityTypeList()`（`GET /entity-types`，失败时置空数组）与 `getEntityLevel(typeName)`（按 `type_name` 精确匹配取 `level`）（约 `:441-462`） | 接口失败时列表仍能渲染，级别列显示 `-` |

i18n 未新增键：复用既有的 `entity.level`（`zh.js` = `级别`、`en.js` = `Level`）；筛选下拉的占位文案由 `pageTable` 的 `com.tipSelectX` 生成（「请选择级别」/「Please select Level」）。

**列位置说明**：issue 截图中的红框位于「名称」与「类型」两列之间（该版本列表无「描述」列，其搜索行只有 ID / 名称 / 类型 / 父Entity / 配额 / 限流状态 6 个筛选项），故本次把「级别」放在**名称之后**，即 issue 所指位置（当前代码该位置之后是「描述」列）。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| `ai-gateway-web-test` 的 entity-management 用例 | 无需改动（预期） | 搜索框定位按 **placeholder 文案**（`ENTITY_SEARCH_PLACEHOLDER_*`）而非下标，新增列不改变既有列的定位；新增的「级别」下拉占位文案「请选择级别」与其他列不重复。**未实跑**：该仓库要求 `conf.json` 的 `ctlHost`（`localhost:8180`）与 `apiHost`（`127.0.0.1:8183`）在运行，本次执行时两者均未监听（见 §7 环境说明） |

## 6. 下游影响（阶段 3/4/5 输入）

- **02 文档**：`ai-gateway-web-test/docs/entity-management/02-功能测试用例/01-列表与CRUD.md`（列表列清单）与 `06-PageTable组件交互.md`（筛选交互）建议补「级别列 + 级别筛选」条目，并同步 `00-索引与映射.md` 的用例编号映射——**待补**。
- **测试**：建议补 1 条 Playwright 用例（列表级别列与 `GET /entity-types` 的 `level` 一致 + 选级别筛选后行数收敛 + 清空恢复），落 `tests/entity-management/`——**待补**（测试环境未运行，见 §7）。
- **用户手册**：`docs/zh-cn/15-entity.md` §15.1 表格列说明新增「级别」行，并在同节说明级别来源与筛选；孪生页面由 `node docs/scripts/build-manual-site.js` 重新生成（仅 `site/15-entity.html` 变化）——**已同步**。
- **系统设计**：`design-docs/sys-design/各模块实现细节设计/Entity管理.md` §3.1 列清单与 §接口映射补记——**已同步**。

## 7. 验收与偏差

- **实机（生产构建 + 真实 HTTP 调用）**：以 `npm run build` 产物 + 桩接口（`GET /entity-types` 返回 `company=1 / department=2 / team=3 / personal=4`；`GET /entities` 返回 5 条组织，其中 1 条 `type = ghost` 不在类型表中）实测：
  - 表头顺序 `ID | 名称 | 级别 | 描述 | 类型 | 父Entity | 配额 | 限流状态 | 操作`（英文界面 `ID | Name | Level | Description | ...`），级别值逐行等于其类型级别：`1 / 2 / 3 / 4`，`type` 缺失行为 `-`
  - 筛选行出现「请选择级别」下拉（选项 `1`-`5`）；选 `3` 后列表仅剩类型级别为 3 的行（`ent-003 team-a`），清空后 5 行全部恢复
  - 点「级别」表头降序：`4, 3, 2, 1, -`（级别缺失行排最后）
  - 网络面板：进入页面同时发出 `GET /entity-types` 与 `GET /entities`（`Promise.all` 生效）
- **原型**：`prototype-design/pages/entity.html` 本地起静态服务实测：组织列表出现「级别」列（`dep` → `1`、`team` → `2`），选「级别 = 1」后仅剩 `rd-dept`。
- **手册站点**：`node docs/scripts/verify-manual-site.js` 通过（内部链接 753、图片 94、问题 0）；`node docs/scripts/build-manual-site.js` 重跑后 `docs/zh-cn/site/` 仅有 `15-entity.html` 变化，其余页面零差异。
- **工程**：`npx eslint src/modules/Entity/components/EntityList.vue` 通过；`npm run build` 通过（webpack 5.105.4，仅 asset size 警告，无错误）
  - **环境注意**：本机默认 `node -v` = `v12.22.12`，直接 `npm run build` 会以 `Cannot find module 'node:os'`（`css-minimizer-webpack-plugin`）失败；`v18.20.8` 则以 `crypto is not defined`（`serialize-javascript`）失败。构建需 **Node ≥ 20**（本次用 `v20.19.4` 成功）。此为本机环境问题，与本次改动无关，未改动任何构建配置。
- **未验证项**：`ai-gateway-web-test` 的 Playwright 回归（环境 8180 / 8183 未运行）；Entity 详情抽屉未加级别字段——issue 仅要求列表，未纳入本次范围。