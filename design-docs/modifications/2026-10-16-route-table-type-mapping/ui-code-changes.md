# UI 代码变更：路由表类型列映射补齐 `api_key`

> **日期**: 2026-10-16 ｜ **前置**: 无（独立缺陷修复）｜ **上游依据**: api 仓 `model/shared/types.go`（`RouteTableTypeAPIKey = "api_key"`，自 2026-08-31 起）+ `ai-gateway-web-test/docs/route-management/` 02
> **对照接口**: `route-tables.md`（`type` 枚举 `api_key`）｜ **对照原型**: `prototype-design/pages/route-tables.html`
> **状态**: 原型 ✅（无需改动）· UI 代码 ✅ · 02 文档 ✅（无需改动）· 测试 ✅ · 手册 ✅（无需改动） ｜ **菜单/路由变更**: 无

「路由管理 → 路由表」列表的「路由表类型」列，对 API-Key 类型的路由表**显示原始英文枚举 `api_key`**，而非映射文案 `API-Key`——同一行同一概念，筛选器显示「API-Key」、列里显示 `api_key`，前后不一致。根因：前端 `TYPE_MAP` 缺 `api_key` 键（接口 2026-08-31 起改用 `api_key`，映射表未同步）。本次补键修复（1 行）。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 路由表 · 列表「路由表类型」列 | `TYPE_MAP` 补 `api_key: 'API-Key'`（保留 `apikey` 键兼容旧值）；列渲染命中映射，显示 `API-Key` | ⬜ UI |

## 2. 接口变更（diff）

无。接口自 2026-08-31 起即返回 `type = "api_key"`（`RouteTableTypeAPIKey`），前端映射表未同步属前端滞后，接口契约零变化。

## 3. 原型变更

无。原型 `route-tables.html` 的类型列渲染 label 文案即预期（`API-Key`），无需改动。

## 4. UI 代码变更（`src/`，已实施）

| 文件 | 变更点 | 验收要点 |
| ---- | ---- | ---- |
| `src/modules/RouteTable/index.vue` | `TYPE_MAP`（约 `:53-57`）新增 `api_key: 'API-Key'`；保留既有 `apikey: 'API-Key'` 以兼容任何旧值/旧数据 | 列表中 API-Key 路由表的「路由表类型」列显示 `API-Key`；Global/Entity 列显示不变；筛选器选中「API-Key」筛选结果行的列显示与筛选器一致 |

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| 无 | — | 纯显示层修复，不涉及既有用例断言前提。注：route 模块此前 7 条用例（RT-S-03/04、RT-J-01、RT-D-03/14、RT-L-14/15）曾因「断言写 `apikey`、接口返回 `api_key`」失败，已由 `pages/route/RoutePage.js` 的 `routeTableTypeMatches` 归一修复（与本修复同向；该封装可保留作双写兼容，亦可后续简化，不影响结论） |

## 6. 下游影响（阶段 3/4/5 输入）

- **02 文档**：`docs/route-management/` 的类型列描述本就是显示值（`Global / Entity / API-Key`），无需改动。
- **测试**：复跑路由表列表用例 `tests/route/test_06_route_table_list.spec.js` 确认无回归（16/16 通过）；route 模块全量此前已 93 通过 / 1 跳过。
- **用户手册**：`docs/zh-cn/10-route.md` 的类型说明已为显示值（`Global / Entity / API-Key`），第 32 行「apikey 路由表」为技术引用（指接口 `api_key` 类型），语义正确，无需改动。

## 7. 验收与偏差

- 实机：列表 API-Key 路由表「路由表类型」列显示 `API-Key`，与筛选器一致；Global/Entity 不变
  - 证据（2026-10-16 13:13 实机核验，真实数据行）：属主 `api-key-6`（接口 `type=api_key`）该行单元格渲染为 `["API-Key","api-key-6","停用","查看启用停用"]`
- 工程：`npx eslint`（含 `--ext .js,.vue`）+ `npm run build` 通过
- 复跑：`tests/route/test_06_route_table_list.spec.js` 16 通过 / 0 失败（2026-10-16 13:11）
  - 注：13:03 曾出现同文件 1 通过 / 15 失败，经排查为**同工作区并行会话干扰**（13:01:14 该会话对 8180 发起登录请求，后端每用户单 Key 导致本会话 Key 失效；13:03:26 该会话又改动了 `configs/dev-server.js`），非本修复引入，串行复跑即全绿
- 遗留（非本次范围）：`pages/route/RoutePage.js` 的 `apiKeyTypeLabels` 等断言仍为「`API-Key` / `api_key` / `apikey` 三写法并列」的双写兼容，前端缺口既已补齐，可另行收紧为仅 `API-Key`
