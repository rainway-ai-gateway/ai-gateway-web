# UI 代码变更：集群推理内容补齐协议（ensure_reasoning_content）

> **日期**: 2026-11-04 ｜ **前置**: [2026-11-03 缺价处置动作](../2026-11-03-price-miss-action-report-price-miss-and-quota-cap/ui-code-changes.md)（同卡片、同落地路径）｜ **上游依据**: `ai-gateway-api` `71e2513`，`e7fc774 feat(cluster): 新增 llm_config.ensure_reasoning_content，并解除 bfe_tls 依赖与 provider 协议收窄缺口`（modifications `2026-11-03-cluster-reasoning-content-protocols`）；配套 `2026-11-03-provider-protocol-narrowing-guard`：provider 收窄 `model_protocols` 时若被集群 `ensure_reasoning_content` 引用返回 409。api-define 已按 e2e 工作流阶段 1.6 同步（`clusters.md` 新增字段行、`providers.md` 收窄校验说明、`00-common.md` 例外清单更新）
> **对照接口**: `clusters.md` `llm_config.ensure_reasoning_content`（[]string，非必填，缺省或空数组=关闭；元素仅允许 `openai`/`anthropic`；不得为空或重复；每个元素必须在该 cluster 所属 provider 的 `model_protocols` 内，provider 未声明按 `["openai"]` 对待）｜ **对照原型**: 本轮已同步修改（`prototype-design/assets/js/cluster-upsert.js`）
> **状态**: 原型 ✅ · UI 代码 ✅（lint 通过，构建验证）· 02 文档 ⬜（待新增 RM-BC-126）· 手册 ⬜ ｜ **菜单/路由变更**: 无

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 验证 |
| ----------- | -------- | ---- |
| 集群创建/编辑向导 · 大模型配置（`GatewayConfig.vue`） | 「推理内容补齐协议」iView Select 多选（openai/anthropic），? 提示（含空选=关闭语义），placeholder 留空（2026-11-04 用户决策：不在 placeholder 里塞语义说明）；前端校验（枚举/空元素/重复/须在所属服务商协议内，provider 未声明按 `["openai"]`）；编辑回读；提交恒下发数组 | lint + 构建 |
| 向导提交组装（`components/index.vue`） | `formatLlmConfigForApi` 白名单新增 `ensure_reasoning_content`（**吸取 price_miss_action 白名单漏加被静默丢弃的教训，本次直接核对**） | lint + 构建 |
| 复查&检查 / 详情（`Review.vue`，两处共用） | 新增「推理内容补齐协议:」行，数组 `join(', ')`，空展示 `-` | lint + 构建 |
| `src/i18n/zh.js` / `en.js` | 标签、? 提示、两条校验文案（通用非法 / 不在服务商协议内，带 `{proto}`/`{protocols}` 插值） | — |
| 原型（`cluster-upsert.js`） | 表单多选（checkbox 组）、数据初始化/回读（空数组默认）、复查行、validateGateway 四项校验、勾选事件写回 | `node --check` |

## 2. 接口变更（diff）

api 新增可选字段（无破坏性）：`llm_config.ensure_reasoning_content []string`。空数组=关闭；非法元素/重复/越出 provider 协议由 api 422 拦截（消息英文，如 `ensure_reasoning_content %q not supported by provider %s (model_protocols=%v)`）。配套 provider 侧：PATCH `model_protocols` 显式传入按全量替换，**收窄**时被集群 `ensure_reasoning_content` 引用返回 409（`provider %s model_protocols %s is referenced by cluster %s ensure_reasoning_content`）；放宽不受限。

## 3. 规则细节与取舍

- **字段文案定为「推理内容补齐协议」**（2026-11-04 用户决策）：api 变更文档的用户向命名为「思考模式推理内容补齐」，BFE 机制为「推理内容归一化」；UI 标签取「推理内容补齐协议」——简洁且修饰关系明确（"推理内容补齐"作用于"协议"列表），`reasoning_content` 英文术语保留在 ? 提示首句供精确对照，避免直译字段名造成的「补齐…的协议」歧义。
- **前端预校验 provider 协议范围**：provider 详情（`selectedProvider.model_protocols`）前端已加载，切换 provider 时联动校验，错误文案中文并列出服务商实际协议列表；后端 422 为最终兜底。
- **空数组显式下发**：与 price_miss_action 的「新建显式落值」同思路——恒下发数组（默认 `[]`），避免「未设置」与「显式关闭」在存储层歧义。
- **provider 未声明协议按 `["openai"]` 对待**：前后端同口径（clusters.md 明确），前端校验与后端一致。
- **provider 收窄 409**：UI 统一 `$request` 错误处理直接 toast 后端英文消息并保持编辑态，链路现成不改代码；补测试用例断言（阶段 3）。

## 4. 既有用例影响

`npm run impact-scan -- reasoning_content ensure_reasoning`：**无命中**（既有用例文档/代码未涉及该字段）。集群 spec 提交体断言均为字段级（`body.xxx.toBe(...)`），新增字段不影响；**待新增用例（阶段 3）**：RM-BC-126（默认关闭/提交体/编辑回读/校验拦截/provider 联动）、provider 收窄 409 提示用例。

## 5. 验收清单

- [x] 新建向导默认空选（=关闭），提交体 `llm_config.ensure_reasoning_content` 为数组。
- [x] 勾选 openai+anthropic 提交体正确；编辑存储值回显。
- [x] 选择 anthropic 但 provider 协议不含时前端校验拦截（文案列出服务商协议）。
- [x] `formatLlmConfigForApi` 白名单含新字段（提交链路全透传）。
- [x] lint 通过、构建成功。
- [ ] 浏览器复验（提交前）：多选交互、复查行展示。
- [ ] 02 文档：新增 RM-BC-126 + provider 收窄 409 用例（阶段 3）。
