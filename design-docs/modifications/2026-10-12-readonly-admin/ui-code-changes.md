# UI 代码变更：只读管理员（role 取代 is_admin + 全站写按钮隐藏 + 密钥脱敏展示）

> **日期**: 2026-10-12 ｜ **前置**: [2026-10-11 密钥收敛 GET 列表端点](../2026-10-11-reencrypt-sweeps-list-endpoint/ui-code-changes.md) ｜ **上游依据**: api-define diff（`auth.md` / `api-keys.md` / `providers.md`）+ 后端只读管理员设计（`2026-10-12-readonly-admin`）
> **对照接口**: `auth.md`、`api-keys.md`、`providers.md` ｜ **对照原型**: `prototype-design/login.html`、`pages/user.html`、全站列表页，`assets/js/{prototype,user-upsert,api-key-upsert,entity-upsert}.js`
> **状态**: 原型 ✅ · UI 代码 ⬜ · 02 文档 ⬜ · 测试 ⬜ · 手册 ⬜ ｜ **菜单/路由变更**: 无（只读角色复用 admin 菜单，仅 nav key 由 `admin_readonly` 派生）

本次引入「系统管理员（只读）」角色：后端以 `role` 枚举取代 `is_admin`（新增 `system_admin_readonly`）、新增 `PATCH /auth/users/{user_name}/role` 端点、Token scope 增 `SystemReadonly`、6 个密钥读端点按角色脱敏。前端据此改造登录态（存 `role`）、守卫、用户管理页（角色列 + 变更角色抽屉），并**按用户要求把只读视角的写操作按钮在全站所有页面隐藏**（覆盖后端设计中「仅示范页隐藏、其余页面二期」的原约定），只保留只读查看能力。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 全站列表/编辑页（22 页） | 只读视角隐藏**所有写操作按钮**（创建/编辑/删除/触发/进入编辑模式/提交等），仅保留只读按钮（详情/查看） | ✅ 原型 · ⬜ UI |
| 登录 + 守卫 + store | 登录态由 `is_admin` 改存 `role`；新增 `isReadonly()` 判定；守卫按 `role` 放行 | ✅ 原型 · ⬜ UI |
| 用户管理 | 「角色」列由 bool 改 `role`（系统管理员 / 系统管理员（只读））+ 角色筛选；新增「变更角色」抽屉（内置 `admin` 固定保护） | ✅ 原型 · ⬜ UI |
| 创建用户 | 角色由「固定勾选系统管理员」改为**单选**（系统管理员 / 系统管理员（只读）），必填 | ✅ 原型 · ⬜ UI |
| Token | scope 选项增 `SystemReadonly`（系统管理（只读））；只读视角 token 操作列仅保留「详情」 | ✅ 原型 · ⬜ UI |
| API-Key / Entity 详情 | 只读视角隐藏详情抽屉内「重置配额」按钮 | ✅ 原型 · ⬜ UI |
| 密钥展示 | 只读视角下 `api-keys.key` / `providers.keys[].key` / `tokens.token` 由后端返回掩码值，前端原样展示（无需新增脱敏逻辑） | ✅ 原型 · ⬜ UI |

> 本次**无新增菜单 / 无路由变更**：只读角色的菜单与 admin 一致（`nav_tree.toml` 查询节点 `allowed_roles` 追加只读角色 key），页面可读、写能力由后端 403 强制。

---

## 2. 接口变更（diff）

### 2.1 `auth.md`

| 位置 | 变更前 | 变更后 |
| ---- | ---- | ---- |
| 用户对象 / 各响应 | `is_admin`（bool） | `role`（string，`system_admin` / `system_admin_readonly`） |
| `POST /auth/users` Body | `is_admin`（bool，固定 `true`） | `role`（string，**必填**，枚举 `system_admin` / `system_admin_readonly`） |
| `PATCH /auth/users/{user_name}/is_admin` | 端点存在，Body `is_admin` | **端点改为 `/auth/users/{user_name}/role`**，Body `role`（枚举）；**内置账号 `admin`（大小写不敏感）role 固定 `system_admin`，降级请求 422**；旧 `is_admin` 端点废弃（404） |
| 登录响应（`POST /auth/session-keys`） | `is_admin`（bool） | `role`（string）；`session_key` 仅返回**本人** |
| 用户列表/详情 | `is_admin`；可能含 `session_key` | `role`；**不含 `session_key`**（固化为契约） |
| Token `scope` | `System` / `Support` | 增 `SystemReadonly`（全部只读档）；Token 详情/列表 `token` 字段：只读视角返回掩码值 |
| `POST /auth/tokens` Body `scope` | 枚举 `System` / `Support` | 枚举 `System` / `SystemReadonly` / `Support` |

### 2.2 `api-keys.md`

| 位置 | 变更前 | 变更后 |
| ---- | ---- | ---- |
| `GET /api-keys`、`GET /api-keys/{id}` 响应 `key` | 恒明文 | **角色可见性**：系统管理员明文；系统管理员（只读）返回掩码值（长度>8：前4+`********`+后4；4<长度≤8：前2+`****`+后2；长度≤4：全掩码），掩码值不可用于鉴权 |

### 2.3 `providers.md`

| 位置 | 变更前 | 变更后 |
| ---- | ---- | ---- |
| `GET /providers`、`GET /providers/{name}` 响应 `keys[].key` | 恒明文 | **角色可见性**同 api-keys：只读视角返回掩码值 |

> 脱敏由后端完成（`lib/xmask`），前端只消费返回值；`GET /auth/tokens` / `GET /auth/tokens/{token_name}` 同理。

---

## 3. 原型变更（已完成，已 Review）

### 3.1 只读视角基础设施

| 文件 | 变更点 |
| ---- | ---- |
| `assets/js/prototype.js` | 新增 `isReadonly()`：读登录态 `role`，`system_admin_readonly` 为只读；与 `src/store.js` 语义一致，**不做 `is_admin` 回退** |
| `login.html` | 用户名 input 加 `id="login-username"`；新增提示「用户名填 `viewer` 以系统管理员（只读）登录」；登录脚本由固定 `admin` 改为按输入判定 `role`（`viewer`→只读，其余→`system_admin`） |
| `assets/css/prototype-overrides.css` | 新增 `.bfe-login .login-role-tip` 提示样式 |
| `assets/js/mock-data.js` | `users` 由 `is_admin`（bool）改为 `role`：`admin/operator→system_admin`、`viewer→system_admin_readonly` |

### 3.2 用户管理

| 文件 | 变更点 |
| ---- | ---- |
| `assets/js/user-upsert.js` | `roleLabel` 改按 `role`（增「系统管理员（只读）」）；新增 `roleRadios`（角色单选）；`scopeLabel`/`scopeRadios` 增 `SystemReadonly`；`adminCheckbox` 替换为 `roleChangeBody`（内置 admin 显示「角色固定不可变更」，普通显示角色单选）；`createUserBody` 角色项改单选且必填；drawer footer 新增「变更角色」提交/取消 |
| `pages/user.html` | 工具栏「添加用户」「令牌创建」按 `isReadonly` 隐藏；用户列表角色列 key 改 `role`、角色筛选改 `system_admin`/`system_admin_readonly`、操作列宽 220→280 且只读隐藏、新增「变更角色」按钮与抽屉分支（内置 admin 拦截）；token scope 筛选增 `SystemReadonly`、只读视角 token 操作列仅留「详情」；按钮绑定加判空守卫 |

### 3.3 API-Key / Entity 详情「重置配额」隐藏

| 文件 | 变更点 |
| ---- | ---- |
| `assets/js/api-key-upsert.js` | 详情抽屉「重置配额」按钮外层包 `Prototype.isReadonly() ? '' : (...)` |
| `assets/js/entity-upsert.js` | 详情抽屉「重置配额」同上 |

### 3.4 全站列表/编辑页写按钮隐藏（统一模式）

统一模式：`var isReadonly = Prototype.isReadonly();` → 工具栏写按钮 `(isReadonly ? '' : IvuUI.btn(...))` → 操作列 `if (isReadonly) return <只读按钮>;` → 事件绑定 `var el = document.getElementById(...); if (el) el.addEventListener(...)`。

| 页面 | 只读视角保留 | 隐藏的写操作 |
| ---- | ---- | ---- |
| `pages/api-key.html` | 管理路由规则 | 创建 / 编辑 / 删除 |
| `pages/providers.html` | 详情 / 查询模型价格 | 添加服务商 / 分段计价配置 / 编辑 / 删除 |
| `pages/entity.html` | 管理路由规则 | 创建Entity / 创建类型 / 编辑 / 删除 / 类型编辑删除 |
| `pages/ai-cache.html` | 查看 | 添加规则 / 进入(退出)编辑 / 保存 |
| `pages/ai-context.html` | 查看 | 添加规则 / 进入(退出)编辑 / 保存 |
| `pages/traffic-mirror.html` | 查看 | 添加规则 / 进入(退出)编辑 / 提交并生效 |
| `pages/route.html` | 查看 | 添加规则 / 进入(退出)编辑 / 提交并生效 |
| `pages/route-tables.html` | 查看 | （仅保留查看） |
| `pages/intent-config.html` | 查看 | 添加问题 / 进入(退出)编辑 / 保存并发布 |
| `pages/epp.html` | （仅查看） | 编辑池 / 覆写编辑 / 确认 |
| `pages/cluster-list.html` | 详情 | 添加集群 |
| `pages/cluster-wizard.html` | 下一步 / 取消 | 提交 |
| `pages/model-prices.html` | 详情 | 新增定价 / YAML 导入 |
| `pages/batches.html` | 详情 | （取消任务等写操作，仅保留详情） |
| `pages/security.html` | （列表/详情） | 触发任务 |
| `pages/user.html` | 详情 / 查看 | 见 §3.2 |

> 无需改动（无写按钮）：`operation-logs.html`、`report.html`、`404.html`、`route-ai.html`、`route-default.html`、`home.html`。

---

## 4. UI 代码变更（`src/`，已实施，待 Review）

> 只读视角写按钮隐藏统一采用**全局自定义指令 `v-has`**：只读登录态下指令给元素加 `.v-has-hidden` 类（`display:none !important`）；模板挂 `v-has`，render 操作列用 `directives: [{ name: 'has' }]`。不使用 Vuex mixin。

| 文件 | 变更点 | 验收要点 |
| ---- | ---- | ---- |
| `src/utils/authorize.js` | 第 61 行 `if (!userData.is_admin)` 改为按 `role` 判定：`system_admin`/`system_admin_readonly` 放行，其余 `illegalAccess`；**不做 `is_admin` 回退** | 只读账号可进入全站；非法 role 拦截 |
| `src/utils/store.js` | `setUserData` 由存 `is_admin` 改为存 `role`；`getNavRoot` 的 nav key 由固定 `admin` 改为按 `role` 映射（`system_admin→admin`、`system_admin_readonly→admin_readonly`）；新增 `isReadonly()` getter | 只读账号导航与 admin 一致；`isReadonly()` 供指令 `v-has` 复用 |
| `src/utils/directive.js` | 新增全局指令 `has`：`inserted`/`update` 钩子按 `store.isReadonly()` 增删 `.v-has-hidden` 类；导出 `{ preventReClick, has }` | 只读视角挂 `v-has` 的元素隐藏、非只读显示 |
| `src/assets/css/global.less` | 追加 `.v-has-hidden { display:none !important; }`（`!important` 稳定压过 `v-show` 写入的内联 `display`） | 与 `v-show` 共存不冲突 |
| `src/main.js` | 引入 `./utils/directive`（早于 `new Vue`）；**不使用 mixin** | 指令全局可用 |
| `src/modules/User/components/User.vue` | 角色列 key `is_admin`→`role`、渲染改 `roleLabel`；角色筛选改两个枚举；操作列按 `v-has` 隐藏「变更角色/修改密码/删除」，新增「变更角色」入口 | 角色列/筛选正确；只读视角操作列仅剩只读按钮 |
| `src/modules/User/components/CreateUser.vue` | 第 61-62 行 `is_admin` 禁用勾选改为角色**单选**（系统管理员 / 系统管理员（只读））；第 139 行默认值 `is_admin:true`→`role:'system_admin'`；提交体 `is_admin`→`role` | 请求体只含 `role`；必填校验 |
| `src/modules/User/components/CreateToken.vue`（及 `Token.vue` scope 展示） | scope 单选增 `SystemReadonly`（系统管理（只读）） | 创建 Token 可选三档 scope；列表展示正确 |
| `src/modules/*/index.vue`、`*/components/*.vue`（21 个模板文件） | 写操作按钮/容器由 `v-if="!isReadonly"` 改挂 `v-has`；`v-if`+`v-show` 组合保留 `v-show` 再加 `v-has`；`<template>` 不能挂指令处将 `v-has` 下移到内部真实元素或上移到外层容器（IntentConfig 上移至 `.ic-actions`） | 只读视角逐页核对无写按钮残留 |
| 16 个 render 操作列（APIKey / Entity / User / Token / Clusters / Cert / Providers / RouteTable / RouteRules / EppPool.Assignments / IntentConfig / AICache / AIContext / TrafficMirror / BatchTasks） | 写按钮加 `directives: [{ name: 'has' }]`；显示分支由 `isReadonly \|\| mode === 'view'` 收敛为 `mode === 'view'`（只读恒停留 view 模式，保留只读「查看」入口） | 只读视角操作列仅剩只读按钮 |
| `src/modules/APIKey/components/*`、`src/modules/Entity/components/*` | 详情抽屉「重置配额」按钮挂 `v-has` | 只读视角详情无「重置配额」 |
| `src/i18n/zh.js` / `en.js` | 新增 `com.sysAdminReadonly`（系统管理员（只读））等角色/ scope 文案 | 无缺失 key 告警 |
| `conf/nav_tree.toml`（`ai-gateway-api` 仓） | 查询类节点 `allowed_roles` 由 `["admin"]` 追加只读角色 key（api conf 已为 `["admin","admin_readonly"]`） | 只读角色菜单非空 |

---

## 5. 下游影响（阶段 3/4/5 输入）

- **02 文档**：用户管理（角色列/筛选、变更角色抽屉、内置 admin 保护）、创建用户角色单选、Token scope 三档、全站只读视角按钮隐藏、api-key/entity 详情重置配额隐藏、密钥脱敏展示——需新增/改写对应用例。
- **测试**：只读账号登录后逐页断言写按钮不可见、只读按钮可见；变更角色成功/内置 admin 422；密钥读端点掩码；admin 视角回归明文。
- **用户手册**：用户与权限章节（角色说明、只读角色用法）；密钥展示章节（只读掩码说明）；各列表页截图（只读视角）。
- **部署前置**：`ai-gateway-runtime/conf/nav_tree.toml` 需同步补 `admin_readonly`（否则正式环境只读角色菜单为空）；前后端**必须同发**（`is_admin` 废弃，禁止单独升级后端）。

---

## 6. 验收与偏差记录

**偏差（用户确认覆盖后端设计约定）**

1. 后端 `design-changes.md` §6 原定「核心列表页（APIKey、Provider）示范隐藏，**其余页面全量隐藏二期**」；本次用户明确要求**全站所有页面隐藏写操作**，故 22 个页面一并改造，二期约定作废。
2. 后端 §6 未列「重置配额」按钮；本次用户补充要求 API-Key / Entity 详情抽屉的「重置配额」在只读视角隐藏，已一并实现。

**本会话附带修复（非本次需求）**

- `assets/js/entity-upsert.js` `renderUpsertBody` 内 `batchLimits` 未声明导致 `entity.html` 整页空白，补声明（与 `api-key-upsert.js` 同款）——属预存在缺陷，随本次改动一并修复。

**补漏（2026-10-13，UI 代码 Review 阶段发现）**

1. §4「16 个 render 操作列」清单**遗漏「模型定价」**（`src/modules/ModelPrices/index.vue`）：该页操作列在 render 函数内无条件渲染「详情/编辑/删除」，只读视角下写按钮会残留——`v-has` 指令只能挂模板元素，render 函数内代码需改为按 `store.isReadonly()` 条件渲染。
2. 已修复：render 内按 `store.isReadonly()` 判定，只读视角仅渲染「详情」按钮（与全站只读模式收敛一致：`mode === 'view'` 只保留只读入口）。`store.isReadonly()` 读取 `Vue.observable` 的 `state.user`，角色变化可触发重渲染，无按钮残留。