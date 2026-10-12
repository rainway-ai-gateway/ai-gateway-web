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
    <Form
      ref="formData"
      :model="formData"
      :rules="ruleValidate"
      label-position="top"
      @submit.native.prevent
    >
      <Card :title="$t('apiKey.basicInfo')" class="form-card">
        <FormItem :label="$t('apiKey.description')" prop="description">
          <Input
            v-model="formData.description"
            :placeholder="$t('apiKey.descriptionPlaceholder')"
          ></Input>
        </FormItem>
        <Row :gutter="24">
          <Col span="12">
            <FormItem :label="$t('com.expiredDate')" prop="expired_time">
              <Checkbox v-model="neverExpire">{{
                $t("apiForm.neverExpire")
              }}</Checkbox>
              <DatePicker
                v-if="!neverExpire"
                :placeholder="$t('apiForm.selectTime')"
                style="width: 210px; margin-left: 10px"
                v-model="formData.expired_time"
                type="date"
                :options="options"
              />
            </FormItem>
          </Col>
        </Row>
        <Row :gutter="24">
          <Col span="12">
            <FormItem :label="$t('apiKey.enabledStatus')">
              <Select
                v-model="formData.enabled"
                :key="'enabled-' + formRenderKey"
                style="width: 100%"
              >
                <Option value="true">{{ $t("com.enable") }}</Option>
                <Option value="false">{{ $t("com.deactivate") }}</Option>
              </Select>
            </FormItem>
          </Col>
          <Col span="12">
            <FormItem :label="$t('apiKey.quotaCheck')">
              <Select v-model="formData.unlimited_quota" style="width: 100%">
                <Option value="false">{{ $t("apiKey.yes") }}</Option>
                <Option value="true">{{ $t("apiKey.no") }}</Option>
              </Select>
            </FormItem>
          </Col>
        </Row>
        <Row :gutter="24">
          <Col span="12">
            <FormItem :label="$t('apiKey.allowedModels')">
              <el-select
                v-model="formData.models"
                style="width: 100%"
                multiple
                filterable
                size="small"
                :placeholder="$t('apiKey.selectModels')"
              >
                <el-option value="*" :label="$t('apiKey.allModels')" />
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
            <FormItem :label="$t('apiKey.allowedSubnet')" prop="subnet">
              <Input
                v-model="subnetInput"
                type="textarea"
                :rows="3"
                :placeholder="$t('apiKey.subnetPlaceholder')"
                @on-blur="validateSubnetRules"
              ></Input>
              <p class="form-tip">{{ $t("apiKey.subnetTip") }}</p>
            </FormItem>
          </Col>
        </Row>
        <Row :gutter="24">
          <Col span="12">
            <FormItem :label="$t('apiKey.mountedEntity')">
              <el-select
                v-model="formData.entity_id"
                style="width: 100%"
                filterable
                size="small"
                clearable
                :placeholder="$t('apiKey.selectEntity')"
              >
                <el-option
                  v-for="entity in entityList"
                  :key="entity.id"
                  :value="entity.id"
                  :label="entity.name + ' (' + entity.type + ')'"
                />
              </el-select>
            </FormItem>
          </Col>
        </Row>
      </Card>

      <Card :title="$t('apiKey.quotaInfo')" class="form-card">
        <Row :gutter="24">
          <Col span="12">
            <FormItem :label="$t('apiKey.unlimitedQuota')">
              <Select
                v-model="formData.quota_plan.unlimited"
                style="width: 100%"
              >
                <Option value="true">{{ $t("apiKey.yes") }}</Option>
                <Option value="false">{{ $t("apiKey.no") }}</Option>
              </Select>
            </FormItem>
          </Col>
        </Row>
        <div v-if="formData.quota_plan.unlimited !== 'true'">
          <Row :gutter="24">
            <Col span="12">
              <FormItem :label="$t('apiKey.passWhenNoQuota')">
                <Select
                  v-model="formData.quota_plan.pass_when_no_enough_quota"
                  style="width: 100%"
                >
                  <Option value="true">{{ $t("apiKey.yes") }}</Option>
                  <Option value="false">{{ $t("apiKey.no") }}</Option>
                </Select>
              </FormItem>
            </Col>
            <Col span="12">
              <FormItem
                :label="$t('apiKey.quotaTotal')"
                prop="quota_plan.quota"
              >
                <InputNumber
                  v-model="formData.quota_plan.quota"
                  :min="0"
                  :max="quotaInputMax"
                  :precision="quotaPrecision"
                  :step="quotaStep"
                  :formatter="isRMB ? null : formatNumberInput"
                  :parser="isRMB ? null : parseNumberInput"
                  style="width: 100%"
                  @on-change="validateQuotaField"
                  @on-blur="validateQuotaField"
                ></InputNumber>
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="24">
            <Col span="12">
              <FormItem :label="$t('apiKey.quotaUnit')">
                <Select v-model="formData.quota_plan.unit" style="width: 100%">
                  <Option value="total_token">total_token</Option>
                  <Option value="RMB">RMB</Option>
                </Select>
              </FormItem>
            </Col>
            <Col span="12">
              <FormItem :label="$t('apiKey.resetPeriod')">
                <Select
                  v-model="formData.quota_plan.reset_period"
                  style="width: 100%"
                >
                  <Option value="never">{{ $t("apiKey.resetNever") }}</Option>
                  <Option value="weekly">{{ $t("apiKey.resetWeekly") }}</Option>
                  <Option value="monthly">{{
                    $t("apiKey.resetMonthly")
                  }}</Option>
                </Select>
              </FormItem>
            </Col>
          </Row>
        </div>
      </Card>

      <Card :title="$t('apiKey.rateLimitConfig')" class="form-card">
        <Row :gutter="24">
          <Col span="12">
            <FormItem prop="rate_limit_policy.enabled">
              <span slot="label" class="rate-limit-label">
                {{ $t("apiKey.enableRateLimit") }}
                <Tooltip placement="top" transfer max-width="320">
                  <div slot="content" class="rate-limit-tip-content">
                    {{ $t("apiKey.enableRateLimitTip") }}
                  </div>
                  <Icon
                    type="ios-help-circle-outline"
                    class="rate-limit-help-icon"
                  />
                </Tooltip>
              </span>
              <Select
                v-model="formData.rate_limit_policy.enabled"
                style="width: 100%"
                @on-change="validateRateLimitEnabledField"
              >
                <Option value="true">{{ $t("apiKey.yes") }}</Option>
                <Option value="false">{{ $t("apiKey.no") }}</Option>
              </Select>
            </FormItem>
          </Col>
        </Row>

        <div v-if="formData.rate_limit_policy.enabled === 'true'">
          <div class="rules-section">
            <h4 class="rules-title">{{ $t("apiKey.tpmRules") }}</h4>
            <div
              v-for="(rule, index) in formData.rate_limit_policy.rules.tpm"
              :key="'tpm-' + index"
              class="rule-row"
            >
              <Row :gutter="16">
                <Col span="4">
                  <FormItem
                    :label="$t('apiKey.ruleName')"
                    :prop="'rate_limit_policy.rules.tpm.' + index + '.name'"
                    :rules="[
                      { required: true, validator: validateTpmRuleName },
                    ]"
                  >
                    <Input
                      v-model="rule.name"
                      :disabled="isRuleNameLocked(rule)"
                    ></Input>
                    <p v-if="!isRuleNameLocked(rule)" class="form-tip">
                      {{ $t('apiKey.ruleNameFormatTip') }}
                    </p>
                    <p v-else class="form-tip">{{ $t('apiKey.ruleNameReadonlyTip') }}</p>
                  </FormItem>
                </Col>
                <Col span="4">
                  <FormItem :label="$t('apiKey.applyModel')">
                    <el-select
                      v-model="rule.model"
                      style="width: 100%"
                      filterable
                      size="small"
                    >
                      <el-option value="*" :label="$t('apiKey.allModels')" />
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
                <Col span="3">
                  <FormItem
                    :label="$t('apiKey.timeWindow')"
                    :prop="
                      'rate_limit_policy.rules.tpm.' + index + '.window_minutes'
                    "
                    :rules="[{ validator: validateTpmWindowMinutes }]"
                  >
                    <InputNumber
                      v-model="rule.window_minutes"
                      :min="1"
                      :max="360"
                      :precision="0"
                      :formatter="formatNumberInput"
                      :parser="parseNumberInput"
                      style="width: 100%"
                      @on-change="onTpmWindowChange(index)"
                    ></InputNumber>
                  </FormItem>
                </Col>
                <Col span="4">
                  <FormItem
                    :label="$t('apiKey.maxTokens')"
                    :prop="
                      'rate_limit_policy.rules.tpm.' + index + '.max_tokens'
                    "
                    :rules="[{ validator: validateTpmMaxTokens }]"
                  >
                    <InputNumber
                      v-model="rule.max_tokens"
                      :min="0"
                      :max="INT64_MAX"
                      :precision="0"
                      :formatter="formatNumberInput"
                      :parser="parseNumberInput"
                      style="width: 100%"
                    ></InputNumber>
                  </FormItem>
                </Col>
                <Col span="3">
                  <FormItem
                    :label="$t('apiKey.stepMinutes')"
                    :prop="
                      'rate_limit_policy.rules.tpm.' + index + '.step_minutes'
                    "
                    :rules="[
                      { validator: validateTpmStepMinutes, trigger: 'change' },
                    ]"
                  >
                    <InputNumber
                      v-model="rule.step_minutes"
                      :min="1"
                      :max="rule.window_minutes"
                      :precision="0"
                      :formatter="formatNumberInput"
                      :parser="parseNumberInput"
                      style="width: 100%"
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
                      >{{ $t("com.del") }}</Button
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
              >{{ $t("apiKey.addRule") }}</Button
            >
          </div>

          <div class="rules-section">
            <h4 class="rules-title">{{ $t("apiKey.rpmRules") }}</h4>
            <div
              v-for="(rule, index) in formData.rate_limit_policy.rules.rpm"
              :key="'rpm-' + index"
              class="rule-row"
            >
              <Row :gutter="16">
                <Col span="6">
                  <FormItem
                    :label="$t('apiKey.ruleName')"
                    :prop="'rate_limit_policy.rules.rpm.' + index + '.name'"
                    :rules="[
                      { required: true, validator: validateRpmRuleName },
                    ]"
                  >
                    <Input
                      v-model="rule.name"
                      :disabled="isRuleNameLocked(rule)"
                    ></Input>
                    <p v-if="!isRuleNameLocked(rule)" class="form-tip">
                      {{ $t('apiKey.ruleNameFormatTip') }}
                    </p>
                    <p v-else class="form-tip">{{ $t('apiKey.ruleNameReadonlyTip') }}</p>
                  </FormItem>
                </Col>
                <Col span="5">
                  <FormItem :label="$t('apiKey.applyModel')">
                    <el-select
                      v-model="rule.model"
                      style="width: 100%"
                      size="small"
                      filterable
                    >
                      <el-option value="*" :label="$t('apiKey.allModels')" />
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
                    :label="$t('apiKey.timeWindow')"
                    :prop="
                      'rate_limit_policy.rules.rpm.' + index + '.window_minutes'
                    "
                    :rules="[{ validator: validateRpmWindowMinutes }]"
                  >
                    <InputNumber
                      v-model="rule.window_minutes"
                      :min="1"
                      :max="360"
                      :precision="0"
                      :formatter="formatNumberInput"
                      :parser="parseNumberInput"
                      style="width: 100%"
                    ></InputNumber>
                  </FormItem>
                </Col>
                <Col span="5">
                  <FormItem
                    :label="$t('apiKey.maxRequests')"
                    :prop="
                      'rate_limit_policy.rules.rpm.' + index + '.max_requests'
                    "
                    :rules="[{ validator: validateRpmMaxRequests }]"
                  >
                    <InputNumber
                      v-model="rule.max_requests"
                      :min="0"
                      :max="INT64_MAX"
                      :precision="0"
                      :formatter="formatNumberInput"
                      :parser="parseNumberInput"
                      style="width: 100%"
                    ></InputNumber>
                  </FormItem>
                </Col>
                <Col span="2">
                  <FormItem :label="$t('com.operation')">
                    <Button
                      type="error"
                      size="small"
                      @click="removeRpmRule(index)"
                      >{{ $t("com.del") }}</Button
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
              >{{ $t("apiKey.addRule") }}</Button
            >
          </div>

          <!-- 最大并发 -->
          <Row :gutter="24">
            <Col span="12">
              <FormItem :label="$t('apiKey.maxConcurrency')">
                <Select
                  v-model="maxConcurrencyMode"
                  style="width: 100%"
                  @on-change="onMaxConcurrencyModeChange"
                >
                  <Option value="unlimited">{{
                    $t("apiKey.maxConcurrencyUnlimited")
                  }}</Option>
                  <Option value="banned">{{
                    $t("apiKey.maxConcurrencyBanned")
                  }}</Option>
                  <Option value="limited">{{
                    $t("apiKey.maxConcurrencyLimited")
                  }}</Option>
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
                    style="width: 100%"
                    @on-change="onMaxConcurrencyValueChange"
                    @on-blur="validateMaxConcurrencyField"
                  ></InputNumber>
                </FormItem>
              </FormItem>
            </Col>
          </Row>

          <!-- 批量限流 -->
          <div class="rules-section">
            <h4 class="rules-title">{{ $t("apiKey.batchLimits") }}</h4>
            <Row :gutter="16">
              <Col
                v-for="field in batchLimitFields"
                :key="field.key"
                span="12"
              >
                <FormItem
                  :label="$t(field.labelKey)"
                  :prop="'rate_limit_policy.rules.batch_limits.' + field.key"
                  :rules="[{ validator: validateBatchLimit }]"
                >
                  <InputNumber
                    v-model="
                      formData.rate_limit_policy.rules.batch_limits[field.key]
                    "
                    :max="INT64_MAX"
                    :precision="0"
                    :formatter="formatNumberInput"
                    :parser="parseNumberInput"
                    style="width: 100%"
                  ></InputNumber>
                </FormItem>
              </Col>
            </Row>
            <p class="form-tip">{{ $t("apiKey.batchLimitsTip") }}</p>
          </div>
        </div>
      </Card>

      <FormItem class="com-btn-box drawer-footer">
        <Button @click="$emit('cancel')" class="btn-box-del">
          {{ $t("com.cancel") }}
        </Button>
        <Button type="primary" @click="handleSubmit('formData')">
          {{ $t("com.submit") }}
        </Button>
      </FormItem>
    </Form>
  </div>
</template>

<script>
import { cloneDeep } from "lodash";
import moment from "moment";
import { isCidr, isCidrEqual, isCidrContained, RateLimitRuleNameRegCheck, TOKEN_QUOTA_MAX, RMB_QUOTA_MAX } from "@/utils/const";
import { getModelGroupsFromServices } from "@/utils/model";

const INT64_MAX = 9223372036854775807;
const INT_MAX = 2147483647;
const DESCRIPTION_MAX_LENGTH = 512;
// 批量限流（batch_limits）维度：回显、校验、提交组装共用
const BATCH_LIMIT_FIELDS = [
  { key: "max_create_rpm", labelKey: "apiKey.batchMaxCreateRpm" },
  { key: "max_active_batches", labelKey: "apiKey.batchMaxActiveBatches" },
  { key: "max_file_bytes", labelKey: "apiKey.batchMaxFileBytes" },
  { key: "max_file_lines", labelKey: "apiKey.batchMaxFileLines" },
];

export default {
  props: {
    currentData: {
      type: Object,
      default() {
        return {};
      },
    },
    isAdd: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    const that = this;

    // Validate description
    const validateDescription = (rule, value, callback) => {
      if (!value || value.trim() === "") {
        callback(new Error(this.$t("apiForm.nameRequired")));
        return;
      }
      if (value.length > DESCRIPTION_MAX_LENGTH) {
        callback(new Error(this.$t("apiKey.descriptionLengthError")));
        return;
      }
      callback();
    };

    // Validate expired time (required when never expire is not checked)
    const validateExpiredTime = (rule, value, callback) => {
      if (!that.neverExpire) {
        if (!value) {
          callback(new Error(this.$t("apiKey.selectExpiredTime")));
          return;
        }
      }
      callback();
    };

    // Validate quota (required when quota_plan.unlimited=false)
    const validateQuota = (rule, value, callback) => {
      if (that.formData.quota_plan.unlimited === "false") {
        if (value === null || value === undefined || value === "") {
          callback(new Error(this.$t("apiKey.quotaRequired")));
          return;
        }
        if (Number.isNaN(Number(value)) || value < 0) {
          callback(new Error(this.$t("apiKey.quotaRangeError")));
          return;
        }
        const isRMB = that.formData.quota_plan.unit === 'RMB';
        if (!isRMB && !Number.isInteger(value)) {
          callback(new Error(this.$t("apiKey.quotaMustBeNonNegative")));
          return;
        }
        if (isRMB) {
          const decimals = (String(value).split('.')[1] || '').length;
          if (decimals > 4) {
            callback(new Error(this.$t("apiKey.quotaRmbPrecisionError") || 'RMB 配额最多保留 4 位小数'));
            return;
          }
        }
        if (that.isRMB && value > RMB_QUOTA_MAX) {
          callback(new Error(this.$t("apiKey.quotaRmbMaxError") || 'RMB 配额不能超过 9000 万元'));
          return;
        }
        if (!isRMB && value > TOKEN_QUOTA_MAX) {
          callback(new Error(this.$t("apiKey.quotaMaxError")));
          return;
        }
      }
      callback();
    };

    // Validate subnet CIDR format
    const validateSubnet = (rule, value, callback) => {
      const subnets = value || [];
      if (subnets.length === 0) {
        callback(new Error(this.$t("apiKey.subnetRequired")));
        return;
      }
      if (subnets.includes("*") && subnets.length > 1) {
        callback(new Error(this.$t("apiKey.subnetCidrConflict")));
        return;
      }
      for (let i = 0; i < subnets.length; i++) {
        const cidr = subnets[i];
        if (cidr === "*") continue;
        if (!isCidr(cidr)) {
          callback(
            new Error(
              this.$t("apiKey.subnetFormatError", { index: i + 1, cidr: cidr })
            )
          );
          return;
        }
        for (let j = 0; j < subnets.length; j++) {
          if (i === j) continue;
          const otherCidr = subnets[j];
          if (otherCidr === "*") continue;
          if (isCidrEqual(cidr, otherCidr)) {
            callback(
              new Error(this.$t("apiKey.subnetDuplicate", { cidr: cidr }))
            );
            return;
          }
          if (isCidrContained(cidr, otherCidr)) {
            callback(
              new Error(
                this.$t("apiKey.subnetContained", {
                  cidr: cidr,
                  parent: otherCidr,
                })
              )
            );
            return;
          }
          if (isCidrContained(otherCidr, cidr)) {
            callback(
              new Error(
                this.$t("apiKey.subnetContains", {
                  cidr: cidr,
                  child: otherCidr,
                })
              )
            );
            return;
          }
        }
      }
      callback();
    };

    // Validate rate limit policy (at least one rule required; no duplicate combinations)
    const validateRateLimitPolicy = (rule, value, callback) => {
      if (that.formData.rate_limit_policy.enabled === "true") {
        const tpm = that.formData.rate_limit_policy.rules.tpm || [];
        const rpm = that.formData.rate_limit_policy.rules.rpm || [];
        const maxConcurrency =
          that.formData.rate_limit_policy.rules.max_concurrency;
        const hasTpmRules = tpm.length > 0;
        const hasRpmRules = rpm.length > 0;
        const hasEffectiveMaxConcurrency =
          that.maxConcurrencyMode === "banned" ||
          (that.maxConcurrencyMode === "limited" &&
            Number.isInteger(maxConcurrency) &&
            maxConcurrency > 0);
        if (!hasTpmRules && !hasRpmRules && !hasEffectiveMaxConcurrency) {
          callback(new Error(this.$t("apiKey.rateLimitRuleRequired")));
          return;
        }

        const tpmKeys = tpm.map(
          (r) =>
            `${r.model || ""}|${r.window_minutes || 0}|${r.max_tokens || 0}|${
              r.step_minutes || 0
            }`
        );
        const uniqueTpmKeys = [...new Set(tpmKeys)];
        if (tpmKeys.length !== uniqueTpmKeys.length) {
          callback(new Error(this.$t("apiKey.tpmCombinationDuplicate")));
          return;
        }

        const rpmKeys = rpm.map(
          (r) =>
            `${r.model || ""}|${r.window_minutes || 0}|${r.max_requests || 0}`
        );
        const uniqueRpmKeys = [...new Set(rpmKeys)];
        if (rpmKeys.length !== uniqueRpmKeys.length) {
          callback(new Error(this.$t("apiKey.rpmCombinationDuplicate")));
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
      DESCRIPTION_MAX_LENGTH,
      batchLimitFields: BATCH_LIMIT_FIELDS,
      neverExpire: true,
      subnetInput: "*",
      formRenderKey: 0,
      unlimitedQuotaTop: "true",
      maxConcurrencyMode: "limited",
      formData: {
        description: "",
        enabled: "true",
        expired_time: null,
        unlimited_quota: "false",
        models: ["*"],
        subnet: ["*"],
        entity_id: null,
        quota_plan: {
          unlimited: "true",
          pass_when_no_enough_quota: "false",
          quota: 100000000,
          unit: "total_token",
          reset_period: "never",
        },
        rate_limit_policy: {
          enabled: "false",
          rules: {
            tpm: [],
            rpm: [],
            max_concurrency: 1,
            batch_limits: {
              max_create_rpm: null,
              max_active_batches: null,
              max_file_bytes: null,
              max_file_lines: null,
            },
          },
        },
      },
      options: {
        disabledDate(date) {
          return date && date.valueOf() < Date.now() - 86400000;
        },
      },
      entityList: [],
      modelServices: [],
      ruleValidate: {
        description: [
          {
            required: true,
            validator: validateDescription,
          },
        ],
        expired_time: [
          {
            validator: validateExpiredTime,
          },
        ],
        subnet: [
          {
            validator: validateSubnet,
            trigger: "blur",
          },
        ],
        "quota_plan.quota": [
          {
            validator: validateQuota,
            trigger: "change",
          },
        ],
        "rate_limit_policy.enabled": [
          {
            validator: validateRateLimitPolicy,
          },
        ],
      },
    };
  },
  computed: {
    modelGroups() {
      return getModelGroupsFromServices(this.modelServices);
    },
    descriptionLength() {
      return (this.formData.description || "").length;
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
    },
    maxConcurrencyCustomRules() {
      return [
        {
          validator: this.validateMaxConcurrency,
          trigger: "change",
        },
        {
          validator: this.validateMaxConcurrency,
          trigger: "blur",
        },
      ];
    },
  },
  watch: {
    "formData.description"() {
      this.validateDescriptionField();
    },
    currentData: {
      handler(data) {
        if (!this.isAdd && data && data.id) {
          this.initFormData(data);
        }
      },
      deep: true,
      immediate: true,
    },
    subnetInput(newVal) {
      // Parse multi-line input to array, ignore empty lines
      if (newVal) {
        const subnets = newVal
          .split("\n")
          .map((item) => item.trim())
          .filter((item) => item !== "");
        this.formData.subnet = subnets.length > 0 ? subnets : ["*"];
      } else {
        this.formData.subnet = ["*"];
      }
    },
    "formData.models": {
      handler(val) {
        if (!val || val.length === 0) return;
        const hasStar = val.includes("*");
        const hasOthers = val.length > 1;
        if (hasStar && hasOthers) {
          const lastIndex = val.length - 1;
          if (val[lastIndex] === "*") {
            this.formData.models = ["*"];
          } else {
            this.formData.models = val.filter((v) => v !== "*");
          }
        }
      },
      deep: true,
    },
  },
  mounted() {
    this.fetchEntityList();
    this.fetchModelServices();
  },
  methods: {
    formatNumberInput(value) {
      if (value === null || value === undefined || value === "") {
        return "";
      }
      return Number(value).toLocaleString();
    },
    parseNumberInput(value) {
      return String(value).replace(/,/g, "");
    },
    normalizeSelectBool(value, defaultValue = true) {
      if (value === true || value === "true") return "true";
      if (value === false || value === "false") return "false";
      return defaultValue ? "true" : "false";
    },
    initFormData(data) {
      this.formData = cloneDeep(data);

      // Convert top-level boolean values to strings (must be done before Select renders)
      this.formData.enabled = this.normalizeSelectBool(
        this.formData.enabled !== undefined
          ? this.formData.enabled
          : this.formData.enabled,
        true
      );
      this.formData.unlimited_quota = this.normalizeSelectBool(
        this.formData.unlimited_quota,
        false
      );
      this.formRenderKey += 1;

      // Handle expired time
      if (data.expired_time === -1 || data.expired_time === null) {
        this.neverExpire = true;
        this.formData.expired_time = null; // DatePicker requires null instead of -1
      } else {
        this.neverExpire = false;
        this.formData.expired_time = moment
          .unix(data.expired_time)
          .format("YYYY-MM-DD HH:mm:ss");
      }

      // Handle subnet: convert array to multi-line text
      if (data.subnet && data.subnet.length > 0) {
        this.subnetInput = data.subnet.join("\n");
      } else {
        this.subnetInput = "*";
      }

      // Ensure quota_plan exists and convert boolean values to strings
      if (!this.formData.quota_plan) {
        this.formData.quota_plan = {
          unlimited: "true",
          pass_when_no_enough_quota: "false",
          quota: 100000000,
          unit: "total_token",
          reset_period: "never",
        };
      } else {
        this.formData.quota_plan.unlimited = this.normalizeSelectBool(
          this.formData.quota_plan.unlimited,
          true
        );
        this.formData.quota_plan.pass_when_no_enough_quota =
          this.normalizeSelectBool(
            this.formData.quota_plan.pass_when_no_enough_quota,
            false
          );
      }

      // Ensure rate_limit_policy exists and convert boolean values to strings
      if (!this.formData.rate_limit_policy) {
        this.formData.rate_limit_policy = {
          enabled: "false",
          rules: {
            tpm: [],
            rpm: [],
            max_concurrency: -1,
          },
        };
      } else {
        this.formData.rate_limit_policy.enabled = this.normalizeSelectBool(
          this.formData.rate_limit_policy.enabled,
          false
        );
      }
      if (!this.formData.rate_limit_policy.rules) {
        this.formData.rate_limit_policy.rules = {
          tpm: [],
          rpm: [],
          max_concurrency: -1,
        };
      }
      this.formData.rate_limit_policy.rules.tpm = this.normalizeRateLimitRules(
        this.formData.rate_limit_policy.rules.tpm,
        "tpm"
      );
      this.formData.rate_limit_policy.rules.rpm = this.normalizeRateLimitRules(
        this.formData.rate_limit_policy.rules.rpm,
        "rpm"
      );
      this.formData.rate_limit_policy.rules.batch_limits =
        this.normalizeBatchLimits(
          this.formData.rate_limit_policy.rules.batch_limits
        );

      this.syncMaxConcurrencyMode();

      // Ensure models and subnet exist
      if (!this.formData.models || this.formData.models.length === 0) {
        this.formData.models = ["*"];
      }
      if (!this.formData.subnet || this.formData.subnet.length === 0) {
        this.formData.subnet = ["*"];
      }

      if (this.modelServices.length > 0) {
        this.normalizeModelsField();
      }

      this.validateDescriptionField();
    },

    fetchEntityList() {
      this.$request({
        url: this.$urlFormat("entities"),
        method: "get",
        openapi: true,
      })
        .then((data) => {
          if (data.status === 200) {
            const result = data.data.Data || {};
            this.entityList = Array.isArray(result.list) ? result.list : (Array.isArray(result) ? result : []);
          }
        })
        .catch(() => {
          // Use empty array if API fails
          this.entityList = [];
        });
    },

    fetchModelServices() {
      this.$request({
        url: "clusters",
        method: "get",
        openapi: true,
      })
        .then((data) => {
          if (data.status === 200) {
            const clusters = data.data.Data || [];
            this.modelServices = clusters
              .filter(
                (cluster) =>
                  cluster.llm_config &&
                  cluster.llm_config.models &&
                  cluster.llm_config.models.length > 0
              )
              .map((cluster) => ({
                cluster_name: cluster.name,
                models: cluster.llm_config.models,
              }));
            // After model list loads, if in edit mode, reformat model fields to ensure proper display
            if (!this.isAdd && this.formData && this.formData.id) {
              this.normalizeModelsField();
            }
          }
        })
        .catch(() => {
          this.modelServices = [];
        });
    },
    normalizeModelsField() {
      if (this.formData.models && this.formData.models.length > 0) {
        const models = [...this.formData.models];
        if (models.includes("*")) {
          this.formData.models = ["*"];
        } else {
          this.formData.models = models;
        }
      }
    },

    addTpmRule() {
      if (this.formData.rate_limit_policy.rules.tpm.length >= 3) {
        this.$Message.warning(this.$t("apiKey.maxRulesTip"));
        return;
      }
      this.formData.rate_limit_policy.rules.tpm.push({
        name: "",
        model: "*",
        window_minutes: 1,
        max_tokens: 10000,
        step_minutes: 1,
        _nameLocked: false,
      });
      this.validateRateLimitEnabledField();
    },

    removeTpmRule(index) {
      this.formData.rate_limit_policy.rules.tpm.splice(index, 1);
      this.validateRateLimitEnabledField();
    },

    addRpmRule() {
      if (this.formData.rate_limit_policy.rules.rpm.length >= 3) {
        this.$Message.warning(this.$t("apiKey.maxRulesTip"));
        return;
      }
      this.formData.rate_limit_policy.rules.rpm.push({
        name: "",
        model: "*",
        window_minutes: 1,
        max_requests: 100,
        _nameLocked: false,
      });
      this.validateRateLimitEnabledField();
    },

    removeRpmRule(index) {
      this.formData.rate_limit_policy.rules.rpm.splice(index, 1);
      this.validateRateLimitEnabledField();
    },

    validateMaxConcurrencyField() {
      this.$nextTick(() => {
        if (!this.$refs.formData) return;
        this.$refs.formData.validateField(
          "rate_limit_policy.rules.max_concurrency"
        );
        this.validateRateLimitEnabledField();
      });
    },

    validateRateLimitEnabledField() {
      this.$nextTick(() => {
        if (!this.$refs.formData) return;
        this.$refs.formData.validateField("rate_limit_policy.enabled");
      });
    },

    syncMaxConcurrencyMode() {
      const maxConcurrency =
        this.formData.rate_limit_policy.rules.max_concurrency;
      if (maxConcurrency === 0) {
        this.maxConcurrencyMode = "banned";
        return;
      }
      if (Number.isFinite(maxConcurrency) && maxConcurrency > 0) {
        this.maxConcurrencyMode = "limited";
        return;
      }
      this.maxConcurrencyMode = "unlimited";
      this.formData.rate_limit_policy.rules.max_concurrency = -1;
    },

    onMaxConcurrencyModeChange(mode) {
      if (mode === "banned") {
        this.formData.rate_limit_policy.rules.max_concurrency = 0;
      } else if (mode === "limited") {
        const current = this.formData.rate_limit_policy.rules.max_concurrency;
        if (!Number.isFinite(current) || current <= 0) {
          this.formData.rate_limit_policy.rules.max_concurrency = 1;
        }
      } else {
        this.formData.rate_limit_policy.rules.max_concurrency = -1;
      }
      if (mode === "limited") {
        this.validateMaxConcurrencyField();
      } else {
        this.validateRateLimitEnabledField();
      }
    },

    onMaxConcurrencyValueChange(value) {
      if (this.maxConcurrencyMode !== "limited") {
        return;
      }
      if (value === null || value === undefined || value === "") {
        this.formData.rate_limit_policy.rules.max_concurrency = null;
      }
      this.validateMaxConcurrencyField();
    },

    validateMaxConcurrency(rule, value, callback) {
      if (this.formData.rate_limit_policy.enabled === "false") {
        callback();
        return;
      }
      if (this.maxConcurrencyMode === "unlimited") {
        callback();
        return;
      }
      if (this.maxConcurrencyMode === "banned") {
        if (this.formData.rate_limit_policy.rules.max_concurrency !== 0) {
          callback(new Error(this.$t("apiKey.maxConcurrencyBannedError")));
          return;
        }
        callback();
        return;
      }

      if (this.maxConcurrencyMode === "limited") {
        const currentValue =
          this.formData.rate_limit_policy.rules.max_concurrency;
        if (
          currentValue === null ||
          currentValue === undefined ||
          currentValue === ""
        ) {
          callback(new Error(this.$t("apiKey.maxConcurrencyLimitedRequired")));
          return;
        }
        if (!Number.isInteger(currentValue)) {
          callback(new Error(this.$t("apiKey.maxConcurrencyLimitedInvalid")));
          return;
        }
        if (currentValue <= 0) {
          callback(new Error(this.$t("apiKey.maxConcurrencyLimitedInvalid")));
          return;
        }
        if (currentValue > INT_MAX) {
          callback(new Error(this.$t("apiKey.maxConcurrencyMaxError")));
          return;
        }
        callback();
        return;
      }

      callback();
    },

    getRuleFieldIndex(field, ruleType) {
      const fieldPath = field || "";
      const parts = fieldPath.split(".");
      const typeIndex = parts.indexOf(ruleType);
      if (typeIndex === -1 || typeIndex + 1 >= parts.length) return 0;
      const index = parseInt(parts[typeIndex + 1], 10);
      return Number.isNaN(index) ? 0 : index;
    },

    getRuleFieldPath(rule) {
      return rule.fullField || rule.field || "";
    },

    onTpmWindowChange(index) {
      this.$nextTick(() => {
        if (!this.$refs.formData) return;
        this.$refs.formData.validateField(
          `rate_limit_policy.rules.tpm.${index}.step_minutes`
        );
      });
    },

    validateTpmStepMinutesField(index) {
      this.$nextTick(() => {
        if (!this.$refs.formData) return;
        this.$refs.formData.validateField(
          `rate_limit_policy.rules.tpm.${index}.step_minutes`
        );
      });
    },

    validateTpmWindowMinutes(rule, value, callback) {
      if (this.formData.rate_limit_policy.enabled === "false") {
        callback();
        return;
      }
      const index =
        this.getRuleFieldIndex(this.getRuleFieldPath(rule), "tpm") + 1;
      if (value === null || value === undefined || value === "") {
        callback(new Error(this.$t("apiKey.windowMinutesRequired", { index })));
        return;
      }
      if (!Number.isFinite(value) || value < 1 || value > 360) {
        callback(new Error(this.$t("apiKey.windowMinutesInvalid", { index })));
        return;
      }
      callback();
    },

    validateTpmMaxTokens(rule, value, callback) {
      if (this.formData.rate_limit_policy.enabled === "false") {
        callback();
        return;
      }
      const index =
        this.getRuleFieldIndex(this.getRuleFieldPath(rule), "tpm") + 1;
      if (value === null || value === undefined || value === "") {
        callback(new Error(this.$t("apiKey.maxTokensRequired", { index })));
        return;
      }
      if (!Number.isFinite(value) || value < 0) {
        callback(new Error(this.$t("apiKey.maxTokensInvalid", { index })));
        return;
      }
      if (value > INT64_MAX) {
        callback(new Error(this.$t("apiKey.maxTokensMaxError", { index })));
        return;
      }
      callback();
    },

    validateTpmStepMinutes(rule, value, callback) {
      if (this.formData.rate_limit_policy.enabled === "false") {
        callback();
        return;
      }
      const ruleIndex = this.getRuleFieldIndex(
        this.getRuleFieldPath(rule),
        "tpm"
      );
      const index = ruleIndex + 1;
      const tpmRules = this.formData.rate_limit_policy.rules.tpm || [];
      const tpmRule = tpmRules[ruleIndex];
      const windowMinutes = tpmRule ? tpmRule.window_minutes : undefined;
      if (value === null || value === undefined || value === "") {
        callback(new Error(this.$t("apiKey.stepMinutesRequired", { index })));
        return;
      }
      if (!Number.isFinite(value) || value < 1 || value > 360) {
        callback(new Error(this.$t("apiKey.stepMinutesRange", { index })));
        return;
      }
      if (Number.isFinite(windowMinutes) && value > windowMinutes) {
        callback(new Error(this.$t("apiKey.stepMinutesInvalid", { index })));
        return;
      }
      callback();
    },

    validateRpmWindowMinutes(rule, value, callback) {
      if (this.formData.rate_limit_policy.enabled === "false") {
        callback();
        return;
      }
      const index =
        this.getRuleFieldIndex(this.getRuleFieldPath(rule), "rpm") + 1;
      if (value === null || value === undefined || value === "") {
        callback(new Error(this.$t("apiKey.windowMinutesRequired", { index })));
        return;
      }
      if (!Number.isFinite(value) || value < 1 || value > 360) {
        callback(new Error(this.$t("apiKey.windowMinutesInvalid", { index })));
        return;
      }
      callback();
    },

    validateRpmMaxRequests(rule, value, callback) {
      if (this.formData.rate_limit_policy.enabled === "false") {
        callback();
        return;
      }
      const index =
        this.getRuleFieldIndex(this.getRuleFieldPath(rule), "rpm") + 1;
      if (value === null || value === undefined || value === "") {
        callback(new Error(this.$t("apiKey.maxRequestsRequired", { index })));
        return;
      }
      if (!Number.isFinite(value) || value < 0) {
        callback(new Error(this.$t("apiKey.maxRequestsInvalid", { index })));
        return;
      }
      if (value > INT64_MAX) {
        callback(new Error(this.$t("apiKey.maxRequestsMaxError", { index })));
        return;
      }
      callback();
    },

    normalizeRateLimitRules(rules, type) {
      return (rules || []).map((rule) => {
        const normalized = {
          name: rule.name || "",
          model: rule.model || "*",
          window_minutes:
            rule.window_minutes != null ? Number(rule.window_minutes) : 1,
          _nameLocked:
            !this.isAdd && !!(rule.name && String(rule.name).trim()),
        };
        if (type === "tpm") {
          normalized.max_tokens =
            rule.max_tokens != null ? Number(rule.max_tokens) : 10000;
          normalized.step_minutes =
            rule.step_minutes != null ? Number(rule.step_minutes) : 1;
        } else {
          normalized.max_requests =
            rule.max_requests != null ? Number(rule.max_requests) : 100;
        }
        return normalized;
      });
    },
    isRuleNameLocked(rule) {
      return !!(rule && rule._nameLocked);
    },
    stripRateLimitRuleMeta(rules) {
      return (rules || []).map((rule) => {
        const next = { ...rule };
        delete next._nameLocked;
        return next;
      });
    },
    // 批量限流：缺失/为空/非正数一律回显为空
    normalizeBatchLimits(batchLimits) {
      const src = batchLimits || {};
      const result = {};
      BATCH_LIMIT_FIELDS.forEach((f) => {
        const value = src[f.key];
        result[f.key] =
          value !== undefined &&
          value !== null &&
          value !== "" &&
          Number(value) > 0
            ? Number(value)
            : null;
      });
      return result;
    },
    // 批量限流校验：负数报「X不能为负数」；留空或 0 视为不配此维度，放行
    validateBatchLimit(rule, value, callback) {
      if (value === "" || value === null || value === undefined) {
        callback();
        return;
      }
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0) {
        const fieldKey = String((rule && rule.field) || "").split(".").pop();
        const meta = BATCH_LIMIT_FIELDS.find((f) => f.key === fieldKey);
        callback(
          new Error(
            this.$t("apiKey.batchLimitNegativeError", {
              label: meta ? this.$t(meta.labelKey) : fieldKey,
            })
          )
        );
        return;
      }
      callback();
    },
    // 批量限流提交组装：留空或 ≤0 的维度不提交；全部未配置时返回 null（省略整个 batch_limits）
    collectBatchLimits(batchLimits) {
      const result = {};
      BATCH_LIMIT_FIELDS.forEach((f) => {
        const raw = batchLimits ? batchLimits[f.key] : null;
        if (raw === "" || raw === null || raw === undefined) {
          return;
        }
        const num = Number(raw);
        if (!Number.isFinite(num) || num <= 0) {
          return;
        }
        result[f.key] = num;
      });
      return Object.keys(result).length > 0 ? result : null;
    },
    validateTpmRuleName(rule, value, callback) {
      if (this.formData.rate_limit_policy.enabled === "false") {
        callback();
        return;
      }
      const trimmed = String(value || "").trim();
      if (trimmed === "") {
        const index =
          this.getRuleFieldIndex(this.getRuleFieldPath(rule), "tpm") + 1;
        callback(new Error(this.$t("apiKey.ruleNameRequired", { index })));
        return;
      }
      if (trimmed.length < 1 || trimmed.length > 128) {
        callback(new Error(this.$t("apiKey.ruleNameLengthError")));
        return;
      }
      if (!RateLimitRuleNameRegCheck(trimmed)) {
        callback(new Error(this.$t("apiKey.ruleNameFormatError")));
        return;
      }
      const tpm = this.formData.rate_limit_policy.rules.tpm || [];
      const count = tpm.filter((r) => r.name === trimmed).length;
      if (count > 1) {
        callback(
          new Error(this.$t("apiKey.ruleNameDuplicate", { name: trimmed }))
        );
        return;
      }
      callback();
    },

    validateRpmRuleName(rule, value, callback) {
      if (this.formData.rate_limit_policy.enabled === "false") {
        callback();
        return;
      }
      const trimmed = String(value || "").trim();
      if (trimmed === "") {
        const index =
          this.getRuleFieldIndex(this.getRuleFieldPath(rule), "rpm") + 1;
        callback(new Error(this.$t("apiKey.ruleNameRequired", { index })));
        return;
      }
      if (trimmed.length < 1 || trimmed.length > 128) {
        callback(new Error(this.$t("apiKey.ruleNameLengthError")));
        return;
      }
      if (!RateLimitRuleNameRegCheck(trimmed)) {
        callback(new Error(this.$t("apiKey.ruleNameFormatError")));
        return;
      }
      const rpm = this.formData.rate_limit_policy.rules.rpm || [];
      const count = rpm.filter((r) => r.name === trimmed).length;
      if (count > 1) {
        callback(
          new Error(this.$t("apiKey.ruleNameDuplicate", { name: trimmed }))
        );
        return;
      }
      callback();
    },

    validateDescriptionField() {
      this.$nextTick(() => {
        if (this.$refs.formData) {
          this.$refs.formData.validateField("description");
        }
      });
    },

    validateSubnetRules() {
      // Trigger form validation for subnet field
      if (this.$refs.formData) {
        this.$refs.formData.validateField("subnet");
      }
    },

    validateQuotaField() {
      this.$nextTick(() => {
        if (this.$refs.formData) {
          this.$refs.formData.validateField("quota_plan.quota");
        }
      });
    },

    isLimitedQuotaInvalid(value) {
      if (this.formData.quota_plan.unlimited !== "false") {
        return false;
      }
      if (value === null || value === undefined || value === "") {
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
      this.$nextTick(() => {
        const form = this.$refs[name];
        form.validate((valid) => {
          if (this.formData.quota_plan.unlimited === "false") {
            form.validateField("quota_plan.quota");
          }
          if (!valid || this.isLimitedQuotaInvalid(this.formData.quota_plan.quota)) {
            this.$Message.error(this.$t("com.tipValidateError"));
            return;
          }
          const submitData = cloneDeep(this.formData);

            // Handle expired time
            if (this.neverExpire) {
              submitData.expired_time = -1;
            } else if (submitData.expired_time) {
              // DatePicker may return Date object or ISO string, convert to Unix timestamp
              submitData.expired_time = Math.floor(
                new Date(submitData.expired_time).getTime() / 1000
              );
            }

            // Convert string boolean values to actual boolean values
            submitData.enabled = submitData.enabled === "true";
            submitData.unlimited_quota = submitData.unlimited_quota === "true";
            submitData.quota_plan.unlimited =
              submitData.quota_plan.unlimited === "true";
            submitData.quota_plan.pass_when_no_enough_quota =
              submitData.quota_plan.pass_when_no_enough_quota === "true";
            if (!submitData.quota_plan.unlimited) {
              // RMB 模式保留 4 位小数，total_token 模式截断为整数
              if (submitData.quota_plan.unit !== 'RMB') {
                submitData.quota_plan.quota = Math.trunc(
                  submitData.quota_plan.quota
                );
              }
            }
            submitData.rate_limit_policy.enabled =
              submitData.rate_limit_policy.enabled === "true";

            // If rate limit policy is disabled, clear rules but keep structure
            if (!submitData.rate_limit_policy.enabled) {
              submitData.rate_limit_policy.rules = {
                tpm: [],
                rpm: [],
                max_concurrency: -1,
              };
            } else {
              submitData.rate_limit_policy.rules.tpm = this.stripRateLimitRuleMeta(
                submitData.rate_limit_policy.rules.tpm
              );
              submitData.rate_limit_policy.rules.rpm = this.stripRateLimitRuleMeta(
                submitData.rate_limit_policy.rules.rpm
              );
              // 批量限流：留空或 ≤0 不提交，全部未配置时省略 batch_limits
              const batchLimits = this.collectBatchLimits(
                submitData.rate_limit_policy.rules.batch_limits
              );
              if (batchLimits) {
                submitData.rate_limit_policy.rules.batch_limits = batchLimits;
              } else {
                delete submitData.rate_limit_policy.rules.batch_limits;
              }
            }

            this.$emit("submit", submitData);
        });
      });
    },
  },
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

.form-tip-error {
  color: #ed4014;
}

.btn-box-del {
  margin-right: 8px;
}

.com-btn-box {
  text-align: right;
  padding-top: 16px;
}
</style>
