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
    <Form
      label-position="top"
      ref="formData"
      :model="formData"
      :rules="ruleValidate"
      @submit.native.prevent
    >
      <Card
        :title="$t('gatewayConfig.modelServiceConfig')"
        class="llm-section-card"
      >
        <FormItem prop="provider">
          <span slot="label" class="provider-label">
            {{ $t('gatewayConfig.ownedProvider') }}
            <Tooltip placement="top" transfer max-width="320">
              <div slot="content" class="provider-tip-content">
                {{ $t('gatewayConfig.ownedProviderTip') }}
              </div>
              <Icon type="ios-help-circle-outline" class="provider-help-icon" />
            </Tooltip>
          </span>
          <el-select
            v-model="formData.provider"
            filterable
            size="small"
            :loading="providerNamesLoading"
            @change="onProviderChange"
          >
            <el-option
              v-for="item in providerNames"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </FormItem>
        <FormItem prop="models">
          <span slot="label" class="provider-label">
            {{ $t('gatewayConfig.forwardModels') }}
            <Tooltip placement="top" transfer max-width="320">
              <div slot="content" class="provider-tip-content">
                {{ $t('gatewayConfig.forwardModelsTip') }}
              </div>
              <Icon type="ios-help-circle-outline" class="provider-help-icon" />
            </Tooltip>
          </span>
          <el-select
            v-model="formData.models"
            style="width: 100%;"
            size="small"
            multiple
            clearable
            filterable
            :disabled="!formData.provider || providerDetailLoading"
            @change="onForwardModelsChange"
          >
            <el-option
              v-if="providerModels.length && !allModelsSelected"
              key="__select_all_models__"
              class="forward-models-select-all"
              :label="$t('gatewayConfig.selectAll')"
              :value="selectAllModelsMarker"
            />
            <el-option
              v-for="item in providerModels"
              :key="item"
              :value="item"
              :label="item"
            />
          </el-select>
        </FormItem>
        <FormItem prop="strip_prefix">
          <span slot="label" class="provider-label">
            {{ $t('gatewayConfig.stripPrefix') }}
            <Tooltip placement="top" transfer max-width="320">
              <div slot="content" class="provider-tip-content">
                {{ $t('gatewayConfig.stripPrefixTip') }}
              </div>
              <Icon type="ios-help-circle-outline" class="provider-help-icon" />
            </Tooltip>
          </span>
          <i-switch v-model="formData.strip_prefix" />
        </FormItem>
        <FormItem v-if="formData.strip_prefix" prop="match_prefix">
          <span slot="label" class="provider-label">
            {{ $t('gatewayConfig.matchPrefix') }}
            <Tooltip placement="top" transfer max-width="320">
              <div slot="content" class="provider-tip-content">
                {{ $t('gatewayConfig.matchPrefixTip') }}
              </div>
              <Icon type="ios-help-circle-outline" class="provider-help-icon" />
            </Tooltip>
          </span>
          <Input
            v-model="formData.match_prefix"
            :placeholder="$t('gatewayConfig.matchPrefixPlaceholder')"
          />
        </FormItem>
      </Card>

      <Card :title="$t('gatewayConfig.modelRedirect')" class="llm-section-card">
        <FormItem prop="model_mappings">
          <table>
            <thead>
              <tr>
                <th>{{ $t('gatewayConfig.originalModelName') }}</th>
                <th>{{ $t('gatewayConfig.backendModelName') }}</th>
                <th>{{ $t('com.operation') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(model, index) in formData.model_mappings"
                :key="index"
              >
                <td>
                  <Input
                    v-model="model.source_model"
                    :placeholder="$t('gatewayConfig.enterOriginalModelName')"
                  />
                </td>
                <td>
                  <Select
                    v-model="model.target_model"
                    :placeholder="$t('gatewayConfig.selectTargetModel')"
                    @on-change="value => changeMappingTarget(index, value)"
                  >
                    <Option
                      v-for="(item, idx) in formData.models"
                      :value="item"
                      :key="idx"
                      >{{ item }}</Option
                    >
                  </Select>
                </td>
                <td>
                  <Button
                    type="error"
                    size="small"
                    @click="removeModelMapping(index)"
                  >
                    {{ $t('com.del') }}
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <Button
            class="mt20"
            size="small"
            type="primary"
            @click="addModelRedirect"
          >
            {{ $t('gatewayConfig.add') }}
          </Button>
        </FormItem>
      </Card>

      <Card
        :title="$t('gatewayConfig.serviceAuthKeys')"
        class="llm-section-card"
      >
        <FormItem prop="keys">
          <table class="keys-table">
            <thead>
              <tr>
                <th>{{ $t('gatewayConfig.providerKey') }}</th>
                <th style="width: 120px;">
                  {{ $t('gatewayConfig.keyWeight') }}
                </th>
                <th style="width: 80px;">{{ $t('com.operation') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(keyItem, index) in formData.keys"
                :key="`key-${index}`"
              >
                <td>
                  <FormItem
                    :prop="`keys.${index}.name`"
                    :rules="keyNameRules(index)"
                    class="inline-form-item"
                  >
                    <Select
                      v-model="keyItem.name"
                      :placeholder="$t('gatewayConfig.providerKeyPlaceholder')"
                      :disabled="!formData.provider || providerDetailLoading"
                      @on-change="validateKeysState"
                    >
                      <Option
                        v-for="item in availableProviderKeys(index)"
                        :key="item.name"
                        :value="item.name"
                        >{{ item.name }}</Option
                      >
                    </Select>
                  </FormItem>
                </td>
                <td>
                  <FormItem
                    :prop="`keys.${index}.weight`"
                    :rules="keyWeightRules(index)"
                    class="inline-form-item"
                  >
                    <InputNumber
                      v-model="keyItem.weight"
                      :min="0"
                      :max="100"
                      :precision="0"
                      style="width: 100%;"
                      @on-change="validateKeysState"
                    />
                  </FormItem>
                </td>
                <td>
                  <Button type="error" size="small" @click="removeKey(index)">
                    {{ $t('com.del') }}
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <Button class="mt20" size="small" type="primary" @click="addKey">
            + {{ $t('gatewayConfig.addKey') }}
          </Button>
        </FormItem>
      </Card>

      <Card :title="$t('gatewayConfig.keyPolicy')" class="llm-section-card">
        <Row :gutter="24">
          <Col span="24">
            <FormItem
              :label="$t('gatewayConfig.keyPolicyStrategy')"
              prop="key_policy.strategy"
            >
              <Select v-model="formData.key_policy.strategy">
                <Option value="weighted_random">weighted_random</Option>
              </Select>
            </FormItem>
          </Col>
          <Col span="12">
            <FormItem
              :label="$t('gatewayConfig.keyPolicyMaxRetries')"
              prop="key_policy.max_retries"
            >
              <InputNumber
                v-model="formData.key_policy.max_retries"
                :min="0"
                :precision="0"
                style="width: 100%;"
              />
            </FormItem>
          </Col>
        </Row>
        <Row :gutter="24">
          <Col span="12">
            <FormItem
              :label="$t('gatewayConfig.keyPolicyRetryBackoffInitial')"
              prop="key_policy.retry_backoff_initial"
            >
              <InputNumber
                v-model="formData.key_policy.retry_backoff_initial"
                :min="0"
                :precision="0"
                style="width: 100%;"
              />
            </FormItem>
          </Col>
          <Col span="12">
            <FormItem
              :label="$t('gatewayConfig.keyPolicyRetryBackoffMax')"
              prop="key_policy.retry_backoff_max"
            >
              <InputNumber
                v-model="formData.key_policy.retry_backoff_max"
                :min="0"
                :precision="0"
                style="width: 100%;"
              />
            </FormItem>
          </Col>
        </Row>
      </Card>

      <Card :title="$t('gatewayConfig.keyAffinity')" class="llm-section-card">
        <Row :gutter="24">
          <Col span="12">
            <FormItem prop="key_affinity.enabled">
              <span slot="label" class="provider-label">
                {{ $t('gatewayConfig.keyAffinityEnabled') }}
                <Tooltip placement="top" transfer max-width="320">
                  <div slot="content" class="provider-tip-content">
                    {{ $t('gatewayConfig.keyAffinityEnabledTip') }}
                  </div>
                  <Icon
                    type="ios-help-circle-outline"
                    class="provider-help-icon"
                  />
                </Tooltip>
              </span>
              <el-select v-model="formData.key_affinity.enabled" size="small">
                <el-option :value="false" :label="$t('com.deactivate')" />
                <el-option :value="true" :label="$t('com.enable')" />
              </el-select>
            </FormItem>
          </Col>
        </Row>
        <template v-if="formData.key_affinity.enabled">
          <Row :gutter="24">
            <Col span="12">
              <FormItem
                :label="$t('gatewayConfig.keyAffinityTtl')"
                prop="key_affinity.ttl"
              >
                <InputNumber
                  v-model="formData.key_affinity.ttl"
                  :min="1"
                  :precision="0"
                  style="width: 100%;"
                />
              </FormItem>
            </Col>
            <Col span="12">
              <FormItem prop="key_affinity.penalty_enable">
                <span slot="label" class="provider-label">
                  {{ $t('gatewayConfig.keyAffinityPenalty') }}
                  <Tooltip placement="top" transfer max-width="320">
                    <div slot="content" class="provider-tip-content">
                      {{ $t('gatewayConfig.keyAffinityPenaltyTip') }}
                    </div>
                    <Icon
                      type="ios-help-circle-outline"
                      class="provider-help-icon"
                    />
                  </Tooltip>
                </span>
                <el-select
                  v-model="formData.key_affinity.penalty_enable"
                  size="small"
                >
                  <el-option :value="false" :label="$t('com.deactivate')" />
                  <el-option :value="true" :label="$t('com.enable')" />
                </el-select>
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="24">
            <Col span="12">
              <FormItem
                :label="$t('gatewayConfig.keyAffinityRedisPrefix')"
                prop="key_affinity.redis_prefix"
              >
                <Input
                  v-model="formData.key_affinity.redis_prefix"
                  :placeholder="$t('gatewayConfig.keyAffinityRedisPrefixPlaceholder')"
                />
              </FormItem>
            </Col>
          </Row>
        </template>
      </Card>

      <Card
        :title="$t('gatewayConfig.balanceModeConfig')"
        class="llm-section-card"
      >
        <Row :gutter="24">
          <Col span="12">
            <FormItem
              :label="$t('gatewayConfig.balanceMode')"
              prop="balance_mode"
            >
              <Select v-model="formData.balance_mode">
                <Option value="WRR">{{ $t('gatewayConfig.wrr') }}</Option>
                <Option value="EPP">{{ $t('gatewayConfig.epp') }}</Option>
              </Select>
            </FormItem>
          </Col>
        </Row>
        <template v-if="formData.balance_mode === 'EPP'">
          <Row :gutter="24">
            <Col span="12">
              <FormItem
                :label="$t('gatewayConfig.schedulingProfile')"
                prop="epp_config.scheduling_profile"
              >
                <Select v-model="formData.epp_config.scheduling_profile">
                  <Option
                    value="latency-first"
                    >{{ $t('gatewayConfig.schedulingProfileLatencyFirst') }}</Option
                  >
                  <Option
                    value="balanced"
                    >{{ $t('gatewayConfig.schedulingProfileBalanced') }}</Option
                  >
                  <Option
                    value="throughput-first"
                    >{{ $t('gatewayConfig.schedulingProfileThroughputFirst') }}</Option
                  >
                </Select>
              </FormItem>
            </Col>
            <Col span="12">
              <FormItem
                :label="$t('gatewayConfig.cacheAffinity')"
                prop="epp_config.cache_affinity"
              >
                <Select v-model="formData.epp_config.cache_affinity">
                  <Option
                    value="low"
                    >{{ $t('gatewayConfig.cacheAffinityLow') }}</Option
                  >
                  <Option
                    value="medium"
                    >{{ $t('gatewayConfig.cacheAffinityMedium') }}</Option
                  >
                  <Option
                    value="high"
                    >{{ $t('gatewayConfig.cacheAffinityHigh') }}</Option
                  >
                </Select>
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="24">
            <Col span="12">
              <FormItem prop="epp_config.prefix_cache_affinity">
                <span slot="label" class="provider-label">
                  {{ $t('gatewayConfig.prefixCacheAffinity') }}
                  <Tooltip placement="top" transfer max-width="320">
                    <div slot="content" class="provider-tip-content">
                      {{ $t('gatewayConfig.prefixCacheAffinityTip') }}
                    </div>
                    <Icon
                      type="ios-help-circle-outline"
                      class="provider-help-icon"
                    />
                  </Tooltip>
                </span>
                <i-switch v-model="formData.epp_config.prefix_cache_affinity" />
              </FormItem>
            </Col>
            <Col span="12">
              <FormItem prop="epp_config.session_affinity_enabled">
                <span slot="label" class="provider-label">
                  {{ $t('gatewayConfig.sessionAffinity') }}
                  <Tooltip placement="top" transfer max-width="320">
                    <div slot="content" class="provider-tip-content">
                      {{ $t('gatewayConfig.sessionAffinityTip') }}
                    </div>
                    <Icon
                      type="ios-help-circle-outline"
                      class="provider-help-icon"
                    />
                  </Tooltip>
                </span>
                <i-switch
                  v-model="formData.epp_config.session_affinity_enabled"
                />
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="24">
            <Col span="12">
              <FormItem
                :label="$t('gatewayConfig.kvCacheUtilizationMax')"
                prop="epp_config.kv_cache_utilization_max"
              >
                <InputNumber
                  v-model="formData.epp_config.kv_cache_utilization_max"
                  :min="0.01"
                  :max="1"
                  :step="0.05"
                  style="width: 100%;"
                />
              </FormItem>
            </Col>
            <Col span="12" v-if="formData.epp_config.session_affinity_enabled">
              <FormItem
                :label="$t('gatewayConfig.sessionAffinityHeader')"
                prop="epp_config.session_affinity_header"
              >
                <Input
                  v-model="formData.epp_config.session_affinity_header"
                  :placeholder="$t('gatewayConfig.sessionAffinityHeaderPlaceholder')"
                />
              </FormItem>
            </Col>
          </Row>

          <Card
            :title="$t('gatewayConfig.flowControl')"
            class="llm-section-card"
            style="margin-top:12px;"
          >
            <Row :gutter="24">
              <Col span="12">
                <FormItem
                  :label="$t('gatewayConfig.maxRequests')"
                  prop="epp_config.flow_control.max_requests"
                >
                  <Select v-model="maxRequestsMode">
                    <Option
                      value="unlimited"
                      >{{ $t('gatewayConfig.maxRequestsUnlimited') }}</Option
                    >
                    <Option
                      value="limited"
                      >{{ $t('gatewayConfig.maxRequestsLimited') }}</Option
                    >
                  </Select>
                  <InputNumber
                    v-if="maxRequestsMode === 'limited'"
                    v-model="formData.epp_config.flow_control.max_requests"
                    :min="1"
                    :precision="0"
                    style="width: 100%; margin-top: 8px;"
                  />
                </FormItem>
              </Col>
              <Col span="12">
                <FormItem
                  :label="$t('gatewayConfig.queueTtl')"
                  prop="epp_config.flow_control.queue_ttl"
                >
                  <InputNumber
                    v-model="formData.epp_config.flow_control.queue_ttl"
                    :min="0"
                    :precision="0"
                    style="width: 100%;"
                  />
                </FormItem>
              </Col>
            </Row>
            <Row :gutter="24">
              <Col span="12">
                <FormItem
                  :label="$t('gatewayConfig.noEndpointQueueTtl')"
                  prop="epp_config.flow_control.no_endpoint_queue_ttl"
                >
                  <InputNumber
                    v-model="formData.epp_config.flow_control.no_endpoint_queue_ttl"
                    :min="0"
                    :precision="0"
                    style="width: 100%;"
                  />
                </FormItem>
              </Col>
              <Col span="12">
                <FormItem prop="epp_config.flow_control.enable_eviction">
                  <span slot="label" class="provider-label">
                    {{ $t('gatewayConfig.enableEviction') }}
                    <Tooltip placement="top" transfer max-width="320">
                      <div slot="content" class="provider-tip-content">
                        {{ $t('gatewayConfig.enableEvictionTip') }}
                      </div>
                      <Icon
                        type="ios-help-circle-outline"
                        class="provider-help-icon"
                      />
                    </Tooltip>
                  </span>
                  <i-switch
                    v-model="formData.epp_config.flow_control.enable_eviction"
                  />
                </FormItem>
              </Col>
            </Row>
          </Card>
        </template>
      </Card>
    </Form>
  </div>
</template>

<script>
import { cloneDeep } from 'lodash';

const SELECT_ALL_MODELS_VALUE = '__SELECT_ALL_MODELS__';

function defaultKeyPolicy() {
    return {
        strategy: 'weighted_random',
        max_retries: 0,
        retry_backoff_initial: 500,
        retry_backoff_max: 5000
    };
}

function defaultKeyAffinity() {
    return {
        enabled: true,
        ttl: 600,
        redis_prefix: 'bfe:ai:key_affinity',
        penalty_enable: true
    };
}

function defaultEppConfig() {
    return {
        scheduling_profile: 'balanced',
        cache_affinity: 'medium',
        prefix_cache_affinity: true,
        session_affinity_enabled: false,
        session_affinity_header: '',
        kv_cache_utilization_max: 0.9,
        flow_control: {
            max_requests: -1,
            queue_ttl: 60,
            no_endpoint_queue_ttl: 60,
            enable_eviction: false
        }
    };
}

function toBoolean(value, defaultValue) {
    if (value === true || value === 'true' || value === 1 || value === '1') {
        return true;
    }
    if (value === false || value === 'false' || value === 0 || value === '0') {
        return false;
    }
    return defaultValue;
}

export default {
    name: 'GatewayConfig',

    props: {
        reportFlag: {
            type: Boolean,
            default: false
        },
        llmConfigData: {
            type: Object,
            default() {
                return {};
            }
        },
        balanceModeData: {
            type: Object,
            default() {
                return {};
            }
        },
        isAdd: {
            type: Boolean,
            default: false
        },
        stepsCurrentState: {
            type: Number,
            default: 0
        }
    },

    data() {
        const that = this;
        const validateProvider = (rule, value, callback) => {
            if (!value) {
                callback(new Error(that.$t('gatewayConfig.ownedProviderRequired')));
                return;
            }
            callback();
        };
        const validateModels = (rule, value, callback) => {
            if (!value || !value.length) {
                callback(new Error(that.$t('gatewayConfig.modelsRequired')));
                return;
            }
            const allowed = that.providerModels;
            const invalid = value.find(item => allowed.indexOf(item) === -1);
            if (invalid) {
                callback(new Error(that.$t('gatewayConfig.modelNotInProvider', { model: invalid })));
                return;
            }
            callback();
        };
        const validateMatchPrefix = (rule, value, callback) => {
            if (!that.formData.strip_prefix) {
                callback();
                return;
            }
            if (!value || !String(value).trim()) {
                callback(new Error(that.$t('gatewayConfig.matchPrefixRequiredWhenStrip')));
                return;
            }
            if (!String(value).endsWith('/')) {
                callback(new Error(that.$t('gatewayConfig.matchPrefixMustEndWithSlash')));
                return;
            }
            callback();
        };
        const validateMappings = (rule, value, callback) => {
            const mappings = value || [];
            const sources = {};
            for (let i = 0; i < mappings.length; i++) {
                const source = String(mappings[i].source_model || '').trim();
                const target = String(mappings[i].target_model || '').trim();
                if (!source && !target) {
                    continue;
                }
                if (!source) {
                    callback(new Error(that.$t('gatewayConfig.modelMappingKeyRequired', { line: i + 1 })));
                    return;
                }
                if (!target) {
                    callback(new Error(that.$t('gatewayConfig.modelMappingValueRequired', { line: i + 1 })));
                    return;
                }
                if (sources[source]) {
                    callback(new Error(that.$t('gatewayConfig.duplicateModelName')));
                    return;
                }
                sources[source] = true;
            }
            callback();
        };
        const validateKeys = (rule, value, callback) => {
            const keys = (value || []).filter(item => String(item.name || '').trim());
            if (!keys.length) {
                callback();
                return;
            }
            const names = {};
            const providerKeyNames = that.providerKeys.map(item => item.name);
            let sum = 0;
            for (let i = 0; i < keys.length; i++) {
                const name = String(keys[i].name || '').trim();
                const weight = Number(keys[i].weight);
                if (providerKeyNames.indexOf(name) === -1) {
                    callback(new Error(that.$t('gatewayConfig.keyNotInProvider', { name })));
                    return;
                }
                if (names[name]) {
                    callback(new Error(that.$t('gatewayConfig.keyNameDuplicate')));
                    return;
                }
                names[name] = true;
                if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
                    callback(new Error(that.$t('gatewayConfig.keyWeightRangeError')));
                    return;
                }
                sum += weight;
            }
            if (sum !== 100) {
                callback(new Error(that.$t('gatewayConfig.keysWeightSumError')));
                return;
            }
            callback();
        };
        const validateKeyPolicyMaxRetries = (rule, value, callback) => {
            const retries = Number(value);
            if (!Number.isFinite(retries) || retries < 0 || !Number.isInteger(retries)) {
                callback(new Error(that.$t('gatewayConfig.keyPolicyMaxRetriesInvalid')));
                return;
            }
            callback();
        };
        const validateBackoffMax = (rule, value, callback) => {
            const initial = Number(that.formData.key_policy.retry_backoff_initial);
            const max = Number(value);
            if (Number.isFinite(initial) && Number.isFinite(max) && max < initial) {
                callback(new Error(that.$t('gatewayConfig.keyPolicyBackoffMaxInvalid')));
                return;
            }
            callback();
        };
        const validateKeyAffinityTtl = (rule, value, callback) => {
            if (!that.formData.key_affinity.enabled) {
                callback();
                return;
            }
            const ttl = Number(value);
            if (!Number.isFinite(ttl) || ttl <= 0 || !Number.isInteger(ttl)) {
                callback(new Error(that.$t('gatewayConfig.keyAffinityTtlInvalid')));
                return;
            }
            callback();
        };
        const validateKeyAffinityRedisPrefix = (rule, value, callback) => {
            if (!that.formData.key_affinity.enabled) {
                callback();
                return;
            }
            if (!value || !String(value).trim()) {
                callback(new Error(that.$t('gatewayConfig.keyAffinityRedisPrefixRequired')));
                return;
            }
            callback();
        };
        const validateSessionAffinityHeader = (rule, value, callback) => {
            if (!that.formData.epp_config.session_affinity_enabled) {
                callback();
                return;
            }
            if (!value || !String(value).trim()) {
                callback(new Error(that.$t('gatewayConfig.sessionAffinityHeaderRequired')));
                return;
            }
            callback();
        };

        const validateKvCacheUtilizationMax = (rule, value, callback) => {
            if (value === undefined || value === null || value === '') {
                callback();
                return;
            }
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0 || n > 1) {
                callback(new Error(that.$t('gatewayConfig.kvCacheUtilizationMaxInvalid')));
                return;
            }
            callback();
        };

        const validateQueueTtl = (rule, value, callback) => {
            if (value === undefined || value === null || value === '') {
                callback();
                return;
            }
            const n = Number(value);
            if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
                callback(new Error(that.$t('gatewayConfig.queueTtlInvalid')));
                return;
            }
            callback();
        };

        const validateMaxRequests = (rule, value, callback) => {
            if (that.maxRequestsMode === 'unlimited') {
                callback();
                return;
            }
            if (value == null || value === '') {
                callback(new Error(that.$t('gatewayConfig.maxRequestsRequired')));
                return;
            }
            const n = Number(value);
            if (!Number.isInteger(n) || n <= 0) {
                callback(new Error(that.$t('gatewayConfig.maxRequestsRequired')));
                return;
            }
            callback();
        };

        const validateNoEndpointQueueTtl = (rule, value, callback) => {
            if (value === undefined || value === null || value === '') {
                callback();
                return;
            }
            const n = Number(value);
            if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
                callback(new Error(that.$t('gatewayConfig.noEndpointQueueTtlInvalid')));
                return;
            }
            callback();
        };

        return {
            selectAllModelsMarker: SELECT_ALL_MODELS_VALUE,
            providerNames: [],
            providerNamesLoading: false,
            providerDetailLoading: false,
            selectedProvider: null,
            maxRequestsModeValue: 'unlimited',
            maxRequestsLimitedValue: null,
            formData: {
                provider: '',
                match_prefix: '',
                strip_prefix: false,
                models: [],
                model_mappings: [{ source_model: '', target_model: '' }],
                keys: [{ name: '', weight: 0 }],
                key_policy: defaultKeyPolicy(),
                key_affinity: defaultKeyAffinity(),
                balance_mode: 'WRR',
                epp_config: defaultEppConfig()
            },
            ruleValidate: {
                provider: [{ validator: validateProvider, trigger: 'change', required: true }],
                models: [{ validator: validateModels, trigger: 'change', required: true }],
                match_prefix: [{ validator: validateMatchPrefix, trigger: 'blur' }],
                model_mappings: [{ validator: validateMappings, trigger: 'change' }],
                keys: [{ validator: validateKeys, trigger: 'change' }],
                'key_policy.max_retries': [{ validator: validateKeyPolicyMaxRetries, trigger: 'change' }],
                'key_policy.retry_backoff_max': [{ validator: validateBackoffMax, trigger: 'change' }],
                'key_affinity.ttl': [{ validator: validateKeyAffinityTtl, trigger: 'change' }],
                'key_affinity.redis_prefix': [{ validator: validateKeyAffinityRedisPrefix, trigger: 'blur' }],
                'epp_config.session_affinity_header': [{ validator: validateSessionAffinityHeader, trigger: 'blur' }],
                'epp_config.kv_cache_utilization_max': [
                    { validator: validateKvCacheUtilizationMax, trigger: 'change' }
                ],
                'epp_config.flow_control.max_requests': [
                    { validator: validateMaxRequests, trigger: 'change' }
                ],
                'epp_config.flow_control.queue_ttl': [
                    { validator: validateQueueTtl, trigger: 'change' }
                ],
                'epp_config.flow_control.no_endpoint_queue_ttl': [
                    { validator: validateNoEndpointQueueTtl, trigger: 'change' }
                ]
            }
        };
    },

    computed: {
        providerModels() {
            return (this.selectedProvider && this.selectedProvider.models) || [];
        },
        providerKeys() {
            return (this.selectedProvider && this.selectedProvider.keys) || [];
        },
        allModelsSelected() {
            const all = this.providerModels;
            if (!all.length) {
                return false;
            }
            const selected = this.formData.models || [];
            return all.every(model => selected.includes(model));
        },
        maxRequestsMode: {
                get() {
                    return this.maxRequestsModeValue;
                },
                set(val) {
                    this.maxRequestsModeValue = val;
                    if (this.formData.epp_config && this.formData.epp_config.flow_control) {
                        if (val === 'unlimited') {
                            this.maxRequestsLimitedValue = this.formData.epp_config.flow_control.max_requests;
                            this.formData.epp_config.flow_control.max_requests = -1;
                        } else {
                            const restored = this.maxRequestsLimitedValue != null && this.maxRequestsLimitedValue !== -1
                                ? this.maxRequestsLimitedValue
                                : null;
                            this.formData.epp_config.flow_control.max_requests = restored;
                        }
                    }
                }
            }
    },

    watch: {
        reportFlag() {
            this.handleSubmit();
        },
        llmConfigData: {
            handler(val) {
                this.applyLlmConfig(val);
            },
            immediate: true,
            deep: true
        },
        balanceModeData: {
            handler(val) {
                this.applyBalanceModeData(val);
            },
            immediate: true,
            deep: true
        },
        'formData.strip_prefix'(val) {
            if (!val) {
                this.formData.match_prefix = '';
            }
        }
    },

    mounted() {
        this.fetchProviderNames();
    },

    methods: {
        onForwardModelsChange(value) {
            const selected = value || [];
            const marker = this.selectAllModelsMarker;
            if (!selected.includes(marker)) {
                this.formData.models = selected;
                return;
            }
            this.formData.models = this.providerModels.slice();
        },
        fetchProviderNames() {
            this.providerNamesLoading = true;
            this.$request({
                url: 'providers/actions/get-provider-names',
                method: 'get',
                openapi: true
            })
                .then(res => {
                    if (res.status === 200) {
                        this.providerNames = (res.data.Data && res.data.Data.names) || [];
                        if (this.formData.provider) {
                            this.loadProviderDetail(this.formData.provider);
                        }
                    }
                })
                .finally(() => {
                    this.providerNamesLoading = false;
                });
        },
        loadProviderDetail(name) {
            if (!name) {
                this.selectedProvider = null;
                return Promise.resolve();
            }
            this.providerDetailLoading = true;
            return this.$request({
                url: this.$urlFormat('providers/{provider_name}', {
                    provider_name: name
                }),
                method: 'get',
                openapi: true
            })
                .then(res => {
                    if (this.formData.provider !== name) {
                        return;
                    }
                    if (res.status === 200 && res.data.Data) {
                        this.selectedProvider = res.data.Data;
                        this.syncFormWithProvider();
                    } else {
                        this.selectedProvider = null;
                    }
                })
                .catch(() => {
                    if (this.formData.provider === name) {
                        this.selectedProvider = null;
                    }
                })
                .finally(() => {
                    if (this.formData.provider === name) {
                        this.providerDetailLoading = false;
                    }
                });
        },
        applyLlmConfig(val) {
            const src = val || {};
            this.formData.provider = src.provider || '';
            this.formData.match_prefix = src.match_prefix || '';
            this.formData.strip_prefix = !!src.strip_prefix;
            this.formData.models = (src.models || []).slice();
            this.formData.model_mappings =
                src.model_mappings && src.model_mappings.length
                    ? cloneDeep(src.model_mappings)
                    : [{ source_model: '', target_model: '' }];
            this.formData.keys =
                src.keys && src.keys.length
                    ? src.keys.map(item => ({
                        name: item.name || '',
                        weight: item.weight != null ? Number(item.weight) : 0
                    }))
                    : [{ name: '', weight: 0 }];
            this.formData.key_policy = {
                ...defaultKeyPolicy(),
                ...(src.key_policy || {})
            };
            const affinitySrc = src.key_affinity || {};
            this.formData.key_affinity = {
                enabled: toBoolean(affinitySrc.enabled, true),
                ttl: affinitySrc.ttl != null ? Number(affinitySrc.ttl) : 600,
                redis_prefix: affinitySrc.redis_prefix || 'bfe:ai:key_affinity',
                penalty_enable: toBoolean(affinitySrc.penalty_enable, true)
            };
            if (this.formData.provider) {
                this.loadProviderDetail(this.formData.provider);
            } else {
                this.selectedProvider = null;
            }
        },
        applyBalanceModeData(val) {
            const src = val || {};
            this.$set(this.formData, 'balance_mode', src.balance_mode || 'WRR');
            const eppSrc = src.epp_config || {};
            const maxRequests = (eppSrc.flow_control || {}).max_requests != null
                ? Number((eppSrc.flow_control || {}).max_requests)
                : -1;
            this.maxRequestsModeValue = maxRequests === -1 ? 'unlimited' : 'limited';
            this.maxRequestsLimitedValue = maxRequests === -1 ? null : maxRequests;
            this.formData.epp_config = {
                ...defaultEppConfig(),
                ...eppSrc,
                prefix_cache_affinity: toBoolean(eppSrc.prefix_cache_affinity, true),
                session_affinity_enabled: toBoolean(eppSrc.session_affinity_enabled, false),
                session_affinity_header: eppSrc.session_affinity_header || '',
                kv_cache_utilization_max: eppSrc.kv_cache_utilization_max != null ? Number(eppSrc.kv_cache_utilization_max) : 0.9,
                flow_control: {
                    ...defaultEppConfig().flow_control,
                    ...(eppSrc.flow_control || {}),
                    max_requests: maxRequests,
                    queue_ttl: (eppSrc.flow_control || {}).queue_ttl != null
                        ? Number((eppSrc.flow_control || {}).queue_ttl)
                        : 60,
                    no_endpoint_queue_ttl: (eppSrc.flow_control || {}).no_endpoint_queue_ttl != null
                        ? Number((eppSrc.flow_control || {}).no_endpoint_queue_ttl)
                        : 60,
                    enable_eviction: toBoolean((eppSrc.flow_control || {}).enable_eviction, false)
                }
            };
        },
        syncFormWithProvider() {
            const allowedModels = this.providerModels;
            this.formData.models = (this.formData.models || []).filter(
                item => allowedModels.indexOf(item) !== -1
            );
            const allowedKeys = this.providerKeys.map(item => item.name);
            this.formData.keys = (this.formData.keys || []).map(item => ({
                ...item,
                name: allowedKeys.indexOf(item.name) !== -1 ? item.name : ''
            }));
            if (!this.formData.keys.length) {
                this.formData.keys = [{ name: '', weight: 0 }];
            }
            this.validateKeysState();
        },
        onProviderChange(name) {
            if (!name) {
                this.selectedProvider = null;
                this.formData.models = [];
                this.formData.keys = [{ name: '', weight: 0 }];
                this.validateKeysState();
                return;
            }
            this.loadProviderDetail(name);
        },
        changeMappingTarget(index, value) {
            const mapping = this.formData.model_mappings[index];
            if (!mapping) {
                return;
            }
            mapping.target_model = value;
            // 左侧为空时自动带出同名，已填写则不覆盖，保持可改
            if (!String(mapping.source_model || '').trim() && value) {
                mapping.source_model = value;
            }
            this.$nextTick(() => {
                if (this.$refs.formData) {
                    this.$refs.formData.validateField('model_mappings');
                }
            });
        },
        addModelRedirect() {
            this.formData.model_mappings.push({ source_model: '', target_model: '' });
        },
        removeModelMapping(index) {
            this.formData.model_mappings.splice(index, 1);
            if (!this.formData.model_mappings.length) {
                this.formData.model_mappings.push({ source_model: '', target_model: '' });
            }
        },
        addKey() {
            this.formData.keys.push({ name: '', weight: 0 });
            this.$nextTick(() => {
                this.validateKeysState();
            });
        },
        availableProviderKeys(index) {
            const current = String(
                (this.formData.keys[index] && this.formData.keys[index].name) || ''
            ).trim();
            const taken = {};
            (this.formData.keys || []).forEach((item, i) => {
                if (i === index) {
                    return;
                }
                const name = String((item && item.name) || '').trim();
                if (name) {
                    taken[name] = true;
                }
            });
            return (this.providerKeys || []).filter(item => {
                const name = item && item.name;
                if (!name) {
                    return false;
                }
                return name === current || !taken[name];
            });
        },
        removeKey(index) {
            this.formData.keys.splice(index, 1);
            if (!this.formData.keys.length) {
                this.formData.keys.push({ name: '', weight: 0 });
            }
            this.validateKeysState();
        },
        keyNameRules(index) {
            const item = this.formData.keys[index] || {};
            if (!String(item.name || '').trim()) {
                return [];
            }
            return [
                {
                    required: true,
                    message: this.$t('gatewayConfig.keyNameRequired'),
                    trigger: 'change'
                }
            ];
        },
        keyWeightRules(index) {
            const item = this.formData.keys[index] || {};
            if (!String(item.name || '').trim()) {
                return [];
            }
            return [
                {
                    type: 'number',
                    min: 0,
                    max: 100,
                    message: this.$t('gatewayConfig.keyWeightRangeError'),
                    trigger: 'change'
                }
            ];
        },
        validateKeysState() {
            if (this.$refs.formData) {
                this.$refs.formData.validateField('keys');
            }
        },
        handleSubmit() {
            this.validateKeysState();
            this.$refs.formData.validate(valid => {
                if (!valid) {
                    this.$Message.error(this.$t('com.tipValidateError'));
                    return;
                }
                const tmpData = cloneDeep(this.formData);
                tmpData.model_mappings = (tmpData.model_mappings || []).filter(
                    item => item.source_model || item.target_model
                );
                tmpData.keys = (tmpData.keys || [])
                    .map(item => ({
                        name: String(item.name || '').trim(),
                        weight: Number(item.weight) || 0
                    }))
                    .filter(item => item.name);
                if (!tmpData.strip_prefix) {
                    delete tmpData.match_prefix;
                    delete tmpData.strip_prefix;
                }
                const affinity = tmpData.key_affinity || {};
                tmpData.key_affinity = {
                    enabled: !!affinity.enabled,
                    ttl: Number(affinity.ttl) || 600,
                    redis_prefix: String(affinity.redis_prefix || 'bfe:ai:key_affinity'),
                    penalty_enable: toBoolean(affinity.penalty_enable, true)
                };
                tmpData.balance_mode = tmpData.balance_mode || 'WRR';
                if (tmpData.balance_mode === 'EPP') {
                    const epp = tmpData.epp_config || {};
                    const eppConfig = {
                        scheduling_profile: epp.scheduling_profile || 'balanced',
                        cache_affinity: epp.cache_affinity || 'medium',
                        prefix_cache_affinity: !!epp.prefix_cache_affinity,
                        session_affinity_enabled: !!epp.session_affinity_enabled,
                        kv_cache_utilization_max: Number(epp.kv_cache_utilization_max) || 0.9,
                        flow_control: {
                            max_requests: (() => {
                                const mr = epp.flow_control && epp.flow_control.max_requests;
                                if (mr == null || mr === -1) return -1;
                                return Number(mr);
                            })(),
                            queue_ttl: Number(epp.flow_control.queue_ttl),
                            no_endpoint_queue_ttl: Number(epp.flow_control.no_endpoint_queue_ttl),
                            enable_eviction: !!((epp.flow_control || {}).enable_eviction)
                        }
                    };
                    if (epp.session_affinity_enabled) {
                        eppConfig.session_affinity_header = epp.session_affinity_header || '';
                    }
                    tmpData.epp_config = eppConfig;
                } else {
                    delete tmpData.epp_config;
                }
                this.$emit('submitData', {
                    topic: 'llmConfigData',
                    data: tmpData
                });
            });
        }
    }
};
</script>

<style lang="less" scoped>
table {
    width: 100%;
    margin-top: 15px;
    font-size: 14px;
    @border-style: 1px solid #e7e9f0;
    border-top: @border-style;
    border-left: @border-style;
    border-collapse: collapse;

    td,
    th {
        border-bottom: @border-style;
        border-right: @border-style;
        padding: 10px 20px;
        text-align: left;
        word-wrap: break-word;
        word-break: break-all;
        min-width: 130px;
    }

    th {
        background-color: #f8f8f9;
        font-size: 13px;
    }
}

.keys-table {
    width: 100%;
    margin-top: 15px;
    font-size: 14px;
    border-top: 1px solid #e7e9f0;
    border-left: 1px solid #e7e9f0;
    border-collapse: collapse;

    td,
    th {
        border-bottom: 1px solid #e7e9f0;
        border-right: 1px solid #e7e9f0;
        padding: 10px;
        text-align: left;
    }

    th {
        background-color: #f8f8f9;
        font-size: 13px;
    }
}

.forward-models-select-all {
    font-weight: 500;
    color: #2d8cf0;
}

.inline-form-item {
    margin-bottom: 0;
}

.llm-section-card {
    margin-bottom: 16px;

    /deep/ .ivu-card-head p {
        font-size: 13px;
    }
}

.provider-label {
    display: inline-flex;
    align-items: center;
}

.provider-help-icon {
    margin-left: 4px;
    font-size: 16px;
    color: #2d8cf0;
    vertical-align: middle;
}

.provider-tip-content {
    max-width: 320px;
    white-space: normal;
    line-height: 1.5;
}

.mt20 {
    margin-top: 20px;
}
</style>
