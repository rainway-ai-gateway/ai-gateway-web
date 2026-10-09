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
  <div class="providers">
    <Button type="primary" size="small" @click="onAdd">
      {{ $t('com.createX', { obj: $t('provider.name') }) }}
    </Button>
    <pageTable
      :tableData="tableData"
      :columns="columns"
      :loading="tableLoading"
    />

    <Drawer
      v-model="upsertVisible"
      :title="drawerTitle"
      :mask-closable="false"
      width="65"
    >
      <ProviderUpsert
        v-if="upsertVisible && !isView"
        :currentProvider="currentProvider"
        :providerNames="providerNames"
        :isAdd="isAdd"
        @submit="onUpsertSubmit"
      />
      <ProviderView
        v-if="upsertVisible && isView"
        :currentData="currentProvider"
      />
    </Drawer>

    <Drawer
      v-model="pricingTiersVisible"
      :title="$t('provider.pricingTiers')"
      :mask-closable="false"
      width="65"
    >
      <ProviderPricingTiers
        v-if="pricingTiersVisible"
        :currentProvider="pricingTiersProvider"
        @submit="onPricingTiersSubmit"
        @cancel="pricingTiersVisible = false"
      />
    </Drawer>
  </div>
</template>

<script>
import pageTable from '@/components/table/pageTable';
import ProviderUpsert from './components/ProviderUpsert.vue';
import ProviderView from './components/ProviderView.vue';
import ProviderPricingTiers from './components/ProviderPricingTiers.vue';

const PROTOCOL_OPTIONS = [
    { value: 'openai', label: 'openai' },
    { value: 'anthropic', label: 'anthropic' },
    { value: 'gemini', label: 'gemini' }
];

export default {
    name: 'Providers',

    components: {
        pageTable,
        ProviderUpsert,
        ProviderView,
        ProviderPricingTiers
    },

    data() {
        return {
            tableLoading: false,
            tableData: [],
            upsertVisible: false,
            pricingTiersVisible: false,
            pricingTiersProvider: {},
            isAdd: true,
            isView: false,
            currentProvider: {},
            providerNames: []
        };
    },

    computed: {
        drawerTitle() {
            if (this.isView) {
                return this.$t('com.detail');
            }
            return this.isAdd
                ? this.$t('com.createX', { obj: this.$t('provider.name') })
                : this.$t('com.editX', { obj: this.$t('provider.name') });
        },
        columns() {
            const that = this;
            return [
                {
                    title: this.$t('com.name'),
                    key: 'name',
                    sortable: 'custom',
                    searchable: true
                },
                {
                    title: this.$t('com.desc'),
                    key: 'description',
                    sortable: 'custom',
                    searchable: true
                },
                {
                    title: this.$t('provider.protocols'),
                    key: 'model_protocols',
                    searchable: true,
                    sortable: 'custom',
                    searchType: 'select',
                    searchFilters: PROTOCOL_OPTIONS,
                    render(h, params) {
                        return h('span', (params.row.model_protocols || []).join(', ') || '-');
                    }
                },
                {
                    title: this.$t('provider.models'),
                    key: 'models',
                    sortable: 'custom',
                    searchable: true,
                    render(h, params) {
                        return that.renderModelTags(h, params.row.models);
                    }
                },
                {
                    title: this.$t('com.operation'),
                    key: 'action',
                    width: 430,
                    render(h, params) {
                        return h('div', [
                            h(
                                'Button',
                                {
                                    props: { type: 'success', size: 'small' },
                                    style: { marginRight: '5px' },
                                    on: { click: () => that.onDetails(params.row) }
                                },
                                that.$t('com.detail')
                            ),
                            h(
                                'Button',
                                {
                                    props: { type: 'primary', size: 'small' },
                                    style: { marginRight: '5px' },
                                    on: { click: () => that.onViewModelPrices(params.row) }
                                },
                                that.$t('provider.viewModelPrices')
                            ),
                            h(
                                'Button',
                                {
                                    props: { type: 'warning', size: 'small' },
                                    style: { marginRight: '5px' },
                                    on: { click: () => that.onPricingTiers(params.row) }
                                },
                                that.$t('provider.pricingTiers')
                            ),
                            h(
                                'Button',
                                {
                                    props: { type: 'primary', size: 'small' },
                                    style: { marginRight: '5px' },
                                    on: { click: () => that.onEdit(params.row) }
                                },
                                that.$t('com.edit')
                            ),
                            h(
                                'Button',
                                {
                                    props: { type: 'error', size: 'small' },
                                    on: { click: () => that.onDel(params.row) }
                                },
                                that.$t('com.del')
                            )
                        ]);
                    }
                }
            ];
        }
    },

    mounted() {
        this.fetchList();
    },

    methods: {
        parseListPayload(data) {
            if (Array.isArray(data)) {
                return data;
            }
            const payload = data || {};
            return Array.isArray(payload.list) ? payload.list : [];
        },
        renderModelTags(h, models) {
            const list = (models || []).filter(Boolean);
            if (!list.length) {
                return h('span', '-');
            }
            const maxVisible = 2;
            const visible = list.slice(0, maxVisible);
            const hidden = list.slice(maxVisible);
            const tags = visible.map(item =>
                h(
                    'Tag',
                    {
                        props: { size: 'small' },
                        class: 'provider-model-tag'
                    },
                    item
                )
            );
            if (hidden.length) {
                tags.push(
                    h(
                        'Tooltip',
                        {
                            props: {
                                transfer: true,
                                maxWidth: 420,
                                placement: 'top'
                            }
                        },
                        [
                            h(
                                'div',
                                {
                                    slot: 'content',
                                    class: 'provider-models-tooltip'
                                },
                                list.map(name => h('div', { class: 'provider-models-tooltip-item' }, name))
                            ),
                            h(
                                'Tag',
                                {
                                    props: { size: 'small', color: 'default' },
                                    class: 'provider-model-more-tag'
                                },
                                `+${hidden.length}`
                            )
                        ]
                    )
                );
            }
            return h('div', { class: 'provider-models-cell' }, tags);
        },
        fetchList() {
            this.tableLoading = true;
            this.$request({
                url: 'providers',
                method: 'get',
                openapi: true
            })
                .then(res => {
                    if (res.status !== 200) {
                        return;
                    }
                    this.tableData = this.parseListPayload(res.data.Data);
                })
                .finally(() => {
                    this.tableLoading = false;
                });
        },
        fetchProviderNames() {
            return this.$request({
                url: 'providers/actions/get-provider-names',
                method: 'get',
                openapi: true
            }).then(res => {
                if (res.status !== 200) {
                    return;
                }
                this.providerNames = (res.data.Data && res.data.Data.names) || [];
            });
        },
        onAdd() {
            this.isAdd = true;
            this.isView = false;
            this.currentProvider = {};
            this.fetchProviderNames();
            this.upsertVisible = true;
        },
        onEdit(row) {
            this.isAdd = false;
            this.isView = false;
            this.loadDetail(row.name, () => {
                this.upsertVisible = true;
            });
        },
        onDetails(row) {
            this.isView = true;
            this.isAdd = false;
            this.loadDetail(row.name, () => {
                this.upsertVisible = true;
            });
        },
        onViewModelPrices(row) {
            this.$router.push({
                name: 'ModelPrice.list',
                query: {
                    provider: row.name
                }
            });
        },
        onPricingTiers(row) {
            this.loadDetail(row.name, data => {
                this.pricingTiersProvider = data || { name: row.name };
                this.pricingTiersVisible = true;
            });
        },
        onPricingTiersSubmit() {
            this.pricingTiersVisible = false;
            this.fetchList();
        },
        loadDetail(name, done) {
            this.$request({
                url: this.$urlFormat('providers/{provider_name}', {
                    provider_name: name
                }),
                method: 'get',
                openapi: true
            })
                .then(res => {
                    this.currentProvider =
                        res.status === 200 && res.data.Data ? res.data.Data : { name };
                    if (typeof done === 'function') {
                        done(this.currentProvider);
                    }
                })
                .catch(() => {
                    this.currentProvider = { name };
                    if (typeof done === 'function') {
                        done(this.currentProvider);
                    }
                });
        },
        onDel(row) {
            this.$Modal.confirm({
                title: this.$t('com.informationTips'),
                content: this.$t('com.confirmDel') + row.name,
                loading: true,
                onOk: () => {
                    this.$request({
                        url: this.$urlFormat('providers/{provider_name}', {
                            provider_name: row.name
                        }),
                        method: 'delete',
                        openapi: true,
                        unneedTips: true
                    })
                        .then(res => {
                            this.$Modal.remove();
                            if (res.status === 200) {
                                this.$Message.success({ content: this.$t('com.tipDelSucc') });
                                this.fetchProviderNames();
                                this.fetchList();
                                return;
                            }
                            const msg =
                                (res.data && res.data.ErrMsg) || this.$t('provider.deleteFailed');
                            this.$Message.error(msg);
                        })
                        .catch(err => {
                            this.$Modal.remove();
                            const msg =
                                (err && err.data && err.data.ErrMsg) ||
                                this.$t('provider.deleteFailed');
                            this.$Message.error(msg);
                        });
                }
            });
        },
        onUpsertSubmit() {
            this.upsertVisible = false;
            this.fetchList();
        }
    }
};
</script>

<style lang="less" scoped>
.providers {
    .ivu-btn {
        margin-bottom: 12px;
    }
}

.provider-models-cell {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    line-height: 1.4;
}

.provider-model-tag {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
}

.provider-model-more-tag {
    cursor: pointer;
}
</style>

<style lang="less">
.provider-models-tooltip {
    max-height: 240px;
    overflow-y: auto;
}

.provider-models-tooltip-item {
    line-height: 1.6;
    word-break: break-all;
}
</style>
