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
<template>
  <div class="operation-logs">
    <div class="filter-bar">
      <div class="filter-item">
        <label>{{ $t('operationLogs.startTime') }}</label>
        <DatePicker
          v-model="startTime"
          type="datetime"
          format="yyyy-MM-dd HH:mm:ss"
          editable
          :placeholder="$t('operationLogs.startTime')"
          style="width: 200px;"
          @on-change="onStartTimeChange"
        ></DatePicker>
      </div>
      <div class="filter-item">
        <label>{{ $t('operationLogs.endTime') }}</label>
        <DatePicker
          v-model="endTime"
          type="datetime"
          format="yyyy-MM-dd HH:mm:ss"
          editable
          :placeholder="$t('operationLogs.endTime')"
          style="width: 200px;"
          @on-change="onEndTimeChange"
        ></DatePicker>
      </div>
      <Button
        type="primary"
        size="small"
        @click="onQuery"
        >{{ $t('operationLogs.query') }}</Button
      >
    </div>

    <pageTable
      :key="tableKey"
      ref="logTable"
      :columns="columns"
      :tableData="tableData"
      :loading="loading"
      :total="total"
      :server-pagination="true"
      :current-page="page"
      :page-size="pageSize"
      @on-page-change="onPageChange"
      @on-search-change="onSearchChange"
      @on-sort-change="onSortChange"
    />

    <Drawer
      v-model="drawerVisible"
      :title="$t('operationLogs.detailTitle')"
      width="720"
      :mask-closable="true"
    >
      <div v-if="currentData" class="detail-content">
        <div class="field-row">
          <div class="field-cell">
            <p class="field-label">{{ $t('operationLogs.operatorType') }}</p>
            <p class="field-value">
              {{ operatorTypeLabel(currentData.operator_type) }}
            </p>
          </div>
          <div class="field-cell">
            <p class="field-label">{{ $t('operationLogs.operatorName') }}</p>
            <p class="field-value">{{ currentData.operator_name || '-' }}</p>
          </div>
        </div>
        <div class="field-row">
          <div class="field-cell">
            <p class="field-label">{{ $t('operationLogs.action') }}</p>
            <p class="field-value">
              <Tag
                v-if="currentData.action"
                :color="actionColor(currentData.action)"
                >{{ currentData.action }}</Tag
              >
              <span v-else>-</span>
            </p>
          </div>
          <div class="field-cell">
            <p class="field-label">{{ $t('operationLogs.resourceType') }}</p>
            <p class="field-value">
              {{ resourceTypeLabel(currentData.resource_type) }}
            </p>
          </div>
        </div>
        <div class="field-row">
          <div class="field-cell">
            <p class="field-label">{{ $t('operationLogs.resourceId') }}</p>
            <p class="field-value">{{ currentData.resource_id || '-' }}</p>
          </div>
          <div class="field-cell">
            <p class="field-label">{{ $t('operationLogs.resourceName') }}</p>
            <p class="field-value">{{ currentData.resource_name || '-' }}</p>
          </div>
        </div>
        <div class="field-row">
          <div class="field-cell">
            <p class="field-label">
              {{ $t('operationLogs.parentResourceId') }}
            </p>
            <p class="field-value">
              {{ currentData.resource_parent_id || '-' }}
            </p>
          </div>
          <div class="field-cell">
            <p class="field-label">{{ $t('operationLogs.status') }}</p>
            <p class="field-value">
              <Tag
                v-if="currentData.status === 1"
                color="green"
                >{{ $t('operationLogs.success') }}</Tag
              >
              <Tag v-else color="red">{{ $t('operationLogs.failed') }}</Tag>
            </p>
          </div>
        </div>
        <div v-if="currentData.error_msg" class="field-row">
          <div class="field-cell" style="flex: 0 0 100%;">
            <p class="field-label">{{ $t('operationLogs.errorMsg') }}</p>
            <p class="field-value error-text">{{ currentData.error_msg }}</p>
          </div>
        </div>
        <div v-if="currentData.change_summary" class="change-summary">
          <p class="summary-title">{{ $t('operationLogs.changeSummary') }}</p>
          <div class="summary-section">
            <p class="section-label">{{ $t('operationLogs.before') }}</p>
            <div
              v-if="currentData.change_summary.before"
              class="json-viewer-wrap"
            >
              <json-viewer
                :value="currentData.change_summary.before"
                :expand-depth="3"
                sort
              />
            </div>
            <pre v-else class="json-pre">-</pre>
          </div>
          <div class="summary-section">
            <p class="section-label">{{ $t('operationLogs.after') }}</p>
            <div
              v-if="currentData.change_summary.after"
              class="json-viewer-wrap"
            >
              <json-viewer
                :value="currentData.change_summary.after"
                :expand-depth="3"
                sort
              />
            </div>
            <pre v-else class="json-pre">-</pre>
          </div>
          <p class="diff-keys">
            {{ $t('operationLogs.diffKeys') }}:
            <span class="diff-value">{{
              (currentData.change_summary.diff_keys || []).join(', ') || '-'
            }}</span>
          </p>
        </div>
        <div class="field-row">
          <div class="field-cell">
            <p class="field-label">{{ $t('operationLogs.requestPath') }}</p>
            <p class="field-value mono-text">
              {{ currentData.request_path || '-' }}
            </p>
          </div>
          <div class="field-cell">
            <p class="field-label">{{ $t('operationLogs.requestMethod') }}</p>
            <p class="field-value">
              <Tag
                v-if="currentData.request_method"
                :color="methodColor(currentData.request_method)"
                >{{ currentData.request_method }}</Tag
              >
              <span v-else>-</span>
            </p>
          </div>
        </div>
        <div class="field-row">
          <div class="field-cell">
            <p class="field-label">{{ $t('operationLogs.clientIp') }}</p>
            <p class="field-value">{{ currentData.client_ip || '-' }}</p>
          </div>
          <div class="field-cell">
            <p class="field-label">{{ $t('operationLogs.userAgent') }}</p>
            <p class="field-value mono-text">
              {{ currentData.user_agent || '-' }}
            </p>
          </div>
        </div>
        <div class="field-row">
          <div class="field-cell">
            <p class="field-label">{{ $t('operationLogs.createdAt') }}</p>
            <p class="field-value">{{ formatTime(currentData.created_at) }}</p>
          </div>
          <div class="field-cell"></div>
        </div>
      </div>
    </Drawer>
  </div>
</template>

<script>
import pageTable from '@/components/table/pageTable';

const ACTION_OPTIONS = [
    'create', 'update', 'delete', 'reset', 'import', 'bind', 'unbind'
];

const RESOURCE_TYPE_OPTIONS = [
    'entity', 'entity_type', 'api_key', 'provider', 'cluster',
    'route', 'certificate', 'quota_plan',
    'model_price', 'batch', 'batch_file', 'user', 'token'
];

const RESOURCE_TYPE_LABEL_KEYS = {
    entity: 'resourceTypeEntity',
    entity_type: 'resourceTypeEntityType',
    api_key: 'resourceTypeApiKey',
    provider: 'resourceTypeProvider',
    cluster: 'resourceTypeCluster',
    route: 'resourceTypeRoute',
    certificate: 'resourceTypeCertificate',
    quota_plan: 'resourceTypeQuotaPlan',
    model_price: 'resourceTypeModelPrice',
    batch: 'resourceTypeBatch',
    batch_file: 'resourceTypeBatchFile',
    user: 'resourceTypeUser',
    token: 'resourceTypeToken'
};

const ACTION_COLOR_MAP = {
    create: 'green',
    update: 'blue',
    delete: 'red',
    reset: 'orange',
    import: 'purple',
    bind: 'cyan',
    unbind: 'volcano'
};

const METHOD_COLOR_MAP = {
    GET: 'blue',
    POST: 'green',
    PUT: 'orange',
    PATCH: 'gold',
    DELETE: 'red'
};

export default {
    name: 'OperationLogs',

    components: {
        pageTable
    },

    data() {
        return {
            loading: false,
            tableData: [],
            total: 0,
            page: 1,
            pageSize: 20,
            drawerVisible: false,
            currentData: null,
            searchParams: {},
            startTime: '',
            endTime: '',
            tableKey: 0
        };
    },

    computed: {
        columns() {
            return [
                {
                    title: this.$t('operationLogs.operatorName'),
                    key: 'operator_name',
                    searchable: true,
                    sortable: 'custom'
                },
                {
                    title: this.$t('operationLogs.action'),
                    key: 'action',
                    searchable: true,
                    searchType: 'select',
                    searchFilters: ACTION_OPTIONS.map(a => ({
                        label: a,
                        value: a
                    })),
                    render: (h, params) => {
                        const action = params.row.action;
                        const color = ACTION_COLOR_MAP[action] || 'default';
                        return h('Tag', { props: { color } }, action);
                    }
                },
                {
                    title: this.$t('operationLogs.resourceType'),
                    key: 'resource_type',
                    searchable: true,
                    searchType: 'select',
                    searchFilters: RESOURCE_TYPE_OPTIONS.map(r => ({
                        label: this.resourceTypeLabel(r),
                        value: r
                    })),
                    render: (h, params) =>
                        h('span', this.resourceTypeLabel(params.row.resource_type))
                },
                {
                    title: this.$t('operationLogs.resourceName'),
                    key: 'resource_name',
                    searchable: true,
                    sortable: 'custom'
                },
                {
                    title: this.$t('operationLogs.status'),
                    key: 'status',
                    searchable: true,
                    searchType: 'select',
                    searchFilters: [
                        {
                            label: this.$t('operationLogs.success'),
                            value: 1
                        },
                        {
                            label: this.$t('operationLogs.failed'),
                            value: 2
                        }
                    ],
                    render: (h, params) => {
                        if (params.row.status === 1) {
                            return h(
                                'Tag',
                                { props: { color: 'green' } },
                                this.$t('operationLogs.success')
                            );
                        }
                        return h(
                            'Tag',
                            { props: { color: 'red' } },
                            this.$t('operationLogs.failed')
                        );
                    }
                },
                {
                    title: this.$t('operationLogs.createdAt'),
                    key: 'created_at',
                    width: 180,
                    render: (h, params) =>
                        h('span', this.formatTime(params.row.created_at))
                },
                {
                    title: this.$t('com.operation'),
                    key: 'operation',
                    width: 80,
                    render: (h, params) =>
                        h(
                            'Button',
                            {
                                props: { size: 'small', type: 'primary' },
                                on: {
                                    click: () => this.onDetail(params.row)
                                }
                            },
                            this.$t('operationLogs.detail')
                        )
                }
            ];
        }
    },

    mounted() {
        this.fetchData();
    },

    methods: {
        formatTime(timestamp) {
            if (!timestamp) return '-';
            const date = new Date(timestamp * 1000);
            if (isNaN(date.getTime())) return '-';
            const pad = n => (n < 10 ? '0' + n : n);
            return (
                date.getFullYear() +
                '-' +
                pad(date.getMonth() + 1) +
                '-' +
                pad(date.getDate()) +
                ' ' +
                pad(date.getHours()) +
                ':' +
                pad(date.getMinutes()) +
                ':' +
                pad(date.getSeconds())
            );
        },

        toUnixTimestamp(date) {
            if (!date) return '';
            if (date instanceof Date) {
                const time = date.getTime();
                return isNaN(time) ? '' : Math.floor(time / 1000);
            }
            if (typeof date === 'number') {
                return Math.floor(date / 1000);
            }
            if (typeof date === 'string') {
                const trimmed = date.trim();
                const matched = trimmed.match(
                    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
                );
                if (matched) {
                    const parsed = new Date(
                        Number(matched[1]),
                        Number(matched[2]) - 1,
                        Number(matched[3]),
                        Number(matched[4]),
                        Number(matched[5]),
                        Number(matched[6])
                    );
                    const time = parsed.getTime();
                    return isNaN(time) ? '' : Math.floor(time / 1000);
                }
                const parsed = new Date(trimmed);
                const time = parsed.getTime();
                return isNaN(time) ? '' : Math.floor(time / 1000);
            }
            return '';
        },

        actionColor(action) {
            return ACTION_COLOR_MAP[action] || 'default';
        },

        methodColor(method) {
            return METHOD_COLOR_MAP[method] || 'default';
        },

        operatorTypeLabel(type) {
            if (type === 0) return this.$t('operationLogs.operatorUser');
            if (type === 1) return this.$t('operationLogs.operatorToken');
            return '-';
        },

        resourceTypeLabel(type) {
            if (!type) return '-';
            const key = RESOURCE_TYPE_LABEL_KEYS[type];
            return key ? this.$t(`operationLogs.${key}`) : type;
        },

        fetchData() {
            this.loading = true;
            const params = {
                page: this.page,
                page_size: this.pageSize,
                ...this.searchParams
            };
            if (this.startTime) {
                params.start_time = this.toUnixTimestamp(this.startTime);
            }
            if (this.endTime) {
                params.end_time = this.toUnixTimestamp(this.endTime);
            }
            return this.$request({
                url: 'operation-logs',
                method: 'get',
                params,
                openapi: true
            })
                .then(res => {
                    if (res.status === 200) {
                        const data = res.data.Data || {};
                        this.tableData = data.list || [];
                        this.total =
                            (data.pagination && data.pagination.total) ||
                            data.total ||
                            0;
                    } else {
                        this.$Message.error(
                            this.$t('operationLogs.loadFailed')
                        );
                    }
                })
                .catch(err => {
                    console.error('加载操作日志失败:', err);
                    this.$Message.error(this.$t('operationLogs.loadFailed'));
                })
                .finally(() => {
                    this.loading = false;
                });
        },

        onPageChange(pageInfo) {
            this.page = pageInfo.page;
            this.pageSize = pageInfo.pageSize;
            this.fetchData();
        },

        onSearchChange(filters) {
            this.searchParams = filters || {};
            this.page = 1;
            this.fetchData();
        },

        onQuery() {
            this.page = 1;
            this.fetchData();
        },

        onStartTimeChange(value) {
            this.startTime = value;
        },

        onEndTimeChange(value) {
            this.endTime = value;
        },

        onSortChange() {
            // TODO: implement server-side sorting
        },

        onDetail(row) {
            this.currentData = row;
            this.drawerVisible = true;
        }
    }
};
</script>

<style lang="less" scoped>
.operation-logs {
    .filter-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;

        .filter-item {
            display: flex;
            align-items: center;
            gap: 6px;

            label {
                white-space: nowrap;
            }
        }
    }
}

// Drawer 默认 transfer 到 body，详情样式不能嵌套在 .operation-logs 下
.detail-content {
    padding: 0 8px;

    .field-row {
        display: flex;
        margin-bottom: 16px;
    }

    .field-cell {
        flex: 1;
        min-width: 0;
        padding-right: 12px;

        .field-label {
            color: #808695;
            margin: 0 0 4px;
            font-size: 12px;
        }

        .field-value {
            margin: 0;
            word-break: break-all;

            &.error-text {
                color: #ed4014;
            }

            &.mono-text {
                font-size: 12px;
            }
        }
    }

    .change-summary {
        margin-bottom: 16px;

        .summary-title {
            font-weight: 600;
            margin-bottom: 8px;
        }

        .summary-section {
            margin-bottom: 8px;

            .section-label {
                padding: 8px 12px;
                cursor: pointer;
                font-size: 13px;
                color: #2d8cf0;
                user-select: none;
                margin: 0;
            }

            .json-viewer-wrap {
                border: 1px solid #e8eaec;
                border-radius: 4px;
                overflow: hidden;
                background: #f5f7fa;

                ::v-deep .jv-container {
                    background: #f5f7fa;
                }
            }

            .json-pre {
                background: #f5f7fa;
                padding: 8px 12px;
                border: 1px solid #e8eaec;
                border-radius: 4px;
                font-size: 12px;
                white-space: pre-wrap;
                word-break: break-all;
                max-height: 400px;
                overflow-y: auto;
                margin: 0;
            }
        }

        .diff-keys {
            margin-top: 4px;

            .diff-value {
                color: #2d8cf0;
            }
        }
    }
}
</style>
