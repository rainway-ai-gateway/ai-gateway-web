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
  <div class="Review">
    <div class="panel">
      <div class="panel-header">{{ $t('cluster.basicConfig') }}</div>
      <div class="panel-body">
        <ul class="clearFloat">
          <li class="title">
            {{ this.$t('com.nameX', { obj: this.$t('cluster.name') }) }}:
          </li>
          <li class="value">{{ baseConfigData['name'] }}</li>
        </ul>
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.clusterDescription') }}:</li>
          <li class="value">{{ baseConfigData['description'] }}</li>
        </ul>
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.protocol') }}:</li>
          <li class="value">{{ baseConfigData['protocol'] }}</li>
        </ul>
        <ul v-if="baseConfigData.connection" class="clearFloat">
          <li class="title">{{ $t('cluster.maxIdleConnPerRs') }}:</li>
          <li class="value">
            {{ baseConfigData.connection['max_idle_conn_per_rs'] }}
          </li>
        </ul>
        <ul v-if="baseConfigData.sticky_sessions" class="clearFloat">
          <li class="title">{{ $t('cluster.stickySessionsEnabled') }} :</li>
          <li class="value">
            {{ baseConfigData.sticky_sessions['enabled'] === 'true' ? $t('com.enable') : $t('com.deactivate') }}
          </li>
        </ul>
        <ul
          v-if="
                        baseConfigData.sticky_sessions &&
                        baseConfigData.sticky_sessions['enabled'] === 'true'
                    "
          class="clearFloat"
        >
          <li class="title">{{ $t('cluster.hashStrategy') }} :</li>
          <li class="value">
            {{ baseConfigData.sticky_sessions['hash_strategy'] }}
          </li>
        </ul>
        <ul
          v-if="
                        baseConfigData.sticky_sessions &&
                        baseConfigData.sticky_sessions['enabled'] === 'true' &&
                        baseConfigData.sticky_sessions['hash_strategy'] !== 'CLIENT_IP_ONLY'
                    "
          class="clearFloat"
        >
          <li class="title">{{ $t('cluster.hashHeader') }} :</li>
          <li class="value">
            {{ baseConfigData.sticky_sessions['hash_header'] }}
          </li>
        </ul>
        <ul v-if="baseConfigData.buffers" class="clearFloat">
          <li class="title">{{ $t('cluster.reqWriteBufferSize') }} :</li>
          <li class="value">
            {{ baseConfigData.buffers['req_write_buffer_size'] }}
          </li>
        </ul>
        <ul v-if="baseConfigData.connection" class="clearFloat">
          <li class="title">{{ $t('cluster.cancelOnClientClose') }}:</li>
          <li class="value">
            {{
                            baseConfigData.connection['cancel_on_client_close'] === 'true'
                                ? $t('com.enable')
                                : $t('com.deactivate')
            }}
          </li>
        </ul>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header">
        {{ $t('cluster.timeoutAndRetransmission') }}
      </div>
      <div
        v-if="baseConfigData.timeouts && baseConfigData.retries"
        class="panel-body"
      >
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.timeoutReadClientAgain') }}:</li>
          <li class="value">
            {{ baseConfigData.timeouts.timeout_read_client_again }}
          </li>
        </ul>
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.timeoutReadbodyClient') }} :</li>
          <li class="value">
            {{ baseConfigData.timeouts.timeout_readbody_client }}
          </li>
        </ul>
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.timeoutConnServ') }} :</li>
          <li class="value">{{ baseConfigData.timeouts.timeout_conn_serv }}</li>
        </ul>
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.timeoutResHeader') }} :</li>
          <li class="value">
            {{ baseConfigData.timeouts.timeout_response_header }}
          </li>
        </ul>
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.timeoutWriteClient') }} :</li>
          <li class="value">
            {{ baseConfigData.timeouts.timeout_write_client }}
          </li>
        </ul>
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.maxRetryInCluster') }} :</li>
          <li class="value">
            {{ baseConfigData.retries.max_retry_in_cluster }}
          </li>
        </ul>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header">{{ $t('cluster.passiveHealthCheck') }}</div>
      <div class="panel-body">
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.faultThreshold') }} :</li>
          <li class="value">{{ displayPassiveHealthData.failnum }}</li>
        </ul>
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.healthCheckInterval') }}:</li>
          <li class="value">{{ displayPassiveHealthData.interval }}</li>
        </ul>
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.healthCheckHost') }}:</li>
          <li class="value">{{ displayHealthCheckHost }}</li>
        </ul>
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.healthCheckUri') }}:</li>
          <li class="value">{{ displayPassiveHealthData.uri }}</li>
        </ul>
        <ul class="clearFloat">
          <li class="title">{{ $t('cluster.healthCheckStatuscode') }} :</li>
          <li class="value">{{ displayPassiveHealthData.statuscode }}</li>
        </ul>
      </div>
    </div>
    <!-- 大模型 -->
    <div class="panel">
      <div class="panel-header">{{ $t('llmConfig.title') }}</div>
      <div class="panel-body" v-if="llmConfigData">
        <ul class="clearFloat">
          <li class="title">{{ $t('gatewayConfig.ownedProvider') }}:</li>
          <li class="value">{{ displayProvider }}</li>
        </ul>
        <ul class="clearFloat detail-row">
          <li class="title">{{ $t('gatewayConfig.forwardModels') }}:</li>
          <li class="value">
            <template v-if="displayModels.length">
              <span
                v-for="model in displayModels"
                :key="model"
                class="model-tag"
                >{{ model }}</span
              >
            </template>
            <span v-else class="empty-text">-</span>
          </li>
        </ul>
        <ul class="clearFloat">
          <li class="title">{{ $t('gatewayConfig.stripPrefix') }}:</li>
          <li class="value">{{ displayStripPrefix }}</li>
        </ul>
        <ul v-if="isStripPrefixEnabled" class="clearFloat">
          <li class="title">{{ $t('gatewayConfig.matchPrefix') }}:</li>
          <li class="value">{{ displayMatchPrefix }}</li>
        </ul>
        <ul class="clearFloat detail-row detail-row-block">
          <li class="title">{{ $t('gatewayConfig.modelRedirect') }}:</li>
          <li class="value">
            <table v-if="displayModelMappings.length" class="mapping-table">
              <thead>
                <tr>
                  <th>{{ $t('gatewayConfig.originalModelName') }}</th>
                  <th>{{ $t('gatewayConfig.backendModelName') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in displayModelMappings" :key="index">
                  <td>{{ item.source_model }}</td>
                  <td>{{ item.target_model }}</td>
                </tr>
              </tbody>
            </table>
            <span v-else class="empty-text">-</span>
          </li>
        </ul>
        <ul class="clearFloat detail-row detail-row-block">
          <li class="title">{{ $t('gatewayConfig.serviceAuthKeys') }}:</li>
          <li class="value">
            <table v-if="displayKeys.length" class="mapping-table">
              <thead>
                <tr>
                  <th>{{ $t('gatewayConfig.providerKey') }}</th>
                  <th>{{ $t('gatewayConfig.keyWeight') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in displayKeys" :key="index">
                  <td>{{ item.name }}</td>
                  <td>{{ item.weight }}</td>
                </tr>
              </tbody>
            </table>
            <span v-else class="empty-text">-</span>
          </li>
        </ul>
        <ul
          v-if="displayKeyPolicy"
          class="clearFloat detail-row-block policy-row"
        >
          <li class="title">{{ $t('gatewayConfig.keyPolicy') }}:</li>
          <li class="value">
            <Card class="policy-card">
              <Row :gutter="24" class="review-row">
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.keyPolicyStrategy') }}:
                    </div>
                    <div class="review-value">
                      {{ displayKeyPolicyStrategy }}
                    </div>
                  </div>
                </Col>
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.keyPolicyMaxRetries') }}:
                    </div>
                    <div class="review-value">
                      {{ displayKeyPolicy.max_retries }}
                    </div>
                  </div>
                </Col>
              </Row>
              <Row :gutter="24">
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.keyPolicyRetryBackoffInitial') }}:
                    </div>
                    <div class="review-value">
                      {{ displayKeyPolicy.retry_backoff_initial }}
                    </div>
                  </div>
                </Col>
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.keyPolicyRetryBackoffMax') }}:
                    </div>
                    <div class="review-value">
                      {{ displayKeyPolicy.retry_backoff_max }}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </li>
        </ul>
        <ul v-else class="clearFloat">
          <li class="title">{{ $t('gatewayConfig.keyPolicy') }}:</li>
          <li class="value"><span class="empty-text">-</span></li>
        </ul>
        <ul
          v-if="displayKeyAffinity"
          class="clearFloat detail-row-block policy-row"
        >
          <li class="title">{{ $t('gatewayConfig.keyAffinity') }}:</li>
          <li class="value">
            <Card class="policy-card">
              <div class="review-item">
                <div class="review-label">
                  {{ $t('gatewayConfig.keyAffinityEnabled') }}:
                </div>
                <div class="review-value">
                  {{
                    displayKeyAffinity.enabled
                      ? $t('com.enable')
                      : $t('com.deactivate')
                  }}
                </div>
              </div>
              <template v-if="displayKeyAffinity.enabled">
                <Row :gutter="24" class="review-row">
                  <Col span="12">
                    <div class="review-item">
                      <div class="review-label">
                        {{ $t('gatewayConfig.keyAffinityTtlReview') }}:
                      </div>
                      <div class="review-value">
                        {{ displayKeyAffinity.ttl }}
                      </div>
                    </div>
                  </Col>
                  <Col span="12">
                    <div class="review-item">
                      <div class="review-label">
                        {{ $t('gatewayConfig.keyAffinityPenalty') }}:
                      </div>
                      <div class="review-value">
                        {{
                          displayKeyAffinity.penalty_enable
                            ? $t('com.enable')
                            : $t('com.deactivate')
                        }}
                      </div>
                    </div>
                  </Col>
                </Row>
                <Row :gutter="24">
                  <Col span="24">
                    <div class="review-item">
                      <div class="review-label">
                        {{ $t('gatewayConfig.keyAffinityRedisPrefix') }}:
                      </div>
                      <div class="review-value">
                        {{ displayKeyAffinity.redis_prefix }}
                      </div>
                    </div>
                  </Col>
                </Row>
              </template>
            </Card>
          </li>
        </ul>
        <ul v-else class="clearFloat">
          <li class="title">{{ $t('gatewayConfig.keyAffinity') }}:</li>
          <li class="value"><span class="empty-text">-</span></li>
        </ul>
        <ul
          v-if="displayNormalizeUpstreamError"
          class="clearFloat detail-row-block policy-row"
        >
          <li class="title">
            {{ $t('gatewayConfig.normalizeUpstreamError') }}:
          </li>
          <li class="value">
            <Card class="policy-card">
              <Row :gutter="24" class="review-row">
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.normalizeEnabled') }}:
                    </div>
                    <div class="review-value">
                      {{
                        displayNormalizeUpstreamError.enabled
                          ? $t('com.enable')
                          : $t('com.deactivate')
                      }}
                    </div>
                  </div>
                </Col>
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.normalizeStreamEnabled') }}:
                    </div>
                    <div class="review-value">
                      {{
                        displayNormalizeUpstreamError.stream_enabled
                          ? $t('com.enable')
                          : $t('com.deactivate')
                      }}
                    </div>
                  </div>
                </Col>
              </Row>
              <Row :gutter="24" class="review-row">
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.normalizeRedactSecrets') }}:
                    </div>
                    <div class="review-value">
                      {{
                        displayNormalizeUpstreamError.redact_secrets
                          ? $t('com.enable')
                          : $t('com.deactivate')
                      }}
                    </div>
                  </div>
                </Col>
              </Row>
              <template v-if="displayNormalizeUpstreamError.enabled">
                <Row :gutter="24" class="review-row">
                  <Col span="12">
                    <div class="review-item">
                      <div class="review-label">
                        {{ $t('gatewayConfig.normalizeUnrecognizedAction') }}:
                      </div>
                      <div class="review-value">
                        {{
                          displayNormalizeUpstreamError.unrecognized_action
                        }}
                      </div>
                    </div>
                  </Col>
                  <Col span="12">
                    <div class="review-item">
                      <div class="review-label">
                        {{ $t('gatewayConfig.normalizeMaxBodyBytes') }}:
                      </div>
                      <div class="review-value">
                        {{ displayNormalizeUpstreamError.max_body_bytes }}
                      </div>
                    </div>
                  </Col>
                </Row>
              </template>
            </Card>
          </li>
        </ul>
        <ul v-else class="clearFloat">
          <li class="title">
            {{ $t('gatewayConfig.normalizeUpstreamError') }}:
          </li>
          <li class="value"><span class="empty-text">-</span></li>
        </ul>
      </div>
    </div>

    <div class="panel" v-if="balanceModeData">
      <div class="panel-header">
        {{ $t('gatewayConfig.balanceModeConfig') }}
      </div>
      <div class="panel-body">
        <ul class="clearFloat">
          <li class="title">{{ $t('gatewayConfig.balanceMode') }}:</li>
          <li class="value">
            <Tag
              :color="balanceModeData.balance_mode === 'EPP' ? 'blue' : 'default'"
            >
              {{ balanceModeData.balance_mode === 'EPP' ? $t('gatewayConfig.epp') : $t('gatewayConfig.wrr') }}
            </Tag>
          </li>
        </ul>
        <template
          v-if="balanceModeData.balance_mode === 'EPP' && balanceModeData.epp_config"
        >
          <ul class="clearFloat">
            <li class="title">{{ $t('gatewayConfig.loadProfile') }}:</li>
            <li class="value">{{ displayEppLoadProfile }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('gatewayConfig.affinity') }}:</li>
            <li class="value">{{ displayEppAffinity }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">
              {{ $t('gatewayConfig.prefixCacheAffinity') }}:
            </li>
            <li class="value">{{ displayEppPrefixCacheAffinity }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('gatewayConfig.sessionAffinity') }}:</li>
            <li class="value">{{ displayEppSessionAffinity }}</li>
          </ul>
          <ul v-if="displayEppSessionAffinityHeader" class="clearFloat">
            <li class="title">
              {{ $t('gatewayConfig.sessionAffinityHeader') }}:
            </li>
            <li class="value">{{ displayEppSessionAffinityHeader }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">
              {{ $t('gatewayConfig.kvCacheUtilizationMax') }}:
            </li>
            <li class="value">{{ displayEppKvCacheUtilizationMax }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('gatewayConfig.waitingQueueMax') }}:</li>
            <li class="value">{{ displayEppWaitingQueueMax }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('gatewayConfig.runningRequestsMax') }}:</li>
            <li class="value">{{ displayEppRunningRequestsMax }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('gatewayConfig.fallbackOnEmpty') }}:</li>
            <li class="value">{{ displayEppFallbackOnEmpty }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">
              {{ $t('gatewayConfig.metricsStalenessThresholdMs') }}:
            </li>
            <li class="value">{{ displayEppMetricsStaleness }}</li>
          </ul>
          <ul class="clearFloat detail-row-block policy-row">
            <li class="title">{{ $t('gatewayConfig.flowControl') }}:</li>
            <li class="value">
              <Card class="policy-card">
                <Row :gutter="24" class="review-row">
                  <Col span="12">
                    <div class="review-item">
                      <div class="review-label">
                        {{ $t('gatewayConfig.maxRequests') }}:
                      </div>
                      <div class="review-value">
                        {{ displayEppFlowControl.max_requests !== -1 ? displayEppFlowControl.max_requests : $t('gatewayConfig.maxRequestsUnlimited') }}
                      </div>
                    </div>
                  </Col>
                  <Col span="12">
                    <div class="review-item">
                      <div class="review-label">
                        {{ $t('gatewayConfig.queueTtl') }}:
                      </div>
                      <div class="review-value">
                        {{ displayEppFlowControl.queue_ttl }}s
                      </div>
                    </div>
                  </Col>
                </Row>
                <Row :gutter="24">
                  <Col span="12">
                    <div class="review-item">
                      <div class="review-label">
                        {{ $t('gatewayConfig.noEndpointQueueTtl') }}:
                      </div>
                      <div class="review-value">
                        {{ displayEppFlowControl.no_endpoint_queue_ttl }}s
                      </div>
                    </div>
                  </Col>
                  <Col span="12">
                    <div class="review-item">
                      <div class="review-label">
                        {{ $t('gatewayConfig.enableEviction') }}:
                      </div>
                      <div class="review-value">
                        {{ $t('gatewayConfig.enableEvictionReview') }}
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </li>
          </ul>
        </template>
        <ul
          v-if="balanceModeData.balance_mode === 'EPP' && displayEppRuntime"
          class="clearFloat detail-row-block policy-row"
        >
          <li class="title">{{ $t('gatewayConfig.eppRuntime') }}:</li>
          <li class="value">
            <Card class="policy-card">
              <Row :gutter="24" class="review-row">
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.eppCheckDisabled') }}:
                    </div>
                    <div class="review-value">
                      {{
                        displayEppRuntime.check.disabled
                          ? $t('com.enable')
                          : $t('com.deactivate')
                      }}
                    </div>
                  </div>
                </Col>
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.eppCheckInterval') }}:
                    </div>
                    <div class="review-value">
                      {{ displayEppRuntime.check.check_interval }}
                    </div>
                  </div>
                </Col>
              </Row>
              <Row :gutter="24" class="review-row">
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.eppFailThreshold') }}:
                    </div>
                    <div class="review-value">
                      {{ displayEppRuntime.check.fail_threshold }}
                    </div>
                  </div>
                </Col>
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.eppCooldown') }}:
                    </div>
                    <div class="review-value">
                      {{ displayEppRuntime.check.cooldown }}
                    </div>
                  </div>
                </Col>
              </Row>
              <Row :gutter="24" class="review-row">
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.eppSuccessThreshold') }}:
                    </div>
                    <div class="review-value">
                      {{ displayEppRuntime.check.success_threshold }}
                    </div>
                  </div>
                </Col>
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.eppConnectTimeout') }}:
                    </div>
                    <div class="review-value">
                      {{ displayEppRuntime.timeout.connect }}
                    </div>
                  </div>
                </Col>
              </Row>
              <Row :gutter="24" class="review-row">
                <Col span="12">
                  <div class="review-item">
                    <div class="review-label">
                      {{ $t('gatewayConfig.eppCallTimeout') }}:
                    </div>
                    <div class="review-value">
                      {{ displayEppRuntime.timeout.call }}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </li>
        </ul>
        <ul
          v-else-if="balanceModeData.balance_mode === 'EPP'"
          class="clearFloat"
        >
          <li class="title">{{ $t('gatewayConfig.eppRuntime') }}:</li>
          <li class="value">
            <span class="empty-text">{{
              $t('gatewayConfig.eppRuntimeUnset')
            }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
<script>
import { formatPassiveHealthCheckForApi } from './PassiveHealthCheck';
export default {
    name: 'Review',

    props: {
        baseConfigData: {
            type: Object,
            required: true
        },
        passiveHealthData: {
            type: Object,
            required: true
        },
        llmConfigData: {
            type: Object
        },
        balanceModeData: {
            type: Object,
            default: null
        },
        showFooter: {
            type: Boolean,
            default: true
        },
        isAdd: {
            type: Boolean,
            default: true
        },
        reportFlag: {
            type: Boolean
        }
    },
    watch: {
        reportFlag: {
            handler() {
                this.handleSubmit();
            }
        }
    },
    computed: {
        displayProvider() {
            const provider = this.llmConfigData && this.llmConfigData.provider;
            return provider || '-';
        },
        isStripPrefixEnabled() {
            return !!(this.llmConfigData && this.llmConfigData.strip_prefix);
        },
        displayStripPrefix() {
            return this.isStripPrefixEnabled
                ? this.$t('com.enable')
                : this.$t('com.deactivate');
        },
        displayMatchPrefix() {
            const prefix = this.llmConfigData && this.llmConfigData.match_prefix;
            return prefix || '-';
        },
        displayPassiveHealthData() {
            return formatPassiveHealthCheckForApi(this.passiveHealthData);
        },
        displayHealthCheckHost() {
            const host = this.displayPassiveHealthData && this.displayPassiveHealthData.host;
            return host || this.$t('cluster.healthCheckHostTip');
        },
        displayModels() {
            const models = this.llmConfigData && this.llmConfigData.models;
            if (!Array.isArray(models)) {
                return [];
            }
            return models
                .map(model => {
                    if (model && typeof model === 'object') {
                        return model.id || model.name || model.value || '';
                    }
                    return model;
                })
                .filter(model => model !== '' && model !== null && model !== undefined);
        },
        displayModelMappings() {
            const mappings = this.llmConfigData && this.llmConfigData.model_mappings;
            if (!Array.isArray(mappings)) {
                return [];
            }
            return mappings.filter(item => item && (item.source_model || item.target_model));
        },
        displayKeys() {
            const keys = this.llmConfigData && this.llmConfigData.keys;
            if (!Array.isArray(keys)) {
                return [];
            }
            return keys
                .filter(item => item && item.name)
                .map(item => ({
                    name: item.name || '',
                    weight: item.weight || 0
                }));
        },
        displayKeyPolicy() {
            const policy = this.llmConfigData && this.llmConfigData.key_policy;
            if (!policy) {
                return null;
            }
            const defaultPolicy = {
                strategy: 'weighted_random',
                max_retries: 0,
                retry_backoff_initial: 500,
                retry_backoff_max: 5000
            };
            const getValue = key => {
                const value = policy[key];
                return value !== undefined && value !== null && value !== '' ? value : defaultPolicy[key];
            };
            return {
                strategy: getValue('strategy'),
                max_retries: getValue('max_retries'),
                retry_backoff_initial: getValue('retry_backoff_initial'),
                retry_backoff_max: getValue('retry_backoff_max')
            };
        },
        displayKeyPolicyStrategy() {
            const strategy = this.displayKeyPolicy && this.displayKeyPolicy.strategy;
            if (strategy === 'weighted_random') {
                return this.$t('gatewayConfig.keyPolicyStrategyWeightedRandom');
            }
            return strategy || '-';
        },
        displayKeyAffinity() {
            const affinity = this.llmConfigData && this.llmConfigData.key_affinity;
            if (!affinity) {
                return null;
            }
            const defaults = {
                enabled: false,
                ttl: 600,
                redis_prefix: 'bfe:ai:key_affinity',
                penalty_enable: true
            };
            const getValue = key => {
                const value = affinity[key];
                return value !== undefined && value !== null && value !== '' ? value : defaults[key];
            };
            const isTrue = value => value === true || value === 'true';
            return {
                enabled: isTrue(getValue('enabled')),
                ttl: getValue('ttl'),
                redis_prefix: getValue('redis_prefix'),
                penalty_enable: isTrue(getValue('penalty_enable'))
            };
        },
        displayNormalizeUpstreamError() {
            const nue =
                this.llmConfigData && this.llmConfigData.normalize_upstream_error;
            if (!nue) {
                return null;
            }
            const defaults = {
                enabled: false,
                stream_enabled: false,
                unrecognized_action: 'passthrough',
                max_body_bytes: 65536,
                redact_secrets: true
            };
            const getValue = key => {
                const value = nue[key];
                return value !== undefined && value !== null && value !== ''
                    ? value
                    : defaults[key];
            };
            const isTrue = value => value === true || value === 'true';
            const isFalse = value => value === false || value === 'false';
            const redactSecrets = getValue('redact_secrets');
            return {
                enabled: isTrue(getValue('enabled')),
                stream_enabled: isTrue(getValue('stream_enabled')),
                unrecognized_action: getValue('unrecognized_action'),
                max_body_bytes: getValue('max_body_bytes'),
                redact_secrets: isFalse(redactSecrets) ? false : true
            };
        },
        displayNormalizeUnrecognizedAction() {
            const action = this.displayNormalizeUpstreamError
                && this.displayNormalizeUpstreamError.unrecognized_action;
            if (action === 'passthrough') {
                return this.$t('gatewayConfig.normalizePassthrough');
            }
            if (action === 'rewrite_generic') {
                return this.$t('gatewayConfig.normalizeRewriteGeneric');
            }
            return action || '-';
        },
        displayEppLoadProfile() {
            const epp = this.balanceModeData && this.balanceModeData.epp_config;
            if (!epp) return '-';
            return epp.load_profile || 'balanced';
        },
        displayEppAffinity() {
            const epp = this.balanceModeData && this.balanceModeData.epp_config;
            if (!epp) return '-';
            return epp.affinity || 'medium';
        },
        displayEppPrefixCacheAffinity() {
            const epp = this.balanceModeData && this.balanceModeData.epp_config;
            if (!epp) return '-';
            return epp.prefix_cache_affinity !== false ? this.$t('com.enable') : this.$t('com.deactivate');
        },
        displayEppSessionAffinity() {
            const epp = this.balanceModeData && this.balanceModeData.epp_config;
            if (!epp) return '-';
            return epp.session_affinity_enabled ? this.$t('com.enable') : this.$t('com.deactivate');
        },
        displayEppSessionAffinityHeader() {
            const epp = this.balanceModeData && this.balanceModeData.epp_config;
            if (!epp || !epp.session_affinity_enabled) return null;
            return epp.session_affinity_header || '';
        },
        displayEppKvCacheUtilizationMax() {
            const epp = this.balanceModeData && this.balanceModeData.epp_config;
            if (!epp) return '-';
            return epp.kv_cache_utilization_max != null ? epp.kv_cache_utilization_max : 0.9;
        },
        displayEppWaitingQueueMax() {
            const epp = this.balanceModeData && this.balanceModeData.epp_config;
            if (!epp) return '-';
            return epp.waiting_queue_max != null ? epp.waiting_queue_max : 0;
        },
        displayEppRunningRequestsMax() {
            const epp = this.balanceModeData && this.balanceModeData.epp_config;
            if (!epp) return '-';
            return epp.running_requests_max != null ? epp.running_requests_max : 0;
        },
        displayEppFallbackOnEmpty() {
            const epp = this.balanceModeData && this.balanceModeData.epp_config;
            if (!epp) return '-';
            return epp.fallback_on_empty ? this.$t('com.enable') : this.$t('com.deactivate');
        },
        displayEppMetricsStaleness() {
            const epp = this.balanceModeData && this.balanceModeData.epp_config;
            if (!epp) return '-';
            return epp.metrics_staleness_threshold_ms != null
                ? epp.metrics_staleness_threshold_ms
                : 200;
        },
        displayEppFlowControl() {
            const epp = this.balanceModeData && this.balanceModeData.epp_config;
            if (!epp) return null;
            return {
                max_requests: -1,
                queue_ttl: 60,
                no_endpoint_queue_ttl: 60,
                enable_eviction: false,
                ...(epp.flow_control || {})
            };
        },
        displayEppRuntime() {
            const rt = this.balanceModeData && this.balanceModeData.epp_runtime;
            if (!rt) {
                return null;
            }
            const check = rt.check || null;
            const timeout = rt.timeout || null;
            // 未配置 check/timeout 视为未配置（GET 返回 null；空对象不展示为默认值已落盘）
            if (!check && !timeout) {
                return null;
            }
            const isTrue = value => value === true || value === 'true';
            return {
                check: {
                    disabled: !!(check && isTrue(check.disabled)),
                    check_interval:
                        check && check.check_interval != null
                            ? check.check_interval
                            : '2s',
                    fail_threshold:
                        check && check.fail_threshold != null
                            ? check.fail_threshold
                            : 3,
                    cooldown:
                        check && check.cooldown != null ? check.cooldown : '45s',
                    success_threshold:
                        check && check.success_threshold != null
                            ? check.success_threshold
                            : 2
                },
                timeout: {
                    connect:
                        timeout && timeout.connect != null
                            ? timeout.connect
                            : '500ms',
                    call: timeout && timeout.call != null ? timeout.call : '3s'
                }
            };
        }
    },
    methods: {
        handleSubmit() {
            this.$emit('submitData');
        }
    }
};
</script>
<style lang="less" scoped>
.com-btn-box {
    margin-top: 15px;
}

.Review {
    .panel-body ul.clearFloat {
        display: flex;
        align-items: center;
        line-height: 22px;
        padding: 6px 0;
        min-height: 30px;

        &::after {
            display: none;
        }

        .title {
            float: none;
            width: 200px;
            flex-shrink: 0;
            text-align: right;
            white-space: normal;
            overflow: visible;
        }

        .value {
            float: none;
            flex: 1;
            padding-left: 16px;
            min-width: 0;
            word-break: break-word;
        }
    }

    .panel-body ul.clearFloat.detail-row-block,
    .panel-body ul.clearFloat.policy-row {
        align-items: flex-start;
    }

    .detail-row-block {
        .title {
            padding-top: 8px;
        }
    }
}

.model-tag {
    display: inline-block;
    margin: 0 8px 8px 0;
    padding: 2px 10px;
    background: #ecf5ff;
    border: 1px solid #d9ecff;
    border-radius: 3px;
    color: #409eff;
    font-size: 12px;
    line-height: 20px;
}

.empty-text {
    color: #999;
}

.mapping-table {
    width: auto;
    min-width: 420px;
    max-width: 100%;
    border-collapse: collapse;
    border: 1px solid #e7e9f0;
    margin: 0;

    th,
    td {
        padding: 8px 16px;
        text-align: left;
        border: 1px solid #e7e9f0;
        font-size: 13px;
        line-height: 20px;
        word-break: break-all;
    }

    th {
        background: #f8f8f9;
        color: #515a6e;
        font-weight: 500;
    }

    td {
        color: #333;
        background: #fff;
    }
}

.policy-row {
    .policy-card {
        width: 100%;
        margin-top: 0;

        .review-row {
            margin-bottom: 16px;

            &:last-child {
                margin-bottom: 0;
            }
        }
    }
}

.review-item {
    display: flex;
    align-items: center;

    .review-label {
        width: 190px;
        flex-shrink: 0;
        text-align: right;
        margin-right: 8px;
        margin-bottom: 0;
        font-size: 13px;
        color: #515a6e;
        line-height: 22px;
        white-space: nowrap;
    }

    .review-value {
        flex: 1;
        font-size: 13px;
        color: #333;
        line-height: 22px;
        word-break: break-word;
    }
}
</style>
