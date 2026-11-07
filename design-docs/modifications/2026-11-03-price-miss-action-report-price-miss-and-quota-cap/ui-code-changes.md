# UI 代码变更：集群缺价处置动作（price_miss_action）、报表缺价标记与形态、配额超额百分比封顶

> **日期**: 2026-11-03 ｜ **前置**: [2026-11-02 EPP 文案与调用超时校验](../2026-11-02-cluster-epp-ui-copy-and-call-timeout-check/ui-code-changes.md)（集群表单最近一批改动）｜ **上游依据**: `ai-gateway-api` 拉取至 `f20d414`（2026-10-31），api-define 四个文件已按 e2e 工作流阶段 1.6 同步（`00-common.md` / `api-keys.md` / `clusters.md` / `report.md`）；核心依据为 `ai-gateway-api/design-docs/modifications/2026-10-30-issue-1479-price-miss-action/`（集群 `llm_config.price_miss_action` 三态 + 报表明细 `ai_price_miss`/`ai_price_warn`）与 `2026-10-30-issue-1476-quota-overage-used-derivation/`（`balance.used` 允许超过 `quota`）
> **对照接口**: `clusters.md`（`llm_config.price_miss_action`，非必填、默认 `fallback_chat`、枚举 `fallback_chat`/`bill_zero`/`reject`、「控制台新建集群显式落值」）、`report.md`（明细行新增 `ai_price_miss` bool / `ai_price_warn` string 六形态）、`00-common.md` + `api-keys.md`（balance 语义：`used` 可大于 `quota`，`remaining` 欠费对外展示 0）｜ **对照原型**: 本轮已同步修改（`prototype-design/assets/js/cluster-upsert.js`、`prototype-design/pages/report.html`）
> **状态**: 原型 ✅ · UI 代码 ✅（lint 通过，已构建并同步 `ai-gateway-runtime/static/`）· 02 文档 ⬜（阶段 3 待办：集群 RM-BC-125+ 缺价动作用例、报表缺价列/详情用例）· 手册 ⬜（阶段 5 待办：03 集群章补字段、17 报表章补列）｜ **菜单/路由变更**: 无

本轮为 api 仓库 issue #1479 / #1476 的 UI 消费侧落地，共三项：① 集群大模型配置新增「缺价处置动作」下拉（三态，默认回退 chat 价计费，新建显式落值）；② 报表日志明细新增「缺价」列与详情抽屉「是否缺价 / 缺价形态」两项（六形态枚举映射中文文案）；③ 配额用量进度百分比封顶 100%（`used` 允许超 `quota` 后文本不再出现 >100%）。均为纯增量，无接口字段删除/语义变更。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 | 验证 |
| ----------- | -------- | ---- | ---- |
| 集群创建/编辑向导 · 大模型配置（`GatewayConfig.vue`） | 新增「缺价处置动作」Select（fallback_chat 默认 / bill_zero / reject），带 ? 提示；枚举校验；提交显式落值；编辑回读 | ✅ UI | ✅ lint；构建产物 grep 文案存在 |
| 集群复查&检查 / 详情（`Review.vue`，两处共用） | 新增「缺价处置动作:」行，枚举值映射中文短文案 | ✅ UI | ✅ lint |
| 报表 · 日志明细（`Logs.vue`） | 列表新增「缺价」列（未缺价 `-`，缺价红字展示形态）；详情抽屉新增「是否缺价 / 缺价形态」 | ✅ UI | ✅ lint |
| Entity / APIKey 详情（`EntityView.vue` / `ApiKeyView.vue`） | `quotaPercent` 封顶 100（进度条与百分比文本）；`remaining` 维持 `max(0, quota-used)`，与 api 欠费展示 0 语义一致 | ✅ UI | ✅ lint |
| 原型（`cluster-upsert.js` / `report.html`） | 与 src 同口径的三处原型改动（表单/复查/校验 + 列/详情） | ✅ 原型 | ✅ `node --check` / 脚本块语法检查 |
| 02 测试文档 / Playwright 用例 / 手册 | 待阶段 3/5（见 §5 既有用例影响与待新增用例） | ⬜ | — |

## 2. 接口变更（diff）

无前端可见的接口结构变更——三个字段均为 api 侧**新增可选**字段，UI 属消费侧补齐：

- `clusters.md`：`llm_config` 新增 `price_miss_action`（string，非必填，默认 `fallback_chat`，取值 `fallback_chat`/`bill_zero`/`reject`；「控制台新建集群显式落值，省略等价默认」）。非法值后端 400/422：`llm_config.price_miss_action must be fallback_chat, bill_zero or reject`（已实测验证新二进制生效）。
- `report.md`：`/report/logs` 明细行新增 `ai_price_miss`（bool，未缺价为 null；非 2xx 拒绝行也会出现）与 `ai_price_warn`（string 六形态：`fallback`/`no_entry`/`no_baseline`/`reject`/`subitem_missing`/`no_model_table`，未缺价为 null）。无新增查询过滤参数（文档建议叠加 `res_status_code` 筛选）。
- `00-common.md` / `api-keys.md`：`balance.used` 允许大于 `quota`（欠费，`used = quota − remaining` 如实反映）；`remaining`  Redis 余额为负时对外展示 0；PATCH 调整配额时不再钳零。

> **报表库迁移（部署前置）**：新 api 的 `/report/logs` 查询投影已包含 `ai_price_miss` / `ai_price_warn` 两列，**报表库未迁移时明细查询会直接报错**（本地 open_bfe 已按 `ai-gateway-api/db_ddl_report_mysql.sql` 的 ALTER 语句加列：`ai_price_miss TINYINT DEFAULT NULL`、`ai_price_warn VARCHAR(32) DEFAULT NULL`，验证通过）。其他环境升级 api 时必须同步执行该迁移。

## 3. UI 代码变更（`src/`，已实施）

| 文件 | 变更点 | 验收要点 |
| ---- | ---- | ---- |
| `src/i18n/zh.js` / `en.js` | gatewayConfig 新增 `priceMissAction` 系列（标签/提示/三选项/校验文案/三个短文案）；report 新增 `colPriceMiss`/`priceMissField`/`priceWarnField`/`priceMissYes/No`/`priceWarn*` 六形态文案 | 中英文界面同源展示 |
| `src/modules/Clusters/components/GatewayConfig.vue` | 模板在「匹配前缀」后新增 `FormItem prop="price_miss_action"`（iView Select 三选项 + ? 提示）；`formData.price_miss_action` 默认 `'fallback_chat'`；`validatePriceMissAction` 枚举校验（change）；`applyLlmConfig` 回读 `src.price_miss_action \|\| 'fallback_chat'`；`handleSubmit` 显式落值 | 新建向导默认选中「回退 chat 价计费」；提交体 `llm_config.price_miss_action` 恒有值；编辑回显存储值 |
| `src/modules/Clusters/components/index.vue` | `formatLlmConfigForApi`（向导最终提交体的**显式字段白名单**组装函数）新增 `price_miss_action: src.price_miss_action \|\| 'fallback_chat'`。**实施时发现**：漏加该白名单项会静默丢弃提交值（test_21 提交体断言抓到 `undefined` 后修复） | 提交链路：GatewayConfig 表单 → `llmConfigData` → 白名单组装 → POST/PATCH 全链路透传 |
| `src/modules/Clusters/components/Review.vue` | llm 汇总区「匹配前缀」后新增「缺价处置动作:」行，`displayPriceMissAction` 枚举→短文案映射 | 复查页与详情抽屉均展示 |
| `src/modules/Report/components/Logs.vue` | `cols` 在「缓存」后新增「缺价」列（`ai_price_miss` 为真时红字 `fmtPriceWarn(ai_price_warn)`，否则 `-`）；详情抽屉「缓存状态」后新增「是否缺价 / 缺价形态」；新增 `fmtPriceWarn` 六形态映射 | 明细缺价行红字可见；详情两字段未缺价展示 `-` |
| `src/modules/Entity/components/EntityView.vue` | `quotaPercent` 包 `Math.min(100, …)`（注释标注 #1476 欠费语义） | used > quota 时进度条/百分比不超过 100%，剩余量仍 0 |
| `src/modules/APIKey/components/ApiKeyView.vue` | 同 EntityView 的 `quotaPercent` 封顶 | 同上 |

## 4. 规则细节与取舍（文档未明确处，按语义裁定）

- **新建显式落值、编辑保留存储值**：api 约定「省略等价默认」，但同句要求「控制台新建集群显式落值」，故 `handleSubmit` 恒下发 `price_miss_action`（默认补齐 `fallback_chat`）；存量集群（存储值无该字段）编辑回读时回落 `fallback_chat` 并随 PATCH 落库。
- **缺价列展示形态而非布尔**：`ai_price_miss=true` 时列表/详情展示 `ai_price_warn` 的中文形态（红字），比单纯「是」更有信息量；未缺价（null/false）统一 `-`。
- **无新筛选器**：report.md 未给 `ai_price_miss` 查询参数，不新增筛选 UI（避免造后端不支持的参数）；需要定位缺价请求时按文档建议用既有 `status_codes` 叠加。
- **百分比封顶 100 而非展示超额**：`used/quota` 超 100% 时文本同步封顶（`quotaPercent` 同时驱动进度条与百分比文本），欠费的事实由「已用量 > 配额总量」的原始数字呈现；不引入新的「超额」标签。

## 5. 既有用例影响（impact-scan 初稿 174 命中 → 逐条确认）

扫描关键词：`缺价 price_miss ai_price_miss ai_price_warn 配额 quota`。初稿 174 命中绝大多数为**配额重置表单**（RMB/token 上限、重置弹窗）与 API 造数字段，与本轮「详情百分比封顶」无关，**无处置**。逐条确认需关注的如下：

| 用例/文件 | 影响 | 处置 |
| ---- | ---- | ---- |
| `tests/cluster/*` 全部（UI 提交体断言） | 提交体新增 `price_miss_action` 字段（默认 `fallback_chat`）；已核对全部集群 spec 只做**字段级断言**（`body.xxx.toBe(...)`），无整体 deep equal（`toStrictEqual` 零命中） | **无处置**（字段级断言不受新增字段影响） |
| `src/modules/Clusters/components/index.vue` `formatLlmConfigForApi`（UI 组装层白名单，实施时发现） | 该函数以显式字段白名单组装 `llm_config` 提交体，**首轮实现漏加 `price_miss_action` 会被静默丢弃**（test_21 提交体断言抓到 `undefined` 后修复） | **已修复**：白名单新增 `price_miss_action: src.price_miss_action \|\| 'fallback_chat'`；test_21 复跑通过 |
| `tests/report/test_02_report_logs.spec.js`（RP-L-01/16/24） | 「缺价」列插入「缓存」「镜像」之间：RP-L-01 相邻断言 `缓存→镜像` 断链；RP-L-16 固定列序 15→16、空值行「错误」列下标右移一位；RP-L-24 逐字段核对插入缺价列期望（`fallback` 形态文案）、「操作」列下标 14→15 | **微调**（断言随新列更新，未弱化） |
| `tests/report/test_03_report_detail.spec.js`（RP-L-21/24） | 详情抽屉 38→40 字段项（DETAIL_FIELD_LABELS 新增「是否缺价 / 缺价形态」）；mock item 49→51 字段；RP-L-21 全字段计数与「49 字段覆盖」断言同步 | **微调**（`pages/report/ReportPage.js` 的 `DETAIL_FIELD_LABELS` / `LOG_TABLE_COLUMNS_15`（15→16 列）同步扩展） |
| `tests/entity-management/*`、`tests/api-key/*` 配额百分比断言 | `quotaPercent` 封顶仅在 used>quota 时改变展示，既有用例用量均不超配额 | **无处置** |

**待新增用例（阶段 3 输入）**：集群缺价动作（默认落值 / 三选项提交体 / 编辑回读 / 非法值前端校验）、报表缺价列与详情（缺价行红字形态 / 未缺价 `-` / 六形态文案）、配额超额封顶（used>quota 时 100% 封顶，可 API 造数欠费场景）。

## 6. 验收清单

- [x] 集群向导大模型配置出现「缺价处置动作」，默认「fallback_chat（回退 chat 价计费，默认）」，? 提示完整。
- [x] 新建集群提交体含 `llm_config.price_miss_action`（三态分别提交正确）。
- [x] 编辑存量集群回显存储值；复查页与详情抽屉展示中文短文案。
- [x] 报表明细缺价行红字展示形态文案，详情抽屉「是否缺价 / 缺价形态」正确。
- [x] `npm run lint`（eslint --quiet）通过；`node --check` 原型脚本通过。
- [x] `npm run build`（Node 20）成功并同步 `ai-gateway-runtime/static/`。
- [ ] 02 文档新增用例（阶段 3）：集群 RM-BC-125、报表缺价用例。
- [ ] 手册同步（阶段 5）：`03-ai-business-cluster.md` 补字段、`17-report.md` 补列。
