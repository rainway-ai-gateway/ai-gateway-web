# UI 代码变更文档

> **对照接口**：~~`alb-pool.md`~~（已删除）  
> **对照原型**：~~`prototype-design/pages/instance-pool-ai.html`~~（已删除）  
> **状态**：**原型已完成**（待生成 Vue UI 代码）

本文记录 2026-09-20 后端接口 `GET/PATCH /alb-pool` 删除驱动的 UI 变更。AI 网关实例池（全局 BFE 引擎池）功能被移除，不涉及应有的变更。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 状态 |
| ----------- | -------- | ---- |
| AIInstancePool 页面 | 整个模块删除（`src/modules/AIInstancePool/`） | ✅ 原型 |
| 路由注册 | 删除 `instance-pool-ai` 路由 | ✅ 原型 |
| i18n 词条 | 删除 `nav.BFEInstancePool`、`nav.AIGatewayInstancePoolManage`、`instancePool.*` 系列词条 | ✅ 原型 |
| 导航图标 | 删除 `AIGatewayInstancePool.list` 导航入口 | ✅ 原型 |
| 接口文档 | 删除 `api-define/OpenAPI接口定义/alb-pool.md` | ❌ API 侧完成 |

---

## 2. 修改 · AIInstancePool 页面模块删除

**文件**：~~`src/modules/AIInstancePool/index.vue`~~（待删除）  
**对照接口**：~~`alb-pool.md`~~（已删除）

### 2.1 接口变更

| 端点 | 方法 | 变更前 | 变更后 |
| ---- | ---- | ------ | ------ |
| `/alb-pool` | GET | 返回 alb_pool 配置（hostname/ip/port） | **已删除** |
| `/alb-pool` | PATCH | 全量更新 alb_pool 配置 | **已删除** |

### 2.2 页面组件删除

**位置**：`src/modules/AIInstancePool/index.vue`

删除整个模块目录：

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `src/modules/AIInstancePool/index.vue` | 删除 | 340+ 行的 AI 网关实例池管理页面，含查看/编辑模式切换、表格展示、行内编辑、校验逻辑、API 调用（getAlbPool / submitData） |

---

## 3. 修改 · 路由注册

**文件**：`src/router/router.js`  
**对照接口**：无（路由注册模块，不涉及接口）

### 3.1 路由变更

**位置**：`src/router/router.js` 第 62–69 行

| 变更前 | 变更后 |
| ------ | ------ |
| `{ path: '/instance-pool-ai', name: 'AIGatewayInstancePool.list', meta: {...}, component: ... }` | **已删除** |

```diff
-      {
-        path: '/instance-pool-ai',
-        name: 'AIGatewayInstancePool.list',
-        meta: {
-          title: 'AIGatewayInstancePool.list',
-          title_i18n: 'nav.AIGatewayInstancePoolManage',
-          permission: 'AIGatewayInstancePoolList',
-        },
-        component: () => import('@/modules/AIInstancePool/index.vue'),
-      },
```

---

## 4. 修改 · i18n 词条

**文件**：

- `src/i18n/zh.js`  
- `src/i18n/en.js`

### 4.1 中文词条删除

**位置**：`zh.js`

| 键 | 值 | 操作 |
| --- | -- | ---- |
| `nav.BFEInstancePool` | `AI网关实例池` | 删除 |
| `nav.AIGatewayInstancePoolManage` | `AI网关实例池` | 删除 |
| `instancePool.title` | `AI网关实例池` | 删除 |
| `instancePool.ipPlaceholder` | `IP/域名` | 删除 |
| `instancePool.portPlaceholder` | `端口` | 删除 |
| `instancePool.emptyText` | `暂无数据` | 删除 |
| `instancePool.edit` | `编辑` | 删除 |
| `instancePool.submit` | `提交` | 删除 |
| `instancePool.cancel` | `取消` | 删除 |
| `instancePool.hostnameRequired` | `请输入机器名` | 删除 |
| `instancePool.ipRequired` | `请输入IP/域名` | 删除 |
| `instancePool.portInvalid` | `端口错误` | 删除 |
| `instancePool.duplicateIpPort` | `IP和端口不能重复` | 删除 |
| `instancePool.submitSuccess` | `修改成功` | 删除 |

### 4.2 英文词条删除

**位置**：`en.js`

| 键 | 值 | 操作 |
| --- | -- | ---- |
| `nav.BFEInstancePool` | `BFE Instance Pool` | 删除 |
| `nav.AIGatewayInstancePoolManage` | `AI Gateway Instance Pool` | 删除 |
| `instancePool.title` | `AI Gateway Instance Pool` | 删除 |
| `instancePool.ipPlaceholder` | `IP/Domain` | 删除 |
| `instancePool.portPlaceholder` | `Port` | 删除 |
| `instancePool.emptyText` | `No data` | 删除 |
| `instancePool.edit` | `Edit` | 删除 |
| `instancePool.submit` | `Submit` | 删除 |
| `instancePool.cancel` | `Cancel` | 删除 |
| `instancePool.hostnameRequired` | `Hostname is required` | 删除 |
| `instancePool.ipRequired` | `IP/Domain is required` | 删除 |
| `instancePool.portInvalid` | `Invalid port` | 删除 |
| `instancePool.duplicateIpPort` | `Duplicate IP and port` | 删除 |
| `instancePool.submitSuccess` | `Update successful` | 删除 |

---

## 5. 修改 · 导航图标

**文件**：`src/layout/sidebar/navItem.vue`

### 5.1 导航入口删除

**位置**：`navItem.vue` 第 60–61 行

| 变更前 | 变更后 |
| ------ | ------ |
| `'AIGatewayInstancePool.list': 'icon-instancePool'` | **已删除** |
| `'AIGatewayInstancePoolManage'` 图标条目 | **已删除** |

---

## 6. 变更文件清单

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `src/modules/AIInstancePool/index.vue` | **删除** | AI 网关实例池页面（340+ 行） |
| `src/router/router.js` | 修改 | 删除 `instance-pool-ai` 路由配置 |
| `src/i18n/zh.js` | 修改 | 删除 `nav.BFEInstancePool`、`nav.AIGatewayInstancePoolManage`、`instancePool.*` 词条 |
| `src/i18n/en.js` | 修改 | 删除对应英文词条 |
| `src/layout/sidebar/navItem.vue` | 修改 | 删除 `AIGatewayInstancePool.list` 导航图标条目 |
| `design-docs/prototype-design/pages/instance-pool-ai.html` | **删除** | 原型页面 |
| `design-docs/prototype-design/assets/js/layout.js` | 修改 | 移除导航栏入口 |
| `design-docs/prototype-design/index.html` | 修改 | 移除入口链接 |
| `design-docs/prototype-design/assets/js/mock-data.js` | 修改 | 移除 `gatewayInstances` 数据 |
| `design-docs/prototype-design/assets/static/css/instance-pool-ai.css` | **删除** | 原型静态 CSS |
| `design-docs/prototype-design/assets/static/js/instance-pool-ai.b1502df3a5428f7c1145.min.js` | **删除** | 原型静态 JS |
| `design-docs/api-define/OpenAPI接口定义/alb-pool.md` | **删除** | 接口文档（API 侧已同步） |

---

## 7. Bug 修复 · 协议路径映射（`protocol_paths`）

### 7.1 删除所有 `protocol_paths` 时提交无效

**Issue**：[#106](https://github.com/rainway-ai-gateway/ai-gateway-web/issues/106)

**根因**：`buildPayload()` 中仅当 `Object.keys(protocolPaths).length > 0` 时才将 `protocol_paths` 写入 payload。当用户清空所有映射后 `protocolPaths` 为 `{}`，该字段被跳过，API 因字段缺失而保留原值。

**修复**：`ProviderUpsert.vue` 的 `buildPayload` 方法中移除条件判断，始终将 `protocol_paths` 写入 payload，空对象 `{}` 即表示清空。

| 项 | 变更前 | 变更后 |
| -- | ------ | ------ |
| `buildPayload` | `if (Object.keys(protocolPaths).length) { payload.protocol_paths = protocolPaths; }` | `payload.protocol_paths = protocolPaths;`（始终写入） |

**涉及文件**：

| 文件 | 说明 |
| ---- | ---- |
| `src/modules/Providers/components/ProviderUpsert.vue` (L892) | `buildPayload` 移除条件判断 |

### 7.2 Provider 详情页未展示 `protocol_paths`

**Issue**：[#107](https://github.com/rainway-ai-gateway/ai-gateway-web/issues/107)

**根因**：`ProviderView.vue` 组件模板中缺少协议路径映射卡片，且未实现将 `map[string]string` 转为列表的计算属性。

**修复**：`ProviderView.vue` 中新增 `protocolPaths` 计算属性（将 `protocol_paths` 对象转为 `[{protocol, path}]` 数组），并在"模型服务配置"卡片与"服务鉴权 Keys"卡片之间插入「协议路径映射」卡片，样式与"服务鉴权 Keys"一致（有数据时表格展示，无数据时显示 `-`）。

| 项 | 变更前 | 变更后 |
| -- | ------ | ------ |
| 模板 | 无协议路径映射卡片 | 在"模型服务配置"卡片后新增协议路径映射卡片，`v-if` 在 table 上，`v-else` 显示 `-` |
| 计算属性 | 无 `protocolPaths` | 新增 `protocolPaths()` 将 `map[string]string` 转为 `[{protocol, path}]` 数组 |

**涉及文件**：

| 文件 | 说明 |
| ---- | ---- |
| `src/modules/Providers/components/ProviderView.vue` (L75-91) | 新增协议路径映射卡片模板 |
| `src/modules/Providers/components/ProviderView.vue` (L200-206) | 新增 `protocolPaths` 计算属性 |

---

## 8. 验收清单

### 路由

- [ ] 访问 `/instance-pool-ai` 路由返回 404/空白（而非加载旧页面）
- [ ] 其他路由不受影响（providers、clusters、model-prices 等正常跳转）

### 导航

- [ ] 侧边栏资源管理下不再显示「AI网关实例池」菜单项
- [ ] 资源管理下其他菜单项（模型服务商、AI业务集群、模型定价）正常显示

### i18n

- [ ] 中文界面无残留 `nav.BFEInstancePool`、`nav.AIGatewayInstancePoolManage`、`instancePool` 词条
- [ ] 英文界面无残留对应英文词条
- [ ] 语言切换正常，无 i18n 缺失错误

### 接口依赖

- [ ] 前端不再调用 `GET /alb-pool` 接口
- [ ] 前端不再调用 `PATCH /alb-pool` 接口
- [ ] 服务商 `instance_pool` 字段不受影响（功能独立，仅删除全局 BFE 引擎池）

### 构建

- [ ] `npm run lint` 无报错
- [ ] 构建产物无 AIInstancePool 相关 chunk

---

## 9. 注意事项

1. **概念区分**：仅删除「AI 网关实例池」（全局 BFE 引擎池），不影响「服务商实例池」（provider 的 `instance_pool` 字段）。两者是独立功能。
2. **软关联**：`bfeClusters` 等引用仅涉及 AI 网关实例池的字段，不影响 `provider.instance_pool`。
3. **仅删除前端页面**：`api-define/alb-pool.md` 已在阶段 1 同步时删除；API 侧删除端点已在阶段 1 编译部署完成。

---

## 10. 关联文档

| 文档 | 说明 |
| ---- | ---- |
| `api-define/OpenAPI接口定义/alb-pool.md` | **已删除**，`GET/PATCH /alb-pool` 端点已移除 |
| `prototype-design/pages/instance-pool-ai.html` | **已删除**，原型页面 |
| `prototype-design/assets/js/layout.js` | 导航入口已移除 |
| `prototype-design/assets/js/mock-data.js` | `gatewayInstances` 数据已移除 |
| `modifications/2026-09-20-remove-alb-pool/api-changes.md` | API 侧变更记录（`ai-gateway-api` 仓库） |
