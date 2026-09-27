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
  <div>
    <div class="title">
      <Button
        size="small"
        type="primary"
        @click="onAdd"
        >{{ $t('entity.createEntity') }}</Button
      >
    </div>
    <pageTable
      ref="pageTable"
      :tableData="tableData"
      :columns="columns"
      :loading="tableLoading"
      class="entity-table"
      @on-row-click="onView"
    />

    <Drawer
      v-model="isHiden"
      :title="drawerTitle"
      :mask-closable="false"
      width="60"
    >
      <!-- 查看模式 -->
      <EntityView
        v-if="isViewMode"
        :currentData="currentData"
        :entity-list="tableData"
        @cancel="isHiden = false"
        @submit="onViewSubmit"
      />

      <!-- 编辑/创建模式 -->
      <EntityUpsert
        v-else-if="isHiden"
        :currentData="currentData"
        :isAdd="isAdd"
        :entityList="tableData"
        @submit="submitData"
        @cancel="isHiden = false"
      />
    </Drawer>

    <CustomModal
      :loading="loading"
      :modal="modal"
      :content="content"
      @onCancel="modal = false"
      @onOk="confirm"
    />
  </div>
</template>

<script>
import pageTable from '@/components/table/pageTable';
import CustomModal from '@/components/CustomModal';
import EntityUpsert from './EntityUpsert.vue';
import EntityView from './EntityView.vue';

export default {
    components: {
        pageTable,
        EntityUpsert,
        EntityView,
        CustomModal
    },
    data() {
        const that = this;
        return {
            tableData: [],
            columns: [
                {
                    title: 'ID',
                    key: 'id',
                    minWidth: 120,
                    sortable: 'custom',
                    searchable: true
                },
                {
                    title: that.$t('entity.name'),
                    key: 'name',
                    minWidth: 120,
                    sortable: 'custom',
                    searchable: true
                },
                {
                    title: that.$t('entity.description'),
                    key: 'description',
                    minWidth: 180,
                    sortable: 'custom',
                    searchable: true,
                    render(h, params) {
                        return h('span', params.row.description || '-');
                    }
                },
                {
                    title: that.$t('entity.type'),
                    key: 'type',
                    minWidth: 100,
                    sortable: 'custom',
                    searchable: true
                },
                {
                    title: that.$t('entity.parentEntity'),
                    key: 'parent_id',
                    minWidth: 120,
                    sortable: 'custom',
                    searchable: true,
                    render(h, params) {
                        const parent = that.tableData.find(item => item.id === params.row.parent_id);
                        return h('span', parent ? parent.name : '-');
                    }
                },
                {
                    title: that.$t('entity.quota'),
                    key: 'quota_plan_used',
                    minWidth: 140,
                    sortable: 'custom',
                    searchable: true,
                    render(h, params) {
                        const quotaPlan = params.row.quota_plan || {};
                        let text = '-';
                        if (!quotaPlan.unlimited) {
                            const isRMB = quotaPlan.unit === 'RMB';
                            const decimals = isRMB ? 4 : 0;
                            const unitText = isRMB ? '¥' : ' tokens';
                            const used = quotaPlan.balance && quotaPlan.balance.used || 0;
                            const quota = quotaPlan.quota || 0;
                            const usedText = isRMB ? '¥' + that.formatNumber(used, decimals) : that.formatNumber(used, decimals) + unitText;
                            const quotaText = isRMB ? '¥' + that.formatNumber(quota, decimals) : that.formatNumber(quota, decimals) + unitText;
                            text = `${usedText} / ${quotaText}`;
                        }
                        return h('span', text);
                    }
                },
                {
                    title: that.$t('entity.rateLimitStatus'),
                    key: 'rate_limit_policy_enabled',
                    minWidth: 100,
                    sortable: 'custom',
                    searchable: true,
                    searchType: 'select',
                    searchFilters: [
                        { label: that.$t('entity.enabled'), value: 'true' },
                        { label: that.$t('entity.notEnabled'), value: 'false' }
                    ],
                    render(h, params) {
                        const policy = params.row.rate_limit_policy || {};
                        return h('Tag', {
                            props: {
                                color: policy.enabled ? 'success' : 'default'
                            }
                        }, policy.enabled ? that.$t('entity.enabled') : that.$t('entity.notEnabled'));
                    }
                },
                {
                    title: that.$t('com.operation'),
                    width: 300,
                    render(h, params) {
                        return h('div', [
                            h(
                                'Button',
                                {
                                    props: {
                                        type: 'success',
                                        size: 'small'
                                    },
                                    style: {
                                        marginRight: '5px'
                                    },
                                    on: {
                                        click: (e) => {
                                            e.stopPropagation();
                                            that.onManageRules(params.row);
                                        }
                                    }
                                },
                                that.$t('route.manageRouteRules')
                            ),
                            h(
                                'Button',
                                {
                                    props: {
                                        type: 'primary',
                                        size: 'small'
                                    },
                                    style: {
                                        marginRight: '5px'
                                    },
                                    on: {
                                        click: (e) => {
                                            e.stopPropagation();
                                            that.onUpdate(params.row);
                                        }
                                    }
                                },
                                that.$t('com.edit')
                            ),
                            h(
                                'Button',
                                {
                                    props: {
                                        type: 'error',
                                        size: 'small'
                                    },
                                    on: {
                                        click: (e) => {
                                            e.stopPropagation();
                                            that.onDel(params.row);
                                        }
                                    }
                                },
                                that.$t('com.del')
                            )
                        ]);
                    }
                }
            ],
            tableLoading: false,
            isHiden: false,
            currentData: {},
            loading: false,
            modal: false,
            currentId: '',
            content: '',
            isAdd: false,
            isView: false
        };
    },
    computed: {
        isViewMode() {
            return this.isView && !this.isAdd;
        },
        drawerTitle() {
            if (this.isAdd) return this.$t('entity.createEntity');
            if (this.isView) return this.$t('entity.viewEntity');
            return this.$t('entity.editEntity');
        }
    },
    mounted() {
        this.fetchData();
    },
    methods: {
        formatNumber(num, decimals = 0) {
            const value = Number(num);
            if (Number.isNaN(value)) return '-';
            if (decimals === 0) {
                if (value >= 1000000) {
                    return (value / 1000000).toFixed(1) + 'M';
                }
                if (value >= 1000) {
                    return (value / 1000).toFixed(1) + 'K';
                }
            }
            return value.toLocaleString('zh-CN', {
                minimumFractionDigits: 0,
                maximumFractionDigits: decimals
            });
        },
        onViewSubmit() {
            this.isHiden = false;
            this.fetchData();
        },
        onAdd() {
            this.isAdd = true;
            this.isView = false;
            this.currentData = {};
            this.isHiden = true;
        },
        onView(row) {
            this.isAdd = false;
            this.isView = true;
            this.currentData = row;
            this.isHiden = true;
        },
        onUpdate(row) {
            this.isAdd = false;
            this.isView = false;
            this.currentId = row.id;
            this.currentData = row;
            this.isHiden = true;
        },
        onManageRules(row) {
            this.$router.push({
                name: 'AdvanceRouteRule.list',
                query: {
                    type: 'entity',
                    owner: row.id
                }
            });
        },
        onDel(row) {
            this.currentId = row.id;
            this.content = this.$t('entity.confirmDeleteEntity', { name: row.name });
            this.modal = true;
        },
        submitData(data) {
            if (this.isAdd) {
                this.addReq(data);
            } else {
                this.updateReq(data);
            }
        },
        addReq(data) {
            this.loading = true;
            this.$request({
                url: 'entities',
                method: 'post',
                openapi: true,
                data: data
            }).then(data => {
                if (data.status === 200) {
                    this.isHiden = false;
                    this.$Message.success({
                        content: this.$t('com.tipEstablishSucc')
                    });
                    this.fetchData();
                }
            }).finally(() => {
                this.loading = false;
            });
        },
        updateReq(data) {
            this.loading = true;
            this.$request({
                url: `entities/${this.currentId}`,
                method: 'PATCH',
                data: data,
                openapi: true
            })
                .then(data => {
                    if (data.status === 200) {
                        this.isHiden = false;
                        this.$Message.success({
                        content: this.$t('com.tipEditSucc')
                    });
                        this.fetchData();
                    }
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        confirm() {
            this.loading = true;
            this.$request({
                url: `entities/${this.currentId}`,
                method: 'delete',
                openapi: true
            })
                .then(data => {
                    if (data.status === 200) {
                        this.modal = false;
                        this.$Message.success({
                        content: this.$t('com.tipDelSucc')
                    });
                        this.fetchData();
                    }
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        fetchData() {
            this.tableLoading = true;
            this.$request({
                url: 'entities',
                method: 'get',
                openapi: true
            })
                .then(res => {
                    if (res.status === 200) {
                        const data = res.data.Data || {};
                        const list = Array.isArray(data.list) ? data.list : [];
                        this.tableData = list.map(item => {
                            const quotaPlan = item.quota_plan || {};
                            const isUnlimited = quotaPlan.unlimited === true || quotaPlan.unlimited === 'true';
                            return {
                                ...item,
                                rate_limit_policy_enabled: !!(item.rate_limit_policy && item.rate_limit_policy.enabled),
                                quota_plan_used: isUnlimited
                                    ? -1
                                    : ((quotaPlan.balance && quotaPlan.balance.used) || 0)
                            };
                        });
                    }
                })
                .finally(() => {
                    this.tableLoading = false;
                });
        }
    }
};
</script>

<style lang="less" scoped>
/deep/ .ivu-table-row {
    cursor: pointer;
}
.title {
    margin-bottom: 16px;
}
</style>
