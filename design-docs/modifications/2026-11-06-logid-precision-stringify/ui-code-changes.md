# UI 代码变更：报表明细 logid 精度修复（大整数 ID 字符串化，方案 A 过渡）

> **日期**: 2026-11-06 ｜ **上游依据**: [ai-gateway-web issue #141「报表明细『日志ID』精度丢失」](https://github.com/rainway-ai-gateway/ai-gateway-web/issues/141)（MercuryLi，2026-11-06）：19 位 logid 超出 2^53，浏览器 `JSON.parse` 按 double 舍入（ulp=1024），页面显示的日志 ID 与库中真实值最多差 ±512，无法检索/对账/排障
> **对照接口**: `/report/logs` 响应 `logid` 仍为 JSON number（`ai-gateway-api/model/ireport/types.go:266` `LogID *int64`）——**接口契约不变**，本批仅前端过渡修复（issue 方案 A）；接口改 `,string`（方案 B）为后续项
> **对照原型**: 无 UI 结构变更
> **状态**: 原型 N/A · UI 代码 ✅（node 断言 + eslint + 构建通过）· 02 文档 ⬜ · 手册 ⬜ ｜ **菜单/路由变更**: 无

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 验证 |
| ----------- | -------- | ---- |
| 全局请求层（`src/utils/request.js`） | axios 实例新增 `transformResponse`：在 `JSON.parse` 之前对原始响应文本正则匹配已知大整数 ID 字段（`logid`/`session_id`），将 ≥16 位的数值就地加引号转字符串；非 JSON 文本/非字符串输入原样透传 | node 断言 8 组样例（见下）+ eslint + 构建 |
| 报表明细（`Report/components/Logs.vue:68`） | 无需改动：`logid` 为字符串后 `{{ selectedRow.logid }}` 直出，逐位正确 | 代码走查 |

## 2. 接口变更（diff）

无。后端 `logid` 仍以 JSON number 下发（Go 序列化文本精确，精度丢失发生在浏览器解析跳）。方案 B（`json:"logid,string"` + OpenAPI 文档同步）为终态，待与 api 侧约定发布顺序后另行实施（先 web 兼容双形态 → 再切接口，避免双输窗口）。

## 3. 规则细节与取舍

- **必须在解析前处理原始文本**：`JSON.parse` 的 reviver 拿到的已是舍入后的 double，无法还原；故在 `transformResponse` 文本层用 `"(?:logid|session_id)"\s*:\s*(\d{16,})` 就地加引号。≥16 位阈值：2^53 ≈ 9.007e15（16 位），低于 16 位的整数 double 精确表示，不处理。
- **只白名单 ID 字段**：`BIG_INT_ID_FIELDS = ['logid', 'session_id']`，报表聚合数值（`total_tokens` 等）不受影响，仍为 number。
- **兼容性**：历史行 `logid=0`/小数值（<16 位）保持 number，展示行为不变；web 此版本同时兼容 number/string 两种形态，为方案 B 切换铺路。
- **已知边界**：JSON 字符串值内部若出现转义的 `"logid":<16位以上数字>` 字面量，会被一并加引号（内容改变但仍是合法 JSON，不崩溃）；当前接口响应无此类字段，风险可接受。
- **精度粒度**：`session_id` 目前接口未下发该字段，属预留同批治理（issue 第 6 节同类字段要求）。

## 4. 既有用例影响

`logid` 在 web 内仅 `Logs.vue:68` 展示消费，无数值运算；`ai-gateway-web-test` 若对 `report/logs` 响应体的 `logid` 断言类型，需以字符串断言（≥16 位样例）。

## 5. 验收清单

- [x] **单测样例**（node 断言，8 组全过）：`6132373438926290944` / `6132373438926291456` / `9007199254740993` 逐位保留为字符串；`logid=0`、`logid=12345` 保持 number；聚合字段 `total_tokens` 不受影响的；数组/嵌套/`session_id` 生效；非 JSON 文本原样透传。
- [ ] **联调**：任取 `logid ≥ 2^53` 明细，页面值 == `curl` 原始响应 == `SELECT logid`（需部署后验证）。
- [ ] **回归**：`logid = 0`（历史行）展示行为不变（逻辑已断言，待浏览器复验）。
- [ ] **方案 B 跟进**：api 侧 `,string` + OpenAPI 文档 + web-test 断言同步（后续批次）。
