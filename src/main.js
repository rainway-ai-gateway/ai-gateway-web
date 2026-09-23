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
/* jshint esversion: 6 */
import '@babel/polyfill';
import Vue from 'vue';
import router from '@/router/instance';
import NProgress from '@/utils/nprogress';
import layoutApp from '@/layout/layout';
import checkRole from '@/utils/authorize';
import { urlFormat } from '@/utils/tool';
import { i18n, loadLanguageAsync, getLang } from '@/utils/i18n';
import store from '@/utils/store';
import VueClipboard from 'vue-clipboard2';
import JsonViewer from 'vue-json-viewer';

import '@/utils/Element';
import requestPlugin from '@/utils/request';
import '@/assets/css/main.less';
import './utils/directive';

Vue.use(requestPlugin);

Vue.prototype.$urlFormat = urlFormat;
Vue.prototype.$BFEProductLineId = 1;
Vue.prototype.$store = store;
Vue.prototype.Version = '_VERSION_';

Vue.use(VueClipboard);
Vue.use(JsonViewer);

Vue.prototype.$Message.config({
  top: 20,
  duration: 3,
});

router.beforeEach((to, from, next) => {
  NProgress.start();
  const lang = getLang();

  // If login page, allow directly
  if (to.name === 'LoginPassword') {
    loadLanguageAsync(lang).then(() => next());
    return;
  }

  // Load language first, then check permissions
  loadLanguageAsync(lang).then(() => {
    checkRole(to).then((result) => {
      if (result === true) {
        next();
        return;
      }

      // Not logged in or other redirect cases
      NProgress.done();

      let content = i18n.t('login.tipNotLogin');
      if (result === 'product.list') {
        content = i18n.t('login.tipSelectProductLine');
      }

      if (result === 'illegalAccess') {
        content = i18n.t('login.tipUrlIllegal');
        Vue.prototype.$Modal.warning({
          title: i18n.t('com.tips'),
          content: content,
          onOk: () => {
            next({
              name: 'LoginPassword',
            });
          },
        });
      } else {
        Vue.prototype.$Modal.warning({
          title: i18n.t('com.tips'),
          content: content,
          onOk: () => {
            next({
              name: result,
            });
          },
        });
      }
    });
  });
});

router.onError((error) => {
  const pattern = /Loading chunk (\d)+ failed/g;
  const isChunkLoadFailed = error.message.match(pattern);
  const targetPath = router.history.pending.fullPath;
  if (isChunkLoadFailed) {
    router.replace(targetPath);
  }
});

router.afterEach(() => {
  NProgress.done();
});

new Vue({
  el: '#app',
  router,
  i18n,
  render: (h) => h(layoutApp),
});
