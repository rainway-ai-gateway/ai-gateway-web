/**
 * Copyright(c) 2026 The rainway-ai-gateway Authors.
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
import Vue from 'vue';

const DEFAULT_NAV_KEY = 'admin';
const NAV_KEY_BY_ROLE = {
  system_admin: 'admin',
  system_admin_readonly: 'admin_readonly',
};

export default {
  state: Vue.observable({
    user: null,
    meta: null,
    breadcrumbTitle: '',
    breadcrumbRouteName: '',
  }),
  getUser() {
    if (this.state.user) {
      return this.state.user;
    }
    let ls = localStorage.getItem('user');
    if (ls) {
      return JSON.parse(ls);
    }
    return null;
  },
  getLoginRoute() {
    return 'LoginPassword';
  },
  getMeta() {
    return this.state.meta;
  },
  getNav() {
    return this.state.meta ? this.state.meta.nav : null;
  },
  getNavRoot() {
    const nav = this.getNav();
    if (!nav) {
      return null;
    }
    const user = this.getUser();
    const navKey = NAV_KEY_BY_ROLE[(user && user.role)] || DEFAULT_NAV_KEY;
    return nav[navKey] || nav[DEFAULT_NAV_KEY] || null;
  },
  findNav(routeName) {
    return findNav(this.getNavRoot(), routeName);
  },
  setMeta(newVal) {
    this.state.meta = newVal || {};
  },
  setUserData(newVal) {
    this.state.user = {
      name: newVal.user_name,
      sessionKey: newVal.session_key,
      role: newVal.role,
    };
    localStorage.setItem('user', JSON.stringify(this.state.user));
  },
  isReadonly() {
    const user = this.getUser();
    return !!(user && user.role === 'system_admin_readonly');
  },
  removeUserData() {
    this.state.user = null;
    localStorage.removeItem('user');
  },
  setBreadcrumbTitle(title, routeName) {
    this.state.breadcrumbTitle = title || '';
    this.state.breadcrumbRouteName = routeName || '';
  },
  getBreadcrumbTitle() {
    return this.state.breadcrumbTitle;
  },
  getBreadcrumbRouteName() {
    return this.state.breadcrumbRouteName;
  },
};

function findNav(root, id) {
  if (!root) {
    return null;
  }

  if (root.id === id) {
    return root;
  }

  let length = root.children ? root.children.length : 0;
  for (let index = 0; index < length; index++) {
    let node = findNav(root.children[index], id);
    if (node) {
      return node;
    }
  }
  return null;
}
