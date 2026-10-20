# /ai-cache-rules

AI 缓存规则集合（配合 BFE `mod_ai_cache` 模块：一期 Redis 精确匹配，二期语义缓存）。集合级全量读写：不提供 `/{id}` 单条规则操作接口。

语义缓存调优参数（`top_k` / `threshold` / `threshold_relation`）为模块级全局配置，独立于本集合维护，见 [ai-cache-semantic-settings.md](./ai-cache-semantic-settings.md)。

## 1. 数据模型

```json
{
  "rules": [
    {
      "name": "cache-deepseek-chat",
      "cond": "req_path_in(\"/v1/chat/completions\", false) && req_body_json_in(\"model\", \"deepseek-chat\", false)",
      "cache_key_strategy": "lastQuestion",
      "cache_ttl": 3600,
      "enable_semantic_cache": true,
      "max_body_bytes": 1048576,
      "max_value_bytes": 1048576
    },
    {
      "name": "cache-all-models-long-ttl",
      "cond": "req_path_in(\"/v1/chat/completions\", false)",
      "cache_ttl": 86400
    }
  ]
}
```

**字段说明**

| 字段 | 类型 | 说明 | 可能取值 | 合法性条件 |
|------|------|------|----------|------------|
| `rules` | array | 规则列表，**按数组顺序匹配（first-match-wins），顺序即优先级** | - | 必填；`null` 按 `[]` 处理（清空全部规则）；元素类型见下表 |
| `rules[].name` | string | 规则名称（可读性/审计用，非寻址键） | 自定义 | 必填；1-128 字符；同一集合内不得重复 |
| `rules[].cond` | string | BFE 条件表达式，命中即对该请求启用缓存 | 如 `req_path_in(...)`、`req_body_json_in("model", ...)` 组合 | 必填；必须能通过 BFE `condition.Build` 编译 |
| `rules[].cache_key_strategy` | string | 缓存键策略。`disabled` 为**显式不缓存（缓存豁免）**：命中该规则的请求不读不写缓存，且不再匹配后续规则 | `lastQuestion`（默认）/ `allQuestions` / `disabled` | 非必填；未传时默认 `lastQuestion` |
| `rules[].cache_ttl` | int | 缓存 TTL（秒） | ≥ 0，`0` 表示不过期 | 非必填；未传时默认 `0` |
| `rules[].max_body_bytes` | int64 | 请求体大小上限（字节），超限不缓存 | > 0 | 非必填；未传时默认 1048576（1MB） |
| `rules[].max_value_bytes` | int64 | 缓存值大小上限（字节），超限不缓存 | > 0 | 非必填；未传时默认 1048576（1MB） |
| `rules[].enable_semantic_cache` | bool | 语义缓存开关：该规则命中且 Redis 精确未命中时，走 embedding + 向量相似度检索。`cache_key_strategy=disabled` 时本字段无效（被忽略，不报错） | `true` / `false` | 非必填；未传时默认 `false` |

**响应只读字段**（仅 GET/PUT 响应携带，提交时忽略）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `rules[].created_at` | string | 创建时间（RFC3339） |
| `rules[].updated_at` | string | 更新时间（RFC3339） |

**约束**

- `rules` 按数组顺序匹配（first-match-wins），数组顺序 = 导出到 BFE 的顺序；不提供 `priority` 字段。
- 无 `enabled` 字段：提交的列表即生效集合，"禁用一条规则" = 从列表中移除。
- `cache_key_strategy=disabled` 是**缓存豁免**语义（数据面概念），与"从列表移除"（控制面概念）不同：该规则正常参与匹配，命中即不读不写缓存并阻断后续规则。典型用法是"全部缓存、除外某模型/路径"：
  ```json
  {
    "rules": [
      { "name": "exempt-gpt4", "cond": "req_body_json_in(\"model\", \"gpt-4\", false)", "cache_key_strategy": "disabled" },
      { "name": "cache-rest", "cond": "req_path_in(\"/v1/chat/completions\", false)", "cache_ttl": 3600 }
    ]
  }
  ```
- 规则 `id` 为内部排序字段，不出现在 API 请求与响应中。
- 命中响应模板、GJSON 提取路径等高级字段一期不开放，由 BFE 按内置默认值处理。

---

## 2. 接口清单

### 2.1 全量更新AI缓存规则

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 全量更新AI缓存规则集合（整体替换） | - |
| 端点 | /ai-cache-rules | - |
| 版本 | v1 | - |
| method | PUT | - |
| 权限 | FeatureAICache + ActionUpdate | - |

**输入参数（Body）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| rules | array | 规则列表 | Y | 同第1节数据模型中rules结构；数组顺序即优先级 | 必填；`null` 按 `[]` 处理；每条元素校验见第1节字段说明 |

**HTTP BODY参数示例**

```json
{
    "rules": [
        {
            "name": "cache-deepseek-chat",
            "cond": "req_path_in(\"/v1/chat/completions\", false) && req_body_json_in(\"model\", \"deepseek-chat\", false)",
            "cache_key_strategy": "lastQuestion",
            "cache_ttl": 3600,
            "max_body_bytes": 1048576,
            "max_value_bytes": 1048576
        },
        {
            "name": "cache-all-models-long-ttl",
            "cond": "req_path_in(\"/v1/chat/completions\", false)",
            "cache_ttl": 86400
        }
    ]
}
```

**执行逻辑**

1. 校验参数合法性：逐条校验字段（name 格式、cond 编译、cache_key_strategy 枚举、cache_ttl/max_body_bytes/max_value_bytes 取值范围；`enable_semantic_cache` 为 bool，无额外组合校验——`disabled` 策略上的开关由 BFE 忽略）
2. 校验 `rules` 中规则名称是否重复
3. 单事务内整体替换规则集合（先删除全部旧规则，再按数组顺序写入；新 `id` 自增序即优先级序）；任一校验失败或事务失败则整体回滚，集合保持原状
4. 记录操作日志（`resource_type=ai_cache_rule`，`before`/`after` 为整个规则集合快照）
5. 返回结果

**返回数据（Data内容）**

字段同第1节数据模型（含响应只读字段 `created_at`/`updated_at`）。

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "rules": [
            {
                "name": "cache-deepseek-chat",
                "cond": "req_path_in(\"/v1/chat/completions\", false) && req_body_json_in(\"model\", \"deepseek-chat\", false)",
                "cache_key_strategy": "lastQuestion",
                "cache_ttl": 3600,
                "max_body_bytes": 1048576,
                "max_value_bytes": 1048576,
                "created_at": "2026-09-24T10:30:00+08:00",
                "updated_at": "2026-09-24T10:30:00+08:00"
            },
            {
                "name": "cache-all-models-long-ttl",
                "cond": "req_path_in(\"/v1/chat/completions\", false)",
                "cache_key_strategy": "lastQuestion",
                "cache_ttl": 86400,
                "max_body_bytes": 1048576,
                "max_value_bytes": 1048576,
                "created_at": "2026-09-24T10:30:00+08:00",
                "updated_at": "2026-09-24T10:30:00+08:00"
            }
        ]
    }
}
```

**约束**

- 不在提交列表中的规则即删除；`{"rules": []}` 表示清空全部规则（BFE 侧无规则命中，天然放行）。
- 本接口为整组规则的唯一写入口，配置生效时延 = conf-agent 轮询周期（`ReloadIntervalMs`）+ BFE 热加载时间。
- 校验失败（4xx）同样记录一条失败操作日志（`resource_type=ai_cache_rule`、身份固定为集合、before 快照取自库中现状而非请求体）。

---

### 2.2 查询AI缓存规则

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 全量查询AI缓存规则集合 | - |
| 端点 | /ai-cache-rules | - |
| 版本 | v1 | - |
| method | GET | - |
| 权限 | FeatureAICache + ActionRead | - |

**返回数据（Data内容）**

字段同第1节数据模型（含响应只读字段）。空集合返回 `{"rules": []}`；按优先级升序返回（顺序同导出到 BFE 的顺序）。
