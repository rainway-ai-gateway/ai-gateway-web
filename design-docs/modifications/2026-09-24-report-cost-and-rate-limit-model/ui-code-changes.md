# UI 代码变更文档

> **前置**：[2026-09-22 Entity 描述与协议路径](../2026-09-22-entity-description-and-protocol-paths/ui-code-changes.md)  
> **对照接口**：`report.md`（成本出口 ÷1e8 金额化）、`00-common.md`（RMB 配额定点口径追加报表链路说明）  
> **对照原型**：`prototype-design/pages/report.html`（配套 `assets/js/mock-data.js`）  
> **状态**：**原型已完成** · **UI 代码已完成** · 待 Review（阶段 2-7）

本次变更：**报表成本出口金额化**。

报表库 `ai_cost_value` 与 BFE 访问日志仍以定点整数（1 单位 = 1e-8 元/美元）存储，但 `/open-api/v1/report/*` 出口已统一 **÷1e8 换算为金额**（元 / 美元）返回，调用方（UI）直接展示，前端**不得**再做换算；无成本返回 `null`（不再是 `0`）。

> ⚠️ 本次**无数据库 DDL 变更**，阶段 1 已确认 DB 无需重置。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 状态 |
| ----------- | -------- | ---- |
| 报表 · 总览 · 成本卡 | 主值取 `cost[0]`（金额 + `.metric-currency` 币种），副值 `.slice(1)` 逐币种列出 | ✅ 原型 · ✅ UI |
| 报表 · 总览 · 成本数据 | 出口已 ÷1e8，前端**不做**二次换算；`cost` 为 `{currency, value}` 金额数组 | ✅ 原型 · ✅ UI |
| 报表 · 明细 · 成本列 | `ai_cost_value` 为金额、无成本为 `null`（显示 `-`） | ✅ 原型 · ✅ UI（现逻辑已兼容，无需改动） |
| 报表 · Mock 数据 | `reportOverview.cost` / `reportTimeseries.cost.series` / `reportLogs.*.ai_cost_value` 改为金额；无成本置 `null` | ✅ 原型 |
| 文档 | `docs/zh-cn/12-report.md` L44 成本口径表述同步 | ✅ 已更新 |
| 后端接口 | `/open-api/v1/report/*` 出口 ÷1e8 | ✅ 后端 |

---

## 2. 接口依据

| 位置 | 条款 |
| ---- | ---- |
| `report.md` 字段表 | `ai_cost_value` / `ai_cost_currency`：**number / string** — 成本金额（元/美元，服务端已完成 ÷1e8 换算）/ 币种；**无成本为 null** |
| `report.md` 2.1 约束 | 成本按币种分组返回**换算后的金额**（定点值 ÷ 1e8，元/美元），换算由服务端完成，调用方直接展示 |
| `report.md` 明细示例 | `"ai_cost_value": 0.00005`（原 `5000`） |
| `report.md` 总览示例 | `"cost": [{"currency":"USD","value":0.1523},{"currency":"RMB","value":0.00098}]`（原 `15230000` / `98000`） |
| `report.md` 时序说明 | `cost` 指标 = 成本增速（**金额/秒**，元/秒、美元/秒，原「定点整数/秒」） |
| `00-common.md` | RMB 配额定点说明追加：报表库 `ai_cost_value` 及 BFE 访问日志同为此定点口径（1 单位 = 1e-8 元/美元）；`/open-api/v1/report/*` 出口已统一换算为金额，报表链路中唯一直接对外暴露定点值的是 pb 访问日志与库表本身 |

---

## 3. 原型

**文件**：`design-docs/prototype-design/assets/js/mock-data.js`（11 处）

| 位置 | 变更前 | 变更后 |
| ---- | ------ | ------ |
| `reportOverview.cost`（L1209 区） | `15230000` / `98000` | `0.1523` / `0.00098` |
| `reportTimeseries.cost.series`（L1269 区，5 点） | `1200/1350/1100/1500/1280` | `0.000012/0.0000135/0.000011/0.000015/0.0000128` |
| `reportLogs` logid 12345（L1371 区） | `5000` + `USD` | `0.00005` + `USD` |
| `reportLogs` logid 12346（L1384 区） | `30000` + `USD` | `0.0003` + `USD` |
| `reportLogs` logid 12347（L1400 区） | `800` + `USD` | `0.000008` + `USD` |
| `reportLogs` logid 12348（401，L1410 区） | `0` + `USD` | **`null` + `null`** |
| `reportLogs` logid 12349（429，L1423 区） | `0` + `USD` | **`null` + `null`** |

**文件**：`design-docs/prototype-design/pages/report.html`（3 处）

| 位置 | 变更前 | 变更后 |
| ---- | ------ | ------ |
| 样式（L165 区） | 无 `.metric-currency` | 新增 `.metric-card .metric-currency`（12px / `#808695` / 400 / `margin-left:4px`） |
| `renderOverview()`（L619 区） | `costSub` 直接遍历全部 `cost`，成本卡主值固定 `-` | 取出 `costArr[0]` 作为**主值**（`fmtNum(value)` + `<span class="metric-currency">currency</span>`），`costArr.slice(1)` 作为**副值**逐币种列出 |
| 成本卡（L636 区） | `<div class="metric-value">-</div>` | `<div class="metric-value">' + costMain + '</div>` |

```diff
-        var costSub = (d.cost || []).map(function (c) {
+        var costArr = d.cost || [];
+        var costMain = costArr.length
+          ? fmtNum(costArr[0].value) + '<span class="metric-currency">' + costArr[0].currency + '</span>'
+          : '-';
+        var costSub = costArr.slice(1).map(function (c) {
           return '<div class="metric-sub">' + c.currency + ': ' + fmtNum(c.value) + '</div>';
         }).join('');
```

**说明**：`fmtNum` 对 `< 1000` 返回 `String(n)`，故 `0.1523`、`0.00005` 原样展示，不做额外小数位格式化。

---

## 4. UI 实施

| 文件 | 变更点 | 说明 |
| ---- | ------ | ---- |
| `src/modules/Report/components/Overview.vue` | 成本卡副值 `v-for` 加 `.slice(1)`（L47） | 主币种已在主值展示，副行须跳过首个币种，否则重复；主值 `cost[0]` + `.metric-currency`（L45）与样式（L327–332）已存在，本次沿用 |
| `src/modules/Report/components/Logs.vue` | **无需改动** | L258 已为 `ai_cost_value != null ? value + ' ' + currency : '-'`，与金额 + `null` 语义天然兼容；与原型 `report.html:797` 一致 |
| `src/modules/Report/index.vue` | **无需改动** | `fmtNum`（L238–243）保持 `< 1000` 原样；成本不做二次 ÷1e8 |

> 原型 `report.html` 报表明细 **Drawer 不含成本字段**、明细列（L797）为原样拼接 —— 与 Vue `Logs.vue` 现状一致，本次不调整。

---

## 5. 验收清单

- [ ] 总览成本卡主值 = `cost[0]`，金额数字 + 灰色小号币种（`.metric-currency`）
- [ ] 总览成本卡副值仅列出 `cost[1..]`（不再重复主币种）
- [ ] `cost` 为空数组时主值显示 `-`，副值不渲染
- [ ] 明细列成本为 `null` 时显示 `-`；有值时形如 `0.00005 USD`
- [ ] 页面不对成本做任何 ×1e8 / ÷1e8 换算
- [ ] 原型 `report.html`（含 `mock-data.js`）与 Vue 展示一致
- [ ] `npx eslint src/modules/Report/components/Overview.vue` 无报错
- [ ] 页面无控制台告警（无缺失 i18n key）

---

## 6. 变更文件清单

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `design-docs/prototype-design/assets/js/mock-data.js` | 已修改 | 报表成本金额化 11 处（概览 2、时序 5 点、日志 5 条：3 条金额 + 2 条 `null`） |
| `design-docs/prototype-design/pages/report.html` | 已修改 | `.metric-currency` 样式 + `costMain` 主值逻辑 + 成本卡主值（3 处） |
| `design-docs/api-define/OpenAPI接口定义/report.md` | 已同步 | 成本出口 ÷1e8 金额化（4 处） |
| `design-docs/api-define/OpenAPI接口定义/00-common.md` | 已同步 | RMB 配额定点说明追加报表链路（1 处） |
| `src/modules/Report/components/Overview.vue` | 已修改 | 成本卡副值 `.slice(1)`（+1 / −1 行） |
| `docs/zh-cn/12-report.md` | 已更新 | L44 改为用户可见口径（不写 ÷1e8 / `null` 等实现细节）：「成本数据按币种分开展示：总览卡主值取首个币种（金额 + 币种小字），其余币种以副行列示；无成本数据时成本卡显示 `-`」 |
| `src/modules/Report/components/Logs.vue` | 无改动 | 现有 `null` 判断 + 原样拼接已满足金额语义 |
| `src/modules/Report/index.vue` | 无改动 | `fmtNum` 不做二次换算 |

---

## 7. 注意事项

1. **前端不得再换算成本**：`/open-api/v1/report/*` 已由服务端 ÷1e8，`0.1523` 即 0.1523 美元；报表链路中唯一仍暴露定点值的是 **pb 访问日志与库表本身**。
2. **`ai_cost_value` 无成本为 `null`**（不再是 `0`）：UI 判空用 `!= null`，`0` 是合法金额（如 0 元），不可与「无成本」混同。
3. **`fmtNum` 对小额金额不做格式化**：`< 1000` 返回 `String(n)`，故 `0.00005` 原样展示；如需科学计数/保留位，须另起格式化函数（本次不做）。
4. **`Overview.vue` 的 `.slice(1)` 是关键改动**：主币种已在主值展示，副行必须跳过首个币种，否则重复。
5. **原型 `report.html` 的成本卡主值改动已同步到 UI**：`cost[0]` 的金额 + 币种小字组合在两个实现中保持一致。

---

## 8. 关联文档

| 文档 | 说明 |
| ---- | ---- |
| `design-docs/api-define/OpenAPI接口定义/report.md` | 报表接口，成本出口 ÷1e8 |
| `design-docs/api-define/OpenAPI接口定义/00-common.md` | 定点口径与报表链路说明 |
| `design-docs/prototype-design/pages/report.html` | 报表原型页 |
| `docs/zh-cn/12-report.md` | 报表使用文档（已同步 L44） |
| `design-docs/modifications/2026-09-16-report-ui/ui-code-changes.md` | 报表模块初次引入的变更记录 |
