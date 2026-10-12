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
  <div class="batch-tasks">
    <div class="filter-bar">
      <div class="filter-item">
        <label>{{ $t('batchTasks.statusFilter') }}</label>
        <Select
          v-model="filter.status"
          clearable
          :placeholder="$t('batchTasks.allStatus')"
          style="width: 190px;"
        >
          <Option
            v-for="opt in statusOptions"
            :key="opt.value"
            :value="opt.value"
            >{{ opt.label }}</Option
          >
        </Select>
      </div>
      <div class="filter-item">
        <label>{{ $t('batchTasks.provider') }}</label>
        <Input
          v-model="filter.provider"
          :placeholder="$t('batchTasks.providerPlaceholder')"
          style="width: 160px;"
        />
      </div>
      <div class="filter-item">
        <label>{{ $t('batchTasks.apiKeyId') }}</label>
        <Input
          v-model="filter.api_key_id"
          :placeholder="$t('batchTasks.apiKeyIdPlaceholder')"
          style="width: 180px;"
          @on-enter="onQuery"
        />
      </div>
      <div class="filter-item">
        <label>{{ $t('batchTasks.startTime') }}</label>
        <DatePicker
          v-model="filter.start_time"
          type="datetime"
          format="yyyy-MM-dd HH:mm:ss"
          editable
          :placeholder="$t('batchTasks.startTime')"
          style="width: 200px;"
        ></DatePicker>
      </div>
      <div class="filter-item">
        <label>{{ $t('batchTasks.endTime') }}</label>
        <DatePicker
          v-model="filter.end_time"
          type="datetime"
          format="yyyy-MM-dd HH:mm:ss"
          editable
          :placeholder="$t('batchTasks.endTime')"
          style="width: 200px;"
        ></DatePicker>
      </div>
      <div class="filter-item">
        <Button type="primary" size="small" @click="onQuery">
          {{ $t('batchTasks.query') }}
        </Button>
      </div>
      <div class="filter-item">
        <Button size="small" @click="onReset">
          {{ $t('batchTasks.reset') }}
        </Button>
      </div>
    </div>

    <Table
      :columns="columns"
      :data="tableData"
      :loading="loading"
      border
    ></Table>

    <div class="batch-pager">
      <Button size="small" :disabled="!hasPrev" @click="onPrev">
        {{ $t('batchTasks.prevPage') }}
      </Button>
      <Button
        size="small"
        :disabled="!hasNext"
        style="margin-left: 8px;"
        @click="onNext"
      >
        {{ $t('batchTasks.nextPage') }}
      </Button>
    </div>

    <Drawer
      v-model="drawerVisible"
      :title="$t('batchTasks.detailTitle')"
      width="70%"
      :mask-closable="true"
    >
      <batch-view :detail="detail" :loading="detailLoading" />
    </Drawer>
  </div>
</template>

<script>
import BatchView from './components/BatchView.vue';

const PAGE_LIMIT = 20;

const TERMINAL_STATUSES = ['completed', 'expired', 'failed', 'cancelled'];

const STATUS_LIST = [
    'validating',
    'queued',
    'in_progress',
    'finalizing',
    'completed',
    'expired',
    'failed',
    'cancelled',
    'cancelling'
];

const STATUS_I18N = {
    validating: 'statusValidating',
    queued: 'statusQueued',
    in_progress: 'statusInProgress',
    finalizing: 'statusFinalizing',
    completed: 'statusCompleted',
    expired: 'statusExpired',
    failed: 'statusFailed',
    cancelled: 'statusCancelled',
    cancelling: 'statusCancelling'
};

const STATUS_TAG_TYPES = {
    validating: 'default',
    queued: 'primary',
    in_progress: 'primary',
    finalizing: 'warning',
    completed: 'success',
    expired: 'default',
    failed: 'error',
    cancelled: 'default',
    cancelling: 'warning'
};

const SETTLE_I18N = {
    reserved: 'settleReserved',
    settled: 'settleSettled',
    released: 'settleReleased'
};

const SETTLE_TAG_TYPES = {
    reserved: 'warning',
    settled: 'success',
    released: 'default'
};

function defaultFilter() {
    return {
        status: '',
        provider: '',
        api_key_id: '',
        start_time: '',
        end_time: ''
    };
}

export default {
    name: 'BatchTasks',

    components: {
        BatchView
    },

    data() {
        return {
            loading: false,
            tableData: [],
            // 主键游标分页：cursorStack 保存已访问游标，首页游标为空串（不传 cursor）
            cursorStack: [''],
            nextCursor: '',
            drawerVisible: false,
            detail: null,
            detailLoading: false,
            filter: defaultFilter()
        };
    },

    computed: {
        statusOptions() {
            return STATUS_LIST.map(value => ({
                value,
                label: this.statusLabel(value)
            }));
        },

        hasPrev() {
            return this.cursorStack.length > 1;
        },

        hasNext() {
            return !!this.nextCursor;
        },

        columns() {
            return [
                {
                    title: this.$t('batchTasks.batchId'),
                    key: 'batch_id',
                    minWidth: 170
                },
                {
                    title: this.$t('batchTasks.provider'),
                    key: 'provider',
                    minWidth: 100
                },
                {
                    title: this.$t('batchTasks.apiKeyId'),
                    key: 'api_key_id',
                    minWidth: 140
                },
                {
                    title: this.$t('batchTasks.entityId'),
                    key: 'entity_id',
                    minWidth: 100
                },
                {
                    title: this.$t('batchTasks.status'),
                    key: 'status',
                    minWidth: 150,
                    render: (h, params) =>
                        h(
                            'Tag',
                            {
                                props: {
                                    type: this.statusTagType(params.row.status)
                                }
                            },
                            this.statusLabel(params.row.status)
                        )
                },
                {
                    title: this.$t('batchTasks.requestCounts'),
                    key: 'request_counts',
                    minWidth: 150,
                    renderHeader: h =>
                        this.renderHelpHeader(
                            h,
                            this.$t('batchTasks.requestCounts'),
                            this.$t('batchTasks.requestCountsTip')
                        ),
                    render: (h, params) => {
                        const rc = params.row.request_counts || {};
                        return h(
                            'span',
                            `${rc.total || 0} / ${rc.completed || 0} / ${rc.failed || 0}`
                        );
                    }
                },
                {
                    title: this.$t('batchTasks.usage'),
                    key: 'usage',
                    minWidth: 150,
                    renderHeader: h =>
                        this.renderHelpHeader(
                            h,
                            this.$t('batchTasks.usage'),
                            this.$t('batchTasks.usageTip')
                        ),
                    render: (h, params) =>
                        h(
                            'span',
                            `${params.row.usage_input_tokens || 0} / ${params.row.usage_output_tokens || 0}`
                        )
                },
                {
                    title: this.$t('batchTasks.reserveUnits'),
                    key: 'reserve_units',
                    minWidth: 140,
                    renderHeader: h =>
                        this.renderHelpHeader(
                            h,
                            this.$t('batchTasks.reserveUnits'),
                            this.$t('batchTasks.unitsTip')
                        ),
                    // 1e-8 定点整数 RMB，原样展示，禁止 ÷1e8 或格式化
                    render: (h, params) =>
                        h('span', this.text(params.row.reserve_units))
                },
                {
                    title: this.$t('batchTasks.settleUnits'),
                    key: 'settle_units',
                    minWidth: 140,
                    renderHeader: h =>
                        this.renderHelpHeader(
                            h,
                            this.$t('batchTasks.settleUnits'),
                            this.$t('batchTasks.unitsTip')
                        ),
                    render: (h, params) =>
                        h('span', this.text(params.row.settle_units))
                },
                {
                    title: this.$t('batchTasks.settleStatus'),
                    key: 'settle_status',
                    minWidth: 130,
                    render: (h, params) =>
                        h(
                            'Tag',
                            {
                                props: {
                                    type: this.settleTagType(
                                        params.row.settle_status
                                    )
                                }
                            },
                            this.settleLabel(params.row.settle_status)
                        )
                },
                {
                    title: this.$t('batchTasks.createdAt'),
                    key: 'created_at',
                    minWidth: 180,
                    render: (h, params) =>
                        h('span', this.text(params.row.created_at))
                },
                {
                    title: this.$t('batchTasks.operation'),
                    key: 'operation',
                    width: 160,
                    render: (h, params) => {
                        const row = params.row;
                        const buttons = [
                            h(
                                'Button',
                                {
                                    props: { size: 'small', type: 'primary' },
                                    style: { marginRight: '8px' },
                                    on: { click: () => this.onDetail(row) }
                                },
                                this.$t('batchTasks.detail')
                            )
                        ];
                        if (this.isTerminal(row.status)) {
                            buttons.push(
                                h(
                                    'Button',
                                    {
                                        props: { size: 'small', disabled: true },
                                        attrs: {
                                            title: this.$t(
                                                'batchTasks.cancelDisabledTip'
                                            )
                                        }
                                    },
                                    this.$t('batchTasks.cancel')
                                )
                            );
                        } else {
                            buttons.push(
                                h(
                                    'Button',
                                    {
                                        props: { size: 'small', type: 'error' },
                                        on: { click: () => this.onCancel(row) }
                                    },
                                    this.$t('batchTasks.cancel')
                                )
                            );
                        }
                        return h('div', buttons);
                    }
                }
            ];
        }
    },

    mounted() {
        this.fetchData();
    },

    methods: {
        text(value) {
            return value === null || value === undefined || value === ''
                ? '-'
                : value;
        },

        statusLabel(status) {
            const key = STATUS_I18N[status];
            return key ? this.$t(`batchTasks.${key}`) : status || '-';
        },

        statusTagType(status) {
            return STATUS_TAG_TYPES[status] || 'default';
        },

        settleLabel(status) {
            const key = SETTLE_I18N[status];
            return key ? this.$t(`batchTasks.${key}`) : status || '-';
        },

        settleTagType(status) {
            return SETTLE_TAG_TYPES[status] || 'default';
        },

        isTerminal(status) {
            return TERMINAL_STATUSES.indexOf(status) !== -1;
        },

        // 表头帮助 icon（inline style，避免作用域样式对子组件渲染节点失效）
        renderHelpHeader(h, label, tip) {
            return h('span', [
                label,
                h(
                    'span',
                    {
                        attrs: { title: tip },
                        style: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '14px',
                            height: '14px',
                            border: '1px solid #2d8cf0',
                            borderRadius: '50%',
                            color: '#2d8cf0',
                            fontSize: '11px',
                            lineHeight: '1',
                            marginLeft: '4px',
                            cursor: 'help',
                            verticalAlign: 'middle'
                        }
                    },
                    '?'
                )
            ]);
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

        currentCursor() {
            return this.cursorStack[this.cursorStack.length - 1];
        },

        fetchData() {
            this.loading = true;
            const params = { limit: PAGE_LIMIT };
            const f = this.filter;
            if (f.status) params.status = f.status;
            if (f.provider && f.provider.trim()) {
                params.provider = f.provider.trim();
            }
            if (f.api_key_id && f.api_key_id.trim()) {
                params.api_key_id = f.api_key_id.trim();
            }
            const startTime = this.toUnixTimestamp(f.start_time);
            if (startTime !== '') params.start_time = startTime;
            const endTime = this.toUnixTimestamp(f.end_time);
            if (endTime !== '') params.end_time = endTime;
            const cursor = this.currentCursor();
            if (cursor) params.cursor = cursor;

            return this.$request({
                url: 'batches',
                method: 'get',
                params,
                openapi: true
            })
                .then(res => {
                    if (res.status === 200) {
                        const data = res.data.Data || {};
                        this.tableData = data.list || [];
                        this.nextCursor = data.next_cursor || '';
                    } else {
                        this.tableData = [];
                        this.nextCursor = '';
                        // 拦截器已就 401/402/422 提示时不再重复
                        if (!res.isSilent) {
                            this.$Message.error(
                                this.$t('batchTasks.loadFailed')
                            );
                        }
                    }
                })
                .catch(err => {
                    console.error('加载批量任务失败:', err);
                    this.$Message.error(this.$t('batchTasks.loadFailed'));
                })
                .finally(() => {
                    this.loading = false;
                });
        },

        onQuery() {
            this.cursorStack = [''];
            this.fetchData();
        },

        onReset() {
            this.filter = defaultFilter();
            this.cursorStack = [''];
            this.fetchData();
        },

        onPrev() {
            if (this.cursorStack.length <= 1) return;
            this.cursorStack.pop();
            this.fetchData();
        },

        onNext() {
            if (!this.nextCursor) return;
            this.cursorStack.push(this.nextCursor);
            this.fetchData();
        },

        onDetail(row) {
            this.drawerVisible = true;
            this.detail = null;
            this.detailLoading = true;
            this.$request({
                url: this.$urlFormat('batches/{id}', { id: row.batch_id }),
                method: 'get',
                openapi: true,
                unneedTips: true
            })
                .then(res => {
                    if (res.status === 200) {
                        this.detail = res.data.Data || null;
                    } else if (res.status === 404) {
                        this.$Message.error(this.$t('batchTasks.detail404'));
                    } else {
                        this.$Message.error(
                            this.$t('batchTasks.detailLoadFailed')
                        );
                    }
                })
                .catch(err => {
                    console.error('加载批量任务详情失败:', err);
                    this.$Message.error(this.$t('batchTasks.detailLoadFailed'));
                })
                .finally(() => {
                    this.detailLoading = false;
                });
        },

        onCancel(row) {
            if (this.isTerminal(row.status)) return;
            this.$Modal.confirm({
                title: this.$t('batchTasks.cancelConfirmTitle'),
                content: this.$t('batchTasks.cancelConfirm', {
                    batchId: row.batch_id
                }),
                loading: true,
                onOk: () => this.doCancel(row)
            });
        },

        doCancel(row) {
            this.$request({
                url: this.$urlFormat('batches/{id}/cancel', {
                    id: row.batch_id
                }),
                method: 'post',
                openapi: true,
                unneedTips: true
            })
                .then(res => {
                    if (res.status === 200) {
                        const data = res.data.Data || {};
                        row.status = data.status || 'cancelling';
                        row.settle_status =
                            data.settle_status || 'released';
                        this.$Message.success(
                            this.$t('batchTasks.cancelSuccess')
                        );
                    } else if (res.status === 409) {
                        this.$Message.error(this.$t('batchTasks.cancel409'));
                    } else if (res.status === 502) {
                        this.$Message.error(this.$t('batchTasks.cancel502'));
                    } else if (res.status === 404) {
                        this.$Message.error(this.$t('batchTasks.cancel404'));
                    } else {
                        this.$Message.error(this.$t('batchTasks.cancelFailed'));
                    }
                })
                .catch(err => {
                    console.error('取消批量任务失败:', err);
                    this.$Message.error(this.$t('batchTasks.cancelFailed'));
                })
                .finally(() => {
                    this.$Modal.remove();
                });
        }
    }
};
</script>

<style lang="less" scoped>
.batch-tasks {
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

    .batch-pager {
        margin-top: 16px;
        text-align: right;
    }
}
</style>