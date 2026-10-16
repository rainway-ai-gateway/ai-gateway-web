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

let excludeRoute = {
  'product.home': true,
};

export default async (to) => {
  let meta = store.getMeta();
  if (!meta) {
    let navRsp = await Vue.prototype.$request({
      url: 'meta',
      method: 'get',
      unneedTips: true,
      withoutAuth: true,
    });

    store.setMeta(navRsp.data.Data);
    meta = navRsp.data.Data;
  }
  if (to.name === 'LoginPassword') {
    return true;
  }

  let loginRoute = store.getLoginRoute();
  const userData = store.getUser();
  if (!userData) {
    return loginRoute;
  }
  if (!(userData.role === 'system_admin' || userData.role === 'system_admin_readonly')) {
    return 'illegalAccess';
  }

  if (excludeRoute[to.name]) {
    return true;
  }
  let curNav = store.findNav(to.name);
  if (!curNav) {
    return loginRoute;
  }
  return true;
};
