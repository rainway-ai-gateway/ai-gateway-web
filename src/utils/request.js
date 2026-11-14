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
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { i18n, getLang } from '@/utils/i18n';
import store from '@/utils/store';
import router from '@/router/instance';

// 超出 Number.MAX_SAFE_INTEGER（2^53）的标识类整数字段（logid/session_id 等，
// 19 位 int64）：JSON.parse 前把原始文本中的数值转为字符串，避免 double 舍入
// 导致精度丢失（ai-gateway-web issue #141）。仅处理已知 ID 字段，聚合数值不受影响。
const BIG_INT_ID_FIELDS = ['logid', 'session_id'];
const BIG_INT_ID_PATTERN = new RegExp(
  `"(?:${BIG_INT_ID_FIELDS.join('|')})"\\s*:\\s*(\\d{16,})`,
  'g',
);

function parseResponseText(text) {
  if (typeof text !== 'string') return text;
  const normalized = text.replace(
    BIG_INT_ID_PATTERN,
    (match, digits) => match.replace(digits, `"${digits}"`),
  );
  try {
    return JSON.parse(normalized);
  } catch (e) {
    return text;
  }
}

const request = axios.create({
  timeout: 30000,
  transformResponse: [parseResponseText],
});

request.interceptors.request.use(
  (config) => {
    config.transformRequest = [
      (data) => {
        data = JSON.stringify(data);
        return data;
      },
    ];
    config.headers['Content-Type'] = 'application/json;';
    config.headers['X-Fe-Request-Id'] = uuidv4();
    config.headers['Accept-Language'] = getLang() || 'en';
    let user = store.getUser();
    if (user && !config.withoutAuth) {
      config.headers.Authorization = `Session ${user.sessionKey}`;
    }
    config.url = `${window.location.protocol}//${window.location.host}/open-api/v1/${config.url}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

request.interceptors.response.use(
  (response) => {
    if (response.data === 'null') {
      response.data = '{}';
    }
    return response;
  },
  (error) => {
    if (error.response) {
      if (error.response.isSilent) {
        return error.response;
      }

      let errorMsg = error.response.data;
      if (typeof errorMsg === 'string') {
        try {
          errorMsg = JSON.parse(errorMsg);
        } catch (e) {}
      }

      if (!errorMsg) {
        Vue.prototype.$Notice.error({
          title: i18n.t('com.tipError') + i18n.t('com.tipNetworkFail'),
          duration: 0,
          render: (h) => {
            return h('div', [i18n.t('com.tipNetworkFail')]);
          },
        });
        return error.response;
      }

      if (errorMsg.ErrMsg) {
        error.response.errMsg =
          errorMsg.ErrMsg.split(':')[1] || errorMsg.ErrMsg;
      }
      error.response.data = errorMsg.Data || errorMsg;

      if (error.response.config.unneedTips) {
        error.response.isSilent = true;
        return error.response;
      }

      if (error.response.status === 401 || error.response.status === 402) {
        if (error.response.config.withoutAuth) {
          error.response.isSilent = true;
          return error.response;
        }

        if (error.response.status === 401) {
          store.removeUserData();
        }

        const errMsg = (errorMsg.ErrMsg || '').split(':')[1] || errorMsg.ErrMsg;
        Vue.prototype.$Modal.error({
          title: 'Error',
          content: errMsg,
          onOk: () => {
            if (router.currentRoute.name !== store.getLoginRoute()) {
              router.push({
                name: store.getLoginRoute(),
              });
            }
          },
        });
        error.response.isSilent = true;
        return error.response;
      }

      const splitIndex = (errorMsg.ErrMsg || '').indexOf(':') + 1;
      const title = (errorMsg.ErrMsg || '').slice(0, splitIndex - 1) || 'Error';
      const content =
        (errorMsg.ErrMsg || '').slice(splitIndex) || errorMsg.ErrMsg;
      Vue.prototype.$Notice.error({
        title,
        render: (h) => {
          return h('div', [h('span', content), ' ']);
        },
        duration: 0,
      });
      error.response.isSilent = true;
    }
    return error.response;
  },
);

const requestPlugin = {
  install(Vue) {
    Vue.prototype.$request = request;
  },
};

export default requestPlugin;
export { request };
