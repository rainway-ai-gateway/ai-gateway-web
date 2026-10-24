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

    <cursor-pager
      class="batch-pager"
      :has-prev="hasPrev"
      :has-next="hasNext"
      :page-index="pageIndex"
      :page-count="tableData.length"
      :loading="loading"
      @first="onFirst"
      @prev="onPrev"
      @next="onNext"
    />

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
import CursorPager from '@/components/table/cursorPager.vue';

// 每页条数：与接口默认一致（接口上限 200），减少游标翻页次数
const PAGE_LIMIT = 50;

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
        BatchView,
        CursorPager
    },

    data() {
        return {
            loading: false,
            tableData: [],
            // 主键游标分页：cursorStack 保存已访问游标，首页游标为空串（不传 cursor）
            cursorStack: [''],
            nextCursor: '',
            // 已应用的过滤条件快照：翻页只按快照请求，避免「改了筛选未查询就翻页」导致跨页条件不一致
            appliedFilter: null,
            // 请求序号：丢弃过期响应，避免快速连点上一页/下一页时数据被旧响应覆盖
            requestSeq: 0,
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

        // 游标栈深度即当前页号（首页为 1）
        pageIndex() {
            return this.cursorStack.length;
        },

        columns() {
            return [
                {
                    title: this.$t('batchTasks.batchId'),
                    key: 'batch_id',
                    minWidth: 170
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
                                    color: this.statusTagColor(params.row.status)
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
                    title: this.$t('batchTasks.settleStatus'),
                    key: 'settle_status',
                    minWidth: 130,
                    render: (h, params) =>
                        h(
                            'Tag',
                            {
                                props: {
                                    color: this.settleTagColor(
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
                                        directives: [{ name: 'has' }],
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
                                        directives: [{ name: 'has' }],
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
        this.appliedFilter = { ...this.filter };
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

        // iView Tag 的颜色走 color 属性（type 仅接受 border/dot），避免 Invalid prop 警告
        statusTagColor(status) {
            return STATUS_TAG_TYPES[status] || 'default';
        },

        settleLabel(status) {
            const key = SETTLE_I18N[status];
            return key ? this.$t(`batchTasks.${key}`) : status || '-';
        },

        settleTagColor(status) {
            return SETTLE_TAG_TYPES[status] || 'default';
        },

        isTerminal(status) {
            return TERMINAL_STATUSES.indexOf(status) !== -1;
        },

        // 表头帮助 icon：走 iView Tooltip（inline style，避免作用域样式对子组件渲染节点失效）
        renderHelpHeader(h, label, tip) {
            return h(
                'span',
                {
                    style: {
                        display: 'inline-flex',
                        alignItems: 'center'
                    }
                },
                [
                    label,
                    h(
                        'Tooltip',
                        {
                            props: {
                                content: tip,
                                placement: 'top',
                                transfer: true,
                                maxWidth: 320
                            }
                        },
                        [
                            h('Icon', {
                                props: { type: 'ios-help-circle-outline' },
                                style: {
                                    marginLeft: '4px',
                                    fontSize: '14px',
                                    color: '#2d8cf0',
                                    cursor: 'help',
                                    verticalAlign: 'middle'
                                }
                            })
                        ]
                    )
                ]
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

        currentCursor() {
            return this.cursorStack[this.cursorStack.length - 1];
        },

        fetchData() {
            this.loading = true;
            const seq = ++this.requestSeq;
            const params = { limit: PAGE_LIMIT };
            // 翻页沿用「已应用」的条件快照；仅 onQuery/onReset 会更新快照
            const f = this.appliedFilter || this.filter;
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
                    // 已有更新请求发出时丢弃本次响应
                    if (seq !== this.requestSeq) return;
                    if (res.status === 200) {
                        const data = res.data.Data || {};
                        this.tableData = data.list || [];
                        this.nextCursor = data.next_cursor || '';
                        // 后端在本页恰好取满 limit 时也会返回 next_cursor，再翻会得到空页；
                        // 末页为空且还有上一页时自动回退，避免用户停在空表
                        if (!this.tableData.length && this.cursorStack.length > 1) {
                            this.cursorStack.pop();
                            this.nextCursor = '';
                            this.fetchData();
                        }
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
                    if (seq !== this.requestSeq) return;
                    console.error('加载批量任务失败:', err);
                    this.$Message.error(this.$t('batchTasks.loadFailed'));
                })
                .finally(() => {
                    if (seq === this.requestSeq) this.loading = false;
                });
        },

        onQuery() {
            // 查询即应用当前条件：快照后翻页不再受后续输入改动影响
            this.appliedFilter = { ...this.filter };
            this.cursorStack = [''];
            this.nextCursor = '';
            this.fetchData();
        },

        onReset() {
            this.filter = defaultFilter();
            this.appliedFilter = { ...this.filter };
            this.cursorStack = [''];
            this.nextCursor = '';
            this.fetchData();
        },

        onFirst() {
            if (this.loading || this.cursorStack.length <= 1) return;
            this.cursorStack = [''];
            this.nextCursor = '';
            this.fetchData();
        },

        onPrev() {
            if (this.loading || this.cursorStack.length <= 1) return;
            this.cursorStack.pop();
            this.fetchData();
        },

        onNext() {
            if (this.loading || !this.nextCursor) return;
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
    }
}
</style>