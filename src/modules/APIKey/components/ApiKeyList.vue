/**
* Copyright(c) 2026 The rainway-ai-gateway Authors.
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
        >{{ $t('com.create') }}</Button
      >
    </div>
    <pageTable
      ref="pageTable"
      :tableData="tableData"
      :columns="columns"
      :loading="tableLoading"
      @on-row-click="onView"
    />

    <Drawer
      v-model="isHiden"
      :title="drawerTitle"
      :mask-closable="false"
      width="60"
    >
      <ApiKeyView
        v-if="isViewMode"
        :currentData="currentData"
        @cancel="isHiden = false"
        @submit="onViewSubmit"
      />

      <Upsert
        v-else-if="isHiden"
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
    <Modal
      v-model="keyModal"
      :title="$t('nav.APIKeyManage') + ' ' + $t('com.detail')"
      @on-ok="keyModal = false"
      @on-cancel="keyModal = false"
    >
      <div style="word-break: break-all; padding: 20px 0;">
        <Input v-model="currentKey" readonly style="width: 90%;"></Input>
        <Icon
          type="md-copy"
          size="22"
          color="#2db7f5"
          class="copy-icon"
          v-clipboard:copy="currentKey"
          v-clipboard:success="onCopy"
          v-clipboard:error="onError"
        />
      </div>
      <div slot="footer">
        <Button
          type="primary"
          @click="keyModal = false"
          >{{ $t('com.cancel') }}</Button
        >
      </div>
    </Modal>
    <Modal
      v-model="modelsModal"
      :title="$t('apiKey.modelsList')"
      @on-ok="modelsModal = false"
      @on-cancel="modelsModal = false"
    >
      <div style="padding: 20px 0; max-height: 400px; overflow-y: auto;">
        <table
          class="model-table"
          style="width: 100%; border-collapse: collapse;"
        >
          <thead>
            <tr style="background-color: #f8f8f9;">
              <th
                style="padding: 10px; border: 1px solid #dcdee2; text-align: left;"
              >
                {{ $t('apiKey.models') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(model, index) in currentModels" :key="index">
              <td style="padding: 10px; border: 1px solid #dcdee2;">
                {{ model }}
              </td>
            </tr>
            <tr v-if="currentModels.length === 0">
              <td
                colspan="2"
                style="
                    padding: 10px;
                    border: 1px solid #dcdee2;
                    text-align: center;
                "
              >
                {{ $t('apiKey.noData') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div slot="footer">
        <Button @click="modelsModal = false">{{ $t('com.close') }}</Button>
      </div>
    </Modal>
  </div>
</template>

<script>
import pageTable from '@/components/table/pageTable';
import CustomModal from '@/components/CustomModal';
import Upsert from './Upsert.vue';
import ApiKeyView from './ApiKeyView.vue';
import { cloneDeep } from 'lodash';
export default {
    components: {
        pageTable,
        Upsert,
        ApiKeyView,
        CustomModal
    },
    data() {
        const that = this;
        return {
            keyModal: false,
            modelsModal: false,
            currentModels: [],
            tableData: [],
            columns: [
                {
                    title: that.$t('apiKey.keyId'),
                    key: 'id',
                    minWidth: 120,
                    searchable: true,
                    sortable: 'custom'
                },
                {
                    title: that.$t('apiKey.keyValue'),
                    key: 'key',
                    minWidth: 160,
                    sortable: 'custom',
                    searchable: true,
                    render(h, params) {
                        const keyValue = params.row.key || '';

                        let displayKey = keyValue;
                        if (keyValue.length > 12) {
                            displayKey =
                                keyValue.substring(0, 8) +
                                '****' +
                                keyValue.substring(keyValue.length - 4);
                        }

                        return h(
                            'span',
                            {
                                style: {
                                    color: '#2db7f5',
                                    cursor: 'pointer'
                                },
                                on: {
                                    click: (e) => {
                                        e.stopPropagation();
                                        that.showKeyModal(params.row.key);
                                    }
                                }
                            },
                            displayKey
                        );
                    }
                },
                {
                    title: that.$t('com.desc'),
                    key: 'description',
                    minWidth: 180,
                    sortable: 'custom',
                    searchable: true
                },
                {
                    title: that.$t('com.state'),
                    key: 'enabled',
                    minWidth: 120,
                    sortable: 'custom',
                    searchable: true,
                    searchType: 'select',
                    searchFilters: [
                        { label: that.$t('com.enable'), value: 'true' },
                        { label: that.$t('com.deactivate'), value: 'false' }
                    ],
                    render(h, params) {
                        const row = params.row;
                        return h('Tag', {
                            props: {
                                color: row.enabled ? 'success' : 'default'
                            }
                        }, row.enabled ? that.$t('com.enable') : that.$t('com.deactivate'));
                    }
                },
                {
                    title: that.$t('apiKey.quotaType'),
                    key: 'quota_plan_unlimited',
                    minWidth: 120,
                    sortable: 'custom',
                    searchable: true,
                    searchType: 'select',
                    searchFilters: [
                        { label: that.$t('apiKey.unlimited'), value: 'true' },
                        { label: that.$t('apiKey.limited'), value: 'false' }
                    ],
                    render(h, params) {
                        const quotaPlan = params.row.quota_plan || {};
                        const isUnlimited = quotaPlan.unlimited === true || quotaPlan.unlimited === 'true';
                        return h('Tag', {
                            props: {
                                color: isUnlimited ? 'default' : 'primary'
                            }
                        }, isUnlimited ? that.$t('apiKey.unlimited') : that.$t('apiKey.limited'));
                    }
                },
                {
                    title: that.$t('apiKey.quota'),
                    key: 'quota_plan_used',
                    minWidth: 140,
                    sortable: 'custom',
                    searchable: true,
                    render(h, params) {
                        const quotaPlan = params.row.quota_plan || {};
                        const isUnlimited = quotaPlan.unlimited === true || quotaPlan.unlimited === 'true';
                        if (isUnlimited) {
                            return h('span', '-');
                        }
                        const isRMB = quotaPlan.unit === 'RMB';
                        const decimals = isRMB ? 4 : 0;
                        const unitText = isRMB ? '¥' : ' tokens';
                        const used = quotaPlan.balance && quotaPlan.balance.used || 0;
                        const quota = quotaPlan.quota || 0;
                        const usedText = isRMB ? '¥' + that.formatNumber(used, decimals) : that.formatNumber(used, decimals) + unitText;
                        const quotaText = isRMB ? '¥' + that.formatNumber(quota, decimals) : that.formatNumber(quota, decimals) + unitText;
                        return h('span', `${usedText} / ${quotaText}`);
                    }
                },
                {
                    title: that.$t('apiKey.rateLimitStatus'),
                    key: 'rate_limit_policy_enabled',
                    minWidth: 120,
                    sortable: 'custom',
                    searchable: true,
                    searchType: 'select',
                    searchFilters: [
                        { label: that.$t('apiKey.enabled'), value: 'true' },
                        { label: that.$t('apiKey.notEnabled'), value: 'false' }
                    ],
                    render(h, params) {
                        const policy = params.row.rate_limit_policy || {};
                        return h('Tag', {
                            props: {
                                color: policy.enabled ? 'success' : 'default'
                            }
                        }, policy.enabled ? that.$t('apiKey.enabled') : that.$t('apiKey.notEnabled'));
                    }
                },
                {
                    title: that.$t('apiKey.mountedEntity'),
                    key: 'entity_name',
                    minWidth: 120,
                    searchable: true,
                    sortable: 'custom',
                    render(h, params) {
                        const entity = params.row.entity ? params.row.entity : {};
                        return h('span', entity.name || '-');
                    }
                },
                {
                    title: that.$t('com.operation'),
                    width: 300,
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
                                        click: (e) => {
                                            e.stopPropagation();
                                            that.onManageRules(params.row);
                                        }
                                    }
                                },
                                that.$t('route.manageRouteRules')
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
                                        click: (e) => {
                                            e.stopPropagation();
                                            that.onUpdate(params.row);
                                        }
                                    }
                                },
                                that.$t('com.edit')
                            )
                        );
                        buttons.push(
                            h(
                                'Button',
                                {
                                    props: {
                                        type: 'error',
                                        size: 'small'
                                    },
                                    directives: [{ name: 'has' }],
                                    on: {
                                        click: (e) => {
                                            e.stopPropagation();
                                            that.onDel(params.row);
                                        }
                                    }
                                },
                                that.$t('com.del')
                            )
                        );
                        return h('div', buttons);
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
            currentKey: '',
            isAdd: false,
            isView: false
        };
    },
    computed: {
        isViewMode() {
            return this.isView && !this.isAdd;
        },
        drawerTitle() {
            if (this.isAdd) return this.$t('com.create') + ' API-Key';
            if (this.isView) return 'API-Key ' + this.$t('com.detail');
            return this.$t('com.edit') + ' API-Key';
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
        showKeyModal(key) {
            this.currentKey = key;
            this.keyModal = true;
        },
        onCopy(e) {
            this.$Message.success(this.$t('apiKey.copySucc'));
        },
        onError(e) {
            this.$Message.error(this.$t('apiKey.copyError'));
        },
        onAdd() {
            this.isAdd = true;
            this.isView = false;
            this.currentData = {};
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
                    type: 'apikey',
                    owner: row.id
                }
            });
        },
        onView(row) {
            this.isAdd = false;
            this.isView = true;
            this.currentData = row;
            this.isHiden = true;
        },
        onViewSubmit() {
            this.isHiden = false;
            this.fetchData();
        },
        onDel(row) {
            this.currentId = row.id;
            this.content = this.$t('com.confirmDelX', {
                obj: this.$t('nav.APIKeyManage') + ' ' + row.description
            });
            this.modal = true;
        },
        submitData(data) {
            let tmpData = cloneDeep(data);

            // Remove read-only fields
            delete tmpData.id;
            delete tmpData.create_time;
            delete tmpData.update_time;

            if (this.isAdd) {
                this.addReq(tmpData);
            } else {
                this.updateReq(tmpData);
            }
        },
        addReq(data) {
            this.loading = true;
            this.$request({
                url: this.$urlFormat('api-keys'),
                method: 'post',
                openapi: true,
                data: data
            }).then(data => {
                if (data.status === 200) {
                    this.isHiden = false;
                    this.$Message.success({
                        content: this.$t('com.tipAddSucc')
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
                url: this.$urlFormat('api-keys/{id}', {
                    id: this.currentId
                }),
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
                url: this.$urlFormat('api-keys/{id}', {
                    id: this.currentId
                }),
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
                url: this.$urlFormat('api-keys'),
                method: 'get',
                openapi: true
            })
                .then(res => {
                    if (res.status === 200) {
                        const data = res.data.Data || {};
                        const list = Array.isArray(data.list) ? data.list : [];
                        this.tableData = list.map(item => {
                            const quotaPlan = item.quota_plan || {};
                            const entity = item.entity || {};
                            const isUnlimited = quotaPlan.unlimited === true || quotaPlan.unlimited === 'true';
                            return {
                                ...item,
                                rate_limit_policy_enabled: !!(item.rate_limit_policy && item.rate_limit_policy.enabled),
                                quota_plan_unlimited: isUnlimited,
                                quota_plan_used: (quotaPlan.balance && quotaPlan.balance.used) || 0,
                                entity_name: entity.name || ''
                            };
                        });
                    }
                })
                .finally(() => {
                    this.tableLoading = false;
                });
        },
        showModelsModal(models) {
            this.currentModels = models || [];
            this.modelsModal = true;
        }
    }
};
</script>

<style lang="less" scoped>
/deep/ .ivu-table-row {
    cursor: pointer;
}
.copy-icon {
    cursor: pointer;
}
.modal-content {
    white-space: pre-wrap;
    word-wrap: break-word;
    word-break: break-all;
    line-height: 1.5;
    max-height: 60vh;
    overflow-y: auto;
}
</style>
