# /intent-config

AI 意图配置单例（配合 BFE `mod_ai_intent` 模块：意图分类的问题集与置信度门控
阈值）。**单行覆盖式全量读写**：不提供历史版本查询与单字段更新；每次 PUT 覆盖
唯一一行并生成新内部版本。

## 1. 数据模型

```json
{
  "min_confidence": 0.6,
  "questions": [
    {
      "name": "task_type",
      "type": "choice",
      "instructions": "这条请求属于哪类研发任务？",
      "criteria": {
        "coding": "编写或修改代码、调试、重构、代码审查",
        "test_writing": "编写测试用例、单元测试、集成测试、补充断言",
        "doc_writing": "编写文档、README、注释、接口说明、使用示例"
      }
    },
    {
      "name": "complexity",
      "type": "score",
      "instructions": "这个任务的复杂度如何？",
      "min_confidence": 0.7,
      "levels": [
        {"name": "simple", "description": "单步即可完成"},
        {"name": "medium", "description": "多步但模式常见"},
        {"name": "complex", "description": "需要深入推理或跨模块设计"}
      ]
    }
  ]
}
```

**字段说明**

| 字段 | 类型 | 说明 | 可能取值 | 合法性条件 |
|------|------|------|----------|------------|
| `min_confidence` | number | 全局置信度门控阈值：决策服务答案置信度低于该值时视为 unknown（路由意图条件不命中） | 0–1 | 非必填；默认 `0.6` |
| `questions` | array | 问题数组（元素见下表）。**空数组 `[]` = 停用意图分类**（所有意图条件不命中，流量走默认路由），作为故障软开关 | - | 必填；0–10 个元素 |
| `questions[].name` | string | 问题名，路由 cond 中 `req_ai_intent_in("<name>", ...)` 按它引用 | 自定义 | 必填；非空；全部问题中唯一 |
| `questions[].type` | string | 问题类型 | `choice`（多选一）/ `score`（刻度打分） | 必填 |
| `questions[].instructions` | string | 判定指令，发送给决策模型 | 自定义 | 必填；非空 |
| `questions[].criteria` | map<string,string> | 选项集合（type=`choice` 时必填）：选项名 → 选项描述 | 自定义 | 1–10 项；选项名唯一、非空、不含 `\|`；与 `levels` 互斥 |
| `questions[].levels` | array | 档位集合（type=`score` 时必填），**从低到高** | 元素：`{"name", "description"}` | 1–10 档；`name` 唯一、非空；与 `criteria` 互斥 |
| `questions[].min_confidence` | number | 该问题的门控阈值，覆盖全局 `min_confidence` | 0–1 | 非必填 |

**响应只读字段**（仅 GET/PUT 响应携带，提交时忽略）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `created_at` | string | 创建时间（RFC3339） |
| `updated_at` | string | 更新时间（RFC3339） |

**约束**

- **全量覆盖**：PUT 提交体即全量配置；不保存历史版本（无 `version` 出参、无
  `/{id}` 接口）；回滚 = 重新 PUT 旧内容（从操作日志/人工备份找回）。
- `version` 为下发链路内部字段（InnerAPI 导出 → conf-agent 落盘 → BFE 数据
  文件 `intent_questions.data` 的 `Version`），**不在本接口暴露**；PUT 成功即
  内部生成新版本（`yyyyMMddHHmmss`，审计/追溯用）；**下发按内容签名增量**——
  PUT 内容未变时导出返回 `Data: null`，conf-agent 不落盘、不触发 BFE 热更。
- 导出到 BFE 的字段为 PascalCase（`Version`/`MinConfidence`/`Questions` 及
  子字段 `Name`/`Type`/`Instructions`/`Criteria`/`Levels`/`Description`），
  转换发生在导出 Generator；本接口为小写下划线词汇。
- 数量上限为控制面口径（questions 0–10、选项/档位 1–10），严于 BFE 协议上限
  （255），放宽仅需改控制面校验常量。
- 路由规则不在本资源内：意图条件在路由规则 `cond` 中直传书写
  （`req_ai_intent_in(...)`），见 `route-tables.md`（本次无变更）。

---

## 2. 接口清单

### 2.1 全量更新意图配置

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 全量更新意图配置（单行覆盖，生成新内部版本） | - |
| 端点 | /intent-config | - |
| 版本 | v1 | - |
| method | PUT | - |
| 权限 | FeatureAIIntent + ActionUpdate | - |

**输入参数（Body）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| min_confidence | number | 全局门控阈值 | N | 见第1节字段说明 | 0–1 |
| questions | array | 问题数组（0–10 个，空数组=停用软开关） | Y | 元素校验见第1节字段说明 | 0–10 个 |

**HTTP BODY参数示例**

```json
{
    "min_confidence": 0.6,
    "questions": [
        {
            "name": "task_type",
            "type": "choice",
            "instructions": "这条请求属于哪类研发任务？",
            "criteria": {
                "coding": "编写或修改代码、调试、重构、代码审查",
                "test_writing": "编写测试用例、单元测试、集成测试、补充断言",
                "doc_writing": "编写文档、README、注释、接口说明、使用示例"
            }
        },
        {
            "name": "complexity",
            "type": "score",
            "instructions": "这个任务的复杂度如何？",
            "min_confidence": 0.7,
            "levels": [
                {"name": "simple", "description": "单步即可完成"},
                {"name": "medium", "description": "多步但模式常见"},
                {"name": "complex", "description": "需要深入推理或跨模块设计"}
            ]
        }
    ]
}
```

**执行逻辑**

1. 校验参数合法性：整体校验 questions JSON（同 BFE `intent_questions.data`
   口径：Name 唯一非空、Type 枚举、Criteria/Levels 互斥且必填其一、数量上限、
   选项名不含 `|`）、min_confidence 及各问题阈值取值范围
2. 生成新版本（`yyyyMMddHHmmss`，冲突时 +1s 顺延）
3. 单事务内覆盖单行（不存在则插入，固定 id=1）；失败回滚，配置保持原状
4. 记录操作日志（`resource_type=intent_config`，`before` 快照取自库中现状）
5. 返回结果

**返回数据（Data内容）**

字段同第1节数据模型（含响应只读字段 `created_at`/`updated_at`；不含 version）。

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "min_confidence": 0.6,
        "questions": [
            {
                "name": "task_type",
                "type": "choice",
                "instructions": "这条请求属于哪类研发任务？",
                "criteria": {
                    "coding": "编写或修改代码、调试、重构、代码审查",
                    "test_writing": "编写测试用例、单元测试、集成测试、补充断言",
                    "doc_writing": "编写文档、README、注释、接口说明、使用示例"
                }
            },
            {
                "name": "complexity",
                "type": "score",
                "instructions": "这个任务的复杂度如何？",
                "min_confidence": 0.7,
                "levels": [
                    {"name": "simple", "description": "单步即可完成"},
                    {"name": "medium", "description": "多步但模式常见"},
                    {"name": "complex", "description": "需要深入推理或跨模块设计"}
                ]
            }
        ],
        "created_at": "2026-09-26T12:00:00+08:00",
        "updated_at": "2026-09-26T12:00:00+08:00"
    }
}
```

**约束**

- `{"questions": []}` 为**停用意图分类的软开关**：BFE 侧所有意图条件不命中，
  流量走默认路由；恢复 = 发布非空配置，路由规则无需改动。
- 配置生效时延 = conf-agent 轮询周期（`ReloadIntervalMs`）+ BFE 热加载时间。
- 校验失败（4xx）同样记录一条失败操作日志（`before` 快照取自库中现状）。

---

### 2.2 查询意图配置

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 查询当前生效的意图配置 | - |
| 端点 | /intent-config | - |
| 版本 | v1 | - |
| method | GET | - |
| 权限 | FeatureAIIntent + ActionRead | - |

**返回数据（Data内容）**

字段同第1节数据模型（含响应只读字段）。未发布过配置时返回 404（ErrNum 对应
资源不存在错误码）；已发布但 `questions: []` 时正常返回空数组。
