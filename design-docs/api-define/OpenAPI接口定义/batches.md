# /batches

批量任务管控接口。provider 原生 OpenAI Batch API（`/v1/files` + `/v1/batches`）经网关透传，数据面对批量任务做创建限流、预留/结算记账；本文档定义控制面的批量任务管控接口（列表 / 详情 / 取消 / 文件元数据查询）。一期范围：批量透传正确化，**不包含批量任务的创建**（创建走 provider 透传，不经控制面）。

## 1. 概述

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| URL 格式 | http://api_server:port/open-api/v1/batches、/open-api/v1/batch-files | 通用约定见 [00-common.md](./00-common.md) |
| 版本 | v1 | - |
| 鉴权方式 | Token（HTTP Authorization Header） | 见 §5 |

**全局约定**

- **产品线口径**：本组接口为**单产品线视角**，`product_name` **不出现在本组接口的入参与返回值中**——服务端内部按配置项 `AIRouteInnerProductName` 对应的默认产品线过滤查询（解析逻辑见 `endpoints/openapi_v1/batches/product.go` 的 `resolveProduct`）；数据面经 api_key 解析落入其他产品线的任务/文件，对本组接口不可见（按不存在处理），见 §6「已知限制」。
- **金额口径**：`reserve_units` / `settle_units` 等金额字段为 **1e-8 定点整数**（单位 RMB，1 单位 = 0.00000001 元），与 RMB 配额 / 报表链路口径一致（见 [00-common.md](./00-common.md) QuotaPlan 说明），**不做 ÷1e8 换算**。
- **分页**：列表接口使用主键游标分页（`cursor` / `limit`），响应携带 `next_cursor`；`next_cursor` 为空串表示无更多数据。
- **审计**：写操作（取消）记录 operation_logs，见 §5。

## 2. 数据模型

### 2.1 BatchTask（批量任务）

```json
{
  "batch_id": "batch_abc123",
  "api_key_id": "ak-2v8x9k3m7p",
  "entity_id": "entity-5",
  "provider": "openai",
  "endpoint": "/v1/batches",
  "input_file_id": "file-input1",
  "output_file_id": "file-output1",
  "status": "completed",
  "request_counts": {
    "total": 100,
    "completed": 98,
    "failed": 2
  },
  "est_lines": 100,
  "usage_input_tokens": 50000,
  "usage_output_tokens": 12000,
  "usage_source": "download",
  "reserve_units": 250000000,
  "settle_units": 180000000,
  "settle_status": "settled",
  "over_reserved": false,
  "sync_source": "redis",
  "created_at": "2026-10-06T10:00:00+08:00",
  "updated_at": "2026-10-06T10:20:00+08:00",
  "terminal_at": "2026-10-06T10:20:00+08:00",
  "batch_files": [
    {
      "file_id": "file-input1",
      "provider": "openai",
      "purpose": "batch_input",
      "filename": "input.jsonl",
      "bytes": 1048576,
      "created_at": "2026-10-06T09:55:00+08:00"
    },
    {
      "file_id": "file-output1",
      "provider": "openai",
      "purpose": "batch_output",
      "filename": "output.jsonl",
      "bytes": 2097152,
      "created_at": "2026-10-06T10:20:00+08:00"
    }
  ]
}
```

**字段说明**

| 字段 | 类型 | 说明 | 可能取值 / 合法性条件 |
|------|------|------|----------|
| `batch_id` | string | 批量任务标识（provider 侧 batch id） | 非空；详情/取消接口的路径参数 |
| `api_key_id` | string | 发起任务的网关 API Key ID | - |
| `entity_id` | string | 任务归属实体 | - |
| `provider` | string | provider 名称 | - |
| `endpoint` | string | 透传端点 | 如 `/v1/batches` |
| `input_file_id` | string | 批量输入文件 ID | - |
| `output_file_id` | string | 批量输出文件 ID | 未完成时为空 |
| `status` | string | 任务状态 | `validating` / `queued` / `in_progress` / `finalizing` / `completed` / `expired` / `failed` / `cancelled` / `cancelling`；`completed`/`expired`/`failed`/`cancelled` 为**终态** |
| `request_counts` | object | provider 返回的请求计数（JSON 原样） | 含 `total` / `completed` / `failed` |
| `est_lines` | int64 | 估算行数（按输入文件行数预估） | ≥0 |
| `usage_input_tokens` | int64 | 实际输入 token 数 | ≥0 |
| `usage_output_tokens` | int64 | 实际输出 token 数 | ≥0 |
| `usage_source` | string | usage 数据来源 | `download`（输出文件下载回读）/ `reconcile`（对账） |
| `reserve_units` | int64 | 预留金额（1e-8 定点整数，单位 RMB） | ≥0 |
| `settle_units` | int64 | 结算金额（1e-8 定点整数，单位 RMB） | ≥0 |
| `settle_status` | string | 结算状态 | `reserved`（已预留未结算）/ `settled`（已结算）/ `released`（已释放） |
| `over_reserved` | bool | 是否超额预留（`reserve_units` > `settle_units` 结算后仍有剩余） | - |
| `sync_source` | string | 任务记录的同步来源 | `redis`（BATCH_TASK 回源）/ `log`（日志对账落库） |
| `created_at` | string | 创建时间（RFC3339） | 只读 |
| `updated_at` | string | 更新时间（RFC3339） | 只读 |
| `terminal_at` | string | 进入终态时间（RFC3339） | 未终结为空 |
| `batch_files` | array | 关联批量文件元数据列表 | 元素结构见 §2.2 |

> **字段必现规则**（issue #271 起显式化）：`est_lines` / `usage_input_tokens` /
> `usage_output_tokens` / `reserve_units` / `settle_units` 五个 int64 字段约束为 `≥0`，
> `0` 是合法值，响应中必须显式出现（值为 `0`），不得用省略键表达"为零 / 未知"；
> `output_file_id`（未完成时为空）与 `terminal_at`（未终结为空）必须显式出现，
> 空值输出为空串 `""`。其余未标注"为空"语义的字段，取不到值时按省略处理
> （键不出现在响应中）。

### 2.2 BatchFile（批量文件元数据）

```json
{
  "file_id": "file-input1",
  "provider": "openai",
  "purpose": "batch_input",
  "filename": "input.jsonl",
  "bytes": 1048576,
  "created_at": "2026-10-06T09:55:00+08:00"
}
```

| 字段 | 类型 | 说明 | 可能取值 / 合法性条件 |
|------|------|------|----------|
| `file_id` | string | 文件标识（provider 侧 file id） | 非空；`(file_id, provider)` 唯一定位 |
| `provider` | string | provider 名称 | 与 `file_id` 联合唯一定位 |
| `purpose` | string | 文件用途 | `batch_input` / `batch_output`；由任务方向（输入/输出）映射得出——`batch_files` 行内保留 provider 原值（如 `batch`） |
| `filename` | string | 文件名 | provider File 对象给出的文件名（数据面同步落库）；缺失时（老键、provider 未给）为空，响应中省略该键 |
| `bytes` | int64 | 文件大小（字节） | ≥0 |
| `created_at` | string | 创建时间（RFC3339） | 只读 |

---

## 3. 接口清单

### 3.1 批量任务列表

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 查询批量任务列表 | 主键游标分页 |
| 端点 | /batches | - |
| 版本 | v1 | - |
| method | GET | - |
| 权限 | FeatureBatch + ActionRead | 见 §5 |

**输入参数（Query）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| `api_key_id` | string | 按 API Key 过滤 | N | - | - |
| `entity_id` | string | 按实体过滤 | N | - | - |
| `provider` | string | 按 provider 过滤 | N | - | - |
| `status` | string | 按任务状态过滤 | N | 单值，须为 `status` 枚举 | `validating` / `queued` / `in_progress` / `finalizing` / `completed` / `expired` / `failed` / `cancelled` / `cancelling` |
| `start_time` | int64 | 起始时间戳（秒），按创建时间过滤 | N | 与 `end_time` 同时传入时查询该时间闭区间 | - |
| `end_time` | int64 | 结束时间戳（秒），按创建时间过滤 | N | - | - |
| `cursor` | string | 分页游标 | N | 上一页响应的 `next_cursor`；首页不传 | 非空字符串 |
| `limit` | int | 每页条数 | N | 默认 50 | 取值范围 1-200，超出截断为 200 |

> **约束**
> - 不使用全局通用 `page` / `page_size` 分页参数；游标为主键游标，翻页过程不受并发写入影响。

**返回数据（Data内容）**

| 参数名 | 类型 | 参数含义 | 补充描述 |
| - | - | - | - |
| `list` | []BatchTask | 批量任务列表 | 元素字段同 §2.1 |
| `next_cursor` | string | 下一页游标 | 空串表示无更多数据 |

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "list": [
            {
                "batch_id": "batch_abc123",
                "api_key_id": "ak-2v8x9k3m7p",
                "entity_id": "entity-5",
                "provider": "openai",
                "endpoint": "/v1/batches",
                "input_file_id": "file-input1",
                "output_file_id": "file-output1",
                "status": "completed",
                "request_counts": {"total": 100, "completed": 98, "failed": 2},
                "est_lines": 100,
                "usage_input_tokens": 50000,
                "usage_output_tokens": 12000,
                "usage_source": "download",
                "reserve_units": 250000000,
                "settle_units": 180000000,
                "settle_status": "settled",
                "over_reserved": false,
                "sync_source": "log",
                "created_at": "2026-10-06T10:00:00+08:00",
                "updated_at": "2026-10-06T10:20:00+08:00",
                "terminal_at": "2026-10-06T10:20:00+08:00"
            }
        ],
        "next_cursor": ""
    }
}
```

**错误码**：401（未认证）；402（无 FeatureBatch 读权限）；422（`status` / `limit` / 时间区间参数非法）。

---

### 3.2 批量任务详情

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 查询单个批量任务详情 | 查询顺序 DB → Redis BATCH_TASK 回源 → 404 |
| 端点 | /batches/{batch_id} | - |
| 版本 | v1 | - |
| method | GET | - |
| 权限 | FeatureBatch + ActionRead | 见 §5 |

**输入参数（URI）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| `batch_id` | string | 批量任务标识 | Y | - | 必填；非空 |

**处理逻辑**

1. 先查 DB：命中则返回详情（含关联 `batch_files`）；
2. DB 未命中时回源 Redis `BATCH_TASK`：任务在 job 落库前存在窗口期（任务已创建、异步落库未完成），此时以 Redis 中的任务快照返回（`sync_source=redis`，结算类字段可能未就绪）；
3. DB 与 Redis 均未命中，返回 404。

**返回数据（Data内容）**

字段同 §2.1（含 `batch_files`）。

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "batch_id": "batch_abc123",
        "api_key_id": "ak-2v8x9k3m7p",
        "entity_id": "entity-5",
        "provider": "openai",
        "endpoint": "/v1/batches",
        "input_file_id": "file-input1",
        "output_file_id": "file-output1",
        "status": "in_progress",
        "request_counts": {"total": 100, "completed": 40, "failed": 1},
        "est_lines": 100,
        "usage_input_tokens": 0,
        "usage_output_tokens": 0,
        "usage_source": "download",
        "reserve_units": 250000000,
        "settle_units": 0,
        "settle_status": "reserved",
        "over_reserved": false,
        "sync_source": "redis",
        "created_at": "2026-10-06T10:00:00+08:00",
        "updated_at": "2026-10-06T10:10:00+08:00",
        "terminal_at": "",
        "batch_files": [
            {
                "file_id": "file-input1",
                "provider": "openai",
                "purpose": "batch_input",
                "filename": "input.jsonl",
                "bytes": 1048576,
                "created_at": "2026-10-06T09:55:00+08:00"
            }
        ]
    }
}
```

**错误码**：401；402（无 FeatureBatch 读权限）；404（DB 与 Redis 均不存在该任务）。

---

### 3.3 取消批量任务

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 取消批量任务：控制面直调 provider cancel 端点 | - |
| 端点 | /batches/{batch_id}/cancel | - |
| 版本 | v1 | - |
| method | POST | - |
| 权限 | FeatureBatch + ActionCancel | 写操作，记录 operation_logs |

**前置依赖**

- 控制面 → provider **出网**可达（降级部署无出网时，本接口退化为不可用，批量任务仅支持展示）。
- provider 未配置 API-Key（`keys: []`，见 `providers.md` keys 条款）时，取消请求**不携带鉴权头**出网——与数据面对 keyless cluster 的转发语义一致（issue #274）。

**输入参数（URI）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| `batch_id` | string | 批量任务标识 | Y | - | 必填；非空 |

**输入参数（Body）**

无。

**处理逻辑**

1. **DB 条件更新抢占**：`UPDATE ... SET status='cancelling' WHERE batch_id=? AND status NOT IN (终态, cancelling)`——**affected_rows=0 时取任务当前状态判别**：已终态 → 返回 409；已为 `cancelling` → **200 幂等重放**（重发 provider cancel 保证取消意图落地，provider cancel 幂等；预留释放为幂等 no-op，不新增 release/charge/settlement transition）；
2. **出网调用 provider**：向任务所属 provider 的 cancel 端点发起 `POST`（透传取消语义）；
3. **成功处理**：置 `status=cancelling`，Redis **幂等**释放该任务的金额预留（重复 cancel / 重复释放安全）；
4. **审计**：写入 operation_logs（`resource_type=batch`，含操作者、`batch_id`、处理结果）。

**返回数据（Data内容）**

返回更新后的任务对象，字段同 §2.1（`status=cancelling`）。

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "batch_id": "batch_abc123",
        "api_key_id": "ak-2v8x9k3m7p",
        "entity_id": "entity-5",
        "provider": "openai",
        "endpoint": "/v1/batches",
        "input_file_id": "file-input1",
        "output_file_id": "",
        "status": "cancelling",
        "request_counts": {"total": 100, "completed": 40, "failed": 1},
        "est_lines": 100,
        "usage_input_tokens": 0,
        "usage_output_tokens": 0,
        "usage_source": "download",
        "reserve_units": 250000000,
        "settle_units": 0,
        "settle_status": "released",
        "over_reserved": false,
        "sync_source": "log",
        "created_at": "2026-10-06T10:00:00+08:00",
        "updated_at": "2026-10-06T10:12:00+08:00",
        "terminal_at": ""
    }
}
```

**错误码**：

| 错误码 | 场景 |
| - | - |
| 401 / 402 | 未认证 / 无 FeatureBatch 取消权限 |
| 404 | 任务不存在（DB 与 Redis 均 miss）；或 provider 侧 batch 不存在 |
| 409 | 任务已终态（`cancelling` 受理中的重放返回 200，见处理逻辑 1） |
| 502 | provider 不可达（出网调用失败） |

---

### 3.4 批量文件元数据查询

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 查询批量文件元数据 | `(file_id, provider)` 唯一定位；产品线隔离 |
| 端点 | /batch-files/{file_id} | - |
| 版本 | v1 | - |
| method | GET | - |
| 权限 | FeatureBatch + ActionRead | 见 §5 |

**输入参数（URI）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| `file_id` | string | 文件标识 | Y | - | 必填；非空 |

**输入参数（Query）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| `provider` | string | provider 名称 | Y | 与 `file_id` 联合唯一定位文件 | 必填；非空 |

> **约束**：文件按服务端默认产品线过滤；非默认产品线的文件按不存在处理（404，见 §6「已知限制」）。

**返回数据（Data内容）**

字段同 §2.2。

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "file_id": "file-input1",
        "provider": "openai",
        "purpose": "batch_input",
        "filename": "input.jsonl",
        "bytes": 1048576,
        "created_at": "2026-10-06T09:55:00+08:00"
    }
}
```

**错误码**：401；402（无 FeatureBatch 读权限）；404（`(file_id, provider)` 不存在）；422（`provider` 缺失）。

---

## 4. 状态机与终态

- 任务状态与 provider Batch API 状态对齐：`validating` → `queued` → `in_progress` → `finalizing` → `completed` / `failed` / `expired` / `cancelled`；`cancelling` 为取消处理中的中间态（取消生效后由 provider 回调/同步流转为 `cancelled`）。
- 终态集合：`completed` / `expired` / `failed` / `cancelled`。终态任务不接受取消（409）。

## 5. 授权与审计

- **Feature / Action**：新增 iauth Feature `FeatureBatch`；列表 / 详情 / 文件查询使用 `ActionRead`，取消使用 `ActionCancel`。
- **操作日志**：取消（写操作）记录 operation_logs（`resource_type=batch`，含操作者、目标 `batch_id`、结果与失败归因）。
- 全部接口遵循 [00-common.md](./00-common.md) 的鉴权与返回值约定。

## 6. 向后兼容与已知限制

- `/batches`、`/batch-files` 为本期新增端点，无存量接口变更。
- **已知限制（issue #276，2026-10-23 校准）**：v1 批次控制面为**单产品线视角**——`product_name` 为内部字段，不出现在本组接口的入参与返回值中；服务端内部按默认产品线 `AIRouteInnerProductName` 过滤。Token 不绑定产品线（见 `design-docs/sys-design/details/认证授权机制.md` §2.3 与 `design-docs/modifications/2026-07-27-openapi-optimize/design-changes.md` §2.4）。数据面经 api_key 解析落入其他产品线的任务/文件，对本组接口不可见（按不存在处理）。该语义的回归用例见 `test/integration/tests/batch/`（BT-1-002 / BT-2-003 / BT-4-004 过滤口径；BT-2-002 / BT-4-001 键缺席口径）。若未来重新引入 Product Scope，本组接口的契约按届时设计另行修订。
- 批量价格（`mode=batch`）由 [model-prices.md](./model-prices.md) 的 `batch_discount` 系数展开或手工价格行提供；批量限流（`batch_limits`）由 InnerAPI 导出的 `rules.batch` 段提供（见 [InnerAPI rate-limit-policy.md](../InnerAPI接口定义/rate-limit-policy.md)）。
