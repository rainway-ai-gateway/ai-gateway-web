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
  <div class="model-price-view">
    <Card :title="$t('modelPrices.basicInfo')" class="info-card">
      <div class="info-row">
        <span class="info-label">{{ $t('modelPrices.provider') }}</span>
        <span class="info-value">{{ currentData.provider || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('modelPrices.model') }}</span>
        <span class="info-value">{{ currentData.model || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('modelPrices.baseModel') }}</span>
        <span class="info-value">{{ currentData.base_model || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('modelPrices.mode') }}</span>
        <span class="info-value">{{ modeLabel || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('modelPrices.capabilities') }}</span>
        <span class="info-value">
          <Tag
            v-for="(item, index) in currentData.capabilities || []"
            :key="'cap-' + index"
          >
            {{ item }}
          </Tag>
          <span
            v-if="!(currentData.capabilities || []).length"
            class="empty-text"
            >-</span
          >
        </span>
      </div>
      <div class="info-row">
        <span
          class="info-label"
          >{{ $t('modelPrices.supportedParameters') }}</span
        >
        <span class="info-value">
          <Tag
            v-for="(item, index) in currentData.supported_parameters || []"
            :key="'param-' + index"
          >
            {{ item }}
          </Tag>
          <span
            v-if="!(currentData.supported_parameters || []).length"
            class="empty-text"
            >-</span
          >
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('modelPrices.createdAt') }}</span>
        <span
          class="info-value"
          >{{ formatTime(currentData.create_time) }}</span
        >
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('modelPrices.updatedAt') }}</span>
        <span
          class="info-value"
          >{{ formatTime(currentData.update_time) }}</span
        >
      </div>
    </Card>

    <Card :title="$t('modelPrices.limits')" class="info-card">
      <table v-if="limitsEntries.length" class="kv-table">
        <tbody>
          <tr v-for="(entry, index) in limitsEntries" :key="`limit-${index}`">
            <td>{{ entry.key }}</td>
            <td>{{ entry.value }}</td>
          </tr>
        </tbody>
      </table>
      <span v-else class="empty-text">-</span>
    </Card>

    <Card :title="$t('modelPrices.priceSection')" class="info-card">
      <div class="info-row">
        <span class="info-label">{{ $t('modelPrices.priceObject') }}</span>
        <span class="info-value">
          <table v-if="pricesEntries.length" class="kv-table">
            <tbody>
              <tr
                v-for="(entry, index) in pricesEntries"
                :key="`price-${index}`"
              >
                <td>{{ entry.key }}</td>
                <td>¥{{ formatPrice(entry.value) }}</td>
              </tr>
            </tbody>
          </table>
          <span v-else class="empty-text">-</span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('modelPrices.tierPriceObject') }}</span>
        <span class="info-value">
          <div v-if="tierPriceGroups.length">
            <div
              v-for="group in tierPriceGroups"
              :key="group.name"
              class="tier-price-group"
            >
              <div class="tier-price-label">
                {{ $t('modelPrices.tierObject') }}：{{ group.label }}
              </div>
              <table class="kv-table">
                <tbody>
                  <tr
                    v-for="(entry, index) in group.entries"
                    :key="`tier-${group.name}-${index}`"
                  >
                    <td>{{ entry.key }}</td>
                    <td>¥{{ formatPrice(entry.value) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <span v-else class="empty-text">-</span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('modelPrices.batchDiscount') }}</span>
        <span class="info-value">
          <span v-if="isBatchMode">{{
            $t('modelPrices.batchDiscountBatchModeTip')
          }}</span>
          <span v-else>{{ batchDiscountDisplay }}</span>
        </span>
      </div>
    </Card>

    <Card :title="$t('modelPrices.metadata')" class="info-card">
      <div class="info-row">
        <span class="info-label">{{ $t('modelPrices.source') }}</span>
        <span
          class="info-value"
          >{{ (currentData.metadata && currentData.metadata.source) || '-' }}</span
        >
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('modelPrices.notes') }}</span>
        <span
          class="info-value"
          >{{ (currentData.metadata && currentData.metadata.notes) || '-' }}</span
        >
      </div>
    </Card>
  </div>
</template>

<script>
import { formatPriceDisplay } from '@/utils/price';

export default {
    name: 'ModelPriceView',

    props: {
        currentData: {
            type: Object,
            default() {
                return {};
            }
        }
    },

    computed: {
        limitsEntries() {
            const limits = this.currentData.limits || {};
            return Object.keys(limits).map(key => ({ key, value: limits[key] }));
        },
        pricesEntries() {
            const prices = this.currentData.prices || {};
            return Object.keys(prices).map(key => ({ key, value: prices[key] }));
        },
        tierPriceGroups() {
            const tierPrices = this.currentData.tier_prices || {};
            return Object.keys(tierPrices)
                .filter(name => tierPrices[name] && Object.keys(tierPrices[name]).length)
                .map(name => ({
                    name,
                    label: name === 'peak' ? this.$t('modelPrices.tierPeakLabel') : name,
                    entries: Object.keys(tierPrices[name]).map(key => ({
                        key,
                        value: tierPrices[name][key]
                    }))
                }));
        },
        modeLabel() {
            return this.currentData.mode;
        },
        isBatchMode() {
            return this.currentData.mode === 'batch';
        },
        batchDiscountDisplay() {
            const value = this.currentData.batch_discount;
            if (value === null || value === undefined || value === '') {
                return '-';
            }
            return this.formatPrice(value);
        }
    },

    methods: {
        formatTime(timestamp) {
            if (!timestamp) return '-';
            const date = new Date(timestamp * 1000);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleString('zh-CN');
        },
        formatPrice(value) {
            return formatPriceDisplay(value);
        }
    }
};
</script>

<style lang="less" scoped>
.model-price-view {
    .info-card {
        margin-bottom: 16px;
    }

    .info-row {
        display: flex;
        margin-bottom: 10px;
        line-height: 24px;

        .info-label {
            width: 140px;
            flex-shrink: 0;
            color: #515a6e;
            font-weight: 500;
        }

        .info-value {
            flex: 1;
            color: #17233d;
            word-break: break-all;
        }
    }

    .empty-text {
        color: #999;
    }

    .kv-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #e7e9f0;

        td {
            padding: 8px 16px;
            border: 1px solid #e7e9f0;
            word-break: break-all;
        }

        td:first-child {
            width: 50%;
            background: #f8f8f9;
        }
    }

    .tier-price-group + .tier-price-group {
        margin-top: 12px;
    }

    .tier-price-label {
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #515a6e;
    }
}
</style>
