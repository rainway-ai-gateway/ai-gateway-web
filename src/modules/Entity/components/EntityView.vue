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
    <Card :title="$t('entity.basicInfo')" class="form-card">
      <div class="info-row">
        <span class="info-label">{{ $t('entity.name') }}</span>
        <span class="info-value">{{ displayData.name || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('entity.description') }}</span>
        <span class="info-value">{{ displayData.description || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('entity.type') }}</span>
        <span class="info-value">{{ displayData.type || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('entity.parentEntity') }}</span>
        <span
          class="info-value"
          >{{ parentEntityName || '- ' + $t('entity.noParent') }}</span
        >
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('com.createTime') }}</span>
        <span
          class="info-value"
          >{{ formatTime(displayData.create_time) }}</span
        >
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('com.updateTime') }}</span>
        <span
          class="info-value"
          >{{ formatTime(displayData.update_time) }}</span
        >
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('entity.allowModels') }}</span>
        <span class="info-value">{{ allowModelsText }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('entity.blockModels') }}</span>
        <span class="info-value">{{ blockModelsText }}</span>
      </div>
    </Card>

    <Card :title="$t('entity.quotaInfo')" class="form-card">
      <div class="info-row">
        <span class="info-label">{{ $t('entity.unlimitedQuota') }}</span>
        <span
          class="info-value"
          >{{ quotaPlanUnlimited ? $t('entity.yes') : $t('entity.no') }}</span
        >
      </div>
      <div v-if="!quotaPlanUnlimited">
        <div class="info-row">
          <span class="info-label">{{ $t('entity.passWhenNoQuota') }}</span>
          <span
            class="info-value"
            >{{ passWhenNoEnoughQuota ? $t('entity.yes') : $t('entity.no') }}</span
          >
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('entity.quotaTotal') }}</span>
          <span
            class="info-value"
            >{{ isRMB ? '¥' + formatNumber(quotaPlanQuota) : formatNumber(quotaPlanQuota) + ' tokens' }}</span
          >
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('entity.quotaUnit') }}</span>
          <span class="info-value">{{ quotaPlanUnit }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('com.used') }}</span>
          <span class="info-value"
            >{{ isRMB ? '¥' + formatNumber(quotaPlanUsed) : formatNumber(quotaPlanUsed) + ' tokens' }}
            ({{ quotaPercent









            }}%)</span
          >
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('com.remaining') }}</span>
          <span
            class="info-value"
            >{{ isRMB ? '¥' + formatNumber(quotaPlanRemaining) : formatNumber(quotaPlanRemaining) + ' tokens' }}</span
          >
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('entity.resetPeriod') }}</span>
          <span
            class="info-value"
            >{{ getResetPeriodText(quotaPlanResetPeriod) }}</span
          >
        </div>
        <div class="quota-progress">
          <div class="progress-label">{{ $t('com.usageProgress') }}</div>
          <Progress :percent="quotaPercent" :stroke-width="8" />
        </div>
        <div style="margin-top: 16px;">
          <Button
            type="primary"
            size="small"
            @click="showResetModal"
            icon="md-refresh"
            >{{ $t('entity.resetQuota') }}</Button
          >
        </div>
      </div>
    </Card>

    <Card :title="$t('entity.rateLimitConfig')" class="form-card">
      <div class="info-row">
        <span class="info-label">{{ $t('entity.rateLimitStatus') }}</span>
        <Tag :color="rateLimitPolicyEnabled ? 'success' : 'default'">
          {{ rateLimitPolicyEnabled ? $t('entity.enabled') : $t('entity.notEnabled') }}
        </Tag>
      </div>
      <div v-if="rateLimitPolicyEnabled" class="info-row">
        <span class="info-label">{{ $t('entity.maxConcurrency') }}</span>
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
          {{ $t('entity.tpmRules') }} ({{ tpmRulesLength }}{{ $t('com.item') }})
        </div>
        <div
          v-for="(rule, index) in tpmRules"
          :key="index"
          class="rule-detail-item"
        >
          <div>{{ $t('entity.ruleName') }}：{{ rule.name }}</div>
          <div>
            {{ $t('entity.applyModel')









            }}：{{ rule.model === '*' ? $t('entity.allModels') : rule.model }}
          </div>
          <div>
            {{ $t('entity.timeWindow') }}：{{ rule.window_minutes







            }}{{ $t('com.minute') }}
          </div>
          <div>{{ $t('entity.maxTokens') }}：{{ rule.max_tokens }}</div>
          <div>
            {{ $t('entity.stepMinutes') }}：{{ rule.step_minutes







            }}{{ $t('com.minute') }}
          </div>
        </div>
      </div>

      <div
        v-if="rateLimitPolicyEnabled && rpmRulesLength > 0"
        class="rules-detail"
      >
        <div class="rules-detail-title">
          {{ $t('entity.rpmRules') }} ({{ rpmRulesLength }}{{ $t('com.item') }})
        </div>
        <div
          v-for="(rule, index) in rpmRules"
          :key="index"
          class="rule-detail-item"
        >
          <div>{{ $t('entity.ruleName') }}：{{ rule.name }}</div>
          <div>
            {{ $t('entity.applyModel')









            }}：{{ rule.model === '*' ? $t('entity.allModels') : rule.model }}
          </div>
          <div>
            {{ $t('entity.timeWindow') }}：{{ rule.window_minutes





            }}{{ $t('com.minute') }}
          </div>
          <div>{{ $t('entity.maxRequests') }}：{{ rule.max_requests }}</div>
        </div>
      </div>
    </Card>

    <div class="com-btn-box drawer-footer">
      <Button @click="$emit('cancel')">{{ $t('com.close') }}</Button>
    </div>

    <Modal
      v-model="resetModalVisible"
      :title="$t('entity.resetQuota')"
      class="reset-quota-modal"
      @on-cancel="resetModalVisible = false"
    >
      <div class="info-row">
        <span
          class="info-label"
          style="line-height: 32px;"
          >{{ $t('entity.newQuotaTotal') }}</span
        >
        <span>
          <InputNumber
            v-model="newQuota"
            :min="0"
            :max="quotaInputMax"
            :precision="isRMB ? 4 : 0"
            :step="isRMB ? 0.0001 : 1"
            style="width: 100%;"
          ></InputNumber>
        </span>
      </div>
      <p class="form-tip">{{ $t('entity.resetQuotaTip') }}</p>
      <div class="info-row" style="margin-top: 16px;">
        <span
          class="info-label"
          style="line-height: 32px;"
          >{{ $t('entity.resetReason') }}</span
        >
        <span>
          <Input
            v-model="resetReason"
            type="textarea"
            :rows="3"
            :placeholder="$t('entity.resetReasonPlaceholder')"
          ></Input>
        </span>
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

export default {
    props: {
      currentData: {
            type: Object,
            default() {
                return {};
            }
        },
        entityList: {
            type: Array,
            default() {
                return [];
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
        allowModelsText() {
            const allowModels = this.displayData.allow_models || [];
            return allowModels.indexOf('*') >= 0 ? this.$t('entity.allModels') : (allowModels.join(', ') || '-');
        },
        blockModelsText() {
            const blockModels = this.displayData.block_models || [];
            const models = blockModels.filter(model => model !== '*');
            return models.length > 0 ? models.join(', ') : '-';
        },
        quotaPlanUnlimited() {
            const unlimited = this.displayData.quota_plan && this.displayData.quota_plan.unlimited;
            return unlimited === true || unlimited === 'true';
        },
        passWhenNoEnoughQuota() {
            const pass = this.displayData.quota_plan && this.displayData.quota_plan.pass_when_no_enough_quota;
            return pass === true || pass === 'true';
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
            return this.displayData.rate_limit_policy && this.displayData.rate_limit_policy.enabled;
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
        parentEntityName() {
            if (!this.displayData.parent_id) return '';
            const parent = this.entityList.find(item => item.id === this.displayData.parent_id);
            return parent ? parent.name : '';
        }
    },
    methods: {
        formatMaxConcurrency(value) {
            if (value === -1) {
                return this.$t('entity.maxConcurrencyUnlimited');
            }
            if (value === 0) {
                return this.$t('entity.maxConcurrencyBanned');
            }
            return value;
        },
        fetchDetail() {
            if (!this.currentData || !this.currentData.id) return;
            this.loading = true;
            this.$request({
                url: `entities/${this.currentData.id}`,
                method: 'get',
                openapi: true
            }).then(res => {
                if (res.status === 200) {
                    this.detailData = res.data.Data || {};
                }
            }).catch(err => {
                console.error('获取Entity详情失败:', err);
            }).finally(() => {
                this.loading = false;
            });
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
                'never': this.$t('entity.resetNever'),
                'weekly': this.$t('entity.resetWeekly'),
                'monthly': this.$t('entity.resetMonthly')
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
                this.$Message.error(this.$t('entity.enterQuotaTotal'));
                return;
            }
            const value = Number(this.newQuota);
            if (Number.isNaN(value) || value < 0) {
                this.$Message.error(this.$t('entity.quotaRangeError'));
                return;
            }
            if (!this.isRMB && !Number.isInteger(value)) {
                this.$Message.error(this.$t('entity.quotaMustBeNonNegative'));
                return;
            }
            if (this.isRMB) {
                const decimalStr = String(this.newQuota).split('.')[1] || '';
                if (decimalStr.length > 4) {
                    this.$Message.error(this.$t('entity.quotaRmbPrecisionError'));
                    return;
                }
            }
            if (this.isRMB && value > RMB_QUOTA_MAX) {
                this.$Message.error(this.$t('entity.quotaRmbMaxError') || 'RMB 配额不能超过 9000 万元');
                return;
            }
            if (!this.isRMB && value > TOKEN_QUOTA_MAX) {
                this.$Message.error(this.$t('entity.quotaMaxError'));
                return;
            }
            this.$request({
                url: `entities/${this.displayData.id}/quota-plan/reset`,
                method: 'post',
                openapi: true,
                data: {
                    quota: this.newQuota,
                    reason: this.resetReason || undefined
                }
            }).then(data => {
                if (data.status === 200) {
                    this.resetModalVisible = false;
                    this.$Message.success(this.$t('entity.quotaResetSuccess'));
                    this.$emit('submit');
                }
            }).catch(err => {
                console.error('重置配额失败:', err);
                this.$Message.error(this.$t('entity.quotaResetFailed'));
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
</style>
