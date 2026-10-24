# UI 代码变更文档

> **对照接口**：`expression/verify`（既有，`PATCH /expression/verify`，前端拼接表达式后由后端 `condition.Build` 编译校验）
> **对照设计**：`design-docs/bfe-condition-primitive-define/condition/`（BFE 条件原语定义）
> **状态**：UI 代码已实施

本次变更：**`Expression` 组件（`src/components/Expression/`）条件原语面板与 BFE 条件原语定义全量对齐**，并支持按"阶段"分组展示。

---

## 1. 背景：核对发现的问题

以 `design-docs/bfe-condition-primitive-define/condition/` 为基准核对 `ExpressionConfig.js`，并与实际运行时（`ai-gateway-api` 经 `go.mod replace` 使用的 `mileszhang2016/bfe@v1.4.1-0.20261006053058-d12472ad13a3` 的 `bfe_basic/condition/build.go`）交叉验证，发现：

| # | 问题 | 处理 |
| - | ---- | ---- |
| 1 | 面板缺失 27 个文档原语（host 后缀/正则/tag、path contain/element_prefix_in/正则、query/cookie/header 的 value_contain 与 value_regmatch、req_ua_regmatch、vip、cip 上下文 `req_context_value_in`、`req_tag_match`、`req_url_regmatch`、`bfe_periodic_time_range`、session 5 条、response 3 条） | 全部补齐 |
| 2 | 面板有 `bfe_cluster_in`，运行时 `condition.Build` 不存在该原语（会报 `unsupported primitive`），文档也无定义 | 删除 |
| 3 | 文档比运行时旧一版：运行时支持 `req_ai_intent_in`（依赖 `mod_ai_intent`，产品已有 `IntentConfig` 模块），文档目录（拷自本地旧 bfe）未收录 | 面板补上 `intent` 分组；**文档目录留待另行同步** |
| 4 | 5 处签名/参数名与文档不一致（`req_cip_range(patterns)`、`req_header_value_hash_in(key,...)`、`req_body_json_prefix_in(model,prefix,foldCase)`、`req_body_larger_than/less_than(bytes)`） | 按文档修正 |
| 5 | 系统性简写：host/port/method/path/query/cookie/header 全组参数写成 `patterns` | 统一改为文档参数名 |
| 6 | cookie `value_prefix_in` 示例缺闭合 `</p>` 且与 suffix 示例值重复；header `value_prefix/suffix_in` 示例语义误导 | 按文档示例修正 |
| 7 | 分组标题硬编码英文（`host`/`path`/`clientIP`/...），违反「界面文案全部走 i18n」约定 | 全部改为 `route.exprGroup.*` i18n 键（键值保持英文原文，中英语言包一致） |
| 8 | response 原语（`res_code_in` 等）只在响应阶段可求值；请求阶段规则（路由/镜像/缓存/AI 上下文）中 `HttpResponse` 为 nil，恒为 false，属死条件 | 新增 `hideGroups` 能力，请求阶段模块隐藏 `response` 分组 |
| 9 | 悬停 tooltip 内容溢出提示框：iview `v-transfer-dom` 把弹层移到 `document.body`，组件 scoped 样式（依赖 `.expression-item` 祖先选择器与 `data-v` 属性）无法命中 tooltip 内容，`v-html` 示例段落无边框/底色且不换行，长示例横向溢出 | tooltip 内容样式改为**非 scoped** 样式块；`.ivu-tooltip-light .ivu-tooltip-inner` 限宽 560px 并 `white-space: normal`（全应用仅本组件使用 light 主题 tooltip） |

## 2. 变更内容

### 2.1 `src/components/Expression/ExpressionConfig.js`（重写）

- 每个分组增加稳定 `id`（`logical/host/port/method/path/query/cookie/header/cip/vip/proto/context/tag/url/intent/body/response/session/system/vars`），分组标题改走 `i18n.t('route.exprGroup.*')`。
- `controller(conditionVars)` 返回全量 20 个分组、60 个条件原语 + 5 个逻辑连接符；与 pinned 运行时 `build.go` 支持集完全一致（脚本比对：缺失 0、多余 0）。
- 按钮 `description` 与文档签名逐字一致；`expression` 为可拼接模板；`example` 采用文档示例。
- `connController` 不变（`default_t` + 逻辑连接符）。
- 删除 `bfe_cluster_in`；`system` 组由 `bfe_time_range` + `bfe_periodic_time_range` 组成。

### 2.2 `src/components/Expression/index.vue`

- 新增 prop `hideGroups: Array`，默认 `[]`；`type === 'controller'` 时按分组 `id` 过滤（`connController` 不参与过滤）。
- 分组 `v-for` key 改用 `item.id || item.name`。
- **tooltip 样式修复**：iview `v-transfer-dom` 把 tooltip 弹层移到 `document.body`，scoped 样式（依赖 `.expression-item` 祖先选择器 / `data-v` 属性）无法命中弹层内容，导致示例段落（`v-html` 注入、无 `data-v`）既无边框底色也不换行而横向溢出。修复：tooltip 内容相关样式（`.expression-content` / `.vars-expression-title` / `.vars-expression-name p`）移至**非 scoped** 样式块；`.ivu-tooltip-light .ivu-tooltip-inner` 限宽 560px 并 `white-space: normal`（经全仓确认仅本组件使用 light 主题 tooltip，不会影响其他页面）。

### 2.3 四个请求阶段模块的 `RuleForm.vue`

`RouteTable` / `TrafficMirror` / `AICache` / `AIContext` 的 `<Expression>` 均传入 `:hide-groups="['response']"`，隐藏响应侧原语。后续若新增响应阶段配置页面（如错误页规则），不传 `hideGroups` 即可展示全量面板，扩展方式保持灵活。

### 2.4 `src/i18n/zh.js` / `src/i18n/en.js`

`route` 命名空间新增 `exprGroup`（19 个分组标题，中英双语）。

### 2.5 `docs/zh-cn/10-route.md`（仓库内用户手册）

「表达式构造器」章节的维度/操作符表格同步为新面板（请求阶段维度全集），删除 `bfe_cluster_in`，补充响应维度在路由规则中不展示的说明。

## 3. 影响范围

- 面板按钮数量 33 → 66（含逻辑连接符与条件变量占位），不影响已保存表达式：存量表达式文本不变，`expression/verify` 校验逻辑不变。
- `ai-gateway-web-test` 的 UI 自动化基线（`logs/*.log` 中逐个枚举面板按钮）需随本次变更刷新。
- 工作区根目录独立的 `ai-gateway-user-manual` 项目（`06-route.md` 及其生成的 `site/`）仍描述旧面板，本次未改动，需另行同步。

## 4. 验证结果

- [x] 面板原语集 ⊇ 文档 59 条，且与 pinned 运行时 60 条完全一致（脚本比对缺失/多余均为 0）
- [x] 请求阶段四个模块不展示 `response` 分组
- [x] 全部签名与文档一致；示例可正常渲染（正则示例用反引号，无需二次转义）
- [x] 分组/按钮结构校验：20 个分组 id、按钮 name 组内唯一、模板括号配平（脚本）
- [x] tooltip 溢出修复验证：按编译产物原样复现弹层 DOM（含 `v-transfer-dom` 移到 body 的场景），修复前 `inner.scrollWidth > clientWidth`（横向溢出），修复后相等且无溢出、示例段落正确获得边框/底色/`break-all`（headless Chrome 几何测量）
- [x] `npm run lint` 通过（全量 `--fix` 后无报错）
- [x] `npm run build` 通过（Node 20；本机 nvm 默认 Node 12 过低，属环境既有问题，与本次变更无关）
- [ ] 人工冒烟：四个模块打开规则抽屉，逐组悬停 tooltip 抽查示例
- [ ] `ai-gateway-web-test` 自动化基线刷新

## 5. 遗留事项

- ~~`design-docs/bfe-condition-primitive-define/` 仍是旧版 bfe 文档拷贝，缺 `request/intent.md` 与 `req_ai_intent_in` 索引；建议从 pinned 版本（`mileszhang2016/bfe@v1.4.1-0.20261006053058-d12472ad13a3/docs/zh_cn/condition/`）同步。~~ **已解决**（2026-10-16）：已整体同步到官方 `bfenetworks/bfe@v1.8.9-dev` 文档（含 `intent.md` 与更新的 `time_weekday_in`），见 `modifications/2026-10-16-bfe-condition-doc-sync/change-summary.md`。
