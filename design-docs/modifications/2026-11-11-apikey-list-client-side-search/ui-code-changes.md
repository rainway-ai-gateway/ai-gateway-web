# UI 代码变更：API-Key 列表的搜索 / 筛选 / 排序改为「只作用于当前页」

> **日期**: 2026-11-11 ｜ **上游依据**: API-Key 列表自 `51778a6` 起改为服务端分页（`server-pagination`），`pageTable` 的列搜索/列排序只 `$emit('on-search-change')` / `'on-sort-change'`，而 `ApiKeyList` 未监听 → 列搜索变成了空操作（issue #139 复核时发现的 6 个用例失败：EM-K-15d、EM-K-68、PT-01/02/03/05）｜ **对照接口**: 后端 `GET /api-keys` 仅支持 `page` / `page_size` / `enabled` / `entity_id` / `unlimited_quota`，不支持通用筛选与排序参数 ｜ **产品口径**: 列表搜索/筛选/排序**只作用于服务端返回的当前页**，不新增后端筛选能力
> **对照原型**: 无结构变更
> **状态**: 原型 N/A · UI 代码 ✅（eslint + 构建 + 相关用例）· 02 文档 N/A（无字段/结构变化）· 手册 ⬜ ｜ **菜单/路由变更**: 无

## 1. 变更总览

| 文件 | 变更要点 | 验证 |
| ---- | -------- | ---- |
| `src/components/table/pageTable.vue` | 新增 prop `clientFilter`（默认 `false`）：`serverPagination && !clientFilter` 时保持原「只派发事件、不本地过滤」的行为；开启后列搜索/筛选在本地完成 | EM-K-15d / EM-K-68 / PT-05 |
| 同上 | 过滤逻辑从 `searchTable` 抽出为 `applyLocalFilter()`，供搜索、数据刷新、新增/编辑/删除后复用；`serverPagination` 时不重置页码（页码由父组件控制） | PT-01~PT-05 |
| 同上 | `tableData` watcher 在 `serverPagination + clientFilter` 时**不再清空搜索条件**，改为对新到的当页数据重新执行 `applyLocalFilter()`：翻页/刷新后筛选继续生效 | EM-K-68 |
| 同上 | 新增公开方法 `clearSearchConditions()`：清空每个可搜索列的 `searchValue`、`searchMessage`、`filterMessage` 并重算展示数据 | PT-01/02/03 |
| `src/modules/APIKey/components/ApiKeyList.vue` | pageTable 上开启 `client-filter`；新增 `resetTableSearch()`，在新增/编辑/删除成功后（`fetchData()` 之前）清空列搜索条件 | PT-01/02/03 |

## 2. 接口变更（diff）

无。本次纯前端交互口径调整，请求参数仍只有 `page` / `page_size`。

## 3. 规则细节与取舍

- **只搜当前页，而不是"假筛选"**：后端不支持筛选参数，此前列表在服务端分页后搜索变成"点了没反应"。本次明确按「当前页内过滤」实现，并且是真实生效的过滤（`applyLocalFilter()` 与原先前端分页时代的匹配规则完全一致：布尔列等值、普通列子串、带 `render` 的列同时比对渲染文案子串与原始值等值）。
- **翻页保留筛选条件**：`51778a6` 之后翻页是重新请求，`tableData` 变化会触发 watcher。旧代码在 watcher 里清空搜索条件（原本是给前端分页时代"数据整体刷新"用的），导致翻到第 2 页筛选就丢了。现在 `clientFilter` 路径下保留条件并对新当页数据重新过滤——即"筛选跟着人走，作用域永远是当前页"。
- **不做服务端筛选**：`filters` 仍只在 `serverPagination && !clientFilter` 的列表（如路由表）里通过 `on-search-change` 派发，其它列表口径不变，避免把"只搜当页"静默扩散到别的模块。
- **增删改后清空筛选**：产品期望"操作完看到新数据"，避免新建的键被上一次的筛选条件挡住（PT-01/02/03 即在断言这一点）。清空动作放在父组件 mutation 成功的回调里，`pageTable` 只暴露 `clearSearchConditions()`，不主动感知业务语义。
- **页码不重置**：服务端分页下页码由父组件 `page`/`pageSize` 控制，本地过滤时重置 `currentPage` 会造成"显示页码 1、数据还是第 N 页"的不一致（PT-04 的检测点）。刷新后仍停留在当前页，符合服务端分页语义。

## 4. 既有用例影响

`ai-gateway-web-test` 已同步：

- `tests/entity-management/test_07_page_table_interaction.spec.js`：PT-05 依赖"跨页搜索"找到刚创建的 3 条造数，改为**先补齐到页边界（`PAGE_SIZE=20`）再翻到最后一页过滤**——3 条造数正好是最后一页的前 3 行，排序断言（升/降序、嵌套字段）不受影响；
- `pages/entity/EntityPage.js`：透出 `fetchAllApiKeysViaApi`，供上述补位逻辑读取当前 API-Key 总数。

回归：`test_07` 5/5 通过（PT-01~PT-05）；`EM-K-15d`、`EM-K-68` 单跑通过。

## 5. 验收清单

- [x] `npx eslint src/components/table/pageTable.vue src/modules/APIKey/components/ApiKeyList.vue` 通过、`npm run build` 通过。
- [x] 列搜索（描述 / Key ID）在当页生效；清空后恢复整页。
- [x] 配额类型筛选（「无限」/「有限」）与描述搜索可叠加，翻页后条件仍保留。
- [x] 新增 / 编辑 / 删除成功后，列搜索与筛选条件被清空。
- [x] 列排序（含嵌套字段 `entity.name`）在当页内生效，`normal → asc → desc` 可回到原始顺序。
- [ ] 手册（`ai-gateway-user-manual`）：列表搜索作用域说明（当前页）待补。