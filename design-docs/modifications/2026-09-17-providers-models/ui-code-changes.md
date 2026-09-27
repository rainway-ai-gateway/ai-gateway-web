# UI 代码变更文档

> **对照接口**：`providers.md`（§1、§2.1、§3.6）  
> **对照原型**：`prototype-design/pages/providers.html`  
> **状态**：**原型已完成**（待生成 Vue UI 代码）

本文记录 2026-09-17 后端 API 接口变更驱动的原型设计变更。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 状态 |
| ----------- | -------- | ---- |
| Provider 创建/编辑 · 模型列表 | `models` 字段从非必填改为必填（至少 1 个元素），标签添加红色必填星号，提示文案更新，validate() 新增校验 | ✅ 原型 |
| 模型定价 · 列表分页 | `page_size` 默认值 20→50、最大 100→1000，页面传入自定义 `pageSizes` 扩展分页选项 | ✅ 原型 |

---

## 2. 修改 · Provider 创建/编辑·模型列表

**文件**：`prototype-design/assets/js/provider-upsert.js`  
**对照接口**：`providers.md` §1 字段说明（`models` 必填化）、§3.6 校验规则

### 2.1 接口变更

| 字段 | 变更前 | 变更后 |
| ---- | ------ | ------ |
| `models` 必填性 | 非必填，默认空数组 `[]` | **必填**，至少 1 个元素，元素非空且不可重复 |

对应的接口文档位置：

- `providers.md` §1 字段说明表：`models` 合法性条件从「非必填；默认空数组 `[]`；元素非空且不可重复」→「**必填**；至少 1 个元素；元素非空且不可重复」
- `providers.md` §2.1 执行逻辑第 6 步：新增「校验 `models` 必填：至少 1 个元素，元素非空且不可重复，通过后直接保存」
- `providers.md` §3.6：`models` 必填；PATCH 部分更新时省略 `models` 保留原值（PATCH 不视为违反必填）

### 2.2 MODEL_LIST_TIP 提示文案

**位置**：`provider-upsert.js` 第 3–4 行

| 变更前 | 变更后 |
| ------ | ------ |
| `'模型列表为可选项。「获取」将从上游拉取可用模型并回填到列表，未完成必要配置时按钮置灰。也可直接输入模型名称按回车添加，或点击「批量添加」粘贴多行/分隔的模型名（合并进现有列表，不覆盖）。'` | `'模型列表为必填项（至少 1 个元素）。「获取」将从上游拉取可用模型并回填到列表，未完成必要配置时按钮置灰。也可直接输入模型名称按回车添加，或点击「批量添加」粘贴多行/分隔的模型名（合并进现有列表，不覆盖）。'` |

变更：「可选」→「必填（至少 1 个元素）」

### 2.3 红色必填星号

**位置**：`provider-upsert.js` `renderModelListCard()` 函数，第 767–768 行

| 变更前 | 变更后 |
| ------ | ------ |
| `'模型列表' +` | `'<span style="color:#ed4014;margin-right:4px;">*</span>模型列表' +` |

在「模型列表」标签前添加红色 `*` 星号，颜色 `#ed4014`（与表单其他必填项星号一致），右侧留 4px 间距。

### 2.4 validate() 新增 models 校验

**位置**：`provider-upsert.js` `validate()` 函数，第 946–953 行（在 instance_pool 校验之前）

```javascript
var models = data.models || [];
if (!models.length) return '模型列表为必填项，请至少添加 1 个模型';
var modelSet = {};
for (var mi = 0; mi < models.length; mi++) {
  if (!models[mi] || String(models[mi]).trim() === '') return '模型名不能为空';
  if (modelSet[models[mi]]) return '模型名不能重复：' + models[mi];
  modelSet[models[mi]] = true;
}
```

新增三项校验：

1. 至少 1 个模型（`!models.length`）
2. 元素非空（`!models[mi] || String(models[mi]).trim() === ''`）
3. 元素不可重复（`modelSet` 去重检查）

> 校验位置在 `protocol_paths` 校验之后、`instance_pool` 校验之前，与接口文档 §3 校验规则顺序一致。

---

## 3. 修改 · 模型定价·列表分页

**文件**：`prototype-design/pages/model-prices.html`  
**对照接口**：`model-prices.md` §3.4

### 3.1 接口变更

| 参数 | 变更前 | 变更后 |
| ---- | ------ | ------ |
| `page_size` 默认值 | 20 | **50** |
| `page_size` 最大值 | 100 | **1000** |

> **注意**：`ivu-ui.js` 的 `pageTable()` 默认 `pageSizes` 保持 `[20, 30, 40, 50]` 不变。本页面通过 `options.pageSizes` 传入自定义选项，不影响其他页面。

### 3.2 pageSize 默认值

**位置**：`model-prices.html` 第 24 行

| 变更前 | 变更后 |
| ------ | ------ |
| `pageSize: 20,` | `pageSize: 50,` |

### 3.3 页面级 pageSizes 选项

**位置**：`model-prices.html` `pageTable()` 调用，第 105 行

新增 `pageSizes: [20, 50, 100, 200, 500, 1000]`，作为页面级分页选项传入 `IvuUI.pageTable()`，不修改组件默认值。

---

## 4. 变更文件清单

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `prototype-design/assets/js/provider-upsert.js` | 修改 | `models` 必填化：MODEL_LIST_TIP 文案更新、标签添加红色必填星号、validate() 新增 models 校验 |
| `prototype-design/pages/model-prices.html` | 修改 | `pageSize` 默认值 20→50，新增 `pageSizes` 页面级选项 |

---

## 5. 验收清单

### Provider · 模型列表

- [x] 「模型列表」标签左侧显示红色必填星号 `*`（颜色 `#ed4014`）
- [x] 提示文案显示「模型列表为必填项（至少 1 个元素）」
- [x] 创建/编辑时 models 为空，提交校验返回「模型列表为必填项，请至少添加 1 个模型」
- [x] 创建/编辑时 models 含空字符串，提交校验返回「模型名不能为空」
- [x] 创建/编辑时 models 含重复值，提交校验返回「模型名不能重复：xxx」
- [x] PATCH 编辑时不传 models 字段，保留原值不触发必填校验（原型中编辑模式 data 从现有 provider 填充，不会缺失 models）

### 模型定价 · 分页

- [x] 页面初始加载默认 `pageSize=50`
- [x] 分页下拉选项为 `[20, 50, 100, 200, 500, 1000]`
- [x] 切换分页大小后请求正确携带 `page_size` 参数

---

## 6. 关联文档

| 文档 | 说明 |
| ---- | ---- |
| `api-define/OpenAPI接口定义/providers.md` | `models` 字段必填化（§1、§2.1、§3.6） |
| `api-define/OpenAPI接口定义/model-prices.md` | `page_size` 默认 20→50、最大 100→1000（§3.4） |
| `prototype-design/pages/providers.html` | Provider 原型页面 |
| `prototype-design/pages/model-prices.html` | 模型定价原型页面 |
| `prototype-design/assets/js/provider-upsert.js` | Provider 创建/编辑表单逻辑 |
