# UI 代码变更文档

> **对照**：`openapi-doc-diff.md`、`prototype-ui-compare.md`  
> **接口**：`design-docs/api-define/OpenAPI接口定义/`  
> **原型**：`design-docs/prototype-design/assets/js/cluster-upsert.js`  
> **核对日期**：2026-08-01  
> **状态**：已实施（2026-08-01 与源码对齐）
>
> **文档维护**：2026-10-17 移除 4 处失效链接 `openapi-doc-diff.md`、`prototype-ui-compare.md`（两文件在 `ai-gateway-web` / `ai-gateway-api` 全仓及本工作区均不存在，从未提交），按纯文件名引用保留。

---

## 1. 变更优先级总览

| 优先级 | 变更点 | 影响模块 | 状态 | 备注 |
| -------- | -------- | ---------- | ------ | ------ |
| P0 | 表单与 API 统一使用 `name`/`addr`/`port`/`weight` | 集群 · 实例池 | 已修改 | 已删除 `normalizeInstance`，用 `toFormInstance` |
| P0 | `formatInstanceForApi` 统一提交 `{ addr, port, weight, name? }` | 集群 · 实例池 | 已修改 | 删除 hostname/ip 分离提交 |
| P0 | `getInstanceEndpointHosts` 改用 `addr:port` | 集群 · 大模型配置 | 已修改 | 影响模型列表接口 hosts |
| P1 | IP 模式校验：`addr`（IP 地址） | 集群 · 实例池 | 已修改 | 列名仍叫「IP地址」 |
| P1 | 实例列表端口列去掉 `Default：` 前缀 | 集群 · 实例池 | 已修改 | 直接绑定 `port` |
| P1 | 复查页表格绑定 `addr`/`port` | 集群 · 复查 | 已修改 | 列标题保持「IP地址」 |
| P1 | `basic.protocol` 默认 `https` | 集群 · 基本配置 | 已修改 | `index.vue`、`BaseConfig.vue` |
| P2 | 健康检查 host 帮助文案 | 集群 · 被动健康检查 | 已修改 | `cluster.healthCheckHostTip` |
| P2 | 移除 PascalCase 响应兼容 | 集群 · 实例池 | 已修改 | 无 `normalizeInstance` 旧字段映射 |
| P2 | 移除服务商域名模式权重字段 | 集群 · 实例池 | 已修改 | 域名模式权重固定 100，无需展示 |

---

## 2. P0：`instance_pool` API 字段迁移

### 2.1 内部表单模型（保持原型布局）

**原型参考**：`cluster-upsert.js` → `renderInstancePool()` — IP 模式三列（IP地址、端口、操作）；域名模式单行域名输入。

**接口参考**：`clusters.md` Instance — `addr` 必填，`port` 必填，`weight` 必填，`name` 选填。

**影响文件**：`src/modules/Clusters/components/InstancePool.vue`

**具体修改**

1. **IP 模式行对象**（`createEmptyInstance`、`handleAdd`）：

```javascript
{ addr: '', port: 80, weight: 100 }
```

1. **模板绑定**：`item.addr`、`item.port`；列标题 i18n `instancePool.ipAddress` 保持不变。

2. **数据转换**：删除 `normalizeInstance`；使用 `toFormInstance()` 仅读写 `name`/`addr`/`port`/`weight`，不做旧字段回退。

```javascript
{ addr: value, port: DOMAIN_PORT, weight: DOMAIN_WEIGHT }
```

1. **`detectInstanceMode`**：基于 `addr` 判断是否为域名（`isHostname(addr) && !isIP(addr)`）。

---

### 2.2 提交格式化

**影响文件**：`InstancePool.vue` — `formatInstanceForApi`、`formatInstancePoolForApi`

**改前逻辑**：域名模式提交 `{ hostname, ports, weight }`；IP 模式提交 `{ ip, ports, weight }`。

**改后逻辑**（统一，无 mode 分支）：

```javascript
export function formatInstanceForApi(instance) {
  const item = toFormInstance(instance);
  const payload = {
    addr: String(item.addr || '').trim(),
    port: parseInt(item.port, 10),
    weight: parseInt(item.weight, 10)
  };
  const name = String(item.name || '').trim();
  if (name) payload.name = name;
  return payload;
}
```

---

### 2.3 回显 `toFormInstance`

**不再使用** `normalizeInstance`；表单与 API 共用字段名：

```javascript
function toFormInstance(instance) {
  const item = instance || {};
  return {
    addr: item.addr != null ? String(item.addr) : '',
    port: item.port != null && item.port !== '' ? parseInt(item.port, 10) : 80,
    weight: item.weight != null && item.weight !== '' ? parseInt(item.weight, 10) : 100,
    name: item.name != null ? String(item.name) : ''
  };
}
```

`parseInstancePool()`、`applyInstancePoolData()`、`emitSubmitData()` 均通过 `toFormInstance` 转换，**不读取** `hostname`/`ip`/`ports` 旧字段。

---

### 2.4 大模型配置 hosts 来源

**原型参考**：`getInstanceIpStr()` — `ip:port` 多行文本。

**影响文件**：

- `InstancePool.vue` — `getInstanceEndpointHosts()`
- `GatewayConfig.vue` — 只读 IP 列表、`tools/get-models-from-provider` 的 `hosts`

**修改**：

```javascript
return list.map(instance => `${instance.addr}:${instance.port}`).filter(Boolean);
```

---

## 3. P1：校验与复查页

### 3.1 实例地址校验

**接口参考**：`addr` 类型 Hostname（RFC 1123 域名或 IPv4/IPv6）。

**影响文件**：`InstancePool.vue`

| 改前 | 改后 |
| ------ | ------ |
| `instanceIpRules` 校验 `ip`（IPAddress） | `instanceAddrRules` 校验 `addr`（`isHostname`） |
| 校验 prop `instances.N.ip` | `instances.N.addr` |
| IP 重复检测 `item.ip` | `item.addr` 重复检测 |

**权重校验**：保留现有「至少一个 weight > 0」「IP 模式总和 100」逻辑（API 要求 + UI 既有，原型无此列）。

---

### 3.2 端口列 UI 简化

**要求**：实例 IP 列表的端口列不再展示 `Default：` 前缀及端口名输入框（旧 BFE `ports` map 遗留），仅保留端口数值输入框，列标题仍为「端口」。

**改前模板**（节选）：

```html
<Input value="Default" disabled />：
<InputNumber v-model="item.ports.Default" />
```

**改后**：

```html
<FormItem :prop="'instances.' + ind + '.port'" ...>
  <InputNumber v-model="item.port" :min="1" :max="65535" />
</FormItem>
```

校验 prop 由 `instances.N.ports.Default` 改为 `instances.N.port`；`onInstancePortChange` 改为直接处理 `item.port`。

---

### 3.3 复查页实例表格

**原型参考**：`renderInstanceReviewTable()` — 列：IP地址、端口（无权重）。

**影响文件**：`Review.vue`

| 项目 | 修改 |
| ------ | ------ |
| `ipColumns[0].key` | `'ip'` → `'addr'`（title 保持 `$t('instancePool.ipAddress')`） |
| 端口列 render | `ports.Default` → 直接读 `row.port` |
| 域名模式 | `providerDomain` 改读 `instancePoolUsed[0].addr` |
| 权重列 | **保留**（UI 增强，原型无） |

---

### 3.4 `basic.protocol` 默认值

**接口参考**：创建集群 `basic.protocol` 默认 `https`。  
**原型参考**：默认 `http` — **以 API 为准**。

**影响文件**：

| 文件 | 修改 |
|------|------|
| `src/modules/Clusters/components/index.vue` | `BASIC_DEFAULTS.protocol: 'https'` |
| `src/modules/Clusters/components/BaseConfig.vue` | 初始 `protocol: 'https'` |

编辑回显仍用 API 返回值，不受影响。

---

## 4. P2：文案与清理

### 4.1 被动健康检查 host 提示

**接口参考**：host 为空时使用首个实例 `addr`。

**影响文件**：`PassiveHealthCheck.vue`、i18n

- 表单项下方增加 tip：`cluster.healthCheckHostTip`
- 中文：「留空时使用实例池首个实例的地址」

**原型**：无此说明；属 API 语义补充，不改变必填性。

---

### 4.2 旧字段清理

已删除 `normalizeInstance`；实例数据全流程仅使用 `name`/`addr`/`port`/`weight`。

### 4.3 移除服务商域名模式权重字段

**影响文件**：`InstancePool.vue`、`Review.vue`

**改前**：

- 实例配置页：服务商域名模式下展示 disabled 的权重输入框（固定值 100）
- 复查页：域名模式展示 `weight: 100` 行

**改后**：两处均移除域名模式权重展示；域名模式权重由 `buildDomainInstance` 内部固定为 100，提交时自动携带，无需 UI 展示。

---

## 5. 明确不改项

| 项 | 原因 |
| ---- | ------ |
| 实例形态 IP / 服务商域名 | 原型已定 |
| 权重列 | API 必填；UI 已实现 |
| 新增 `name` 输入列 | 原型无；API 选填，首版省略 |
| `llm_config` service_name/group | 2026-07-31 已删除 |
| `AIInstancePool/index.vue` | 独立模块，非 `/clusters` |

---

## 6. 字段映射速查（原型/UI → API）

| 用户可见（原型） | 表单字段（改后） | API 字段 |
| ------------------ | ------------------ | ---------- |
| IP地址 | `addr` | `addr` |
| 服务商域名 | `domainName` → 提交时写入 `addr` | `addr` |
| 端口 | `port` | `port` |
| 权重 | `weight` | `weight` |
| — | 不展示 | `name`（省略） |

---

## 7. 测试计划

### 7.1 实例池（对齐原型交互）

- [ ] IP 模式：添加多条实例，填 IP + 端口 + 权重，提交 payload 为 `{ addr, port, weight }`
- [ ] 域名模式：只填服务商域名，提交 `{ addr, port:443, weight:100 }`
- [ ] 复查页：IP 模式表格显示 addr、port、weight；域名模式显示域名
- [ ] 编辑回显：GET 响应 `name/addr/port/weight` 正确填充
- [ ] 大模型步骤：只读地址列表为 `addr:port` 格式；获取模型列表成功

### 7.2 基本配置

- [ ] 新建集群协议初始值为 `https`
- [ ] 编辑已有 `http` 集群回显不变

### 7.3 回归

- [ ] 六步向导全流程创建/编辑无报错
- [ ] 权重总和 100、addr 重复校验仍生效

---

## 8. 参考文档

| 文档 | 路径 |
| ------ | ------ |
| 接口差异 | `openapi-doc-diff.md` |
| 原型对比 | `prototype-ui-compare.md` |
| API 变更总结 | `ai-gateway-api/design-docs/modifications/2026-07-31-api-define-modification-and-bugfix/change-summary.md` |
| clusters 定义 | `design-docs/api-define/OpenAPI接口定义/clusters.md` |
| 上一轮已完成 | `design-docs/modifications/2026-07-31-ui-optimize/ui-code-changes.md` |
| Skill | `.cursor/skills/ui-optimize-doc/SKILL.md` |
