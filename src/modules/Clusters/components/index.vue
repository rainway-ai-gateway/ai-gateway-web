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
  <div class="newClusters">
    <BaseConfig
      v-show="currentStepIndex === 0"
      :baseConfigData="baseConfigData"
      :reportFlag="baseSubmitFlag"
      :isAdd="isAdd"
      :clusterNames="clusterNames"
      @submitData="acceptDataHandler"
    />
    <Timeout
      v-show="currentStepIndex === 1"
      :baseConfigData="baseConfigData"
      :reportFlag="timeoutSubmitFlag"
      :isAdd="isAdd"
      @submitData="acceptDataHandler"
    />
    <PassiveHealthCheck
      v-show="currentStepIndex === 2"
      :passiveHealthData="passiveHealthData"
      :reportFlag="passiveHealthSubmitFlag"
      :isAdd="isAdd"
      :submitName="submitName"
      @submitData="acceptDataHandler"
    />
    <GatewayConfig
      v-show="currentStepIndex === 3"
      :llmConfigData="llmConfigData"
      :isAdd="isAdd"
      :balanceModeData="balanceModeData"
      :stepsCurrentState="currentStepIndex"
      :reportFlag="llmConfigFlag"
      @submitData="acceptDataHandler"
    />

    <Review
      v-show="currentStepIndex === reviewStepIndex"
      :baseConfigData="baseConfigData"
      :passiveHealthData="passiveHealthData"
      :llmConfigData="llmConfigData"
      :balanceModeData="balanceModeData"
      :isAdd="isAdd"
      :reportFlag="reviewSubmitFlag"
      v-on="$listeners"
      @submitData="submit"
    />
    <footer>
      <Steps :current="currentStepIndex">
        <Step
          v-for="(step, index) in visibleSteps"
          :key="index"
          :title="StepsTitle(index)"
          :content="step.content"
        ></Step>
      </Steps>
    </footer>
    <div class="com-btn-box drawer-footer">
      <Button
        v-show="currentStepIndex === reviewStepIndex"
        size="small"
        type="primary"
        @click="submitNextSteps"
      >
        {{ $t('com.submit') }}
      </Button>
      <Button
        v-show="currentStepIndex !== reviewStepIndex"
        size="small"
        :disabled="disabled"
        @click="submitNextSteps"
        type="primary"
      >
        {{ $t('com.nextStep') }}
      </Button>
      <Button v-show="currentStepIndex !== 0" @click="back" size="small">{{
                $t('com.lastStep')
      }}</Button>
    </div>
  </div>
</template>

<script>
import BaseConfig from './BaseConfig';
import Timeout from './Timeout';
import PassiveHealthCheck, {
    formatPassiveHealthCheckForApi
} from './PassiveHealthCheck';
import { cloneDeep } from 'lodash';
import Review from './Review';
import GatewayConfig from './GatewayConfig.vue';

const BASIC_DEFAULTS = {
    protocol: 'https',
    connection: {
        max_idle_conn_per_rs: 0,
        cancel_on_client_close: false
    },
    retries: {
        max_retry_in_cluster: 2
    },
    buffers: {
        req_write_buffer_size: 512
    },
    timeouts: {
        timeout_conn_serv: 50000,
        timeout_response_header: 50000,
        timeout_readbody_client: 30000,
        timeout_read_client_again: 30000,
        timeout_write_client: 60000
    }
};

function parseOptionalInt(value, defaultValue) {
    if (value == null || value === '') {
        return defaultValue;
    }
    return parseInt(value, 10);
}

function formatBasicForApi(baseConfigData) {
    const src = baseConfigData || {};
    const connection = src.connection || {};
    const retries = src.retries || {};
    const buffers = src.buffers || {};
    const timeouts = src.timeouts || {};
    const cancelRaw = connection.cancel_on_client_close;

    let cancelOnClientClose = BASIC_DEFAULTS.connection.cancel_on_client_close;
    if (cancelRaw != null && cancelRaw !== '') {
        cancelOnClientClose = cancelRaw === 'true' || cancelRaw === true;
    }

    return {
        protocol: src.protocol || BASIC_DEFAULTS.protocol,
        connection: {
            max_idle_conn_per_rs: parseOptionalInt(
                connection.max_idle_conn_per_rs,
                BASIC_DEFAULTS.connection.max_idle_conn_per_rs
            ),
            cancel_on_client_close: cancelOnClientClose
        },
        retries: {
            max_retry_in_cluster: parseOptionalInt(
                retries.max_retry_in_cluster,
                BASIC_DEFAULTS.retries.max_retry_in_cluster
            )
        },
        buffers: {
            req_write_buffer_size: parseOptionalInt(
                buffers.req_write_buffer_size,
                BASIC_DEFAULTS.buffers.req_write_buffer_size
            )
        },
        timeouts: {
            timeout_conn_serv: parseOptionalInt(
                timeouts.timeout_conn_serv,
                BASIC_DEFAULTS.timeouts.timeout_conn_serv
            ),
            timeout_response_header: parseOptionalInt(
                timeouts.timeout_response_header,
                BASIC_DEFAULTS.timeouts.timeout_response_header
            ),
            timeout_readbody_client: parseOptionalInt(
                timeouts.timeout_readbody_client,
                BASIC_DEFAULTS.timeouts.timeout_readbody_client
            ),
            timeout_read_client_again: parseOptionalInt(
                timeouts.timeout_read_client_again,
                BASIC_DEFAULTS.timeouts.timeout_read_client_again
            ),
            timeout_write_client: parseOptionalInt(
                timeouts.timeout_write_client,
                BASIC_DEFAULTS.timeouts.timeout_write_client
            )
        }
    };
}

export function formatStickySessionsForEdit(stickySessions) {
    if (!stickySessions) {
        return stickySessions;
    }
    const result = { ...stickySessions };
    if (result.enabled === true) {
        result.enabled = 'true';
    } else if (result.enabled === false || result.enabled === undefined) {
        result.enabled = 'false';
    }
    return result;
}

function formatStickySessionsForApi(stickySessions) {
    if (!stickySessions) {
        return stickySessions;
    }
    const result = { ...stickySessions };
    if (result.enabled === 'true' || result.enabled === true) {
        result.enabled = true;
        if (result.hash_strategy === 'CLIENT_IP_ONLY') {
            delete result.hash_header;
        }
    } else {
        return { enabled: false };
    }
    return result;
}

function formatLlmConfigForApi(llmConfig) {
    const src = llmConfig || {};
    const result = {
        provider: src.provider,
        models: Array.isArray(src.models) ? src.models : [],
        model_mappings: Array.isArray(src.model_mappings)
            ? src.model_mappings.filter(item => item && (item.source_model || item.target_model))
            : [],
        keys: Array.isArray(src.keys)
            ? src.keys
                .map(item => ({
                    name: String(item.name || '').trim(),
                    weight: Number(item.weight) || 0
                }))
                .filter(item => item.name)
            : [],
        key_policy: src.key_policy || {
            strategy: 'weighted_random',
            max_retries: 0,
            retry_backoff_initial: 500,
            retry_backoff_max: 5000
        },
        key_affinity: src.key_affinity || {
            enabled: false,
            ttl: 600,
            redis_prefix: 'bfe:ai:key_affinity',
            penalty_enable: true
        },
        strip_prefix: !!src.strip_prefix
    };
    if (result.strip_prefix) {
        result.match_prefix = src.match_prefix || '';
    }
    const nue = src.normalize_upstream_error;
    if (nue) {
        result.normalize_upstream_error = {
            enabled: !!nue.enabled,
            stream_enabled: !!nue.stream_enabled,
            unrecognized_action: nue.unrecognized_action || 'passthrough',
            max_body_bytes:
                nue.max_body_bytes != null && nue.max_body_bytes !== ''
                    ? Number(nue.max_body_bytes)
                    : 65536,
            redact_secrets: nue.redact_secrets !== false
        };
    }
    return result;
}

export default {
    name: 'newClusters',

    components: {
        BaseConfig,
        Timeout,
        PassiveHealthCheck,
        GatewayConfig,
        Review
    },
    props: {
        currentCluster: {
            type: Object,
            default() {
                return {};
            }
        },
        clusterNames: {
            type: Array,
            default() {
                return [];
            }
        },
        isAdd: {
            type: Boolean
        }
    },

    watch: {
        currentCluster: {
            handler(data) {
                if (!this.isAdd) {
                    this.changeData(data);
                }
            },
            deep: true,
            immediate: true
        }
    },

    data() {
        return {
            submitName: '',
            currentStepIndex: 0,
            baseConfigData: {},
            llmConfigData: {},
            passiveHealthData: {},
            balanceModeData: null,
            baseSubmitFlag: false,
            timeoutSubmitFlag: false,
            passiveHealthSubmitFlag: false,
            llmConfigFlag: false,
            reviewSubmitFlag: false,
            disabled: false
        };
    },

    computed: {
        allSteps() {
            return [
                { content: this.$t('cluster.basicConfig'), visible: true },
                { content: this.$t('cluster.timeoutAndRetransmission'), visible: true },
                { content: this.$t('cluster.passiveHealthCheck'), visible: true },
                { content: this.$t('cluster.modelConfig'), visible: true },
                { content: this.$t('cluster.review'), visible: true }
            ];
        },
        visibleSteps() {
            return this.allSteps.filter(step => step.visible);
        },
        reviewStepIndex() {
            return this.visibleSteps.length - 1;
        }
    },

    methods: {
        submit() {
            let params = this.handelData();
            if (!this.isAdd) {
                const { name, ...patchData } = params;
                this.$request({
                    url: this.$urlFormat('clusters/{cluster_name}', {
                        cluster_name: name
                    }),
                    method: 'patch',
                    data: patchData
                }).then(data => {
                    if (data.status === 200) {
                        this.$Message.success({ content: this.$t('com.tipSubmitSucc') });
                        this.$emit('submit');
                    }
                });
            } else {
                this.$request({
                    url: 'clusters',
                    method: 'post',
                    data: params
                }).then(data => {
                    if (data.status === 200) {
                        this.$Message.success({ content: this.$t('com.tipSubmitSucc') });
                        this.$emit('submit');
                    }
                });
            }
        },
        acceptDataHandler(data) {
            if (data.topic === 'llmConfigData') {
                this.balanceModeData = {
                    balance_mode: data.data.balance_mode,
                    epp_config: data.data.epp_config
                };
                this.llmConfigData = data.data;
            } else {
                this[data.topic] = data.data;
            }
            this.submitName = this.baseConfigData.name;

            if (this.currentStepIndex < this.reviewStepIndex) {
                this.currentStepIndex += 1;
            }
        },
        handelData() {
            let data = {
                name: this.baseConfigData.name,
                description: this.baseConfigData.description,
                basic: formatBasicForApi(this.baseConfigData),
                sticky_sessions: formatStickySessionsForApi(this.baseConfigData.sticky_sessions),
                passive_health_check: formatPassiveHealthCheckForApi(this.passiveHealthData),
                llm_config: formatLlmConfigForApi(this.llmConfigData)
            };
            if (this.balanceModeData) {
                data.balance_mode = this.balanceModeData.balance_mode || 'WRR';
                if (this.balanceModeData.epp_config) {
                    data.epp_config = this.balanceModeData.epp_config;
                }
            }
            this.changeObj(data);
            return data;
        },
        changeObj(data) {
            for (let key in data) {
                if (JSON.stringify(data[key]) === '{}') {
                    data[key] = null;
                }
            }
        },
        StepsTitle(index) {
            let msg =
                index === this.currentStepIndex
                    ? this.$t('com.haveInHand')
                    : index > this.currentStepIndex
                    ? this.$t('com.pending')
                    : this.$t('com.completed');
            return msg;
        },
        submitNextSteps() {
            switch (this.currentStepIndex) {
                case 0:
                    this.baseSubmitFlag = !this.baseSubmitFlag;
                    break;
                case 1:
                    this.timeoutSubmitFlag = !this.timeoutSubmitFlag;
                    break;
                case 2:
                    this.passiveHealthSubmitFlag = !this.passiveHealthSubmitFlag;
                    break;
                case 3:
                    this.llmConfigFlag = !this.llmConfigFlag;
                    break;
                case 4:
                    this.reviewSubmitFlag = !this.reviewSubmitFlag;
            }
        },
        changeData(data) {
            const tmpData = cloneDeep(data);
            const retries = tmpData.basic.retries || {};
            this.baseConfigData = {
                name: tmpData.name,
                description: tmpData.description,
                protocol: tmpData.basic.protocol,
                connection: tmpData.basic.connection,
                buffers: tmpData.basic.buffers,
                retries: {
                    max_retry_in_cluster: retries.max_retry_in_cluster != null
                        ? retries.max_retry_in_cluster
                        : BASIC_DEFAULTS.retries.max_retry_in_cluster
                },
                timeouts: tmpData.basic.timeouts,
                sticky_sessions: formatStickySessionsForEdit(tmpData.sticky_sessions)
            };
            if (this.baseConfigData.connection) {
                this.baseConfigData.connection.cancel_on_client_close =
                    String(this.baseConfigData.connection.cancel_on_client_close);
            }
            this.passiveHealthData = tmpData.passive_health_check || {};
            this.llmConfigData = {
                ...(tmpData.llm_config || {})
            };
            this.balanceModeData = {
                balance_mode: tmpData.balance_mode,
                epp_config: tmpData.epp_config || null
            };
        },
        back() {
            if (this.currentStepIndex > 0) {
                this.currentStepIndex -= 1;
            }
        }
    }
};
</script>

<style lang="less" scoped>
footer {
    padding-bottom: 30px;
    margin-top: 35px;
}
</style>
