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
  <div class="provider-upsert">
    <Form
      ref="formData"
      :model="formData"
      :rules="ruleValidate"
      label-position="top"
    >
      <Card :title="$t('provider.basicInfo')" class="llm-section-card">
        <FormItem :label="$t('com.name')" prop="name">
          <Input v-model="formData.name" :disabled="!isAdd" :maxlength="64" />
        </FormItem>
        <FormItem :label="$t('com.desc')" prop="description">
          <Input v-model="formData.description" :maxlength="256" />
        </FormItem>
      </Card>

      <Card :title="$t('instancePool.name')" class="llm-section-card">
        <InstancePool
          ref="instancePool"
          :instancePoolData="instancePoolData"
          :endpointSchema="formData.model_endpoint.schema"
          @pool-change="onPoolChange"
        />
      </Card>

      <Card
        :title="$t('gatewayConfig.modelServiceConfig')"
        class="llm-section-card"
      >
        <FormItem
          :label="$t('gatewayConfig.modelProtocol')"
          prop="model_protocols"
        >
          <Select v-model="formData.model_protocols" multiple>
            <Option
              v-for="item in protocolOptions"
              :key="item"
              :value="item"
              >{{ item }}</Option
            >
          </Select>
        </FormItem>
        <FormItem
          :label="$t('gatewayConfig.modelListEndpoint')"
          prop="model_endpoint"
        >
          <div class="endpoint-url-group">
            <Select
              class="endpoint-protocol"
              v-model="formData.model_endpoint.schema"
            >
              <Option value="https">https://</Option>
              <Option value="http">http://</Option>
            </Select>
            <span class="endpoint-host" :title="endpointHostDisplay">
              {{ endpointHostDisplay || $t('provider.instanceHostPlaceholder') }}
            </span>
            <Input
              class="endpoint-uri"
              v-model="formData.model_endpoint.uri"
              placeholder="/v1/models"
            />
          </div>
        </FormItem>
      </Card>

      <Card class="llm-section-card">
        <p slot="title" class="field-label">
          {{ $t('provider.protocolPathMapping') }}
          <Tooltip placement="top" transfer max-width="360">
            <div slot="content" class="field-tip-content">
              <p>{{ $t('provider.protocolPathHelp') }}</p>
            </div>
            <Icon type="ios-help-circle-outline" class="field-help-icon" />
          </Tooltip>
        </p>
        <FormItem prop="protocol_paths">
          <table class="keys-table">
            <thead>
              <tr>
                <th style="width:140px;">{{ $t('provider.protocolPathProto') }}</th>
                <th>{{ $t('provider.protocolPathPrefix') }}</th>
                <th style="width:80px;">{{ $t('com.operation') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in formData.protocol_paths" :key="`pp-${index}`">
                <td>
                  <FormItem
                    :prop="`protocol_paths.${index}.protocol`"
                    :rules="protocolPathProtocolRules(index)"
                    class="inline-form-item"
                  >
                    <Select v-model="item.protocol" size="small">
                      <Option v-for="p in getAvailableProtocolsForRow(index)" :key="p" :value="p">{{ p }}</Option>
                    </Select>
                  </FormItem>
                </td>
                <td>
                  <FormItem
                    :prop="`protocol_paths.${index}.path`"
                    :rules="protocolPathValueRules(index)"
                    class="inline-form-item"
                  >
                    <Input v-model="item.path" placeholder="/v1" />
                  </FormItem>
                </td>
                <td>
                  <Button type="error" size="small" @click="removeProtocolPath(index)">{{ $t('com.del') }}</Button>
                </td>
              </tr>
            </tbody>
          </table>
          <Button
            class="mt20"
            size="small"
            type="primary"
            :disabled="!hasAvailableProtocol"
            @click="addProtocolPath"
          >{{ $t('provider.protocolPathAdd') }}</Button>
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
                <th>{{ $t('gatewayConfig.keyName') }}</th>
                <th>{{ $t('gatewayConfig.keyValue') }}</th>
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
                    <Input
                      v-model="keyItem.name"
                      :placeholder="$t('gatewayConfig.keyNamePlaceholder')"
                    />
                  </FormItem>
                </td>
                <td>
                  <FormItem
                    :prop="`keys.${index}.key`"
                    :rules="keyValueRules(index)"
                    class="inline-form-item"
                  >
                    <Input
                      v-model="keyItem.key"
                      :placeholder="keyPlaceholder(keyItem)"
                      autocomplete="new-password"
                      @on-focus="onKeyFocus(index)"
                      @on-change="onKeyChange(index)"
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
          <p v-if="hasExistingKey" class="form-tip">
            {{ $t('gatewayConfig.serviceAuthKeyEditTip') }}
          </p>
          <Button class="mt20" size="small" type="primary" @click="addKey">
            + {{ $t('gatewayConfig.addKey') }}
          </Button>
        </FormItem>
      </Card>

      <Card class="llm-section-card">
        <FormItem prop="models">
          <p slot="label" class="field-label">
            {{ $t('provider.modelList') }}
            <Tooltip placement="top" transfer max-width="360">
              <div slot="content" class="field-tip-content">
                <p>{{ $t('provider.modelsListTip') }}</p>
              </div>
              <Icon type="ios-help-circle-outline" class="field-help-icon" />
            </Tooltip>
          </p>
          <div class="models-row">
            <el-select
              v-model="formData.models"
              style="flex: 1;"
              size="small"
              multiple
              filterable
              allow-create
              default-first-option
              :placeholder="modelsSelectPlaceholder"
              @paste.native="onModelsPaste"
            >
              <el-option
                v-for="item in modelsList"
                :key="item"
                :value="item"
                :label="item"
              />
            </el-select>
            <span class="discover-btn-wrap">
              <Button @click="showBatchModelsModal">{{
                $t('provider.batchAddModels')
              }}</Button>
              <Button
                type="primary"
                :loading="discoverLoading"
                :disabled="!canDiscoverModels"
                @click="discoverModels"
                >{{ $t('provider.syncModels') }}</Button
              >
            </span>
          </div>
        </FormItem>
      </Card>
    </Form>

    <Modal
      v-model="batchModelsVisible"
      class-name="batch-models-modal"
      :title="$t('provider.batchAddModels')"
      :width="520"
      :z-index="1100"
      @on-cancel="closeBatchModelsModal"
    >
      <Input
        v-model="batchModelsText"
        type="textarea"
        :rows="8"
        :placeholder="$t('provider.batchModelsPlaceholder')"
      />
      <div slot="footer">
        <Button @click="closeBatchModelsModal">{{ $t('com.cancel') }}</Button>
        <Button type="primary" @click="confirmBatchModels">{{
          $t('com.confirm')
        }}</Button>
      </div>
    </Modal>

    <div class="com-btn-box drawer-footer">
      <Button
        type="primary"
        size="small"
        @click="handleSubmit"
        >{{ $t('com.submit') }}</Button
      >
    </div>
  </div>
</template>

<script>
import { cloneDeep } from 'lodash';
import { ProviderNameRegCheck, maskSecretKey } from '@/utils/const';
import InstancePool, {
    formatInstancePoolForApi,
    getInstanceEndpointHosts,
    syncInstancePoolPortBySchema
} from '@/modules/Clusters/components/InstancePool';

const PROTOCOL_OPTIONS = ['openai', 'anthropic', 'gemini'];

function parseModelNames(text) {
    return Array.from(new Set(
        String(text || '')
            .split(/[\s,，;；]+/)
            .map(item => item.trim())
            .filter(Boolean)
    ));
}

export default {
    name: 'ProviderUpsert',

    components: { InstancePool },

    props: {
        currentProvider: {
            type: Object,
            default() {
                return {};
            }
        },
        providerNames: {
            type: Array,
            default() {
                return [];
            }
        },
        isAdd: {
            type: Boolean,
            default: true
        }
    },

    data() {
        const that = this;
        const validateName = (rule, value, callback) => {
            if (!value) {
                callback(new Error(that.$t('com.tipEnterX', { obj: that.$t('com.name') })));
                return;
            }
            if (!ProviderNameRegCheck(value)) {
                callback(new Error(that.$t('provider.tipNameRule')));
                return;
            }
            if (that.isAdd && (that.providerNames || []).indexOf(value) !== -1) {
                callback(new Error(that.$t('com.tipAlreadyExistsX', { obj: that.$t('com.name') })));
                return;
            }
            callback();
        };
        const validateDescription = (rule, value, callback) => {
            if (!value) {
                callback();
                return;
            }
            if (value.length > 256) {
                callback(new Error(that.$t('cluster.descriptionLengthError')));
                return;
            }
            if (/[\x00-\x1F\x7F]/.test(value)) {
                callback(new Error(that.$t('cluster.descriptionControlCharsError')));
                return;
            }
            callback();
        };
        const validateProtocols = (rule, value, callback) => {
            if (!value || !value.length) {
                callback(new Error(that.$t('provider.protocolRequired')));
                return;
            }
            const invalid = value.some(item => PROTOCOL_OPTIONS.indexOf(item) === -1);
            if (invalid) {
                callback(new Error(that.$t('provider.protocolInvalid')));
                return;
            }
            callback();
        };
        const validateEndpoint = (rule, value, callback) => {
            const endpoint = value || {};
            const uri = endpoint.uri || '';
            if (uri && uri.charAt(0) !== '/') {
                callback(new Error(that.$t('gatewayConfig.uriMustStartWithSlash')));
                return;
            }
            callback();
        };
        const validateKeys = (rule, value, callback) => {
            const keys = (value || []).filter(item =>
                String(item.name || '').trim() ||
                String(item.key || '').trim() ||
                String(item.originalKey || '').trim()
            );
            const names = {};
            for (let i = 0; i < keys.length; i++) {
                const name = String(keys[i].name || '').trim();
                const key = that.resolveKeyValue(keys[i]);
                if (!name) {
                    callback(new Error(that.$t('gatewayConfig.keyNameRequired')));
                    return;
                }
                if (name.length > 128) {
                    callback(new Error(that.$t('gatewayConfig.keyNameTooLong')));
                    return;
                }
                if (!key) {
                    callback(new Error(that.$t('gatewayConfig.keyValueRequired')));
                    return;
                }
                if (key.length > 512) {
                    callback(new Error(that.$t('gatewayConfig.keyValueTooLong')));
                    return;
                }
                if (names[name]) {
                    callback(new Error(that.$t('gatewayConfig.keyNameDuplicate')));
                    return;
                }
                names[name] = true;
            }
            callback();
        };
        var validateModels = function(rule, value, callback) {
            var models = (value || []).filter(function(m) {
                return String(m || '').trim() !== '';
            });
            if (!models.length) {
                callback(new Error(that.$t('provider.modelsListRequired')));
                return;
            }
            var seen = {};
            for (var mi = 0; mi < models.length; mi++) {
                if (seen[models[mi]]) {
                    callback(new Error(that.$t('provider.modelNameDuplicate', { name: models[mi] })));
                    return;
                }
                seen[models[mi]] = true;
            }
            callback();
        };
        var validateProtocolPaths = function(rule, value, callback) {
            var paths = value || [];
            var protocols = that.formData.model_protocols || [];
            for (var i = 0; i < paths.length; i++) {
                var proto = String(paths[i].protocol || '').trim();
                var path = String(paths[i].path || '').trim();
                if (!proto && !path) {
                    continue;
                }
                if (protocols.indexOf(proto) === -1) {
                    callback(new Error(that.$t('provider.protocolPathProtoInvalid', { proto: proto })));
                    return;
                }
                if (path.charAt(0) !== '/') {
                    callback(new Error(that.$t('provider.protocolPathPrefixInvalid')));
                    return;
                }
                if (path.length > 1 && path.charAt(path.length - 1) === '/') {
                    callback(new Error(that.$t('provider.protocolPathPrefixTrailingSlash')));
                    return;
                }
                if (/[?$#]|\.\./.test(path)) {
                    callback(new Error(that.$t('provider.protocolPathPrefixInvalidChars')));
                    return;
                }
            }
            callback();
        };

        return {
            protocolOptions: PROTOCOL_OPTIONS,
            discoverLoading: false,
            batchModelsVisible: false,
            batchModelsText: '',
            instancePoolData: [],
            livePool: [],
            modelsList: [],
            formData: {
                name: '',
                description: '',
                model_protocols: ['openai'],
                model_endpoint: {
                    schema: 'https',
                    uri: '/v1/models'
                },
                models: [],
                keys: [{ name: '', key: '', originalKey: '', keyModified: false }],
                protocol_paths: []
            },
            ruleValidate: {
                name: [{ required: true, validator: validateName, trigger: 'blur' }],
                description: [{ validator: validateDescription, trigger: 'blur' }],
                model_protocols: [{ validator: validateProtocols, trigger: 'change', required: true }],
                model_endpoint: [{ validator: validateEndpoint, trigger: 'blur' }],
                keys: [{ validator: validateKeys, trigger: 'change' }],
                protocol_paths: [{ validator: validateProtocolPaths, trigger: 'change' }],
                models: [{ validator: validateModels, trigger: 'change', required: true }]
            }
        };
    },

    computed: {
        endpointHostDisplay() {
            const pool = this.livePool.length ? this.livePool : this.instancePoolData;
            const schema = this.formData.model_endpoint.schema;
            const hosts = getInstanceEndpointHosts(syncInstancePoolPortBySchema(pool, schema));
            return hosts[0] || '';
        },
        canDiscoverModels() {
            const protocols = this.formData.model_protocols || [];
            if (!protocols.length) {
                return false;
            }
            const pool = this.livePool.length ? this.livePool : this.instancePoolData;
            const schema = (this.formData.model_endpoint && this.formData.model_endpoint.schema) || 'https';
            const instances = formatInstancePoolForApi(pool, schema);
            return instances.some(item => String(item.addr || '').trim());
        },
        discoverDisabledTip() {
            if (!(this.formData.model_protocols || []).length) {
                return this.$t('provider.discoverNeedProtocol');
            }
            return this.$t('provider.discoverNeedInstance');
        },
        modelsSelectPlaceholder() {
            return this.$t('provider.modelsPlaceholder');
        },
        hasExistingKey() {
            return (this.formData.keys || []).some(item => String(item.originalKey || '').trim());
        },
        hasAvailableProtocol() {
            var protocols = this.formData.model_protocols || [];
            var used = {};
            (this.formData.protocol_paths || []).forEach(function(item) {
                used[item.protocol] = true;
            });
            return protocols.some(function(p) {
                return !used[p];
            });
        }
    },

    watch: {
        currentProvider: {
            handler(val) {
                this.applyProvider(val);
            },
            immediate: true,
            deep: true
        },
        'formData.model_protocols': {
            handler(protocols) {
                if (!protocols || !protocols.length) return;
                var valid = {};
                protocols.forEach(function(p) { valid[p] = true; });
                this.formData.protocol_paths = (this.formData.protocol_paths || []).filter(function(item) {
                    return valid[item.protocol];
                });
            }
        }
    },

    methods: {
        applyProvider(row) {
            const data = row || {};
            this.formData = {
                name: data.name || '',
                description: data.description || '',
                model_protocols: (data.model_protocols && data.model_protocols.length)
                    ? data.model_protocols.slice()
                    : ['openai'],
                model_endpoint: {
                    schema: (data.model_endpoint && data.model_endpoint.schema) || 'https',
                    uri: (data.model_endpoint && data.model_endpoint.uri) || '/v1/models'
                },
                models: (data.models || []).slice(),
                keys: data.keys && data.keys.length
                    ? data.keys.map(item => this.decorateKey(item))
                    : [this.emptyKey()],
                protocol_paths: data.protocol_paths
                    ? Object.keys(data.protocol_paths).map(function(proto) {
                        return { protocol: proto, path: data.protocol_paths[proto] || '' };
                      })
                    : []
            };
            this.modelsList = (data.models || []).slice();
            this.instancePoolData = data.instance_pool && data.instance_pool.length
                ? cloneDeep(data.instance_pool)
                : [];
            this.livePool = this.instancePoolData.slice();
        },
        onPoolChange(pool) {
            this.livePool = pool || [];
        },
        emptyKey() {
            return { name: '', key: '', originalKey: '', keyModified: false };
        },
        decorateKey(item) {
            const originalKey = String((item && item.key) || '');
            return {
                name: (item && item.name) || '',
                originalKey,
                keyModified: false,
                key: originalKey ? maskSecretKey(originalKey) : ''
            };
        },
        isKeyUnchanged(item) {
            const originalKey = String((item && item.originalKey) || '');
            const display = String((item && item.key) || '').trim();
            if (!originalKey) {
                return !display;
            }
            if (!(item && item.keyModified)) {
                return true;
            }
            return !display || display === originalKey || display === maskSecretKey(originalKey);
        },
        resolveKeyValue(item) {
            if (this.isKeyUnchanged(item)) {
                return String((item && item.originalKey) || '').trim();
            }
            return String((item && item.key) || '').trim();
        },
        keyPlaceholder(item) {
            return String((item && item.originalKey) || '').trim()
                ? this.$t('gatewayConfig.serviceAuthKeyEditTip')
                : this.$t('gatewayConfig.keyValuePlaceholder');
        },
        onKeyFocus(index) {
            const item = this.formData.keys[index];
            if (!item || item.keyModified || !item.originalKey) {
                return;
            }
            if (item.key === maskSecretKey(item.originalKey)) {
                item.key = '';
                item.keyModified = true;
            }
        },
        onKeyChange(index) {
            const item = this.formData.keys[index];
            if (!item) {
                return;
            }
            if (item.originalKey && !item.keyModified) {
                if (String(item.key || '') !== maskSecretKey(item.originalKey)) {
                    item.keyModified = true;
                }
            } else if (!item.originalKey && String(item.key || '').trim()) {
                item.keyModified = true;
            }
            this.$nextTick(() => {
                if (this.$refs.formData) {
                    this.$refs.formData.validateField(`keys.${index}.key`);
                }
            });
        },
        keyNameRules(index) {
            const item = this.formData.keys[index] || {};
            const hasContent =
                String(item.name || '').trim() ||
                String(item.key || '').trim() ||
                String(item.originalKey || '').trim();
            return [
                {
                    required: !!hasContent,
                    message: this.$t('gatewayConfig.keyNameRequired'),
                    trigger: 'blur'
                }
            ];
        },
        keyValueRules(index) {
            const item = this.formData.keys[index] || {};
            if (this.isKeyUnchanged(item) && item.originalKey) {
                return [];
            }
            const hasContent =
                String(item.name || '').trim() ||
                String(item.key || '').trim() ||
                String(item.originalKey || '').trim();
            return [
                {
                    required: !!hasContent,
                    message: this.$t('gatewayConfig.keyValueRequired'),
                    trigger: 'blur'
                }
            ];
        },
        addKey() {
            this.formData.keys.push(this.emptyKey());
        },
        removeKey(index) {
            this.formData.keys.splice(index, 1);
            if (!this.formData.keys.length) {
                this.formData.keys.push(this.emptyKey());
            }
        },
        protocolPathProtocolRules(index) {
            var that = this;
            return [
                {
                    validator: function(rule, value, callback) {
                        var proto = String(value || '').trim();
                        if (!proto) {
                            callback(new Error(that.$t('provider.protocolPathProtoInvalid', { proto: '' })));
                            return;
                        }
                        callback();
                    },
                    trigger: 'change'
                }
            ];
        },
        protocolPathValueRules(index) {
            var that = this;
            return [
                {
                    validator: function(rule, value, callback) {
                        var path = String(value || '').trim();
                        if (!path) {
                            callback();
                            return;
                        }
                        if (path.charAt(0) !== '/') {
                            callback(new Error(that.$t('provider.protocolPathPrefixInvalid')));
                            return;
                        }
                        if (path.length > 1 && path.charAt(path.length - 1) === '/') {
                            callback(new Error(that.$t('provider.protocolPathPrefixTrailingSlash')));
                            return;
                        }
                        if (/[?$#]|\.\./.test(path)) {
                            callback(new Error(that.$t('provider.protocolPathPrefixInvalidChars')));
                            return;
                        }
                        callback();
                    },
                    trigger: 'blur'
                }
            ];
        },
        getAvailableProtocolsForRow(index) {
            var used = {};
            (this.formData.protocol_paths || []).forEach(function(item, i) {
                if (i !== index) {
                    used[item.protocol] = true;
                }
            });
            return (this.protocolOptions || []).filter(function(p) {
                return !used[p];
            });
        },
        addProtocolPath() {
            var protocols = this.formData.model_protocols || [];
            var used = {};
            (this.formData.protocol_paths || []).forEach(function(item) {
                used[item.protocol] = true;
            });
            var available = protocols.filter(function(p) {
                return !used[p];
            });
            if (available.length) {
                this.formData.protocol_paths.push({ protocol: available[0], path: '' });
            }
        },
        removeProtocolPath(index) {
            this.formData.protocol_paths.splice(index, 1);
        },
        buildDiscoverPayload() {
            const pool = this.livePool.length ? this.livePool : this.instancePoolData;
            const schema = (this.formData.model_endpoint && this.formData.model_endpoint.schema) || 'https';
            const instances = formatInstancePoolForApi(pool, schema)
                .filter(item => String(item.addr || '').trim());
            const first = instances[0] || {};
            const keys = (this.formData.keys || [])
                .map(item => this.resolveKeyValue(item))
                .map(key => String(key || '').trim())
                .filter(Boolean);
            const modelProtocol = (this.formData.model_protocols || [])[0];
            const defaultUri = modelProtocol === 'gemini' ? '/v1beta/models' : '/v1/models';
            return {
                model_protocol: modelProtocol,
                schema,
                addr: first.addr,
                port: first.port,
                uri: (this.formData.model_endpoint && this.formData.model_endpoint.uri) || defaultUri,
                apikey: keys[0] || ''
            };
        },
        mergeModels(names) {
            const incoming = Array.isArray(names) ? names : parseModelNames(names);
            const current = this.formData.models || [];
            const existing = {};
            current.forEach(item => {
                existing[item] = true;
            });
            const added = [];
            incoming.forEach(name => {
                if (!existing[name]) {
                    existing[name] = true;
                    added.push(name);
                }
            });
            if (added.length) {
                this.formData.models = current.concat(added);
                this.modelsList = Array.from(
                    new Set((this.modelsList || []).concat(added))
                );
            }
            return added.length;
        },
        notifyModelsMerged(added) {
            if (added) {
                this.$Message.success(this.$t('provider.batchModelsAdded', { count: added }));
            } else {
                this.$Message.info(this.$t('provider.batchModelsNoNew'));
            }
        },
        showBatchModelsModal() {
            this.batchModelsText = '';
            this.batchModelsVisible = true;
        },
        closeBatchModelsModal() {
            this.batchModelsVisible = false;
            this.batchModelsText = '';
        },
        confirmBatchModels() {
            const parsed = parseModelNames(this.batchModelsText);
            if (!parsed.length) {
                this.$Message.warning(this.$t('provider.batchModelsEmpty'));
                return;
            }
            const added = this.mergeModels(parsed);
            this.closeBatchModelsModal();
            this.notifyModelsMerged(added);
        },
        onModelsPaste(e) {
            const clipboard = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
            const text = clipboard
                ? (clipboard.getData('text') || clipboard.getData('text/plain') || '')
                : '';
            const parsed = parseModelNames(text);
            if (parsed.length < 2) {
                return;
            }
            e.preventDefault();
            const added = this.mergeModels(parsed);
            this.notifyModelsMerged(added);
        },
        discoverModels() {
            if (!this.canDiscoverModels) {
                this.$Message.warning(this.discoverDisabledTip);
                return;
            }
            const payload = this.buildDiscoverPayload();
            this.discoverLoading = true;
            this.$request({
                url: 'providers/tools/discover-models',
                method: 'post',
                data: payload,
                openapi: true
            })
                .then(res => {
                    if (res.status === 200) {
                        const discovered = ((res.data.Data && res.data.Data.models) || [])
                            .filter(Boolean);
                        this.formData.models = discovered.slice();
                        this.modelsList = discovered.slice();
                    }
                })
                .finally(() => {
                    this.discoverLoading = false;
                });
        },
        buildPayload(instances) {
            const keys = (this.formData.keys || [])
                .map(item => ({
                    name: String(item.name || '').trim(),
                    key: this.resolveKeyValue(item)
                }))
                .filter(item => item.name || item.key);
            const models = Array.from(new Set((this.formData.models || []).filter(Boolean)));
            const schema = this.formData.model_endpoint.schema || 'https';
            const payload = {
                description: this.formData.description || '',
                model_protocols: (this.formData.model_protocols || []).slice(),
                model_endpoint: {
                    schema,
                    uri: this.formData.model_endpoint.uri || '/v1/models'
                },
                models,
                keys,
                instance_pool: formatInstancePoolForApi(instances, schema)
            };
            var protocolPaths = {};
            (this.formData.protocol_paths || []).forEach(function(item) {
                var proto = String(item.protocol || '').trim();
                var path = String(item.path || '').trim();
                if (proto && path) {
                    protocolPaths[proto] = path;
                }
            });
            payload.protocol_paths = protocolPaths;
            // 创建模式需要传 name，编辑模式 name 通过 URL 路径传递，请求体不传 name
            if (this.isAdd) {
                payload.name = String(this.formData.name || '').trim();
            }
            return payload;
        },
        handleSubmit() {
            this.$refs.formData.validate(valid => {
                if (!valid) {
                    this.$Message.error(this.$t('com.tipValidateError'));
                    return;
                }
                const poolRef = this.$refs.instancePool;
                if (!poolRef || typeof poolRef.validateAndExport !== 'function') {
                    return;
                }
                poolRef.validateAndExport()
                    .then(instances => {
                        const payload = this.buildPayload(instances);
                        const req = this.isAdd
                            ? {
                                url: 'providers',
                                method: 'post',
                                data: payload,
                                openapi: true
                            }
                            : {
                                url: this.$urlFormat('providers/{provider_name}', {
                                    provider_name: this.formData.name
                                }),
                                method: 'patch',
                                data: payload,
                                openapi: true
                            };
                        return this.$request(req);
                    })
                    .then(res => {
                        if (res && res.status === 200) {
                            this.$Message.success({ content: this.$t('com.tipSubmitSucc') });
                            this.$emit('submit');
                        }
                    })
                    .catch(() => {});
            });
        }
    }
};
</script>

<style lang="less" scoped>
.llm-section-card {
    margin-bottom: 16px;

    /deep/ .ivu-card-head p {
        font-size: 13px;
    }
}

.endpoint-url-group {
    display: flex;
    align-items: center;
    max-width: 680px;
    border: 1px solid #dcdee2;
    border-radius: 4px;
    overflow: hidden;

    .endpoint-protocol {
        width: 96px;
        border-right: 1px solid #dcdee2;
        flex-shrink: 0;

        /deep/ .ivu-select-selection {
            border: none;
            border-radius: 0;
        }
    }

    .endpoint-host {
        min-width: 120px;
        padding: 0 8px;
        color: #909399;
        background: #f5f5f5;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 30px;
        cursor: not-allowed;
        flex: 1;
    }

    .endpoint-uri {
        width: 180px;
        flex-shrink: 0;
        border-left: 1px solid #dcdee2;

        /deep/ .ivu-input {
            border: none;
            border-radius: 0;
        }
    }
}

.field-label {
    display: inline-flex;
    align-items: center;
}

.field-help-icon {
    margin-left: 4px;
    font-size: 16px;
    color: #2d8cf0;
    vertical-align: middle;
    cursor: help;
}

.field-tip-content {
    max-width: 360px;
    white-space: normal;
    line-height: 1.5;

    p {
        margin: 0 0 8px;
    }

    p:last-child {
        margin-bottom: 0;
    }
}

.models-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
}

.discover-btn-wrap {
    display: inline-flex;
    align-items: flex-start;
    gap: 8px;
    flex-shrink: 0;
}

.keys-table {
    width: 100%;
    margin-top: 0;
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

.inline-form-item {
    margin-bottom: 0;
}

.mt20 {
    margin-top: 20px;
}

.form-tip {
    margin-top: 8px;
    color: #808695;
    font-size: 12px;
    line-height: 18px;
}

.com-btn-box {
    margin-top: 16px;
}
</style>
