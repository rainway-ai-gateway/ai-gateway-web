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
  <div class="security-page">
    <Card :title="$t('security.triggerCardTitle')" class="form-card">
      <Form :label-width="96">
        <div class="sec-form-row">
          <FormItem class="sec-form-item">
            <span slot="label" class="sec-form-label">
              {{ $t('security.mode') }}
              <Tooltip
                :content="$t('security.modeHelp')"
                max-width="360"
                placement="bottom-start"
              >
                <Icon
                  type="ios-help-circle-outline"
                  class="sec-help-icon"
                />
              </Tooltip>
            </span>
            <Select v-model="mode" style="width: 100%;">
              <Option value="reencrypt">{{
                $t('security.modeReencrypt')
              }}</Option>
              <Option value="decrypt">{{ $t('security.modeDecrypt') }}</Option>
            </Select>
          </FormItem>
          <FormItem :label="$t('security.scope')" class="sec-form-item">
            <Select v-model="scope" style="width: 100%;">
              <Option value="all">{{ $t('security.scopeAll') }}</Option>
              <Option value="providers">{{
                $t('security.scopeProviders')
              }}</Option>
              <Option value="api_keys">{{
                $t('security.scopeApiKeys')
              }}</Option>
            </Select>
          </FormItem>
        </div>
        <FormItem :label="$t('security.dryRun')">
          <div class="sec-switch-row">
            <i-switch v-model="dryRun" />
            <span class="sec-hint">{{ $t('security.dryRunHint') }}</span>
          </div>
        </FormItem>
        <div>
          <Button
            v-has
            type="primary"
            :loading="triggering"
            @click="onTrigger"
            >{{ $t('security.trigger') }}</Button
          >
        </div>
        <Alert
          v-if="conflictMsg"
          type="error"
          show-icon
          class="sec-conflict"
          >{{ conflictMsg }}</Alert
        >
      </Form>
    </Card>

    <Card :title="$t('security.runningCardTitle')" class="form-card">
      <div v-if="!runningTask" class="sec-empty">
        {{ $t('security.noRunningTask') }}
      </div>
      <sweep-view v-else :detail="runningTask" />
    </Card>

    <Card :title="$t('security.historyCardTitle')" class="form-card">
      <div class="sec-filter-bar">
        <div class="sec-filter-item">
          <span class="sec-filter-label">{{ $t('security.filterStatus') }}</span>
          <Select
            v-model="filter.status"
            class="sec-filter-control"
            @on-change="onFilterChange"
          >
            <Option value="">{{ $t('security.allOption') }}</Option>
            <Option value="running">{{ $t('security.statusRunning') }}</Option>
            <Option value="succeeded">{{
              $t('security.statusSucceeded')
            }}</Option>
            <Option value="failed">{{ $t('security.statusFailed') }}</Option>
          </Select>
        </div>
        <div class="sec-filter-item">
          <span class="sec-filter-label">{{ $t('security.filterMode') }}</span>
          <Select
            v-model="filter.mode"
            class="sec-filter-control"
            @on-change="onFilterChange"
          >
            <Option value="">{{ $t('security.allOption') }}</Option>
            <Option value="reencrypt">{{
              $t('security.modeReencrypt')
            }}</Option>
            <Option value="decrypt">{{ $t('security.modeDecrypt') }}</Option>
          </Select>
        </div>
        <div class="sec-filter-item">
          <span class="sec-filter-label">{{ $t('security.filterScope') }}</span>
          <Select
            v-model="filter.scope"
            class="sec-filter-control"
            @on-change="onFilterChange"
          >
            <Option value="">{{ $t('security.allOption') }}</Option>
            <Option value="all">{{ $t('security.scopeAll') }}</Option>
            <Option value="providers">{{
              $t('security.scopeProviders')
            }}</Option>
            <Option value="api_keys">{{
              $t('security.scopeApiKeys')
            }}</Option>
          </Select>
        </div>
        <div class="sec-filter-item">
          <span class="sec-filter-label">{{
            $t('security.filterDryRun')
          }}</span>
          <Select
            v-model="filter.dry_run"
            class="sec-filter-control"
            @on-change="onFilterChange"
          >
            <Option value="">{{ $t('security.allOption') }}</Option>
            <Option value="true">{{ $t('security.filterDryRunYes') }}</Option>
            <Option value="false">{{ $t('security.filterDryRunNo') }}</Option>
          </Select>
        </div>
        <div class="sec-filter-item">
          <span class="sec-filter-label">{{
            $t('security.filterStartTime')
          }}</span>
          <DatePicker
            v-model="filter.start_time"
            type="datetime"
            format="yyyy-MM-dd HH:mm:ss"
            :editable="false"
            :placeholder="$t('security.filterStartTime')"
            class="sec-filter-control"
            @on-change="onStartTimeChange"
          />
        </div>
        <div class="sec-filter-item">
          <span class="sec-filter-label">{{
            $t('security.filterEndTime')
          }}</span>
          <DatePicker
            v-model="filter.end_time"
            type="datetime"
            format="yyyy-MM-dd HH:mm:ss"
            :editable="false"
            :placeholder="$t('security.filterEndTime')"
            class="sec-filter-control"
            @on-change="onEndTimeChange"
          />
        </div>
        <div class="sec-filter-item sec-filter-actions">
          <Button type="primary" size="small" @click="onSearch">{{
            $t('security.search')
          }}</Button>
          <Button size="small" @click="onReset">{{
            $t('security.reset')
          }}</Button>
        </div>
      </div>

      <div v-if="!list.length" class="sec-empty">
        {{ $t('security.noHistory') }}
      </div>
      <Table
        v-else
        :columns="columns"
        :data="list"
        :loading="loading"
        border
        style="width: 100%;"
        @on-sort-change="onSortChange"
      />
      <Page
        v-if="total > 0"
        :total="total"
        :current="page"
        :page-size="pageSize"
        :page-size-opts="pageSizeOpts"
        show-total
        show-sizer
        class="sec-pager"
        @on-change="onPageChange"
        @on-page-size-change="onPageSizeChange"
      />
    </Card>

    <Drawer
      v-model="detailVisible"
      :title="$t('security.detailTitle')"
      :width="60"
      :mask-closable="true"
    >
      <sweep-view v-if="detail" :detail="detail" />
    </Drawer>
  </div>
</template>

<script>
import SweepView from './components/SweepView.vue';

const MODE_LABELS = {
    reencrypt: 'modeReencrypt',
    decrypt: 'modeDecrypt'
};

const SCOPE_LABELS = {
    all: 'scopeAll',
    providers: 'scopeProviders',
    api_keys: 'scopeApiKeys'
};

const DEFAULT_SORT = {
    by: 'started_at',
    order: 'desc'
};

const EMPTY_FILTER = () => ({
    status: '',
    mode: '',
    scope: '',
    dry_run: '',
    start_time: '',
    end_time: ''
});

export default {
    name: 'Security',

    components: {
        SweepView
    },

    data() {
        return {
            mode: 'reencrypt',
            scope: 'all',
            dryRun: false,
            triggering: false,
            conflictMsg: '',
            // 列表数据来源：GET security/reencrypt-sweeps（含运行中任务）
            list: [],
            total: 0,
            page: 1,
            pageSize: 20,
            pageSizeOpts: [20, 50, 100],
            loading: false,
            filter: EMPTY_FILTER(),
            sortBy: DEFAULT_SORT.by,
            sortOrder: DEFAULT_SORT.order,
            // 本地跟踪的运行中任务（触发响应 / 409 持有者），用于无列表命中时兜底展示
            activeTask: null,
            pollTimer: null,
            pollInterval: 800,
            detailVisible: false,
            detail: null
        };
    },

    computed: {
        runningTask() {
            const fromList = this.list.find(t => t.status === 'running');
            if (fromList) return fromList;
            if (this.activeTask && this.activeTask.status === 'running') {
                return this.activeTask;
            }
            return null;
        },

        columns() {
            return [
                {
                    title: this.$t('security.columnTaskId'),
                    key: 'task_id',
                    minWidth: 200,
                    sortable: 'custom'
                },
                {
                    title: this.$t('security.columnStatus'),
                    key: 'status',
                    minWidth: 100,
                    render: (h, params) =>
                        h(
                            'Tag',
                            {
                                props: {
                                    color: this.statusTagColor(params.row.status)
                                }
                            },
                            this.statusText(params.row.status)
                        )
                },
                {
                    title: this.$t('security.columnMode'),
                    key: 'mode',
                    minWidth: 100,
                    render: (h, params) => h('span', this.modeText(params.row.mode))
                },
                {
                    title: this.$t('security.columnScope'),
                    key: 'scope',
                    minWidth: 130,
                    render: (h, params) =>
                        h('span', this.scopeText(params.row.scope))
                },
                {
                    title: this.$t('security.columnDryRun'),
                    key: 'dry_run',
                    minWidth: 80,
                    render: (h, params) =>
                        h(
                            'span',
                            params.row.dry_run
                                ? this.$t('security.dryRunYesShort')
                                : this.$t('security.dryRunNoShort')
                        )
                },
                {
                    title: this.$t('security.columnCreatedBy'),
                    key: 'created_by',
                    minWidth: 110,
                    render: (h, params) =>
                        h('span', params.row.created_by || '-')
                },
                {
                    title: this.$t('security.columnStartedAt'),
                    key: 'started_at',
                    minWidth: 180,
                    sortable: 'custom',
                    render: (h, params) =>
                        h('span', params.row.started_at || '-')
                },
                {
                    title: this.$t('security.columnDuration'),
                    key: 'duration_ms',
                    minWidth: 100,
                    render: (h, params) =>
                        h(
                            'span',
                            params.row.status === 'running'
                                ? '-'
                                : String(params.row.duration_ms || 0)
                        )
                },
                {
                    title: this.$t('security.columnOperation'),
                    key: 'operation',
                    width: 100,
                    render: (h, params) =>
                        h(
                            'Button',
                            {
                                props: { type: 'primary', size: 'small' },
                                on: { click: () => this.onDetail(params.row) }
                            },
                            this.$t('security.detail')
                        )
                }
            ];
        }
    },

    mounted() {
        this.fetchList();
    },

    beforeDestroy() {
        this.stopPolling();
    },

    methods: {
        statusTagColor(status) {
            if (status === 'running') return 'primary';
            if (status === 'succeeded') return 'success';
            return 'error';
        },

        statusText(status) {
            if (status === 'running') return this.$t('security.statusRunning');
            if (status === 'succeeded') return this.$t('security.statusSucceeded');
            return this.$t('security.statusFailed');
        },

        modeText(mode) {
            const key = MODE_LABELS[mode];
            return key ? this.$t('security.' + key) : mode || '-';
        },

        scopeText(scope) {
            const key = SCOPE_LABELS[scope];
            return key ? this.$t('security.' + key) : scope || '-';
        },

        // 本地时间（DatePicker）转 RFC3339；end_time 早于 start_time 由后端 422 归因
        toRfc3339(value) {
            if (!value) return '';
            let date;
            if (value instanceof Date) {
                date = value;
            } else {
                date = new Date(String(value).replace(' ', 'T'));
            }
            return isNaN(date.getTime()) ? '' : date.toISOString();
        },

        buildListParams() {
            const params = {
                page: this.page,
                page_size: this.pageSize,
                sort_by: this.sortBy,
                sort_order: this.sortOrder
            };
            const f = this.filter;
            if (f.status) params.status = f.status;
            if (f.mode) params.mode = f.mode;
            if (f.scope) params.scope = f.scope;
            if (f.dry_run !== '') params.dry_run = f.dry_run === 'true';
            const start = this.toRfc3339(f.start_time);
            if (start) params.start_time = start;
            const end = this.toRfc3339(f.end_time);
            if (end) params.end_time = end;
            return params;
        },

        fetchList() {
            this.loading = true;
            return this.$request({
                url: 'security/reencrypt-sweeps',
                method: 'get',
                params: this.buildListParams(),
                openapi: true
            })
                .then(res => {
                    if (res && res.status === 200) {
                        const data = (res.data && res.data.Data) || {};
                        this.list = data.list || [];
                        this.total =
                            (data.pagination && data.pagination.total) || 0;
                        // 服务端存在运行中任务且本地未在轮询：开始轮询其进度
                        const running = this.list.find(
                            t => t.status === 'running'
                        );
                        if (running && !this.pollTimer) {
                            this.startPolling(running.task_id);
                        }
                    } else if (res && !res.isSilent) {
                        // 422 等已由拦截器给出字段级归因提示（isSilent）
                        this.$Message.error(this.$t('security.loadFailed'));
                    }
                })
                .catch(err => {
                    console.error('加载收敛任务列表失败:', err);
                    this.$Message.error(this.$t('security.loadFailed'));
                })
                .finally(() => {
                    this.loading = false;
                });
        },

        onFilterChange() {
            this.page = 1;
            this.fetchList();
        },

        onSearch() {
            this.page = 1;
            this.fetchList();
        },

        onReset() {
            this.filter = EMPTY_FILTER();
            this.sortBy = DEFAULT_SORT.by;
            this.sortOrder = DEFAULT_SORT.order;
            this.page = 1;
            this.fetchList();
        },

        onStartTimeChange(value) {
            this.filter.start_time = value || '';
            this.onFilterChange();
        },

        onEndTimeChange(value) {
            this.filter.end_time = value || '';
            this.onFilterChange();
        },

        onPageChange(page) {
            this.page = page;
            this.fetchList();
        },

        onPageSizeChange(size) {
            this.pageSize = size;
            this.page = 1;
            this.fetchList();
        },

        // 列头仅 started_at / task_id 可排序；其他值回落默认（对齐 sort_by 有效字段）
        onSortChange(sortInfo) {
            const key = sortInfo && sortInfo.key;
            const order = sortInfo && sortInfo.order;
            if (key !== 'started_at' && key !== 'task_id') return;
            if (order === 'normal') {
                this.sortBy = DEFAULT_SORT.by;
                this.sortOrder = DEFAULT_SORT.order;
            } else {
                this.sortBy = key;
                this.sortOrder = order;
            }
            this.page = 1;
            this.fetchList();
        },

        // 从 409 错误响应中提取持有者 task_id（归因文案 / Data 中携带）
        extractTaskId(res) {
            const parts = [];
            if (res && res.errMsg) parts.push(res.errMsg);
            try {
                if (res && res.data) parts.push(JSON.stringify(res.data));
            } catch (e) {}
            const matched = parts.join(' ').match(/rsp-[A-Za-z0-9_-]+/);
            return matched ? matched[0] : '';
        },

        onTrigger() {
            // 集群级单例互斥：前端先行拦截（本地已知运行中任务）
            const holder = this.runningTask;
            if (holder) {
                this.conflictMsg = this.$t('security.conflictPrefix', {
                    id: holder.task_id
                });
                this.$Message.error(
                    this.$t('security.conflictToast', { id: holder.task_id })
                );
                return;
            }

            this.triggering = true;
            this.conflictMsg = '';
            this.$request({
                url: 'security/reencrypt-sweeps',
                method: 'post',
                openapi: true,
                unneedTips: true,
                data: {
                    mode: this.mode,
                    dry_run: this.dryRun,
                    scope: this.scope
                }
            })
                .then(res => {
                    if (res && res.status === 200) {
                        const data = res.data && res.data.Data;
                        if (!data || !data.task_id) {
                            this.$Message.error(
                                this.$t('security.triggerFailed')
                            );
                            return;
                        }
                        // POST 响应不含 created_by/summary，本地先占位再以列表/轮询补齐
                        this.activeTask = Object.assign({}, data, {
                            created_by: ''
                        });
                        this.$Message.success(
                            this.$t('security.triggerSuccess', {
                                id: data.task_id
                            })
                        );
                        this.page = 1;
                        this.fetchList();
                        this.startPolling(data.task_id);
                    } else if (res && res.status === 409) {
                        // 其它实例持有运行中任务：直接轮询该任务，不排队
                        const holderId = this.extractTaskId(res) || '-';
                        this.conflictMsg = this.$t('security.conflictPrefix', {
                            id: holderId
                        });
                        this.$Message.error(
                            this.$t('security.conflictToast', { id: holderId })
                        );
                        if (holderId && holderId !== '-') {
                            this.activeTask = {
                                task_id: holderId,
                                status: 'running'
                            };
                            this.startPolling(holderId);
                        }
                    } else {
                        this.$Message.error(this.$t('security.triggerFailed'));
                    }
                })
                .finally(() => {
                    this.triggering = false;
                });
        },

        onDetail(row) {
            this.detail = row;
            this.detailVisible = true;
        },

        startPolling(taskId) {
            this.stopPolling();
            this.pollTimer = setInterval(
                () => this.pollTask(taskId),
                this.pollInterval
            );
        },

        stopPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        },

        pollTask(taskId) {
            this.$request({
                url: this.$urlFormat('security/reencrypt-sweeps/{id}', {
                    id: taskId
                }),
                method: 'get',
                openapi: true,
                unneedTips: true
            }).then(res => {
                if (res && res.status === 200) {
                    const data = res.data && res.data.Data;
                    if (!data) return;
                    // 去重合并：按 task_id 就地更新列表项
                    const index = this.list.findIndex(
                        t => t.task_id === taskId
                    );
                    if (index >= 0) {
                        this.$set(
                            this.list,
                            index,
                            Object.assign({}, this.list[index], data)
                        );
                    }
                    if (this.activeTask && this.activeTask.task_id === taskId) {
                        this.activeTask = Object.assign(
                            {},
                            this.activeTask,
                            data
                        );
                    }
                    if (this.detail && this.detail.task_id === taskId) {
                        // 详情抽屉正打开该任务：同步刷新
                        this.detail = Object.assign({}, this.detail, data);
                    }
                    if (data.status && data.status !== 'running') {
                        this.stopPolling();
                        this.activeTask = null;
                        // 完成后统计与耗时已落库，重取列表落定
                        this.fetchList();
                    }
                } else if (res && res.status === 404) {
                    this.$Message.error(
                        this.$t('security.taskNotFound', { id: taskId })
                    );
                    this.stopPolling();
                    this.activeTask = null;
                } else {
                    this.$Message.error(this.$t('security.loadFailed'));
                    this.stopPolling();
                }
            });
        }
    }
};
</script>

<style lang="less" scoped>
.security-page {
    .form-card {
        margin-bottom: 16px;
    }

    .sec-form-row {
        display: flex;
        gap: 24px;
        flex-wrap: wrap;
    }

    .sec-form-item {
        flex: 1;
        min-width: 220px;
    }

    .sec-form-label {
        display: inline-flex;
        align-items: center;
    }

    .sec-help-icon {
        margin-left: 4px;
        font-size: 16px;
        color: #2d8cf0;
        vertical-align: middle;
        cursor: help;
    }

    .sec-switch-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .sec-hint {
        color: #808695;
        font-size: 12px;
        line-height: 1.6;
    }

    .sec-conflict {
        margin-top: 12px;
    }

    .sec-filter-bar {
        display: flex;
        align-items: flex-end;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
    }

    .sec-filter-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .sec-filter-label {
        color: #515a6e;
        font-size: 12px;
    }

    .sec-filter-control {
        width: 180px;
    }

    .sec-filter-actions {
        flex-direction: row;
        gap: 8px;
    }

    .sec-pager {
        margin-top: 16px;
        text-align: right;
    }

    .sec-empty {
        color: #808695;
        font-size: 13px;
        padding: 8px 0;
    }
}
</style>