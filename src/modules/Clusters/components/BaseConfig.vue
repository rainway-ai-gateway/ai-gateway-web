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
  <Form
    label-position="top"
    ref="formData"
    :model="formData"
    :rules="ruleValidate"
  >
    <FormItem :label="$t('com.nameX', { obj: $t('cluster.name') })" prop="name">
      <Input v-model="formData.name" :disabled="!isAdd" :maxlength="64" />
    </FormItem>
    <FormItem :label="$t('cluster.clusterDescription')" prop="description">
      <Input v-model="formData.description" />
    </FormItem>
    <FormItem :label="$t('cluster.protocol')" prop="protocol">
      <Select v-model="formData.protocol">
        <Option value="http">http</Option>
        <Option value="https">https</Option>
      </Select>
    </FormItem>
    <FormItem
      v-if="formData.connection"
      :label="$t('cluster.maxIdleConnPerRs')"
      prop="connection.max_idle_conn_per_rs"
    >
      <InputNumber
        v-model="formData.connection.max_idle_conn_per_rs"
        class="from-item-inp"
      ></InputNumber>
    </FormItem>
    <FormItem
      v-if="formData.sticky_sessions"
      :label="$t('cluster.stickySessionsEnabled')"
      prop="sticky_sessions.enabled"
    >
      <Select
        v-model="formData.sticky_sessions.enabled"
        size="small"
        class="from-item-inp"
      >
        <Option
          v-for="item in boolOptions"
          :value="item.value"
          :key="item.value"
          >{{
                    item.name
          }}</Option
        >
      </Select>
    </FormItem>
    <FormItem
      v-if="formData.sticky_sessions && formData.sticky_sessions.enabled === 'true'"
      :label="$t('cluster.hashStrategy')"
      prop="sticky_sessions.hash_strategy"
    >
      <Select
        v-model="formData.sticky_sessions.hash_strategy"
        size="small"
        class="from-item-inp"
        @change="selectHashStrategy"
      >
        <Option
          v-for="item in hashStrategyOptions"
          :value="item.name"
          :key="item.name"
          >{{
                    item.name
          }}</Option
        >
      </Select>
    </FormItem>
    <FormItem
      v-if="
                formData.sticky_sessions &&
                formData.sticky_sessions.enabled === 'true' &&
                formData.sticky_sessions.hash_strategy !== 'CLIENT_IP_ONLY'
            "
      :label="$t('cluster.hashHeader')"
      prop="sticky_sessions.hash_header"
    >
      <Input v-model="formData.sticky_sessions.hash_header" />
    </FormItem>
    <FormItem
      v-if="formData.buffers"
      :label="$t('cluster.reqWriteBufferSize')"
      prop="buffers.req_write_buffer_size"
    >
      <InputNumber
        v-model="formData.buffers.req_write_buffer_size"
        class="from-item-inp"
      ></InputNumber>
    </FormItem>
    <FormItem
      v-if="formData.connection"
      :label="$t('cluster.cancelOnClientClose')"
      prop="connection.cancel_on_client_close"
    >
      <Select
        v-model="formData.connection.cancel_on_client_close"
        size="small"
        class="from-item-inp"
      >
        <Option
          v-for="item in boolOptions"
          :value="item.value"
          :key="item.value"
          >{{
                    item.name
          }}</Option
        >
      </Select>
    </FormItem>
  </Form>
</template>
<script>
import { ClustersNameRegCheck, NumRegCheck, utf8ByteLength } from '@/utils/const';
import { cloneDeep } from 'lodash';
export default {
    name: 'BaseConfig',

    props: {
        baseConfigData: {
            type: Object,
            required: true,
            defalut() {
                return {};
            }
        },
        isAdd: {
            type: Boolean,
            defalut: false
        },
        reportFlag: {
            type: Boolean,
            defalut: false
        },
        clusterNames: {
            type: Array,
            required: true,
            defalut() {
                return [];
            }
        }
    },

    watch: {
        baseConfigData: {
            handler(data) {
                if (!this.isAdd) {
                    if (data) {
                        this.formData = cloneDeep(data);
                        if (data.connection) {
                            this.formData.connection.cancel_on_client_close =
                                data.connection.cancel_on_client_close + '';
                        }
                    }
                }
            },
            immediate: true,
            deep: true
        },
        reportFlag: {
            handler(v) {
                this.handleSubmit('formData');
            }
        }
    },
    data() {
        const validateDescription = (rule, value, callback) => {
            if (!value) {
                callback();
                return;
            }
            if (utf8ByteLength(value) > 256) {
                callback(new Error(this.$t('cluster.descriptionLengthError')));
                return;
            }
            if (/[\x00-\x1F\x7F]/.test(value)) {
                callback(new Error(this.$t('cluster.descriptionControlCharsError')));
                return;
            }
            callback();
        };
        const validateName = (rule, value, callback) => {
            if (value === '') {
                callback(
                    new Error(
                        this.$t('com.tipEnterX', {
                            obj: this.$t('com.nameX', { obj: this.$t('cluster.name') })
                        })
                    )
                );
                return;
            }
            if (this.isAdd && this.clusterNames.indexOf(value) !== -1) {
                callback(
                    new Error(
                        this.$t('com.tipAlreadyExistsX', {
                            obj: this.$t('com.nameX', { obj: this.$t('cluster.name') })
                        })
                    )
                );
                return;
            }
            if (!ClustersNameRegCheck(value)) {
                callback(new Error(this.$t('cluster.tipClusterNameRule')));
                return;
            }
            callback();
        };
        const validateMaxIdleConnPerHost = (rule, value, callback) => {
            if (value === null || value === undefined || value === '') {
                callback();
                return;
            }
            if (!NumRegCheck(value)) {
                callback(new Error(this.$t('cluster.tipValueNonnegativeInteger')));
                return;
            }
            if (value < 0) {
                callback(new Error(this.$t('cluster.tipValueNonnegativeInteger')));
                return;
            }
            if (value > 99999999) {
                callback(new Error(this.$t('cluster.tipsValueMax')));
            }
            callback();
        };
        const validateReqWriteBufferSize = (rule, value, callback) => {
            if (value === null || value === undefined || value === '') {
                callback();
                return;
            }
            if (!NumRegCheck(value) || value <= 0) {
                callback(new Error(this.$t('cluster.reqWriteBufferSizeMustGreaterThanZero')));
                return;
            }
            if (value > 99999999) {
                callback(new Error(this.$t('cluster.tipsValueMax')));
                return;
            }
            callback();
        };
        const validateHashHeader = (rule, value, callback) => {
            const stickySessions = this.formData.sticky_sessions || {};
            if (stickySessions.enabled !== 'true') {
                callback();
                return;
            }
            const strategy = stickySessions.hash_strategy;
            if (strategy === 'CLIENT_IP_ONLY') {
                callback();
                return;
            }
            if (strategy === 'CLIENT_ID_ONLY' || strategy === 'CLIENT_ID_PREFERED') {
                if (value === undefined || value === null || String(value).trim() === '') {
                    callback(new Error(this.$t('cluster.tipHashHeaderRequired')));
                    return;
                }
            }
            callback();
        };
        return {
            ruleValidate: {
                name: [
                    {
                        required: true,
                        trigger: 'blur',
                        validator: validateName
                    }
                ],
                description: [
                    {
                        required: false,
                        trigger: 'blur',
                        validator: validateDescription
                    }
                ],
                protocol: [
                     {
                        required: true,
                        trigger: 'blur',
                        message: this.$t('com.tipSelectX', { obj: this.$t('cluster.protocol') })
                    }
                ],
                'connection.max_idle_conn_per_rs': [
                    {
                        required: false,
                        trigger: 'blur',
                        validator: validateMaxIdleConnPerHost
                    }
                ],
                'sticky_sessions.enabled': [
                    {
                        required: false,
                        trigger: 'change'
                    }
                ],
                'sticky_sessions.hash_strategy': [
                    {
                        required: false,
                        trigger: 'change'
                    }
                ],
                'sticky_sessions.hash_header': [
                    {
                        required: true,
                        trigger: 'blur',
                        validator: validateHashHeader
                    }
                ],
                'buffers.req_write_buffer_size': [
                    {
                        required: false,
                        trigger: 'change',
                        validator: validateReqWriteBufferSize
                    }
                ],
                'connection.cancel_on_client_close': [
                    {
                        required: false,
                        trigger: 'change'
                    }
                ]
            },
            formData: {
                name: '',
                description: '',
                protocol: 'https',
                connection: {
                    max_idle_conn_per_rs: 0,
                    cancel_on_client_close: 'false'
                },
                buffers: {
                    req_write_buffer_size: 512
                },
                sticky_sessions: {
                    enabled: 'false',
                    hash_strategy: 'CLIENT_IP_ONLY',
                    hash_header: ''
                },
                timeouts: {
                    timeout_conn_serv: 50000,
                    timeout_response_header: 50000,
                    timeout_readbody_client: 30000,
                    timeout_read_client_again: 30000,
                    timeout_write_client: 60000
                },
                retries: {
                    max_retry_in_cluster: 2
                }
            },
            hashStrategyOptions: [
                {
                    name: 'CLIENT_IP_ONLY'
                },
                {
                    name: 'CLIENT_ID_ONLY'
                },
                {
                    name: 'CLIENT_ID_PREFERED'
                }
            ],
            boolOptions: [
                {
                    name: this.$t('com.enable'),
                    value: 'true'
                },
                {
                    name: this.$t('com.deactivate'),
                    value: 'false'
                }
            ]
        };
    },
    methods: {
        selectHashStrategy() {
            if (
                this.formData.sticky_sessions.enabled === 'true'
                && !this.formData.sticky_sessions.hash_header
            ) {
                this.$set(this.formData.sticky_sessions, 'hash_header', '');
            }
        },
        handleSubmit(name) {
            this.$refs[name].validate(valid => {
                if (!valid) {
                    this.$Message.error(this.$t('com.tipValidateError'));
                    return;
                }
                const submitData = cloneDeep(this.formData);
                if (submitData.sticky_sessions) {
                    if (submitData.sticky_sessions.enabled !== 'true') {
                        // 停用时只传 enabled
                        submitData.sticky_sessions = { enabled: 'false' };
                    } else if (submitData.sticky_sessions.hash_strategy === 'CLIENT_IP_ONLY') {
                        // CLIENT_IP_ONLY 不传 hash_header
                        delete submitData.sticky_sessions.hash_header;
                    }
                }
                this.$emit('submitData', {
                    topic: 'baseConfigData',
                    data: submitData
                });
            });
        }
    }
};
</script>
