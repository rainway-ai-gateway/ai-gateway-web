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
export default [
  {
    component: (r) =>
      require.ensure(
        [],
        () => r(require('../modules/Login/loginPassword.vue')),
        'login_password',
      ),
    path: '/login',
    name: 'LoginPassword',
  },
  {
    component: (r) =>
      require.ensure(
        [],
        () => r(require('../layout/BaseView.vue')),
        'products',
      ),
    path: '/',
    name: 'base-view',
    redirect: {
      name: 'product.home',
    },
    children: [
      {
        component: (r) =>
          require.ensure([], () => r(require('../modules/Login/Home')), 'home'),
        path: '',
        name: 'product.home',
      },
      {
        component: (r) =>
          require.ensure([], () => r(require('../modules/User')), 'user'),
        path: 'user',
        name: 'user.list',
      },
      {
        component: (r) =>
          require.ensure(
            [],
            () => r(require('../modules/Providers')),
            'Provider.list',
          ),
        path: 'providers',
        name: 'Provider.list',
      },
      {
        component: (r) =>
          require.ensure(
            [],
            () => r(require('../modules/Clusters')),
            'cluster.list',
          ),
        path: 'cluster',
        name: 'AICluster.list',
      },
      {
        component: (r) =>
          require.ensure(
            [],
            () => r(require('../modules/RouteTable')),
            'route-table',
          ),
        path: 'route-tables',
        name: 'AdvanceRouteRule.list',
      },
      {
        component: (r) =>
          require.ensure([], () => r(require('../modules/APIKey')), 'APIKey'),
        path: 'api-key',
        name: 'APIKey.list',
      },
      {
        component: (r) =>
          require.ensure(
            [],
            () => r(require('../modules/Entity')),
            'Entity.list',
          ),
        path: 'Entity',
        name: 'Entity.list',
      },
      {
        component: (r) =>
          require.ensure(
            [],
            () => r(require('../modules/EppPool')),
            'EppPool.list',
          ),
        path: 'epp',
        name: 'EppPool.list',
      },
      {
        component: (r) =>
          require.ensure(
            [],
            () => r(require('../modules/ModelPrices')),
            'ModelPrice.list',
          ),
        path: 'model-prices',
        name: 'ModelPrice.list',
      },
      {
        component: (r) =>
          require.ensure(
            [],
            () => r(require('../modules/OperationLogs')),
            'OperationLog.list',
          ),
        path: 'operation-logs',
        name: 'OperationLog.list',
      },
      {
        component: r => require.ensure([], () => r(require('../modules/Cert')), 'certs.list'),
        path: 'cert',
        name: 'certs.list'
      },
      {
        component: (r) =>
          require.ensure(
            [],
            () => r(require('../modules/Report')),
            'report.list',
          ),
        path: 'report',
        name: 'report.list',
      }
    ],
  },
  {
    component: (r) =>
      require.ensure([], () => r(require('src/layout/404')), '404'),
    path: '*',
  },
];
