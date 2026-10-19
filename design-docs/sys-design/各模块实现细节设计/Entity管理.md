# Entity 模块细节设计

## 1. 模块定位

`Entity` 管理服务实体（Entity）与实体类型（Entity Type），用于构建 API Key 的组织层级与模型/配额/限流继承关系。

## 2. 路由与入口

| 路由 | name | 组件 | 说明 |
|------|------|------|------|
| `/entity` | `Entity.list` | `modules/Entity/index.vue` | 双 Tab 容器：组织管理 / 类型管理。 |

内部视图：

- `EntityList.vue` / `EntityUpsert.vue` / `EntityView.vue`：Entity CRUD 与详情。
- `EntityTypeList.vue` / `EntityTypeUpsert.vue`：Entity Type CRUD。

## 3. 页面结构

### 3.1 组织管理（Entity）

- 使用 `pageTable` 展示 `name`、`level`（级别，由行的 `type` 反查 `GET /entity-types` 的 `level`；类型不存在时显示 `-`）、`type`、`parent_id`（解析为父名）、配额用量、限流状态、操作。
- 「级别」列可排序，并在筛选行提供 `1`–`5` 下拉筛选（与类型管理的级别筛选一致）；列表为客户端筛选/排序，`GET /entities` 不带分页参数。
- 顶部「创建 Entity」按钮打开抽屉。
- 行点击可进入详情。

### 3.2 类型管理（Entity Type）

- 使用 `pageTable` 展示 `type_name`、`description`、`level`（1–5）、`create_time`、操作。
- 顶部「创建类型」按钮打开抽屉。

## 4. 组件清单

| 组件 | 职责 | 关键 Props | 事件 |
|------|------|------------|------|
| `EntityList.vue` | Entity 列表 | — | — |
| `EntityUpsert.vue` | Entity 新建/编辑 | `currentData`、`isAdd`、`entityList` | `submit`、`cancel` |
| `EntityView.vue` | Entity 详情 + 配额重置 | `currentData`、`entityList` | `cancel`、`submit` |
| `EntityTypeList.vue` | 类型列表 | — | — |
| `EntityTypeUpsert.vue` | 类型新建/编辑 | `currentData`、`isAdd` | `submit`、`cancel` |

## 5. 表单字段与校验

### 5.1 EntityUpsert

| 字段 | 校验 | 说明 |
|------|------|------|
| `name` | 必填；EntityName：1–64，小写字母/数字/`_`/`-`/`@`，不能以 `_`、`-`、`@` 开头或结尾；新建可编辑，编辑 disabled | Entity 名称，支持 `用户名@项目名`。 |
| `type` | 必填；编辑 disabled | 关联的 Entity Type。 |
| `parent_id` | 可选；选项为 level 低于当前类型的 Entity，不可选自己 | 父级实体。 |
| `allow_models` | 多选；`*` 与具体模型互斥 | 模型白名单。 |
| `block_models` | 多选；空时提交为 `['*']` | 模型黑名单。 |
| `quota_plan` / `rate_limit` | 与 API Key 类似；`quota_plan.unit` 支持 `total_token` / `RMB` | 配额与限流。`total_token` 上限 9,999,999,999；RMB 上限 90,000,000.00，4 位小数。 |

### 5.2 EntityTypeUpsert

| 字段 | 校验 | 说明 |
|------|------|------|
| `type_name` | 必填，匹配 `^[a-z0-9_-]{1,32}$`；新建可编辑 | 类型名称。 |
| `description` | 最长 1024 | 描述。 |
| `level` | 1–5 必选 | 层级，用于限制父子关系。 |

## 6. 数据流

```
Entity/index.vue (Tab 容器)
    ├── EntityList.vue
    │     ├── EntityUpsert.vue (Drawer) → $emit('submit') → 父组件 POST/PATCH
    │     └── EntityView.vue (Drawer) → $emit('submit') → 重置配额
    └── EntityTypeList.vue
          └── EntityTypeUpsert.vue (Drawer) → $emit('submit') → 父组件 POST/PATCH
```

- `entityList` 作为 prop 传入 Upsert/View，用于父级名称解析与下拉选择。
- 父子关系选择受 Entity Type 的 `level` 层级约束：子 Entity 的 `level` 必须大于父级。

## 7. OpenAPI 消费映射

| 组件 | 方法 | 相对 URL | 说明 |
|------|------|----------|------|
| `EntityList.vue` | `GET` | `entities` | 列表。 |
| `EntityList.vue` | `GET` | `entity-types` | 级别列数据源：按行的 `type` 反查类型 `level`（与 `GET entities` 并行发出）。 |
| `EntityList.vue` | `POST` | `entities` | 创建。 |
| `EntityList.vue` | `PATCH` | `entities/{id}` | 更新。 |
| `EntityList.vue` | `DELETE` | `entities/{id}` | 删除。 |
| `EntityView.vue` | `GET` | `entities/{id}` | 详情。 |
| `EntityView.vue` | `POST` | `entities/{id}/quota-plan/reset` | 重置配额。 |
| `EntityUpsert.vue` | `GET` | `entity-types` | 类型下拉。 |
| `EntityUpsert.vue` | `GET` | `clusters` | 集群模型列表。 |
| `EntityTypeList.vue` | `GET` | `entity-types` | 类型列表。 |
| `EntityTypeList.vue` | `POST` | `entity-types` | 创建类型。 |
| `EntityTypeList.vue` | `PATCH` | `entity-types/{id}` | 更新类型。 |
| `EntityTypeList.vue` | `DELETE` | `entity-types/{id}` | 删除类型。 |

配额重置弹窗按当前 `unit` 限制精度与上限（`total_token` ≤ 9,999,999,999；RMB 4 位小数 / 9000 万元）。

## 8. 边界情况

- 父 Entity 解析失败时，展示文案存在 `- 无父级` 拼接问题，可优化为 `parentEntityName || ('- ' + $t('entity.noParent'))`。
- Entity 删除前应校验是否被 API Key 挂载，但当前由后端返回错误提示，前端只展示。
- Entity Type 的 `level` 决定可挂载的父级范围，修改类型 `level` 可能影响现有父子关系，后端需保证一致性。
- 组织列表的「级别」列在 `GET /entity-types` 失败或行的 `type` 不在类型表中时显示 `-`（级别为 `undefined`，排序时排到末尾）。
