# UI 代码变更：`is_admin` → `role` 登录态兼容

> **日期**: 2026-10-30 ｜ **前置**: [2026-10-12 只读管理员](../2026-10-12-readonly-admin/ui-code-changes.md)（`is_admin` → `role`，守卫改判 `role`）｜ **上游依据**: `ai-gateway-api` `design-docs/modifications/2026-10-12-readonly-admin/api-changes.md:105`
> **上游复盘**: 同目录 [`change-summary.md`](./change-summary.md)
> **对照接口**: `auth.md`（登录 / 用户列表 `role` 枚举；角色变更 `PATCH /auth/users/{user_name}/role`）｜ **状态**: UI 代码 ✅ ｜ **菜单/路由变更**: 无

## 1. 背景

0.11 起登录态字段由 `is_admin`（bool）改为 `role`（枚举）。前后端按同一版本发布，登录响应本身没有问题；出问题的是**升级/切换环境后浏览器里残留的旧登录状态**：

- 同一域名升级：`localStorage.user` 里仍是旧版本写入的 `{name, sessionKey, is_admin}` → 守卫读不到 `role`，把所有人判成无权访问，弹「当前url非法」。
- 域名只改解析、不换 origin（A 环境 → B 环境）时，浏览器缓存的旧页面（本次不改后端缓存策略，仍需用户强刷一次）与旧 `localStorage` 会一起带过来，问题叠加出现。

## 2. 改动

| 文件 | 改动 |
| ---- | ---- |
| `src/utils/role.js`（新增） | `resolveRole(user)`：`role` 合法时以其为准，缺失时回退 `is_admin === true → system_admin`；`is_admin=false` 不映射为只读（0.11 无该语义，避免自动放行）。`roleIssue` 把「字段缺失（版本错配）」与「有字段但不可用（无权限）」区分开。 |
| `src/utils/store.js` | `setUserData` 存 `resolveRole(newVal)`；`getUser()` 对 `localStorage` 里旧格式登录态就地补 `role`（保留原始 `is_admin` 供 `roleIssue` 判因），读到不可解析的数据时清空并按未登录处理；`getNavRoot()` / `isReadonly()` 统一走 `resolveRole`。 |
| `src/utils/authorize.js` | 守卫改用 `roleIssue`：`version-mismatch` → `roleVersionMismatch`，其余 → `illegalAccess`；两者都 `console.warn` 实际字段。`meta` 拉取失败（响应缺失/异常）时不中断导航、不写入缓存，本次导航跳过菜单校验放行（权限仍由服务端接口把关），下次导航再试。 |
| `src/main.js` | 两种失败给不同提示与动作：版本错配提示「前后端版本不一致…强制刷新」，确定=重新加载；无权限提示「仅支持系统管理员…」，确定=回登录页。不再使用「当前url非法」。 |
| `src/i18n/{zh,en}.js` | 新增 `login.tipRoleNoAccess` / `login.tipRoleVersionMismatch`；删除误导性的 `login.tipUrlIllegal`。 |
| `ai-gateway-web-test/utils/{session,readonly}.js` | 会话/角色异常弹框识别文本同步新增（保留旧文案以兼容老构建）。 |

> 用户管理页（`User.vue` / `CreateUser.vue`）不做旧后端适配：前后端永远同版本发布，旧 `is_admin` 接口不会出现在线上。

## 3. 行为边界

- 0.11 前后端（正常版本）：`role` 优先，行为与改动前一致。
- 升级后浏览器里残留旧登录状态：按 `is_admin = true` 回退放行，无需清理站点数据。
- 发布时 UI 与 API 按同一版本配套上线。

## 4. 验证

- `npx eslint --ext .js,.vue` 通过；`npm run build` 通过（Node 20）。
- `role.js` 纯函数断言：`role` 合法值、`is_admin` true/false、空对象、`null` 全部通过。
- 端到端（浏览器，`dist` + 本地 API，代理按需改写登录响应）：
  - 旧登录态形态（只有 `is_admin:true`）→ 进入首页、菜单正常，**不再弹任何错误**；
  - 版本错配形态（`role`、`is_admin` 都没有）→ 弹「前后端版本不一致…强制刷新」，确定后**重新加载页面**；
  - 非管理员形态（`is_admin:false`）→ 弹「当前账号没有控制台访问权限…仅支持系统管理员」，确定后回登录页；
  - 正常形态（`role` 枚举）：登录正常，`viewer`/`test` 显示「系统管理员（只读）」，创建抽屉两个角色选项齐全。
- 边界实测：① `localStorage.user` 写成非法内容 → 首次加载弹「请先登录」，确定后到登录页（不再抛错卡住）；② `meta` 接口返回 502 → 直接进入 `/user` 页面正常渲染、用户列表可用（菜单为空，不被弹回登录页、不白屏）。
- 自动化用例：`ai-gateway-web-test/tests/user/test_14_login_state_compat.spec.js`（UM-34～UM-38，覆盖上述五种登录态），与 `test_06_login_auth.spec.js` 同轮串行执行 8/8 通过。

## 5. 事故复盘

复盘与方案说明见同目录 [`change-summary.md`](./change-summary.md)。本文档只保留代码级改动与验证记录。