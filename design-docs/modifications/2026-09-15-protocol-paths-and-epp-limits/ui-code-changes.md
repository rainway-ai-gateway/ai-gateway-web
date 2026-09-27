# UI 代码变更文档

> **对照接口**：`providers.md` §1（`protocol_paths` 字段）、`epp-pool.md` §1（实例数限制 1–2、池内全局唯一约束）
> **对照原型**：`provider-upsert.js`（服务商表单 · 协议路径映射）、`epp.html`（EPP 实例池表格）

---

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 状态 |
| ----------- | -------- | ---- |
| 服务商 · 协议路径映射 | 新增 `protocol_paths` 字段表单编辑、详情展示、校验与事件绑定 | 已完成 |
| 服务商 · Mock 数据 | deepseek 增加 `protocol_paths` 示例 | 已完成 |
| EPP 实例池 · 实例数校验 | 每组实例数限制 1–2（拒绝空组与 3+ 实例） | 已完成 |
| EPP 实例池 · ID/地址唯一性 | 实例 ID 池内全局唯一；(host, port) 组合池内全局唯一 | 已完成 |
| EPP 实例池 · 组名校验 | 组名非空、池内唯一 | 已完成 |

---

## 2. 服务商 · 协议路径映射（`protocol_paths`）

**原型**：`provider-upsert.js` 新增 `renderProtocolPaths` 渲染函数、`isValidProtocolPath` 校验函数；`syncFromDom` 中读取行内协议 select + 路径 input 同步到 data；`validate` 中校验路径格式与协议归属；`mount` / `bindEvents` 中添加/删除路径行事件绑定。`mock-data.js` 中 deepseek 添加 `protocol_paths: { openai: '/v1' }` 示例。

**对照接口**：`providers.md` §1 — `protocol_paths` 为 `map[string]string`，键为协议名，值为以 `/` 开头的上游路径前缀；`model_protocols` 必须包含所用键。

**变更**：

| 项 | 变更前 | 变更后 |
| -- | ------ | ------ |
| 表单渲染 | 无 `protocol_paths` 区域 | 在"模型服务配置"卡片后插入「协议路径映射」卡片 |
| 详情展示 | 无 `protocol_paths` 区域 | 在"模型服务配置"卡片后插入只读「协议路径映射」卡片 |
| 添加路径 | — | 点击 "+ 添加映射" 在表格中新增行，行内 select 选择协议 + input 输入路径 |
| 删除路径 | — | 点击行内"删除"按钮移除该映射 |
| 数据同步 | — | `syncFromDom` 遍历 `#proto-paths-body tr` 读取各行的 select + input |
| 校验 | — | 路径须以 `/` 开头、不以 `/` 结尾、不含 `?` `$` `#` `..`；键必须在 `model_protocols` 中 |

**涉及文件**：

| 文件 | 说明 |
| ---- | ---- |
| `src/modules/Providers/components/ProviderUpsert.vue` | 表单 render 增加 protocol_paths 卡片；详情 render 增加 protocol_paths 卡片；syncFromDom 增加路径映射同步；validate 增加路径校验；bindEvents 增加添加/删除事件 |
| `src/modules/Providers/mock-data.js`（如存在） | deepseek 示例数据增加 `protocol_paths` |

---

## 3. EPP 实例池 · 实例数与唯一性约束

**原型**：`epp.html` 中 `bindPoolEditEvents` 保存校验逻辑新增组名、实例数 1–2、ID 全局唯一、(host,port) 全局唯一、端口范围校验；实例数列显示 `N / 2` 上限；添加实例按钮在组内实例 ≥ 2 时禁用并显示提示。

**对照接口**：`epp-pool.md` §1 — 每组实例数 1 个（仅主）或 2 个（主+备）；拒绝空组与 3+ 实例；实例 ID 池内全局唯一；(host, port) 池内全局唯一；组名非空、池内唯一。

**变更**：

| 项 | 变更前 | 变更后 |
| -- | ------ | ------ |
| 保存校验 | 仅校验 `groups.length > 0` | 完整校验：组名非空唯一、实例数 1–2、ID 非空且池内唯一、host 非空、port 1–65535、(host,port) 池内唯一 |
| 实例数列 | 显示实例数 `N` | 显示 `N / 2` 直观上限 |
| 添加实例按钮 | 始终可用 | 组内 ≥ 2 实例时禁用，右侧灰色提示"每组最多 2 个（主+备）" |
| 实例重复提示 | 无 | 保存时 toast 提示具体冲突项 |

**涉及文件**：

| 文件 | 说明 |
| ---- | ---- |
| `src/modules/EppPool/components/Pool.vue` | 保存校验（组名非空唯一、实例数 1–2、ID 唯一、host/port 唯一）；实例数列显示 `N / 2`；添加实例按钮上限禁用并提示 |

---

## 5. 验收清单

- [ ] 服务商新建/编辑表单，模型服务配置卡片后出现「协议路径映射」卡片
- [ ] 点击 "+ 添加映射"，新增一行包含协议下拉 + 路径输入 + 删除按钮
- [ ] 输入非法路径（不以 `/` 开头、含 `?` 等）保存时提示错误
- [ ] 映射键未在 `model_protocols` 中选择时保存提示错误
- [ ] 服务商详情页「协议路径映射」卡片只读展示
- [ ] EPP 实例池编辑模式保存时，组名为空/重复、实例数 < 1 / > 2 均提示错误
- [ ] EPP 实例池编辑模式保存时，实例 ID / (host,port) 池内重复提示错误
- [ ] EPP 实例池实例数列显示 `N / 2`
- [ ] EPP 实例池组内实例 ≥ 2 时添加实例按钮禁用
- [ ] `npm run lint` 通过
