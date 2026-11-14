# UI 代码变更：集群 Key 惩罚时长配置（key_affinity.penalty_ttl_429 / penalty_ttl_auth）

> **日期**: 2026-11-04 ｜ **前置**: [2026-11-04 集群推理内容补齐协议](../2026-11-04-cluster-ensure-reasoning-content/ui-code-changes.md)（同卡片路径）｜ **上游依据**: `ai-gateway-api` `c58108a`，`50899c7 feat(cluster): key_affinity 支持惩罚时长配置（issue #1448）`（modifications `2026-11-04-issue-1448-key-penalty-ttl`）；背景：10-22 kimi 集群事故——401 惩罚 3600 秒写死在数据面、存 Redis、重启 BFE 无法清除。api-define 已按 e2e 工作流阶段 1.6 同步（`clusters.md` 两字段 + InnerAPI `server-data-conf.md`）
> **对照接口**: `clusters.md` `llm_config.key_affinity`：`penalty_ttl_429` int（秒，默认 60，传入须 `[10, 600]` 整数）、`penalty_ttl_auth` int（秒，默认 300，传入须 `[60, 1800]` 整数）；**`0`/负数/越界一律 422，`0` 不表示关闭**；不填=默认值（控制面入库前补默认）｜ **对照原型**: 本轮已同步（`cluster-upsert.js`）
> **状态**: 原型 ✅ · UI 代码 ✅（lint 通过，构建部署，API curl 验证）· 02 文档 ⬜（待新增 RM-BC-127）· 手册 ⬜ ｜ **菜单/路由变更**: 无

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 验证 |
| ----------- | -------- | ---- |
| 集群创建/编辑向导 · Key 亲和性卡片（`GatewayConfig.vue`） | `Key 惩罚=启用` 时新增两个 InputNumber：429 惩罚时长（10–600，默认 60）、401/403 惩罚时长（60–1800，默认 300）；范围校验（change 触发，停用/关闭惩罚时跳过）；编辑回读按存储值（无则默认）；提交按默认补齐 | lint + 构建 + curl |
| 复查&检查 / 详情（`Review.vue`） | Key 亲和性卡片内，`Key 惩罚=启用` 时新增两行展示两时长 | lint + 构建 |
| `src/i18n/zh.js` / `en.js` | 两个标签 + 两条校验文案 | — |
| 原型（`cluster-upsert.js`） | 表单两个数字框（`penalty_enable=开启` 时显示，带 helpIcon 范围说明）、数据初始化/回读（默认 60/300）、复查行、validateGateway 范围校验 | `node --check` |

## 2. 接口变更（diff）

api 在 `llm_config.key_affinity` 新增两个可选 int 字段（无 DDL、无破坏性）：`penalty_ttl_429` ∈ [10,600] 默认 60、`penalty_ttl_auth` ∈ [60,1800] 默认 300；`0`/负数/越界 422（消息如 `penalty_ttl_429 must be in [10, 600]`）；缺省由控制面补默认值后入库/导出。变更文档明确「Web 表单与默认值由前端单独跟进」——本批即该跟进。

## 3. 规则细节与取舍

- **`0` 不表示关闭**：与 `ttl`（InputNumber min=1）不同，两时长字段的「关闭」语义由 `penalty_enable` 承担；校验器对 `0`/负数/越界一律拦截，? 提示与校验文案均注明范围。
- **文案准确性**：鉴权档标签为「401/402/403 惩罚时长」——覆盖 401/402/403 三档（首版漏 402，已修正，与 api 文档 `penalty_ttl_auth` 口径一致）；两字段均带 ? 提示（范围 + 默认值 + 「0 不表示关闭」）。
- **留空 = 默认值**：校验器对空值放行，提交时按 60/300 补齐（与 api「不填=默认值」同口径）；表单默认值即 60/300，正常路径不会留空。
- **条件渲染**：两字段仅在 `key_affinity.enabled && penalty_enable` 时渲染（与 redis_prefix/ttl 同一条件模式），校验器同步跳过关闭状态，避免隐藏字段拦截提交。
- **编辑回读**：存量集群（存储无该字段）回读默认 60/300，随 PATCH 落库。

## 4. 既有用例影响

`npm run impact-scan -- penalty_ttl 惩罚时长`：**无命中**。集群 spec 提交体断言均为字段级；Key 亲和性既有用例（RM-BC-87~91，test_08）造数走 UI 提交，新增两字段随默认补齐进入提交体，字段级断言不受影响。**待新增用例（阶段 3）**：RM-BC-127（默认 60/300 落值 / 边界 10、600、60、1800 通过 / 0、越界拦截 / 关闭惩罚时隐藏且不校验 / 编辑回读）。

## 5. 验收清单

- [x] 新建向导 Key 惩罚启用时显示两输入框，默认 60 / 300；提交体 `key_affinity.penalty_ttl_429=60`、`penalty_ttl_auth=300`。
- [x] 越界/0 被前端校验拦截；后端 422 兜底（curl 实测：`penalty_ttl_429=5` → 422）。
- [x] 关闭 Key 惩罚时两字段隐藏、不触发校验、提交体仍含默认值。
- [x] 编辑存量集群回显默认 60/300。
- [x] lint 通过、构建部署、api 部署 `c58108a`（8183 验证）。
- [ ] 浏览器复验（提交前）。
- [ ] 02 文档：新增 RM-BC-127（阶段 3）。
