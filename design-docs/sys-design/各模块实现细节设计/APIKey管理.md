# APIKey 模块细节设计

## 1. 模块定位

`APIKey` 管理外部系统访问 AI 网关的 API Key，包括创建、编辑、查看详情、删除、配额重置以及模型/限流/子网配置。

## 2. 路由与入口

| 路由 | name | 组件 | 说明 |
|------|------|------|------|
| `/api-key` | `APIKey.list` | `modules/APIKey/index.vue` | Tab 容器，当前仅含 API-Key 列表。 |

实际列表组件：`modules/APIKey/components/ApiKeyList.vue`。

## 3. 页面结构

### 3.1 列表页

- 使用 `pageTable` 展示以下列：
  - `id`
  - `key`（脱敏显示，可点击查看完整 Key）
  - `description`
  - `enabled`
  - 配额类型与用量
  - 限流状态
  - 挂载 Entity
  - 操作列
- 顶部「创建」按钮打开抽屉。
- 行点击可进入详情；行内支持编辑、删除。
- 删除使用 `CustomModal` 二次确认。

### 3.2 新建/编辑抽屉

- 使用 `Upsert.vue`，宽度 60%。
- 包含基础信息、有效期、子网、挂载 Entity、配额计划、限流策略、模型绑定等表单。

### 3.3 详情抽屉

- 使用 `ApiKeyView.vue`。
- 展示完整配置，并提供「重置配额」操作。

## 4. 组件清单

| 组件 | 职责 | 关键 Props | 事件 |
|------|------|------------|------|
| `ApiKeyList.vue` | 列表 CRUD | — | — |
| `Upsert.vue` | 新建/编辑表单 | `currentData`、`isAdd` | `submit`、`cancel` |
| `ApiKeyView.vue` | 详情 + 配额重置 | `currentData` | `cancel`、`submit` |

## 5. 表单字段与校验

| 字段 | 校验 | 说明 |
|------|------|------|
| `description` | 必填，≤512 字符 | 描述。 |
| `expired_time` | 非永久时必选 | 提交时转为 Unix 秒或 `-1`（永久）。 |
| `subnet` | CIDR 格式，`*` 与具体网段互斥，需检测包含/重复 | 访问来源限制。 |
| `entity` | 可选 | 挂载的 Entity。 |
| `quota_plan.unit` | `total_token` 或 `RMB` | Token 计数或金额计费。 |
| `quota_plan.quota` | 有限配额时必填；`total_token` 为非负整数且 ≤ 9,999,999,999，`RMB` 最多 4 位小数且 ≤ 90,000,000.00 | 配额数值。 |
| `rate_limit_policy` | 启用时至少配置 TPM/RPM/最大并发/批量限流之一 | 限流策略。 |
| `rate_limit_policy.rules.batch_limits` | 四维度均 ≥0；留空或 `0` = 不配该维度，全部为空时不提交 | 批量限流（按 API-Key 计、与模型无关）。 |
| `rate_limit_policy.rules` | 规则名不重复，TPM/RPM 各最多 3 条 | 限流规则。 |
| `models` | `*` 与具体模型互斥 | 模型白名单。 |

### 5.1 并发模式

代码中将并发数值映射为三种语义：

- `-1`：不限
- `0`：禁止
- `>0`：限制为指定数值

### 5.2 布尔字段

UI 中部分启用/禁用字段使用字符串，提交前转为布尔值。

## 6. 数据流

```
APIKey/index.vue (Tab 容器)
    └─ ApiKeyList.vue
          ├─ Upsert.vue (Drawer) → $emit('submit') → 父组件 POST/PATCH
          ├─ ApiKeyView.vue (Drawer) → $emit('submit') → 重置配额
          └─ 行操作 → 删除/编辑/查看
```

- 无 Vuex 状态；数据由 `ApiKeyList.vue` 集中管理。
- 详情页会单独 `GET /api-keys/{id}` 刷新，确保显示最新数据。

## 7. OpenAPI 消费映射

| 组件 | 方法 | 相对 URL | 说明 |
|------|------|----------|------|
| `ApiKeyList.vue` | `GET` | `api-keys` | 列表。 |
| `ApiKeyList.vue` | `POST` | `api-keys` | 创建。 |
| `ApiKeyList.vue` | `PATCH` | `api-keys/{id}` | 更新。 |
| `ApiKeyList.vue` | `DELETE` | `api-keys/{id}` | 删除。 |
| `ApiKeyView.vue` | `GET` | `api-keys/{id}` | 详情。 |
| `ApiKeyView.vue` | `POST` | `api-keys/{id}/quota-plan/reset` | 重置配额。 |
| `Upsert.vue` | `GET` | `entities` | 挂载 Entity 下拉。 |
| `Upsert.vue` | `GET` | `clusters` | 集群模型列表（模型绑定）。 |

配额重置弹窗按当前 `unit` 限制精度与上限（`total_token` ≤ 9,999,999,999；RMB 4 位小数 / 9000 万元）。

## 8. 边界情况

- Key 列表默认脱敏，完整 Key 通过 Modal 弹窗展示，便于复制。
- 编辑提交前会剔除 `id`、`create_time`、`update_time` 等只读字段。
- 模型列表 Modal 已实现（`showModelsModal`），但当前未在列渲染中调用，后续可按需接入。
