# 07 模型定价：管理模型价格与计费

模型定价用于维护各提供商 + 模型名的价格信息，供网关进行费用核算。定价数据以「提供商 / 模型名 / 归一化模型名 / 模型模式」为唯一维度。

入口：资源管理 → 模型定价（或顶部菜单「模型定价」，视部署菜单配置而定）。

> **与模型服务商的关系**：`提供商` 字段建议与 [04 章 模型服务商](04-model-provider.md) 中的服务商 `name` 保持一致。服务商列表支持「查询模型价格」跳转到本页并按提供商筛选。若需按时段差异化计价，须先在服务商侧配置「分段计价」（忙时时间段），再在本页为对应 `provider` 维护 **分时段价格**。

## 7.1 列表页

展示当前已维护的模型定价记录。

![模型定价列表](images/11-model-price-list.png)

**分页**：默认每页 **50** 条，可通过底部分页下拉切换为 20 / 50 / 100 / 200 / 500 / 1000 条/页。与其他模块的前端分页不同，本模块采用**服务端分页**，切换页码或每页条数时会重新请求后端。

**表格列说明**：

| 列名 | 说明 |
| --- | --- |
| 提供商 | 价格归集标识，建议与模型服务商 `name` 一致 |
| 模型名 | 模型名称 |
| 归一化模型名 | 基础模型名称 |
| 模型模式 | 模型能力模式 |
| 操作 | 详情、编辑、删除 |

列表上方有「+ 新增定价」和「YAML 导入」按钮。

**从服务商跳转**：在模型服务商列表点击「查询模型价格」，会按该服务商名称筛选本列表；若无记录，提示「未找到提供商 {provider} 的模型定价」。

## 7.2 创建 / 编辑定价

点击「+ 新增定价」或在操作列点击「编辑」，右侧弹出创建/编辑抽屉。

![模型定价表单](images/11-model-price-upsert.png)

### 基础信息

| 字段 | 必填 | 默认值 | 校验规则 | 说明 |
| --- | --- | --- | --- | --- |
| 提供商 | 是 | 空 | 长度 1-255 | 价格归集标识；建议与模型服务商 `name` 一致，便于从服务商页跳转查询 |
| 模型名 | 是 | 空 | 长度 1-255 | 模型名称 |
| 归一化模型名 | 是 | 空 | 长度 1-255 | 基础模型名称 |
| 模型模式 | 是 | 空 | 枚举值 | 模型能力模式，如 `chat`、`completion`、`embedding` 等 |

**mode 枚举值**（常用）：

| 枚举值 | 说明 |
| --- | --- |
| chat | 聊天对话 |
| completion | 文本补全 |
| responses | Responses API |
| image_generation | 图像生成 |
| image_edit | 图像编辑 |
| embedding | 文本嵌入 |
| rerank | 重排序 |
| audio_speech | 语音合成 |
| audio_transcription | 语音转录 |
| video_generation | 视频生成 |
| ocr | OCR |
| search | 搜索 |
| realtime | 实时交互 |

### 能力与支持参数

- **模型能力**：模型支持的能力标签，多选。如 `chat`、`vision`、`reasoning`、`tools`、`function_calling` 等。
- **支持参数**：模型支持的请求参数，多选。如 `temperature`、`top_p`、`max_tokens`、`tools`、`response_format` 等。

### 限制对象（模型限制）

动态键值对，键名从枚举值中选择，值为非负整数。

| 键名 | 含义 |
| --- | --- |
| context_window | 上下文窗口 |
| max_input_tokens | 最大输入 Token 数 |
| max_output_tokens | 最大输出 Token 数 |
| max_tokens | 最大 Token 数 |

> 同一「限制对象」中键名不能重复。

### 价格

「价格」Card 内包含两块配置：**默认价格**（必填）与 **分时段价格**（选填）。货币固定为 `RMB`，无需输入。

#### 默认价格

必填；至少添加一条价格项。键名从枚举中选择，值为非负数。可输入科学计数法或十进制（如 `1.5e-6` 与 `0.0000015`）。**失焦后按量级自动格式化**：绝对值小于 `1e-4` 或大于等于 `1e6` 显示为科学计数法，其余为十进制。单价格折算 `价格 × 1e8` 不得超过 `2^53`（约 `9e15`）。

| 说明 | 内容 |
| --- | --- |
| 何时使用 | 所有请求的 **fallback 价格**；未命中任何分时段 tier 时使用 |
| 校验 | 至少 1 条；键名不可重复；值须 ≥ 0；科学计数法与十进制均可；`价格 × 1e8` 不得超过 `2^53` |

价格字段从下拉枚举中选择，常用键名按类别如下：

**文本 Token**：

| 键名 | 含义 |
| --- | --- |
| input_cost_per_token | 每 Token 输入成本 |
| output_cost_per_token | 每 Token 输出成本 |

**缓存**：

| 键名 | 含义 |
| --- | --- |
| cache_read_input_token_cost | 缓存读入 Token 成本 |
| cache_creation_input_token_cost | 缓存创建 Token 成本（5m TTL） |
| cache_creation_input_token_cost_1h | 缓存创建 Token 成本（1h TTL） |

**长上下文分档**（按请求规模阶梯计价）：

| 键名 | 含义 |
| --- | --- |
| input_cost_per_token_above_200k_tokens | 超过 200k tokens 的输入成本 |
| output_cost_per_token_above_200k_tokens | 超过 200k tokens 的输出成本 |
| input_cost_per_token_above_256k_tokens | 超过 256k tokens 的输入成本 |
| output_cost_per_token_above_256k_tokens | 超过 256k tokens 的输出成本 |
| input_cost_per_token_above_272k_tokens | 超过 272k tokens 的输入成本 |
| output_cost_per_token_above_272k_tokens | 超过 272k tokens 的输出成本 |
| input_cost_per_token_above_512k_tokens | 超过 512k tokens 的输入成本 |
| output_cost_per_token_above_512k_tokens | 超过 512k tokens 的输出成本 |

**图像 / 音频**：

| 键名 | 含义 |
| --- | --- |
| output_cost_per_image | 每张输出图像成本 |
| input_cost_per_image_token | 每图像输入 Token 成本 |
| input_cost_per_audio_token | 每音频输入 Token 成本 |
| output_cost_per_audio_token | 每音频输出 Token 成本 |

**其他**：

| 键名 | 含义 |
| --- | --- |
| output_cost_per_second | 每秒输出成本 |
| input_cost_per_query | 每次查询输入成本 |
| ocr_cost_per_page | 每页 OCR 成本 |

> 下拉枚举还包含像素 / 图像质量 / 音视频时长 / 搜索上下文等键名（如 `output_cost_per_pixel`、`input_cost_per_audio_per_second`、`search_context_cost_per_query`），按所选模型计费模型选用。

#### 分时段价格

选填；用于在特定时段使用不同于默认价格的费率。当前 UI 仅支持 **忙时（peak）** 一个时段对象（只读 Tag 展示）。

| 说明 | 内容 |
| --- | --- |
| 何时使用 | 请求发生时，若该 `provider` 在服务商「分段计价配置」中定义的忙时时间段内，则使用本块 `peak` 价格 |
| 未命中时 | 回退使用上方 **默认价格** |
| 校验 | 键名不可重复；值须 ≥ 0；可不配置（留空表示全时段使用默认价格）；表示法与上限同默认价格 |

> **配置顺序建议**：先在 [04.9 节 分段计价配置](04-model-provider.md#49-分段计价配置) 为服务商定义忙时的星期与起止时间，再在本页为同一 `provider` 填写 `peak` 分时段价格项。时段判定使用服务商配置的 IANA 时区（如 `Asia/Shanghai`）。

分时段价格区标题旁有 Tooltip 说明：「分时段价格配置专属的价格；不在这些时段内时将使用默认价格，可选填。」

### 元数据

- **价格来源**：来源 URL，需符合 URL 格式。
- **备注**：备注文本。

## 7.3 查看详情

点击行或操作列「详情」，右侧弹出只读抽屉，展示全部字段：

- 基础信息：提供商、模型名、归一化模型名、模型模式
- 模型能力、支持参数（标签展示）
- 限制对象
- **价格**：默认价格（键值表）；分时段价格（按时段对象分组，如「时段对象：忙时（peak）」）
- 元数据（价格来源、备注）
- 创建时间、更新时间

![模型定价详情](images/11-model-price-view.png)

## 7.4 YAML 导入

点击列表上方「YAML 导入」，弹出导入弹窗：

![YAML 导入](images/11-model-price-import.png)

- **导入模式**：
  - `replace`：替换已有数据。
  - `merge`：与已有数据合并。
- **上传文件**：支持 `.yaml` / `.yml` 文件。
- 系统上传前会解析并校验 YAML 中 `version` 存在、`default_currency === 'RMB'`。
- YAML 中可同时包含 `prices`（默认价格）与 `tier_prices.peak`（分时段价格）。
- 导入完成后展示成功数、跳过数、错误列表。

## 7.5 注意事项

- 创建/编辑时前端会校验（提供商、模型名、模型模式）组合唯一性。
- **默认价格**至少一条；**分时段价格**可选，未配置时全时段使用默认价格。
- 「限制对象」「默认价格」「分时段价格」中键名均不能重复。
- 价格字段为非负数；科学计数法与十进制表示法等价合法（如 `1.5e-6` 与 `0.0000015`）；单价格折算 `价格 × 1e8` 不得超过 `2^53`（约 `9e15`）。
- **编辑（PUT）合并语义**：`prices` / `tier_prices` 为**键级合并**——表单中出现的键覆盖原值，未出现的键保留。删除某行再提交**不会**从后端清除该键。`limits` / `metadata` / 能力与参数列表仍为整块替换。
- `提供商` 建议与模型服务商 `name` 一致，并与集群「所属服务商」对齐，费用核算才能正确归集。
- 分时段计费的时段定义在服务商资源中维护，本页只维护各 tier 对应的价格数值。
