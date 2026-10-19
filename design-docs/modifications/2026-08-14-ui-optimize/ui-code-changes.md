# UI 代码变更文档

> **对照**：`openapi-doc-diff.md`
> **接口**：`design-docs/api-define/OpenAPI接口定义/`
> **核对日期**：2026-08-14
> **状态**：已实施
>
> **文档维护**：2026-10-17 移除 1 处失效链接 `openapi-doc-diff.md`（该文件在 `ai-gateway-web` / `ai-gateway-api` 全仓及本工作区均不存在，从未提交），按纯文件名引用保留。

---

## 1. 变更优先级总览

| 优先级 | 变更点 | 影响模块 | 状态 | 备注 |
| ------ | ------ | -------- | ---- | ---- |
| P0 | 路由规则降级目标（fallbacks）配置缺失 | 路由表 · 规则表单/查看/管理 | **已完成** | 表单/详情/提交均已支持 fallbacks；新增跨 targets/fallbacks 的 (ClusterName, Model) 重复校验 |
| P0 | API-Key / Entity 配额计划 RMB 单位支持缺失 | API-Key / Entity · 创建/编辑/查看/列表 | **已完成** | unit 下拉、详情/列表动态单位、quota 校验、RMB 提交/重置均已完成 |
| P0 | Cluster LLM 多 Key 加权轮询配置缺失 | 集群 · 大模型配置/复查 | **已完成** | GatewayConfig 已改为多 Key 表格 + key_policy 卡片；Review 已展示 Keys 和 Key Policy |
| P0 | Cluster LLM 新增 provider 字段 | 集群 · 大模型配置/复查 | **已完成** | GatewayConfig 已新增 provider 输入框并提交；Review 不展示 provider |
| P1 | 模型定价（model-prices）管理模块缺失 | 新模块 | **已完成** | 列表/详情/编辑/YAML 导入/路由/i18n 已实现；YAML 导入采用文件上传方式 |

---

## 2. P0：路由规则降级目标（fallbacks）

### 2.1 需求

接口定义中 `RouteRule` 包含 `fallbacks` 数组字段（降级目标列表），每个元素结构与 `targets` 类似但**不含 `Weight`**（仅「目标集群 + 模型」）。当前前端在表单提交和构建 payload 时**主动删除** `fallbacks` 字段，且详情页不展示。

**接口参考**：`00-common.md` §6 路由规则（RouteRule）

```json
{
  "name": "apikey-default",
  "Cond": "default_t()",
  "targets": [{ "ClusterName": "cluster_apikey", "Model": "", "Weight": 100 }],
  "fallbacks": []
}
```

### 2.2 接口校验规则

**RouteRule 字段校验**：

| 字段 | 校验规则 |
| ------ | ---------- |
| `name` | 必填、非空；在同一组 `route_rules` 内唯一 |
| `Cond` | 必填、非空；须为合法 BFE 条件表达式 |
| `targets` | 必填，至少 1 个元素 |
| `fallbacks` | 可选；允许为空数组 `[]` |

**目标集群（targets）元素校验**：

| 字段 | 校验规则 |
| ------ | ---------- |
| 目标集群 | 必填；须为 `/clusters` 中已存在的集群名称 |
| 模型 | 非空时，须为对应集群 `llm_config.models` 中已配置的模型名称；空字符串表示透传原始模型 |
| 权重 | 取值范围 `[0,100]`；同一规则内所有权重之和必须等于 `100` |

**目标集群跨元素约束**：同一 `targets` 数组内，「目标集群 + 模型」组合不能重复；且该组合不能与任何备用集群重复。

**备用集群（fallbacks）元素校验**：

| 字段     | 校验规则                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 目标集群 | 必填；须为 `/clusters` 中已存在的集群名称                                                                                           |
| 模型     | 非空时，须为对应集群 `llm_config.models` 中已配置的模型名称；空字符串表示透传原始模型                                               |

**备用集群跨元素约束**：同一 `fallbacks` 数组内，「目标集群 + 模型」组合不能重复；且该组合不能与任何目标集群重复。

### 2.3 实现

**影响文件**：

- `src/modules/RouteTable/components/RuleForm.vue`
- `src/modules/RouteTable/components/RuleView.vue`
- `src/modules/RouteTable/components/RouteRules.vue`

**具体修改**：

1. **RuleForm.vue**
   - 在「目标集群和模型」配置区下方新增「备用集群和模型」动态表单区
   - 每行字段：目标集群（下拉选择集群）、模型（下拉选择模型/空字符串透传）
   - 支持添加/删除行；`fallbacks` 可为空数组
   - 校验规则：
     - 目标集群：必填校验（选择集群）
     - 模型：非空时须为对应集群已配置的模型；空字符串合法
     - 「目标集群 + 模型」组合在同一 `fallbacks` 数组内不能重复
     - **扩展实现**：「目标集群 + 模型」组合在 `targets` 与 `fallbacks` 之间也不能重复（即目标与备用的组合全局唯一）
   - 错误提示会明确显示与哪个重复项冲突，例如：
     - 同类型重复：`目标集群和模型组合不能重复：test2342 / deepseek-v4-pro`
     - 跨类型重复：`该组合已在目标集群中使用：test2342 / deepseek-v4-pro`
   - 提交时**保留** `fallbacks` 字段（删除 `delete result.fallbacks`）

2. **RuleView.vue**
   - 在目标集群展示区域下方新增备用集群展示区
   - 每条备用集群展示：`目标集群 / 模型`

3. **RouteRules.vue**
   - `buildPayload` 中**删除** `delete clean.fallbacks`，保留 `fallbacks` 随 rules 一起提交
   - 若 `fallbacks` 不是数组，则自动补空数组 `[]`

4. **RouteTable/index.vue（列表页）**
   - 路由表列表由前端分页改为**服务端分页**，`pageTable` 启用 `server-pagination` 模式
   - 提交分页参数 `page` / `page_size`，并回写 `total` / `currentPage` / `pageSize`
   - 支持列搜索参数透传：通过 `on-search-change` 将 `type` / `owner` / `enabled` 等筛选条件拼入 `route-tables` 请求

5. **通用组件 pageTable.vue**
   - 新增 `serverPagination` 属性：开启后由服务端控制分页和搜索，不再做前端本地过滤
   - 新增 `total` / `currentPage` / `pageSize` 属性，用于服务端分页场景
   - 新增事件 `on-page-change` 和 `on-search-change`，向上游透传分页和搜索参数

---

## 3. P0：API-Key / Entity 配额计划 RMB 单位支持缺失

### 3.1 需求

接口定义中 `quota_plan.unit` 支持 `total_token` 和 `RMB` 两种单位，但当前前端：

- **创建/编辑表单**：`unit` 下拉选择仅提供 `total_token` 一个选项，缺少 `RMB`
- **详情页**：quota 数值展示硬编码 `tokens` 后缀（如 `{{ formatNumber(quotaPlanQuota) }} tokens`），未根据 `unit` 动态切换
- **列表页**：quota 用量展示也硬编码为 tokens 口径

**接口参考**：`00-common.md` §8 配额计划（QuotaPlan）

```json
{
  "quota_plan": {
    "unlimited": false,
    "quota": 10000.00,
    "unit": "RMB",
    "reset_period": "monthly"
  }
}
```

### 3.2 接口校验规则

**QuotaPlan 字段校验**：

| 字段 | 校验规则 |
| ------ | ---------- |
| `unlimited` | bool；默认 `true` |
| `pass_when_no_enough_quota` | bool；默认 `false` |
| `quota` | 非负数；`unit=total_token` 时必须为整数；`unit=RMB` 时内部最多保留 8 位小数，**对外统一按 4 位小数展示** |
| `unit` | 默认 `total_token`；可选值：`total_token`、`RMB` |
| `reset_period` | 默认 `never`；可选值：`never`、`weekly`、`monthly` |
| `balance` | 只读，无需传入；`used` / `remaining` 非负数，对外统一按 4 位小数展示 |

### 3.3 实现

**影响文件**：

- `src/modules/APIKey/components/Upsert.vue`
- `src/modules/APIKey/components/ApiKeyView.vue`
- `src/modules/APIKey/components/ApiKeyList.vue`
- `src/modules/Entity/components/EntityUpsert.vue`
- `src/modules/Entity/components/EntityView.vue`
- `src/modules/Entity/components/EntityList.vue`

**具体修改**：

1. **Upsert.vue / EntityUpsert.vue**
   - `quota_plan.unit` 下拉选择新增 `RMB` 选项：

     ```html
     <Option value="total_token">total_token</Option>
     <Option value="RMB">RMB</Option>
     ```

   - `quota` 输入框校验规则：
     - `unit === 'total_token'`：必须为整数，非负数
     - `unit === 'RMB'`：支持小数，最多 4 位小数，非负数
     - 使用 `InputNumber` 动态 `precision`（`total_token` 时 `precision=0`，`RMB` 时 `precision=4`）
     - `RMB` 模式下不使用 `formatter/parser` 千分位格式化，避免输入小数时体验问题；`total_token` 模式下保留千分位展示
   - 提交时仅当 `unit !== 'RMB'` 时对 `quota` 执行 `Math.trunc`，RMB 模式保留 4 位小数

2. **ApiKeyView.vue / EntityView.vue**
   - quota 展示不再硬编码 `tokens` 后缀，改为根据 `quota_plan.unit` 动态显示：
     - `total_token` → `{{ formatNumber(quotaPlanQuota) }} tokens`
     - `RMB` → `¥{{ formatNumber(quotaPlanQuota, 4) }}`
   - `balance.used` / `balance.remaining` 同理动态切换单位后缀
   - RMB 值统一按 4 位小数展示（`toFixed(4)`）
   - 「重置配额」弹窗根据当前 `unit` 动态设置 `InputNumber precision`：
     - `total_token` 时 `precision=0`，校验必须为整数
     - `RMB` 时 `precision=4`，校验最多 4 位小数

3. **ApiKeyList.vue / EntityList.vue**
   - 列表中 quota 用量展示根据 `unit` 动态显示单位（`tokens` 或 `RMB`）
   - RMB 值按 4 位小数展示

---

## 4. P0：Cluster LLM 多 Key 加权轮询

### 4.1 需求

接口定义中 `llm_config` 已变更为多 Key 加权轮询模式：

- `keys`: 多 Key 数组（每个元素含 `name`、`key`、`weight`）
- `key_policy`: 对象（含 `strategy`、`max_retries`、`retry_backoff_initial`、`retry_backoff_max`）

当前前端仍使用单 `keyInput` 字段，提交时映射为单 `key`。

**接口参考**：`clusters.md` §1 数据模型

```json
{
  "llm_config": {
    "keys": [
      { "name": "key-primary", "key": "sk-aaaaaaaaaaaa", "weight": 70 },
      { "name": "key-secondary", "key": "sk-bbbbbbbbbbbb", "weight": 30 }
    ],
    "key_policy": {
      "strategy": "weighted_random",
      "max_retries": 3,
      "retry_backoff_initial": 500,
      "retry_backoff_max": 5000
    }
  }
}
```

### 4.2 接口校验规则

**`llm_config.keys` 元素校验**：

| 字段 | 校验规则 |
| ------ | ---------- |
| `name` | 必填；长度 1-128 字符；**同一 `keys` 数组内唯一** |
| `key` | 必填；非空；长度 1-512 字符 |
| `weight` | 必填；取值范围 `[0,100]`；`0` 表示该 Key 不接收流量（等效于禁用） |

**`llm_config.keys` 跨元素约束**：

- 同一 `keys` 数组内，`name` 不能重复。
- 所有 Key 的 `weight` 之和必须等于 `100`。
- `llm_config.model_endpoint.headers` 中若包含 `${API_KEY}` 占位符，则 `keys` 不能为空，否则返回 `422`。

**`llm_config.key_policy` 字段校验**：

| 字段 | 校验规则 |
| ------ | ---------- |
| `strategy` | 非必填；默认 `weighted_random`；**本版仅支持 `weighted_random`** |
| `max_retries` | 非必填；默认 `0`；须为 `>=0` 的整数 |
| `retry_backoff_initial` | 非必填；默认 `500`；须为 `>=0` 的整数（单位 ms） |
| `retry_backoff_max` | 非必填；默认 `5000`；须为 `>=0` 的整数，且 **须 `>= retry_backoff_initial`**（单位 ms） |

### 4.3 实现

**影响文件**：

- `src/modules/Clusters/components/GatewayConfig.vue`
- `src/modules/Clusters/components/Review.vue`

**具体修改**：

1. **GatewayConfig.vue**
   - 将「服务鉴权 Key」单输入框改为多 Key 动态表单表格，并用 **Card** 包裹为「服务鉴权 Keys」独立区块；Card 标题为 `gatewayConfig.serviceAuthKeys`，区块内部不再重复显示该 label
   - 每行字段：name（名称）、key（密钥）、weight（权重）
   - 默认初始化一行空 Key：`keys: [{ name: '', key: '', weight: 100 }]`；编辑回显时若 `keys` 为空也自动补一行
   - 校验规则：
     - `name`：必填；长度 1-128；同一 `keys` 数组内 name 不能重复
     - `key`：必填；非空；长度 1-512
     - `weight`：必填；取值范围 `[0,100]`；整数
     - **集合校验**：所有非空 Key 的 `weight` 之和必须等于 `100`
     - **占位符校验**：若 `model_endpoint.headers` 中包含 `${API_KEY}`，则提交时过滤后的 `keys` 不能为空
     - **动态行校验**：`name`/`key`/`weight` 的 `required` 规则按行动态生效；空行（`name` 和 `key` 均为空）不触发校验，行内任一字段填写后该行的 `name`/`key`/`weight` 才触发校验
     - **组合重复**：OpenAPI 接口文档仅要求同一 `keys` 数组内 `name` 唯一，未定义 `key` 值唯一或 `(name, key)` 组合唯一校验；前端按接口定义实现，仅校验 `name` 重复
   - 支持添加/删除 Key；提交时过滤掉空行（`name` 和 `key` 均为空）
   - 新增 `key_policy` 配置区（用 **Card** 包裹为「Key 路由策略」独立区块）：
     - `strategy`：下拉选择，本版仅 `weighted_random` 一个选项
     - `max_retries`：整数输入，`>=0`，默认 `0`
     - `retry_backoff_initial`：整数输入（ms），`>=0`，默认 `500`
     - `retry_backoff_max`：整数输入（ms），`>=0` 且 `>= retry_backoff_initial`，默认 `5000`
   - 表单初始值更新：
     - 删除 `keyInput`
     - 增加 `keys: [{ name: '', key: '', weight: 100 }]`
     - 增加 `key_policy: { strategy: 'weighted_random', max_retries: 0, retry_backoff_initial: 500, retry_backoff_max: 5000 }`
   - `handleSubmit` 中：删除单 key 处理逻辑，按新结构提交 `keys` 和 `key_policy`；`keys` 提交前过滤空行
   - 编辑回显：`applyLlmConfigData` 中读取 `keys` 数组和 `key_policy` 对象填充表单；`keys` 为空时自动补一行默认空行
   - 整体 LLM 配置界面按 **Card** 分组：模型服务配置、模型重定向、服务鉴权 Keys、Key 路由策略
   - **模型重定向**同样用 **Card** 包裹，Card 标题为 `gatewayConfig.modelRedirect`，区块内部不再重复显示该 label；空行不校验，任一字段填写后该行才校验，提交时过滤空行
   - 已清理旧单 Key 遗留代码：`validKey` / `isServiceAuthKeyUnchanged` 等函数已删除。

2. **Review.vue**
   - 复查页新增「服务鉴权 Keys」和「Key 路由策略」展示区
   - Keys 表格：name / key（脱敏）/ weight
   - Key Policy：strategy / max_retries / retry_backoff_initial / retry_backoff_max

---

## 5. P0：Cluster LLM 新增 provider 字段

### 5.1 需求

接口定义中 `llm_config` 除 `provider_type` 外，还包含 `provider` 字段，用于与价格表中的 `provider` 关联匹配，实现费用核算绑定。

当前前端仅实现了 `provider_type` 下拉选择，**缺少 `provider` 字段**。

**接口参考**：`clusters.md` §1 数据模型

```json
{
  "llm_config": {
    "provider_type": "deepseek",
    "provider": "deepseek"
  }
}
```

### 5.2 接口校验规则

| 字段            | 校验规则                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `provider_type` | 非必填；若传入，须为 `/model-provider-types` 中已存在的类型                                                            |
| `provider`      | 非必填；默认空字符串；OpenAPI 可读写；用于 InnerAPI 自动填充 `AIConf.ModelTable`；为空时 `ModelTable` 为空列表         |

### 5.3 实现

**影响文件**：

- `src/modules/Clusters/components/GatewayConfig.vue`

**具体修改**：

1. **GatewayConfig.vue**
   - 在「模型服务配置」Card 内，`provider_type` 下拉选择下方单独一行新增 `provider` 输入框
   - 文案区分：
     - `provider_type` 标签改为 **「模型服务商类型」**，并带 Tooltip 说明用于获取模型列表和适配接口
     - `provider` 标签改为 **「价格关联提供商」**，并带 Tooltip 说明用于与模型定价表中的 `provider` 匹配、进行费用核算
   - `provider` 为字符串输入，长度不限（接口定义未限制长度）
   - 表单初始值增加 `provider: ''`
   - 提交时携带 `provider` 字段（删除原 `delete tmpData.provider` 逻辑）
   - 编辑回显时读取 `provider` 值

---

## 6. P1：模型定价（model-prices）管理模块

### 6.1 需求

接口定义包含完整的 `/model-prices` CRUD 接口 + YAML 导入功能。

**接口参考**：`model-prices.md`

### 6.2 接口校验规则

**数据模型字段校验**：

| 字段 | 校验规则 |
| ------ | ---------- |
| `provider` | **必填**；非空；长度 1-255 |
| `model` | **必填**；非空；长度 1-255 |
| `base_model` | **必填**；非空；长度 1-255 |
| `mode` | **必填**；枚举值（见下表） |
| `capabilities` | 默认空数组 `[]`；元素应为枚举值 |
| `supported_parameters` | 默认空数组 `[]`；元素应为枚举值 |
| `limits` | 默认空对象 `{}`；键名应为枚举值（context_window / max_input_tokens / max_output_tokens / max_tokens）；值为非负整数 |
| `prices` | **必填**；至少包含一个价格字段；**所有价格字段必须为非负数**；键名应为枚举值 |
| `price_currency` | 固定为 `RMB`，请求体中**无需传入** |
| `metadata` | 默认空对象 `{}`；键名应为枚举值（source / notes） |

**`mode` 枚举值**：

| 枚举值 | 说明 |
| -------- | ------ |
| `chat` | 聊天对话 |
| `completion` | 文本补全 |
| `responses` | Responses API |
| `image_generation` | 图像生成 |
| `image_edit` | 图像编辑 |
| `embedding` | 文本嵌入 |
| `rerank` | 重排序 |
| `audio_speech` | 语音合成 |
| `audio_transcription` | 语音转录 |
| `video_generation` | 视频生成 |
| `ocr` | OCR |
| `search` | 搜索 |
| `realtime` | 实时交互 |

**`capabilities` 枚举值**（常用）：chat、vision、reasoning、tools、structured_outputs、function_calling、prompt_caching、web_search、image_generation、embedding、rerank、audio_speech、audio_transcription、video_generation、ocr、search、realtime

**`supported_parameters` 枚举值**（常用）：temperature、top_p、max_tokens、tools、tool_choice、response_format、reasoning、image_input、video_input、audio_input

**`limits` 键名枚举**：context_window、max_input_tokens、max_output_tokens、max_tokens

**`prices` 键名枚举**：input_cost_per_token、output_cost_per_token、cache_read_input_token_cost、cache_creation_input_token_cost、input_cost_per_token_above_200k_tokens、output_cost_per_token_above_200k_tokens、output_cost_per_image、output_cost_per_pixel、output_cost_per_second、input_cost_per_query、search_context_cost_per_query、ocr_cost_per_page、output_cost_per_character、output_cost_per_image_hd、output_cost_per_video、output_cost_per_video_per_second

### 6.3 实现

**新建模块**：`src/modules/ModelPrices/`

**至少包含**：

1. **列表页** `index.vue`
   - 表格字段：`provider`、`model`、`base_model`、`mode`、`operation`
   - 分页：已实现
   - 筛选：列上标记 `searchable: true`，但 `fetchData` 未将搜索关键词作为查询参数提交，筛选未真正生效
   - 操作列：详情、编辑、删除
   - 顶部按钮：「新增定价」、「YAML 导入」

2. **详情页** `components/ModelPriceView.vue`
   - 展示全部字段：
     - 基础信息：provider、model、base_model、mode
     - capabilities、supported_parameters（标签展示）
     - limits（键值对表格）
     - prices（键值对表格）
     - metadata（source、notes）
     - create_time、update_time
   - **字段名说明**：接口实际返回 `create_time` / `update_time`，详情页按此字段读取

3. **创建/编辑页** `components/ModelPriceUpsert.vue`
   - 表单字段及校验：
     - `provider`：**必填**；非空；长度 1-255
     - `model`：**必填**；非空；长度 1-255
     - `base_model`：**必填**；非空；长度 1-255
     - `mode`：**必填**；下拉枚举（13 个值）
     - `capabilities`：多选标签（枚举值，选项覆盖文档常用值并略有扩展）
     - `supported_parameters`：多选标签（枚举值）
     - `limits`：动态键值对（键名枚举下拉 + 值非负整数输入）；已校验同键重复
     - `prices`：**必填**；动态键值对（键名枚举下拉 + 值非负数输入，precision=8）；**至少添加一条**；已校验同键重复
     - `metadata.source`：URL 字符串输入；已做 URL 格式校验
     - `metadata.notes`：文本字符串
   - `price_currency` 固定为 `RMB`，无需表单输入
   - **额外实现**：新增/编辑时前端校验 `(provider, model, mode)` 组合唯一性（调用 GET `model-prices?provider=&model=&mode=`）

4. **YAML 导入页/弹窗** `components/ModelPriceImport.vue`
   - 使用 iView `Upload` 组件进行 YAML 文件上传（`.yaml/.yml`）
   - 已支持：
     - `replace` / `merge` 导入模式选择
     - 上传前解析 YAML 并校验 `version` 存在、`default_currency === 'RMB'`
     - 通过 `/open-api/v1/model-prices/import` 批量提交
     - 导入结果展示：成功数、跳过数、错误列表

5. **路由注册**
   - 在 `src/router/router.js` 中新增 `/model-prices` 路径，路由名 `ModelPrice.list`（与 API 返回的菜单 id 一致）

6. **菜单图标注册**
   - 在 `src/layout/sidebar/navItem.vue` 中补充 `ModelPrice.list` 的图标映射：`ivu-icon-logo-yen`
   - 同时补齐其他可能菜单 id 的图标映射（如 `AIGatewayInstancePoolManage`、`APIKeyManage`、`RouteManage` 等），避免菜单 id 与图标 key 不匹配时无图标显示

7. **i18n**
   - 新增 `modelPrices` 命名空间，覆盖字段标签、操作文案、校验提示、导入相关文案

---

## 7. 实现差异与待修复清单

| 模块             | 问题                                     | 影响                     | 建议修复                                                            |
| ---------------- | ---------------------------------------- | ------------------------ | ------------------------------------------------------------------- |
| RouteTable 列表  | 路由表列表改为服务端分页，文档未说明     | 无功能影响，但文档不完整 | 已在 2.3 节补充 RouteTable/index.vue 和 pageTable.vue 变更说明      |
| ModelPrices 列表 | 列数超出文档要求（5 列 vs 4 列）         | 与设计文档不一致             | 确认是否保留 5 列，或按设计文档精简                                     |

---

## 8. 明确不改项（前端已实现）

| 项 | 说明 |
| ---- | ------ |
| API-Key / Entity 的 `route_rules` | 已通过「管理路由规则」按钮跳转至 RouteRules.vue 独立页面管理，无需在创建/编辑表单中重复配置 |
| API-Key / Entity 的 `rate_limit_policy` | 已支持 TPM、RPM、max_concurrency 配置 |
| API-Key / Entity 的 `quota-plan/reset` | 重置配额功能已对接 POST 接口 |
| Entity 的 `allow_models` / `block_models` | 模型访问控制已实现（含 `*` 通配逻辑） |
| RouteTable 的 `targets` | 转发目标配置（ClusterName、Model、Weight）已实现 |
| Global Route Rules | 全局路由规则（enabled + rules）已实现 |
| Cluster 的 `model_endpoint` / `models` / `model_mappings` / `provider_type` | 已实现 |

---

## 9. 测试计划

### 9.1 fallbacks

- [x] 路由规则表单：可添加/删除 fallbacks 行，ClusterName 下拉、Model 下拉正常
- [x] fallbacks `(ClusterName, Model)` 组合重复校验生效（含 targets 与 fallbacks 跨类型重复）
- [x] 提交后 API 请求体包含 `fallbacks` 数组
- [x] 路由规则详情页：展示 fallbacks 列表
- [x] 编辑回显：fallbacks 数据正确填充

### 9.2 quota_plan RMB

- [x] API-Key / Entity 创建/编辑表单：unit 下拉可选 `RMB`
- [x] unit=`total_token` 时 quota 必须为整数，unit=`RMB` 时 quota 最多 4 位小数（输入校验）
- [x] RMB 配额提交后保留 4 位小数
- [x] 详情页：unit=`RMB` 时展示 `¥xxx`（4 位小数），unit=`total_token` 时展示 `xxx tokens`
- [x] 列表页：quota 用量根据 unit 动态显示单位
- [x] RMB 模式下 balance.used / balance.remaining 按 4 位小数展示
- [x] RMB 模式下重置配额弹窗可输入 4 位小数

### 9.3 Cluster 多 Key

- [x] GatewayConfig：多 Key 表格默认初始化一行空行，可添加/删除行，name/key/weight 输入正常
- [x] 空行（name 和 key 均为空）不触发必填校验
- [x] 行内任一字段填写后，该行 `name` / `key` / `weight` 才触发校验
- [x] `name` 必填；长度 1-128；同一 keys 数组内 name 不能重复
- [x] `key` 必填；非空；长度 1-512
- [x] `weight` 取值范围 `[0,100]`；整数
- [x] 权重校验：所有非空 Key 的 weight 之和必须等于 `100`
- [x] `model_endpoint.headers` 含 `${API_KEY}` 时，提交后过滤的 keys 不能为空
- [x] 提交时 API 请求体过滤空行，仅保留非空 Key
- [x] key_policy.strategy 仅允许 `weighted_random`
- [x] key_policy.max_retries 须为 `>=0` 整数
- [x] key_policy.retry_backoff_initial / retry_backoff_max 须为 `>=0` 整数，且 max >= initial
- [x] 提交后 API 请求体包含 `keys` 数组和 `key_policy` 对象
- [x] 编辑回显：多 Key 和 key_policy 正确填充；回显 keys 为空时自动补一行默认空行
- [x] Review 页：展示 Keys 表格和 Key Policy 信息
- [x] LLM 配置界面按 Card 分组展示，卡片内部不再重复显示与标题相同的 label

### 9.4 Cluster provider 字段

- [x] GatewayConfig：provider 输入框在「模型服务配置」Card 内独占一行展示
- [x] `provider_type` 标签为「模型服务商类型」，带 Tooltip 说明用途
- [x] `provider` 标签为「价格关联提供商」，带 Tooltip 说明用途
- [x] 提交后 API 请求体包含 `provider` 字段
- [x] 编辑回显：provider 值正确填充

### 9.5 model-prices（新建模块）

- [x] 列表页：展示 provider / model / base_model / mode / operation 列，分页正常（列表按 provider / model / mode 筛选不实现）
- [x] 详情页：展示全部字段（capabilities、supported_parameters、limits、prices、metadata、create_time、update_time）
- [x] 创建/编辑：provider / model / base_model / mode 必填校验
- [x] prices 至少包含一个字段，所有价格值为非负数
- [x] limits 键名为枚举值，值为非负整数
- [x] limits / prices 同键重复校验
- [x] metadata.source URL 格式校验
- [x] YAML 导入：文件上传方式可导入成功

---

## 10. 参考文档

| 文档 | 路径 |
| ------ | ------ |
| 公共类型定义 | `design-docs/api-define/OpenAPI接口定义/00-common.md` |
| API-Key 接口 | `design-docs/api-define/OpenAPI接口定义/api-keys.md` |
| Entity 接口 | `design-docs/api-define/OpenAPI接口定义/entities.md` |
| Cluster 接口 | `design-docs/api-define/OpenAPI接口定义/clusters.md` |
| 模型定价接口 | `design-docs/api-define/OpenAPI接口定义/model-prices.md` |
| 全局路由规则 | `design-docs/api-define/OpenAPI接口定义/global-route-rules.md` |
| 上一轮已完成 | `design-docs/modifications/2026-08-06-ui-optimize/ui-code-changes.md` |
