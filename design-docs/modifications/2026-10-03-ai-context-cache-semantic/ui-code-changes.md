# UI 代码变更文档

> **对照接口**：`ai-context-rules.md`、`ai-context-settings.md`、`ai-cache-semantic-settings.md`（新模块）；`ai-cache-rules.md`、`clusters.md`、`report.md`（既有一期增量）
> **对照原型**：`prototype-design/pages/ai-context.html`（新建）、`ai-cache.html`、`report.html`（增量）；配套 `assets/js/layout.js`、`assets/js/prototype.js`、`assets/js/mock-data.js`、`assets/js/cluster-upsert.js`
> **状态**：**原型已完成（已 Review）** · **UI 代码待实施（阶段 2-6）**

本次变更：**AI 上下文压缩模块首次引入** + **AI 缓存语义缓存（规则开关 + 全局设置）**，叠加 **集群 EPP 调度参数破坏性重构**、**报表 3 新维度 Doris 对齐** 两处既有页面增量，及 **1 处原型通用缺陷修复**。共 7 项范围：

| 编号 | 范围 | 性质 |
| ---- | ---- | ---- |
| #1 | AI 上下文压缩模块（`AIContextRule.list`） | 全新（含规则集合 + 全局设置两接口） |
| #2 | AI 缓存 · 语义设置（`ai-cache.html` 新增 Tab） | 全新（单例设置接口） |
| #3 | AI 缓存规则 · 语义缓存开关（`enable_semantic_cache`） | 既有页面增量 |
| #4 | 集群 · EPP 调度参数重构 | 既有页面增量（**破坏性重命名**） |
| #5 | 报表 · 3 新维度 Doris 对齐 | 既有页面增量（文案 / 可用后端） |
| #6 | 导航菜单 · 「功能增强」新增第 4 项 | 增量（依赖后端 `nav_tree.toml`） |
| #7 | 原型通用 `Prototype.initTabs` 缺陷修复 | 缺陷修复（跨页面） |

> ⚠️ 本次后端接口均已在 `api-define` 落地（对应后端变更记录见 §8）；UI 侧无 DDL 依赖。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 状态 |
| ----------- | -------- | ---- |
| AI 上下文压缩（`AIContextRule.list`） | **单页双 Tab**：「压缩规则」+「全局设置」；**规则**为集合级列表页（列：生效条件 / 压缩档位 / 预算上限 / 预留输出 / 操作），整体替换写回 `PUT /ai-context-rules`（无 `name` / `enabled` / `priority`，`cond` 即身份）；**全局设置**为单例表单（8 字段），对应 `GET/PUT /ai-context-settings`；两 Tab 复用视图/编辑双模式：规则 Tab 用「进入编辑模式 / 退出编辑模式 / 提交并生效」、设置 Tab 用「编辑 / 取消 / 保存」 | ✅ 原型 · ⬜ UI |
| AI 缓存 · 语义设置 | `ai-cache.html` 由单表格页改为 **Tab 双页**：「缓存规则」+「语义设置」；「语义设置」为单例表单（`top_k` 1-10 / `threshold` 0-2 / `threshold_relation` 四枚举），对应 `GET/PUT /ai-cache-semantic-settings`；按钮为「编辑 / 取消 / 保存」；设置与规则集合生命周期解耦 | ✅ 原型 · ⬜ UI |
| AI 缓存规则 · 语义缓存 | 列表新增「语义缓存」列（tag 开启/关闭）；新增/编辑抽屉新增语义缓存 switch；查看抽屉新增只读行（`disabled` 策略时标注「忽略」）；写回 `rules[].enable_semantic_cache` | ✅ 原型 · ⬜ UI |
| 集群 · EPP 调度参数 | **破坏性重命名** `scheduling_profile` → `load_profile`、`cache_affinity` → `affinity`；新增 `waiting_queue_max` / `running_requests_max` / `fallback_on_empty` / `metrics_staleness_threshold_ms`；`flow_control.enable_eviction` 锁定为禁用态只读（仅允许 `false`）；`epp_config` 非空即校验（不再仅 EPP 模式） | ✅ 原型 · ⬜ UI |
| 报表 · 3 新维度 | 删除「缓存状态 / 镜像命中 / 意图答案 新维度仅 MySQL 后端支持，Doris 返回 422」橙色提示；3 维度改为两后端均可用（二期对齐 Doris） | ✅ 原型 · ⬜ UI |
| 导航菜单 | 「功能增强」二级分组下新增第 4 项「AI上下文压缩」（`AIContextRule.list`） | ✅ 原型 · ✅ 运行时（`nav_tree.toml` 已含） |
| 原型 `Prototype.initTabs` | 修复 Tab 切换时 `ivu-tabs-tabpane-inactive` 未移除导致目标 pane 不显示 | ✅ 原型 |

---

## 2. 接口依据

### 2.1 AI 上下文压缩规则 `/ai-context-rules`（全新）

**接口**：`GET /ai-context-rules`（权限 FeatureAIContext+ActionRead）、`PUT /ai-context-rules`（FeatureAIContext+ActionUpdate，**整体替换**）。

**集合级全量读写**（不提供 `/{id}` 单条接口）：

| 字段 | 类型 | 校验 |
| ---- | ---- | ---- |
| `rules` | array | 必填；`null` 按 `[]` 处理（清空全部规则）；**数组顺序即优先级（first-match-wins）**；无 `priority`、无 `enabled`、无 `name` |
| `rules[].cond` | string | **必填、非空、控制面编译校验**（照 ai-cache 同款，非法表达式 422） |
| `rules[].mode` | string | **必填**；四枚举 `off` / `conservative` / `balanced` / `aggressive`（缺失或非法 422） |
| `rules[].max_context_tokens` | int | 非必填；≥ 0；未传/`0` = 用模型表窗口 |
| `rules[].reserve_tokens` | int | 非必填；≥ 0；未传/`0` = 自动 `clamp(窗口×15%, 256, 16000)` |

- `resource_type=ai_context_rule`；**不返回** `created_at`/`updated_at`（整组替换语义，逐规则时间戳无信息价值）。
- `{"rules": []}` = 清空全部规则；「禁用一条规则」= 从列表移除（或显式置 `mode=off` 的兜底规则）。
- 规则 `id` 为内部排序字段，不出现在 API 请求/响应中。

### 2.2 AI 上下文压缩全局设置 `/ai-context-settings`（全新）

**接口**：`PUT /ai-context-settings`（2.1，**单例单行覆盖式 upsert**：delete-all + insert）、`GET /ai-context-settings`（2.2，缺行返回默认值对象，无时间戳）。

| 字段 | 类型 | 校验 |
| ---- | ---- | ---- |
| `trigger_ratio` | float64 | 非必填，默认 `0.7`；`(0, 1]` |
| `keep_latest_images` | int | 非必填，默认 `2`；≥ 0（`0` = 完全不裁图） |
| `tool_result_max_chars` | int | 非必填，默认 `2000`；≥ 0（`0` = 不截断） |
| `thinking_policy` | string | 非必填，默认 `trim-all-but-last`；枚举 `trim-all-but-last` / `keep` |
| `chars_per_token` | int | 非必填，默认 `4`；≥ 1 |
| `image_token_estimate` | int | 非必填，默认 `1200`；≥ 0 |
| `rewrite.strength` | string | 非必填，默认 `lite`；枚举 `lite` / `full` |
| `rewrite.protected_survival_rate` | float64 | 非必填，默认 `0.95`；`(0, 1]` |

- `resource_type=ai_context_settings`；**不返回** `created_at`/`updated_at`；设置独立于规则集合维护（清空规则不影响本设置）。

### 2.3 AI 缓存语义全局设置 `/ai-cache-semantic-settings`（全新）

**接口**：`PUT /ai-cache-semantic-settings`（2.1，**单例单行覆盖式 upsert**）、`GET /ai-cache-semantic-settings`（2.2，缺行返回默认值对象）。

| 字段 | 类型 | 校验 |
| ---- | ---- | ---- |
| `top_k` | int | 非必填，默认 `1`；1 - 10 |
| `threshold` | float64 | 非必填，默认 `0.15`；0 - 2 |
| `threshold_relation` | string | 非必填，默认 `lt`；枚举 `lt` / `lte` / `gt` / `gte`（**大小写敏感**） |
| `created_at` / `updated_at` | string | **只读**（RFC3339），提交时忽略 |

- `resource_type=ai_cache_semantic_settings`；设置与 `/ai-cache-rules` 生命周期解耦（清空规则不影响设置）。

### 2.4 AI 缓存规则 · 语义缓存开关（增量，`ai-cache-rules.md`）

| 字段 | 类型 | 校验 |
| ---- | ---- | ---- |
| `rules[].enable_semantic_cache` | bool | 非必填，默认 `false`；命中且 Redis 精确未命中时走 embedding + 向量相似度检索；**`cache_key_strategy=disabled` 时被忽略（不报错）** |

- 校验逻辑说明同步更新：`enable_semantic_cache` 为 bool，无额外组合校验——`disabled` 策略上的开关由 BFE 忽略。

### 2.5 集群 EPP 调度配置（增量，`clusters.md`）

**破坏性重命名**（旧字段名不再被识别）：

| 旧字段 | 新字段 | 类型 | 校验 |
| ------ | ------ | ---- | ---- |
| `scheduling_profile` | `load_profile` | string | 非必填，默认 `balanced`；枚举 `queue-first` / `balanced` / `kv-first` |
| `cache_affinity` | `affinity` | string | 非必填，默认 `medium`；枚举 `off` / `low` / `medium` / `high`（权重 0.3 / 0.6 / 1.0） |

**新增字段**：

| 字段 | 类型 | 校验 |
| ---- | ---- | ---- |
| `waiting_queue_max` | number | 非必填，默认 `0`；≥ 0（`0` = **不启用**该项过滤） |
| `running_requests_max` | number | 非必填，默认 `0`；≥ 0（`0` = **不启用**该项过滤） |
| `fallback_on_empty` | bool | 非必填，默认 `false`；所有端点被过滤时是否回退派发「最不差」端点 |
| `metrics_staleness_threshold_ms` | int | 非必填，默认 `200`；**> 0 的整数**（单位 ms） |

**既有字段语义收紧**：

| 字段 | 变更 |
| ---- | ---- |
| `flow_control.enable_eviction` | **当前 EPP 未接线，仅允许 `false`**（`true` → 拒绝提交）；编译产物不下发该字段 |
| `flow_control` | 缺省不下发流控段（EPP 用系统默认） |
| `kv_cache_utilization_max` | 语义补充：作为 KV 阈值**单一来源** |
| `session_affinity_enabled` / `prefix_cache_affinity` | 语义补充：`affinity=off` 时**同样不注入**亲和 scorer |

- 条件必填说明收紧：**`epp_config` 非空即须通过字段校验，与 `balance_mode` 无关**（含 `EPP → WRR` 时休眠保留的配置）。

### 2.6 报表 3 新维度 Doris 对齐（增量，`report.md`）

- 时序 `dimension`、排行 `dimension`、分布 `dimension` 三处的 `ai_intent_answer` / `ai_cache_status` / `mirror_hit`：**由「仅 MySQL（Doris 返回 422）」改为两后端均可用**（二期已对齐 Doris，需 Doris 侧表结构先行升级）。
- 删除「维度不被当前查询后端支持 → 422（`not supported by doris backend`）」的场景行。
- `mirror_hit` 排行返回 `0`/`1` 两桶、分布返回 `"0"`/`"1"` 桶的语义不变。

---

## 3. 原型（已完成，已 Review）

### 3.1 新建页面

| 文件 | 结构要点 |
| ---- | -------- |
| `prototype-design/pages/ai-context.html`（638 行，新建） | `Layout.render({pageId:'AIContextRule.list', basePath:'../'})`；常量 `MODE_LABELS`（off/conservative/balanced/aggressive 中文文案）、`THINKING_LABELS`、`REWRITE_LABELS`、`DEFAULT_SETTINGS`；**Tab 双页**「压缩规则 \| 全局设置」（`rules-pane` / `settings-pane`，`state.activeTab`）；规则表列 = 生效条件（可搜索）/ 压缩档位（可选搜索 + tag，off 用 default、其余 primary）/ 预算上限 / 预留输出 / 操作，`sortKeys=['cond','mode','max_context_tokens','reserve_tokens',null]`；`formatTokens`：`0`/空 → 「模型默认（0）」；设置卡 8 字段 id：`ctx-trigger-ratio` / `ctx-keep-images` / `ctx-tool-result-max-chars` / `ctx-thinking-policy` / `ctx-chars-per-token` / `ctx-image-token-estimate` / `ctx-rewrite-strength` / `ctx-protected-survival-rate`；`submitSettings()` 8 项校验；`submitRules()`→`commitAll()`（同时写 `MockData.aiContextRules.rules` 与 `MockData.aiContextSettings`）；抽屉 `drawer-ai-context`（60% 宽，`IvuUI.expressionEditor('ai-context-expression')`，cond 集合内查重，max/reserve `>0` 才写入）；**Tab 按钮文案**：规则 Tab「进入编辑模式 / 退出编辑模式 / 提交并生效」，设置 Tab「编辑 / 取消 / 保存」 |

### 3.2 既有页面/资产增量

| 文件 | 变更 |
| ---- | ---- |
| `prototype-design/pages/ai-cache.html` | 新增 `RELATION_LABELS`；state 增 `drawerSemanticEnabled` / `activeTab` / `semantic` / `originalSemantic`；`renderHeader(tab)` 按 Tab 分叉按钮文案与 id 前缀（`btn-cache-rules-*` / `btn-cache-semantic-*`）、副标题分叉；`renderPage()` 用 `IvuUI.tabs` 挂「缓存规则 / 语义设置」两 pane + `Prototype.initTabs` + activeTab 绑定；新增 `renderRulesPane()` / `renderSemanticPane()` / `renderSemanticCard()` / `bindSemanticActions()`；规则表新增「语义缓存」列（tag 开启/关闭）；抽屉新增语义缓存 switch（`ai-cache-semantic-switch`）与查看态只读行；`onDrawerSave` data 增 `enable_semantic_cache`；`submitSemantic()` 校验 Top K 1-10 / threshold 0-2 / relation 四枚举；`commitAll()` 同时写 `MockData.aiCacheRules.rules` 与 `MockData.aiCacheSemanticSettings`；`exitEditMode` 文案中性化为「取消将丢弃这些改动」/「已放弃未保存的改动」 |
| `prototype-design/pages/report.html` | 删除过滤器区橙色提示行「提示：缓存状态 / 镜像命中 / 意图答案 新维度与排行仅 MySQL 后端支持，Doris 后端返回 422。」 |
| `prototype-design/assets/js/layout.js` | `NAV_ICONS` 新增 `'AIContextRule.list': 'ivu-icon ivu-icon-ios-crop'`；`FeatureEnhance.list` children 追加 `{ id:'AIContextRule.list', i18n:'AIContextRuleManage', page:'ai-context.html', text:'AI上下文压缩', icon }` |
| `prototype-design/assets/js/prototype.js` | i18n 新增 `nav.AIContextRuleManage`（zh「AI上下文压缩」/ en「AI Context Compress」）；**修复 `initTabs`**（见 §3.4） |
| `prototype-design/assets/js/mock-data.js` | EPP 示例重命名与新字段（`scheduling_profile`→`load_profile`、`cache_affinity`→`affinity`；补齐 `waiting_queue_max` / `running_requests_max` / `fallback_on_empty` / `metrics_staleness_threshold_ms`；openai 集群 `enable_eviction: true → false`）；`aiCacheRules.rules` 每条新增 `enable_semantic_cache`（true/false/false）；新增 `aiCacheSemanticSettings` / `aiContextRules` / `aiContextSettings` |
| `prototype-design/assets/js/cluster-upsert.js` | **EPP 破坏性重构**（见 §3.3） |

### 3.3 `cluster-upsert.js` EPP 重构明细

| 项 | 变更 |
| -- | ---- |
| 实例负载画像 | `scheduling_profile` → `load_profile`，下拉三枚举 `queue-first`（排队优先）/ `balanced`（均衡，默认）/ `kv-first`（KV 空闲优先），help 文案同步 |
| 亲和强度 | `cache_affinity` → `affinity`，下拉四枚举 `off` / `low（0.3）` / `medium（0.6，默认）` / `high（1.0）`；`affinity=off` 时字段名后追加橙色「亲和强度为 off，不生效」，且前缀/会话亲和 help 追加「（off 时不生效）」 |
| 新增字段 | 「排队长度过滤阈值」（`waiting_queue_max`）/「在飞请求数过滤阈值」（`running_requests_max`）/「无端点时回退派发」（switch，id `proto-epp-fallback-switch`）/「指标失效剔除阈值（ms）」（`metrics_staleness_threshold_ms`） |
| 启用驱逐 | 改为禁用态只读 switch（`ivu-switch-disabled` + `title`），后缀「当前不支持开启，保持关闭」 |
| 复查行 `reviewRow` | 同步改名与新字段；`流控-启用驱逐` 固定展示「关闭（当前不支持开启）」 |
| `validateEpp` 重写 | **`epp_config` 非空即校验**（不再仅 `balance_mode=EPP`）：新增 `load_profile` / `affinity` 枚举、`waiting_queue_max` / `running_requests_max` ≥ 0、`metrics_staleness_threshold_ms` 为正整数、`flow_control` 各值（`max_requests > 0 或 -1`、两个 TTL ≥ 0 整数）、`enable_eviction` 为 `true` 时返回「启用驱逐当前不支持开启，请保持关闭」 |
| 默认 epp_config | 补齐新字段（`waiting_queue_max:0` / `running_requests_max:0` / `fallback_on_empty:false` / `metrics_staleness_threshold_ms:200`） |
| 事件绑定 | 新增 `affinity` select change（同步并重渲，用于显隐 off 提示）、`proto-epp-fallback-switch` click；移除旧的 `proto-epp-enable-eviction-switch` 绑定 |

### 3.4 原型通用缺陷修复（`Prototype.initTabs`）

**现象**：`ai-context.html`「全局设置」与 `ai-cache.html`「语义设置」点击 Tab 后不显示内容。

**根因**：`initTabs` 切换时只加/减 `ivu-tabs-tab-active`，**从不移除 `ivu-tabs-tabpane-inactive`**；`app.css` 中 iView 的 `.ivu-tabs-tabpane-inactive` 规则压过 `.ivu-tabs-tabpane-active`，导致目标 pane 仍被隐藏。

**修复**：改为成对 `classList.toggle`（同时 toggle `active` 与 `inactive`）：

```js
container.querySelectorAll('.ivu-tabs-tab').forEach(function (t) {
  t.classList.toggle('ivu-tabs-tab-active', t === tab);
});
container.querySelectorAll('[data-tab-pane]').forEach(function (p) {
  var isTarget = p.getAttribute('data-tab-pane') === name;
  p.classList.toggle('ivu-tabs-tabpane-active', isTarget);
  p.classList.toggle('ivu-tabs-tabpane-inactive', !isTarget);
});
```

### 3.5 原型 Review 反馈落地点

| # | 反馈 | 落地 |
| - | ---- | ---- |
| 1 | AI 上下文压缩的 Tab 未实现「全局设置」（点击不出内容） | 修复 `Prototype.initTabs`（§3.4），两处 Tab 页均可正常切换 |
| 2 | AI 上下文压缩的「全局设置」是独立接口？ | 确认：`/ai-context-rules` 与 `/ai-context-settings` 为**两个独立接口**（后者单例 GET/PUT），原型设置 Tab 独立成卡 |
| 3 | AI 上下文压缩的「全局设置」与 AI 缓存规则的「语义设置」按钮直接用「编辑」，不要「进入编辑模式」这类 | 设置类 Tab 按钮改为「编辑 / 取消 / 保存」；规则类 Tab 仍保留「进入编辑模式 / 退出编辑模式 / 提交并生效」（与路由规则页范式一致） |

> 浏览器实测（无缓存环境，新端口）：`ai-context.html` 全局设置查看态 `[编辑]` → 点击后 `[取消 | 保存]` + 8 个输入控件；`ai-cache.html` 语义设置查看态 `[编辑]` → `[取消 | 保存]` + 3 个输入控件。

---

## 4. UI 实施（`src/`，待实施）

按 `design-docs/README.md` 顺序：api-define → 模块/组件 → 路由 → 状态 → i18n。

### 4.1 新增模块

| 文件 | 说明 |
| ---- | ---- |
| `src/modules/AIContext/index.vue` | **Tab 双页**：「压缩规则」列表 + 抽屉（查看 / 新增编辑），「全局设置」单例表单卡；**规则 Tab 视图/编辑双模式**（视图模式仅「进入编辑模式」+ 行「查看」，编辑模式「添加规则」+「退出编辑模式」+ 右上角「提交并生效」+ 行「编辑/删除」）；**设置 Tab 「编辑 / 取消 / 保存」**；读 `GET ai-context-rules` / `ai-context-settings`，写 `PUT ai-context-rules` / `ai-context-settings`（**两个独立请求**，互不耦合）；`$request({url:'ai-context-rules', openapi:true})` |
| `src/modules/AIContext/components/RuleForm.vue` | 新增/编辑表单（对齐 `RouteTable/components/RuleForm.vue` 命名）：生效条件（`Expression` 组件）、压缩档位 Select（off/conservative/balanced/aggressive）、预算上限 / 预留输出 InputNumber；校验：cond 必填、mode 必填枚举、两数值 ≥ 0、cond 集合内唯一 |
| `src/modules/AIContext/components/RuleView.vue` | 查看态纯文案组件（`info-row` 布局）：4 个只读信息行，不含任何表单控件 |
| `src/modules/AIContext/components/SettingsForm.vue` | 全局设置表单（8 字段，含 `rewrite.strength` / `rewrite.protected_survival_rate` 两个嵌套字段）；校验对齐 §2.2 |
| `src/modules/AIContext/components/SettingsView.vue` | 全局设置查看态纯文案组件（8 行 `info-row`） |

### 4.2 既有模块增量

| 文件 | 变更 |
| ---- | ---- |
| `src/modules/AICache/index.vue` | 由单表格页改为 **Tab 双页**「缓存规则 / 语义设置」；规则 Tab 复用既有视图/编辑双模式；新增语义设置卡（`top_k` / `threshold` / `threshold_relation` 三字段 + 编辑/取消/保存）；读写 `ai-cache-semantic-settings` |
| `src/modules/AICache/components/RuleForm.vue` | 新增「语义缓存」Switch（`enable_semantic_cache`）；`cache_key_strategy=disabled` 时给出忽略提示 |
| `src/modules/AICache/components/RuleView.vue` | 新增只读「语义缓存」行（开启/关闭；`disabled` 策略时标注「忽略」） |
| `src/modules/Clusters/components/ClusterUpsert.vue` | EPP 表单：`load_profile` / `affinity` 两个 Select（新枚举）、`waiting_queue_max` / `running_requests_max` / `metrics_staleness_threshold_ms` 三个 InputNumber、`fallback_on_empty` Switch、「启用驱逐」禁用态只读；`affinity=off` 时显示提示；校验对齐 §2.5（`epp_config` 非空即校验） |
| `src/modules/Clusters/index.vue` | 列表/详情 EPP 摘要字段改名与新字段（对齐原型复查行） |
| `src/modules/Report/index.vue` | 3 新维度（`ai_intent_answer` / `ai_cache_status` / `mirror_hit`）**移除 Doris 后端禁用与橙色提示**，两后端均可选 |
| `src/i18n/zh.js` / `src/i18n/en.js` | 本次需新增 `nav.AIContextRuleManage` + `AIContext` 模块文案命名空间 + `AICache` 语义设置文案 + `Clusters` EPP 新字段文案 |

### 4.3 路由与导航

| 文件 | 变更 |
| ---- | ---- |
| `src/router/router.js` | 在 `FeatureEnhance` 分组下新增子路由 `AIContextRule.list`（`ai-context-rules`）；路由本身平铺注册（菜单分组由后端 `nav_tree.toml` 决定） |
| `src/layout/sidebar/navItem.vue` | `navIcon` 新增 `AIContextRule.list`（`ios-crop`，与原型 `NAV_ICONS` 一致） |
| `src/i18n/zh.js` / `src/i18n/en.js` | `nav.*` 新增 `AIContextRuleManage`（AI上下文压缩 / AI Context Compress） |
| `ai-gateway-runtime/conf/nav_tree.toml` | **已更新**：`FeatureEnhance.list` 的 `children` 已含第 4 项 `{ id = "AIContextRule.list", text = "AIContextRuleManage", allowed_roles = ["admin"] }`（见 §7.1） |

> **导航树来源**：菜单由后端 `GET /meta` 返回的 `nav.admin` 驱动（`store.getNavRoot()`），前端 `router.js` 仅注册路由；`authorize.js` 路由守卫 `findNav(to.name)` 未命中会重定向登录。故需后端 `conf/nav_tree.toml` 在 `FeatureEnhance.list.children` 下新增本入口（已就绪）。

---

## 5. 验收清单

**AI 上下文压缩（#1）**

- [ ] 页面为 Tab 双页：「压缩规则」+「全局设置」，点击可正常切换（`initTabs` 成对 toggle）
- [ ] 规则表 4 列 + 操作列与 api-define 字段一致（生效条件 / 压缩档位 / 预算上限 / 预留输出）；数组顺序即展示顺序
- [ ] 规则 Tab 视图/编辑双模式：视图模式仅「进入编辑模式」+ 行「查看」；编辑模式「添加规则」+「退出编辑模式」+ 右上角「提交并生效」+ 行「编辑/删除」
- [ ] 「查看」抽屉全字段为**纯文案**：生效条件以文本展示，不出现输入框与表达式编辑块，且**不显示必填 `*` 号**
- [ ] 新增/编辑校验：cond 必填且集合内唯一、mode 必填四枚举、`max_context_tokens` / `reserve_tokens` ≥ 0；`0` 不写入请求体
- [ ] `{"rules": []}` 可清空；提交后重新 GET 回填（响应**不含** `created_at`/`updated_at`）
- [ ] 设置 Tab 为「编辑 / 取消 / 保存」；校验 trigger_ratio `(0,1]`、keep_latest_images ≥ 0、tool_result_max_chars ≥ 0、thinking_policy 两枚举、chars_per_token ≥ 1、image_token_estimate ≥ 0、rewrite.strength 两枚举、protected_survival_rate `(0,1]`
- [ ] 规则与设置为**两个独立接口**，任一保存不应连带提交另一侧
- [ ] 设置未配置（GET 返回默认值对象）时正常展示默认值，不报错

**AI 缓存 · 语义设置（#2）**

- [ ] `ai-cache.html` 为 Tab 双页「缓存规则 / 语义设置」
- [ ] 语义设置查看态「编辑」→「取消 / 保存」；校验 top_k 1-10、threshold 0-2、threshold_relation 四枚举（大小写敏感）
- [ ] 保存后重新 GET 回填，含只读 `created_at`/`updated_at`

**AI 缓存规则 · 语义缓存（#3）**

- [ ] 列表「语义缓存」列以 tag 展示开启/关闭
- [ ] 新增/编辑抽屉含语义缓存 Switch，写回 `enable_semantic_cache`
- [ ] 查看抽屉语义缓存为纯文案；`cache_key_strategy=disabled` 时标注「（策略为 disabled，忽略）」
- [ ] 提交体包含/不包含 `enable_semantic_cache` 时后端语义正确（默认 false）

**集群 · EPP（#4）**

- [ ] 表单字段名为 `load_profile` / `affinity`（旧名 `scheduling_profile` / `cache_affinity` 不再出现）
- [ ] `load_profile` 三枚举、`affinity` 四枚举；`affinity=off` 时有「不生效」提示
- [ ] `waiting_queue_max` / `running_requests_max` ≥ 0（`0` = 不启用）；`metrics_staleness_threshold_ms` 为正整数（默认 200）
- [ ] 「无端点时回退派发」为 Switch；「启用驱逐」为禁用态只读 + 「当前不支持开启，保持关闭」
- [ ] **`epp_config` 非空即校验**（含 WRR 休眠配置）：枚举 / 范围 / `enable_eviction=true` 均给出可读错误
- [ ] 列表/详情 EPP 摘要与原型复查行一致

**报表 · 3 新维度（#5）**

- [ ] 时序 / 排行 / 分布三处 3 新维度**在 Doris 后端下不再禁用**、无「仅 MySQL」提示
- [ ] `mirror_hit` 排行 `0`/`1`、分布 `"0"`/`"1"` 语义不变

**通用**

- [ ] 原型 `prototype-design/` 与 Vue 展示一致
- [ ] `npm run lint` 通过
- [ ] 页面无控制台告警（无缺失 i18n key）

---

## 5.1 接口合法性校验 ↔ UI 校验实现 对照核查

逐条比对 OpenAPI 合法性条件（§2）与前端待实现的校验点，作为 UI 实施（§4）的自检清单：

| 模块 | 接口合法性条件 | UI 校验实现位置（计划） | 结论 |
| ---- | ------------- | ---------------- | ---- |
| #1 AI 上下文压缩 · 规则 | cond 必填非空可编译、mode 必填四枚举、`max_context_tokens`/`reserve_tokens` ≥ 0、cond 集合内唯一 | `AIContext/components/RuleForm.vue` `ruleValidate`（cond required + `validateCond`、mode Select 四枚举、两值 ≥ 0）+ `AIContext/index.vue` cond 集合查重 | ⬜ 待实现 |
| #1 AI 上下文压缩 · 设置 | trigger_ratio `(0,1]`、keep_latest_images/tool_result_max_chars/image_token_estimate ≥ 0、chars_per_token ≥ 1、thinking_policy 两枚举、rewrite.strength 两枚举、protected_survival_rate `(0,1]` | `AIContext/components/SettingsForm.vue` `ruleValidate`（8 项数值范围 + 2 个 Select） | ⬜ 待实现 |
| #2 语义设置 | top_k 1-10、threshold 0-2、threshold_relation 四枚举 | `AICache/index.vue` 语义设置卡 `validateSemantic` | ⬜ 待实现 |
| #3 语义缓存开关 | `enable_semantic_cache` bool（无组合校验）；`disabled` 策略下由 BFE 忽略 | `AICache/components/RuleForm.vue` Switch（布尔，无需额外校验）+ 提示文案 | ⬜ 待实现 |
| #4 集群 EPP | load_profile/affinity 枚举、`kv_cache_utilization_max` ∈ (0,1]、waiting_queue_max/running_requests_max ≥ 0、metrics_staleness_threshold_ms 为正整数、flow_control 取值范围、enable_eviction 仅 false | `Clusters/components/ClusterUpsert.vue` `validateEpp`（**epp_config 非空即校验**） | ⬜ 待实现 |
| #5 报表维度 | 3 维度两后端均可用；`mirror_hit` 桶语义 | `Report/index.vue` 维度 Select 不再按后端禁用 | ⬜ 待实现 |

> 校验实现细节对齐原型 `*_LABELS` 文案与 `validateEpp` 的错误文案（如「启用驱逐当前不支持开启，请保持关闭」「指标失效剔除阈值须为 > 0 的整数（ms）」），保证原型 → UI 文案一致。

---

## 6. 变更文件清单

### 原型（已完成）

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `prototype-design/pages/ai-context.html` | 新建 | AI 上下文压缩 Tab 双页（规则集合 + 全局设置） |
| `prototype-design/pages/ai-cache.html` | 已修改 | 新增「语义设置」Tab + 规则「语义缓存」列/Switch/只读行 |
| `prototype-design/pages/report.html` | 已修改 | 删除 Doris「仅 MySQL」橙色提示 |
| `prototype-design/assets/js/layout.js` | 已修改 | `AIContextRule.list` 图标 + 「功能增强」第 4 项 |
| `prototype-design/assets/js/prototype.js` | 已修改 | `nav.AIContextRuleManage`（zh/en）+ `initTabs` 修复 |
| `prototype-design/assets/js/mock-data.js` | 已修改 | EPP 改名/新字段 + `enable_semantic_cache` + 3 个新 mock |
| `prototype-design/assets/js/cluster-upsert.js` | 已修改 | EPP 破坏性重构（表单/复查/校验/默认值/事件） |

### 接口文档（已同步，阶段 1）

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `api-define/OpenAPI接口定义/ai-context-rules.md` | 新增 | `/ai-context-rules` 定义 |
| `api-define/OpenAPI接口定义/ai-context-settings.md` | 新增 | `/ai-context-settings` 定义 |
| `api-define/OpenAPI接口定义/ai-cache-semantic-settings.md` | 新增 | `/ai-cache-semantic-settings` 定义 |
| `api-define/OpenAPI接口定义/ai-cache-rules.md` | 已更新 | 新增 `enable_semantic_cache` |
| `api-define/OpenAPI接口定义/clusters.md` | 已更新 | EPP 重命名 + 新字段 + `enable_eviction` 收紧 + `epp_config` 非空即校验 |
| `api-define/OpenAPI接口定义/report.md` | 已更新 | 3 新维度 Doris 对齐 |
| `api-define/OpenAPI接口定义/README.md` | 已更新 | 索引新增 3 个接口 |

### UI 代码

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `src/modules/AIContext/index.vue` + `components/RuleForm.vue` + `RuleView.vue` + `SettingsForm.vue` + `SettingsView.vue` | 新建 | AI 上下文压缩模块（⬜ 待实施） |
| `src/modules/AICache/index.vue` + `components/RuleForm.vue` + `RuleView.vue` | 修改 | 语义设置 Tab + 语义缓存开关（⬜ 待实施） |
| `src/modules/Clusters/components/ClusterUpsert.vue` + `index.vue` | 修改 | EPP 字段重构（⬜ 待实施） |
| `src/modules/Report/index.vue` | 修改 | 3 维度两后端均可用（⬜ 待实施） |
| `src/router/router.js` | 修改 | `AIContextRule.list` 路由（⬜ 待实施） |
| `src/layout/sidebar/navItem.vue` | 修改 | `AIContextRule.list` 图标（⬜ 待实施） |
| `src/i18n/zh.js` / `src/i18n/en.js` | 修改 | nav + 3 模块文案（⬜ 新增文案待实施） |
| `ai-gateway-runtime/conf/nav_tree.toml` | 修改 | **已更新**：`FeatureEnhance.list` 下新增第 4 项（见 §7.1） |

---

## 7. 注意事项

1. **导航入口依赖后端 `nav_tree.toml`**：菜单树来自 `GET /meta` 的 `nav.admin`，前端 `router.js` 只注册路由；`authorize.js` 守卫 `findNav(to.name)` 未命中会重定向登录。运行时 `ai-gateway-runtime/conf/nav_tree.toml` 已就绪：

   ```toml
   children = [
       { id = "AICacheRule.list", text = "AICacheRuleManage", allowed_roles = ["admin"] },
       { id = "TrafficMirrorRule.list", text = "TrafficMirrorRuleManage", allowed_roles = ["admin"] },
       { id = "IntentConfig.list", text = "IntentConfigManage", allowed_roles = ["admin"] },
       { id = "AIContextRule.list", text = "AIContextRuleManage", allowed_roles = ["admin"] }
   ]
   ```

   若 api 仓库亦维护 `nav_tree.toml`，需同步新增第 4 项；否则新页面不可达（菜单不显示 + 直连 URL 被守卫拦截）。

2. **两接口独立，不可耦合提交**：`/ai-context-rules`（集合）与 `/ai-context-settings`（单例）、`/ai-cache-rules`（集合）与 `/ai-cache-semantic-settings`（单例）各自独立 PUT。UI 保存规则时**不得**顺带提交设置，反之亦然。

3. **EPP 破坏性重命名**：`scheduling_profile` / `cache_affinity` 旧名不再被后端识别。UI 表单、列表/详情摘要、请求体必须全部改用 `load_profile` / `affinity`；历史数据中若残留旧字段名，需按 §2.5 迁移（或依赖后端兼容策略，需确认）。

4. **`enable_eviction` 仅允许 `false`**：`true` 会被后端拒绝（422）。UI 将其渲染为禁用态只读，不提供开启入口；提交体保持 `false`。

5. **`epp_config` 非空即校验**：即使 `balance_mode=WRR`，只要请求携带 `epp_config`（休眠保留）也须通过字段校验。UI 在 `WRR` 模式下若保留配置，同样要走 `validateEpp`。

6. **`waiting_queue_max` / `running_requests_max` 的 `0` 语义**：`0` = **不启用**该项过滤（非「上限为 0」）。UI 输入框需与 help 文案一致，避免用户误填。

7. **集合级整体替换**：`/ai-context-rules` 与 `/ai-cache-rules` 均为全量 PUT（无单条接口、无分页、无 `enabled`）；UI 必须以完整数组提交，禁止「只改一条」的局部请求。`{"rules": []}` = 清空。

8. **`ai-context-rules` 响应无时间戳**：与 `ai-cache-rules` 一致，不返回 `created_at`/`updated_at`；`ai-cache-semantic-settings` 则**返回**时间戳（只读）。UI 回填时勿混淆。

9. **`threshold_relation` 大小写敏感**：`lt` / `lte` / `gt` / `gte` 全小写，UI 使用固定枚举 Select，不做大小写归一。

10. **报表 3 维度 Doris 对齐的前置条件**：接口层已放开两后端，但**需 Doris 侧表结构先行升级**（见 §8 后端记录）。UI 仅移除前端禁用逻辑，不负责后端数据可用性。

11. **原型 `initTabs` 修复是跨页面通用修复**：`ai-context.html` 与 `ai-cache.html` 均依赖该修复；Vue 侧使用 iView 原生 `Tabs` 组件不受影响，但原型作为验收基准须保证 Tab 可切换。

---

## 8. 关联文档

| 文档 | 说明 |
| ---- | ---- |
| `api-define/OpenAPI接口定义/ai-context-rules.md` | AI 上下文压缩规则接口 |
| `api-define/OpenAPI接口定义/ai-context-settings.md` | AI 上下文压缩全局设置接口 |
| `api-define/OpenAPI接口定义/ai-cache-semantic-settings.md` | AI 缓存语义全局设置接口 |
| `api-define/OpenAPI接口定义/ai-cache-rules.md` | AI 缓存规则（`enable_semantic_cache`） |
| `api-define/OpenAPI接口定义/clusters.md` | 集群 EPP 调度参数 |
| `api-define/OpenAPI接口定义/report.md` | 报表 3 新维度 |
| `prototype-design/pages/ai-context.html` | AI 上下文压缩原型（新建） |
| `prototype-design/pages/ai-cache.html` / `report.html` | 既有页面增量原型 |
| `ai-gateway-api/design-docs/modifications/2026-10-01-ai-context-compress-control-plane/api-changes.md` | 后端侧变更记录（上下文压缩） |
| `ai-gateway-api/design-docs/modifications/2026-09-30-ai-cache-semantic-cache/api-changes.md` | 后端侧变更记录（语义缓存） |
| `ai-gateway-api/design-docs/modifications/2026-09-29-optimize-epp-arguments/api-changes.md` | 后端侧变更记录（EPP 参数） |
| `ai-gateway-api/design-docs/modifications/2026-10-01-report-doris-cache-mirror-intent-alignment/api-changes.md` | 后端侧变更记录（报表 Doris 对齐） |
| `design-docs/README.md` | 变更流程与代码实现顺序 |
