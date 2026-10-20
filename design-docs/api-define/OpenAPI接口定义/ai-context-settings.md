# /ai-context-settings

AI 上下文压缩全局调优设置单例（配合 BFE `mod_ai_context`：裁剪层与改写层的全部调优参数）。**单行覆盖式全量读写**：不提供历史版本查询与单字段更新；设置独立于规则集合维护——清空 `/ai-context-rules` 不影响本设置，`Defaults` 块仍随导出下发。

## 1. 数据模型

```json
{
  "trigger_ratio": 0.7,
  "keep_latest_images": 2,
  "tool_result_max_chars": 2000,
  "thinking_policy": "trim-all-but-last",
  "chars_per_token": 4,
  "image_token_estimate": 1200,
  "rewrite": { "strength": "lite", "protected_survival_rate": 0.95 }
}
```

**字段说明**

| 字段 | 类型 | 说明 | 可能取值 | 合法性条件 |
|------|------|------|----------|------------|
| `trigger_ratio` | float64 | proactive 触发阈值（占预算比例）：估算 prompt token 超过 `budget × trigger_ratio` 才启动压缩，处理目标是压到 ≤ budget | (0, 1] | 非必填；未传时默认 `0.7` |
| `keep_latest_images` | int | 多模态消息中的内联图片只保留最近 N 张，更旧的替换为占位文本 | ≥ 0 | 非必填；未传时默认 `2`；`0` = 完全不裁图 |
| `tool_result_max_chars` | int | 单条 tool/function 结果最大字符数，超限截断为"前段 + `...[truncated]`" | ≥ 0 | 非必填；未传时默认 `2000`；`0` = 不截断 |
| `thinking_policy` | string | thinking 块策略：`trim-all-but-last` 删除除最后一条 assistant 外所有 thinking 块；`keep` 不动 | `trim-all-but-last` / `keep` | 非必填；未传时默认 `trim-all-but-last` |
| `chars_per_token` | int | 文本估算系数（字节/token），与 BFE 既有惯例一致；中文密集可调 3 | ≥ 1 | 非必填；未传时默认 `4` |
| `image_token_estimate` | int | 单张内联 base64 图片的固定估值 token | ≥ 0 | 非必填；未传时默认 `1200` |
| `rewrite` | object | 规则改写层子对象 | - | 非必填；未传时整体按默认值 |
| `rewrite.strength` | string | 规则改写强度：`lite` 保守规则包；`full` 更激进 | `lite` / `full` | 非必填；未传时默认 `lite` |
| `rewrite.protected_survival_rate` | float64 | fidelity gate 保护 token 存活率阈值：改写后低于该值则整体回退为裁剪层产物（无损） | (0, 1] | 非必填；未传时默认 `0.95` |

**约束**

- 全系统单例（单行表）：空表 = 默认值 `0.7 / 2 / 2000 / trim-all-but-last / 4 / 1200 / lite / 0.95`（与 BFE `setDefaults` 一一对应），GET 返回默认值对象，导出时以默认值填充顶层 `Defaults` 块；
- 导出侧契约（BFE `context_rule.data` 顶层 `Defaults` 块）：`triggerRatio` / `keepLatestImages` / `toolResultMaxChars` / `thinkingPolicy` / `charsPerToken` / `imageTokenEstimate` / `rewrite.strength` / `rewrite.protectedSurvivalRate`（camelCase），**恒导出**——修改本设置即产生新的导出版本；
- 与规则集合生命周期解耦：二者独立 PUT、共享同一条导出版本流（MD5 覆盖 Defaults + 规则全量内容）；
- 精确模型上下文窗口一期不下发：数据面按模型名启发式（claude 200k / gemini 1M / codex 400k）+ 128k 兜底，需要精确预算时经规则级 `max_context_tokens` 覆盖。

---

## 2. 接口清单

### 2.1 全量更新上下文压缩全局设置

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 全量更新上下文压缩全局设置（upsert：不存在则插入，存在则整行覆盖） | - |
| 端点 | /ai-context-settings | - |
| 版本 | v1 | - |
| method | PUT | - |
| 权限 | FeatureAIContext + ActionUpdate | - |

**输入参数（Body）**

字段同第 1 节数据模型（全部字段可省略走默认）。

**HTTP BODY参数示例**

```json
{
    "trigger_ratio": 0.8,
    "keep_latest_images": 2,
    "tool_result_max_chars": 2000,
    "thinking_policy": "trim-all-but-last",
    "chars_per_token": 3,
    "image_token_estimate": 1200,
    "rewrite": { "strength": "lite", "protected_survival_rate": 0.95 }
}
```

**执行逻辑**

1. 校验参数合法性（trigger_ratio ∈ (0,1]、keep_latest_images/tool_result_max_chars/image_token_estimate ≥ 0、thinking_policy 两枚举、chars_per_token ≥ 1、rewrite.strength 两枚举、rewrite.protected_survival_rate ∈ (0,1]；失败 422 并记录一条失败审计，设置不变）
2. 单事务 upsert 单行表（delete-all + insert）
3. 记录操作日志（`resource_type=ai_context_settings`，`before` 为库中现状快照、空表时为默认值对象快照，`after` 为新值）
4. 返回更新后的完整设置对象

**返回数据（Data 内容）**

字段同第 1 节数据模型。**不返回** `created_at`/`updated_at`：设置行为全行覆盖语义（每次 PUT delete-all + insert），时间戳无信息价值（与 `ai-context-rules` 一致）；审计时间见 `GET /operation-logs`。

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "trigger_ratio": 0.8,
        "keep_latest_images": 2,
        "tool_result_max_chars": 2000,
        "thinking_policy": "trim-all-but-last",
        "chars_per_token": 3,
        "image_token_estimate": 1200,
        "rewrite": { "strength": "lite", "protected_survival_rate": 0.95 }
    }
}
```

**约束**

- 本接口为设置的唯一写入口；配置生效时延 = conf-agent 轮询周期（`ReloadIntervalMs`）+ BFE 热加载时间；
- 校验失败（4xx）同样记录一条失败操作日志（before 快照取自库中现状而非请求体）。

---

### 2.2 查询上下文压缩全局设置

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 查询上下文压缩全局设置 | - |
| 端点 | /ai-context-settings | - |
| 版本 | v1 | - |
| method | GET | - |
| 权限 | FeatureAIContext + ActionRead | - |

**返回数据（Data 内容）**

字段同第 1 节数据模型。设置行不存在时返回默认值对象（`{"trigger_ratio": 0.7, "keep_latest_images": 2, "tool_result_max_chars": 2000, "thinking_policy": "trim-all-but-last", "chars_per_token": 4, "image_token_estimate": 1200, "rewrite": {"strength": "lite", "protected_survival_rate": 0.95}}`，无时间戳字段），HTTP 200。
