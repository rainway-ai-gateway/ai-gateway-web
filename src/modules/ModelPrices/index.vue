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
  <div class="model-prices">
    <div class="action-bar">
      <Button type="primary" size="small" @click="onCreate">
        + {{ $t('modelPrices.create') }}
      </Button>
      <Button
        size="small"
        type="success"
        @click="onImport"
        style="margin-left: 8px;"
      >
        {{ $t('modelPrices.importYaml') }}
      </Button>
    </div>
    <pageTable
      ref="priceTable"
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
      :title="drawerTitle"
      width="60"
      :mask-closable="false"
    >
      <ModelPriceUpsert
        v-if="drawerVisible && !isView"
        :currentData="currentData"
        @submit="onUpsertSubmit"
        @cancel="drawerVisible = false"
      />
      <ModelPriceView
        v-if="drawerVisible && isView"
        :currentData="currentData"
      />
    </Drawer>

    <Modal
      v-model="importVisible"
      :title="$t('modelPrices.importYaml')"
      width="700"
      :mask-closable="false"
      @on-ok="confirmImport"
      @on-cancel="importVisible = false"
    >
      <ModelPriceImport
        v-if="importVisible"
        ref="importRef"
        @submit="onImportSubmit"
        @error="onImportError"
      />
      <div slot="footer">
        <Button @click="importVisible = false">{{ $t('com.cancel') }}</Button>
        <Button type="primary" :loading="importLoading" @click="confirmImport">
          {{ $t('modelPrices.import') }}
        </Button>
      </div>
    </Modal>
  </div>
</template>

<script>
import pageTable from '@/components/table/pageTable';
import ModelPriceUpsert from './components/ModelPriceUpsert.vue';
import ModelPriceView from './components/ModelPriceView.vue';
import ModelPriceImport from './components/ModelPriceImport.vue';
import { cloneDeep } from 'lodash';

const MODE_OPTIONS = [
    'chat', 'completion', 'responses', 'image_generation', 'image_edit',
    'embedding', 'rerank', 'audio_speech', 'audio_transcription',
    'video_generation', 'ocr', 'search', 'realtime'
];

export default {
    name: 'ModelPrices',

    components: {
        pageTable,
        ModelPriceUpsert,
        ModelPriceView,
        ModelPriceImport
    },

    data() {
        return {
            loading: false,
            tableData: [],
            total: 0,
            page: 1,
            pageSize: 50,
            pageSizeOptions: [20, 50, 100, 200, 500, 1000],
            drawerVisible: false,
            drawerTitle: '',
            currentData: {},
            isView: false,
            importVisible: false,
            importLoading: false,
            searchParams: {},
            filterProvider: null,
            notifyEmptyAfterFetch: false,
            providerOptions: [],
            modeOptions: MODE_OPTIONS.map(m => ({ label: m, value: m }))
        };
    },

    computed: {
        columns() {
            return [
                {
                    title: this.$t('modelPrices.provider'),
                    key: 'provider',
                    searchable: true,
                    searchType: 'select',
                    searchFilters: this.providerOptions,
                    searchValue: this.filterProvider,
                    sortable: 'custom'
                },
                {
                    title: this.$t('modelPrices.model'),
                    key: 'model',
                    searchable: true,
                    sortable: 'custom'
                },
                {
                    title: this.$t('modelPrices.mode'),
                    key: 'mode',
                    searchable: true,
                    searchType: 'select',
                    searchFilters: this.modeOptions,
                    sortable: 'custom',
                    render: (h, params) => h('span', params.row.mode)
                },
                {
                    title: this.$t('modelPrices.baseModel'),
                    key: 'base_model',
                    sortable: 'custom'
                },
                {
                    title: this.$t('com.operation') || '操作',
                    key: 'operation',
                    width: 240,
                    render: (h, params) => {
                        const row = params.row;
                        return h('div', [
                            h('Button', {
                                props: { size: 'small', type: 'primary' },
                                style: { marginRight: '8px' },
                                on: { click: () => this.onView(row) }
                            }, this.$t('com.see') || '详情'),
                            h('Button', {
                                props: { size: 'small', type: 'success' },
                                style: { marginRight: '8px' },
                                on: { click: () => this.onEdit(row) }
                            }, this.$t('com.edit') || '编辑'),
                            h('Button', {
                                props: { size: 'small', type: 'error' },
                                on: { click: () => this.onDelete(row) }
                            }, this.$t('com.del') || '删除')
                        ]);
                    }
                }
            ];
        }
    },

    mounted() {
        this.fetchProviderOptions().finally(() => {
            if (this.$route.query.provider) {
                this.applyQueryFromRoute();
            } else {
                this.fetchData();
            }
        });
    },

    watch: {
        '$route.query': {
            handler() {
                if (this.$route.name !== 'ModelPrice.list') {
                    return;
                }
                if (this.$route.query.provider) {
                    this.applyQueryFromRoute();
                }
            }
        }
    },

    methods: {
        formatTime(timestamp) {
            if (!timestamp) return '-';
            const date = new Date(timestamp * 1000);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleString('zh-CN');
        },

        fetchData() {
            this.loading = true;
            return this.$request({
                url: 'model-prices',
                method: 'get',
                params: {
                    page: this.page,
                    page_size: this.pageSize,
                    ...this.searchParams
                },
                openapi: true
            }).then(res => {
                if (res.status === 200) {
                    const data = res.data.Data || {};
                    this.tableData = data.list || [];
                    this.total = (data.pagination && data.pagination.total) || 0;
                    this.handleEmptyProviderHint();
                } else {
                    this.$Message.error(this.$t('modelPrices.loadFailed'));
                }
            }).catch(err => {
                console.error('加载模型定价失败:', err);
                this.$Message.error(this.$t('modelPrices.loadFailed'));
            }).finally(() => {
                this.loading = false;
            });
        },

        applyQueryFromRoute() {
            const provider = String(this.$route.query.provider || '').trim();
            if (!provider) {
                return;
            }
            this.filterProvider = provider;
            this.searchParams = { provider };
            this.page = 1;
            this.notifyEmptyAfterFetch = true;
            this.fetchData();
        },

        handleEmptyProviderHint() {
            if (!this.notifyEmptyAfterFetch) {
                return;
            }
            this.notifyEmptyAfterFetch = false;
            const provider = this.filterProvider || this.$route.query.provider;
            if (!this.tableData.length && provider) {
                this.$Message.warning(
                    this.$t('modelPrices.noPricingForProvider', { provider })
                );
            }
        },

        fetchProviderOptions() {
            return this.$request({
                url: 'model-prices',
                method: 'get',
                params: { page: 1, page_size: 1000 },
                openapi: true
            }).then(res => {
                if (res.status === 200) {
                    const list = (res.data.Data && res.data.Data.list) || [];
                    const providers = [...new Set(list.map(item => item.provider).filter(Boolean))];
                    this.providerOptions = providers.map(p => ({ label: p, value: p }));
                }
            }).catch(err => {
                console.error('加载 provider 选项失败:', err);
            });
        },

        onPageChange(pageInfo) {
            this.page = pageInfo.page;
            this.pageSize = pageInfo.pageSize;
            this.fetchData();
        },

        onSearchChange(filters) {
            this.searchParams = filters || {};
            this.filterProvider = filters.provider || null;
            this.page = 1;
            this.fetchData();
        },

        onSortChange(sortInfo) {
            // TODO: implement server-side sorting
        },

        onCreate() {
            this.currentData = {};
            this.isView = false;
            this.drawerTitle = this.$t('modelPrices.create');
            this.drawerVisible = true;
        },

        onView(row) {
            this.currentData = cloneDeep(row);
            this.isView = true;
            this.drawerTitle = this.$t('modelPrices.view');
            this.drawerVisible = true;
        },

        onEdit(row) {
            this.currentData = cloneDeep(row);
            this.isView = false;
            this.drawerTitle = this.$t('modelPrices.edit');
            this.drawerVisible = true;
        },

        onDelete(row) {
            this.$Modal.confirm({
                title: this.$t('com.confirmDelete') || '确认删除',
                content: this.$t('modelPrices.deleteConfirm', { model: row.model }),
                onOk: () => {
                    this.$request({
                        url: `model-prices/${row.id}`,
                        method: 'delete',
                        openapi: true
                    }).then(res => {
                        if (res.status === 200) {
                            this.$Message.success(this.$t('com.deleteSucc') || '删除成功');
                            this.fetchProviderOptions();
                            this.fetchData();
                        } else {
                            this.$Message.error(this.$t('com.deleteFailed') || '删除失败');
                        }
                    }).catch(err => {
                        console.error('删除模型定价失败:', err);
                        this.$Message.error(this.$t('com.deleteFailed') || '删除失败');
                    });
                }
            });
        },

        onUpsertSubmit() {
            this.drawerVisible = false;
            this.fetchProviderOptions();
            this.fetchData();
        },

        onImport() {
            this.importVisible = true;
        },

        confirmImport() {
            this.importLoading = true;
            if (this.$refs.importRef) {
                this.$refs.importRef.submitImport();
            }
        },

        onImportSubmit() {
            this.importLoading = false;
            this.importVisible = false;
            this.fetchProviderOptions();
            this.fetchData();
        },

        onImportError() {
            this.importLoading = false;
        }
    }
};
</script>

<style lang="less" scoped>
.model-prices {
    .action-bar {
        margin-bottom: 16px;
    }
}
</style>
