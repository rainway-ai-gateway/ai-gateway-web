/**
* Copyright(c) 2026 The Rainway AI Gateway (壬远AI网关) Authors.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http: //www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
/**
* 0.10 / 0.11 登录态字段兼容。
*
* 0.11 起登录与用户响应中的 is_admin（bool）被 role（枚举）取代
* （ai-gateway-api: design-docs/modifications/2026-10-12-readonly-admin）。
* 前后端按同一版本发布，正常情况下登录响应只有 role；仍需兼容的是升级前
* 浏览器 localStorage 里残留的 {is_admin} 登录态，否则升级后首次打开会被
* 守卫判成无权访问（旧版文案还会误报成「当前url非法」）。
*/

export const ROLE_SYSTEM_ADMIN = 'system_admin';
export const ROLE_SYSTEM_ADMIN_READONLY = 'system_admin_readonly';

/**
 * 归一化用户角色：role 合法时以其为准，缺失时回退旧格式里的 is_admin。
 * is_admin 在旧版本只支持 true（系统管理员）；false 在 0.11 没有对应角色，
 * 不做「降级为只读」映射，避免把没有系统管理权限的账号自动放行。
 */
export function resolveRole(user) {
    if (!user) {
        return '';
    }
    if (user.role === ROLE_SYSTEM_ADMIN || user.role === ROLE_SYSTEM_ADMIN_READONLY) {
        return user.role;
    }
    return user.is_admin === true ? ROLE_SYSTEM_ADMIN : '';
}

/**
 * 角色无法通过守卫时的原因，供界面给出可操作的提示（而不是"url 非法"）：
 * - 'version-mismatch'：登录态里既没有 role 也没有 is_admin，说明前后端版本
 *   对不上（或本地残留的数据来自更旧版本）；
 * - 'no-access'：有角色字段，但没有任何控制台可用的角色（如旧版存入的
 *   is_admin=false、或未知 role 取值）。
 */
export function roleIssue(user) {
    if (!user || resolveRole(user)) {
        return '';
    }
    const hasRole = typeof user.role === 'string' && user.role !== '';
    const hasIsAdmin = typeof user.is_admin === 'boolean';
    return !hasRole && !hasIsAdmin ? 'version-mismatch' : 'no-access';
}