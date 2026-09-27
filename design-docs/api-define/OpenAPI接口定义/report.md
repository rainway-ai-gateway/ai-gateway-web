# /report

> 数据报表查询接口：总览指标、时序、维度排行、占比分布、日志明细五类只读端点。查询后端通过 `[Report].Backend` 配置切换 MySQL（轻量形态，log-reader `mod_log_mysql` 插件落库）或 Doris（标准形态，既有 Kafka → Doris 链路），同一套接口两种后端结构一致（差异仅在可选字段的有无，如 MySQL 后端无分位数）。模块细节设计见 [报表查询模块](../../sys-design/details/报表查询模块.md)。

## 1. 数据模型

### 1.1 共有过滤参数

以下过滤参数在五个端点间共用（Query，均可选、可组合）：

| 参数 | 类型 | 说明 |
|------|------|------|
| `start` | int64 | 窗口起始时间戳（秒），必填 |
| `end` | int64 | 窗口结束时间戳（秒），必填，`end > start`，窗口上限 7 天 |
| `models` | string | 路由模型（`ai_target_model`）列表，逗号分隔 |
| `apikey_ids` | string | API Key ID 列表，逗号分隔 |
| `providers` | string | 上游提供商（`ai_provider`）列表，逗号分隔 |
| `hosts` | string | 主机标识（`hostid`）列表，逗号分隔 |
| `stream` | bool | 是否流式（`ai_stream`） |
| `status_codes` | string | 响应状态码列表，逗号分隔，如 `200,500` |

### 1.2 明细行（/report/logs 的 items 元素）

明细行是 MySQL/Doris 明细表 `bfe_ai_request_log`（89 列，两后端同名同列）面向展示的投影，字段名与表列名一致；JSON 列原样返回字符串，由前端展开：

```json
{
  "logid": 12345,
  "log_time": 1782345600,
  "hostid": "gw-01",
  "product": "BFE",
  "ai_apikey_id": "key-001",
  "ai_requested_model": "gpt-4",
  "ai_target_model": "gpt-4o",
  "ai_provider": "openai",
  "ai_protocol": "openai",
  "ai_mode": "chat",
  "ai_stream": 1,
  "res_status_code": 200,
  "err_code": null,
  "err_msg": "ok",
  "ai_input_tokens": 1000,
  "ai_output_tokens": 200,
  "ai_total_tokens": 1200,
  "all_time": 1200,
  "ai_ttft_us": 500000,
  "ai_tpot_us": 25000,
  "ai_cost_value": 0.00005,
  "ai_cost_currency": "USD",
  "ai_rate_limit_hits": null,
  "ai_auth_reject_quota_plans": null,
  "level1Name": "dep",
  "level1": "ops",
  "client_ip": "10.0.0.1",
  "header_host": "api.example.org",
  "origin_uri": "/v1/chat",
  "req_headers": null,
  "res_headers": null
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `logid` | int64 | BFE 请求唯一标识 |
| `log_time` | int64 | 日志产生时间，Unix 秒（表内为 DATETIME） |
| `hostid` | string | 主机标识（hostname_netns） |
| `product` | string | 产品标识 |
| `ai_apikey_id` | string | API Key ID；未认证请求为 null |
| `ai_requested_model` | string | 请求模型名 |
| `ai_target_model` | string | 实际路由模型名 |
| `ai_provider` / `ai_protocol` / `ai_mode` | string | 上游提供商 / AI 协议 / AI 模式 |
| `ai_stream` | int8 | 是否流式：`0` 非流式，`1` 流式 |
| `res_status_code` | int | 响应状态码 |
| `err_code` / `err_msg` | string | 错误码 / 错误详情；无错误时 `err_code` 为 null |
| `ai_input_tokens` / `ai_output_tokens` / `ai_total_tokens` | int64 | Token 计数 |
| `all_time` | int | 请求总耗时（毫秒） |
| `ai_ttft_us` / `ai_tpot_us` | int64 | TTFT / TPOT（微秒） |
| `ai_cost_value` / `ai_cost_currency` | number / string | 成本金额（元/美元，服务端已完成 ÷1e8 换算）/ 币种；无成本为 null |
| `ai_rate_limit_hits` / `ai_auth_reject_quota_plans` | string | JSON 原文（限流命中列表 / 被拒绝配额计划），未命中为 null |
| `level1Name` ~ `level5` | string | API Key 标签按层级打平（name/value 成对），未设置为 null |
| `client_ip` / `header_host` / `origin_uri` | string | 客户端 IP / 请求 Host / 原始 URI |
| `req_headers` / `res_headers` | string | 请求/响应头列表 JSON 原文 |

### 1.3 聚合结果对象

- **OverviewResult**：总览指标卡，见 2.1 返回数据。
- **MetricPoint**：时序点，`{"time": <unix秒>, ...值字段}`；多值 metric（tokens/latency/cost）在同一点上携带多个值字段。
- **RankingItem**：`{"name": <维度值>, "request_count": n, "error_count": n, "input_tokens": n, "output_tokens": n}`。
- **DistItem**：`{"name": <维度值或 "unknown">, "request_count": n, "ratio": <0~1>}`。

---

## 2. 接口清单

### 2.1 总览指标

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 总览指标卡 | 请求总量、错误率、Token、延迟、成本、限流/认证拒绝 |
| 端点 | /report/overview | - |
| 版本 | v1 | - |
| method | GET | - |
| 权限 | FeatureReport ReadAll（当前仅系统管理员） | 无权限返回 402 |

**输入参数（Query）**：共有过滤项（`start`、`end` 必填）。

**约束**

- 时序类指标（QPS/Token/延迟/成本/限流）读聚合表合计；`logs_total` 走明细表 `COUNT(*)`。
- 成本按币种分组返回换算后的金额（定点值 ÷ 1e8，元/美元），换算由服务端完成，调用方直接展示。

**返回数据（Data 内容）**

```json
{
  "request_total": 152300,
  "error_total": 1200,
  "error_rate": 0.00788,
  "input_tokens": 88341233,
  "output_tokens": 12093441,
  "total_tokens": 100434674,
  "latency_avg_ms": 1234.5,
  "latency_max_ms": 9876,
  "latency_p50_ms": 1100,
  "latency_p90_ms": 2100,
  "latency_p99_ms": 4500,
  "ttft_avg_ms": 320.4,
  "tpot_avg_ms": 25.1,
  "cost": [{"currency": "USD", "value": 0.1523}, {"currency": "RMB", "value": 0.00098}],
  "rate_limit_hits": 320,
  "auth_rejects": 45,
  "logs_total": 152300
}
```

> `latency_p50_ms`/`p90`/`p99` 仅 Doris 后端返回；MySQL 后端无原生分位数，字段恒不存在（前端按字段有无降级为 avg/max 展示）。

### 2.2 时序数据

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 时序数据 | QPS / Token 吞吐 / 延迟 / TTFT / TPOT / 成本增速 |
| 端点 | /report/timeseries | - |
| 版本 | v1 | - |
| method | GET | - |
| 权限 | FeatureReport ReadAll | - |

**输入参数（Query）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| `metric` | string | 指标名 | Y | 见下表 | `qps` / `tokens` / `latency` / `ttft` / `tpot` / `cost` |

其余为共有过滤项（`start`、`end` 必填）。

| metric | 含义 | 值字段 |
|--------|------|--------|
| `qps` | 请求 QPS | `value` |
| `tokens` | Token 吞吐（个/秒） | `input`、`output`、`total` |
| `latency` | 延迟（毫秒） | `avg`、`max`（Doris 后端另有 `p50`、`p90`、`p99`） |
| `ttft` / `tpot` | 首 Token / 每 Token 延迟（毫秒，聚合于 stream 请求） | `avg` |
| `cost` | 成本增速（金额/秒，元/秒、美元/秒） | 按币种多条序列，`currency` 字段区分 |

**约束**

- 时间桶（`bucket_sec`）由服务端按窗口自动计算：≤6h→60s，≤3d→300s，≤7d→1800s，客户端不传。
- 时序只读聚合表（MySQL `bfe_ai_metrics_1m` / Doris 同名表），不扫明细。

**返回数据（Data 内容）**

```json
{"bucket_sec": 60, "series": [{"time": 1782345600, "value": 12.3}]}
```

### 2.3 维度排行

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | TopN 维度排行 | - |
| 端点 | /report/rankings | - |
| 版本 | v1 | - |
| method | GET | - |
| 权限 | FeatureReport ReadAll | - |

**输入参数（Query）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| `dimension` | string | 维度 | Y | 见下表 | `model` / `requested_model` / `provider` / `apikey` / `host` / `status` / `protocol` / `mode` |
| `limit` | int | 返回条数 | N | 默认 10，上限 50 | - |

其余为共有过滤项（`start`、`end` 必填）。

| dimension | 维度列 | 排序指标 |
|-----------|--------|----------|
| `model` | `ai_target_model` | request_count |
| `requested_model` | `ai_requested_model` | request_count |
| `provider` | `ai_provider` | request_count |
| `apikey` | `ai_apikey_id` | request_count |
| `host` | `hostid` | request_count |
| `status` | `res_status_code` | request_count |
| `protocol` | `ai_protocol` | request_count |
| `mode` | `ai_mode` | request_count |

**返回数据（Data 内容）**

```json
{"items": [{"name": "gpt-4o", "request_count": 90000, "error_count": 500, "input_tokens": 55000000, "output_tokens": 7000000}]}
```

### 2.4 占比分布

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 占比分布（饼图） | - |
| 端点 | /report/distribution | - |
| 版本 | v1 | - |
| method | GET | - |
| 权限 | FeatureReport ReadAll | - |

**输入参数（Query）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| `dimension` | string | 维度 | Y | `status` / `protocol` / `mode` / `stream` | 枚举 |

其余为共有过滤项（`start`、`end` 必填）。

**约束**：`ratio` 为该维度值请求数 / 窗口请求总数；空值维度（NULL/''）归一为 `"unknown"` 桶返回。

**返回数据（Data 内容）**

```json
{"items": [{"name": "200", "request_count": 150000, "ratio": 0.985}, {"name": "500", "request_count": 2300, "ratio": 0.015}]}
```

### 2.5 日志明细分页

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 日志明细分页 | 读明细表，与 Grafana「日志明细」面板对齐 |
| 端点 | /report/logs | - |
| 版本 | v1 | - |
| method | GET | - |
| 权限 | FeatureReport ReadAll | - |

**输入参数（Query）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| `requested_models` | string | 请求模型列表 | N | 逗号分隔 | - |
| `err_only` | bool | 只看有错（`err_code` 非空） | N | - | - |
| `keyword` | string | `err_msg` 模糊匹配 | N | 长度上限 128 | - |
| `page` | int | 页码 | N | 默认 1 | 参见 [00-common.md](./00-common.md) |
| `page_size` | int | 每页条数 | N | 默认 20，最大 100 | 参见 [00-common.md](./00-common.md) |

其余为共有过滤项（含 `models`、`apikey_ids`、`providers`、`hosts`、`stream`、`status_codes`；`start`、`end` 必填）。

**约束**：按 `log_time` 倒序；JSON 列返回原文字符串，由前端行展开展示。

**返回数据（Data 内容）**

```json
{
  "total": 152300,
  "page": 1,
  "page_size": 20,
  "items": [<明细行，见 1.2>]
}
```

---

## 3. 错误码

| 场景 | 表现 |
|------|------|
| 参数缺失/非法（`start`≥`end`、窗口超 7 天、metric/dimension 非枚举值、`page_size` 超上限） | 参数校验错误，HTTP 400 |
| 未认证 / 无 FeatureReport 权限 | HTTP 401 / 402 |
| Report 模块未装配（`[Report]` 配置缺省） | 路由不存在，HTTP 404 |
| 后端查询失败 | 内部错误，HTTP 500 |
