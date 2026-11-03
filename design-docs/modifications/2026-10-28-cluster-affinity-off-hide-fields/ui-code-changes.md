# UI 代码变更：集群 EPP 配置 affinity=off 时隐藏亲和性字段

> **日期**: 2026-10-28 ｜ **前置**: [2026-10-26-provider-instance-source-submit-fix](../2026-10-26-provider-instance-source-submit-fix/ui-code-changes.md) ｜ **上游依据**: 无接口变更（`clusters.md` `epp_config.affinity` 语义未变：`off` 时不注入亲和 scorer，即使特性开关为 `true`）
> **对照接口**: [clusters.md](../../api-define/OpenAPI接口定义/clusters.md) §epp_config ｜ **对照原型**: `prototype-design/pages/cluster-wizard.html` + `assets/js/cluster-upsert.js`
> **状态**: 原型 ✅ · UI 代码 ✅（lint 通过） · 02 文档 ✅（同步微调 + BUG-BC-03 口径校准） · 测试 ✅（2026-10-28 实跑：`test_09` RM-BC-96/97/98 + 新增 `test_11` RM-BC-123 全绿） · 手册 ⬜ ｜ **菜单/路由变更**: 无

集群向导「大模型配置」EPP 模式下,`affinity`（亲和强度）选 `off` 时,原交互为「`affinity` 字段名后橙色提示 + 两个亲和性字段名后追加『（off 时不生效）』后缀」,提示噪音大、易被忽略。改为:**`affinity=off` 时直接隐藏「前缀缓存亲和性」「会话亲和性」两个开关(及会话亲和 Header),不再展示任何 off 提示**。后端契约不变(`off` 时 scorer 不注入,字段值休眠保留、照常提交)。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 集群向导 › 大模型配置（EPP） | `affinity=off` 时隐藏「前缀缓存亲和性 / 会话亲和性」开关及会话亲和 Header,移除 off 提示文案 | 原型 ✅ / 代码 ✅ |

## 2. 接口变更（diff）

无。`epp_config.affinity=off` 时 `prefix_cache_affinity` / `session_affinity_enabled` 不注入 scorer 的语义不变;UI 值照常提交(后端忽略),与「休眠保留」口径一致。

## 3. 原型变更

| 文件 | 变更点 | 变更前 → 变更后 |
| ---- | ------ | --------------- |
| `assets/js/cluster-upsert.js` | off 提示 | `affinity` 标签后橙色提示「亲和强度为 off，不生效」→ 移除 |
| 同上 | 前缀缓存亲和性 | 标签后缀「（off 时不生效）」→ 移除;`affinity=off` 时整项不渲染 |
| 同上 | 会话亲和性 | 标签后缀「（off 时不生效）」→ 移除;`affinity=off` 时整项不渲染 |
| 同上 | 会话亲和 Header | 仅 `session_affinity_enabled=true` 展示 → 追加 `affinity !== 'off'` 条件 |

## 4. UI 代码变更（2026-10-28 已按本清单实现,`npm run lint` 通过）

### 4.1 `src/modules/Clusters/components/GatewayConfig.vue`

| 位置 | 改动 |
| ---- | ---- |
| `epp_config.affinity` FormItem 标签（约 554–571 行） | 移除 `affinity === 'off'` 时的橙色提示 span(`epp-off-hint`) |
| 「前缀缓存亲和性 + 会话亲和性」所在 `Row`（约 593 行） | 加 `v-if="formData.epp_config.affinity !== 'off'"`,off 时两个 FormItem 整体隐藏;两者标签上的 `affinityOffSuffix` 后缀 span 同步移除 |
| `session_affinity_header` 所在 `Col`(约 652 行) | `v-if` 追加 `affinity !== 'off'` 条件,避免 off 时该输入框单独残留 |
| `validateSessionAffinityHeader`(约 1229 行) | 早退条件追加 `affinity === 'off'`:off 时字段不渲染,字段级必填不触发 |
| `validateEppConfig`(约 1894 行,**BUG-BC-03 处置**) | 提交级仍要求「`session_affinity_enabled=true` 必须 Header 非空」(与后端 `EppConfigSimplified.Validate()` 契约一致,与 affinity 无关);当 `affinity === 'off'` 时改用新提示 `sessionAffinityHeaderRequiredWhenOff`——「亲和强度为 off 时会话亲和性不生效;请先将亲和强度切回 low/medium/high 填写 Header,或关闭会话亲和性」,解决字段被隐藏后无法就地补填的死角 |

### 4.2 `src/i18n/zh.js` / `en.js`

- 删除 `gatewayConfig.affinityOffHint`、`gatewayConfig.affinityOffSuffix`(两处后缀/提示的唯一使用点已移除;`epp-off-hint` 样式类保留,`enableEvictionDisabledHint` 仍在用)
- 新增 `gatewayConfig.sessionAffinityHeaderRequiredWhenOff`(zh/en):`affinity=off` 且会话亲和开启但 Header 为空时的提交级提示(可操作路径)

### 4.3 验收

- `npm run lint` 通过;
- 走查:EPP 模式 → affinity 选 off → 两个亲和性开关与 Header 消失、无任何 off 文案;切回 low/medium/high → 恢复展示且原值保留;off 时会话亲和已关闭时提交照常(值休眠保留);off 且会话亲和开启但 Header 为空时,「下一步」按后端契约拦截并提示可操作路径(BUG-BC-03 处置,`test_09` RM-BC-98 独立用例实测通过)。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| RM-BC-96(EPP affinity 下拉) | 微调 | 「off 时橙色提示」预期改为「off 时隐藏前缀缓存/会话亲和性字段」 |
| RM-BC-97(prefix_cache_affinity 开关) | 微调 | 「off 时追加『（off 时不生效）』」预期改为「off 时该字段整体隐藏」 |
| RM-BC-98(session_affinity 联动) | 微调 | 同上;Header 展示条件追加 affinity 判断 |
| **RM-BC-96/97/98 已微调;新增 RM-BC-123** | 微调 + 新增 | 2026-10-28 已落文档:`docs/business-cluster/02-功能测试用例/02d-大模型与校验.md` 中 RM-BC-96/97/98 预期改为「off 时整体隐藏、不出现任何 off 提示、值休眠保留、切回后恢复展示」,并补「off 时 Header 仅字段级必填不触发、提交级仍按后端契约拦截并给出可操作提示」;新增 **RM-BC-123(02d §2.123 / 锚点 `#2123-大模型配置条件项隐藏后自动补位无空白块`)** 覆盖「隐藏项不在 DOM + 同网格自动补位 + 无空白块 + 提交体不丢值」 |
| `docs/business-cluster/02-功能测试用例/02b-向导步骤.md` 字段表 | 微调 | 字段说明同步(2026-10-28 已随本记录一并更新);并补一句「条件项隐藏时同网格自动补位(flex 两列),无空白块」 |

## 6. 下游影响(阶段 3/4/5 输入)

- 02 文档:`business-cluster` 的 RM-BC-96/97/98 与 02b 字段表已同步微调(随本次一并完成)。
- 测试:`tests/business-cluster/` 中若有断言「（off 时不生效）」文案的用例,阶段 4 需按新交互(隐藏)改写;运行前用 `npm run impact-scan -- "off 时不生效" 亲和强度` 复核。
- 用户手册:`docs/zh-cn/03-ai-business-cluster.md`(大模型配置/EPP 章节,如有 off 提示截图或文案)需同步;菜单名称/层级/顺序未变,**章节无需重排**,阶段 5 重建 `site/` 并自检。
