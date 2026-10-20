# /ai-cache-semantic-settings

AI 缓存语义全局设置单例（配合 BFE `mod_ai_cache` 二期语义缓存：embedding + 向量相似度检索的调优参数）。**单行覆盖式全量读写**：不提供历史版本查询与单字段更新；设置独立于规则集合维护——清空 `/ai-cache-rules` 不影响本设置。

## 1. 数据模型

```json
{
  "top_k": 1,
  "threshold": 0.15,
  "threshold_relation": "lt"
}
```

**字段说明**

| 字段 | 类型 | 说明 | 可能取值 | 合法性条件 |
|------|------|------|----------|------------|
| `top_k` | int | 向量检索近邻个数，仅取最优者参与阈值判定 | 1 - 10 | 非必填；未传时默认 `1` |
| `threshold` | float64 | 相似度阈值，量纲由 `threshold_relation` 决定 | 0 - 2 | 非必填；未传时默认 `0.15`（Chroma cosine distance 语境保守值，上线前须按实际 embedding 模型校准） |
| `threshold_relation` | string | 阈值比较方向：distance 语义（越小越相似）用 `lt`/`lte`，similarity 语义（越大越相似）用 `gt`/`gte` | `lt`（默认）/ `lte` / `gt` / `gte` | 非必填；未传时默认 `lt`；大小写敏感 |

**响应只读字段**（仅 GET/PUT 响应携带，提交时忽略）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `created_at` | string | 创建时间（RFC3339） |
| `updated_at` | string | 更新时间（RFC3339） |

**约束**

- 全系统单例（单行表）：空表 = 默认值 `1 / 0.15 / lt`，GET 返回默认值对象（无时间戳字段），导出时以默认值填充顶层 `Semantic` 块；
- 导出侧契约（BFE `ai_cache.data` 顶层 `Semantic` 块）：`topK` / `threshold` / `thresholdRelation`（camelCase），**恒导出**——修改本设置即产生新的导出版本；
- 与规则集合生命周期解耦：二者独立 PUT、共享同一条导出版本流（MD5 覆盖规则 + 设置的全量内容）；
- 语义缓存依赖 BFE 侧 `[embedding]` / `[vector]` 静态配置（经 conf-agent `CopyFiles` 下发），未配置时数据面自动降级为纯精确缓存，与本设置无关。

---

## 2. 接口清单

### 2.1 全量更新语义全局设置

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 全量更新语义全局设置（upsert：不存在则插入，存在则整行覆盖） | - |
| 端点 | /ai-cache-semantic-settings | - |
| 版本 | v1 | - |
| method | PUT | - |
| 权限 | FeatureAICache + ActionUpdate | - |

**输入参数（Body）**

字段同第 1 节数据模型（三个字段均可省略走默认）。

**HTTP BODY参数示例**

```json
{
    "top_k": 1,
    "threshold": 0.15,
    "threshold_relation": "lt"
}
```

**执行逻辑**

1. 校验参数合法性（top_k 范围、threshold 范围、threshold_relation 枚举；失败 422 并记录一条失败审计，设置不变）
2. 单事务 upsert 单行表（delete-all + insert，或等价 upsert 语义）
3. 记录操作日志（`resource_type=ai_cache_semantic_settings`，`before` 为库中现状快照、空表时为默认值对象快照，`after` 为新值）
4. 返回更新后的完整设置对象

**返回数据（Data 内容）**

字段同第 1 节数据模型（含响应只读字段）。

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "top_k": 1,
        "threshold": 0.15,
        "threshold_relation": "lt",
        "created_at": "2026-09-30T10:30:00+08:00",
        "updated_at": "2026-09-30T10:30:00+08:00"
    }
}
```

**约束**

- 本接口为设置的唯一写入口；配置生效时延 = conf-agent 轮询周期（`ReloadIntervalMs`）+ BFE 热加载时间；
- 校验失败（4xx）同样记录一条失败操作日志（before 快照取自库中现状而非请求体）。

---

### 2.2 查询语义全局设置

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 查询语义全局设置 | - |
| 端点 | /ai-cache-semantic-settings | - |
| 版本 | v1 | - |
| method | GET | - |
| 权限 | FeatureAICache + ActionRead | - |

**返回数据（Data 内容）**

字段同第 1 节数据模型。设置行不存在时返回默认值对象（`{"top_k": 1, "threshold": 0.15, "threshold_relation": "lt"}`，无时间戳字段），HTTP 200。
