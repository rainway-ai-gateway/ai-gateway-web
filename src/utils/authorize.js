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
* Copyright (c) 2021 The BFE Authors.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
// eslint-disable
import Vue from 'vue';
import store from './store';
import { roleIssue } from './role';

let excludeRoute = {
  'product.home': true,
};

export default async (to) => {
  let meta = store.getMeta();
  if (!meta) {
    const navRsp = await Vue.prototype.$request({
      url: 'meta',
      method: 'get',
      unneedTips: true,
      withoutAuth: true,
    });

    // meta 拉取失败（网络/网关/后端异常）时不能让守卫抛错，否则导航被中断、
    // 页面停在原地没有任何反馈；失败时不写 store，后续导航可再次尝试。
    const nav = navRsp && navRsp.data ? navRsp.data.Data : null;
    if (nav) {
      store.setMeta(nav);
    }
    meta = nav;
  }
  if (to.name === 'LoginPassword') {
    return true;
  }

  let loginRoute = store.getLoginRoute();
  const userData = store.getUser();
  if (!userData) {
    return loginRoute;
  }
  const issue = roleIssue(userData);
  if (issue) {
    // 这里是最容易误判的地方（本地残留的旧登录态 / 前后端版本不一致），
    // 打印实际字段，便于把「版本不一致」和「确实没权限」区分开。
    // eslint-disable-next-line no-console
    console.warn('[auth] unusable role in user payload:', issue, Object.keys(userData));
    return issue === 'version-mismatch' ? 'roleVersionMismatch' : 'illegalAccess';
  }

  if (excludeRoute[to.name]) {
    return true;
  }
  // 导航树没拿到（meta 请求失败）时跳过菜单校验：前端校验只为体验，
  // 真正的权限边界在服务端接口，不能因为一次 meta 失败就把人弹回登录页。
  if (!meta) {
    return true;
  }
  let curNav = store.findNav(to.name);
  if (!curNav) {
    return loginRoute;
  }
  return true;
};
