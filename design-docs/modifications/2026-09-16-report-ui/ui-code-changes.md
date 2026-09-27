# UI 代码变更文档

> **对照接口**：`report.md`（`/report/overview`、`/report/timeseries`、`/report/rankings`、`/report/distribution`、`/report/logs`）  
> **对照原型**：`prototype-design/pages/report.html`（新增）  
> **设计参考**：`数据报表-多存储与API化设计方案.md`（2 页签 + echarts 方案）  
> **状态**：**原型已完成**（待生成 Vue UI 代码）

本文记录 2026-09-16 新增「数据报表」模块的原型设计变更。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 状态 |
| ----------- | -------- | ---- |
| 数据报表 · 总览 | 5 指标卡 + 6 张 echarts 图表（QPS/Token/延迟折线、模型排行横向柱状、提供商/状态码饼图） | ✅ 原型 |
| 数据报表 · 明细 | 日志表格（分页、行展开、JSON 字段展开）、明细过滤（请求模型/只看错误/关键字） | ✅ 原型 |
| 过滤栏 | 8 个 API 共有过滤参数 + 4 个快捷时间按钮 + 多选下拉 | ✅ 原型 |
| 导航菜单 | 新增「数据报表」入口，图标 `ivu-icon-md-analytics`，i18n 键 `ReportManage` | ✅ 原型 |
| i18n | `nav.ReportManage` 中英文翻译 | ✅ 原型 |
| Mock 数据 | 5 组报表数据：概览、时序、排行、分布、日志明细 | ✅ 原型 |

---

## 2. 新增 · 数据报表原型页面

**文件**：`prototype-design/pages/report.html`（新增，779 行）  
**对照接口**：`report.md` §2.1–2.5（5 端点）  
**对照设计**：`数据报表-多存储与API化设计方案.md`（2 页签 + echarts）

### 2.1 页面结构

| 区域 | 说明 |
| ---- | ---- |
| 过滤栏（`reportFilterBar`） | 8 个共有过滤参数：起始时间/结束时间（`datetime-local`）、路由模型（多选）、API Key（多选）、提供商（多选）、主机（多选）、流式（下拉）、状态码（文本） |
| 快捷时间按钮 | 1 小时 / 6 小时 / 24 小时 / 7 天 / 自定义 |
| 页签 | **总览** + **明细**（2 页签切换） |

### 2.2 总览页签

#### 2.2.1 指标卡（5 列 Grid）

| 指标 | 数据来源 | 数据字段 |
| ---- | -------- | -------- |
| 请求总量 | `reportOverview.request_total` | `GET /report/overview` → `request_total` |
| 错误总量 + 错误率 | `reportOverview.error_total` / `error_rate` | `GET /report/overview` → `error_total` / `error_rate` |
| Token 消耗（入/出/总） | `reportOverview.*_tokens` | `GET /report/overview` → `input_tokens` / `output_tokens` / `total_tokens` |
| 平均延迟 | `reportOverview.latency_avg_ms` | `GET /report/overview` → `latency_avg_ms` |
| 成本（按币种） | `reportOverview.cost[]` | `GET /report/overview` → `cost[]` |

#### 2.2.2 echarts 图表（6 张，2×3 Grid）

| 图表 | 类型 | 数据来源 | 维度/指标 |
| ---- | ---- | -------- | --------- |
| QPS 时序 | 折线（`chartOptionsLine`） | `reportTimeseries.qps` | `GET /report/timeseries?metric=qps` |
| Token 吞吐时序 | 折线（3 系列：入/出/总） | `reportTimeseries.tokens` | `GET /report/timeseries?metric=tokens` |
| 延迟时序 | 折线（2 系列：avg/max） | `reportTimeseries.latency` | `GET /report/timeseries?metric=latency` |
| 模型 Top10 排行 | 横向柱状（`chartOptionsBar`） | `reportRankings.model` | `GET /report/rankings?dimension=model` |
| 提供商占比 | 饼图（`chartOptionsPie`） | `reportDistribution.protocol` | `GET /report/distribution?dimension=protocol` |
| 状态码分布 | 饼图（`chartOptionsPie`） | `reportDistribution.status` | `GET /report/distribution?dimension=status` |

**echarts 工具函数**：
- `initChart(domId)` — 初始化/复用 echarts 实例
- `chartOptionsLine(xData, seriesArr, yLabel)` — 折线图配置
- `chartOptionsBar(xData, seriesArr, horizontal)` — 柱状图配置
- `chartOptionsPie(data)` — 饼图配置（环形 `radius: ['40%', '70%']`）
- `disposeAllCharts()` — 切换页签时销毁全部实例
- `window.resize` 监听 → 全部图表 `resize()`

### 2.3 明细页签

#### 2.3.1 明细过滤（独立于全局过滤栏）

| 参数 | 控件 | API 参数 |
| ---- | ---- | -------- |
| 请求模型 | `<input>` 逗号分隔 | `requested_models` |
| 只看错误 | `<select>` 是/否 | `err_only` |
| 错误消息关键字 | `<input>` 模糊匹配 | `keyword` |

#### 2.3.2 日志表格

| 列 | 数据字段 |
| -- | -------- |
| Log ID | `logid` |
| 时间 | `log_time` |
| API Key | `ai_apikey_id` |
| 请求模型 | `ai_requested_model` |
| 目标模型 | `ai_target_model` |
| 提供商 | `ai_provider` |
| 状态码 | `res_status_code` |
| 耗时 | `all_time` |
| Token | `ai_total_tokens` |
| TTFT | `ai_ttft_us` |
| 成本 | `ai_cost_value` + `ai_cost_currency` |
| 错误 | `err_msg`（截断 20 字符） |

行展开详情（`renderLogDetail`）：
- 基础字段：`hostid`、`product`、协议、模式、流式、`err_code`、输入/输出 Token、TPOT、`level1`、`client_ip`、`header_host`、`origin_uri`
- JSON 字段展开：`ai_rate_limit_hits`、`ai_auth_reject_quota_plans`、`req_headers`、`res_headers`（点击「展开」按钮 toggle）

分页：上一页/下一页按钮，显示「共 X 条，第 Y/Z 页」。

---

## 3. 修改 · 导航菜单

**文件**：`prototype-design/assets/js/layout.js`

### 3.1 图标注册

| 位置 | 变更前 | 变更后 |
| ---- | ------ | ------ |
| `NAV_ICONS`（第 17 行） | — | `'Report.list': 'ivu-icon ivu-icon-md-analytics'` |

### 3.2 菜单项新增

**位置**：`PrototypeNav` 数组（第 105–111 行）

```javascript
{
  id: 'Report.list',
  i18n: 'ReportManage',
  page: 'report.html',
  text: '数据报表',
  icon: navIcon('Report.list'),
}
```

菜单项位于「消费者管理」组之后、「用户管理」之前，作为顶级菜单项。

---

## 4. 修改 · i18n 翻译

**文件**：`prototype-design/assets/js/prototype.js`

| 语言 | Key | 值 | 位置 |
| ---- | --- | -- | ---- |
| `zh` | `nav.ReportManage` | `数据报表` | `messages.zh`（第 33 行） |
| `en` | `nav.ReportManage` | `Data Report` | `messages.en`（第 62 行） |

> **说明**：`layout.js` 中 `navLabel()` 函数优先查 `Prototype.t('nav.ReportManage')`，无映射时返回原始 key，因此必须补充翻译映射。

---

## 5. 新增 · Mock 数据

**文件**：`prototype-design/assets/js/mock-data.js`（末尾追加，第 1194–1431 行）

| 数据对象 | 用途 | 对照接口 |
| -------- | ---- | -------- |
| `reportOverview` | 总览指标卡 | `GET /report/overview` |
| `reportTimeseries` | 时序数据（qps/tokens/latency/ttft/tpot/cost） | `GET /report/timeseries` |
| `reportRankings` | 维度排行（model/provider/apikey/host/status/protocol/mode） | `GET /report/rankings` |
| `reportDistribution` | 占比分布（status/protocol/mode/stream） | `GET /report/distribution` |
| `reportLogs` | 日志明细（5 条示例，含分页信息） | `GET /report/logs` |

### 5.1 概览数据（`reportOverview`）

```javascript
{
  request_total: 152300, error_total: 1200, error_rate: 0.00788,
  input_tokens: 88341233, output_tokens: 12093441, total_tokens: 100434674,
  latency_avg_ms: 1234.5, latency_max_ms: 9876,
  latency_p50_ms: 1100, latency_p90_ms: 2100, latency_p99_ms: 4500,
  ttft_avg_ms: 320.4, tpot_avg_ms: 25.1,
  cost: [{ currency: 'USD', value: 15230000 }, { currency: 'RMB', value: 98000 }],
  rate_limit_hits: 320, auth_rejects: 45, logs_total: 152300
}
```

### 5.2 时序数据（`reportTimeseries`）

6 个 metric 各含 `bucket_sec: 60` + `series[]`（5–10 个点）。Doris 后端的 `p50`/`p90`/`p99` 字段仅在 `reportOverview` 中展示，时序图仅展示 avg/max。

### 5.3 排行数据（`reportRankings`）

8 个维度（model/provider/apikey/host/status/protocol/mode + requested_model 可通过切换维度使用），每个含 `items[]`（3–4 项，含 `name`、`request_count`、`error_count`、`input_tokens`、`output_tokens`）。

### 5.4 占比分布（`reportDistribution`）

4 个 dimension（status/protocol/mode/stream），各含 `items[]` 含 `name`、`request_count`、`ratio`。

### 5.5 日志明细（`reportLogs`）

```javascript
{ total: 152300, page: 1, page_size: 20, items: [5 条示例] }
```

5 条示例覆盖场景：正常 200（logid 12345）、上游超时 500（12346）、正常含 JSON 字段（12347）、未认证 401（12348）、限流 429（12349）。

---

## 6. 变更文件清单

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `prototype-design/pages/report.html` | **新增** | 数据报表原型页面（779 行） |
| `prototype-design/assets/js/layout.js` | 修改 | 新增图标 `Report.list` + 菜单项 |
| `prototype-design/assets/js/prototype.js` | 修改 | 补充 `nav.ReportManage` 中英文翻译 |
| `prototype-design/assets/js/mock-data.js` | 修改 | 追加 5 组报表 mock 数据（238 行） |

---

## 7. 验收清单

### 原型页面（report.html）

- [x] 2 页签（总览 + 明细），标签切换正常
- [x] 过滤栏 8 个参数：起始时间、结束时间、路由模型、API Key、提供商、主机、流式、状态码
- [x] 快捷时间按钮可切换并回填 datetime-local
- [x] 「查询」按钮读取过滤参数并重载数据；「重置」按钮恢复默认值
- [x] 总览页签：5 指标卡展示 overview 数据
- [x] 总览页签：6 张 echarts 图表（QPS 折线、Token 折线、延迟折线、模型排行横向柱状、提供商饼图、状态码饼图）
- [x] 图表响应窗口 resize
- [x] 明细页签：日志表格含全部列
- [x] 行展开显示完整字段（含 hostid、协议、模式、流式、err_code、TPOT、level1、client_ip 等）
- [x] JSON 字段（`ai_rate_limit_hits` 等）点击展开/收起
- [x] 明细独立过滤（请求模型、只看错误、关键字）可用
- [x] 分页逻辑（上一页/下一页按钮，页码展示）

### 导航菜单（layout.js）

- [x] 菜单显示「数据报表」中文
- [x] 英文模式下显示「Data Report」
- [x] 图标 `ivu-icon-md-analytics` 正确渲染
- [x] 点击跳转 `pages/report.html`

### Mock 数据（mock-data.js）

- [x] `reportOverview` 结构与 `/report/overview` 返回一致
- [x] `reportTimeseries` 含 6 个 metric 各含 `bucket_sec` + `series`
- [x] `reportRankings` 含 8 个 dimension 各含 `items`
- [x] `reportDistribution` 含 4 个 dimension 各含 `items`
- [x] `reportLogs` 含 `total`/`page`/`page_size`/`items`

---

## 8. 关联文档

| 文档 | 说明 |
| ---- | ---- |
| `api-define/OpenAPI接口定义/report.md` | 5 端点 API 定义 |
| `sys-design/details/报表查询模块.md` | 模块细节设计 |
| `数据报表-多存储与API化设计方案.md` | 2 页签 + echarts 设计参考 |
| `prototype-design/pages/report.html` | 新增原型页面 |