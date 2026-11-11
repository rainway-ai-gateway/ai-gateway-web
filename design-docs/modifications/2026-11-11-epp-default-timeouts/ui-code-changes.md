# UI 代码变更：EPP 默认超时参数调整（队列 TTL 9s / 调用超时 11s）

> **日期**: 2026-11-11 ｜ **上游依据**: 集群 EPP 参数约束——`epp_runtime.timeout.call` 须大于 `max(flow_control.queue_ttl, flow_control.no_endpoint_queue_ttl)`；原默认组合（TTL 60s / call 3s）不满足约束 ｜ **对照接口**: `ai-gateway-api` 同步调整（`DefaultEppCallTimeout` 3s→11s、`flow_control` 缺省 9s，见 api `design-docs/modifications/2026-11-11-epp-default-flow-control-timeouts/`）——**字段本身与校验规则不变，仅默认值变化**
> **对照原型**: 无结构变更
> **状态**: 原型 N/A · UI 代码 ✅（eslint + 构建 + 集群用例）· 02 文档 ✅ · 手册 ⬜ ｜ **菜单/路由变更**: 无

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 验证 |
| ----------- | -------- | ---- |
| 集群配置 · 流控（`GatewayConfig.vue`） | `defaultEppConfig().flow_control` 的 `queue_ttl` / `no_endpoint_queue_ttl`：60 → **9** | 集群用例 |
| 集群配置 · EPP 运行时（`GatewayConfig.vue`） | `defaultEppRuntime().timeout.call`：`3s` → **`11s`** | 集群用例 |
| 同一文件的回读/提交兜底 | `applyBalanceModeData` 与 `buildEppConfig` 里 `queue_ttl`/`no_endpoint_queue_ttl` 未填时的硬编码兜底 `60` 改为 `defaultEppConfig().flow_control.*`（=9），避免回读/提交路径又回到旧值 | 用例断言 |
| 复查页（`Review.vue`） | `displayEppFlowControl` 兜底 60 → 9；`displayEppRuntime` 的 `call` 兜底 `3s` → `11s` | 用例断言 |
| `src/i18n/zh.js` / `en.js` | `queueTtlTip` / `eppCallTimeoutTip` 文案中的默认值同步为 9 / 11s，并提示两者大小关系 | — |
| `docs/zh-cn/03-ai-business-cluster.md` | 流控「队列 TTL（秒）」默认 `60`→`9`；EPP 运行时「调用超时」默认 `3s`→`11s` | — |

## 2. 接口变更（diff）

无字段变化。仅默认值语义变化：新建 EPP 集群不修改任何参数时，提交体为 `flow_control.queue_ttl=9`、`no_endpoint_queue_ttl=9`、`epp_runtime.timeout.call="11s"`（11 > 9，满足约束）。

## 3. 规则细节与取舍

- **只改默认值，不动校验**：跨字段校验（call 严格大于 max(TTL)，TTL 双 0 豁免）保持原样。
- **兜底值集中到 `defaultEppConfig()`**：原先 `applyBalanceModeData`（新建/切换均衡模式回读）与 `buildEppConfig`（提交前组装）各自硬编码 `60`，与 `defaultEppConfig()` 重复；本次统一引用默认值，避免后续再出现「改了一处、另一处仍是旧值」。
- **兼容性**：仅影响新建集群与未传参的写入；存量集群已存值不变，显式传旧值（如 TTL 60 + call 3s）仍按原值下发。

## 4. 既有用例影响

`ai-gateway-web-test` 已同步：

- `pages/resource/ResourcePageCommon.js`：`defaultFlowControl` 60/60→9/9、`defaultEppRuntime.timeout.call` `3s`→`11s`；
- `pages/resource/BusinessClusterPage.js`：`expectEppRuntimeDefaultValues` 的调用超时默认断言改 11s；
- `tests/cluster/test_17_business_cluster_epp_runtime.spec.js`：默认补齐断言改 11s；UI 侧「改回合法值」由 3s 改 11s（3s 已小于默认 TTL 9s）；
- `tests/cluster/test_20_business_cluster_epp_call_timeout_vs_queue_ttl.spec.js`：原「默认值被拦截」用例改为**显式填 TTL 60/60 + call 3s** 构造拦截；新增「默认值组合（9/9 + 11s）不调参即可提交，提交体为 9/9/11s」用例。

回归：`test_20` 3/3 通过；`test_17` 全量通过。

## 5. 验收清单

- [x] `npx eslint` 通过、`npm run build` 通过（仅既有包体积告警）。
- [x] 新建 EPP 集群：流控显示 `9`/`9`、EPP 运行时显示 `11`（秒），无需调参即可进入复查并提交。
- [x] 提交体：`flow_control.queue_ttl=9`、`no_endpoint_queue_ttl=9`、`epp_runtime.timeout.call="11s"`。
- [x] 显式填 TTL 60/60 + call 3s 仍被跨字段校验拦截；TTL 双 0 仍豁免。
- [ ] 手册（`ai-gateway-user-manual`）EPP 默认值描述同步。