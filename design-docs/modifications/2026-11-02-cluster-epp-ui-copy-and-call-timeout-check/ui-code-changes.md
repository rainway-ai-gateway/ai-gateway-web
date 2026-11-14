# UI 代码变更：集群 EPP 配置文案统一（在飞→执行中）与调用超时跨字段校验

> **日期**: 2026-11-02 ｜ **前置**: [2026-10-12 EPP 运行时参数](../2026-10-12-epp-runtime-params/ui-code-changes.md)（`epp_runtime` 表单与校验机制）、[2026-10-03 AI 上下文缓存语义](../2026-10-03-ai-context-cache-semantic/ui-code-changes.md)（`running_requests_max` 字段引入）｜ **上游依据**: 无接口变更（两项均为纯前端调整）；已核对 `ai-gateway-api/design-docs/api-define/OpenAPI接口定义/clusters.md`：API 侧对 `timeout.call` 仅要求「`>0` 的合法 duration」，**未定义**「调用超时 > max(队列 TTL, 无端点队列 TTL)」的跨字段约束，本次校验为前端新增
> **对照接口**: `clusters.md`（`epp_config.flow_control.queue_ttl` / `no_endpoint_queue_ttl`、`epp_runtime.timeout.call`，字段本身无变化）｜ **对照原型**: 原型未同步（`prototype-design/assets/js/cluster-upsert.js` 仍为旧文案，见 §5）
> **状态**: 原型 ⬜ · UI 代码 ✅（已构建并同步 `ai-gateway-runtime/static/`，浏览器强刷生效）· 02 文档 ✅ · 手册 ⬜ ｜ **菜单/路由变更**: 无

本轮为 2 项相互独立的集群配置（`GatewayConfig.vue`）前端调整：① 将 EPP 准入水位中的「在飞请求数过滤阈值」统一改名为「执行中请求数过滤阈值」（连同提示、校验报错中的「运行中请求数」一并统一为「执行中请求数」）；② 负载均衡模式为 `EPP` 时新增跨字段校验：**调用超时须大于队列 TTL（秒）与无端点队列 TTL（秒）的最大值**。两项均不新增/修改任何接口字段，后端零改动。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 | 验证 |
| ----------- | -------- | ---- | ---- |
| 集群配置 · EPP 准入水位（`GatewayConfig.vue`） | `runningRequestsMax` 三处文案「在飞/运行中请求数」→「执行中请求数」 | ✅ UI | ✅ 构建产物 grep 验证旧文案 0 残留 |
| 集群配置 · EPP 运行时参数（`GatewayConfig.vue`） | 新增跨字段校验器：`balance_mode=EPP` 时要求 `epp_runtime.timeout.call`（按 Go duration 解析为毫秒）严格大于 `max(queue_ttl, no_endpoint_queue_ttl)` 秒 | ✅ UI | ✅ lint 通过；构建产物含新 i18n key |
| 02 文档（`docs/zh-cn/03-ai-business-cluster.md`） | 同步两处：§3.6 表「在飞请求数过滤阈值」行改名；「调用超时」校验规则列补充跨字段约束 | ✅ 文档 | — |
| 原型（`prototype-design/`） | 未同步：`cluster-upsert.js` 仍为「在飞请求数过滤阈值」旧文案 | ⬜ | — |
| 手册（`ai-gateway-user-manual/`） | 未涉及（手册无该字段文案） | ⬜ | — |

## 2. 接口变更（diff）

无。两项变更均为纯前端：

- ① 仅改 `src/i18n/zh.js` 中文文案，`running_requests_max` 字段名、取值、提交结构不变；英文文案本即为 `Running Requests Filter Threshold`，未动。
- ② 仅新增前端表单校验，`epp_config.flow_control.queue_ttl` / `no_endpoint_queue_ttl` / `epp_runtime.timeout.call` 的请求结构与后端校验（各自 > 0 / ≥ 0 duration 校验）不变；**API 文档未定义该跨字段约束**，属 UI 先于 API 落地的产品规则，后续若 api 侧强制需在 `ai-gateway-api/design-docs` 补记。

## 3. UI 代码变更（`src/`，已实施）

| 文件 | 变更点 | 验收要点 |
| ---- | ---- | ---- |
| `src/i18n/zh.js` | `runningRequestsMax` / `runningRequestsMaxTip` / `runningRequestsMaxInvalid`：「在飞请求数过滤阈值」「运行中请求数」统一为「执行中请求数（过滤阈值）」（`:1022-1024` 附近） | EPP 准入水位卡片显示「执行中请求数过滤阈值」 |
| `src/i18n/zh.js` | 新增 `eppCallTimeoutVsQueueTtlInvalid`：'调用超时需大于队列 TTL（秒）与无端点队列 TTL（秒）的最大值（{max} 秒）' | 校验失败时错误信息带当前要求的最大值 |
| `src/i18n/en.js` | 新增 `eppCallTimeoutVsQueueTtlInvalid` 英文对应文案 | 英文界面同源展示 |
| `src/modules/Clusters/components/GatewayConfig.vue` | 新增 `validateEppCallTimeoutVsQueueTtl` 跨字段校验器（data 作用域，`validateEppRuntimeDuration` 之后）：仅 `balance_mode === 'EPP'` 时生效；TTL 空值按默认 `60`（无端点 TTL 空跟随队列 TTL）；两者均为 `0`（禁用驱逐）时跳过；调用超时留空按默认 `3s` 参与比较；要求 `parseDurationMs(call) > ttlMax * 1000`（严格大于） | 默认配置（TTL 60s / call 3s）提交被拦截并提示须大于 60 秒；TTL 均 0 时不拦截 |
| 同上 | 新增 `revalidateEppCallTimeout` helper；`validateQueueTtl` / `validateNoEndpointQueueTtl` 在各出口调用，使修改 TTL 后立即重新校验调用超时字段 | 调大 TTL 后调用超时输入框即时出现/更新错误提示 |
| 同上 | `rules['epp_runtime.timeout.call']` 追加 `{ validator: validateEppCallTimeoutVsQueueTtl, trigger: 'change' }`（原 blur duration 校验保留） | 直接修改调用超时即触发跨字段校验；提交时全量复跑可兜底 |

### 3.1 规则细节与取舍（文档未明确处，按语义裁定）

- **约束方向**：按需求原文「需大于」取**严格大于**（`call > max`，等于不通过）。
- **TTL 取默认值参与比较**：表单清空队列 TTL 提交时按默认 `60s` 补齐（`buildEppRuntime` 同语义），故留空按 `60` 计；无端点队列 TTL 留空跟随队列 TTL。
- **TTL 均为 0 跳过**：`queue_ttl = 0` 为显式禁用驱逐（见 `clusters.md` 与 02 文档），排队预算不再约束调用超时。
- **调用超时留空按默认 `3s` 拦截**：因默认 TTL 60s > 3s，默认配置现无法直接提交，须将调用超时调至 60s 以上——这是本校验的产品效果（约束先于默认值设计存在），如后续产品裁定「默认值组合应合法」需回退此项。

## 4. 文档同步

- `docs/zh-cn/03-ai-business-cluster.md` §3.6 表：`在飞请求数过滤阈值` 行 → `执行中请求数过滤阈值`（说明列「运行中请求数」同步改「执行中请求数」）。
- 同文件 §3.6 EPP 运行时参数表：`调用超时` 校验规则列补充「`EPP` 模式下还须大于队列 TTL（秒）与无端点队列 TTL（秒）的最大值（两者均为 `0` 即禁用驱逐时不约束）」。
- 未同步：`design-docs/prototype-design/assets/js/cluster-upsert.js` 仍用旧文案（原型属设计资产，按需跟进）。

## 5. 验收清单

- [x] 集群配置 → 均衡模式 `EPP` → 准入水位显示「执行中请求数过滤阈值」，提示/报错同源。
- [x] `EPP` 模式下，队列 TTL=60 / 无端点 TTL=60 / 调用超时=3s 时提交被拦截，错误信息为「…最大值（60 秒）」。
- [x] 将调用超时改为 61s 后校验通过；将两个 TTL 均改为 0 后 3s 也可通过。
- [x] `WRR` 模式下不触发该校验（规则内 `balance_mode` 守卫）。
- [x] `npm run lint`（eslint --quiet）通过；`npm run build`（Node 20）成功并同步 `ai-gateway-runtime/static/`。
- [ ] 原型资产文案同步（`cluster-upsert.js`，低优先级）。
