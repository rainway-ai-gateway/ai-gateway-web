# UI 代码变更文档

> **对照接口**：`batches.md`、`security.md`（新模块）；`00-common.md`、`model-prices.md`、`clusters.md`、`operation-logs.md`、`auth.md`、`report.md`（既有一期增量 / 同步）
> **对照原型**：`prototype-design/pages/batches.html`、`security.html`（新建）；`operation-logs.html`、`user.html`（增量）；配套 `assets/js/layout.js`、`prototype.js`、`mock-data.js`、`api-key-upsert.js`、`entity-upsert.js`、`model-price-upsert.js`、`cluster-upsert.js`、`user-upsert.js`
> **状态**：**原型已完成（已 Review）** · **UI 代码待实施（阶段 2-6）**

本次变更：**批量任务模块首次引入** + **密钥收敛模块首次引入**，叠加 **API Key/Entity 批量限流**、**模型定价批量折扣**、**集群上游错误归一**、**操作日志资源类型扩展**、**用户创建保留名与密码强度** 五处既有页面增量，及 **导航菜单两处新增**。共 8 项范围：

| 编号 | 范围 | 性质 |
| ---- | ---- | ---- |
| #1 | 批量任务与批量文件模块（`BatchTask.list`） | 全新（列表 + 详情 + 取消 + 文件元数据，4 接口） |
| #2 | 密钥收敛模块（`ReencryptSweep.list`） | 全新（触发 + 轮询查询，2 接口） |
| #3 | API Key / Entity · 批量限流 `batch_limits` | 既有页面增量（表单新增 4 字段） |
| #4 | 模型定价 · 批量折扣系数 `batch_discount` + `mode=batch` | 既有页面增量（枚举 + 新字段） |
| #5 | 集群 · 上游错误归一 `normalize_upstream_error` | 既有页面增量（表单新增子卡） |
| #6 | 操作日志 · `resource_type` 新增 `batch` / `batch_file` | 既有页面增量（枚举 + 中文文案） |
| #7 | 用户 · 创建保留名校验 + 密码 8-72 字节规则 | 既有页面增量（校验 / 文案） |
| #8 | 导航菜单 · 「消费者管理」新增「批量任务」+ 顶级新增「系统安全」组（内含「密钥收敛」，紧跟「消费者管理」之后） | 增量（**依赖后端 `nav_tree.toml`，当前缺失**） |

> ⚠️ 接口文档已同步（阶段 1）；其中 `report.md`（报表四查询后端）、`00-common.md`（新增 403 错误码）、`auth.md`（锚点链接修正）**无 UI 影响**，仅为接口层同步，见 §2.8。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 状态 |
| ----------- | -------- | ---- |
| 批量任务（`BatchTask.list`） | 全新列表页：筛选栏（任务状态 / 服务商 / API Key ID / 创建时间起止）+ **主键游标分页**（`cursor`/`limit`/`next_cursor`）表格；列 = 批量任务ID / 服务商 / API Key ID / Entity ID / 状态(tag) / 请求计数 / 用量 / 预留金额 / 结算金额 / 结算状态(tag) / 创建时间 / 操作（详情 / 取消）；**详情抽屉（70% 宽，Review 5 卡片）** = 基本信息 / 状态与计数 / 用量与记账 / 文件与时间 / 批量文件表格；**取消**走二次确认，置 `status=cancelling` + `settle_status=released`，终态任务取消按钮 `disabled` | ✅ 原型 · ⬜ UI |
| 密钥收敛（`ReencryptSweep.list`） | 全新页面：**触发区**（变换方向 `mode` / 扫描范围 `scope` / 预演模式 `dry_run` switch + 触发按钮 + 409 互斥提示区）；**运行中任务横幅**（唯一 running，每 800ms 轮询进度）；**历史任务表格**（终态，无 TTL 累积）；**详情抽屉（60% 宽）** = 任务ID / 状态 / 变换方向 / 预演模式 / 扫描范围 / 活跃密钥ID / 起止时间 / 耗时 / providers 统计 / api_keys 统计 / 错误 | ✅ 原型 · ⬜ UI |
| API Key / Entity · 批量限流 | 限流编辑区新增「批量限流」section（4 个 InputNumber：`max_create_rpm` / `max_active_batches` / `max_file_bytes` / `max_file_lines`），按 API-Key 计、与模型无关；留空或 ≤0 不提交；查看态新增「批量限流」只读区 | ✅ 原型 · ⬜ UI |
| 模型定价 · 批量折扣 | 查看态新增「批量折扣系数」信息行；编辑态新增批量折扣系数输入（`batch_discount`，placeholder `0.5`）；`mode` 枚举新增 `batch`；`mode=batch` 行不渲染批量折扣系数（显示「-（mode=batch 的价格行不配置批量折扣系数）」）；校验 `(0,1]` 浮点 | ✅ 原型 · ⬜ UI |
| 集群 · 上游错误归一 | LLM 配置新增「上游错误归一」卡片：是否启用（`enabled`）/ 流式归一 SSE（`stream_enabled`）/ 凭证脱敏（`redact_secrets`）；`enabled=true` 时才显示「未识别错误体处理」（`unrecognized_action` 两枚举）与「错误响应体读取上限(字节)」（`max_body_bytes` 0-4194304）；复查行同步 | ✅ 原型 · ⬜ UI |
| 操作日志 · 资源类型 | `RESOURCE_TYPE_LABELS` 中文映射新增 `batch`（批量任务）/ `batch_file`（批量文件）；列表 `resource_type` 列与筛选 options、详情抽屉资源类型均以中文展示 | ✅ 原型 · ⬜ UI |
| 用户 · 创建 / 密码校验 | 创建用户校验保留名（`admin` / `root` / `system`）+ 密码规则（8-72 UTF-8 字节、不含空白、不等于用户名或其逆序）；按名引用端点（重置密码等）仅套密码规则、不做保留名校验；新密码输入框 placeholder 走 i18n | ✅ 原型 · ⬜ UI |
| 导航菜单 | 「消费者管理」（`consumer.admin.list`）children 新增「批量任务」（`BatchTask.list`，位于 `APIKey.list` 后、`Entity.list` 前）；顶级在「消费者管理」（`consumer.admin.list`）之后新增「系统安全」组（`systemSecurity.admin.list`），其 children 含「密钥收敛」（`ReencryptSweep.list`） | ✅ 原型 · ⛔ 运行时缺失（见 §7.1） |

---

## 2. 接口依据

### 2.1 批量任务 / 批量文件 `/batches`、`/batch-files`（全新）

**接口**：`GET /batches`（列表，FeatureBatch+ActionRead）、`GET /batches/{batch_id}`（详情，FeatureBatch+ActionRead）、`POST /batches/{batch_id}/cancel`（取消，FeatureBatch+ActionCancel，写 operation_logs）、`GET /batch-files/{file_id}?provider=`（文件元数据，FeatureBatch+ActionRead）。

**全局约定**：

- `product_name` 由认证中间件从调用凭证解析并**强制注入**为查询条件，不接受外部传参、请求携带一律忽略（只读展示）。
- **金额口径**：`reserve_units` / `settle_units` 为 **1e-8 定点整数**（单位 RMB，1 单位 = 0.00000001 元），**不做 ÷1e8 换算**。
- **分页**：主键游标分页（`cursor` / `limit`），响应携带 `next_cursor`（`0` = 无更多数据）。
- **一期范围**：仅管控（列表 / 详情 / 取消 / 文件查询），**不包含批量任务创建**（创建走 provider 透传，不经控制面）。

**`GET /batches` 输入参数（Query）**：

| 参数名 | 类型 | 必填 | 说明 | 合法性条件 |
| ---- | ---- | ---- | ---- | ---- |
| `api_key_id` | string | N | 按 API Key 过滤 | - |
| `entity_id` | string | N | 按实体过滤 | - |
| `provider` | string | N | 按 provider 过滤 | - |
| `status` | string | N | 按任务状态过滤（单值） | `validating`/`queued`/`in_progress`/`finalizing`/`completed`/`expired`/`failed`/`cancelled`/`cancelling` |
| `start_time` | int64 | N | 起始时间戳（秒），按创建时间过滤 | 与 `end_time` 同传时查询闭区间 |
| `end_time` | int64 | N | 结束时间戳（秒） | - |
| `cursor` | int64 | N | 分页游标（上一页最后一行的主键 `id`） | 上一页 `next_cursor`；首页不传；≥0 整数 |
| `limit` | int | N | 每页条数 | 默认 50；范围 1-200，超出截断为 200 |

- 返回：`{ list: []BatchTask, next_cursor: int64 }`（`next_cursor=0` 表示无更多数据）；**不使用**全局 `page`/`page_size`。
- 错误码：401 / 402（无 FeatureBatch 读权限）/ 422（`status`/`limit`/时间区间非法）。

**`BatchTask` 字段**：

| 字段 | 类型 | 说明 | 取值 / 合法性 |
| ---- | ---- | ---- | ---- |
| `batch_id` | string | 批量任务标识（provider 侧 batch id） | 非空；详情/取消路径参数 |
| `api_key_id` | string | 发起任务的网关 API Key ID | - |
| `product_name` | string | 产品线 | 中间件强制注入，只读 |
| `entity_id` | string | 任务归属实体 | - |
| `provider` | string | provider 名称 | - |
| `endpoint` | string | 透传端点 | 如 `/v1/batches` |
| `input_file_id` | string | 批量输入文件 ID | - |
| `output_file_id` | string | 批量输出文件 ID | 未完成时为空 |
| `status` | string | 任务状态 | 9 枚举，见 §2.1 状态机 |
| `request_counts` | object | provider 请求计数（JSON 原样） | 含 `total`/`completed`/`failed` |
| `est_lines` | int64 | 估算行数 | ≥0 |
| `usage_input_tokens` / `usage_output_tokens` | int64 | 实际输入/输出 token 数 | ≥0 |
| `usage_source` | string | usage 来源 | `download`（输出文件下载回读）/ `reconcile`（对账） |
| `reserve_units` | int64 | 预留金额（1e-8 定点整数 RMB） | ≥0 |
| `settle_units` | int64 | 结算金额（1e-8 定点整数 RMB） | ≥0 |
| `settle_status` | string | 结算状态 | `reserved` / `settled` / `released` |
| `over_reserved` | bool | 是否超额预留（结算后仍有剩余） | - |
| `sync_source` | string | 任务记录同步来源 | `redis`（BATCH_TASK 回源）/ `log`（日志对账落库） |
| `created_at` / `updated_at` | string | 创建 / 更新时间（RFC3339） | 只读 |
| `terminal_at` | string | 进入终态时间 | 未终结为空 |
| `batch_files` | array | 关联批量文件元数据列表 | 元素见下 |

**`BatchFile` 字段**（`(file_id, provider)` 唯一定位）：

| 字段 | 类型 | 说明 | 取值 / 合法性 |
| ---- | ---- | ---- | ---- |
| `file_id` | string | 文件标识（provider 侧 file id） | 非空 |
| `provider` | string | provider 名称 | 与 `file_id` 联合唯一定位 |
| `purpose` | string | 文件用途 | `batch_input` / `batch_output` 等 provider 枚举 |
| `filename` | string | 文件名 | - |
| `bytes` | int64 | 文件大小（字节） | ≥0 |
| `created_at` | string | 创建时间（RFC3339） | 只读 |

**状态机与终态**：`validating` → `queued` → `in_progress` → `finalizing` → `completed`/`failed`/`expired`/`cancelled`；`cancelling` 为取消处理中的中间态。**终态集合** = `completed`/`expired`/`failed`/`cancelled`，**终态任务不接受取消（409）**。

**详情 / 取消处理逻辑**：

- 详情查询顺序：DB → Redis `BATCH_TASK` 回源（`sync_source=redis`，job 落库前窗口期，结算类字段可能未就绪）→ 404。
- 取消：DB 条件更新抢占（`status='cancelling' WHERE status NOT IN 终态`，`affected_rows=0` → 409）→ 出网调 provider cancel → Redis **幂等**释放预留 → 写 operation_logs（`resource_type=batch`）。错误码：401 / 402 / 404 / 409（已终态或他实例处理中）/ **502（provider 不可达，出网失败）**。
- 前置依赖：控制面 → provider **出网**可达；降级部署无出网时取消退化为不可用（批量任务仅支持展示）。

### 2.2 密钥收敛 `/open-api/v1/security/reencrypt-sweeps`（全新）

**接口**：`POST /open-api/v1/security/reencrypt-sweeps`（触发，FeatureSecurity(scope=System)+`update`）、`GET /open-api/v1/security/reencrypt-sweeps/{task_id}`（查询，FeatureSecurity+`read`）。触发与完成均写 operation_logs。

**POST 请求体（JSON，全可选）**：

| 字段 | 类型 | 必填 | 默认 | 合法性条件 |
| ---- | ---- | ---- | ---- | ---- |
| `mode` | string | N | `reencrypt` | 仅 `reencrypt` \| `decrypt`；`decrypt` = 全部密文行解密为明文，**仅用于回滚预案** |
| `dry_run` | bool | N | `false` | `true` 只扫描统计，不写库 |
| `scope` | string | N | `all` | 仅 `all` \| `providers` \| `api_keys` |

- **异步语义**：POST 立即返回 HTTP 200（`xreq` 将 2xx 统一归一为 200），body `status=running`；进度经 GET 轮询（非 202）。
- 错误码：401 / 402（无 FeatureSecurity 权限）/ **409（已有任务运行，归因含持有者 `task_id`）** / 422（`mode`/`scope` 非法）。

**任务对象字段**（POST 返回、GET 查询同构）：

| 字段 | 类型 | 说明 | 取值 |
| ---- | ---- | ---- | ---- |
| `task_id` | string | 任务标识 | `rsp-…`；GET 路径入参 |
| `status` | string | 任务状态 | `running` / `succeeded` / `failed`（`failed` 含 `executor lost` 执行实例失联被接管） |
| `mode` | string | 行级变换方向 | `reencrypt` / `decrypt` |
| `dry_run` | bool | 是否只扫描统计 | true / false |
| `scope` | string | 扫描范围 | `all` / `providers` / `api_keys` |
| `active_key_id` | int | 任务启动时 keyring 的 active 钥 | 0–255；`decrypt` 模式为 0；**触发响应携带以便立即核对"重写目标钥"** |
| `started_at` / `finished_at` | string | 起止时间（RFC3339） | running 时 `finished_at` 为空 |
| `duration_ms` | int | 任务耗时（毫秒） | ≥0；running 时为当前已耗时 |
| `summary` | object | 按表分组计数 | 见下 |
| `error` | string | 失败归因 | 仅 `failed` 时非空；**不含任何密钥或密文材料** |

**`summary` 结构**：`{ providers: {scanned, rewritten, skipped}, api_keys: {scanned, rewritten, skipped} }`

- `scanned` 已扫描行数；`rewritten` 已重写行数（`dry_run` 下为"将要重写"数）；`skipped` 已是目标形态。

**约束**：

- **集群级单例互斥**：任一时刻仅一个任务运行；运行中重复触发返回 409 并携带持有者 `task_id`（直接轮询该任务，**不排队**）。
- **幂等**：任务完成后可重触发（空跑 `rewritten=0` 即收敛确认）；执行实例失联由后续触发自动接管，旧任务标记 `executor lost`。
- 任务记录持久化于 `keyrotate_sweep_tasks` 表，**历史保留（无 TTL）**；多实例部署下任意实例均可查询任意任务。
- GET 错误码：401 / 402 / 404（`task_id` 不存在）。

### 2.3 批量限流 `batch_limits`（增量 · `00-common.md`）

`RateLimitPolicy` 新增 `batch_limits`（object，非必填）：省略 / `null` = 该策略不参与批量限流；**四维度均按 API-Key 计、与 `model` 无关**（批量创建请求体无 model 字段）；导出为 BFE `ai_rate_limit.data` 策略 `rules.batch` 段；**不配置不代表批量不限流**——仍受 BFE `mod_ai_batch.data` 全局硬顶约束。

| 字段 | 类型 | 必填 | 说明 | 合法性条件 |
| ---- | ---- | ---- | ---- | ---- |
| `max_create_rpm` | int | N | 单 API-Key 批量任务创建 RPM | ≥0；`0` 或省略 = 不配此维度 |
| `max_active_batches` | int | N | 单 API-Key 在途批量任务上限 | ≥0；`0` 或省略 = 不配此维度 |
| `max_file_bytes` | int | N | 单文件字节上限 | ≥0；`0` 或省略 = 不配此维度 |
| `max_file_lines` | int | N | 单文件行数上限 | ≥0；`0` 或省略 = 不配此维度 |

### 2.4 模型定价 `batch_discount` + `mode=batch`（增量 · `model-prices.md`）

| 字段 | 类型 | 校验 |
| ---- | ---- | ---- |
| `batch_discount` | float | 非必填；默认 `0.5`；取值范围 `(0,1]`；**仅从 `mode != batch` 的记录展开** |

- `mode` 枚举新增 `batch`（批量任务，`/v1/batches` 类请求）；`file` 不进价格体系（`/v1/files` 不生成 `mode=file` 价格行），批量统一按 `mode=batch` 计费。
- **§1.3 批量价格展开语义**：控制面导出（InnerAPI 组装 `AIConf.ModelTable`）时，对每条 `mode != batch` 且配置 `batch_discount` 的行，将 `prices` 各 token 价格键逐键 × 系数，生成 `(provider, model, mode=batch)` 价格行下发 BFE；`tier_prices` 各档同样逐档展开。
- **手工 `mode=batch` 行优先于系数展开**：已存在手工行时以手工行为准、不做展开，导出时检测到冲突**告警日志**（不阻塞导出）。
- `mode=batch` 的价格行**本身不再配置** `batch_discount`（系数展开只从非批量行生成）。
- 向后兼容：`batch_discount` 可选，存量记录为 `NULL`（= 不展开）。

### 2.5 集群上游错误归一 `normalize_upstream_error`（增量 · `clusters.md`）

`llm_config` 新增 `normalize_upstream_error`（object，非必填）：上游厂商错误归一为网关统一错误码与 OpenAI 兼容错误体（含状态码重映射、凭证脱敏、SSE 错误事件改写），**按集群独立灰度**；缺省 = 关闭（上游错误原样透传）。

| 字段 | 类型 | 说明 | 合法性条件 |
| ---- | ---- | ---- | ---- |
| `enabled` | bool | 非流式归一开关；`true` 时上游 4xx/5xx 重写为统一错误体，状态码按映射表重映射（如上游 401/402/403 → 502 `UPSTREAM_AUTH_ERROR`，与客户端自身凭证错误的 401 区分）；默认 `false` | 必须为 bool |
| `stream_enabled` | bool | 流式（SSE）归一开关；独立灰度；`true` 时流内错误事件 data 改写为统一错误 JSON（响应状态保持 200），并对流截断打访问日志标记；默认 `false` | 必须为 bool |
| `unrecognized_action` | string | 未识别错误体处理；`passthrough`（默认：原样透传，仍做凭证脱敏）/ `rewrite_generic`（重写为 `UPSTREAM_UNKNOWN`）；流式未识别事件始终透传 | 仅 `passthrough` / `rewrite_generic` |
| `max_body_bytes` | int | 错误响应体读取上限（字节） | ∈ [0, 4194304] 整数（`0` = 用 BFE 默认 65536） |
| `redact_secrets` | bool | 凭证脱敏开关 | 必须为 bool |

- 校验规则与 BFE `AIConfCheck` **逐条对齐**（防止"控制面放行、BFE 加载失败"的配置穿透）。

### 2.6 操作日志 `resource_type`（增量 · `operation-logs.md`）

`resource_type` 枚举在 `model_price` 后新增 `batch` / `batch_file`：

```
entity / entity_type / api_key / provider / cluster / route / certificate /
quota_plan / model_price / batch / batch_file / user / token
```

### 2.7 用户创建保留名 + 密码规则（增量 · `00-common.md`）

- **UserName**：**创建用户**时不能为 `admin`、`root`、`system` 等保留用户名（防止冒用系统内置身份）；**按名引用已有用户的端点**（重置密码、设置管理员、查询用户等）**不受保留名限制**，允许操作系统内置账号。
- **Password**：长度 **8-72 字节**（bcrypt 算法上限，按 UTF-8 字节计）；不能包含空白字符；不能等于对应 `user_name` 或其逆序；库内以 bcrypt 哈希存储（`$2a$` 前缀），不明文落库。

### 2.8 无 UI 影响的接口同步

| 文件 | 变更 | UI 影响 |
| ---- | ---- | ---- |
| `report.md` | 查询后端由 MySQL/Doris 扩展为 **MySQL/Doris/ClickHouse/StarRocks 四后端**；分位数字段四后端均可用；参数校验错误码由 HTTP 400(ErrNum 422) 改为 **HTTP 422** | **无**（纯后端能力扩展，UI 后端下拉沿用既有实现，本次不改） |
| `00-common.md` | 错误码新增 **403**（管理面 IP 白名单拒绝，`[AccessControl]` 启用时；网络层先于鉴权执行） | **无**（无专属 UI，沿用既有错误提示） |
| `auth.md` | 锚点链接 `#12-…`/`#13-…`/`#14-…` 修正为 `00-common.md#…`（5 处） | **无**（文档锚点修正，无内容语义变更） |
| `README.md` | 索引新增 `/security/reencrypt-sweeps`、`/batches`、`/batch-files` | **无**（索引） |

---

## 3. 原型（已完成，已 Review）

### 3.1 新建页面

| 文件 | 结构要点 |
| ---- | -------- |
| `prototype-design/pages/batches.html`（391 行，新建） | `Layout.render({pageId:'BatchTask.list', basePath:'../'})`；常量 `STATUS_LABELS`（9 状态中文+英文）、`STATUS_TAG_TYPES`、`SETTLE_LABELS`（reserved/settled/released）、`SETTLE_TAG_TYPES`、`PAGE_LIMIT=5`、`TERMINAL_STATUSES=['completed','expired','failed','cancelled']`；筛选栏（任务状态 / 服务商 / API Key ID / 创建时间起止 + 查询 / 重置，select 与日期 `onchange` 即查询、API Key 回车查询）；**游标分页**（`state.cursorStack` 保存已访问游标、`currentCursorRows()` 按 `batch_id` 滑动、`nextCursor` 计算）；表格列 = 批量任务ID / 服务商 / API Key ID / Entity ID / 状态(tag) / 请求计数(helpIcon「总数/完成/失败」) / 用量(helpIcon「输入/输出 tokens」) / 预留金额(helpIcon「1e-8 定点整数 RMB，不做 ÷1e8 换算」) / 结算金额(同口径 helpIcon) / 结算状态(tag) / 创建时间 / 操作（详情 + 取消；**终态取消按钮 `disabled title="终态任务不可取消"`**）；**详情抽屉 70% 宽**，`Review` 5 个 panel 卡片：基本信息 / 状态与计数 / 用量与记账 / 文件与时间 / 批量文件（`mapping-table`，`formatBytes` 展示字节）；取消走 `Prototype.confirm`：置 `row.status='cancelling'; row.settle_status='released'`，toast「取消请求已受理，任务进入 cancelling 状态」 |
| `prototype-design/pages/security.html`（285 行，新建） | `Layout.render({pageId:'ReencryptSweep.list', basePath:'../'})`；常量 `MODE_LABELS={reencrypt:'重加密',decrypt:'解密'}`、`SCOPE_LABELS={all:'全部',providers:'仅 providers 表',api_keys:'仅 api_keys 表'}`、`SWEEP_TOTALS={providers:120,api_keys:2400}`；**触发区**（变换方向 `#sec-mode` / 扫描范围 `#sec-scope` / 预演模式 `#sec-dry-run` switch + 「触发任务」+ `#sec-conflict` 409 提示区）；**运行中任务横幅**（`runningTask()` 唯一 running，`renderRunning()` 无则显示「当前无运行中任务，可直接触发。」）；**历史任务表格**（终态行：任务ID / 状态 / 变换方向 / 开始时间 / 操作-详情）；**详情抽屉 60% 宽**（`detailBody()` = 任务ID / 状态 / 变换方向 / 预演模式 / 扫描范围 / 活跃密钥ID / 起止时间 / 耗时 / providers 统计 / api_keys 统计 / 错误）；`onTrigger()`：`runningTask()` 存在则 409「409 已有任务运行中，task_id: xxx，请等待完成；可直接轮询该任务，不排队。」；`startPolling(task)` 每 800ms 递增 scanned/rewritten（`step=Math.max(1,Math.round(total/10))`），完成后 `status='succeeded'` |

### 3.2 既有页面 / 资产增量

| 文件 | 变更 |
| ---- | ---- |
| `assets/js/layout.js` | `NAV_ICONS` 新增 `'BatchTask.list': 'ivu-icon ivu-icon-ios-archive'`、`'systemSecurity.admin.list': 'ivu-icon ivu-icon-ios-lock'`、`'ReencryptSweep.list': 'ivu-icon ivu-icon-ios-lock'`；「消费者管理」（`consumer.admin.list`）children 在 `APIKey.list` 后、`Entity.list` 前插入 `{id:'BatchTask.list', i18n:'BatchTaskManage', page:'batches.html', text:'批量任务'}`（带注释「后端 nav_tree.toml 尚无此菜单项，原型中作为占位先行（已确认决策）」）；顶级在「消费者管理」（`consumer.admin.list`）之后插入「系统安全」组 `{id:'systemSecurity.admin.list', i18n:'SystemSecurityManage', text:'系统安全', children:[{id:'ReencryptSweep.list', i18n:'ReencryptSweepManage', page:'security.html', text:'密钥收敛'}]}` |
| `assets/js/prototype.js` | i18n zh/en 新增 `nav.BatchTaskManage`（批量任务 / Batch Tasks）、`nav.SystemSecurityManage`（系统安全 / System Security）、`nav.ReencryptSweepManage`（密钥收敛 / Key Re-encryption）+ 5 个 `user.*` 文案（`passwordPlaceholder` / `tipReservedUserName` / `tipPasswordLength` / `tipPasswordWhitespace` / `tipPasswordUserName`） |
| `assets/js/mock-data.js` | `routeRules` 增 `batch_limits:{max_create_rpm:10,max_active_batches:5,max_file_bytes:104857600,max_file_lines:50000}`；某 cluster 增 `llm_config.normalize_upstream_error={enabled:true,stream_enabled:false,unrecognized_action:'passthrough',max_body_bytes:65536,redact_secrets:true}`；某 modelPrice 增 `batch_discount:0.5`；新增手工 `mode:'batch'` 行（id:8，provider deepseek，model `DeepSeek V3`，prices input 1.35e-7 / output 5.5e-7 / cache_read 3.5e-8）；`modelModes` 增 `'batch'`；`operationLogResourceTypes` 在 `model_price` 后增 `'batch'`/`'batch_file'`；新增 `batchTasks:{list:[…8 条…], next_cursor:0}` 与 `reencryptSweepTasks:[…2 条（running/succeeded）…]` |
| `assets/js/api-key-upsert.js` | 新增 `BATCH_LIMIT_FIELDS`（4 字段：`max_create_rpm` 批量创建 RPM / `max_active_batches` 在途批量任务上限 / `max_file_bytes` 单文件字节上限 / `max_file_lines` 单文件行数上限，各含 key/id/label）、`validateBatchLimitValue(value,label)`（空返回 null，负数返回「X不能为负数」）、`bindBatchLimitInputs()`、`validateBatchLimitsForm()`（返回 firstErr）、`collectBatchLimits()`（留空或 ≤0 不提交，全空返回 null）、`renderBatchLimitsDetail(batchLimits)`；`renderRateLimitRules(tpmRules,rpmRules,maxMode,maxConc,isAdd,batchLimits)` 新增「批量限流」section（4 InputNumber + form-tip「四维度均按 API-Key 计、与模型无关；0 或留空 = 不配此维度；不配置不代表批量不限流，仍受 BFE mod_ai_batch.data 全局硬顶约束」） |
| `assets/js/entity-upsert.js` | `renderRateLimitRules(...,batchLimits)` 传入；validate 中调用 `ApiKeyUpsert.validateBatchLimitsForm()` |
| `assets/js/model-price-upsert.js` | `errors` 增 `batch_discount`；查看态新增「批量折扣系数」`info-row`（`mode=batch` 显示「-（mode=batch 的价格行不配置批量折扣系数）」否则 `formatPrice`）；编辑态新增批量折扣系数块（id=`field-batch_discount`，placeholder `0.5`，help 含「导出时将本行各 token 价格键 × 系数展开…」），`mode=batch` 时不渲染；mode select onchange 刷新；校验：`mode!=batch` 且填写时须为 `(0,1]` 浮点数，否则报「批量折扣系数必须为 (0,1] 区间内的浮点数」；payload 仅 `mode!=batch` 且 `batch_discount!=null` 时附 `batch_discount`，否则置 null |
| `assets/js/cluster-upsert.js` | 默认 / 回显 `normalize_upstream_error` 默认 `{enabled:false,stream_enabled:false,unrecognized_action:'passthrough',max_body_bytes:65536,redact_secrets:true}`；新增「上游错误归一」表单卡（是否启用 / 流式归一(SSE) / 凭证脱敏，`enabled=true` 时才显示未识别错误体处理 + 错误响应体读取上限(字节)）；复查行 `normalizeErrorHtml`；`syncFromDom` 处理 `normalize_upstream_error.` 前缀（`nueKey=key.slice(25)`）；`validateLlm` 校验 `unrecognized_action` 枚举（错误「未识别错误体处理仅支持 passthrough / rewrite_generic」）与 `max_body_bytes` 0-4194304（错误「错误响应体读取上限须为 0-4194304 的整数」）；事件绑定 `[data-field="llm.normalize_upstream_error.enabled"]` change 重渲 |
| `assets/js/user-upsert.js` | 新密码 placeholder 改为 `Prototype.t('user.passwordPlaceholder')` |
| `pages/operation-logs.html` | 新增 `RESOURCE_TYPE_LABELS`（`entity`/`entity_type`/`api_key`/`provider`/`cluster`/`route`/`certificate`/`quota_plan`/`model_price`/`batch`/`batch_file`/`user`/`token` 中文映射）与 `resourceTypeLabel()`；列与筛选 options 用中文 label，`resource_type` 列 render 中文，详情抽屉资源类型也走 `resourceTypeLabel` |
| `pages/user.html` | 新增 `RESERVED_USER_NAMES=['admin','root','system']`、`utf8ByteLength()`（TextEncoder）、`isReservedUserName()`、`validatePasswordRule(password,userName)`（8-72 字节、不含空白、不等于用户名或其逆序，错误文案走 `Prototype.t`）；**创建用户**时校验保留名 + 密码规则；**改密**走按名引用端点仅套密码规则、不做保留名校验 |

### 3.3 导航菜单新增（原型占位）

| 位置 | 层级 | 菜单项 |
| ---- | ---- | ---- |
| 「消费者管理」（`consumer.admin.list`） | 二级 | `BatchTask.list`「批量任务」（位于 `APIKey.list` 后、`Entity.list` 前） |
| 顶级 | 一级 | `systemSecurity.admin.list`「系统安全」组（紧跟「消费者管理」`consumer.admin.list` 之后） |
| 「系统安全」组（`systemSecurity.admin.list`） | 二级 | `ReencryptSweep.list`「密钥收敛」 |

> ⚠️ 上述新增菜单（「批量任务」+「系统安全」组）**尚未在运行时 `ai-gateway-runtime/conf/nav_tree.toml` 中登记**（见 §7.1），原型中作为占位先行（已确认决策）。

---

## 4. UI 实施（`src/`，待实施）

按 `design-docs/README.md` 顺序：api-define → 模块/组件 → 路由 → 状态 → i18n。

### 4.1 新增模块

| 文件 | 说明 |
| ---- | ---- |
| `src/modules/BatchTasks/index.vue` | 批量任务列表页：筛选栏（状态 / 服务商 / API Key ID / 创建时间起止）+ **游标分页表格**（`GET batches`，`$request({url:'batches', openapi:true, params:{cursor, limit}})`，`next_cursor` 驱动翻页）；列对齐 §2.1；「详情」打开详情抽屉（`GET batches/{batch_id}`，含 `batch_files`）；「取消」二次确认 → `POST batches/{batch_id}/cancel`（终态按钮 `disabled`）；`502`（provider 不可达）/`409`（已终态）给可读提示 |
| `src/modules/BatchTasks/components/BatchView.vue` | 详情抽屉（Review 卡片布局）：基本信息 / 状态与计数 / 用量与记账 / 文件与时间 / 批量文件表格（`bytes` 字节 + `formatBytes`） |
| `src/modules/Security/index.vue` | 密钥收敛页：触发区（`mode` / `scope` Select + `dry_run` Switch + 「触发任务」）+ 运行中任务横幅（`GET security/reencrypt-sweeps/{task_id}` **轮询**）+ 历史任务表格 + 详情抽屉；触发 409 时展示持有者 `task_id` 提示（`不排队`） |
| `src/modules/Security/components/SweepView.vue` | 详情抽屉：task_id / status / mode / dry_run / scope / active_key_id / started_at / finished_at / duration_ms / summary（providers + api_keys 两组 scanned/rewritten/skipped）/ error |

### 4.2 既有模块增量

| 文件 | 变更 |
| ---- | ---- |
| `src/modules/APIKey/components/Upsert.vue` | 限流编辑区新增「批量限流」4 字段（`batch_limits`：`max_create_rpm` / `max_active_batches` / `max_file_bytes` / `max_file_lines`）；留空或 ≤0 不提交；查看态新增只读区；校验对齐 §2.3 |
| `src/modules/Entity/components/EntityUpsert.vue` | 同上（限流表单内新增批量限流，复用同一套字段与校验） |
| `src/modules/ModelPrices/components/ModelPriceUpsert.vue` / `ModelPriceView.vue` | 编辑态新增「批量折扣系数」输入（`batch_discount`，`mode=batch` 时不渲染）；查看态新增只读行；校验对齐 §2.4（`(0,1]` 浮点）；`mode` Select 新增 `batch` |
| `src/modules/Clusters/components/GatewayConfig.vue` | LLM 配置新增「上游错误归一」卡片（`enabled` / `stream_enabled` / `redact_secrets` Switch，`unrecognized_action` Select 两枚举，`max_body_bytes` InputNumber 0-4194304）；`enabled=true` 时才显示后两者；校验对齐 §2.5 |
| `src/modules/Clusters/components/Review.vue` | 复查行新增 `normalize_upstream_error` 摘要 |
| `src/modules/OperationLogs/index.vue` | `resource_type` 中文映射新增 `batch` / `batch_file`；列 / 筛选 options 走中文 label |
| `src/modules/User/components/CreateUser.vue` | 创建用户校验保留名（`admin` / `root` / `system`）+ 密码规则（8-72 UTF-8 字节、不含空白、不等于用户名或其逆序） |
| `src/modules/User/components/UpdatePassword.vue` | 密码校验 8-72 字节规则（按名引用端点，不做保留名校验） |
| `src/i18n/zh.js` / `src/i18n/en.js` | 新增 `nav.BatchTaskManage` / `nav.SystemSecurityManage` / `nav.ReencryptSweepManage` + `BatchTasks` / `Security` 模块文案 + 各既有点位新字段文案 |

### 4.3 路由与导航

| 文件 | 变更 |
| ---- | ---- |
| `src/router/router.js` | 平铺新增子路由：`BatchTask.list`（`path: 'batches'`，懒加载 `../modules/BatchTasks`，chunk `'batch-task.list'`）、`ReencryptSweep.list`（`path: 'security'`，懒加载 `../modules/Security`，chunk `'security.list'`） |
| `src/layout/sidebar/navItem.vue` | `navIcon` 新增 `BatchTask.list`（`ios-archive`）、`systemSecurity.admin.list`（`ios-lock`）、`ReencryptSweep.list`（`ios-lock`），与原型 `NAV_ICONS` 一致 |
| `src/i18n/zh.js` / `src/i18n/en.js` | `nav.*` 新增 `BatchTaskManage`（批量任务 / Batch Tasks）、`SystemSecurityManage`（系统安全 / System Security）、`ReencryptSweepManage`（密钥收敛 / Key Re-encryption） |
| `ai-gateway-runtime/conf/nav_tree.toml` | ⛔ **待更新**：`consumer.admin.list.children` 新增 `BatchTask.list`（`APIKey.list` 后、`Entity.list` 前）；顶级在「消费者管理」（`consumer.admin.list`）之后新增「系统安全」组 `systemSecurity.admin.list`，其 `children` 含 `ReencryptSweep.list` |

> **导航树来源**：菜单由后端 `GET /meta` 返回的 `nav.admin` 驱动（`store.getNavRoot()`），前端 `router.js` 仅注册路由；`authorize.js` 路由守卫 `findNav(to.name)` 未命中会重定向登录。**故必须同步后端 `conf/nav_tree.toml`，否则新页面不可达（菜单不显示 + 直连 URL 被守卫拦截）。**

---

## 5. 验收清单

**批量任务（#1）**

- [ ] 列表筛选栏 5 项（任务状态 / 服务商 / API Key ID / 创建时间起止）与 `GET /batches` Query 一致；`status` 为单值枚举
- [ ] 分页为**游标分页**（`cursor`/`limit`/`next_cursor`），非 `page`/`page_size`；`next_cursor` 为 `0` 时「下一页」置灰
- [ ] 表格 12 列与 §2.1 字段一致；状态 / 结算状态以 tag 展示且颜色语义正确
- [ ] 金额列（预留 / 结算）**原样展示 1e-8 定点整数**，不做 ÷1e8 换算；help 提示与原型一致
- [ ] 详情抽屉含 `batch_files` 表格（file_id / provider / purpose / filename / bytes+formatBytes / created_at）；无文件时显示「-」
- [ ] `sync_source=redis`（BATCH_TASK 回源）时结算类字段容许为空 / 未就绪，页面不报错
- [ ] 取消走二次确认；成功后 `status=cancelling`、`settle_status=released`
- [ ] 终态任务（`completed`/`expired`/`failed`/`cancelled`）取消按钮 `disabled`；触发 409 时给「已终态」提示
- [ ] 取消 502（provider 不可达 / 无出网）时给可读错误提示

**密钥收敛（#2）**

- [ ] 触发区三参数（`mode` 两枚举 / `scope` 三枚举 / `dry_run` switch）；`decrypt` 有「仅用于回滚预案」提示
- [ ] POST 立即返回、body `status=running`；页面据 `task_id` 轮询 `GET /{task_id}` 展示进度
- [ ] 运行中重复触发 → 409 提示携带持有者 `task_id`，明确「直接轮询该任务，不排队」
- [ ] 运行中横幅唯一；**进入页面不调用任何接口**（无列表接口），历史表格仅终态任务、**本会话内累积**（无 TTL）
- [ ] 详情含 `summary` 两张分组统计与 `duration_ms`；`failed` 时展示 `error`（`executor lost` 可读）
- [ ] `active_key_id` 展示（`decrypt` 模式为 0）
- [ ] 404（task_id 不存在）给可读提示

**批量限流（#3）**

- [ ] API Key / Entity 限流表单新增 4 字段（`max_create_rpm` / `max_active_batches` / `max_file_bytes` / `max_file_lines`）
- [ ] 「四维度均按 API-Key 计、与模型无关；0 或留空 = 不配此维度；不配置不代表批量不限流」提示展示
- [ ] 负数报「X不能为负数」；全空时请求体不携带 `batch_limits`；≤0 的维度不提交
- [ ] 查看态展示既有 `batch_limits`（只读）

**模型定价批量折扣（#4）**

- [ ] `mode` Select 新增 `batch` 选项
- [ ] 编辑态 `mode != batch` 时展示「批量折扣系数」输入（placeholder `0.5`）；`mode = batch` 时不渲染
- [ ] 填写非 `(0,1]` 浮点报「批量折扣系数必须为 (0,1] 区间内的浮点数」
- [ ] 查看态 `mode = batch` 显示「-（mode=batch 的价格行不配置批量折扣系数）」，非 batch 显示系数值
- [ ] 仅 `mode != batch` 且 `batch_discount != null` 时提交该字段，否则置 `null`

**集群上游错误归一（#5）**

- [ ] 表单含 `enabled` / `stream_enabled` / `redact_secrets` 三个 Switch；`enabled=true` 时才显示 `unrecognized_action` 与 `max_body_bytes`
- [ ] `unrecognized_action` 仅 `passthrough` / `rewrite_generic`；非法报「未识别错误体处理仅支持 passthrough / rewrite_generic」
- [ ] `max_body_bytes` 为 0-4194304 整数；非法报「错误响应体读取上限须为 0-4194304 的整数」
- [ ] 缺省（未配置）时展示默认值、不报错；复查行与表单一致

**操作日志资源类型（#6）**

- [ ] `resource_type` 列与筛选 options 对 `batch` / `batch_file` 显示中文（批量任务 / 批量文件）
- [ ] 详情抽屉资源类型走中文映射

**用户创建 / 密码（#7）**

- [ ] 创建用户名为 `admin` / `root` / `system`（含大小写）时报保留名错误
- [ ] 密码校验：长度 8-72 **字节**（UTF-8，中文按多字节计）、不含空白、不等于用户名或其逆序
- [ ] 改密端点仅套密码规则，不报保留名错误（允许操作系统内置账号）

**通用**

- [ ] 原型 `prototype-design/` 与 Vue 展示一致
- [ ] `npm run lint` 通过
- [ ] 页面无控制台告警（无缺失 i18n key）
- [ ] 新页面菜单可达（**依赖 §7.1 `nav_tree.toml` 同步完成**）

---

## 5.1 接口合法性校验 ↔ UI 校验实现 对照核查

逐条比对 OpenAPI 合法性条件（§2）与前端待实现的校验点，作为 UI 实施（§4）的自检清单：

| 模块 | 接口合法性条件 | UI 校验实现位置（计划） | 结论 |
| ---- | ------------- | ---------------- | ---- |
| #1 批量任务 · 列表 | `status` 单值枚举、`limit` 1-200、时间区间合法 | `BatchTasks/index.vue` 筛选参数构造（Select 固定枚举、limit 固定分页量） | ⬜ 待实现 |
| #1 批量任务 · 取消 | 终态不可取消（409）、provider 不可达（502） | `BatchTasks/index.vue` 终态按钮 `disabled` + 错误提示分支 | ⬜ 待实现 |
| #2 密钥收敛 | `mode` 两枚举 / `scope` 三枚举 / `dry_run` bool；409 单例互斥 | `Security/index.vue` Select 固定枚举 + 触发前 `running` 检测 + 409 提示 | ⬜ 待实现 |
| #3 批量限流 | 四维度 ≥0；`0` 或省略 = 不配此维度 | `APIKey/components/Upsert.vue` + `Entity/components/EntityUpsert.vue` `validateBatchLimitsForm` 等价校验 | ⬜ 待实现 |
| #4 批量折扣 | `batch_discount` ∈ (0,1]；`mode` 新增 `batch`；`mode=batch` 不配系数 | `ModelPrices/components/ModelPriceUpsert.vue` `batch_discount` 校验 + `mode` Select | ⬜ 待实现 |
| #5 上游错误归一 | `unrecognized_action` 两枚举、`max_body_bytes` ∈ [0,4194304]、三个 bool | `Clusters/components/GatewayConfig.vue` LLM 校验分支 | ⬜ 待实现 |
| #6 操作日志 | 枚举含 `batch` / `batch_file` | `OperationLogs/index.vue` `RESOURCE_TYPE_LABELS` | ⬜ 待实现 |
| #7 用户 / 密码 | 创建保留名、Password 8-72 字节 + 无空白 + ≠用户名/逆序 | `User/components/CreateUser.vue` + `UpdatePassword.vue` | ⬜ 待实现 |

> 校验实现细节对齐原型错误文案（如「批量折扣系数必须为 (0,1] 区间内的浮点数」「未识别错误体处理仅支持 passthrough / rewrite_generic」「错误响应体读取上限须为 0-4194304 的整数」），保证原型 → UI 文案一致。

---

## 6. 变更文件清单

### 原型（已完成）

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `prototype-design/pages/batches.html` | 新建 | 批量任务列表 + 详情抽屉 + 取消（游标分页） |
| `prototype-design/pages/security.html` | 新建 | 密钥收敛触发 + 轮询 + 历史 + 详情抽屉 |
| `prototype-design/assets/js/layout.js` | 已修改 | 两个新菜单 + 两个新图标 |
| `prototype-design/assets/js/prototype.js` | 已修改 | `nav.BatchTaskManage` / `nav.ReencryptSweepManage` + 5 个 user 文案 |
| `prototype-design/assets/js/mock-data.js` | 已修改 | `batch_limits` / `normalize_upstream_error` / `batch_discount` / `mode=batch` 行 / resource_type / 新增 mock 集合（`batchTasks`；密钥收敛无列表接口，故不提供历史 mock） |
| `prototype-design/assets/js/api-key-upsert.js` | 已修改 | 批量限流 4 字段（表单 / 校验 / 收集 / 只读） |
| `prototype-design/assets/js/entity-upsert.js` | 已修改 | 复用批量限流渲染与校验 |
| `prototype-design/assets/js/model-price-upsert.js` | 已修改 | 批量折扣系数（查看 / 编辑 / 校验 / payload） |
| `prototype-design/assets/js/cluster-upsert.js` | 已修改 | 上游错误归一（表单卡 / 复查 / syncFromDom / 校验 / 默认值） |
| `prototype-design/assets/js/user-upsert.js` | 已修改 | 密码 placeholder 走 i18n |
| `prototype-design/pages/operation-logs.html` | 已修改 | `RESOURCE_TYPE_LABELS` + 中文展示 |
| `prototype-design/pages/user.html` | 已修改 | 创建保留名校验 + 密码规则 |

### 接口文档（已同步，阶段 1）

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `api-define/OpenAPI接口定义/batches.md` | 新增 | `/batches`、`/batch-files` 定义（428 行） |
| `api-define/OpenAPI接口定义/security.md` | 新增 | `/security/reencrypt-sweeps` 定义（100 行） |
| `api-define/OpenAPI接口定义/00-common.md` | 已更新 | `batch_limits`、403 错误码、UserName 保留名、Password 8-72 字节 |
| `api-define/OpenAPI接口定义/model-prices.md` | 已更新 | `batch_discount` + `mode=batch` + §1.3 展开语义 |
| `api-define/OpenAPI接口定义/clusters.md` | 已更新 | `normalize_upstream_error` 表 + 校验规则 |
| `api-define/OpenAPI接口定义/operation-logs.md` | 已更新 | `resource_type` 新增 `batch` / `batch_file` |
| `api-define/OpenAPI接口定义/report.md` | 已更新 | 四查询后端 + 参数校验错误码 422（**无 UI 影响**） |
| `api-define/OpenAPI接口定义/auth.md` | 已更新 | 锚点链接修正（**无 UI 影响**） |
| `api-define/OpenAPI接口定义/README.md` | 已更新 | 索引新增 3 个端点 |

### UI 代码（待实施）

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `src/modules/BatchTasks/index.vue` + `components/BatchView.vue` | 新建 | 批量任务模块（⬜ 待实施） |
| `src/modules/Security/index.vue` + `components/SweepView.vue` | 新建 | 密钥收敛模块（⬜ 待实施） |
| `src/modules/APIKey/components/Upsert.vue` | 修改 | 批量限流 4 字段（⬜ 待实施） |
| `src/modules/Entity/components/EntityUpsert.vue` | 修改 | 批量限流 4 字段（⬜ 待实施） |
| `src/modules/ModelPrices/components/ModelPriceUpsert.vue` + `ModelPriceView.vue` | 修改 | `batch_discount` + `mode=batch`（⬜ 待实施） |
| `src/modules/Clusters/components/GatewayConfig.vue` + `Review.vue` | 修改 | `normalize_upstream_error`（⬜ 待实施） |
| `src/modules/OperationLogs/index.vue` | 修改 | `resource_type` 中文映射（⬜ 待实施） |
| `src/modules/User/components/CreateUser.vue` + `UpdatePassword.vue` | 修改 | 保留名 + 密码规则（⬜ 待实施） |
| `src/router/router.js` | 修改 | `BatchTask.list` / `ReencryptSweep.list` 路由（⬜ 待实施） |
| `src/layout/sidebar/navItem.vue` | 修改 | 两个新图标（⬜ 待实施） |
| `src/i18n/zh.js` / `src/i18n/en.js` | 修改 | nav + 模块文案（⬜ 新增文案待实施） |
| `ai-gateway-runtime/conf/nav_tree.toml` | 修改 | ⛔ **待更新**：两个新菜单（见 §7.1） |

### 构建产物（非本次迭代）

以下为构建 / 版本产物，**不属于本次 UI 迭代语义改动**，Review 时请忽略：

| 文件 | 说明 |
| ---- | ---- |
| `src/main.js` | 版本戳 `_VERSION_` → `0.11.0@20261010104743` |
| `version.txt` | `0.0.10` → `0.11.0` |
| `index.html` | 版本戳 |
| `package-lock.json` | 依赖小版本更新（postcss 等） |
| `dist/*` | 构建产物（大量删除） |

---

## 7. 注意事项

1. **⛔ 导航入口依赖后端 `nav_tree.toml`（当前缺失）**：菜单树来自 `GET /meta` 的 `nav.admin`，前端 `router.js` 只注册路由；`authorize.js` 守卫 `findNav(to.name)` 未命中会重定向登录。**运行时 `ai-gateway-runtime/conf/nav_tree.toml` 目前不含 `BatchTask.list` 与 `ReencryptSweep.list`**，必须在 UI 实施阶段同步新增：

   ```toml
   # consumer.admin.list.children：APIKey.list 后、Entity.list 前
   { id = "BatchTask.list", text = "BatchTaskManage", allowed_roles = ["admin"] }

   # 顶级：consumer.admin.list 之后（「系统安全」组，children 含「密钥收敛」）
   # [[children]]
   # id = "systemSecurity.admin.list"
   # text = "SystemSecurityManage"
   # allowed_roles = ["admin"]
   # children = [
   #     { id = "ReencryptSweep.list", text = "ReencryptSweepManage", allowed_roles = ["admin"] }
   # ]
   ```

   若 api 仓库亦维护 `nav_tree.toml`，需一并同步；否则新页面不可达（菜单不显示 + 直连 URL 被守卫拦截）。

2. **金额口径不做换算**：`reserve_units` / `settle_units` 为 **1e-8 定点整数 RMB**，UI **原样展示**，禁止 ÷1e8 或格式化小数；help 文案须与原型一致。

3. **游标分页 vs 全局分页**：`/batches` 使用主键游标分页（`cursor`/`limit`/`next_cursor`），**不使用**全局 `page`/`page_size`；UI 不得套用既有 Page 组件默认分页逻辑。

4. **批量任务一期不含创建**：控制面仅提供管控（列表 / 详情 / 取消 / 文件查询），**UI 不提供"新建批量任务"入口**；创建走 provider 透传。

5. **取消接口的出网依赖**：取消需控制面 → provider **出网**可达；降级部署无出网时取消不可用（502）。UI 需对 502 给可读提示，并允许任务仅展示。

6. **`batch_limits` 的 `0` / 省略语义**：四维度均按 **API-Key 计、与模型无关**；`0` 或省略 = 不配此维度；**不配置不代表批量不限流**（仍受 BFE `mod_ai_batch.data` 全局硬顶约束）。提示文案不可简化。

7. **`batch_discount` 的展开归属后端**：系数展开（生成 `mode=batch` 价格行）由控制面导出时完成，**UI 只负责采集 `batch_discount`**，不做前端展开；`mode=batch` 行本身不配系数；手工 `mode=batch` 行优先于系数展开（后端告警，不阻塞）。

8. **`normalize_upstream_error` 缺省 = 关闭**：缺省时上游错误原样透传（历史行为）；UI 展示默认值不报错；`max_body_bytes=0` = 用 BFE 默认 65536（非「不读取」）。

9. **用户保留名仅限"创建"**：`admin` / `root` / `system` 保留名校验**只在创建用户时生效**；按名引用端点（重置密码、设置管理员等）**不受限**，允许操作系统内置账号——UI 改密页不得复用保留名校验。

10. **密码按字节计**：8-72 为 **UTF-8 字节**（中文占多字节），非字符数；且不含空白、不等于用户名或其逆序。

11. **密钥收敛为集群级单例**：任一时刻仅一个任务运行；运行中重复触发 409 并携带持有者 `task_id`（**不排队**，直接轮询该任务）。UI 触发前应检测运行中任务。

12. **`report.md` / `00-common.md`(403) / `auth.md` 无 UI 影响**：分别为后端能力扩展、错误码补充、文档锚点修正，本次 UI 不改动；不得为它们新增 UI 逻辑。

13. **构建产物非本次迭代**：`src/main.js`、`version.txt`、`index.html`、`package-lock.json`、`dist/*` 为构建 / 版本产物，Review 与提交时与本次 UI 改动区分。

14. **`ModelPriceUpsert.vue` 附带修复（非 #4 范围，Review 备注）**：价格 / 分时段校验的「非负数」「溢出」错误标记原先**仅在提交时计算一次**，提交后修正值仍残留红字（易误判为校验改坏）。现已提取谓词 `hasNonNegativeViolation` / `hasOverflowViolation` 并复用，且为 `pricesList` / `tierPricesPeakList` 增 deep watch：仅在**已显示错误**时随值变化重算并即时消除；不改变「新增错误仍只在提交时产生」的原有行为、不改校验规则。

---

## 8. 关联文档

| 文档 | 说明 |
| ---- | ---- |
| `api-define/OpenAPI接口定义/batches.md` | 批量任务 / 批量文件接口 |
| `api-define/OpenAPI接口定义/security.md` | 密钥收敛任务接口 |
| `api-define/OpenAPI接口定义/00-common.md` | `batch_limits` / 403 / UserName 保留名 / Password |
| `api-define/OpenAPI接口定义/model-prices.md` | `batch_discount` + `mode=batch` |
| `api-define/OpenAPI接口定义/clusters.md` | `normalize_upstream_error` |
| `api-define/OpenAPI接口定义/operation-logs.md` | `resource_type` 枚举 |
| `api-define/OpenAPI接口定义/report.md` | 四查询后端（无 UI 影响） |
| `prototype-design/pages/batches.html` | 批量任务原型（新建） |
| `prototype-design/pages/security.html` | 密钥收敛原型（新建） |
| `prototype-design/pages/operation-logs.html` / `user.html` | 既有页面增量原型 |
| `ai-gateway-api/design-docs/modifications/2026-10-07-ai-batch-support/api-changes.md` | 后端侧变更记录（批量任务） |
| `ai-gateway-api/design-docs/modifications/2026-10-05-db-encryption-at-rest/design-changes.md` | 后端侧变更记录（DB 静态加密，密钥收敛语义） |
| `ai-gateway-api/design-docs/modifications/2026-10-05-export-config-field-encryption/api-changes.md` | 后端侧变更记录（导出配置字段加密） |
| `ai-gateway-api/design-docs/modifications/2026-10-06-upstream-error-normalization/api-changes.md` | 后端侧变更记录（上游错误归一） |
| `ai-gateway-api/design-docs/modifications/2026-10-06-password-hash/change-summary.md` | 后端侧变更记录（密码哈希） |
| `ai-gateway-api/design-docs/modifications/2026-10-09-issue-226-reserved-user-name-update-endpoints/change-summary.md` | 后端侧变更记录（保留用户名与按名引用端点） |
| `ai-gateway-api/design-docs/modifications/2026-10-02-report-clickhouse-backend/` / `2026-10-02-report-starrocks-backend/` | 后端侧变更记录（报表四后端） |
| `ai-gateway-api/design-docs/modifications/2026-10-04-mgmt-ip-whitelist/change-summary.md` | 后端侧变更记录（管理面 IP 白名单，403） |
| `design-docs/README.md` | 变更流程与代码实现顺序 |
