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
    <div>
        <Button
            v-has
            class="add-button"
            type="primary"
            size="small"
            @click="onAdd"
        >{{ $t('com.createX', {obj: $t('cert.name')}) }}</Button>
        <div v-has class="cert-isdefult">
            <span>{{ $t('cert.globalDefaultCert') }}：</span>
            <Select
                v-model="showCertIsDefult"
                class="show-cert-isdefult"
                @on-change="onChangeCert"
            >
                <Option
                    v-for="item in tableData"
                    :key="item.cert_name"
                    :value="item.cert_name"
                >{{ item.cert_name }}</Option>
            </Select>
        </div>

        <Drawer
            v-model="isHiden"
            :mask-closable="false"
            width="40"
            :visible.sync="isHiden"
            :title="$t('com.createX', {obj: $t('cert.name')})"
        >
            <Create
                v-if="isHiden"
                :default-is-default="createDefaultIsDefault"
                @submit="submitData"
            />
        </Drawer>

        <pageTable
            ref="pageTable"
            :tableData="tableData"
            :columns="columns"
            :loading="loading"
        />
    </div>
</template>

<script>
import pageTable from '@/components/table/pageTable';
import Create from './components/Create.vue';
import moment from 'moment';
export default {
    name: 'instancePools',
    components: {
        pageTable,
        Create
    },
    mounted() {
        this.getCerList();
    },
    data() {
        const that = this;
        return {
            getCertIsDefult: '',
            showCertIsDefult: '',
            isHiden: false,
            createDefaultIsDefault: false,
            tableData: [],
            loading: false,
            columns: [
                {
                    key: 'cert_name',
                    title: this.$t('com.nameX', {obj: this.$t('cert.name')}),
                    searchable: true,
                    sortable: 'custom',
                    render(h, params) {
                        return h('Tooltip', {
                            props: {
                                content: params.row.description || '-',
                                placement: 'top',
                                transfer: true,
                                maxWidth: 420
                            },
                            style: {
                                cursor: 'pointer'
                            }
                        },
                        params.row.cert_name
                        );
                    },
                },
                {
                    key: 'is_default',
                    title: this.$t('cert.isDefault'),
                    render(h, params) {
                        if (params.row.is_default) {
                            return h('Tag', { props: { color: 'success' } }, that.$t('cert.globalDefaultCert'));
                        }
                        return h('span', '-');
                    },
                },
                {
                    key: 'expired_date',
                    title: this.$t('cert.expiredDate'),
                    searchable: true,
                    sortable: 'custom',
                    render(h, params) {
                        return (
                            <span>{ params.row.expired_date ? moment(params.row.expired_date).
                            format('YYYY-MM-DD HH:mm:ss') : '-' }</span>
                        );
                    },
                },
                {
                    key: 'action',
                    title: this.$t('com.operation'),
                    width: '200px',
                    render(h, params) {
                        if (params.row.is_default) {
                            return h('Tooltip', {
                                props: {
                                    content: that.$t('cert.tipCannotDeleteDefault'),
                                    placement: 'top'
                                }
                            }, [
                                h('Button', {
                                    props: {
                                        type: 'error',
                                        size: 'small',
                                        disabled: true
                                    },
                                    directives: [{ name: 'has' }]
                                }, that.$t('com.del'))
                            ]);
                        }
                        return h('span', [
                            h('Button', {
                                props: {
                                    type: 'error',
                                    size: 'small'
                                },
                                directives: [{ name: 'has' }],
                                style: {
                                    marginRight: '20px'
                                },
                                on: {
                                    click: () => {
                                        that.onDel(params.row);
                                    }
                                }
                            },
                                that.$t('com.del')
                            ),
                        ]);
                    }
                }
            ]
        };
    },
    methods: {
        updateCertificates(name) {
            this.$request({
                url: this.$urlFormat('certificates/{cert_name}/default', {cert_name: name}),
                method: 'patch'
            }).then((data) => {
                if (data.status === 200) {
                    this.isHiden = !this.isHiden;
                    this.$Message.success({
                        content: this.$t('com.tipOperationSucc')
                    });
                    this.isHiden = false;
                    this.getCerList();
                }
            });
        },
        createCertificates(data) {
            this.$request({
                url: 'certificates',
                method: 'post',
                data: data
            }).then((data) => {
                if (data.status === 200) {
                    this.isHiden = !this.isHiden;
                    this.$Message.success(
                        {
                            content: this.$t('com.tipAddSuccX', {obj: this.$t('cert.name')})
                        }
                    );
                    this.isHiden = false;
                    this.getCerList();
                }
            });
        },
        onChangeCert(item) {
            let certData = {};
            this.tableData.map((ite) => {
                if (ite.cert_name === item) {
                    certData = ite;
                }
            });
            this.$Modal.confirm({
                title: this.$t('com.informationTips'),
                content: this.$t('cert.tipSumitCertFile') + certData.cert_name + this.
                $t('cert.tipCofigDefault') + '?',
                onOk: () => {
                    this.updateCertificates(certData.cert_name);
                },
                onCancel: () => {
                    this.showCertIsDefult = this.getCertIsDefult;
                },
            });
        },
        onDel(data) {
            this.$Modal.confirm({
                loading: true,
                title: this.$t('com.informationTips'),
                content: this.$t('com.confirmDelX', {obj: this.$t('cert.name')}) + data.cert_name + '?',
                onOk: () => {
                    this.$request({
                        url: this.$urlFormat('certificates/{cert_name}', {cert_name: data.cert_name}),
                        method: 'delete'
                    }).then((data) => {
                        this.$Modal.remove();
                        if (data.status === 200) {
                            this.$Message.success({
                                content: this.$t('com.tipDelSucc')
                            });
                            this.getCerList();
                        }
                    });
                },
                onCancel: () => {
                    this.$Message.info({
                        content: this.$t('com.tipCancelDel')
                    });
                },
            });
        },
        submitData(data) {
            if (data) {
                this.createCertificates(data);
            }
        },
        getCerList() {
            this.loading = true;
            this.$request({
                url: 'certificates',
                method: 'get'
            })
            .then((data) => {
                if (data.status === 200) {
                    this.tableData = data.data.Data || [];
                    data.data.Data.map((item) => {
                        if (item.is_default) {
                            this.getCertIsDefult = item.cert_name;
                            this.showCertIsDefult = this.getCertIsDefult;
                        };
                    });
                };
            })
            .finally(() => {
                this.loading = false;
            });
        },
        onAdd() {
            this.createDefaultIsDefault = !this.tableData.some(item => item.is_default);
            this.isHiden = !this.isHiden;
        },
    },
};
</script>
<style lang="less" scoped>
.cert-isdefult {
    background-color: #f8f8f9;
    height: 42px;
    line-height: 42px;
    margin-bottom: 20px;
    padding: 0 20px;
    .show-cert-isdefult {
        width: 200px;
    }
    span {
        font-size: 14px;
        color: #000000a6;
        font-weight: 600;
    }
}
</style>
