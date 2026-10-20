# UI 代码变更：集群 EPP 运行时参数（epp_runtime）

> **日期**: 2026-10-12 ｜ **前置**: [2026-10-11 密钥收敛 GET 列表端点](../2026-10-11-reencrypt-sweeps-list-endpoint/ui-code-changes.md) ｜ **上游依据**: api-define diff（`clusters.md`）+ 后端 EPP 运行时参数设计（`2026-10-12-epp-runtime-params`）
> **对照接口**: `clusters.md`（`POST`/`PATCH`/`GET /clusters` 新增可选 `epp_runtime`）｜ **对照原型**: `prototype-design/assets/js/cluster-upsert.js`、`pages/cluster-list.html`、`assets/js/mock-data.js`
> **状态**: 原型 ✅ · UI 代码 ✅ · 02 文档 ✅ · 测试 ✅ · 手册 ✅ ｜ **菜单/路由变更**: 无

集群在 `balance_mode=EPP` 时新增可选 `epp_runtime` 运行时参数（BFE 访问 EPP 的健康检查 `check` + 超时 `timeout`）。本次在集群创建/编辑向导的 EPP 配置区接入该表单（回读、校验、WRR/EPP 切换默认值），并在审核页展示；`tls`/`breaker` 由后端固定下发、不对外暴露，前端不提供入口。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 集群创建/编辑 · EPP 配置区 | `balance_mode=EPP` 时新增「EPP 运行时参数」分组：`check`（关闭健康检查 / 间隔 / 失败阈值 / 冷却 / 成功阈值）+ `timeout`（连接 / 调用），未设置子字段按默认补齐 | ✅ 原型 · ✅ UI |
| 集群创建/编辑 · 校验 | 提交前做字段校验：duration 须合法且 `>0`、阈值须 `>=1`；非法即拦截（对齐后端 422，避免到 BFE reload 才失败） | ✅ 原型 · ✅ UI |
| 集群创建/编辑 · 回读 | 编辑态从 `GET /clusters` 的 `epp_runtime` 回填表单（含默认补齐值）；未配置为 `null` 时按默认展示 | ✅ 原型 · ✅ UI |
| 集群创建/编辑 · WRR/EPP 切换 | 切到 `EPP` 且无 `epp_runtime` 时初始化一组默认值；WRR 时保留但不生效 | ✅ 原型 · ✅ UI |
| 审核页 | EPP 模式展示运行时参数行；未配置时显示「未配置（BFE 补默认）」 | ✅ 原型 · ✅ UI |

> 本次**无新增菜单 / 无路由变更**：`epp_runtime` 挂在既有集群向导的 EPP 配置区内。

---

## 2. 接口变更（diff）

### 2.1 `clusters.md`

| 位置 | 变更前 | 变更后 |
| ---- | ---- | ---- |
| `POST /clusters` Body | 仅 `balance_mode` + `epp_config` | 新增可选 `epp_runtime`（对象）：`check{disabled,check_interval,fail_threshold,cooldown,success_threshold}` + `timeout{connect,call}`；传入即**整体替换**、未设置子字段按默认补齐后落盘 |
| `PATCH /clusters` Body | 同上 | 新增可选 `epp_runtime`；**整体替换**语义（不传则保留原值），与 `balance_mode`/`epp_config` 相互独立 |
| `GET /clusters` 响应 | 仅 `epp_config` | 新增 `epp_runtime`（对象或 `null`）：**原样返回存储值**（含默认补齐值），未配置过为 `null` |
| 默认值 | — | `check`：`disabled=false`、`check_interval="2s"`、`fail_threshold=3`、`cooldown="45s"`、`success_threshold=2`；`timeout`：`connect="500ms"`、`call="3s"` |
| 校验 | — | `check_interval`/`cooldown`/`timeout.connect`/`timeout.call` 须为 `>0` 合法 duration；`fail_threshold`/`success_threshold` 须 `>=1`；非法 422 |
| 禁止字段 | — | `epp_runtime.tls`、`epp_runtime.breaker` **不接受**（未知字段，携带返回 422）——`EPPTLS` 固定 `{Plaintext:true}`、`EPPBreaker` 固定 `{Disabled:true}`，由后端下发 |
| 导出语义 | — | 仅 `balance_mode=EPP` 时导出到 BFE；WRR 时保留但不生效（休眠）；**非空即校验**（与 `epp_config` 一致） |

---

## 3. 原型变更（已完成，已 Review）

### 3.1 `prototype-design/assets/js/cluster-upsert.js`

| 区域 | 变更点 |
| ---- | ---- |
| `state.data` 初始化 | 新增 `epp_runtime`（`row.epp_runtime` 深拷贝，未设置 `null`） |
| EPP 配置表单 | `eppConfigHtml` 追加 `eppRuntimeHtml` 分组「EPP 运行时参数」（2026-10-13：改为**普通卡片**，与其余 EPP 配置卡片一致，无折叠开关）：关闭健康检查（switch）、健康检查间隔、失败次数阈值、冷却时长、成功次数阈值、连接超时、调用超时；各字段带 `helpIcon` 说明默认值与合法性 |
| 字段绑定 | 子字段 `data-field="epp.epp_runtime.check.*"` / `...timeout.*`；`syncFromDom` 增 `epp_runtime.` 前缀分支，经 `setNestedValue` 写入 `state.data.epp_runtime` |
| 开关交互 | 新增「关闭后台健康检查」switch（`#proto-epp-check-disabled-switch`）点击翻转 `check.disabled` |
| 校验 | 新增 `parseDurationMs`（解析 Go duration 且 `>0`）与 `validateEppRuntime`，接入 `validateEpp`：非法给可读提示并拦截提交 |
| 提交 | 「提交」点击时先 `syncFromDom` + `validateEpp`，校验失败 `Prototype.toast(err,'error')` 并 return，不触发 `onSubmit` |
| WRR/EPP 切换 | 切换为 `EPP` 且无 `epp_runtime` 时初始化默认 `check`/`timeout` 对象 |
| 审核页 | `eppRuntimeHtml` 对应的审核行：EPP 模式下展示 7 行运行时参数；未配置显示「EPP 运行时参数：未配置（BFE 补默认）」 |

### 3.2 `prototype-design/pages/cluster-list.html`

- 编辑取数时透传 `epp_runtime`（`item.epp_runtime` 深拷贝）；新增/编辑保存时透传 `epp_runtime` 到 `state.allRows`。

### 3.3 `prototype-design/assets/js/mock-data.js`

- `epp-cluster-a` 增 `epp_runtime`（`check`：`disabled:false`/`1s`/`5`/`30s`/`3`；`timeout`：`300ms`/`2s`）；`epp-cluster-b` 增 `epp_runtime: null`（演示未配置态）。

### 3.4 原型同步（2026-10-13，随 UI 代码 Review 一并调整）

| 文件 | 变更前 | 变更后 |
| ---- | ---- | ---- |
| `assets/js/cluster-upsert.js` | 4 个 duration 字段为纯文本输入（`placeholder="2s"` 等），7 个字段全带 `helpIcon` | 4 个 duration 字段改用复合控件：数字输入 + 单位下拉（`ms`/`s`/`m`，单位区主色蓝底）；切单位换算数值保持物理时长（`500ms` → `s` = `0.5s`）；组合写法（如 `1m30s`）回退纯文本输入；仅保留 3 个 `helpIcon`（关闭后台健康检查、冷却时长、调用超时） |
| `assets/js/cluster-upsert.js` | `parseDurationMs` 拒绝 `+1s`、`1.s`、`.5s` | 与 `time.ParseDuration` 语法对齐（新增 `durationParts`/`durationFieldHtml`/`formatDurationNum` 辅助函数） |
| `assets/js/cluster-upsert.js` | `syncFromDom` 直接读 `.proto-field` 值 | 带 `data-duration="1"` 的字段按「数字 + 单位」拼成 duration 字符串（空输入归一为空串） |

---

## 4. UI 代码变更（`src/`，已实施，待 Review）

| 文件 | 变更点 | 验收要点 |
| ---- | ---- | ---- |
| `src/components/DurationInput/index.vue`（新增） | duration 专用输入控件：`Input` + `slot="append"` 内嵌单位 `Select`（`ms`/`s`/`m`），`v-model` 绑定 duration 字符串；切换单位时**换算数值保持物理时长不变**（`500ms` → `0.5s`）；组合写法（如 `1m30s`）自动回退为原始文本框 | 输入 `1.5` 提交 `1.5s`；`500ms` 切 `s` 得 `0.5s`；`1m30s` 可正常回读与保存 |
| `src/modules/Clusters/components/GatewayConfig.vue` | 「EPP 运行时参数」分组：4 个 duration 字段改用 `DurationInput`（间隔/冷却默认单位 `s`，连接超时默认 `ms`），2 个阈值保持 `InputNumber`；`prop` 挂校验规则（duration `>0`、阈值 `>=1`）；`parseDurationMs` 与 Go `time.ParseDuration` 语法对齐 | 非法值表单内报错拦截；填 `0` 报错而非静默取默认值 |
| `src/modules/Clusters/components/index.vue`、`Clusters/index.vue` | `balanceModeData` 增 `epp_runtime`；编辑取数回填、提交体带回（未设置不传） | `POST`/`PATCH` 体含 `epp_runtime`；回读一致 |
| `src/modules/Clusters/components/Review.vue` | 审核页在 `balance_mode==='EPP'` 时展示运行时参数行；未配置显示「未配置（BFE 补默认）」 | 审核页展示与表单一致 |
| `src/i18n/zh.js` / `en.js` | 新增 `gatewayConfig` 下 EPP 运行时参数文案（分组标题 + 7 个字段 label/invalid 文案）；删除 4 个字段的 hint/placeholder 文案 | 无缺失 key；无冗余 key |

---

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| `cert` 全模块 21 条（`tests/cert/` 8 个 spec；编号 CM-C-01~CM-C-19、CM-J-01） | 跳过 | 证书管理模块 2026-09-11 随菜单移除、UI 入口已不存在，用例断言前提整体作废；条目保留不删除，模块重新上线时恢复。索引：[cert-management 00-索引与映射](../../../../ai-gateway-web-test/docs/cert-management/02-功能测试用例/00-索引与映射.md) |
| `RM-BC-56` | 微调 | LLM 配置区 `.llm-section-card` 数断言滞后：2026-10-10 追加「上游错误归一」Card 后由 6 → 7（EPP 模式下 9）；2026-10-15 已改标题/预期/断言（`tests/cluster/test_07_business_cluster_key_policy.spec.js`、02b/02d/03 文档、[测试问题复盘](../../../../ai-gateway-web-test/docs/business-cluster/测试问题复盘.md) CASE-LAG-01），编号与优先级不变 |
| `MP-T-01` | 微调 | 价格 Card 配置块数断言滞后：2026-10-10 同一 Card 内新增第三块「批量折扣系数」（`batch_discount`，仅 `mode != batch` 渲染）；2026-10-15 已改（`tests/model-prices/test_06_model_price_tier.spec.js`、`02-功能测试用例/05-分时段价格.md`），编号与优先级不变（模型定价侧受影响用例） |

> 说明：本次变更（EPP 运行时参数）只在既有 EPP 配置卡内新增字段，未推翻既有断言（RM-BC-115~122 为本次新增用例，见 §6）；上表三条为 2026-10-15 全量回归暴露的「陈旧用例」回填——它们由同期其它变更（2026-09-11 模块移除、2026-10-10 上游错误归一 / 批量折扣系数）造成，按本骨架统一留痕，避免继续静默腐烂。

## 6. 下游影响（阶段 3/4/5 输入）

- **02 文档（已完成，2026-10-13 评审通过）**：`ai-gateway-web-test/docs/business-cluster/` 更新——新增 RM-BC-122（duration 复合控件交互），RM-BC-115 / 117 / 119 / 121 同步控件形态与校验文案断言（含「填 0 不得静默取默认」「清空=未设置」「`+1s`/`1.s`/`.5s` 合法」），`03-字段校验矩阵.md` 补具体报错文案与边界样本；顺带修正三处历史遗留（统计口径按 00 索引「在用用例」拉齐为 85 个 / P0 16 / P1 69；00 自动化映射表补「生命周期 / 最近通过」列；场景一补「生命周期」列并修正 `RM-BC-73/75/92` 跨步骤重复引用），并清理遗留空目录 `docs/gateway-pool/`。RM-BC-115~122 生命周期置为「已评审」。
- **测试（已完成，2026-10-13）**：`tests/cluster/test_09_business_cluster_balance_mode.spec.js` 追加 RM-BC-115~122 的 8 个 describe（新增 `pages/resource/BusinessClusterPage.js` 的「EPP 运行时参数」封装并导出，`DOC_BUSINESS_CLUSTER` 补 label/文案常量）。最终全量执行 **24/24 通过**（6.6m），RM-BC-115~122 生命周期均为 `已通过（2026-10-13）`；报告 `report/test-report.md`。执行中发现并对齐两项：BUG-BC-01（「可折叠」为原型遗留措辞 → 修订 02/原型为普通卡片、删断言）、BUG-BC-02（数字框显示残留 → 修复 + 补断言），详见 `ai-gateway-web-test/docs/business-cluster/测试问题复盘.md`。
- **用户手册（已完成，2026-10-13/14）**：`ai-gateway-web/docs/zh-cn/` 全量同步——本章（`04`）EPP 部分刷新为 v0.6 命名（`实例负载画像`/`亲和强度`）+ 补齐 4 个调度字段 + 「EPP 运行时参数」升为正式小节并补本轮控件/校验语义（数字+单位复合控件、切单位保时长、填 `0` 拦截、清空=未设置、`+1s`/`1.s`/`.5s` 合法）+ 内文节号改 4.x；同批完成手册整体纠错与补齐（内文节号统一为文件名前缀、新增 6 章 `15`~`20`、`00-README`/`02-overview` 按真实菜单重建、`12` 章加厚、`13`/`14` 补 EPP 与治理能力条目、新增 26 张截图）。校验：图片引用缺失 0、链接锚点问题 0、旧痕迹清零、菜单三方一致。另新增**离线 HTML 站点构建**：`docs/scripts/build-manual-site.js`（零依赖）→ 产物 `docs/zh-cn/site/`（入口 `site/index.html`，24 个 html + 86 张图，内部链接 740 条校验问题 0）。

---

## 7. 注意事项

1. **`tls`/`breaker` 不设入口**：前端不渲染 `epp_runtime.tls`/`breaker`，用户无法配置；后端固定下发 `{Plaintext:true}`/`{Disabled:true}`，携带即 422。UI 校验与后端一致，避免提交被拒。
2. **未配置 ≠ 空对象**：`check`/`timeout` 整体未配置时后端不下发、由 BFE 补同样的默认值；UI 未配置态展示「未配置（BFE 补默认）」，不误显示为「全默认值已落盘」。
3. **整体替换语义**：`PATCH` 传入即整体替换存储值（未设置子字段按默认补齐），satisfy「不传则保留」；UI 提交时若用户清空了 EPP 模式下的 `epp_runtime` 需明确是否提交（对齐原型行为）。
4. **WRR 休眠保留**：`balance_mode=WRR` 时 `epp_runtime` 保留但不生效、不导出；非空仍做校验（与 `epp_config` 一致）。

---

## 8. 验收与偏差（2026-10-13 · UI 代码 Review 阶段）

**设计选择（用户确认，原型已同步，见 §3.4）**

1. **duration 字段控件形态**：4 个 duration 字段（`check_interval`/`cooldown`/`timeout.connect`/`timeout.call`）由纯文本输入改为一体式「数字框 + 单位下拉（`ms`/`s`/`m`）」复合控件（`src/components/DurationInput/`），单位区主色蓝底；提交值仍为 Go duration 字符串，后端契约不变。
2. **单位切换语义**：切换单位时换算数值保持物理时长不变（`500ms` → `s` = `0.5s`），而非保留数字重解释单位（后者会把 `500ms` 变成 `500s`，静默放大 1000 倍）。
3. **说明图标精简**：7 个字段仅保留 3 个语义不直观的 `helpIcon`（关闭后台健康检查、冷却时长、调用超时），其余 4 个（间隔、失败/成功阈值、连接超时）去掉。

**校验实现修复（与 `clusters.md` 合法性条件对齐）**

1. **`>0` 约束此前可被绕过**：原实现中数值 ≤ 默认最小值时会提交空串，被 `buildEppRuntime` 当作「未设置」补默认值——用户填 `0` 保存后实际落盘 `2s`，既不报错也不生效。现改为：仅**输入框为空**才算未设置（按「未设置子字段按默认补齐」提交空串），非空非法值原样提交并报错。
2. **前端解析器比后端严**：`parseDurationMs` 原先拒绝 `+1s`、`1.s`、`.5s` 等 Go 合法写法，导致通过 API 写入这类值的集群在编辑页**无法保存**（改动任意无关字段也校验失败）。已与 `time.ParseDuration` 语法对齐，并用 21 个用例与 Go 实测逐一比对。
3. **小数输入被自身回灌抹掉**：组件 emit 的值经父组件写回 `value` 后触发重新归一化，输入 `1.` 被解析回 `1`，继续输入 `5` 得到 `15` → 提交 `15s`（期望 `1.5s`），静默 10 倍错误。已加 `lastEmitted` 回灌守卫修复。

**验收记录（2026-10-13 实机验证）**

- 原型（`cluster-wizard` 编辑 `epp-cluster-a`）：4 个 duration 字段渲染为「数字 + 单位」复合控件，回读值拆分为 `1`/`s`、`30`/`s`、`300`/`ms`、`2`/`s`；`?` 图标仅剩 3 个。
- 单位切换 `300ms` → `s`：输入框变 `0.3`，审核页显示「连接超时: 0.3s」（物理时长不变）。
- 填 `0` 后提交：toast 报「健康检查间隔须为合法的 Go duration 且 > 0（如 2s）」并拦截提交，不再静默取默认值。
- UI 代码侧：逐字符模拟验证 `1.5` → `1.5s`、`500ms` 切 `s` → `0.5s`、`2s` 切 `ms` → `2000ms`、`1m30s` 组合写法进出回退态正常；ESLint 与 `npm run build` 通过。

**测试执行后的追加处置（2026-10-13，用户决策）**

1. **卡片折叠措辞修订**：测试发现「EPP 运行时参数」在 UI 为普通 `Card`，而 02 与原型写作「可折叠分组」。经确认属原型遗留描述（原型中的 `▾` 从未接线），按方案②修订：02（`02b` §2b-2 导语、RM-BC-115 步骤/预期）与原型 `cluster-upsert.js` 均改为「普通卡片（不提供折叠开关）」，并删除对应折叠断言（`test_09` 步骤 8 与 `BusinessClusterPage.expectEppRuntimeCollapsible`）。同类偏差「流控配置」卡片一并修订（02b/02d/00 索引与原型）。
2. **`DurationInput` 显示残留修复**：非法字符被清洗后，iView `Input` 在 `value` prop 未变化时不回写 DOM，导致输入框残留原始字符（如 `-abc`）。已在 `onNumInput` 清洗后强制回写 DOM（`$refs.combo`），并在 `test_09` RM-BC-122 步骤 5 增加「字母不进入输入框」断言。

**遗留（未处理，供后续决定）**

- duration 无上限：超出 Go `int64` 纳秒范围（约 292 年）的值前端放行、后端返回 422，非表单内报错。
- 「模型定价」操作列宽度固定 `240`，只读视角仅剩「详情」按钮时右侧留白。