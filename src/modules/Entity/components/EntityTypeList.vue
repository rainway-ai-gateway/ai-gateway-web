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
        v-has
        size="small"
        type="primary"
        @click="onAdd"
        >{{ $t('entity.createType') }}</Button
      >
    </div>
    <pageTable
      ref="pageTable"
      :tableData="tableData"
      :columns="columns"
      :loading="tableLoading"
    />

    <Drawer
      v-model="isHiden"
      :title="isAdd ? $t('entity.createType') : $t('entity.editType')"
      :mask-closable="false"
      width="50"
    >
      <EntityTypeUpsert
        v-if="isHiden"
        :currentData="currentData"
        :isAdd="isAdd"
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
import EntityTypeUpsert from './EntityTypeUpsert.vue';
import { cloneDeep } from 'lodash';
export default {
    components: {
        pageTable,
        EntityTypeUpsert,
        CustomModal
    },
    data() {
        const that = this;
        return {
            tableData: [],
            columns: [
                {
                    title: that.$t('entity.typeName'),
                    key: 'type_name',
                    minWidth: 120,
                    sortable: 'custom',
                    searchable: true
                },
                {
                    title: that.$t('entity.description'),
                    key: 'description',
                    minWidth: 180,
                    sortable: 'custom'
                },
                {
                    title: that.$t('entity.level'),
                    key: 'level',
                    minWidth: 100,
                    sortable: 'custom',
                    searchable: true,
                    searchType: 'select',
                    searchFilters: [
                        { label: '1', value: '1' },
                        { label: '2', value: '2' },
                        { label: '3', value: '3' },
                        { label: '4', value: '4' },
                        { label: '5', value: '5' }
                    ]
                },
                {
                    title: that.$t('apiKey.createTime'),
                    key: 'create_time',
                    minWidth: 160,
                    sortable: 'custom',
                    render(h, params) {
                        return h('span', that.formatTime(params.row.create_time));
                    }
                },
                {
                    title: that.$t('com.operation'),
                    width: 200,
                    render(h, params) {
                        return h('div', [
                            h(
                                'Button',
                                {
                                    props: {
                                        type: 'primary',
                                        size: 'small'
                                    },
                                    directives: [{ name: 'has' }],
                                    style: {
                                        marginRight: '5px'
                                    },
                                    on: {
                                        click: () => {
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
                                    directives: [{ name: 'has' }],
                                    on: {
                                        click: () => {
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
            isAdd: false
        };
    },
    mounted() {
        this.fetchData();
    },
    methods: {
        formatTime(timestamp) {
            if (!timestamp) return '-';
            const date = new Date(timestamp * 1000);
            return date.toLocaleString('zh-CN');
        },
        onAdd() {
            this.isAdd = true;
            this.currentData = {};
            this.isHiden = true;
        },
        onUpdate(row) {
            this.isAdd = false;
            this.currentId = row.type_name;
            this.currentData = row;
            this.isHiden = true;
        },
        onDel(row) {
            this.currentId = row.type_name;
            this.content = this.$t('entity.confirmDeleteType', { name: row.type_name });
            this.modal = true;
        },
        submitData(data) {
            let tmpData = cloneDeep(data);

            if (this.isAdd) {
                this.addReq(tmpData);
            } else {
                this.updateReq(tmpData);
            }
        },
        addReq(data) {
            this.loading = true;
            this.$request({
                url: 'entity-types',
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
                url: `entity-types/${this.currentId}`,
                method: 'patch',
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
                url: `entity-types/${this.currentId}`,
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
                url: 'entity-types',
                method: 'get',
                openapi: true
            })
                .then(res => {
                    if (res.status === 200) {
                        const data = res.data.Data || {};
                        this.tableData = Array.isArray(data.list) ? data.list : [];
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
.title {
    margin-bottom: 16px;
}
</style>
