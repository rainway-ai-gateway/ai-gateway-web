# UI 代码变更文档

> **对照接口**：`ai-cache-rules.md`、`traffic-mirror-rules.md`、`intent-config.md`（新模块）；`providers.md`、`report.md`（既有一期增量）
> **对照原型**：`prototype-design/pages/ai-cache.html`、`traffic-mirror.html`、`intent-config.html`（新建）；`providers.html`、`report.html`（增量）；配套 `assets/js/mock-data.js`、`assets/js/layout.js`、`assets/js/prototype.js`
> **状态**：**原型已完成（已 Review）** · **UI 代码已实施（已 Review，阶段 2-7 通过）**

本次变更：**AI 缓存规则 / 流量镜像规则 / 意图配置三模块首次引入**，叠加 **Provider 实例来源（K8s 池）** 与 **报表缓存/镜像/意图新字段** 两处既有一期增量。共 5 项范围：

| 编号 | 范围 | 性质 |
| ---- | ---- | ---- |
| #1 | AI 缓存规则模块 | 全新 |
| #2 | 流量镜像规则模块 | 全新 |
| #3 | 意图配置模块 | 全新 |
| #4 | Provider 实例来源（K8s 池） | 既有页面增量 |
| #5 | 报表缓存/镜像/意图新字段 | 既有页面增量 |

> ⚠️ 本次后端含 `db_ddl_sqlite.sql` 变更（三张新表），阶段 1 已用最新 SQL 重建数据库；UI 侧无 DDL 依赖。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 状态 |
| ----------- | -------- | ---- |
| AI 缓存规则（`AICacheRule.list`） | 集合级列表页：规则名称/生效条件/缓存键策略/TTL/请求体上限/缓存值上限 + 新增·编辑·查看·删除抽屉；整体替换写回 `/ai-cache-rules`；**参照路由规则页的视图/编辑双模式**——视图模式右上角仅「进入编辑模式」、行操作仅「查看」，编辑模式左侧「添加规则」+ 右上「退出编辑模式」「提交并生效」、行操作「编辑/删除」 | ✅ 原型 · ⬜ UI |
| 流量镜像规则（`TrafficMirrorRule.list`） | 集合级列表页：规则名称/生效条件/镜像集群/采样比例/头部剔除/路径改写 + 抽屉（KV 注入、body 改写、头部黑名单三态）；整体替换写回 `/traffic-mirror-rules`；**视图/编辑双模式同 AI 缓存规则**（进入/退出编辑模式 + 右上角提交并生效） | ✅ 原型 · ⬜ UI |
| 意图配置（`IntentConfig.list`） | 单例编辑页：全局置信度阈值 + **问题表格**（列：问题名称/类型/判定说明，操作：查看/编辑/删除）+ 保存并发布；问题的新增/编辑/查看走抽屉（choice/score 双类型、选项/档位 1-10）；**视图/编辑双模式**——视图模式右上角仅「进入编辑模式」、阈值以纯文案展示、行操作仅「查看」、隐藏「添加问题」；编辑模式右上「退出编辑模式」+「保存并发布」、可编辑并增删改；未发布过（404）直接展示默认配置并自动进入编辑模式（顶部提示未发布） | ✅ 原型 · ⬜ UI |
| Provider · 编辑/详情 | 实例来源单选（人工维护 / K8s 池）；K8s 池模式**新增/编辑表单仅填 `k8s_pool_name`，不展示镜像实例池**（保存后由系统从 `/k8s_pools` 同步）；只读镜像实例列表**仅在详情页展示** | ✅ 原型 · ✅ UI |
| 报表 · 总览 | 新增 3 张指标卡（缓存命中率 / 镜像命中 / 意图分类），指标网格 5→4 列 | ✅ 原型 · ⬜ UI |
| 报表 · 时序 | 新指标 `cache_tokens`（`cache_read` / `cache_write` 双序列折线） | ✅ 原型 · ⬜ UI |
| 报表 · 排行/分布 | 3 个新维度 `ai_intent_answer` / `ai_cache_status` / `mirror_hit` + Doris 后端橙色提示 | ✅ 原型 · ✅ UI |
| 报表 · 明细 | 日志表新增「缓存 / 镜像 / 意图答案」3 列；5 个新过滤项；详情抽屉 9 个新字段 | ✅ 原型 · ⬜ UI |
| 导航菜单 | 「路由管理」下新增二级分组「功能增强」，收纳 AI 缓存规则 / 流量镜像规则 / 意图配置 3 个入口 | ✅ 原型 · ⬜ UI（依赖后端 `nav_tree.toml`，见 §7.1） |
| `provider-upsert.js` 原型脚本 | 修复 6 处缺陷（重复函数定义、未定义变量、缺失 tip 常量、缺 change 监听、缺 k8s 默认字段） | ✅ 原型 |
| 后端接口 | `/ai-cache-rules`、`/traffic-mirror-rules`、`/intent-config` 新增；`providers` / `report` 扩字段 | ✅ 后端 |

---

## 2. 接口依据

### 2.1 AI 缓存规则 `/ai-cache-rules`（全新）

**接口**：`GET /ai-cache-rules`（权限 FeatureAICache+ActionRead）、`PUT /ai-cache-rules`（FeatureAICache+ActionUpdate，整体替换）。

**集合级全量读写**（不提供 `/{id}` 单条接口）：

| 字段 | 类型 | 校验 |
| ---- | ---- | ---- |
| `rules` | array | 必填；`null` 按 `[]` 处理；**数组顺序即优先级（first-match-wins）**；无 `priority`、无 `enabled` |
| `rules[].name` | string | 必填；1-128 字符；**同一集合内唯一** |
| `rules[].cond` | string | 必填；须能通过 BFE `condition.Build` 编译 |
| `rules[].cache_key_strategy` | string | 非必填，默认 `lastQuestion`；枚举 `lastQuestion` / `allQuestions` / `disabled`（`disabled` = 缓存豁免：命中即不读不写缓存并阻断后续规则） |
| `rules[].cache_ttl` | int | 非必填，默认 `0`（不过期）；≥ 0 |
| `rules[].max_body_bytes` | int64 | 非必填，默认 `1048576`；> 0 |
| `rules[].max_value_bytes` | int64 | 非必填，默认 `1048576`；> 0 |
| `created_at` / `updated_at` | string | **只读**（RFC3339），提交时忽略 |

- `resource_type=ai_cache_rule`；`{"rules": []}` = 清空全部规则。
- 提交列表即生效集合，「禁用一条规则」= 从列表移除。

### 2.2 流量镜像规则 `/traffic-mirror-rules`（全新）

**接口**：`GET /traffic-mirror-rules`（FeatureTrafficMirror+ActionRead）、`PUT /traffic-mirror-rules`（FeatureTrafficMirror+ActionUpdate，整体替换）。

| 字段 | 类型 | 校验 |
| ---- | ---- | ---- |
| `rules` | array | 必填；`null` 按 `[]` 处理；数组顺序即优先级；`{"rules": []}` = 镜像总开关关闭 |
| `rules[].name` | string | 必填；1-128；集合内唯一 |
| `rules[].cond` | string | **必填**；全匹配须显式 `default_t()`；集合内 `cond` 不得重复（重复 422） |
| `rules[].mirror_cluster` | string | 必填；1-128；**引用校验，不存在 → 422** |
| `rules[].percentage` | int | 非必填，默认 `100`；0-100（`0` = 命中但不采样） |
| `rules[].remove_headers` | array | 非必填；**缺省 = 服务端填默认黑名单 `["Authorization","Cookie","X-Api-Key"]`；显式 `[]` = 不剔除**；元素非空 |
| `rules[].set_headers` | object | 非必填；key/value 非空；不建议配 `X-Bfe-Mirror` |
| `rules[].body_rewrites` | array | 非必填；元素 `{"path","value"}`，`path` 一期**仅允许 `"model"`**，`value` 必填非空 |
| `rules[].path_rewrite` | string | 非必填；空串/缺省 = 不改写；非空须以 `/` 开头 |
| `created_at` / `updated_at` | string | **只读** |

- `resource_type=traffic_mirror_rule`；镜像请求不扣配额、不计用量。

### 2.3 意图配置 `/intent-config`（全新）

**接口**：`GET /intent-config`（FeatureAIIntent+ActionRead，**未发布过返回 404**；已发布但 `questions: []` 正常返回）、`PUT /intent-config`（FeatureAIIntent+ActionUpdate，**单行覆盖式全量写**，无历史版本、无单字段更新）。

| 字段 | 类型 | 校验 |
| ---- | ---- | ---- |
| `min_confidence` | number | 非必填，默认 `0.6`；0-1 |
| `questions` | array | 必填；**0-10 个**；`[]` = 停用意图分类（软开关） |
| `questions[].name` | string | 必填；非空；**全部问题中唯一** |
| `questions[].type` | string | 必填；`choice` / `score` |
| `questions[].instructions` | string | 必填；非空 |
| `questions[].criteria` | map<string,string> | `choice` 必填；1-10 项；选项名唯一非空、**不含 `\|`**；与 `levels` 互斥 |
| `questions[].levels` | array | `score` 必填；1-10 档，**从低到高**；元素 `{"name","description"}`，`name` 唯一非空；与 `criteria` 互斥 |
| `questions[].min_confidence` | number | 非必填；0-1（覆盖全局阈值） |
| `created_at` / `updated_at` | string | **只读**（`version` 为下发链路内部字段，不对外暴露） |

- `resource_type=intent_config`；回滚 = 重新 PUT 旧内容。

### 2.4 Provider 实例来源（增量，`providers.md`）

| 字段 | 类型 | 校验 |
| ---- | ---- | ---- |
| `instance_source` | string | 非必填，默认 `instance_pool`；枚举 `instance_pool` / `k8s_pool` |
| `instance_pool` | []Instance | `instance_pool` 模式必填（≥1 元素、`(addr,port)` 不重复、至少一个 `weight>0`）；`k8s_pool` 模式休眠保留、不做成员校验 |
| `k8s_pool_name` | string | `k8s_pool` 模式必填；1-64 字符，仅 `[A-Za-z0-9_.-]`，不能以 `.`/`-`/`_` 开头或结尾、无空白；引用的 pool 无需预先存在（不存在 ≡ 零实例） |
| `k8s_instance_pool` | []Instance | **只读**；请求体携带 → **422**；`instance_pool` 模式为空数组 |

- **有效池**：`有效池 = instance_source == "k8s_pool" ? k8s_instance_pool : instance_pool`。
- 有效池为空时，引用该 provider 的 cluster 请求返回 500（`BK_NO_BACKEND`）——UI 仅需提示，不拦截提交。
- 列表/详情需展示 `k8s_pool_name` 与 `k8s_instance_pool`（只读镜像实例），**不展示 `k8s_instance_pool` 的可编辑控件**。

### 2.5 报表新字段（增量，`report.md`）

**明细（`report/logs`）新增 10 列**：

| 字段 | 类型 | 语义 |
| ---- | ---- | ---- |
| `ai_cache_status` | string | `hit` / `miss` / `skip`；空串=未启用缓存 |
| `mirror_hit` | bool | 是否被流量镜像 |
| `mirror_cluster` | string | 镜像目标集群名；未镜像为空串 |
| `ai_intent_question` | string | 路由实际消费的问题名；未求值为空串 |
| `ai_intent_answer` | string | 分类答案（含 `unknown`）；未求值为空串 |
| `ai_intent_confidence` | number | 门控后置信度；未求值为 `null` |
| `ai_intent_source` | string | `explicit_header` / `classifier` / `cache` |
| `ai_intent_latency_us` | number | 决策服务耗时（μs）；cache/显式源为 `null` |
| `ai_intent_cache_hit` | bool | 意图 LRU 缓存命中；未求值为 `null` |
| `ai_intent_questions_version` | string | questions 配置版本 |

**总览（`report/overview`）新增 3 组**：

- `cache`：`{hit_count, miss_count, skip_count, hit_rate, read_tokens, write_tokens}`，`hit_rate = hit/(hit+miss)`（`skip` 不计分母，分母 0 → 0）
- `mirror`：`{hit_count}`
- `intent`：`{classified_count, unknown_count, unknown_rate}`，`unknown_rate = unknown/(classified+unknown)`

**时序**：新 metric `cache_tokens`（个/秒），按 `kind`（`cache_read` / `cache_write`）分两条序列。

**排行 / 分布 / 明细过滤**：新维度 `ai_intent_answer` / `ai_cache_status` / `mirror_hit`（**仅 MySQL 后端；Doris 后端返回 422**，错误信息含 `not supported by doris backend (mysql only until doris support lands)`）。

- 明细新增过滤参数：`cache_status`、`mirror_hit`、`intent_question`、`intent_answer`、`intent_source`。
- 排行：`mirror_hit` 返回 `0`/`1` 两桶；字符串新维度空值不进排行。
- 分布：`mirror_hit` 返回 `"0"`/`"1"` 桶。

---

## 3. 原型（已完成，已 Review）

### 3.1 新建页面（3 个）

| 文件 | 结构要点 |
| ---- | -------- |
| `prototype-design/pages/ai-cache.html` | `DOMContentLoaded` → `Layout.render({pageId:'AICacheRule.list', basePath:'../'})`；表头 7 列（规则名称 / 生效条件 / 缓存键策略 / 缓存 TTL / 最大请求体 / 最大缓存值 / 操作）；**视图/编辑双模式**（`state.mode`）：视图模式右上角仅「进入编辑模式」、行操作仅「查看」；编辑模式左侧「添加规则」、右上「退出编辑模式」+「提交并生效」（`.route-header-submit` 绝对定位右上角，`.route-header-actions` 与 `.route-header-submit` 均 `gap:8px`）、行操作「编辑/删除」；`enterEditMode` 快照 `originalRows`，`exitEditMode` 有未提交改动时二次确认并回滚，`submitAll()` 整体写回后回到视图模式；抽屉含 `IvuUI.expressionEditor` 条件编辑器 + 策略原生 select + 3 个 `inputNumber`；校验：name 1-128 且集合内唯一、cond 必填、ttl≥0、maxBody/maxValue>0 |
| `prototype-design/pages/traffic-mirror.html` | 表头 7 列（规则名称 / 生效条件 / 镜像集群 / 采样比例 / 头部剔除 / 路径改写 / 操作）；**视图/编辑双模式与 ai-cache.html 对称**（`btn-tm-enter/exit/add/submit`）；头部剔除三态（`headerModeOf`：`remove_headers==null`→默认黑名单、`[]`→不剔除、否则自定义）；抽屉含集群 select、percentage、头部模式 + 自定义列表、`set_headers` KV 增删行、`body_rewrites`（path 固定 `model`）、`path_rewrite`；校验：name/cond 集合内不重复、cluster 必填、percentage 0-100、pathRewrite 非空须 `/` 开头、KV 非空 |
| `prototype-design/pages/intent-config.html` | 已发布→全局阈值卡 + **问题表格**（`IvuUI.pageTable`，列：问题名称 / 类型 / 判定说明 / 操作；类型以 tag 展示 `枚举（choice）`/`评分（score）`；`#ic-question-table .el-pagination { display:none }` 隐藏分页器）；**视图/编辑双模式**（`state.mode`）：视图模式右上角仅「进入编辑模式」、阈值以纯文案展示、行操作仅「查看」、隐藏「添加问题」；编辑模式右上「退出编辑模式」+「保存并发布」、行操作「查看/编辑/删除」；**「添加问题」按钮置于问题列表上方左侧**（`.ic-list-toolbar` = flex + `justify-content:flex-start`，位于卡片体内、表格之上）；`enterEditMode` 快照 `originalMinConfidence`/`originalQuestions`，`exitEditMode` 有未提交改动时二次确认并回滚，保存后回到视图模式；未发布过（404）直接渲染默认配置并自动进入编辑模式（顶部 `ic-unpublished-tip` 提示）；问题的新增/编辑/查看统一走单抽屉 `drawer-intent-question`（查看只读且 footer 隐藏）；`state.draft` 承载编辑草稿，`optionKey/optionNoun/optionLabelText` 驱动 `criteria` ↔ `levels` 互斥切换并重渲染选项行；`MAX_QUESTIONS=10`、`MAX_OPTIONS=10`；校验：min_confidence 0-1、问题数≤10、name 全局唯一、choice criteria 1-10 且不含 ` \| `、score levels 1-10、单问题阈值 0-1 |

### 3.2 既有页面/资产增量

| 文件 | 变更 |
| ---- | ---- |
| `assets/js/layout.js` | `NAV_ICONS` 新增 `FeatureEnhance.list`(ios-color-wand) / `AICacheRule.list`(ios-flash) / `TrafficMirrorRule.list`(ios-copy) / `IntentConfig.list`(ios-chatbubbles)；`route.admin.list` 下在 `AdvanceRouteRule.list` 后新增二级分组 `FeatureEnhance.list`（功能增强），3 个新模块作为其 children；`renderMenuItem` 支持递归（`renderSubmenu` 抽出），`findNavLabel` 改为递归 `walk` |
| `assets/js/prototype.js` | i18n 新增 `nav.FeatureEnhanceManage` / `nav.AICacheRuleManage` / `nav.TrafficMirrorRuleManage` / `nav.IntentConfigManage`（zh + en） |
| `assets/js/mock-data.js` | anthropic 改为 `k8s_pool` 示例（`instance_source`/`k8s_pool_name`/`k8s_instance_pool`）；新增 `aiCacheRules`(3 条)、`trafficMirrorRules`(2 条)、`intentConfig`(0.6 + choice/score 两问题)、`k8sPoolNames`；`reportOverview.cache/mirror/intent`、`reportTimeseries.cache_tokens`、`reportRankings` / `reportDistribution` 新维度、`reportLogs` logid 12348 含全部 10 个新字段 |
| `pages/providers.html` | 脚本版本号增量（`provider-upsert.js?v=2026092702`） |
| `pages/report.html` | 指标网格 5→4 列 + 3 新卡；3 新维度筛选 + Doris 橙色提示；5 个新明细过滤项；日志表头新增 `<th>缓存</th><th>镜像</th><th>意图答案</th>`；详情抽屉 9 新字段；`#chart-cache-tokens` 折线图 |
| `assets/js/provider-upsert.js` | 修复 6 处缺陷（见 §3.3）；`renderK8sPoolBody` 移除镜像实例块，新增/编辑表单仅保留「K8s 池名称」，只读镜像实例仅由 `renderDetail` 展示 |

### 3.3 原型脚本修复明细（`provider-upsert.js`）

| # | 缺陷 | 修复 |
| - | ---- | ---- |
| A | 第 306 与 448 行重复定义 `renderInstancePool`（提升后 448 覆盖 306） | 306 行重命名为 `renderManualPoolBody` |
| B | `renderDetail` 引用未定义变量 `source`，k8s 详情分支永不生效 | 改为 `data.instance_source === 'k8s_pool'` |
| C | `INSTANCE_SOURCE_TIP` / `K8S_POOL_NAME_TIP` / `K8S_MIRROR_TIP` 被引用但未定义 | 新增 3 个常量（后续按 §3.4 删除 `K8S_MIRROR_TIP`） |
| D | `#provider-instance-source` 无 change 监听 | `bindEvents` 内新增 change → `syncFromDom` → 设置 `instance_source` → `render()` |
| E | `createDefaultData` 缺 `instance_source` / `k8s_pool_name` / `k8s_instance_pool`，编辑/详情永远回退 `instance_pool` | 补齐 3 字段 |
| F | `bindEvents` 中 k8s 分支不应改写 `instance_pool` | `syncFromDom` k8s 分支保持 `instance_pool` 原值 |

### 3.4 原型第二轮评审反馈落地点

| # | 反馈 | 落地 |
| - | ---- | ---- |
| 1 | 3 个新模块不要平铺在「路由管理」下，另建单独菜单「功能增强」放在「路由管理」底下 | `layout.js` 在 `route.admin.list` 下新增二级分组 `FeatureEnhance.list`（功能增强，图标 ios-color-wand），3 个新模块挂为其 children；`renderMenuItem` 改为递归渲染（抽出 `renderSubmenu`），`findNavLabel` 改为递归 `walk`；`prototype.js` 新增 `nav.FeatureEnhanceManage`（zh/en） |
| 2 | AI 缓存 / 流量镜像参照路由规则页，增加「进入编辑模式 / 退出编辑模式」 | `ai-cache.html`、`traffic-mirror.html` 各自引入 `state.mode = 'view' \| 'edit'` + `originalRows` 快照：视图模式右上角仅「进入编辑模式」、行操作仅「查看」；编辑模式左侧「添加规则」、右上「退出编辑模式」+「提交并生效」（`.route-header-submit` 右上角绝对定位）、行操作「编辑/删除」；`exitEditMode` 有未提交改动时二次确认并回滚；`submitAll()` 写回后回到视图模式（与 `route.html` 范式一致） |
| 3 | 意图配置的问题列表改为列表（表格）展示，列：问题名称 / 类型 / 判定说明，操作按钮：查看 / 编辑 / 删除 | `intent-config.html` 由内联表单卡改为 `IvuUI.pageTable` 表格 + 单问题抽屉；类型列以 tag 展示 `枚举（choice）`/`评分（score）`；操作列「查看/编辑/删除」；隐藏分页器（`#ic-question-table .el-pagination { display:none }`）；查看为只读抽屉（footer 隐藏），新增/编辑共用抽屉并通过 `state.draft` 承载草稿 |
| 4 | 服务商界面添加/删除（新增/编辑）时不用展示实例池镜像，只在详情能看到 | `provider-upsert.js` `renderK8sPoolBody` 删除镜像实例块（连同 `K8S_MIRROR_TIP` 常量），新增/编辑表单仅保留「K8s 池名称」；只读镜像实例表仍由 `renderDetail` 的 `instance_source === 'k8s_pool'` 分支展示 |
| 5 | 意图配置的「添加问题」按钮应与问题列表放在一起（列表上方左侧） | `intent-config.html` 页头 `.ic-actions` 移除「添加问题」，按钮移入问题列表卡片体内、表格上方左侧：`.ic-list-toolbar`（`display:flex; justify-content:flex-start; margin-bottom:12px`）承载 `#btn-ic-add`；该工具栏仅在编辑模式显示 |
| 6 | 意图配置参照两规则页，增加「进入编辑模式 / 退出编辑模式」 | `intent-config.html` 引入 `state.mode = 'view' \| 'edit'`：视图模式右上角仅「进入编辑模式」、阈值以纯文案展示、行操作仅「查看」、隐藏「添加问题」；编辑模式右上「退出编辑模式」+「保存并发布」、行操作「查看/编辑/删除」；`enterEditMode` 快照 `originalMinConfidence`/`originalQuestions`，`exitEditMode` 有未提交改动时二次确认并回滚，保存并发布后回到视图模式；未发布过（404）自动进入编辑模式 |

> 浏览器实测（headless）：①导航树为「路由管理 → 功能增强 → {AI缓存规则, 流量镜像规则, 意图配置}」；②两规则页视图模式 `SUBMIT=[进入编辑模式]`、编辑模式 `ACTIONS=[添加规则] SUBMIT=[退出编辑模式 提交并生效]` 且行操作为「编辑 删除」；③意图配置表头 `问题名称|类型|判定说明|操作`，新增问题后表格行 2→3 且新行文案正确；④`renderForm(k8s_pool)` 无镜像实例（0 处实例地址），`renderDetail(k8s_pool)` 展示 2 条镜像实例；⑤意图配置页头 `.ic-actions` = `[进入编辑模式]`（视图模式），进入编辑模式后为 `[退出编辑模式, 保存并发布]`，`#btn-ic-add` 位于 `.ic-list-toolbar`（`display:flex; justify-content:flex-start`）内、在表格上方（toolbarTop 442 < tableTop 484），且与容器左边缘对齐。

### 3.5 原型校验补漏（第三轮反馈）

| # | 反馈 | 落地 |
| - | ---- | ---- |
| 1 | 流量镜像规则「规则名称」长度限制没有生效 | `traffic-mirror.html` `onDrawerSave` 补齐 `name.length < 1 \|\| name.length > 128` 校验（此前仅有必填与集合内唯一，缺失 1-128 长度校验；`ai-cache.html` 已有同款校验）；同步将名称输入框 placeholder 对齐为「请输入规则名称，1-128字符，集合内唯一」 |

---

## 4. UI 实施（`src/`，待实施）

按 `design-docs/README.md` 顺序：api-define → 模块/组件 → 路由 → 状态 → i18n。

### 4.1 新增模块

| 文件 | 说明 |
| ---- | ---- |
| `src/modules/AICache/index.vue` | 列表 + 两个抽屉（查看 / 新增编辑）；**视图/编辑双模式**（参照路由规则页：视图模式仅「进入编辑模式」+ 行「查看」，编辑模式「添加规则」+「退出编辑模式」+ 右上角「提交并生效」+ 行「编辑/删除」）；读 `GET ai-cache-rules`、写 `PUT ai-cache-rules`；`$request({url:'ai-cache-rules', openapi:true})` |
| `src/modules/AICache/components/RuleForm.vue` | 新增/编辑表单（对齐 `RouteTable/components/RuleForm.vue` 命名）：名称、条件（`Expression` 组件）、缓存键策略 Select、TTL / 最大请求体 / 最大缓存值 InputNumber；校验对齐 §2.1 |
| `src/modules/AICache/components/RuleView.vue` | 查看态纯文案组件（对齐 `RouteTable/components/RuleView.vue` 命名与 `info-row` 布局）：6 个只读信息行，不含任何表单控件 |
| `src/modules/TrafficMirror/index.vue` | 列表 + 两个抽屉（查看 / 新增编辑）；**视图/编辑双模式同 AICache**；读 `GET traffic-mirror-rules`、写 `PUT traffic-mirror-rules` |
| `src/modules/TrafficMirror/components/RuleForm.vue` | 新增/编辑表单（对齐 `RouteTable` 命名）：名称、条件、镜像集群 Select（选项来自 clusters 列表）、采样比例、头部剔除三态、`set_headers` KV、`body_rewrites`（path 固定 `model`）、路径改写；校验对齐 §2.2 |
| `src/modules/TrafficMirror/components/RuleView.vue` | 查看态纯文案组件（`info-row` 键值行布局）：8 个只读信息行，含头部剔除/设置请求头/请求体改写列表展示 |
| `src/modules/IntentConfig/index.vue` | 单例编辑页：全局阈值 + **问题表格**（列：问题名称 / 类型 / 判定说明 / 操作；新增/编辑/查看复用问题抽屉；**「添加问题」按钮置于问题列表上方左侧**）；**视图/编辑双模式**（同两规则页：`mode`/`isDirty`/`enterEditMode`/`exitEditMode`/`performExitEditMode`，视图模式阈值以纯文案展示、行操作仅「查看」、隐藏「添加问题」，编辑模式右上「退出编辑模式」+「保存并发布」）；`GET / PUT intent-config`；404 视为「未发布」，直接渲染默认配置并自动进入编辑模式，供编辑后保存并发布；choice/score 切换互斥字段；校验对齐 §2.3 |
| `src/modules/IntentConfig/components/QuestionForm.vue` | 新增/编辑表单（对齐项目 `*Form.vue` 命名）：问题名称、类型 Select、判定说明、选项/档位 KV 列表、最小置信度覆盖；校验对齐 §2.3 |
| `src/modules/IntentConfig/components/QuestionView.vue` | 查看态纯文案组件（对齐项目 `*View.vue` 命名与 `info-row` 布局）：5 个只读信息行 |

> 三个模块均为「集合/单例整体替换」写模式：本地维护完整数组，提交时整体 PUT；成功后重新 GET 回填（响应含只读 `created_at`/`updated_at`）。
>
> **查看态渲染**（三个模块一致）：查看态由独立的 `*View.vue` 组件承载，**不渲染任何表单控件**（无 Input / Select / InputNumber / `Expression` 编辑块），全字段以纯文案（`info-row` / `info-label` / `info-value` 纯 div 布局）展示；因**完全不经过 `Form` / `FormItem`**，从结构上不可能出现必填 `*` 号。新增/编辑态由 `*Form.vue` 承载，带 `rules` 的 `Form`，必填 `*` 号正常展示。
>
> **组件命名对齐**：新增/编辑与查看分别拆为 `*Form.vue` / `*View.vue`，与项目既有 `RouteTable/components/RuleForm.vue` + `RuleView.vue` 风格保持一致（项目内无 `*Drawer.vue` 先例）。

### 4.2 路由与导航

| 文件 | 变更 |
| ---- | ---- |
| `src/router/router.js` | 在 `AdvanceRouteRule.list` 后新增 3 条子路由：`AICacheRule.list`（`ai-cache-rules`）、`TrafficMirrorRule.list`（`traffic-mirror-rules`）、`IntentConfig.list`（`intent-config`）；路由本身平铺注册（菜单分组由后端 `nav_tree.toml` 决定） |
| `src/layout/sidebar/navItem.vue` | `navIcon` 新增 4 个路由名图标：`FeatureEnhance.list`(ios-color-wand) / `AICacheRule.list`(ios-flash) / `TrafficMirrorRule.list`(ios-copy) / `IntentConfig.list`(ios-chatbubbles)（与原型 `NAV_ICONS` 一致）；需支持二级子菜单渲染 |
| `src/i18n/zh.js` / `src/i18n/en.js` | `nav.*` 新增 `FeatureEnhanceManage`（功能增强 / Feature Enhance）/ `AICacheRuleManage` / `TrafficMirrorRuleManage` / `IntentConfigManage`；新增 3 个模块业务文案命名空间 |

> **导航树来源**：菜单由后端 `GET /meta` 返回的 `nav.admin` 驱动（`store.getNavRoot()`），前端 `router.js` 仅注册路由；`authorize.js` 路由守卫 `findNav(to.name)` 未命中会重定向登录。故需后端 `conf/nav_tree.toml` 在 `route.admin.list` 下新增二级分组 `FeatureEnhance.list`，3 个新入口作为其 children（见 §7.1）。

### 4.3 既有页面增量

| 文件 | 变更 |
| ---- | ---- |
| `src/modules/Providers/components/ProviderUpsert.vue` | 新增实例来源单选（人工维护 / K8s 池）；K8s 池模式**仅展示 `k8s_pool_name` 输入**（校验对齐 §2.4），**不展示 `k8s_instance_pool` 镜像实例列表**（请求体同样剔除该字段，避免 422） |
| `src/modules/Providers/components/ProviderView.vue` | 详情展示实例来源；K8s 池模式展示 `k8s_pool_name` + 只读镜像实例列表 |
| `src/utils/const.js` | 新增 `K8sPoolNameRegCheck`（1-64、`[A-Za-z0-9_.-]`、不以 `.`/`-`/`_` 起止）；复用 `ClustersNameRegCheck` 供镜像集群名校验 |
| `src/modules/Report/index.vue` | 总览新增 3 卡（缓存命中率 / 镜像命中 / 意图分类）；metric 网格 5→4 列；时序新增 `cache_tokens`（read/write 双序列）；排行/分布新增 3 维度；明细新增 5 个过滤项；Doris 后端下 3 维度禁用并提示 |
| `src/modules/Report/components/Logs.vue` | 日志表新增「缓存 / 镜像 / 意图答案」3 列；详情抽屉新增 9 个意图/缓存/镜像字段 |

---

## 5. 验收清单

**AI 缓存规则（#1）**

- [ ] 列表 7 列与 api-define 字段一致，数组顺序即展示顺序
- [ ] 视图/编辑双模式：视图模式仅「进入编辑模式」+ 行「查看」；编辑模式「添加规则」+「退出编辑模式」+ 右上角「提交并生效」+ 行「编辑/删除」；「提交并生效」固定右上角
- [ ] 「查看」抽屉全字段为**纯文案**：规则名称、生效条件以文本展示，不出现输入框，也不出现表达式编辑块，且**不显示必填 `*` 号**
- [ ] 有未提交改动时「退出编辑模式」二次确认并可回滚；提交成功后回到视图模式
- [ ] 新增/编辑校验：name 1-128 且集合内唯一、cond 必填、ttl≥0、maxBody/maxValue>0
- [ ] 策略 `disabled` 有「缓存豁免」文案提示，且标明会阻断后续规则
- [ ] 删除即从集合移除后整体 PUT；`{"rules": []}` 可清空
- [ ] 提交后重新 GET 回填 `created_at`/`updated_at`

**流量镜像规则（#2）**

- [ ] 视图/编辑双模式与 AI 缓存规则一致（进入/退出编辑模式 + 右上角提交并生效）
- [ ] 「查看」抽屉全字段为**纯文案**：规则名称、生效条件以文本展示，不出现输入框，也不出现表达式编辑块，且**不显示必填 `*` 号**
- [ ] 头部剔除三态展示与提交语义正确：缺省→默认黑名单、`[]`→不剔除、自定义→明文列出
- [ ] `cond` 必填且集合内不重复；全匹配须显式 `default_t()`
- [ ] `mirror_cluster` 必填；不存在时后端 422，前端给出可读错误
- [ ] `percentage` 0-100；`body_rewrites.path` 一期固定 `model`；`path_rewrite` 非空须 `/` 开头
- [ ] `set_headers` KV 键值均非空

**意图配置（#3）**

- [ ] 未发布过（GET 404）直接渲染默认配置并自动进入编辑模式（顶部提示「尚未发布」），不展示空态；已发布但 `questions: []` 正常展示空列表
- [ ] 问题以**表格**展示，列固定为「问题名称 / 类型 / 判定说明 / 操作」
- [ ] 视图/编辑双模式：视图模式仅「进入编辑模式」、阈值以纯文案展示、行操作仅「查看」、隐藏「添加问题」；编辑模式右上「退出编辑模式」+「保存并发布」、行操作「查看 / 编辑 / 删除」
- [ ] 有未提交改动时「退出编辑模式」二次确认并可回滚；保存并发布成功后回到视图模式
- [ ] 「添加问题」按钮位于**问题列表上方左侧**（与列表同卡、表格之上），仅在编辑模式显示
- [ ] 查看为只读抽屉（无保存、全字段纯文案、**不显示必填 `*` 号**）；新增/编辑共用抽屉且保存后回填表格
- [ ] `type` 在 choice/score 间切换时 `criteria` ↔ `levels` 互斥，切换后另一字段被清除
- [ ] 问题数 ≤10、选项/档位 1-10、选项名不含 `|`、问题 name 全局唯一
- [ ] 全局与单问题 `min_confidence` 均为 0-1
- [ ] 「保存并发布」整体 PUT，成功后回填

**Provider 实例来源（#4）**

- [ ] 编辑切到 K8s 池：**新增/编辑表单仅展示 `k8s_pool_name` 输入，不展示镜像实例列表**（镜像实例仅在详情页可见）
- [ ] 切回人工维护：`instance_pool` 恢复可编辑且原值保留
- [ ] `k8s_pool_name` 校验对齐 §2.4；请求体**不含** `k8s_instance_pool`
- [ ] 详情页 K8s 分支正确展示（原型曾因未定义变量导致该分支失效，UI 实现须覆盖）
- [ ] 有效池为空的 cluster 提示后端 500（`BK_NO_BACKEND`），不伪造前端成功

**报表新字段（#5）**

- [ ] 总览 3 新卡：缓存命中率（`hit/(hit+miss)`）、镜像命中数、意图分类（classified/unknown/unknown_rate）
- [ ] 时序 `cache_tokens` 双序列（`cache_read` / `cache_write`）图例与数据正确
- [ ] 排行/分布 3 新维度可选；**Doris 后端**下禁用并给出端点仅 MySQL 的提示
- [ ] 明细 5 个新过滤项（cache_status / mirror_hit / intent_question / intent_answer / intent_source）
- [ ] 日志表 3 新列、详情抽屉 9 新字段；`ai_intent_confidence`/`latency_us`/`cache_hit` 为 `null` 显示 `-`

**通用**

- [ ] 原型 `prototype-design/` 与 Vue 展示一致
- [ ] `npm run lint` 通过
- [ ] 页面无控制台告警（无缺失 i18n key）

---

## 5.1 接口合法性校验 ↔ UI 校验实现 对照核查

逐条比对 OpenAPI 合法性条件（§2）与前端实际校验实现，结论如下：

| 模块 | 接口合法性条件 | UI 校验实现位置 | 结论 |
| ---- | ------------- | -------------- | ---- |
| #1 AI 缓存规则 | name 1-128 且集合内唯一、cond 必填且可编译、strategy 枚举、ttl≥0、max_body/max_value>0 | `AICache/components/RuleForm.vue` `ruleValidate`（name required+`validateName` 具体校验长度 1-128、cond required+`validateCond`、strategy Select 3 项、ttl≥0、maxBody/maxValue>0）+ `AICache/index.vue` 集合查重、`buildPayload` 剥离只读字段 | ✅ 全覆盖 |
| #2 流量镜像规则 | name 1-128 唯一、cond 必填+编译+集合内唯一、mirror_cluster 必填、percentage 0-100、path_rewrite 非空须 `/` 开头、set_headers KV 非空、body_rewrites.value 非空、remove_headers 三态 | `TrafficMirror/components/RuleForm.vue` `ruleValidate`（name required+`validateName` 具体校验长度 1-128）+ `headerMode` 三态（custom 空→`tipRemoveHeadersEmpty`）+ `TrafficMirror/index.vue` `onFormSubmit`/`submitRules` 双查重（name/cond） | ✅ 全覆盖（cluster 存在性由服务端 422 兜底） |
| #3 意图配置 | min_confidence 0-1、questions 0-10、name 非空且全局唯一、type 枚举、instructions 非空、criteria 1-10 且不含 `\|`、levels 1-10、criteria/levels 互斥、单问题 min_confidence 0-1 | `IntentConfig/index.vue` `validateAll`/`validateOptions`/`validateOverride`/`buildQuestionPayload` + `IntentConfig/components/QuestionForm.vue` `ruleValidate`（name required+`validateName` 具体校验长度 ≤64、instructions required） | ✅ 全覆盖（name 额外 max64，严于接口） |
| #4 Provider 实例来源 | instance_source 枚举、k8s_pool_name 1-64 且 `[A-Za-z0-9_.-]` 不以 `./-/_` 起止、k8s_instance_pool 只读（携带→422） | `Providers/components/ProviderUpsert.vue` `validateName`/`validateK8sPoolName`/`validateProtocols`/`validateEndpoint`/`validateKeys`/`validateModels`/`validateProtocolPaths`；提交体剔除 `k8s_instance_pool` | ⚠️→✅ 见下「核查修复」#1 |
| #5 报表新字段 | start/end 必填、end>start、窗口≤7 天、metric/dimension 枚举、keyword≤128、新维度仅 MySQL | `Report/index.vue` `validateTimeRange`（end>start / ≤7 天）+ dimension Select 枚举 + 新维度 Doris 422 静默提示；`Report/components/Logs.vue` 5 个新过滤项枚举 + keyword 长度 | ⚠️→✅ 见下「核查修复」#2 |

### 核查修复（3 处）

| # | 文件 | 缺陷 | 修复 |
| - | ---- | ---- | ---- |
| 1 | `src/modules/Providers/components/ProviderUpsert.vue` | `validateK8sPoolName` 调用 `K8sPoolNameRegCheck(value)`，但文件顶部 import 仅含 `ProviderNameRegCheck, maskSecretKey` → `ReferenceError` + ESLint `no-undef`，K8s 池名称校验必崩 | import 补齐 `K8sPoolNameRegCheck` |
| 2 | `src/modules/Report/components/Logs.vue` | 接口 `report.md` 规定 `keyword` 长度上限 128，UI 未限制 | keyword 输入框加 `:maxlength="128"`（第四轮反馈认为 `maxlength` 不作为校验手段，已改为下见 #3） |
| 3 | `src/modules/AICache/components/RuleForm.vue`、`src/modules/TrafficMirror/components/RuleForm.vue`、`src/modules/IntentConfig/components/QuestionForm.vue`、`src/modules/Report/components/Logs.vue` | 第四轮反馈：`maxlength` 与声明式 `{ min, max }`（未带 `type:'string'`）在当前 iView/async-validator 版本下**不触发校验**，规则名称长度限制形同虚设（AICache/TrafficMirror 的 `ruleValidate.name` 甚至引用了未定义的 `validateName`） | ① AICache/TrafficMirror `ruleValidate` 内新增自定义 `validateName`（trim 后判空 + `length > 128` 报错），`name` 规则改为单条 `{ required: true, validator: validateName, trigger: 'blur' }`，移除 `:maxlength="128"`；② IntentConfig QuestionForm 同法新增 `validateName`（`length > 64`），移除 `:maxlength="64"`；③ Report `Logs.vue` 移除 `:maxlength="128"`，改为「查询」前 `searchLogs` 手动判长（>128 → `$Message.error(report.keywordTooLong)` 并中断查询） |

> 核查补充：`src/utils/const.js` 的 `K8sPoolNameRegCheck` 定义为 `/^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,62}[a-zA-Z0-9])?$/`（1-64、无空白），与 `providers.md` §3 一致；其余 `*RegCheck` 引用（`ClustersNameRegCheck`/`NumRegCheck`/`RateLimitRuleNameRegCheck`/`EntityNameRegCheck`/`PasswordRegCheck`）均有对应 import，无同类缺陷。
> 验证：`npm run lint`（`eslint --ext .js,.vue ./ --quiet --fix`）→ exit 0；相关 i18n key（`tipNameDuplicate`/`tipCondDuplicate`/`tipHeaderKvRequired`/`k8sPoolNameRule`/`tipOptionNameNoPipe`/`tipOverrideRange`/`aiCache.tipNameRequired`/`aiCache.tipNameLength`/`trafficMirror.tipNameRequired`/`trafficMirror.tipNameLength`/`intentConfig.tipQuestionNameRequired`/`intentConfig.tipQuestionNameTooLong`/`report.keywordTooLong` 等）在 `zh.js`/`en.js` 均存在。

---

## 6. 变更文件清单

### 原型（已完成）

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `prototype-design/pages/ai-cache.html` | 新建 | AI 缓存规则列表 + 抽屉 + 视图/编辑双模式 |
| `prototype-design/pages/traffic-mirror.html` | 新建 | 流量镜像规则列表 + 抽屉 + 视图/编辑双模式 |
| `prototype-design/pages/intent-config.html` | 新建 | 意图配置单例页（问题表格 + 问题抽屉；「添加问题」在列表上方左侧） |
| `prototype-design/pages/providers.html` | 已修改 | 脚本版本号 |
| `prototype-design/pages/report.html` | 已修改 | 3 卡 + cache_tokens 图 + 3 维度 + 5 过滤 + 3 列 + 9 字段 |
| `prototype-design/assets/js/layout.js` | 已修改 | 4 个 NAV_ICONS + 「功能增强」二级分组（递归菜单渲染） |
| `prototype-design/assets/js/prototype.js` | 已修改 | 4 个 nav i18n key（zh/en，含 FeatureEnhanceManage） |
| `prototype-design/assets/js/mock-data.js` | 已修改 | k8s provider 示例 + 3 模块 mock + 报表新字段 mock |
| `prototype-design/assets/js/provider-upsert.js` | 已修改 | 6 处缺陷修复 + 新增/编辑移除 k8s 镜像实例块（仅详情展示） |

> 上述原型文件在第二轮评审反馈中已按 §3.4 更新并完成浏览器实测；`ai-cache.html` / `traffic-mirror.html` / `intent-config.html` / `layout.js` / `prototype.js` / `provider-upsert.js` 均已就地修改（非新建）。

### 接口文档（已同步，阶段 1）

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `api-define/OpenAPI接口定义/ai-cache-rules.md` | 新增 | `/ai-cache-rules` 定义 |
| `api-define/OpenAPI接口定义/traffic-mirror-rules.md` | 新增 | `/traffic-mirror-rules` 定义 |
| `api-define/OpenAPI接口定义/intent-config.md` | 新增 | `/intent-config` 定义 |
| `api-define/OpenAPI接口定义/providers.md` | 已更新 | `instance_source` / `k8s_pool_name` / `k8s_instance_pool` / 有效池 |
| `api-define/OpenAPI接口定义/report.md` | 已更新 | 明细 10 列 + 总览 3 组 + `cache_tokens` + 3 维度 |
| `api-define/OpenAPI接口定义/operation-logs.md` | 已更新 | `change_summary` 快照键名与资源 API 字段名对齐（issue #205）；**`resource_type` 枚举未新增三模块类型** |
| `api-define/OpenAPI接口定义/README.md` | 已更新 | 索引 |

### UI 代码（已实施）

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `src/modules/AICache/index.vue` + `components/RuleForm.vue` + `components/RuleView.vue` | 新建 | AI 缓存规则模块 |
| `src/modules/TrafficMirror/index.vue` + `components/RuleForm.vue` + `components/RuleView.vue` | 新建 | 流量镜像规则模块 |
| `src/modules/IntentConfig/index.vue` + `components/QuestionForm.vue` + `components/QuestionView.vue` | 新建 | 意图配置模块 |
| `src/router/router.js` | 修改 | 3 条新路由 |
| `src/layout/sidebar/navItem.vue` | 修改 | 3 个 navIcon |
| `src/i18n/zh.js` / `src/i18n/en.js` | 修改 | nav + 3 模块文案 |
| `src/modules/Providers/components/ProviderUpsert.vue` | 修改 | 实例来源单选 + K8s 池只读镜像 |
| `src/modules/Providers/components/ProviderView.vue` | 修改 | 详情 K8s 分支 |
| `src/utils/const.js` | 修改 | `K8sPoolNameRegCheck` |
| `src/modules/Report/index.vue` | 修改 | 3 卡 + cache_tokens + 3 维度 + 5 过滤 |
| `src/modules/Report/components/Logs.vue` | 修改 | 3 列 + 9 详情字段 |
| `ai-gateway-runtime/conf/nav_tree.toml` | 修改 | `route.admin.list` 下新增 3 个菜单项（见 §7.1） |

---

## 7. 注意事项

1. **导航入口依赖后端 `nav_tree.toml`**：菜单树来自 `GET /meta` 的 `nav.admin`，前端 `router.js` 只注册路由；`authorize.js` 守卫 `findNav(to.name)` 未命中会重定向登录。按第二轮反馈，3 个新入口需收纳进二级分组「功能增强」（`FeatureEnhance.list`），必须同步在 `ai-gateway-runtime/conf/nav_tree.toml`（及 api 仓库 `conf/nav_tree.toml`）的 `route.admin.list.children` 下新增：

   ```toml
   { id = "FeatureEnhance.list", text = "FeatureEnhanceManage", allowed_roles = ["admin"],
     children = [
       { id = "AICacheRule.list", text = "AICacheRuleManage", allowed_roles = ["admin"] },
       { id = "TrafficMirrorRule.list", text = "TrafficMirrorRuleManage", allowed_roles = ["admin"] },
       { id = "IntentConfig.list", text = "IntentConfigManage", allowed_roles = ["admin"] }
     ] }
   ```

   否则新页面不可达（菜单不显示 + 直连 URL 被守卫拦截）。**风险点**：需确认后端 nav 解析器支持「子分组嵌套 children」（原型侧已按嵌套实现；若后端不支持二级分组，则退化为平铺 3 项，菜单文案不变）。

2. **`k8s_instance_pool` 只读**：请求体中携带返回 **422**。UI 提交前必须剥离该字段，仅在展示层使用；`instance_pool` 在 `k8s_pool` 模式下休眠保留（切回自动恢复），不可清空。
3. **流量镜像 `remove_headers` 三态语义**：`null`/缺省 ≠ `[]`。UI 需区分「使用默认黑名单」（回填服务端默认 `["Authorization","Cookie","X-Api-Key"]`）与「不剔除任何头部」（显式 `[]`），不可混同。
4. **`cond` 集合内唯一**：镜像规则中两条相同 `cond`（如都写 `default_t()`）会被后端 422 拒绝；UI 前端预校验给出可读提示。
5. **意图配置 `criteria`/`levels` 互斥**：切换 `type` 时必须清除另一侧字段，否则后端校验失败；`questions: []` 是停用软开关，非「未配置」。
6. **报表 3 新维度仅 MySQL**：Doris 后端请求返回 422（`mysql only until doris support lands`）。UI 需按当前查询后端禁用维度选项并提示，不可把 422 当普通错误。
7. **集合级整体替换**：三模块写操作均为全量 PUT（无单条接口、无分页、无 `enabled`），UI 必须以完整数组提交，禁止做「只改一条」的局部请求。
8. **原型 `provider-upsert.js` 的 6 处修复是 UI 实现的对照基线**：尤其 B（k8s 详情分支）与 E（默认数据含 k8s 字段）两类缺陷，在 Vue 实现中须避免复现。

---

## 8. 关联文档

| 文档 | 说明 |
| ---- | ---- |
| `api-define/OpenAPI接口定义/ai-cache-rules.md` | AI 缓存规则接口 |
| `api-define/OpenAPI接口定义/traffic-mirror-rules.md` | 流量镜像规则接口 |
| `api-define/OpenAPI接口定义/intent-config.md` | 意图配置接口 |
| `api-define/OpenAPI接口定义/providers.md` | Provider 实例来源（K8s 池） |
| `api-define/OpenAPI接口定义/report.md` | 报表缓存/镜像/意图新字段 |
| `prototype-design/pages/ai-cache.html` / `traffic-mirror.html` / `intent-config.html` | 三新模块原型 |
| `prototype-design/pages/providers.html` / `report.html` | 既有页面增量原型 |
| `ai-gateway-api/design-docs/modifications/2026-09-27-report-cache-mirror-intent-fields/api-changes.md` | 后端侧变更记录（报表三组字段） |
| `design-docs/README.md` | 变更流程与代码实现顺序 |
