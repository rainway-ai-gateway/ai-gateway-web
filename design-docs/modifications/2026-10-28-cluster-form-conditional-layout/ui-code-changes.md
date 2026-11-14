# UI 代码变更：大模型配置两列表单改 flex 自适应网格(条件项自动补位)

> **日期**: 2026-10-28 ｜ **前置**: [2026-10-28-cluster-affinity-off-hide-fields](../2026-10-28-cluster-affinity-off-hide-fields/ui-code-changes.md) ｜ **上游依据**: 无接口变更(纯布局)
> **对照接口**: 无 ｜ **对照原型**: 无(原型大模型配置为单列堆叠,无两列布局,本次仅改代码)
> **状态**: 原型 ✅(无需变更) · UI 代码 ✅(lint 通过,待 review) · 02 文档 ✅(02b 排布说明 + 新增 RM-BC-123) · 测试 ⬜ · 手册 ⬜ ｜ **菜单/路由变更**: 无

集群向导「大模型配置」各卡原为 `Row(12+12)` 固定两列:条件隐藏的表单项会在同行另一侧留空白块,落单项 span 24 独占整行也不美观。本次改为 **flex 自适应两列网格**:每个表单项是固定 50% 宽格子,`v-if` 不渲染时后续项**自动顶上来补位**——任何条件组合下既无空白块,也无拉伸式孤行。该方案替代了同日的 span 动态宽/独占行方案(更优,一并作废)。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点(一句话) | 状态 |
| ----------- | -------- | ---- |
| 集群向导 › 大模型配置(6 个卡) | `Row/Col` 固定两列 → `.llm-form-grid` flex 流式两列,条件项隐藏自动补位 | 代码 ✅ |

## 2. 接口变更(diff)

无。

## 3. 原型变更

无(原型为单列纵向堆叠,不存在该问题)。

## 4. UI 代码变更(2026-10-28 已实现,`npm run lint` 通过)

### 4.1 布局模式(后续新增表单遵循)

```html
<div class="llm-form-grid">
  <div class="llm-form-grid-item">...FormItem(恒显)...</div>
  <div v-if="条件" class="llm-form-grid-item">...FormItem(条件)...</div>
</div>
```

```less
.llm-form-grid { display: flex; flex-wrap: wrap; }
.llm-form-grid-item { box-sizing: border-box; width: 50%; padding-right: 24px; }
```

- 同条件项各自带 `v-if`,不包外层 `<template>`/`<Row>`
- iView `Form`/`FormItem` 的校验注册经 Vue provide/inject,中间 `div` 不影响

### 4.2 `src/modules/Clusters/components/GatewayConfig.vue`

| 区块 | 改动 |
| ---- | ---- |
| key_policy | 3 个 Row(含 span24+span12 超宽换行)→ 1 网格 4 格:策略 / 最大重试次数 / 初始退避 / 最大退避 |
| key_affinity | 启用(恒显)+ redis_prefix / ttl / penalty(均 v-if 启用)→ 1 网格;关闭时仅剩启用一格,开启时四项两两成排 |
| normalize_upstream_error | enabled(恒显)/ stream_enabled / redact_secrets(恒显)/ unrecognized_action / max_body_bytes(v-if enabled)→ 1 网格;启用后两项自动补到第二行 |
| EPP(承接上一变更) | 负载画像 / 亲和强度(恒显)、前缀缓存亲和性 / 会话亲和性(v-if affinity≠off)、KV 缓存利用率、会话亲和 Header(v-if showSessionAffinityHeader)、排队长度过滤 / 在飞请求过滤、无端点回退 / 指标失效剔除 —— **10 个字段进同一网格**(原来分属 4 个独立 Row);`affinity=off` + 会话亲和关时,首行仍为「负载画像 \| 亲和强度」,**「KV 缓存利用率上限」补位到第二行与「排队长度过滤阈值」同行**,后续字段依次顺延,无空白块 |
| epp_runtime | 4 个 Row(check.disabled 原 span24 孤行)→ 1 网格 7 格,check.disabled 与 check_interval 成排 |
| 样式 | 新增 `.llm-form-grid` / `.llm-form-grid-item` scoped 样式 |

未改动:flow_control 两个 Row(均为恒显成对,无洞)、顶部大模型配置(纵向堆叠)、key_affinity 帮助提示等既有交互。

### 4.3 验收

- `npm run lint` 通过;
- 走查:key_affinity 启停、normalize 启停、EPP affinity off/low 切换、会话亲和开关,任意组合下两列自动补齐,无空白块、无整行拉伸。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| business-cluster 大模型配置按列位置/行号定位控件的用例 | 微调 | 纯布局变更,字段/文案/校验不变;key_policy 顺序未变,key_affinity/normalize/EPP 的条件项位置随显隐流动,阶段 4 若有用例按绝对行位断言需改为按字段名定位 |
| **新增 RM-BC-123;既有用例按字段名定位,无行位断言改动** | 新增 | 2026-10-28 已落文档:`docs/business-cluster/02-功能测试用例/02d-大模型与校验.md` §2.110(锚点 `#2110-大模型配置条件项隐藏后自动补位无空白块`)新增 **RM-BC-123**,断言 EPP 网格在 `affinity=off` + 会话亲和关时隐藏项不占格位、「KV 缓存利用率上限」紧接「亲和强度」成为下一个可见项、无空白块/整行拉伸,切换 affinity 与会话亲和后字段依次补位。`test_09_business_cluster_balance_mode.spec.js` 中既有 RM-BC-93~109 均按字段名/`prop` 定位,无绝对行位断言,本次布局变更不需改写 |

## 6. 下游影响(阶段 3/4/5 输入)

- 02 文档:02b 字段表可补一句「条件隐藏时同网格自动补位」;非强制。
- 测试:阶段 4 跑 business-cluster 用例时关注布局相关断言;建议 `npm run impact-scan -- 大模型配置 key_affinity epp_runtime`。
- 用户手册:`docs/zh-cn/03-ai-business-cluster.md` 大模型配置截图如拍到旧布局可替换;章节顺序不变,无需重排。
