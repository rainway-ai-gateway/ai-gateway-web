# UI 代码变更：意图配置补未提交离开拦截（`beforeRouteLeave`）

> **日期**: 2026-10-16 ｜ **前置**: [2026-10-15 规则模块拖拽排序、离开拦截与复制](../2026-10-15-rule-modules-drag-guard-copy/ui-code-changes.md)（三兄弟模块已落地同形守卫）｜ **上游依据**: 无接口变更，纯前端路由守卫
> **对照接口**: `intent-config.md`（`GET` / `PUT /intent-config`，单例全量覆盖）｜ **对照原型**: `prototype-design/pages/intent-config.html`（仅覆盖「退出编辑模式」二次确认，未覆盖离开拦截，见 §3）
> **状态**: 原型 ⬜（无对应交互）· UI 代码 ✅ · 02 文档 ✅ · 测试 ⬜（spec 已落盘，待串行验证）· 手册 ⬜ ｜ **菜单/路由变更**: 无

AI 缓存 / 流量镜像 / AI 上下文三个规则模块在 2026-10-15 已补「编辑模式且有未提交改动时切换菜单弹确认」的拦截（`beforeRouteLeave`），**同族的意图配置模块漏做**：编辑模式下改了全局阈值或问题列表后点侧栏其它菜单，页面直接跳走，未提交的改动被静默丢弃，与三个兄弟模块行为不一致。本轮给 `IntentConfig/index.vue` 补上同形守卫（1 处，10 行）。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点（一句话） | 状态 |
| ----------- | -------- | ---- |
| 意图配置（`IntentConfig/index.vue`） | 新增 `beforeRouteLeave`：`mode === 'edit' && isDirty` 时 `$Modal.confirm` 拦截（确定放行 / 取消留在本页），否则直接放行 | ✅ UI |
| 原型 / 02 文档 / Playwright 用例 / 手册 | 原型无对应交互（不改）；02 文档与 Playwright 用例本次补齐；手册待评估（见 §6） | ⬜ |

## 2. 接口变更（diff）

无。本次仅新增前端路由守卫，不新增端点 / 字段 / 参数，不改变 `GET` / `PUT /intent-config` 的请求与响应结构。守卫的 `onCancel: () => next(false)` 只中断前端路由跳转，**不发起任何请求**，后端零改动，前后端可独立发布。

## 3. 原型变更（未做）

原型 `intent-config.html` 已实现「退出编辑模式」的脏数据二次确认（`exitEditMode()` + `Prototype.confirm`，文案与实现一致），但**未覆盖「带未提交改动离开页面」这一交互**——与 2026-10-15 三兄弟模块的处理相同（该轮亦未更新原型）。本轮不改原型，原型补齐列为后续工作。

## 4. UI 代码变更（`src/`，已实施）

| 文件 | 变更点 | 验收要点 |
| ---- | ---- | ---- |
| `src/modules/IntentConfig/index.vue` | `watch` 与 `methods` 之间新增 `beforeRouteLeave(to, from, next)`（`:215-226`）：`this.mode === 'edit' && this.isDirty` 为真时弹 `$Modal.confirm({ title: $t('com.informationTips'), content: $t('intentConfig.exitConfirm'), onOk: () => next(), onCancel: () => next(false) })` 并 `return`；否则 `next()` 放行 | 编辑模式且有未提交改动时，点侧栏其它菜单/面包屑等**应用内路由跳转**弹确认框，标题「信息提示」、正文「当前有未提交的改动，退出编辑模式将丢弃这些改动，确认退出？」；点「取消」留在本页（URL 不变、改动保留），点「确定」才真正跳走；视图模式或无改动时不弹框、直接跳走 |

- **与三个兄弟模块同形**：守卫形状与 `src/modules/AICache/index.vue:310-321`、`src/modules/AIContext/index.vue:201-212`、`src/modules/TrafficMirror/index.vue:159-170` 逐行一致（含 `onOk/onCancel` 的箭头函数写法）。
- **意图配置的字段形态与兄弟模块不同**：模式字段是 `mode`（兄弟模块为 `rulesMode` / `mode`），脏标记 `isDirty` 基于 `{ minConfidence, questions }` 快照比对（`index.vue:192-206`，兄弟模块基于 `rules` 数组快照），守卫只消费不修改这两个语义。
- **i18n 复用既有 key**：`com.informationTips`（`i18n/zh.js:67` / `en.js:67`）与 `intentConfig.exitConfirm`（`i18n/zh.js:1658` / `en.js:1755`）早已存在且与「退出编辑模式」二次确认共用同一串文案，本轮**未新增 i18n key**。
- **不改变既有退出路径**：`exitEditMode()`（`index.vue:373-389`）的二次确认与回滚逻辑未动；守卫只覆盖「离开本页」，两者共用同一文案但触发时机不同。
- **硬跳转不受拦截**：`beforeRouteLeave` 只作用于 vue-router 的应用内跳转；浏览器刷新 / 直接改 URL / `page.goto()` 等整页跳转不会触发（与三个兄弟模块一致，属 Vue 路由守卫固有语义）。

## 5. 既有用例影响

| 受影响用例 | 处置 | 依据 / 说明 |
| ---------- | ---- | ----------- |
| 意图配置 IC-L-01 ~ IC-L-16、IC-Q / IC-D / IC-P / IC-V 全量 | 无处置 | 既有用例均在页内操作（进入/退出编辑模式、抽屉、保存并发布），退出编辑模式走 `exitEditMode()` 而非路由跳转；`test_01 ~ test_06` 无「编辑模式下跨页跳转」的用例，守卫不进入其断言路径 |
| 意图配置 IC-RO-01 ~ IC-RO-03（只读视角） | 无处置 | 只读视角恒停留 `view` 模式（`mode === 'view'` → `isDirty` 恒为 `false`），守卫条件不成立，直接 `next()` 放行 |
| 其余模块用例 | 无处置 | 仅新增本模块守卫，未触碰共享组件 / `pageTable` / 路由表 |

## 6. 下游影响（阶段 3/4/5 输入）

- **02 文档**：`ai-gateway-web-test/docs/intent-config/02-功能测试用例/06-离开拦截与退出确认.md` 新增 IC-DR-01 / IC-DR-02 两条用例，并在 `00-索引与映射.md` 登记 `IC-DR` 前缀、用例索引与自动化映射表行。
- **测试**：Playwright `tests/intent-config/test_07_intent_config_leave_guard.spec.js`（IC-DR-01 / IC-DR-02）。IC-DR-01 的导航必须走**侧栏菜单点击**（应用内路由跳转）——`page.goto()` 属整页跳转，Vue 路由守卫不触发（见 §4 末条），用硬跳转会得到假通过。
- **用户手册**：`ai-gateway-user-manual` 的意图配置章节（对应 `ai-gateway-web/docs/zh-cn/17-intent-config.md`）现有「退出编辑模式」说明，未覆盖「切换菜单时的离开确认」；本轮**未修订手册**，列为后续工作（三兄弟模块的对应说明亦未补）。
- **文档站**：`docs/zh-cn/17-intent-config.md` 未新增内容，其孪生页面 `docs/zh-cn/site/17-intent-config.html` 无需重新生成。
- **部署前置**：无（接口零变化）。

## 7. 验收与偏差

- **实现核对**：守卫与 `AICache/index.vue:310-321` 的形状逐行一致；条件字段按意图配置的 `mode` / `isDirty` 取用。
- **静态检查**：`npx eslint src/modules/IntentConfig/index.vue` 通过（0 error / 0 warning，2026-10-16）。
- **编译核对（非浏览器）**：`:8180` webpack dev server 从源码编译，已确认改动被重新编译并命中——`GET http://localhost:8180/intent-config.js` 的产物中 `IntentConfig/index.vue` 模块含编译后的 `beforeRouteLeave`（`this.mode === 'edit' && this.isDirty` → `this.$Modal.confirm({ content: this.$t('intentConfig.exitConfirm') ... })`），整包 `app.js` 无 `Module build failed`。
- **未做 / 待验证**：本轮的端到端验收（真实点击侧栏菜单看确认框、取消后 URL 不变、确定后跳走）由 `ai-gateway-web-test` 的 `test_07_intent_config_leave_guard.spec.js` 覆盖，需**串行**执行（同工作区并行会话会互相顶掉 viewer/admin 会话，见 2026-10-16-route-table-type-mapping 记录 §7 的同类现象）；该 spec 尚未跑绿，本文档不宣称测试已通过。
- **已知观察（未处置，非本次范围）**：`src/utils/navigation.js` 的 `notifyNavigationCancelled()` 在全仓**无任何调用点**（`src/layout/sidebar/sidebarNav.vue:77` 已监听 `NAVIGATION_CANCELLED` 并会重置菜单高亮）。因此在「点其它菜单 → 取消」后，侧栏菜单高亮可能停留在被点击的目标项上而非当前页，属既有实现遗留；本轮未引入该调用（保持与三个兄弟模块一致），亦未在用例中断言取消后的菜单高亮状态。