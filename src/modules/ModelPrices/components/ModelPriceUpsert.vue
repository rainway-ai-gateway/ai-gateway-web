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
  <div class="model-price-upsert">
    <Form
      ref="formData"
      :model="formData"
      :rules="ruleValidate"
      label-position="top"
    >
      <Row :gutter="24">
        <Col span="12">
          <FormItem :label="$t('modelPrices.provider')" prop="provider">
            <AutoComplete
              v-model="formData.provider"
              :data="displayProviderOptions"
              clearable
              icon="ios-arrow-down"
              :placeholder="$t('modelPrices.providerPlaceholder')"
              @on-focus="onProviderFocus"
              @on-change="onProviderChange"
            />
          </FormItem>
        </Col>
        <Col span="12">
          <FormItem :label="$t('modelPrices.model')" prop="model">
            <Input v-model="formData.model" placeholder="DeepSeek V3" />
          </FormItem>
        </Col>
      </Row>
      <Row :gutter="24">
        <Col span="12">
          <FormItem :label="$t('modelPrices.baseModel')" prop="base_model">
            <Input v-model="formData.base_model" placeholder="deepseek-v3" />
          </FormItem>
        </Col>
        <Col span="12">
          <FormItem :label="$t('modelPrices.mode')" prop="mode">
            <el-select
              v-model="formData.mode"
              style="width: 100%;"
              size="small"
              filterable
            >
              <el-option
                v-for="item in modeOptions"
                :key="item"
                :value="item"
                :label="item"
              />
            </el-select>
          </FormItem>
        </Col>
      </Row>

      <FormItem :label="$t('modelPrices.capabilities')">
        <el-select
          v-model="formData.capabilities"
          style="width: 100%;"
          size="small"
          multiple
          filterable
          clearable
        >
          <el-option
            v-for="item in capabilityOptions"
            :key="item"
            :value="item"
            :label="item"
          />
        </el-select>
      </FormItem>

      <FormItem :label="$t('modelPrices.supportedParameters')">
        <el-select
          v-model="formData.supported_parameters"
          style="width: 100%;"
          size="small"
          multiple
          filterable
          clearable
        >
          <el-option
            v-for="item in supportedParameterOptions"
            :key="item"
            :value="item"
            :label="item"
          />
        </el-select>
      </FormItem>

      <Card :title="$t('modelPrices.limits')" class="dynamic-card">
        <div
          v-for="(entry, index) in limitsList"
          :key="`limit-${index}`"
          class="dynamic-row"
        >
          <Row :gutter="8">
            <Col span="10">
              <el-select
                v-model="entry.key"
                style="width: 100%;"
                size="small"
                filterable
                clearable
                placeholder="键名"
              >
                <el-option
                  v-for="item in limitKeyOptions"
                  :key="item"
                  :value="item"
                  :label="item"
                />
              </el-select>
            </Col>
            <Col span="10">
              <InputNumber
                v-model="entry.value"
                :min="0"
                :precision="0"
                style="width: 100%;"
                placeholder="值"
              />
            </Col>
            <Col span="4">
              <Button
                type="error"
                size="small"
                @click="removeLimit(index)"
                >{{ $t('com.del') }}</Button
              >
            </Col>
          </Row>
        </div>
        <Button size="small" type="primary" @click="addLimit"
          >+ {{ $t('modelPrices.addLimit') }}</Button
        >
        <p v-if="limitsDuplicateError" class="error-text">
          {{ $t('modelPrices.limitsDuplicateKey') }}
        </p>
        <p v-if="limitsValueError" class="error-text">
          {{ $t('modelPrices.limitsValueInvalid') }}
        </p>
      </Card>

      <Card
        :title="$t('modelPrices.priceSection')"
        class="dynamic-card price-section-card"
      >
        <div class="price-config-group">
          <div class="price-config-block">
            <div class="price-config-header">
              <span class="price-config-title is-required">
                {{ $t('modelPrices.priceObject') }}
                <Tooltip placement="top" transfer max-width="360">
                  <div slot="content" class="price-config-tip">
                    {{ $t('modelPrices.priceDefaultTip') }}
                  </div>
                  <Icon
                    type="ios-help-circle-outline"
                    class="price-config-help-icon"
                  />
                </Tooltip>
              </span>
            </div>
            <div class="price-config-body">
              <p class="price-hint">{{ $t('modelPrices.priceHint') }}</p>
              <p v-if="isEdit" class="price-hint">
                {{ $t('modelPrices.priceMergeHint') }}
              </p>
              <table v-if="pricesList.length" class="kv-table">
                <thead>
                  <tr>
                    <th>{{ $t('modelPrices.priceItemKey') }}</th>
                    <th>{{ $t('modelPrices.priceItemValue') }}</th>
                    <th style="width: 80px;">{{ $t('com.operation') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(entry, index) in pricesList"
                    :key="`price-${index}`"
                  >
                    <td>
                      <el-select
                        v-model="entry.key"
                        style="width: 100%;"
                        size="small"
                        filterable
                        clearable
                        :placeholder="$t('modelPrices.priceItemKeyPlaceholder')"
                      >
                        <el-option
                          v-for="item in priceKeyOptions"
                          :key="item"
                          :value="item"
                          :label="item"
                        />
                      </el-select>
                    </td>
                    <td>
                      <Input
                        v-model="entry.value"
                        :placeholder="$t('modelPrices.priceItemValuePlaceholder')"
                        @on-blur="onPriceBlur(entry)"
                      />
                    </td>
                    <td>
                      <Button
                        type="error"
                        size="small"
                        @click="removePrice(index)"
                        >{{ $t('com.del') }}</Button
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
              <Button
                size="small"
                type="primary"
                class="add-row-btn"
                @click="addPrice"
                >+ {{ $t('modelPrices.addPrice') }}</Button
              >
              <p v-if="pricesError" class="error-text">
                {{ $t('modelPrices.pricesRequired') }}
              </p>
              <p v-if="pricesDuplicateError" class="error-text">
                {{ $t('modelPrices.pricesDuplicateKey') }}
              </p>
              <p v-if="pricesValueError" class="error-text">
                {{ $t('modelPrices.pricesValueInvalid') }}
              </p>
              <p v-if="pricesOverflowError" class="error-text">
                {{ $t('modelPrices.pricesOverflow') }}
              </p>
            </div>
          </div>

          <div class="price-config-block">
            <div class="price-config-header">
              <span class="price-config-title">
                {{ $t('modelPrices.tierPriceObject') }}
                <Tooltip placement="top" transfer max-width="360">
                  <div slot="content" class="price-config-tip">
                    {{ $t('modelPrices.tierPriceTip') }}
                  </div>
                  <Icon
                    type="ios-help-circle-outline"
                    class="price-config-help-icon"
                  />
                </Tooltip>
              </span>
            </div>
            <div class="price-config-body">
              <div class="tier-meta-row">
                <span
                  class="tier-meta-label"
                  >{{ $t('modelPrices.tierObject') }}</span
                >
                <span
                  class="ivu-tag ivu-tag-warning ivu-tag-checked"
                  >{{ $t('provider.pricingPeakTag') }}</span
                >
              </div>
              <table v-if="tierPricesPeakList.length" class="kv-table">
                <thead>
                  <tr>
                    <th>{{ $t('modelPrices.priceItemKey') }}</th>
                    <th>{{ $t('modelPrices.priceItemValue') }}</th>
                    <th style="width: 80px;">{{ $t('com.operation') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(entry, index) in tierPricesPeakList"
                    :key="`tier-price-${index}`"
                  >
                    <td>
                      <el-select
                        v-model="entry.key"
                        style="width: 100%;"
                        size="small"
                        filterable
                        clearable
                        :placeholder="$t('modelPrices.priceItemKeyPlaceholder')"
                      >
                        <el-option
                          v-for="item in priceKeyOptions"
                          :key="item"
                          :value="item"
                          :label="item"
                        />
                      </el-select>
                    </td>
                    <td>
                      <Input
                        v-model="entry.value"
                        :placeholder="$t('modelPrices.priceItemValuePlaceholder')"
                        @on-blur="onPriceBlur(entry)"
                      />
                    </td>
                    <td>
                      <Button
                        type="error"
                        size="small"
                        @click="removeTierPrice(index)"
                        >{{ $t('com.del') }}</Button
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
              <Button
                size="small"
                type="primary"
                class="add-row-btn"
                @click="addTierPrice"
                >+ {{ $t('modelPrices.addPrice') }}</Button
              >
              <p v-if="tierDuplicateError" class="error-text">
                {{ $t('modelPrices.tierDuplicateKey', { tier: $t('modelPrices.tierPeakLabel') }) }}
              </p>
              <p v-if="tierValueError" class="error-text">
                {{ $t('modelPrices.tierValueInvalid', { tier: $t('modelPrices.tierPeakLabel') }) }}
              </p>
              <p v-if="tierOverflowError" class="error-text">
                {{ $t('modelPrices.tierOverflow', { tier: $t('modelPrices.tierPeakLabel') }) }}
              </p>
            </div>
          </div>

          <div v-if="formData.mode !== 'batch'" class="price-config-block">
            <div class="price-config-header">
              <span class="price-config-title">
                {{ $t('modelPrices.batchDiscount') }}
                <Tooltip placement="top" transfer max-width="360">
                  <div slot="content" class="price-config-tip">
                    {{ $t('modelPrices.batchDiscountTip') }}
                  </div>
                  <Icon
                    type="ios-help-circle-outline"
                    class="price-config-help-icon"
                  />
                </Tooltip>
              </span>
            </div>
            <div class="price-config-body">
              <InputNumber
                v-model="formData.batch_discount"
                :min="0"
                :max="1"
                :step="0.1"
                placeholder="0.5"
                style="width: 200px;"
              />
              <p v-if="batchDiscountError" class="error-text">
                {{ $t('modelPrices.batchDiscountInvalid') }}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card :title="$t('modelPrices.metadata')" class="dynamic-card">
        <FormItem :label="$t('modelPrices.source')" prop="metadata.source">
          <Input v-model="formData.metadata.source" placeholder="https://..." />
        </FormItem>
        <FormItem :label="$t('modelPrices.notes')">
          <Input v-model="formData.metadata.notes" type="textarea" :rows="3" />
        </FormItem>
      </Card>

      <FormItem class="drawer-footer">
        <Button
          type="primary"
          size="small"
          :loading="submitting"
          @click="handleSubmit"
        >
          {{ $t('com.submit') }}
        </Button>
        <Button size="small" style="margin-left: 8px;" @click="onCancel">
          {{ $t('com.cancel') }}
        </Button>
      </FormItem>
    </Form>
  </div>
</template>

<script>
import { cloneDeep } from 'lodash';
import { formatPriceForInput, isPriceOverflow } from '@/utils/price';

const MODE_OPTIONS = [
    'chat', 'completion', 'responses', 'image_generation', 'image_edit',
    'embedding', 'rerank', 'audio_speech', 'audio_transcription',
    'video_generation', 'ocr', 'search', 'realtime', 'batch'
];

const CAPABILITY_OPTIONS = [
    'chat', 'vision', 'audio_input', 'video_input', 'reasoning', 'tools',
    'structured_outputs', 'function_calling', 'prompt_caching', 'computer_use',
    'web_search', 'serverless', 'image_generation', 'embedding', 'rerank',
    'audio_speech', 'audio_transcription', 'video_generation', 'ocr', 'search', 'realtime'
];

const SUPPORTED_PARAMETER_OPTIONS = [
    'temperature', 'top_p', 'max_tokens', 'tools', 'tool_choice',
    'response_format', 'reasoning', 'image_input', 'video_input', 'audio_input',
    'voice', 'speed', 'size', 'quality', 'style'
];

const LIMIT_KEY_OPTIONS = [
    'context_window', 'max_input_tokens', 'max_output_tokens', 'max_tokens'
];

const PRICE_KEY_OPTIONS = [
    'input_cost_per_token', 'output_cost_per_token',
    'cache_read_input_token_cost', 'cache_creation_input_token_cost',
    'cache_creation_input_token_cost_1h',
    'input_cost_per_token_above_200k_tokens', 'output_cost_per_token_above_200k_tokens',
    'input_cost_per_token_above_256k_tokens', 'output_cost_per_token_above_256k_tokens',
    'input_cost_per_token_above_272k_tokens', 'output_cost_per_token_above_272k_tokens',
    'input_cost_per_token_above_512k_tokens', 'output_cost_per_token_above_512k_tokens',
    'output_cost_per_image', 'input_cost_per_image_token', 'output_cost_per_pixel',
    'output_cost_per_image_low_quality', 'output_cost_per_image_high_quality',
    'input_cost_per_audio_per_second', 'input_cost_per_audio_token', 'output_cost_per_audio_token',
    'input_cost_per_video_per_second',
    'output_cost_per_second',
    'input_cost_per_query', 'search_context_cost_per_query', 'ocr_cost_per_page',
    'output_cost_per_character', 'output_cost_per_image_hd', 'output_cost_per_video',
    'output_cost_per_video_per_second'
];

export default {
    name: 'ModelPriceUpsert',

    props: {
        currentData: {
            type: Object,
            default() {
                return {};
            }
        }
    },

    data() {
        const that = this;
        return {
            modeOptions: MODE_OPTIONS,
            capabilityOptions: CAPABILITY_OPTIONS,
            supportedParameterOptions: SUPPORTED_PARAMETER_OPTIONS,
            limitKeyOptions: LIMIT_KEY_OPTIONS,
            priceKeyOptions: PRICE_KEY_OPTIONS,
            providerOptions: [],
            providerFilterText: '',
            pricesError: false,
            limitsDuplicateError: false,
            pricesDuplicateError: false,
            limitsValueError: false,
            pricesValueError: false,
            pricesOverflowError: false,
            tierDuplicateError: false,
            tierValueError: false,
            tierOverflowError: false,
            batchDiscountError: false,
            submitting: false,
            formData: {
                provider: '',
                model: '',
                base_model: '',
                mode: 'chat',
                capabilities: [],
                supported_parameters: [],
                limits: {},
                prices: {},
                batch_discount: 0.5,
                metadata: {
                    source: '',
                    notes: ''
                }
            },
            limitsList: [],
            pricesList: [],
            tierPricesPeakList: [],
            ruleValidate: {
                provider: [
                    { required: true, message: this.$t('modelPrices.providerRequired'), trigger: 'change' },
                    { type: 'string', min: 1, max: 255, message: '长度 1-255', trigger: 'change' }
                ],
                model: [
                    { required: true, message: this.$t('modelPrices.modelRequired'), trigger: 'blur' },
                    { type: 'string', min: 1, max: 255, message: '长度 1-255', trigger: 'blur' }
                ],
                base_model: [
                    { required: true, message: this.$t('modelPrices.baseModelRequired'), trigger: 'blur' },
                    { type: 'string', min: 1, max: 255, message: '长度 1-255', trigger: 'blur' }
                ],
                mode: [
                    { required: true, message: this.$t('modelPrices.modeRequired'), trigger: 'change' }
                ],
                'metadata.source': [
                    {
                        validator: (rule, value, callback) => {
                            if (!value) {
                                callback();
                                return;
                            }
                            const urlPattern = /^(https?:\/\/)?(([\w-]+\.)+[\w-]+|localhost)(:\d+)?(\/[\w./?%&=-]*)?$/i;
                            if (!urlPattern.test(value)) {
                                callback(new Error(this.$t('modelPrices.sourceUrlInvalid')));
                                return;
                            }
                            callback();
                        },
                        trigger: 'blur'
                    }
                ]
            }
        };
    },

    computed: {
        isEdit() {
            return !!(this.currentData && this.currentData.id);
        },
        displayProviderOptions() {
            const text = this.providerFilterText.trim().toLowerCase();
            if (!text) {
                return this.providerOptions;
            }
            return this.providerOptions.filter(item =>
                String(item).toLowerCase().indexOf(text) > -1
            );
        }
    },

    watch: {
        currentData: {
            handler(data) {
                if (data && data.id) {
                    this.formData = cloneDeep(data);
                    this.formData.capabilities = this.formData.capabilities || [];
                    this.formData.supported_parameters = this.formData.supported_parameters || [];
                    this.formData.limits = this.formData.limits || {};
                    this.formData.prices = this.formData.prices || {};
                    this.formData.metadata = {
                        source: (this.formData.metadata && this.formData.metadata.source) || '',
                        notes: (this.formData.metadata && this.formData.metadata.notes) || ''
                    };
                    this.limitsList = this.objectToList(this.formData.limits);
                    this.pricesList = this.objectToPriceList(this.formData.prices);
                    this.tierPricesPeakList = this.objectToPriceList(
                        (this.formData.tier_prices && this.formData.tier_prices.peak) || {}
                    );
                } else {
                    this.resetForm();
                }
            },
            immediate: true,
            deep: true
        },
        // 校验仅在提交时执行；此处让「已显示」的错误在值修正后即时消失
        pricesList: {
            handler() {
                if (this.pricesDuplicateError || this.pricesValueError || this.pricesOverflowError) {
                    this.pricesDuplicateError = this.getDuplicateKeys(this.pricesList).length > 0;
                    this.pricesValueError = this.hasNonNegativeViolation(this.pricesList);
                    this.pricesOverflowError = this.hasOverflowViolation(this.pricesList);
                }
            },
            deep: true
        },
        tierPricesPeakList: {
            handler() {
                if (this.tierDuplicateError || this.tierValueError || this.tierOverflowError) {
                    this.tierDuplicateError = this.getDuplicateKeys(this.tierPricesPeakList).length > 0;
                    this.tierValueError = this.hasNonNegativeViolation(this.tierPricesPeakList);
                    this.tierOverflowError = this.hasOverflowViolation(this.tierPricesPeakList);
                }
            },
            deep: true
        }
    },

    created() {
        this.fetchProviderNames();
    },

    methods: {
        fetchProviderNames() {
            this.$request({
                url: 'providers/actions/get-provider-names',
                method: 'get',
                openapi: true
            }).then(res => {
                if (res.status !== 200) {
                    return;
                }
                this.providerOptions = (res.data.Data && res.data.Data.names) || [];
            }).catch(err => {
                console.error('获取服务商名称列表失败:', err);
            });
        },

        onProviderFocus() {
            // 聚焦时展示全部候选，方便用户无需清空即可重新选择
            this.providerFilterText = '';
        },
        onProviderChange(value) {
            this.providerFilterText = value || '';
        },

        resetForm() {
            this.formData = {
                provider: '',
                model: '',
                base_model: '',
                mode: 'chat',
                capabilities: [],
                supported_parameters: [],
                limits: {},
                prices: {},
                batch_discount: 0.5,
                metadata: {
                    source: '',
                    notes: ''
                }
            };
            this.limitsList = [];
            this.pricesList = [];
            this.tierPricesPeakList = [];
            this.batchDiscountError = false;
            this.pricesError = false;
            this.limitsDuplicateError = false;
            this.pricesDuplicateError = false;
            this.limitsValueError = false;
            this.pricesValueError = false;
            this.pricesOverflowError = false;
            this.tierDuplicateError = false;
            this.tierValueError = false;
            this.tierOverflowError = false;
        },

        objectToList(obj) {
            return Object.keys(obj || {}).map(key => ({ key, value: obj[key] }));
        },

        objectToPriceList(obj) {
            return Object.keys(obj || {}).map(key => ({
                key,
                value: formatPriceForInput(obj[key])
            }));
        },

        onPriceBlur(entry) {
            entry.value = formatPriceForInput(entry.value);
        },

        listToObject(list) {
            const result = {};
            (list || []).forEach(item => {
                if (item.key !== '' && item.value !== '' && item.value !== null && item.value !== undefined) {
                    result[item.key] = Number(item.value);
                }
            });
            return result;
        },

        getDuplicateKeys(list) {
            const seen = new Set();
            const duplicates = new Set();
            (list || []).forEach(item => {
                const key = item.key;
                if (!key) return;
                if (seen.has(key)) {
                    duplicates.add(key);
                } else {
                    seen.add(key);
                }
            });
            return [...duplicates];
        },

        hasNonNegativeViolation(list) {
            return (list || []).some(item => {
                if (!item.key) return false;
                const value = Number(item.value);
                return Number.isNaN(value) || value < 0;
            });
        },

        hasOverflowViolation(list) {
            return (list || []).some(item => {
                if (!item.key) return false;
                const value = Number(item.value);
                if (Number.isNaN(value) || value < 0) return false;
                return isPriceOverflow(value);
            });
        },

        validateDynamicKeys() {
            const limitsDuplicates = this.getDuplicateKeys(this.limitsList);
            const pricesDuplicates = this.getDuplicateKeys(this.pricesList);
            const tierDuplicates = this.getDuplicateKeys(this.tierPricesPeakList);
            this.limitsDuplicateError = limitsDuplicates.length > 0;
            this.pricesDuplicateError = pricesDuplicates.length > 0;
            this.tierDuplicateError = tierDuplicates.length > 0;

            // limits 值须为非负整数；prices / tier 值须为非负数
            this.limitsValueError = this.limitsList.some(item => {
                if (!item.key) return false;
                const value = Number(item.value);
                return Number.isNaN(value) || value < 0 || !Number.isInteger(value);
            });
            this.pricesValueError = this.hasNonNegativeViolation(this.pricesList);
            this.pricesOverflowError = this.hasOverflowViolation(this.pricesList);
            this.tierValueError = this.hasNonNegativeViolation(this.tierPricesPeakList);
            this.tierOverflowError = this.hasOverflowViolation(this.tierPricesPeakList);

            return !this.limitsDuplicateError && !this.pricesDuplicateError
                && !this.limitsValueError && !this.pricesValueError && !this.pricesOverflowError
                && !this.tierDuplicateError && !this.tierValueError && !this.tierOverflowError;
        },

        // 批量折扣系数校验：mode=batch 的价格行不配置本字段；
        // 其余模式非必填，填写时须为 (0,1] 区间内的浮点数
        validateBatchDiscount() {
            const mode = this.formData.mode;
            const raw = this.formData.batch_discount;
            if (mode === 'batch' || raw === '' || raw === null || raw === undefined) {
                this.batchDiscountError = false;
                return true;
            }
            const num = Number(raw);
            const valid = !Number.isNaN(num) && num > 0 && num <= 1;
            this.batchDiscountError = !valid;
            return valid;
        },

        addLimit() {
            this.limitsList.push({ key: '', value: 0 });
        },

        removeLimit(index) {
            this.limitsList.splice(index, 1);
        },

        addPrice() {
            this.pricesList.push({ key: '', value: '' });
        },

        removePrice(index) {
            this.pricesList.splice(index, 1);
        },

        addTierPrice() {
            this.tierPricesPeakList.push({ key: '', value: '' });
        },

        removeTierPrice(index) {
            this.tierPricesPeakList.splice(index, 1);
        },

        buildPayload() {
            const data = cloneDeep(this.formData);
            data.limits = this.listToObject(this.limitsList);
            data.prices = this.listToObject(this.pricesList);
            const tierPeak = this.listToObject(this.tierPricesPeakList);
            if (Object.keys(tierPeak).length > 0) {
                data.tier_prices = { peak: tierPeak };
            } else {
                delete data.tier_prices;
            }
            // 批量折扣系数：仅 mode != batch 且填写了值时提交，否则置 null
            const rawDiscount = data.batch_discount;
            if (data.mode !== 'batch' && rawDiscount !== '' && rawDiscount !== null && rawDiscount !== undefined) {
                data.batch_discount = Number(rawDiscount);
            } else {
                data.batch_discount = null;
            }
            return data;
        },

        handleSubmit() {
            this.pricesError = this.pricesList.length === 0 || this.pricesList.every(item =>
                item.key === '' || item.value === '' || item.value === null || item.value === undefined
            );
            const dynamicKeysValid = this.validateDynamicKeys();
            const batchDiscountValid = this.validateBatchDiscount();

            this.$refs.formData.validate(valid => {
                if (!valid) {
                    this.$Message.error(this.$t('com.tipValidateError'));
                    return;
                }
                if (!dynamicKeysValid) {
                    return;
                }
                if (!batchDiscountValid) {
                    this.$Message.error(this.$t('modelPrices.batchDiscountInvalid'));
                    return;
                }
                if (this.pricesError) {
                    this.$Message.error(this.$t('modelPrices.pricesRequired'));
                    return;
                }

                const payload = this.buildPayload();
                const isEdit = !!this.currentData.id;

                // 编辑模式下 provider/model/mode 都没改动，直接提交
                if (isEdit) {
                    const orig = this.currentData;
                    const unchanged =
                        orig.provider === payload.provider &&
                        orig.model === payload.model &&
                        orig.mode === payload.mode;
                    if (unchanged) {
                        this.doSubmit(payload, isEdit);
                        return;
                    }
                }

                // 校验 (provider, model, mode) 组合唯一性；404 属于预期（不存在），静默处理不弹错误提示
                this.submitting = true;
                this.$request({
                    url: 'model-prices',
                    method: 'get',
                    params: {
                        provider: payload.provider,
                        model: payload.model,
                        mode: payload.mode
                    },
                    openapi: true,
                    unneedTips: true
                }).then(res => {
                    const data = res.data && res.data.Data;
                    // 后端返回单条记录时存在 id；返回分页列表时检查 list 长度
                    const isDuplicate = res.status === 200 && data && (
                        data.id || (Array.isArray(data.list) && data.list.length > 0)
                    );
                    if (isDuplicate) {
                        this.$Message.error(this.$t('modelPrices.duplicateCombo'));
                        this.submitting = false;
                    } else {
                        this.doSubmit(payload, isEdit);
                    }
                }).catch(err => {
                    console.error('校验组合唯一性失败:', err);
                    this.doSubmit(payload, isEdit);
                });
            });
        },

        doSubmit(payload, isEdit) {
            this.submitting = true;
            this.$request({
                url: isEdit ? `model-prices/${this.currentData.id}` : 'model-prices',
                method: isEdit ? 'put' : 'post',
                data: payload,
                openapi: true
            }).then(res => {
                if (res.status === 200) {
                    this.$Message.success(this.$t('com.tipSubmitSucc'));
                    this.$emit('submit');
                } else {
                    this.$Message.error(this.$t('com.tipSubmitFailed'));
                }
            }).catch(err => {
                console.error('提交模型定价失败:', err);
                this.$Message.error(this.$t('com.tipSubmitFailed'));
            }).finally(() => {
                this.submitting = false;
            });
        },

        onCancel() {
            this.$emit('cancel');
        }
    }
};
</script>

<style lang="less" scoped>
.model-price-upsert {
    .dynamic-card {
        margin-bottom: 16px;
    }

    .dynamic-row {
        margin-bottom: 10px;
    }

    .kv-table {
        width: 100%;
        margin-bottom: 12px;
        border-collapse: collapse;
        border: 1px solid #e8eaec;

        th,
        td {
            padding: 8px 12px;
            border: 1px solid #e8eaec;
            vertical-align: middle;
            text-align: left;
        }

        th {
            background: #f8f8f9;
            font-weight: 500;
        }
    }

    .add-row-btn {
        margin-top: 4px;
    }

    .price-section-card {
        /deep/ .ivu-card-body {
            padding-top: 8px;
        }
    }

    .price-config-group {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .price-config-block {
        border: 1px solid #e8eaec;
        border-radius: 4px;
        background: #fafafa;
        overflow: hidden;
    }

    .price-config-header {
        padding: 12px 16px;
        border-bottom: 1px solid #e8eaec;
        background: #fff;
    }

    .price-config-title {
        display: inline-flex;
        align-items: center;
        font-size: 14px;
        line-height: 14px;
        font-weight: 500;
        color: #515a6e;

        &.is-required::before {
            content: '*';
            display: inline-block;
            margin-right: 4px;
            color: #ed4014;
            font-family: SimSun, sans-serif;
            line-height: 1;
        }
    }

    .price-config-help-icon {
        margin-left: 6px;
        font-size: 16px;
        color: #2d8cf0;
        cursor: help;
        vertical-align: middle;
    }

    .price-config-tip {
        white-space: normal;
        line-height: 1.6;
    }

    .price-config-body {
        padding: 16px;
    }

    .price-hint {
        margin: 0 0 12px;
        color: #808695;
        font-size: 12px;
        line-height: 1.6;
    }

    .tier-meta-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
    }

    .tier-meta-label {
        font-size: 14px;
        line-height: 22px;
        color: #515a6e;
    }

    .error-text {
        color: #ed4014;
        margin-top: 8px;
    }

    .drawer-footer {
        margin-top: 24px;
        text-align: right;
    }
}
</style>
