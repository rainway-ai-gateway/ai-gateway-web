# UI 代码变更：配额单位口径全路径对齐（列表 / 详情 / 重置配额）

> **日期**: 2026-11-10 ｜ **上游依据**: [ai-gateway-web issue #139「【优化】配额总量单位优化」](https://github.com/rainway-ai-gateway/ai-gateway-web/issues/139)（MercuryLi，2026-11-04）：① Token 数改成以百万Token 为单位；② RMB 改成以元为单位、保留两位小数；③「无限配额=是/否」改成「配额限制=否/是」
> **对照接口**: 无变更。存储与接口仍是 `quota_plan.unit = total_token | RMB`、`quota_plan.quota` 为整数 Token 或元（`ai-gateway-api/lib/validate/validate.go:420`）；换算只发生在展示与提交两处
> **对照原型**: 无结构变更（沿用现有卡片/列表/弹窗布局）
> **状态**: 原型 N/A · UI 代码 ✅（eslint + 构建 + 浏览器复验）· 02 文档 ✅ · 手册 ⬜ ｜ **菜单/路由变更**: 无

## 1. 变更总览

起因：2026-11-06 的首批改动（`../2026-11-06-quota-unit-optimization/`）只覆盖创建/编辑表单，同一批配额信息在列表、详情、重置弹窗仍是存储口径（`100.0K tokens`、`¥12.3456`、`total_token` 枚举），用户看到的仍是「没修」。本批把三条要求推到全部可见位置。

批次内追加：复验时发现配额总量输入框在小数点前后编辑有光标跳动 / 自动补零的问题（iView `InputNumber` 的 `precision` 重排所致），改为自实现的 `NumberInput` 控件。

| 页面 / 模块 | 变更要点 | 验证 |
| ----------- | -------- | ---- |
| `src/utils/const.js` | 新增 `formatQuotaDisplay(raw, unit)`：存储值 → 展示串（不含单位名），`total_token` 侧 `÷1e6` 截断 2 位（与表单回显一致），`RMB` 侧 `toFixed(2)`；非法/负值回落 `0.00` | node 断言 11 组 |
| APIKey / Entity 列表「配额」列（`ApiKeyList.vue:271`、`EntityList.vue:171`） | `100.0K tokens` → `0.10 百万Token`，`¥12.3456` → `12.34 元`；单位名走 i18n（`quotaUnitMillionToken` / `quotaUnitYuan`）；列宽 140→200 避免换行断词 | 浏览器复验 |
| APIKey 详情（`ApiKeyView.vue:89` 起） | 「配额类型：无限配额/有限配额」→「配额限制：是/否」（是=有限）；总量/已用/剩余按录入单位展示 | 浏览器复验 |
| Entity 详情（`EntityView.vue:64` 起） | 「无限配额」行改「配额限制」并反转取值；「配额单位」行由原始枚举 `total_token`/`RMB` 改「百万Token」/「元」；总量/已用/剩余按录入单位展示 | 浏览器复验 |
| 「重置配额」弹窗（`ApiKeyView.vue:282`、`EntityView.vue:258`） | 标签补单位（`新的配额总量（百万Token）`）；精度 4→2、步长 0.0001→0.01；回显 ÷1e6、提交 ×1e6 换算回整数 Token；上限改 `TOKEN_QUOTA_DISPLAY_MAX`（9999.99 百万Token） | 浏览器复验 |
| 新增 `src/components/NumberInput/index.vue`（通用） | 承载文本的数值输入：输入时只清洗字符（数字 + 一个小数点，小数位截到 `precision`）、失焦补齐小数位、逐键回传数值；支持整数模式（`precision=0`，回传 `Math.round`）与千分位（`thousands`，仅失焦展示）。替换配额 4 处 + API-Key/Entity 限流 13 处（TPM/RPM/最大并发/批量限流）的 iView `InputNumber`，并删除随之失用的 `formatNumberInput` / `parseNumberInput` | 浏览器复验（见 §5） |
| `src/i18n/zh.js` / `en.js` | 新增 `newQuotaTotalWithUnit`（apiKey 段 + entity 段各一份，`{unit}` 插值） | — |
| 四个组件 | 删除因改动失去引用的 `formatNumber()` | eslint |
| `docs/zh-cn/12-api-key.md`、`15-entity.md` | 单位说明由「详情页与重置配额弹窗仍按存储值展示」改为「表单/弹窗/列表/详情统一按百万Token·元」 | — |

## 2. 接口变更（diff）

无。字段名、枚举值、提交前的换算规则与首批一致：

- 展示：`quota_plan.quota` + `quota_plan.unit` → `formatQuotaDisplay()` + i18n 单位名。
- 重置配额提交：`total_token` 走 `millionToQuotaTokens`（`Math.round(x × 1e6)`），`RMB` 走 `Number(x.toFixed(2))`；请求体仍是 `{ quota, reason }`。

## 3. 规则细节与取舍

- **弃用 iView `InputNumber`（配额总量输入框）**：其 `precision` 模式在每次 `input` 后 `toFixed` 重排，并在 `currentValue` watcher 里强制 `selectionStart = selectionEnd = length`（`node_modules/iview/src/components/input-number/input-number.vue:353-357`）。实测「光标停在小数点前按 Delete」→ 小数点被删、`100.00` 变 `10000.00`、光标跳到末尾并立刻报超范围；「删掉一位小数」→ 立即补回 `.00`。`active-change="false"` 能绕过重排，但此时 `min`/`max` 会在失焦时静默夹取用户输入（超上限不再报错），且逐键校验失效，故改为自实现 `NumberInput`：输入阶段只清洗不重排，失焦才补齐小数位，逐键回传数值供表单校验。
- **展示与录入同源**：列表/详情复用 `formatQuotaDisplay` 与表单回显同一套截断规则（÷1e6 后 `floor` 到 2 位），避免「表单 99.99 / 详情 100.00」这类边界分歧；代价是 1 万 Token 以下零头不显示（与百万Token 单位本身的粒度一致）。
- **RMB 精度统一为 2 位**：原重置弹窗允许 4 位小数，而报错文案已改「最多 2 位」，属自相矛盾；本批把输入精度、校验、提交一并收到 2 位（接口本就支持 8 位，收窄只影响 UI 表现）。
- **重置弹窗从「整数 Token」改为「百万Token」**：去掉 `Number.isInteger` 校验，整型约束由提交换算承担，与表单行为一致；上限从 `TOKEN_QUOTA_MAX` 改为 `TOKEN_QUOTA_DISPLAY_MAX`（9,999,990,000 ≤ 9,999,999,999）。
- **「配额限制」反转**：仅改展示与下拉语义，数据模型 `quota_plan.unlimited` 不变；列表「配额类型」列的「无限/有限」标签保留（回归用例 `test_07_page_table_interaction` 断言这两个文案）。
- **已知边界**：① 存量配额带 1 万 Token 以下零头时，展示为 `x.xx 百万Token` 而下限截断（不影响存储，仅在重置弹窗保存时按新值落库）；② 切换单位不换算已填数值（沿用既有行为）。

## 4. 既有用例影响

- `ai-gateway-web-test/tests/api-key/test_05_api_key_display_consistency.spec.js:462/552/572`、`tests/entity-management/test_08_entity_org_display_consistency.spec.js:450/518/535` 断言 `¥` + 4 位小数、`tokens` 字样，需改为「元」+ 2 位小数、「百万Token」。**本批未同步该仓库**，需单独跟进。
- `test_07_page_table_interaction.spec.js`（配额类型列「无限/有限」）不受影响——列表标签未改。
- `ai-gateway-user-manual/05-entity.md:60-66` 仍是「无限配额」「如 total_token」「非负整数」的旧描述，需另行同步。

## 5. 验收清单

- [x] `formatQuotaDisplay` node 断言 11 组（0 / 1e8 / 1e5 / 9,999,999 / 9,999,999,999 / 5,000 / RMB 12.3456 / 0 / null / undefined / 负数）。
- [x] `npx eslint` 通过（7 个改动文件）；`npm run build` 通过（仅既有包体积告警）。
- [x] 浏览器复验（`PORT=8190 node configs/dev-server.js`，中文界面）：
  - 列表：`0.10 百万Token / 0.10 百万Token`（原 `100.0K tokens`）；Entity 列表 `100.00 百万Token`。
  - APIKey 详情：`配额限制 是`、`配额总量 0.10 百万Token`、`已使用 0.10 百万Token (100%)`、`剩余量 0.00 百万Token`。
  - Entity 详情：`配额限制 是`、`配额单位 百万Token`（原 `total_token`）、总量/已用/剩余同上。
  - 重置配额弹窗：标签 `新的配额总量（百万Token）`，回显 `0.10`，精度 2 位。
  - 创建表单：单位下拉 `百万Token / 元`，配额总量 2 位小数。
- [x] 浏览器复验（配额输入框）：光标置于小数点前按 Delete → 文本变为 `10000`、光标不再跳走、无 `.00` 回填；删除一位小数（`12.34` → `12.4`）不再自动补零；输入 `12.345` 按 2 位截断为 `12.34`；失焦补齐为 `12.40`；清空后失焦提示 `Please fill in quota total`；超上限（`10000 百万Token`）即时提示超出范围。
- [x] 浏览器复验（限流整数输入框）：`1048576` 失焦显示 `1,048,576`、聚焦变回 `1048576` 且光标可停在中间；中间删一位（`108576`）失焦后为 `108,576`；`1.5` 失焦取整为 `2`（不再被拼成 `15`）。
- [ ] RMB 单位记录的真机复验（当前环境无 RMB 配额数据；换算与展示逻辑已由 node 断言覆盖）。
- [ ] 部署包刷新：`ai-gateway-runtime/static` 仍是 2026-11-04 构建，需重新出包发布后才能在产品环境看到效果。