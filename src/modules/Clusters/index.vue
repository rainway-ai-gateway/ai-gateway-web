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
<template>
  <div class="clusters">
    <Button v-has type="primary" size="small" @click="onAdd">{{
            $t('com.createX', { obj: $t('cluster.name') })
    }}</Button>
    <pageTable
      :tableData="tableData"
      :columns="columns"
      :loading="tableLoading"
    />

    <Drawer
      :title="
                isAdd
                    ? $t('com.createX', { obj: $t('cluster.name') })
                    : $t('com.editX', { obj: $t('cluster.name') })
            "
      v-model="upsertVisible"
      :mask-closable="false"
      width="65"
    >
      <Upsert
        v-if="upsertVisible"
        :currentCluster="currentCluster"
        :clusterNames="clusterNames"
        :isAdd="isAdd"
        @submit="upsertSubmit"
      />
    </Drawer>

    <Drawer :title="$t('com.detail')" v-model="infoVisible" width="65">
      <Review
        :showFooter="false"
        :baseConfigData="baseConfigData"
        :passiveHealthData="passiveHealthData"
        :llmConfigData="llmConfigData"
        :balanceModeData="balanceModeData"
      />
    </Drawer>
  </div>
</template>
<script>
import pageTable from '@/components/table/pageTable';
import Upsert, { formatStickySessionsForEdit } from './components';
import Review from './components/Review';
import { cloneDeep } from 'lodash';
export default {
    name: 'Clusters',

    components: {
        pageTable,
        Upsert,
        Review
    },

    computed: {
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
                    searchable: true
                },
                {
                    title: this.$t('com.operation'),
                    key: 'action',
                    render(h, params) {
                        const buttons = [
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
                                        click: () => {
                                            that.onDetails(params);
                                        }
                                    }
                                },
                                that.$t('com.detail')
                            )
                        ];
                        buttons.push(
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
                                            that.onEdit(params.row);
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
                                            that.onDel(params);
                                        }
                                    }
                                },
                                that.$t('com.del')
                            )
                        );
                        return h('div', buttons);
                    }
                }
            ];
        }
    },

    mounted() {
        this.getClusters();
    },

    data() {
        return {
            tableLoading: false,
            upsertVisible: false,
            infoVisible: false,
            tableData: [],
            isAdd: false,
            currentCluster: {},
            clusterNames: [],
            baseConfigData: {},
            passiveHealthData: {},
            llmConfigData: {},
            balanceModeData: null
        };
    },

    methods: {
        getClusters() {
            this.tableLoading = true;
            this.$request({
                url: 'clusters',
                method: 'get'
            })
                .then(data => {
                    if (data.status === 200) {
                        this.tableData = data.data.Data;
                        this.clusterNames = [];
                        if (this.tableData && this.tableData.length > 0) {
                            this.tableData.forEach(item => {
                                this.clusterNames.push(item.name);
                            });
                        }
                    }
                })
                .finally(() => {
                    this.tableLoading = false;
                });
        },
        onAdd() {
            this.currentCluster = {};
            this.isAdd = true;
            this.upsertVisible = true;
        },
        onEdit(row) {
            this.isAdd = false;
            this.$request({
                url: this.$urlFormat('clusters/{cluster_name}', {
                    cluster_name: row.name
                }),
                method: 'get'
            })
                .then(res => {
                    if (res.status === 200 && res.data.Data) {
                        this.currentCluster = res.data.Data;
                    } else {
                        this.currentCluster = row;
                    }
                    this.upsertVisible = true;
                })
                .catch(() => {
                    this.currentCluster = row;
                    this.upsertVisible = true;
                });
        },
        onDetails(data) {
            this.$request({
                url: this.$urlFormat('clusters/{cluster_name}', {
                    cluster_name: data.row.name
                }),
                method: 'get'
            })
                .then(res => {
                    const tmpData = cloneDeep(
                        res.status === 200 && res.data.Data ? res.data.Data : data.row
                    );
                    this.applyDetailData(tmpData);
                })
                .catch(() => {
                    this.applyDetailData(cloneDeep(data.row));
                });
        },
        applyDetailData(tmpData) {
            this.baseConfigData = {
                name: tmpData.name,
                description: tmpData.description,
                protocol: tmpData.basic.protocol,
                connection: tmpData.basic.connection,
                buffers: tmpData.basic.buffers,
                retries: tmpData.basic.retries,
                timeouts: tmpData.basic.timeouts,
                sticky_sessions: formatStickySessionsForEdit(tmpData.sticky_sessions)
            };
            if (this.baseConfigData.connection) {
                this.baseConfigData.connection.cancel_on_client_close =
                    String(this.baseConfigData.connection.cancel_on_client_close);
            }
            this.passiveHealthData = tmpData.passive_health_check || {};
            this.llmConfigData = tmpData.llm_config || {};
            this.balanceModeData = {
                balance_mode: tmpData.balance_mode || 'WRR',
                epp_config: tmpData.epp_config || null,
                epp_runtime: tmpData.epp_runtime || null
            };
            this.infoVisible = true;
        },
        onDel(params) {
            this.$Modal.confirm({
                title: this.$t('com.informationTips'),
                content: this.$t('com.confirmDel') + params.row.name,
                loading: true,
                onOk: () => {
                    this.$request({
                        url: this.$urlFormat('clusters/{cluster_name}', {
                            cluster_name: params.row.name
                        }),
                        method: 'delete',
                        unneedTips: true
                    })
                        .then(data => {
                            if (data.status === 200) {
                                this.$Modal.remove();
                                this.getClusters();
                                this.tableData.splice(params.index, 1);
                                this.$Message.success({
                                    content: this.$t('com.tipDelSucc')
                                });
                            } else {
                                // Reference checks live in the backend (route-rule delete checkers);
                                // just surface the API error message
                                this.$Modal.remove();
                                const errMsg =
                                    (data && data.errMsg) ||
                                    (data.data && data.data.ErrMsg) ||
                                    this.$t('com.tipError');
                                this.$Message.error(errMsg);
                            }
                        })
                        .catch(() => {
                            this.$Modal.remove();
                        });
                }
            });
        },
        upsertSubmit() {
            this.getClusters();
            this.upsertVisible = false;
        }
    }
};
</script>
