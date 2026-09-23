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
  <Form
    ref="formData"
    :model="formData"
    :rules="ruleValidate"
    label-position="top"
    @submit.native.prevent
  >
    <Card :title="$t('entity.basicInfo')" class="form-card">
      <FormItem :label="$t('entity.name')" prop="name">
        <Input
          v-model="formData.name"
          :disabled="!isAdd"
          :placeholder="$t('entity.namePlaceholder')"
          show-word-limit
        ></Input>
        <p v-if="isAdd" class="form-tip">{{ $t('entity.nameRule') }}</p>
      </FormItem>

      <FormItem :label="$t('entity.description')" prop="description">
        <Input
          v-model="formData.description"
          :maxlength="255"
          :placeholder="$t('entity.entityDescriptionPlaceholder')"
        ></Input>
      </FormItem>

      <Row :gutter="24">
        <Col span="12">
          <FormItem :label="$t('entity.type')" prop="type">
            <el-select
              v-model="formData.type"
              style="width: 100%;"
              :disabled="!isAdd"
              filterable
              size="small"
              @change="onTypeChange"
            >
              <el-option
                v-for="item in entityTypeList"
                :key="item.type_name"
                :value="item.type_name"
                :label="item.type_name"
              />
            </el-select>
          </FormItem>
        </Col>
        <Col span="12">
          <FormItem :label="$t('entity.parentEntity')">
            <el-select
              v-model="formData.parent_id"
              style="width: 100%;"
              clearable
              filterable
              size="small"
              @clear="formData.parent_id = ''"
            >
              <el-option :value="''" :label="$t('entity.noParent')" />
              <el-option
                v-for="item in parentEntityList"
                :key="item.id"
                :value="String(item.id)"
                :label="item.name"
              />
            </el-select>
            <p class="form-tip">
              {{ $t('entity.parentLevelTip') }}
            </p>
          </FormItem>
        </Col>
      </Row>

      <Row :gutter="24">
        <Col span="12">
          <FormItem :label="$t('entity.allowModels')">
            <el-select
              v-model="formData.allow_models"
              style="width: 100%;"
              multiple
              filterable
              size="small"
              :placeholder="$t('entity.selectAllowModels')"
            >
              <el-option value="*" :label="$t('entity.allModels')" />
              <el-option-group
                v-for="group in modelGroups"
                :key="group.label"
                :label="group.label"
              >
                <el-option
                  v-for="model in group.models"
                  :key="`${group.label}-${model}`"
                  :value="model"
                  :label="model"
                />
              </el-option-group>
            </el-select>
          </FormItem>
        </Col>
        <Col span="12">
          <FormItem :label="$t('entity.blockModels')">
            <el-select
              v-model="formData.block_models"
              style="width: 100%;"
              multiple
              filterable
              size="small"
              :placeholder="$t('entity.selectBlockModels')"
            >
              <el-option-group
                v-for="group in modelGroups"
                :key="group.label"
                :label="group.label"
              >
                <el-option
                  v-for="model in group.models"
                  :key="`${group.label}-${model}`"
                  :value="model"
                  :label="model"
                />
              </el-option-group>
            </el-select>
          </FormItem>
        </Col>
      </Row>
    </Card>

    <Card :title="$t('entity.quotaInfo')" class="form-card">
      <Row :gutter="24">
        <Col span="12">
          <FormItem :label="$t('entity.unlimitedQuota')">
            <Select
              v-model="formData.quota_plan.unlimited"
              style="width: 100%;"
            >
              <Option value="true">{{ $t('entity.yes') }}</Option>
              <Option value="false">{{ $t('entity.no') }}</Option>
            </Select>
          </FormItem>
        </Col>
      </Row>

      <div v-if="formData.quota_plan.unlimited === 'false'">
        <Row :gutter="24">
          <Col span="12">
            <FormItem :label="$t('entity.passWhenNoQuota')">
              <Select
                v-model="formData.quota_plan.pass_when_no_enough_quota"
                style="width: 100%;"
              >
                <Option value="true">{{ $t('entity.yes') }}</Option>
                <Option value="false">{{ $t('entity.no') }}</Option>
              </Select>
            </FormItem>
          </Col>
          <Col span="12">
            <FormItem :label="$t('entity.quotaTotal')" prop="quota_plan.quota">
              <InputNumber
                v-model="formData.quota_plan.quota"
                :min="0"
                :max="quotaInputMax"
                :precision="quotaPrecision"
                :step="quotaStep"
                :formatter="isRMB ? null : formatNumberInput"
                :parser="isRMB ? null : parseNumberInput"
                style="width: 100%;"
                @on-change="validateQuotaField"
                @on-blur="validateQuotaField"
              ></InputNumber>
            </FormItem>
          </Col>
        </Row>

        <Row :gutter="24">
          <Col span="12">
            <FormItem :label="$t('entity.quotaUnit')">
              <Select v-model="formData.quota_plan.unit" style="width: 100%;">
                <Option value="total_token">total_token</Option>
                <Option value="RMB">RMB</Option>
              </Select>
            </FormItem>
          </Col>
          <Col span="12">
            <FormItem :label="$t('entity.resetPeriod')">
              <Select
                v-model="formData.quota_plan.reset_period"
                style="width: 100%;"
              >
                <Option value="never">{{ $t('entity.resetNever') }}</Option>
                <Option value="weekly">{{ $t('entity.resetWeekly') }}</Option>
                <Option value="monthly">{{ $t('entity.resetMonthly') }}</Option>
              </Select>
            </FormItem>
          </Col>
        </Row>
      </div>
    </Card>

    <!-- 限流配置 -->
    <Card :title="$t('entity.rateLimitConfig')" class="form-card">
      <Row :gutter="24">
        <Col span="12">
          <FormItem prop="rate_limit_policy.enabled">
            <span slot="label" class="rate-limit-label">
              {{ $t('entity.enableRateLimit') }}
              <Tooltip placement="top" transfer max-width="320">
                <div slot="content" class="rate-limit-tip-content">
                  {{ $t('entity.enableRateLimitTip') }}
                </div>
                <Icon
                  type="ios-help-circle-outline"
                  class="rate-limit-help-icon"
                />
              </Tooltip>
            </span>
            <Select
              v-model="formData.rate_limit_policy.enabled"
              style="width: 100%;"
              @on-change="validateRateLimitEnabledField"
            >
              <Option value="true">{{ $t('entity.yes') }}</Option>
              <Option value="false">{{ $t('entity.no') }}</Option>
            </Select>
          </FormItem>
        </Col>
      </Row>

      <div v-if="formData.rate_limit_policy.enabled === 'true'">
        <div class="rules-section">
          <h4 class="rules-title">{{ $t('entity.tpmRules') }}</h4>
          <div
            v-for="(rule, index) in formData.rate_limit_policy.rules.tpm"
            :key="'tpm-' + index"
            class="rule-row"
          >
            <Row :gutter="16">
              <Col span="4">
                <FormItem
                  :label="$t('entity.ruleName')"
                  :prop="'rate_limit_policy.rules.tpm.' + index + '.name'"
                  :rules="[{ required: true, validator: validateTpmRuleName, trigger: 'blur,change' }]"
                >
                  <Input v-model="rule.name"></Input>
                </FormItem>
              </Col>
              <Col span="4">
                <FormItem
                  :label="$t('entity.applyModel')"
                  :prop="'rate_limit_policy.rules.tpm.' + index + '.model'"
                >
                  <el-select
                    v-model="rule.model"
                    filterable
                    size="small"
                    style="width: 100%;"
                  >
                    <el-option value="*" :label="$t('entity.allModels')" />
                    <el-option-group
                      v-for="group in modelGroups"
                      :key="group.label"
                      :label="group.label"
                    >
                      <el-option
                        v-for="model in group.models"
                        :key="`${group.label}-${model}`"
                        :value="model"
                        :label="model"
                      />
                    </el-option-group>
                  </el-select>
                </FormItem>
              </Col>
              <Col span="4">
                <FormItem
                  :label="$t('entity.timeWindow')"
                  :prop="'rate_limit_policy.rules.tpm.' + index + '.window_minutes'"
                  :rules="[{ validator: validateTpmWindowMinutes, trigger: 'change,blur' }]"
                >
                  <InputNumber
                    v-model="rule.window_minutes"
                    :min="1"
                    :max="360"
                    :precision="0"
                    :formatter="formatNumberInput"
                    :parser="parseNumberInput"
                    style="width: 100%;"
                    @on-change="onTpmWindowChange(index)"
                  ></InputNumber>
                </FormItem>
              </Col>
              <Col span="4">
                <FormItem
                  :label="$t('entity.maxTokens')"
                  :prop="'rate_limit_policy.rules.tpm.' + index + '.max_tokens'"
                  :rules="[{ validator: validateTpmMaxTokens, trigger: 'change,blur' }]"
                >
                  <InputNumber
                    v-model="rule.max_tokens"
                    :min="0"
                    :precision="0"
                    :formatter="formatNumberInput"
                    :parser="parseNumberInput"
                    style="width: 100%;"
                  ></InputNumber>
                </FormItem>
              </Col>
              <Col span="4">
                <FormItem
                  :label="$t('entity.stepMinutes')"
                  :prop="'rate_limit_policy.rules.tpm.' + index + '.step_minutes'"
                  :rules="[{ validator: validateTpmStepMinutes, trigger: 'change,blur' }]"
                >
                  <InputNumber
                    v-model="rule.step_minutes"
                    :min="1"
                    :max="rule.window_minutes"
                    :precision="0"
                    :formatter="formatNumberInput"
                    :parser="parseNumberInput"
                    style="width: 100%;"
                    @on-change="validateTpmStepMinutesField(index)"
                  ></InputNumber>
                </FormItem>
              </Col>
              <Col span="2">
                <FormItem :label="$t('com.operation')">
                  <Button
                    type="error"
                    size="small"
                    @click="removeTpmRule(index)"
                    >{{ $t('com.del') }}</Button
                  >
                </FormItem>
              </Col>
            </Row>
          </div>
          <Button
            type="primary"
            size="small"
            @click="addTpmRule"
            icon="md-add"
            >{{ $t('entity.addRule') }}</Button
          >
        </div>

        <div class="rules-section">
          <h4 class="rules-title">{{ $t('entity.rpmRules') }}</h4>
          <div
            v-for="(rule, index) in formData.rate_limit_policy.rules.rpm"
            :key="'rpm-' + index"
            class="rule-row"
          >
            <Row :gutter="16">
              <Col span="5">
                <FormItem
                  :label="$t('entity.ruleName')"
                  :prop="'rate_limit_policy.rules.rpm.' + index + '.name'"
                  :rules="[{ required: true, validator: validateRpmRuleName, trigger: 'blur,change' }]"
                >
                  <Input v-model="rule.name"></Input>
                </FormItem>
              </Col>
              <Col span="5">
                <FormItem :label="$t('entity.applyModel')">
                  <el-select
                    v-model="rule.model"
                    filterable
                    size="small"
                    style="width: 100%;"
                  >
                    <el-option value="*" :label="$t('entity.allModels')" />
                    <el-option-group
                      v-for="group in modelGroups"
                      :key="group.label"
                      :label="group.label"
                    >
                      <el-option
                        v-for="model in group.models"
                        :key="`${group.label}-${model}`"
                        :value="model"
                        :label="model"
                      />
                    </el-option-group>
                  </el-select>
                </FormItem>
              </Col>
              <Col span="5">
                <FormItem
                  :label="$t('entity.timeWindow')"
                  :prop="'rate_limit_policy.rules.rpm.' + index + '.window_minutes'"
                  :rules="[{ validator: validateRpmWindowMinutes, trigger: 'change,blur' }]"
                >
                  <InputNumber
                    v-model="rule.window_minutes"
                    :min="1"
                    :max="360"
                    :precision="0"
                    :formatter="formatNumberInput"
                    :parser="parseNumberInput"
                    style="width: 100%;"
                  ></InputNumber>
                </FormItem>
              </Col>
              <Col span="5">
                <FormItem
                  :label="$t('entity.maxRequests')"
                  :prop="'rate_limit_policy.rules.rpm.' + index + '.max_requests'"
                  :rules="[{ validator: validateRpmMaxRequests, trigger: 'change,blur' }]"
                >
                  <InputNumber
                    v-model="rule.max_requests"
                    :min="0"
                    :max="INT64_MAX"
                    :precision="0"
                    :formatter="formatNumberInput"
                    :parser="parseNumberInput"
                    style="width: 100%;"
                  ></InputNumber>
                </FormItem>
              </Col>
              <Col span="2">
                <FormItem :label="$t('com.operation')">
                  <Button
                    type="error"
                    size="small"
                    @click="removeRpmRule(index)"
                    >{{ $t('com.del') }}</Button
                  >
                </FormItem>
              </Col>
            </Row>
          </div>
          <Button
            type="primary"
            size="small"
            class="mb20"
            @click="addRpmRule"
            icon="md-add"
            >{{ $t('entity.addRule') }}</Button
          >
        </div>

        <Row :gutter="24">
          <Col span="12">
            <FormItem :label="$t('entity.maxConcurrency')">
              <Select
                v-model="maxConcurrencyMode"
                style="width: 100%;"
                @on-change="onMaxConcurrencyModeChange"
              >
                <Option
                  value="unlimited"
                  >{{ $t('entity.maxConcurrencyUnlimited') }}</Option
                >
                <Option
                  value="banned"
                  >{{ $t('entity.maxConcurrencyBanned') }}</Option
                >
                <Option
                  value="limited"
                  >{{ $t('entity.maxConcurrencyLimited') }}</Option
                >
              </Select>
              <FormItem
                v-if="maxConcurrencyMode === 'limited'"
                prop="rate_limit_policy.rules.max_concurrency"
                :rules="maxConcurrencyCustomRules"
                class="max-concurrency-custom-input"
              >
                <InputNumber
                  v-model="formData.rate_limit_policy.rules.max_concurrency"
                  :min="1"
                  :max="INT_MAX"
                  :precision="0"
                  :formatter="formatNumberInput"
                  :parser="parseNumberInput"
                  style="width: 100%;"
                  @on-change="onMaxConcurrencyValueChange"
                  @on-blur="validateMaxConcurrencyField"
                ></InputNumber>
              </FormItem>
            </FormItem>
          </Col>
        </Row>
      </div>
    </Card>

    <FormItem class="com-btn-box drawer-footer">
      <Button
        @click="$emit('cancel')"
        class="btn-box-del"
        >{{ $t('com.cancel') }}</Button
      >
      <Button
        type="primary"
        @click="handleSubmit('formData')"
        >{{ $t('com.submit') }}</Button
      >
    </FormItem>
  </Form>
</template>

<script>
import { cloneDeep } from 'lodash';
import { getModelGroupsFromServices } from '@/utils/model';
import { EntityNameRegCheck, TOKEN_QUOTA_MAX, RMB_QUOTA_MAX } from '@/utils/const';

const INT64_MAX = 9223372036854775807;
const INT_MAX = 2147483647;

export default {
    props: {
        currentData: {
            type: Object,
            default() {
                return {};
            }
        },
        isAdd: {
            type: Boolean,
            default: false
        },
        entityList: {
            type: Array,
            default: () => []
        }
    },
    data() {
        const that = this;

        // Validate name
        const validateName = (rule, value, callback) => {
            if (!value || value.trim() === '') {
                callback(new Error(this.$t('entity.enterName')));
                return;
            }
            const trimmed = value.trim();
            if (trimmed.length !== value.length) {
                callback(new Error(this.$t('entity.nameLeadingTrailingWhitespace')));
                return;
            }
            if (trimmed.length > 64) {
                callback(new Error(this.$t('entity.nameLengthError')));
                return;
            }
            if (/[\x00-\x1F\x7F]/.test(trimmed)) {
                callback(new Error(this.$t('entity.nameControlCharsError')));
                return;
            }
            if (!EntityNameRegCheck(trimmed)) {
                callback(new Error(this.$t('entity.nameFormatError')));
                return;
            }
            callback();
        };

        // Validate description (optional; 0-255 chars; no control chars)
        const validateDescription = (rule, value, callback) => {
            const val = value === null || value === undefined ? '' : String(value);
            if (val === '') {
                callback();
                return;
            }
            if (val.length > 255) {
                callback(new Error(this.$t('entity.descriptionLengthError')));
                return;
            }
            if (/[\x00-\x1F\x7F]/.test(val)) {
                callback(new Error(this.$t('entity.descriptionControlCharsError')));
                return;
            }
            callback();
        };

        // Validate type
        const validateType = (rule, value, callback) => {
            if (!value || value.trim() === '') {
                callback(new Error(this.$t('entity.selectType')));
                return;
            }
            callback();
        };

        // Validate quota (required when quota_plan.unlimited=false)
        const validateQuota = (rule, value, callback) => {
            if (that.formData.quota_plan.unlimited === 'false') {
                if (value === null || value === undefined || value === '') {
                    callback(new Error(this.$t('entity.enterQuotaTotal')));
                    return;
                }
                if (Number.isNaN(Number(value)) || value < 0) {
                    callback(new Error(this.$t('entity.quotaRangeError')));
                    return;
                }
                const isRMB = that.formData.quota_plan.unit === 'RMB';
                if (!isRMB && !Number.isInteger(value)) {
                    callback(new Error(this.$t('entity.quotaMustBeNonNegative')));
                    return;
                }
                if (isRMB) {
                    const decimals = (String(value).split('.')[1] || '').length;
                    if (decimals > 4) {
                        callback(new Error(this.$t('entity.quotaRmbPrecisionError') || 'RMB 配额最多保留 4 位小数'));
                        return;
                    }
                }
                if (isRMB && value > RMB_QUOTA_MAX) {
                    callback(new Error(this.$t('entity.quotaRmbMaxError') || 'RMB 配额不能超过 9000 万元'));
                    return;
                }
                if (!isRMB && value > TOKEN_QUOTA_MAX) {
                    callback(new Error(this.$t('entity.quotaMaxError')));
                    return;
                }
            }
            callback();
        };

        // Validate rate limit policy (at least one rule required; no duplicate combinations)
        const validateRateLimitPolicy = (rule, value, callback) => {
            if (that.formData.rate_limit_policy.enabled === 'true') {
                const tpm = that.formData.rate_limit_policy.rules.tpm || [];
                const rpm = that.formData.rate_limit_policy.rules.rpm || [];
                const maxConcurrency = that.formData.rate_limit_policy.rules.max_concurrency;
                const hasTpmRules = tpm.length > 0;
                const hasRpmRules = rpm.length > 0;
                const hasEffectiveMaxConcurrency =
                    that.maxConcurrencyMode === 'banned'
                    || (
                        that.maxConcurrencyMode === 'limited'
                        && Number.isInteger(maxConcurrency)
                        && maxConcurrency > 0
                    );
                if (!hasTpmRules && !hasRpmRules && !hasEffectiveMaxConcurrency) {
                    callback(new Error(this.$t('entity.rateLimitRuleRequired')));
                    return;
                }

                const tpmKeys = tpm.map(r => `${r.model || ''}|${r.window_minutes || 0}|${r.max_tokens || 0}|${r.step_minutes || 0}`);
                const uniqueTpmKeys = [...new Set(tpmKeys)];
                if (tpmKeys.length !== uniqueTpmKeys.length) {
                    callback(new Error(this.$t('entity.tpmCombinationDuplicate')));
                    return;
                }

                const rpmKeys = rpm.map(r => `${r.model || ''}|${r.window_minutes || 0}|${r.max_requests || 0}`);
                const uniqueRpmKeys = [...new Set(rpmKeys)];
                if (rpmKeys.length !== uniqueRpmKeys.length) {
                    callback(new Error(this.$t('entity.rpmCombinationDuplicate')));
                    return;
                }
            }
            callback();
        };

        return {
            INT64_MAX,
            TOKEN_QUOTA_MAX,
            RMB_QUOTA_MAX,
            INT_MAX,
            maxConcurrencyMode: 'limited',
            entityTypeList: [],
            modelServices: [],
            formData: {
                name: '',
                description: '',
                type: '',
                parent_id: '',
                allow_models: ['*'],
                block_models: [],
                quota_plan: {
                    unlimited: 'true',
                    pass_when_no_enough_quota: 'false',
                    quota: 100000000,
                    unit: 'total_token',
                    reset_period: 'never'
                },
                rate_limit_policy: {
                    enabled: 'false',
                    rules: {
                        tpm: [],
                        rpm: [],
                        max_concurrency: 1
                    }
                }
            },
            ruleValidate: {
                name: [
                    {
                        required: true,
                        validator: validateName,
                        trigger: 'blur'
                    }
                ],
                description: [
                    {
                        validator: validateDescription,
                        trigger: 'blur'
                    }
                ],
                type: [
                    {
                        required: true,
                        validator: validateType,
                        trigger: 'change'
                    }
                ],
                'quota_plan.quota': [
                    {
                        validator: validateQuota,
                        trigger: 'blur,change'
                    }
                ],
                'rate_limit_policy.enabled': [
                    {
                        validator: validateRateLimitPolicy,
                        trigger: 'change'
                    }
                ]
            }
        };
    },
    computed: {
        parentEntityList() {
            if (!this.formData.type) return [];
            const currentType = this.entityTypeList.find(
                t => t && t.type_name === this.formData.type
            );
            if (!currentType) return [];
            const currentLevel = currentType.level;
            return this.entityList.filter(entity => {
                if (!entity || entity.id === this.currentData.id) return false;
                const entityType = this.entityTypeList.find(
                    t => t && t.type_name === entity.type
                );
                return entityType && entityType.level < currentLevel;
            });
        },
        modelGroups() {
            return getModelGroupsFromServices(this.modelServices);
        },
        maxConcurrencyCustomRules() {
            return [
                {
                    validator: this.validateMaxConcurrency,
                    trigger: 'change'
                },
                {
                    validator: this.validateMaxConcurrency,
                    trigger: 'blur'
                }
            ];
        },
        isRMB() {
            return this.formData.quota_plan && this.formData.quota_plan.unit === 'RMB';
        },
        quotaPrecision() {
            return this.isRMB ? 4 : 0;
        },
        quotaStep() {
            return this.isRMB ? 0.0001 : 1;
        },
        quotaInputMax() {
            return this.isRMB ? RMB_QUOTA_MAX : TOKEN_QUOTA_MAX;
        }
    },
    watch: {
        currentData: {
            handler(data) {
                if (!this.isAdd && data && data.id) {
                    this.initFormData(data);
                }
            },
            deep: true,
            immediate: true
        },
        'formData.allow_models': {
            handler(val) {
                if (!val || val.length === 0) return;
                const hasStar = val.includes('*');
                const hasOthers = val.length > 1;
                if (hasStar && hasOthers) {
                    const lastIndex = val.length - 1;
                    if (val[lastIndex] === '*') {
                        this.formData.allow_models = ['*'];
                    } else {
                        this.formData.allow_models = val.filter(v => v !== '*');
                    }
                }
            },
            deep: true
        }
    },
    mounted() {
        this.fetchEntityTypeList();
        this.fetchModelServices();
    },
    methods: {
        formatNumberInput(value) {
            if (value === null || value === undefined || value === '') {
                return '';
            }
            return Number(value).toLocaleString();
        },
        parseNumberInput(value) {
            return String(value).replace(/,/g, '');
        },
        initFormData(data) {
            this.formData = cloneDeep(data);

            // Ensure description is a string (PATCH: '' explicitly clears, omitted keeps original)
            if (this.formData.description === undefined || this.formData.description === null) {
                this.formData.description = '';
            }

            // Convert parent_id to string (for Select component)
            if (this.formData.parent_id !== undefined && this.formData.parent_id !== null) {
                this.formData.parent_id = String(this.formData.parent_id);
            } else {
                this.formData.parent_id = '';
            }

            // Ensure quota_plan exists and convert boolean values to strings
            if (!this.formData.quota_plan) {
                this.formData.quota_plan = {
                    unlimited: 'true',
                    pass_when_no_enough_quota: 'false',
                    quota: 100000000,
                    unit: 'total_token',
                    reset_period: 'never'
                };
            } else {
                // Convert boolean values to strings
                this.formData.quota_plan.unlimited = String(this.formData.quota_plan.unlimited);
                this.formData.quota_plan.pass_when_no_enough_quota = String(this.formData.quota_plan.pass_when_no_enough_quota);
            }

            // Ensure rate_limit_policy exists and convert boolean values to strings
            if (!this.formData.rate_limit_policy) {
                this.formData.rate_limit_policy = {
                    enabled: 'false',
                    rules: {
                        tpm: [],
                        rpm: [],
                        max_concurrency: -1
                    }
                };
            } else {
                // Convert boolean values to strings
                this.formData.rate_limit_policy.enabled = String(this.formData.rate_limit_policy.enabled);
            }
            if (!this.formData.rate_limit_policy.rules) {
                this.formData.rate_limit_policy.rules = {
                    tpm: [],
                    rpm: [],
                    max_concurrency: -1
                };
            }

            // Ensure allow_models and block_models exist
            if (!this.formData.allow_models || this.formData.allow_models.length === 0) {
                this.formData.allow_models = ['*'];
            }
            if (!this.formData.block_models || (this.formData.block_models.length === 1 && this.formData.block_models[0] === '*')) {
                this.formData.block_models = [];
            }

            this.syncMaxConcurrencyMode();
        },

        fetchEntityTypeList() {
            this.$request({
                url: 'entity-types',
                method: 'get',
                openapi: true
            }).then(data => {
                if (data.status === 200) {
                    const list = data.data.Data?.list || data.data.Data || [];
                    this.entityTypeList = (Array.isArray(list) ? list : [])
                        .filter(item => item && item.type_name);
                }
            }).catch(() => {
                this.entityTypeList = [];
            });
        },

        fetchModelServices() {
            this.$request({
                url: 'clusters',
                method: 'get',
                openapi: true
            }).then(data => {
                if (data.status === 200) {
                    const clusters = data.data.Data || [];
                    this.modelServices = clusters
                        .filter(cluster => cluster.llm_config && cluster.llm_config.models && cluster.llm_config.models.length > 0)
                        .map(cluster => ({
                            cluster_name: cluster.name,
                            models: cluster.llm_config.models
                        }));
                    // After model list loads, if in edit mode, reformat model fields to ensure proper display
                    if (!this.isAdd && this.formData && this.formData.id) {
                        this.normalizeModelFields();
                    }
                }
            }).catch(() => {
                this.modelServices = [];
            });
        },
        normalizeModelFields() {
            if (this.formData.allow_models && this.formData.allow_models.length > 0) {
                const models = [...this.formData.allow_models];
                if (models.includes('*')) {
                    this.formData.allow_models = ['*'];
                } else {
                    this.formData.allow_models = models;
                }
            }
            if (this.formData.block_models && this.formData.block_models.length > 0) {
                const models = [...this.formData.block_models];
                this.formData.block_models = models.includes('*') ? [] : models;
            }
        },

        addTpmRule() {
            if (this.formData.rate_limit_policy.rules.tpm.length >= 3) {
                this.$Message.warning(this.$t('entity.maxRulesTip'));
                return;
            }
            this.formData.rate_limit_policy.rules.tpm.push({
                name: '',
                model: '*',
                window_minutes: 1,
                max_tokens: 10000,
                step_minutes: 1
            });
            this.validateRateLimitEnabledField();
        },

        removeTpmRule(index) {
            this.formData.rate_limit_policy.rules.tpm.splice(index, 1);
            this.validateRateLimitEnabledField();
        },

        addRpmRule() {
            if (this.formData.rate_limit_policy.rules.rpm.length >= 3) {
                this.$Message.warning(this.$t('entity.maxRulesTip'));
                return;
            }
            this.formData.rate_limit_policy.rules.rpm.push({
                name: '',
                model: '*',
                window_minutes: 1,
                max_requests: 100
            });
            this.validateRateLimitEnabledField();
        },

        removeRpmRule(index) {
            this.formData.rate_limit_policy.rules.rpm.splice(index, 1);
            this.validateRateLimitEnabledField();
        },

        validateRateLimitEnabledField() {
            this.$nextTick(() => {
                if (!this.$refs.formData) return;
                this.$refs.formData.validateField('rate_limit_policy.enabled');
            });
        },

        validateMaxConcurrencyField() {
            this.$nextTick(() => {
                if (!this.$refs.formData) return;
                this.$refs.formData.validateField('rate_limit_policy.rules.max_concurrency');
                this.validateRateLimitEnabledField();
            });
        },

        onTypeChange() {
            this.$nextTick(() => {
                if (!this.$refs.formData) return;
                this.$refs.formData.validateField('type');
            });
        },

        syncMaxConcurrencyMode() {
            const maxConcurrency = this.formData.rate_limit_policy.rules.max_concurrency;
            if (maxConcurrency === 0) {
                this.maxConcurrencyMode = 'banned';
                return;
            }
            if (Number.isFinite(maxConcurrency) && maxConcurrency > 0) {
                this.maxConcurrencyMode = 'limited';
                return;
            }
            this.maxConcurrencyMode = 'unlimited';
            this.formData.rate_limit_policy.rules.max_concurrency = -1;
        },

        onMaxConcurrencyModeChange(mode) {
            if (mode === 'banned') {
                this.formData.rate_limit_policy.rules.max_concurrency = 0;
            } else if (mode === 'limited') {
                const current = this.formData.rate_limit_policy.rules.max_concurrency;
                if (!Number.isFinite(current) || current <= 0) {
                    this.formData.rate_limit_policy.rules.max_concurrency = 1;
                }
            } else {
                this.formData.rate_limit_policy.rules.max_concurrency = -1;
            }
            if (mode === 'limited') {
                this.validateMaxConcurrencyField();
            } else {
                this.validateRateLimitEnabledField();
            }
        },

        onMaxConcurrencyValueChange(value) {
            if (this.maxConcurrencyMode !== 'limited') {
                return;
            }
            if (value === null || value === undefined || value === '') {
                this.formData.rate_limit_policy.rules.max_concurrency = null;
            }
            this.validateMaxConcurrencyField();
        },

        validateMaxConcurrency(rule, value, callback) {
            if (this.formData.rate_limit_policy.enabled === 'false') {
                callback();
                return;
            }
            if (this.maxConcurrencyMode === 'unlimited') {
                callback();
                return;
            }
            if (this.maxConcurrencyMode === 'banned') {
                if (this.formData.rate_limit_policy.rules.max_concurrency !== 0) {
                    callback(new Error(this.$t('entity.maxConcurrencyBannedError')));
                    return;
                }
                callback();
                return;
            }

            if (this.maxConcurrencyMode === 'limited') {
                const currentValue = this.formData.rate_limit_policy.rules.max_concurrency;
                if (currentValue === null || currentValue === undefined || currentValue === '') {
                    callback(new Error(this.$t('entity.maxConcurrencyLimitedRequired')));
                    return;
                }
                if (!Number.isInteger(currentValue)) {
                    callback(new Error(this.$t('entity.maxConcurrencyLimitedInvalid')));
                    return;
                }
                if (currentValue <= 0) {
                    callback(new Error(this.$t('entity.maxConcurrencyLimitedInvalid')));
                    return;
                }
                if (currentValue > INT_MAX) {
                    callback(new Error(this.$t('entity.maxConcurrencyMaxError')));
                    return;
                }
                callback();
                return;
            }

            callback();
        },

        getRuleFieldIndex(field, ruleType) {
            const fieldPath = field || '';
            const parts = fieldPath.split('.');
            const typeIndex = parts.indexOf(ruleType);
            if (typeIndex === -1 || typeIndex + 1 >= parts.length) return 0;
            const index = parseInt(parts[typeIndex + 1], 10);
            return Number.isNaN(index) ? 0 : index;
        },

        getRuleFieldPath(rule) {
            return rule.fullField || rule.field || '';
        },

        onTpmWindowChange(index) {
            this.$nextTick(() => {
                if (!this.$refs.formData) return;
                this.$refs.formData.validateField(`rate_limit_policy.rules.tpm.${index}.step_minutes`);
            });
        },

        validateTpmStepMinutesField(index) {
            this.$nextTick(() => {
                if (!this.$refs.formData) return;
                this.$refs.formData.validateField(`rate_limit_policy.rules.tpm.${index}.step_minutes`);
            });
        },

        validateTpmWindowMinutes(rule, value, callback) {
            if (this.formData.rate_limit_policy.enabled === 'false') {
                callback();
                return;
            }
            const index = this.getRuleFieldIndex(this.getRuleFieldPath(rule), 'tpm') + 1;
            if (value === null || value === undefined || value === '') {
                callback(new Error(this.$t('entity.tpmWindowMinutesRequired', { index })));
                return;
            }
            if (!Number.isFinite(value) || value < 1 || value > 360) {
                callback(new Error(this.$t('entity.tpmWindowMinutesInvalid', { index })));
                return;
            }
            callback();
        },

        validateTpmMaxTokens(rule, value, callback) {
            if (this.formData.rate_limit_policy.enabled === 'false') {
                callback();
                return;
            }
            const index = this.getRuleFieldIndex(this.getRuleFieldPath(rule), 'tpm') + 1;
            if (value === null || value === undefined || value === '') {
                callback(new Error(this.$t('entity.tpmMaxTokensRequired', { index })));
                return;
            }
            if (!Number.isFinite(value) || value < 0) {
                callback(new Error(this.$t('entity.tpmMaxTokensInvalid', { index })));
                return;
            }
            if (value > INT64_MAX) {
                callback(new Error(this.$t('entity.maxTokensMaxError', { index })));
                return;
            }

            callback();
        },

        validateTpmStepMinutes(rule, value, callback) {
            if (this.formData.rate_limit_policy.enabled === 'false') {
                callback();
                return;
            }
            const ruleIndex = this.getRuleFieldIndex(this.getRuleFieldPath(rule), 'tpm');
            const index = ruleIndex + 1;
            const tpmRules = this.formData.rate_limit_policy.rules.tpm || [];
            const tpmRule = tpmRules[ruleIndex];
            const windowMinutes = tpmRule ? tpmRule.window_minutes : undefined;
            if (value === null || value === undefined || value === '') {
                callback(new Error(this.$t('entity.tpmStepMinutesRequired', { index })));
                return;
            }
            if (!Number.isFinite(value) || value < 1 || value > 360) {
                callback(new Error(this.$t('entity.tpmStepMinutesRange', { index })));
                return;
            }
            if (Number.isFinite(windowMinutes) && value > windowMinutes) {
                callback(new Error(this.$t('entity.tpmStepMinutesInvalid', { index })));
                return;
            }
            callback();
        },

        validateRpmWindowMinutes(rule, value, callback) {
            if (this.formData.rate_limit_policy.enabled === 'false') {
                callback();
                return;
            }
            const index = this.getRuleFieldIndex(this.getRuleFieldPath(rule), 'rpm') + 1;
            if (value === null || value === undefined || value === '') {
                callback(new Error(this.$t('entity.rpmWindowMinutesRequired', { index })));
                return;
            }
            if (!Number.isFinite(value) || value < 1 || value > 360) {
                callback(new Error(this.$t('entity.rpmWindowMinutesInvalid', { index })));
                return;
            }
            callback();
        },

        validateRpmMaxRequests(rule, value, callback) {
            if (this.formData.rate_limit_policy.enabled === 'false') {
                callback();
                return;
            }
            const index = this.getRuleFieldIndex(this.getRuleFieldPath(rule), 'rpm') + 1;
            if (value === null || value === undefined || value === '') {
                callback(new Error(this.$t('entity.rpmMaxRequestsRequired', { index })));
                return;
            }
            if (!Number.isFinite(value) || value < 0) {
                callback(new Error(this.$t('entity.rpmMaxRequestsInvalid', { index })));
                return;
            }
            if (value > INT64_MAX) {
                callback(new Error(this.$t('entity.maxRequestsMaxError', { index })));
                return;
            }
            callback();
        },

        validateTpmRuleName(rule, value, callback) {
            if (this.formData.rate_limit_policy.enabled === 'false') {
                callback();
                return;
            }
            const trimmed = String(value || '').trim();
            if (trimmed === '') {
                const index = this.getRuleFieldIndex(this.getRuleFieldPath(rule), 'tpm') + 1;
                callback(new Error(this.$t('entity.tpmRuleNameRequired', { index })));
                return;
            }
            if (trimmed.length < 1 || trimmed.length > 128) {
                callback(new Error(this.$t('entity.ruleNameLengthError')));
                return;
            }
            const tpm = this.formData.rate_limit_policy.rules.tpm || [];
            const count = tpm.filter(r => r.name === trimmed).length;
            if (count > 1) {
                callback(new Error(this.$t('entity.ruleNameDuplicate', { name: trimmed })));
                return;
            }
            callback();
        },

        validateRpmRuleName(rule, value, callback) {
            if (this.formData.rate_limit_policy.enabled === 'false') {
                callback();
                return;
            }
            const trimmed = String(value || '').trim();
            if (trimmed === '') {
                const index = this.getRuleFieldIndex(this.getRuleFieldPath(rule), 'rpm') + 1;
                callback(new Error(this.$t('entity.rpmRuleNameRequired', { index })));
                return;
            }
            if (trimmed.length < 1 || trimmed.length > 128) {
                callback(new Error(this.$t('entity.ruleNameLengthError')));
                return;
            }
            const rpm = this.formData.rate_limit_policy.rules.rpm || [];
            const count = rpm.filter(r => r.name === trimmed).length;
            if (count > 1) {
                callback(new Error(this.$t('entity.ruleNameDuplicate', { name: trimmed })));
                return;
            }
            callback();
        },

        validateQuotaField() {
            this.$nextTick(() => {
                if (this.$refs.formData) {
                    this.$refs.formData.validateField('quota_plan.quota');
                }
            });
        },

        isLimitedQuotaInvalid(value) {
            if (this.formData.quota_plan.unlimited !== 'false') {
                return false;
            }
            if (value === null || value === undefined || value === '') {
                return true;
            }
            const num = Number(value);
            if (!Number.isFinite(num) || num < 0) {
                return true;
            }
            if (this.isRMB) {
                return num > RMB_QUOTA_MAX;
            }
            return !Number.isInteger(num) || num > TOKEN_QUOTA_MAX;
        },

        handleSubmit(name) {
            const form = this.$refs[name];
            form.validate(valid => {
                if (this.formData.quota_plan.unlimited === 'false') {
                    form.validateField('quota_plan.quota');
                }
                if (!valid || this.isLimitedQuotaInvalid(this.formData.quota_plan.quota)) {
                    this.$Message.error(this.$t('entity.formValidateError'));
                    return;
                }
                const submitData = cloneDeep(this.formData);

                    submitData.quota_plan.unlimited = submitData.quota_plan.unlimited === 'true';
                    submitData.quota_plan.pass_when_no_enough_quota = submitData.quota_plan.pass_when_no_enough_quota === 'true';
                    if (!submitData.quota_plan.unlimited) {
                        // RMB 模式保留 4 位小数，total_token 模式截断为整数
                        if (submitData.quota_plan.unit !== 'RMB') {
                            submitData.quota_plan.quota = Math.trunc(submitData.quota_plan.quota);
                        }
                    }
                    submitData.rate_limit_policy.enabled = submitData.rate_limit_policy.enabled === 'true';

                    if (!submitData.rate_limit_policy.enabled) {
                        submitData.rate_limit_policy.rules = {
                            tpm: [],
                            rpm: [],
                            max_concurrency: -1
                        };
                    }

                    if (!submitData.block_models || submitData.block_models.length === 0) {
                        submitData.block_models = ['*'];
                    }

                    this.$emit('submit', submitData);
            });
        }
    }
};
</script>

<style lang="less" scoped>
.form-card {
    margin-bottom: 16px;

    /deep/ .ivu-card-head {
        padding: 14px 20px;
        background: #f8f8f9;
        border-bottom: 1px solid #e8eaec;
    }

    /deep/ .ivu-card-body {
        padding: 20px;
    }
}

.rules-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px dashed #e8eaec;
}

.rules-title {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 16px;
    color: #2d8cf0;
}

.rule-row {
    padding: 12px;
    background: #f8f8f9;
    border-radius: 4px;
}

.rate-limit-policy-error {
    margin-top: -8px;
    margin-bottom: 0;

    /deep/ .ivu-form-item-content {
        min-height: 0;
        line-height: 1;
    }
}

.rate-limit-label {
    display: inline-flex;
    align-items: center;
}

.rate-limit-help-icon {
    margin-left: 4px;
    font-size: 16px;
    color: #2d8cf0;
    cursor: pointer;
    vertical-align: middle;
}

.rate-limit-tip-content {
    max-width: 320px;
    white-space: normal;
    line-height: 1.5;
}

.max-concurrency-custom-input {
    margin-top: 8px;
    margin-bottom: 0;

    /deep/ .ivu-form-item-content {
        margin-left: 0 !important;
    }
}

.form-tip {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
}

.btn-box-del {
    margin-right: 8px;
}

.com-btn-box {
    text-align: right;
    padding-top: 16px;
}

.mt20 {
    margin-top: 20px;
}

.mb20 {
    margin-bottom: 20px;
}
</style>
