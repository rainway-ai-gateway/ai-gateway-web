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
    <Card :title="$t('apiKey.basicInfo')" class="form-card">
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.description') }}</span>
        <span class="info-value">{{ displayData.description || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.keyId') }}</span>
        <span class="info-value">{{ displayData.id || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.keyValue') }}</span>
        <span class="info-value">
          {{ displayData.key || '-' }}
          <Button
            v-if="displayData.key"
            size="small"
            @click="copyKey"
            icon="md-copy"
            style="margin-left: 8px;"
            >{{ $t('com.copy') }}</Button
          >
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.status') }}</span>
        <Tag :color="isTrue(displayData.enabled) ? 'success' : 'default'">
          {{ isTrue(displayData.enabled) ? $t('apiKey.enabled') : $t('apiKey.notEnabled') }}
        </Tag>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.expiredTime') }}</span>
        <span class="info-value">{{ expiredTimeText }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.quotaCheck') }}</span>
        <Tag
          :color="isTrue(displayData.unlimited_quota) ? 'default' : 'success'"
        >
          {{ isTrue(displayData.unlimited_quota) ? $t('apiKey.no') : $t('apiKey.yes') }}
        </Tag>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.allowedModels') }}</span>
        <span class="info-value">{{ modelsText }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.allowedSubnet') }}</span>
        <span class="info-value">{{ subnetText }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.mountedEntity') }}</span>
        <span class="info-value">{{ entityText }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.createTime') }}</span>
        <span
          class="info-value"
          >{{ formatTime(displayData.create_time) }}</span
        >
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.updateTime') }}</span>
        <span
          class="info-value"
          >{{ formatTime(displayData.update_time) }}</span
        >
      </div>
    </Card>

    <Card :title="$t('apiKey.quotaInfo')" class="form-card">
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.quotaType') }}</span>
        <span
          class="info-value"
          >{{ quotaPlanUnlimited ? $t('apiKey.unlimitedQuotaText') : $t('apiKey.limitedQuotaText') }}</span
        >
      </div>
      <div v-if="!quotaPlanUnlimited">
        <div class="info-row">
          <span class="info-label">{{ $t('apiKey.quotaTotal') }}</span>
          <span
            class="info-value"
            >{{ isRMB ? '¥' + formatNumber(quotaPlanQuota) : formatNumber(quotaPlanQuota) + ' tokens' }}</span
          >
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('apiKey.used') }}</span>
          <span class="info-value"
            >{{ isRMB ? '¥' + formatNumber(quotaPlanUsed) : formatNumber(quotaPlanUsed) + ' tokens' }}
            ({{ quotaPercent










            }}%)</span
          >
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('apiKey.remaining') }}</span>
          <span
            class="info-value"
            >{{ isRMB ? '¥' + formatNumber(quotaPlanRemaining) : formatNumber(quotaPlanRemaining) + ' tokens' }}</span
          >
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('apiKey.resetPeriod') }}</span>
          <span
            class="info-value"
            >{{ getResetPeriodText(quotaPlanResetPeriod) }}</span
          >
        </div>
        <div class="quota-progress">
          <div class="progress-label">{{ $t('apiKey.usageProgress') }}</div>
          <Progress :percent="quotaPercent" :stroke-width="8" />
        </div>
        <div style="margin-top: 16px;">
          <Button
            type="primary"
            size="small"
            @click="showResetModal"
            icon="md-refresh"
            >{{ $t('apiKey.resetQuota') }}</Button
          >
        </div>
      </div>
    </Card>

    <Card :title="$t('apiKey.rateLimitConfig')" class="form-card">
      <div class="info-row">
        <span class="info-label">{{ $t('apiKey.rateLimitStatus') }}</span>
        <Tag :color="rateLimitPolicyEnabled ? 'success' : 'default'">
          {{ rateLimitPolicyEnabled ? $t('apiKey.enabled') : $t('apiKey.notEnabled') }}
        </Tag>
      </div>
      <div v-if="rateLimitPolicyEnabled" class="info-row">
        <span class="info-label">{{ $t('apiKey.maxConcurrency') }}</span>
        <span
          class="info-value"
          >{{ formatMaxConcurrency(rateLimitMaxConcurrency) }}</span
        >
      </div>

      <div
        v-if="rateLimitPolicyEnabled && tpmRulesLength > 0"
        class="rules-detail"
      >
        <div class="rules-detail-title">
          {{ $t('apiKey.tpmRules') }} ({{ tpmRulesLength }}{{ $t('com.item') }})
        </div>
        <div
          v-for="(rule, index) in tpmRules"
          :key="index"
          class="rule-detail-item"
        >
          <div>{{ $t('apiKey.ruleName') }}：{{ rule.name }}</div>
          <div>
            {{ $t('apiKey.applyModel')










            }}：{{ rule.model === '*' ? $t('apiKey.allModelsText') : rule.model }}
          </div>
          <div>
            {{ $t('apiKey.timeWindow') }}：{{ rule.window_minutes










            }}{{ $t('com.minute') }}
          </div>
          <div>{{ $t('apiKey.maxTokens') }}：{{ rule.max_tokens }}</div>
          <div>
            {{ $t('apiKey.stepMinutes') }}：{{ rule.step_minutes










            }}{{ $t('com.minute') }}
          </div>
        </div>
      </div>

      <div
        v-if="rateLimitPolicyEnabled && rpmRulesLength > 0"
        class="rules-detail"
      >
        <div class="rules-detail-title">
          {{ $t('apiKey.rpmRules') }} ({{ rpmRulesLength }}{{ $t('com.item') }})
        </div>
        <div
          v-for="(rule, index) in rpmRules"
          :key="index"
          class="rule-detail-item"
        >
          <div>{{ $t('apiKey.ruleName') }}：{{ rule.name }}</div>
          <div>
            {{ $t('apiKey.applyModel')










            }}：{{ rule.model === '*' ? $t('apiKey.allModelsText') : rule.model }}
          </div>
          <div>
            {{ $t('apiKey.timeWindow') }}：{{ rule.window_minutes










            }}{{ $t('com.minute') }}
          </div>
          <div>{{ $t('apiKey.maxRequests') }}：{{ rule.max_requests }}</div>
        </div>
      </div>

      <div v-if="rateLimitPolicyEnabled" class="rules-detail">
        <div class="rules-detail-title">
          {{ $t('apiKey.batchLimits')
          }}<template v-if="batchLimitLines.length > 0"
            > ({{ batchLimitLines.length }}{{ $t('com.item') }})</template
          >
        </div>
        <div class="rule-detail-item">
          <template v-if="batchLimitLines.length > 0">
            <div v-for="(line, index) in batchLimitLines" :key="index">
              {{ line }}
            </div>
          </template>
          <div v-else>-</div>
        </div>
      </div>
    </Card>

    <div class="com-btn-box drawer-footer">
      <Button @click="$emit('cancel')">{{ $t('apiKey.close') }}</Button>
    </div>

    <Modal
      v-model="resetModalVisible"
      :title="$t('apiKey.resetQuota')"
      class="reset-quota-modal"
      @on-cancel="resetModalVisible = false"
    >
      <div class="modal-form-item">
        <div class="modal-label">{{ $t('apiKey.newQuotaTotal') }}</div>
        <InputNumber
          v-model="newQuota"
          :min="0"
          :max="quotaInputMax"
          :precision="isRMB ? 4 : 0"
          :step="isRMB ? 0.0001 : 1"
          style="width: 100%;"
        ></InputNumber>
      </div>
      <p class="form-tip">{{ $t('apiKey.resetQuotaTip') }}</p>
      <div class="modal-form-item" style="margin-top: 16px;">
        <div class="modal-label">{{ $t('apiKey.resetReason') }}</div>
        <Input
          v-model="resetReason"
          type="textarea"
          :rows="3"
          :placeholder="$t('apiKey.resetReasonPlaceholder')"
        ></Input>
      </div>
      <div slot="footer">
        <Button
          @click="resetModalVisible = false"
          >{{ $t('com.cancel') }}</Button
        >
        <Button
          type="primary"
          @click="confirmResetQuota"
          >{{ $t('com.confirm') }}</Button
        >
      </div>
    </Modal>
  </div>
</template>

<script>
import { TOKEN_QUOTA_MAX, RMB_QUOTA_MAX } from '@/utils/const';

// 批量限流（batch_limits）维度：只读展示共用
const BATCH_LIMIT_FIELDS = [
  { key: 'max_create_rpm', labelKey: 'apiKey.batchMaxCreateRpm' },
  { key: 'max_active_batches', labelKey: 'apiKey.batchMaxActiveBatches' },
  { key: 'max_file_bytes', labelKey: 'apiKey.batchMaxFileBytes' },
  { key: 'max_file_lines', labelKey: 'apiKey.batchMaxFileLines' }
];

export default {
    props: {
      currentData: {
            type: Object,
            default() {
                return {};
            }
        }
    },
    data() {
        return {
            TOKEN_QUOTA_MAX,
            RMB_QUOTA_MAX,
            resetModalVisible: false,
            newQuota: 0,
            resetReason: '',
            detailData: {},
            loading: false
        };
    },
    mounted() {
        this.fetchDetail();
    },
    watch: {
        currentData: {
            handler(newVal) {
                if (newVal && newVal.id) {
                    this.fetchDetail();
                }
            },
            deep: true
        }
    },
    computed: {
        displayData() {
            return Object.keys(this.detailData).length > 0 ? this.detailData : this.currentData;
        },
        expiredTimeText() {
            const expiredTime = this.displayData.expired_time;
            if (expiredTime === -1 || expiredTime === null || expiredTime === undefined) return this.$t('apiKey.neverExpire');
            return this.formatTime(expiredTime);
        },
        modelsText() {
            const models = this.displayData.models || [];
            return models.indexOf('*') >= 0 ? this.$t('apiKey.allModelsText') : (models.join(', ') || '-');
        },
        subnetText() {
            const subnets = this.displayData.subnet || [];
            return subnets.indexOf('*') >= 0 ? this.$t('apiKey.unlimitedTip') : (subnets.join(', ') || '-');
        },
        entityText() {
            const entity = this.displayData.entity;
            if (entity && entity.name) return `${entity.name} (${entity.type || '-'})`;
            return '-';
        },
        quotaPlanUnlimited() {
            const quotaPlan = this.displayData.quota_plan;
            if (quotaPlan && quotaPlan.unlimited !== undefined && quotaPlan.unlimited !== null) {
                return this.isTrue(quotaPlan.unlimited);
            }
            return this.isTrue(this.displayData.unlimited_quota);
        },
        quotaPlanUnit() {
            return this.displayData.quota_plan && this.displayData.quota_plan.unit
                ? this.displayData.quota_plan.unit
                : 'total_token';
        },
        isRMB() {
            return this.quotaPlanUnit === 'RMB';
        },
        quotaInputMax() {
            return this.isRMB ? RMB_QUOTA_MAX : TOKEN_QUOTA_MAX;
        },
        quotaPlanQuota() {
            return this.displayData.quota_plan ? this.displayData.quota_plan.quota || 0 : 0;
        },
        quotaPlanUsed() {
            if (!this.displayData.quota_plan || !this.displayData.quota_plan.balance) {
                return 0;
            }
            return this.displayData.quota_plan.balance.used || 0;
        },
        quotaPlanRemaining() {
            return Math.max(0, this.quotaPlanQuota - this.quotaPlanUsed);
        },
        quotaPlanResetPeriod() {
            return this.displayData.quota_plan ? this.displayData.quota_plan.reset_period : 'never';
        },
        quotaPercent() {
            if (this.quotaPlanUnlimited || this.quotaPlanQuota === 0) {
                return 0;
            }
            return Math.round(this.quotaPlanUsed / this.quotaPlanQuota * 10000) / 100;
        },
        rateLimitPolicyEnabled() {
            if (!this.displayData.rate_limit_policy) return false;
            return this.isTrue(this.displayData.rate_limit_policy.enabled);
        },
        rateLimitRules() {
            return this.displayData.rate_limit_policy && this.displayData.rate_limit_policy.rules || { tpm: [], rpm: [], max_concurrency: -1 };
        },
        rateLimitMaxConcurrency() {
            return this.rateLimitRules.max_concurrency !== undefined ? this.rateLimitRules.max_concurrency : -1;
        },
        tpmRules() {
            return this.rateLimitRules.tpm || [];
        },
        tpmRulesLength() {
            return this.tpmRules.length;
        },
        rpmRules() {
            return this.rateLimitRules.rpm || [];
        },
        rpmRulesLength() {
            return this.rpmRules.length;
        },
        batchLimits() {
            return this.rateLimitRules.batch_limits || null;
        },
        batchLimitLines() {
            const limits = this.batchLimits || {};
            return BATCH_LIMIT_FIELDS.filter((f) => {
                const value = limits[f.key];
                return value !== undefined && value !== null && Number(value) > 0;
            }).map((f) => `${this.$t(f.labelKey)}：${limits[f.key]}`);
        }
    },
    methods: {
        formatMaxConcurrency(value) {
            if (value === -1) {
                return this.$t('apiKey.maxConcurrencyUnlimited');
            }
            if (value === 0) {
                return this.$t('apiKey.maxConcurrencyBanned');
            }
            return value;
        },
        copyKey() {
            if (!this.displayData.key) return;
            this.$copyText(this.displayData.key).then(() => {
                this.$Message.success(this.$t('apiKey.copySucc'));
            }).catch(() => {
                this.$Message.error(this.$t('apiKey.copyError'));
            });
        },
        fetchDetail() {
            if (!this.currentData || !this.currentData.id) return;
            this.loading = true;
            this.$request({
                url: this.$urlFormat('api-keys/{id}', { id: this.currentData.id }),
                method: 'get',
                openapi: true
            }).then(res => {
                if (res.status === 200) {
                    this.detailData = res.data.Data || {};
                }
            }).catch(err => {
                console.error('获取API-Key详情失败:', err);
            }).finally(() => {
                this.loading = false;
            });
        },
        isTrue(value) {
            return value === true || value === 'true';
        },
        formatTime(timestamp) {
            if (!timestamp) return '-';
            const date = new Date(timestamp * 1000);
            return date.toLocaleString('zh-CN');
        },
        formatNumber(num, decimals = null) {
            const value = Number(num);
            if (Number.isNaN(value)) return '-';
            const fractionDigits = decimals !== null ? decimals : (this.isRMB ? 4 : 0);
            return value.toLocaleString('zh-CN', {
                minimumFractionDigits: 0,
                maximumFractionDigits: fractionDigits
            });
        },
        getResetPeriodText(period) {
            const map = {
                'never': this.$t('apiKey.resetNever'),
                'weekly': this.$t('apiKey.resetWeekly'),
                'monthly': this.$t('apiKey.resetMonthly')
            };
            return map[period] || period;
        },
        showResetModal() {
            const quota = this.displayData.quota_plan && this.displayData.quota_plan.quota;
            this.newQuota = quota !== undefined && quota !== null ? quota : 0;
            this.resetReason = '';
            this.resetModalVisible = true;
        },
        confirmResetQuota() {
            if (this.newQuota === null || this.newQuota === undefined || this.newQuota === '') {
                this.$Message.error(this.$t('apiKey.quotaRequired'));
                return;
            }
            const value = Number(this.newQuota);
            if (Number.isNaN(value) || value < 0) {
                this.$Message.error(this.$t('apiKey.quotaRangeError'));
                return;
            }
            if (!this.isRMB && !Number.isInteger(value)) {
                this.$Message.error(this.$t('apiKey.quotaMustBeNonNegative'));
                return;
            }
            if (this.isRMB) {
                const decimalStr = String(this.newQuota).split('.')[1] || '';
                if (decimalStr.length > 4) {
                    this.$Message.error(this.$t('apiKey.quotaRmbPrecisionError'));
                    return;
                }
            }
            if (this.isRMB && value > RMB_QUOTA_MAX) {
                this.$Message.error(this.$t('apiKey.quotaRmbMaxError') || 'RMB 配额不能超过 9000 万元');
                return;
            }
            if (!this.isRMB && value > TOKEN_QUOTA_MAX) {
                this.$Message.error(this.$t('apiKey.quotaMaxError'));
                return;
            }
            this.$request({
                url: this.$urlFormat('api-keys/{id}/quota-plan/reset', { id: this.displayData.id }),
                method: 'post',
                openapi: true,
                data: {
                    quota: this.newQuota,
                    reason: this.resetReason || undefined
                }
            }).then(data => {
                if (data.status === 200) {
                    this.resetModalVisible = false;
                    this.$Message.success(this.$t('apiKey.quotaResetSuccess'));
                    this.$emit('submit');
                }
            }).catch(err => {
                console.error('重置配额失败:', err);
                this.$Message.error(this.$t('apiKey.quotaResetFailed'));
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

.info-row {
    display: flex;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
        border-bottom: none;
    }
}

.info-label {
    width: 100px;
    color: #666;
    flex-shrink: 0;
}

.info-value {
    color: #333;
    flex: 1;
}

.quota-progress {
    margin-top: 16px;
}

.progress-label {
    font-size: 12px;
    color: #999;
    margin-bottom: 8px;
}

.rules-detail {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e8eaec;
}

.rules-detail-title {
    font-size: 13px;
    font-weight: 500;
    color: #333;
    margin-bottom: 12px;
}

.rule-detail-item {
    padding: 12px 16px;
    background: #f8f8f9;
    border-radius: 4px;
    margin-bottom: 8px;
    font-size: 14px;
    color: #666;
    line-height: 2.2;
}

.com-btn-box {
    text-align: right;
    padding-top: 16px;
}

.reset-quota-modal /deep/ .ivu-modal-body {
    padding: 24px;
}

.reset-quota-modal .form-tip {
    margin-top: 12px;
    margin-bottom: 0;
    font-size: 12px;
    color: #999;
}

.reset-quota-modal .modal-form-item {
    margin-bottom: 0;
}

.reset-quota-modal .modal-label {
    font-size: 14px;
    color: #495060;
    margin-bottom: 8px;
}
</style>
