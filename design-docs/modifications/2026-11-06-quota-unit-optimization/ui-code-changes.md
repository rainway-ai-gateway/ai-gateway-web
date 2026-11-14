# UI 代码变更：配额总量单位优化（百万Token / 元两位小数 / 配额限制口径反转）

> **日期**: 2026-11-06 ｜ **上游依据**: [ai-gateway-web issue #139「【优化】配额总量单位优化」](https://github.com/rainway-ai-gateway/ai-gateway-web/issues/139)（MercuryLi，2026-11-04）：① Token 数改成以百万Token 为单位；② RMB 改成以元为单位、保留两位小数；③「无限配额=是/否」改成「配额限制=否/是」
> **对照接口**: `api-define` 配额单位枚举仍为 `total_token` / `RMB`（`ai-gateway-api/lib/validate/validate.go:420`：只认这两个值；token 必须为整数；RMB 为元 float、最多 8 位小数、上限 MaxRMBQuota）——**接口零改动、无 DDL、无破坏性**
> **对照原型**: 待同步
> **状态**: 原型 ⬜ · UI 代码 ✅（node 断言 + eslint + 构建通过）· 02 文档 ⬜ · 手册 ⬜ ｜ **菜单/路由变更**: 无

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 验证 |
| ----------- | -------- | ---- |
| APIKey 创建/编辑（`APIKey/components/Upsert.vue`） | ① token 单位以百万Token 录入/回显（提交 `Math.round(x×1e6)`，回显 `÷1e6` 截断 2 位）；② 单位选项显示「元」、精度 4→2、步长 0.0001→0.01（提交值仍 `RMB`）；③「无限配额」下拉改「配额限制」，选项语义反转（是=`unlimited=false`） | node + eslint + 构建 |
| Entity 创建/编辑（`Entity/components/EntityUpsert.vue`） | 同上（结构对齐 APIKey） | node + eslint + 构建 |
| `src/utils/const.js` | 新增 `TOKEN_QUOTA_MILLION`、`TOKEN_QUOTA_DISPLAY_MAX`（9999.99）、`quotaToMillionDisplay()`、`millionToQuotaTokens()` | node 断言 18 例 |
| `src/i18n/zh.js` / `en.js`（apiKey 段 + entity 段各一份） | 新增 `quotaLimited`（配额限制）、`quotaUnitMillionToken`（百万Token）、`quotaUnitYuan`（元）；`quotaRmbPrecisionError` 改 2 位小数口径、`quotaRmbMaxError` 改「金额配额」口径 | — |

> **后续（2026-11-10）**：列表 / 详情页 / 重置配额弹窗已按同一口径补齐，见 [`../2026-11-10-quota-unit-display-alignment/ui-code-changes.md`](../2026-11-10-quota-unit-display-alignment/ui-code-changes.md)。

**本次不做（按卡片范围收敛）**：详情页单位展示（`ApiKeyView.vue` / `EntityView.vue` 仍显示原始 token 数与 `¥` 原值）、重置配额弹窗、APIKey 顶部「执行配额检查」（`unlimited_quota`）语义统一——均未在卡片中点名，留作后续。

## 2. 接口变更（diff）

无。表单模型 `formData.quota_plan.quota` 现以**录入单位**存储（百万Token / 元），仅在回显与提交两处换算：

- 回显：`quotaToDisplay(quota, unit)` —— `total_token` 走 `quotaToMillionDisplay`（÷1e6 截断 2 位）；`RMB` 走 `toFixed(2)`。
- 提交：`total_token` 走 `millionToQuotaTokens`（×1e6 四舍五入为整数 token）；`RMB` 走 `toFixed(2)`。
- 提交体字段名与枚举值（`quota_plan.quota` / `unit: total_token|RMB`）不变。

## 3. 规则细节与取舍

- **两种单位统一 2 位小数**：百万Token 粒度 1 万 token（卡片只要求"百万Token"，未指定精度；取 2 位与卡片"元两位小数"一致）。后端 token 必须为整数，由提交时 `Math.round(x×1e6)` 保证。
- **去掉配额输入框的千分位 formatter/parser**：原 `formatNumberInput` 会在输入 `100.` 时把小数点抹掉，与 2 位小数冲突；配额数值现在 ≤9999.99，无需千分位。该 formatter 仍被限流等整数输入框复用，未删除。
- **上限口径**：`quotaInputMax` 的 token 侧改为 `TOKEN_QUOTA_DISPLAY_MAX = 9999.99`（= 9,999,990,000 ≤ 9,999,999,999），校验与 `isLimitedQuotaInvalid` 同步；RMB 侧仍为 9000 万元。
- **去掉 token 侧"必须为整数"校验**：录入单位为百万后允许小数，整型约束在提交换算时承担。
- **「配额限制」反转只动 UI**：数据模型 `quota_plan.unlimited` 不变，`v-if="unlimited !== 'true'"` 条件（有限配额时展开明细）语义天然正确，无需改；详情页沿用 `unlimitedQuota`/`unlimitedQuotaText` 键，仍显示"无限配额"，本次未改（见 §1 范围说明）。
- **已知边界**：① 回显对 token 侧截断 2 位小数，存量值若带 1 万 token 以下零头，用户保存时会被舍入（最大损失 <1 万 token，最大上限值 9,999,999,999 → 保存为 9,999,990,000）；② RMB 侧回显四舍五入到 2 位，存量 3~4 位小数值保存时会被舍入；③ 切换单位不换算已填数值（沿用原有行为）。

## 4. 既有用例影响

`npm run impact-scan` 未执行（web 仓无该脚本的可用入口）；`ai-gateway-web-test` 若对配额输入框原始值（如 `100000000`）或单位选项文案（`total_token`/`RMB`）做断言，需改为 `100` 与「百万Token」/「元」。

## 5. 验收清单

- [x] 换算函数 node 断言 18 例通过（回显/提交/边界 9999.99/往返一致性/RMB 2 位小数）。
- [x] eslint 通过、`npm run build` 通过（仅既有包体积警告）。
- [ ] 浏览器复验：新建 APIKey/Entity，token 配额填 `100` 提交为 `100000000`；RMB 填 `12.34` 提交为 `12.34` 且 `unit=RMB`。
- [ ] 浏览器复验：编辑存量记录回显（100000000 → 100、RMB 12.3456 → 12.35）。
- [ ] 浏览器复验：「配额限制=是」展开并必填；「=否」隐藏且提交 `unlimited=true`。
- [ ] 02 文档/手册同步（如适用）。