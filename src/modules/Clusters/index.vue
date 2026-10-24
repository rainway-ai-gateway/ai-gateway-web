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

    <Modal v-model="deleteErrorVisible" :mask-closable="false" width="560">
      <div slot="header" class="delete-error-title">
        <Icon type="ios-close-circle" color="#ed4014" :size="22" />
        <span>{{ $t('cluster.deleteFailed') }}</span>
      </div>
      <div class="delete-error-content">
        <p
          v-for="(ref, index) in deleteErrorRefs"
          :key="index"
          class="delete-error-line"
        >
          {{
                        $t('cluster.deleteBlockedByRule', {
                            cluster: deleteErrorCluster,
                            table: buildRouteTableLabel(ref),
                            rule: ref.ruleName
                        })
          }}
          <a @click="goToRouteTable(ref)">{{ $t('cluster.goToHandle') }}</a>
        </p>
      </div>
      <div slot="footer">
        <Button type="primary" @click="deleteErrorVisible = false">{{
                    $t('com.confirm')
        }}</Button>
      </div>
    </Modal>
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
            balanceModeData: null,
            deleteErrorVisible: false,
            deleteErrorCluster: '',
            deleteErrorRefs: []
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
                                this.showDeleteError(params.row.name, data);
                            }
                        })
                        .catch(() => {
                            this.$Modal.remove();
                        });
                }
            });
        },
        showDeleteError(clusterName, res) {
            this.$Modal.remove();
            this.findClusterReferences(clusterName).then(refs => {
                if (refs.length) {
                    this.deleteErrorCluster = clusterName;
                    this.deleteErrorRefs = refs;
                    this.deleteErrorVisible = true;
                } else {
                    const errMsg =
                        (res && res.errMsg) ||
                        (res.data && res.data.ErrMsg) ||
                        this.$t('com.tipError');
                    this.$Message.error(errMsg);
                }
            });
        },
        goToRouteTable(ref) {
            this.deleteErrorVisible = false;
            this.$router.push({
                name: 'AdvanceRouteRule.list',
                query: {
                    type: ref.type,
                    owner: ref.owner,
                    rule: ref.ruleName
                }
            });
        },
        buildRouteTableLabel(ref) {
            const typeLabels = {
                global: 'Global',
                entity: 'Entity',
                apikey: 'API-Key'
            };
            const typeLabel = typeLabels[ref.type] || ref.type;
            if (ref.type === 'global') {
                return 'Global / Global';
            }
            const ownerLabel = ref.ownerLabel || ref.owner || '-';
            return `${typeLabel} / ${ownerLabel}`;
        },
        findClusterReferences(clusterName) {
            return this.$request({
                url: 'route-tables',
                method: 'get',
                openapi: true,
                unneedTips: true
            })
                .then(res => {
                    if (res.status !== 200) {
                        return [];
                    }
                    const list = ((res.data || {}).Data || {}).list || [];
                    return this.fetchOwnerLabels(list).then(labelMap => {
                        const jobs = list.map(row =>
                            this.fetchTableRules(row).then(rules => {
                                const matched = (rules || []).filter(rule => {
                                    const inTargets = (rule.targets || []).some(
                                        t => t.cluster_name === clusterName
                                    );
                                    return inTargets;
                                });
                                return matched.map(rule => ({
                                    type: row.type,
                                    owner: row.owner,
                                    ownerLabel: labelMap[`${row.type}:${row.owner}`],
                                    ruleName: rule.name
                                }));
                            })
                        );
                        return Promise.all(jobs).then(results =>
                            results.reduce((acc, cur) => acc.concat(cur), [])
                        );
                    });
                })
                .catch(() => []);
        },
        fetchOwnerLabels(tables) {
            const needEntity = tables.some(row => row.type === 'entity');
            const needApiKey = tables.some(row => row.type === 'apikey');
            const jobs = [];
            if (needEntity) {
                jobs.push(
                    this.$request({ url: 'entities', method: 'get', openapi: true, unneedTips: true })
                        .then(res => {
                            const map = {};
                            if (res.status === 200) {
                                (((res.data || {}).Data || {}).list || []).forEach(item => {
                                    if (item && item.id != null) {
                                        map[`entity:${item.id}`] = item.name || item.id;
                                    }
                                });
                            }
                            return map;
                        })
                        .catch(() => ({}))
                );
            } else {
                jobs.push(Promise.resolve({}));
            }
            if (needApiKey) {
                jobs.push(
                    this.$request({ url: 'api-keys', method: 'get', openapi: true, unneedTips: true })
                        .then(res => {
                            const map = {};
                            if (res.status === 200) {
                                const data = ((res.data || {}).Data || {});
                                const list = Array.isArray(data) ? data : data.list || [];
                                list.forEach(item => {
                                    const id = item.id || item.key_id || item.name;
                                    if (id != null) {
                                        map[`apikey:${id}`] = item.name || id;
                                    }
                                });
                            }
                            return map;
                        })
                        .catch(() => ({}))
                );
            } else {
                jobs.push(Promise.resolve({}));
            }
            return Promise.all(jobs).then(maps =>
                maps.reduce((acc, cur) => Object.assign(acc, cur), {})
            );
        },
        fetchTableRules(row) {
            const url =
                row.type === 'global'
                    ? 'global-route-rules'
                    : row.type === 'entity'
                        ? `entities/${row.owner}`
                        : `api-keys/${row.owner}`;
            return this.$request({ url, method: 'get', openapi: true, unneedTips: true })
                .then(res => {
                    if (res.status !== 200) {
                        return [];
                    }
                    const data = ((res.data || {}).Data) || {};
                    if (row.type === 'global') {
                        return data.rules || [];
                    }
                    return (data.route_rules && data.route_rules.rules) || [];
                })
                .catch(() => []);
        },
        upsertSubmit() {
            this.getClusters();
            this.upsertVisible = false;
        }
    }
};
</script>
<style lang="less" scoped>
.delete-error-title {
    display: flex;
    align-items: center;

    span {
        margin-left: 8px;
        font-size: 14px;
        font-weight: 700;
        color: #17233d;
    }
}

.delete-error-content {
    text-align: center;

    .delete-error-line {
        margin: 8px 0;
        text-align: left;
    }
}
</style>
