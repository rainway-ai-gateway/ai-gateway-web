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
  <div class="batch-view">
    <div v-if="detail" class="Review">
      <!-- 1. 基本信息 -->
      <div class="panel">
        <div class="panel-header">{{ $t('batchTasks.basicInfo') }}</div>
        <div class="panel-body">
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.batchId') }}:</li>
            <li class="value">{{ text(detail.batch_id) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.provider') }}:</li>
            <li class="value">{{ text(detail.provider) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.apiKeyId') }}:</li>
            <li class="value">{{ text(detail.api_key_id) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">
              {{ $t('batchTasks.productName') }}:
              <span
                class="batch-help-icon"
                :title="$t('batchTasks.productNameTip')"
                >?</span
              >
            </li>
            <li class="value">{{ text(detail.product_name) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.entityId') }}:</li>
            <li class="value">{{ text(detail.entity_id) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.endpoint') }}:</li>
            <li class="value">{{ text(detail.endpoint) }}</li>
          </ul>
        </div>
      </div>

      <!-- 2. 状态与计数 -->
      <div class="panel">
        <div class="panel-header">{{ $t('batchTasks.statusAndCounts') }}</div>
        <div class="panel-body">
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.status') }}:</li>
            <li class="value">
              <Tag :type="statusTagType(detail.status)">
                {{ statusLabel(detail.status) }}
              </Tag>
            </li>
          </ul>
          <ul class="clearFloat">
            <li class="title">
              {{ $t('batchTasks.requestTotal') }}:
              <span
                class="batch-help-icon"
                :title="$t('batchTasks.requestTotalTip')"
                >?</span
              >
            </li>
            <li class="value">{{ text(requestCounts.total) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.requestCompleted') }}:</li>
            <li class="value">{{ text(requestCounts.completed) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.requestFailed') }}:</li>
            <li class="value">{{ text(requestCounts.failed) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.estLines') }}:</li>
            <li class="value">{{ text(detail.est_lines) }}</li>
          </ul>
        </div>
      </div>

      <!-- 3. 用量与记账 -->
      <div class="panel">
        <div class="panel-header">{{ $t('batchTasks.usageAndBilling') }}</div>
        <div class="panel-body">
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.usageInputTokens') }}:</li>
            <li class="value">{{ text(detail.usage_input_tokens) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.usageOutputTokens') }}:</li>
            <li class="value">{{ text(detail.usage_output_tokens) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">
              {{ $t('batchTasks.usageSource') }}:
              <span
                class="batch-help-icon"
                :title="$t('batchTasks.usageSourceTip')"
                >?</span
              >
            </li>
            <li class="value">{{ text(detail.usage_source) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">
              {{ $t('batchTasks.reserveUnits') }}:
              <span
                class="batch-help-icon"
                :title="$t('batchTasks.reserveUnitsTip')"
                >?</span
              >
            </li>
            <!-- 1e-8 定点整数 RMB，原样展示，禁止 ÷1e8 或格式化 -->
            <li class="value">{{ text(detail.reserve_units) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">
              {{ $t('batchTasks.settleUnits') }}:
              <span
                class="batch-help-icon"
                :title="$t('batchTasks.settleUnitsTip')"
                >?</span
              >
            </li>
            <li class="value">{{ text(detail.settle_units) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.settleStatus') }}:</li>
            <li class="value">
              <Tag :type="settleTagType(detail.settle_status)">
                {{ settleLabel(detail.settle_status) }}
              </Tag>
            </li>
          </ul>
          <ul class="clearFloat">
            <li class="title">
              {{ $t('batchTasks.overReserved') }}:
              <span
                class="batch-help-icon"
                :title="$t('batchTasks.overReservedTip')"
                >?</span
              >
            </li>
            <li class="value">{{ overReservedText }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">
              {{ $t('batchTasks.syncSource') }}:
              <span
                class="batch-help-icon"
                :title="$t('batchTasks.syncSourceTip')"
                >?</span
              >
            </li>
            <li class="value">{{ text(detail.sync_source) }}</li>
          </ul>
        </div>
      </div>

      <!-- 4. 文件与时间 -->
      <div class="panel">
        <div class="panel-header">{{ $t('batchTasks.filesAndTime') }}</div>
        <div class="panel-body">
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.inputFileId') }}:</li>
            <li class="value">{{ text(detail.input_file_id) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">
              {{ $t('batchTasks.outputFileId') }}:
              <span
                class="batch-help-icon"
                :title="$t('batchTasks.outputFileIdTip')"
                >?</span
              >
            </li>
            <li class="value">{{ text(detail.output_file_id) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.createdAt') }}:</li>
            <li class="value">{{ text(detail.created_at) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">{{ $t('batchTasks.updatedAt') }}:</li>
            <li class="value">{{ text(detail.updated_at) }}</li>
          </ul>
          <ul class="clearFloat">
            <li class="title">
              {{ $t('batchTasks.terminalAt') }}:
              <span
                class="batch-help-icon"
                :title="$t('batchTasks.terminalAtTip')"
                >?</span
              >
            </li>
            <li class="value">{{ text(detail.terminal_at) }}</li>
          </ul>
        </div>
      </div>

      <!-- 5. 批量文件 -->
      <div class="panel">
        <div class="panel-header">{{ $t('batchTasks.batchFiles') }}</div>
        <div class="panel-body">
          <ul class="clearFloat detail-row detail-row-block">
            <li class="title">{{ $t('batchTasks.batchFiles') }}:</li>
            <li class="value">
              <table v-if="batchFiles.length" class="mapping-table">
                <thead>
                  <tr>
                    <th>{{ $t('batchTasks.fileId') }}</th>
                    <th>{{ $t('batchTasks.provider') }}</th>
                    <th>{{ $t('batchTasks.purpose') }}</th>
                    <th>{{ $t('batchTasks.filename') }}</th>
                    <th>
                      {{ $t('batchTasks.size') }}
                      <span
                        class="batch-help-icon"
                        :title="$t('batchTasks.sizeTip')"
                        >?</span
                      >
                    </th>
                    <th>{{ $t('batchTasks.createdAt') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(file, index) in batchFiles" :key="index">
                    <td>{{ text(file.file_id) }}</td>
                    <td>{{ text(file.provider) }}</td>
                    <td>{{ text(file.purpose) }}</td>
                    <td>{{ text(file.filename) }}</td>
                    <td>
                      {{ file.bytes || 0 }}（{{ formatBytes(file.bytes) }}）
                    </td>
                    <td>{{ text(file.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
              <span v-else class="empty-text">-</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-else class="batch-view-loading">
      <Spin v-if="loading" size="large"></Spin>
      <span v-else class="empty-text">-</span>
    </div>
  </div>
</template>

<script>
const STATUS_I18N = {
    validating: 'statusValidating',
    queued: 'statusQueued',
    in_progress: 'statusInProgress',
    finalizing: 'statusFinalizing',
    completed: 'statusCompleted',
    expired: 'statusExpired',
    failed: 'statusFailed',
    cancelled: 'statusCancelled',
    cancelling: 'statusCancelling'
};

const STATUS_TAG_TYPES = {
    validating: 'default',
    queued: 'primary',
    in_progress: 'primary',
    finalizing: 'warning',
    completed: 'success',
    expired: 'default',
    failed: 'error',
    cancelled: 'default',
    cancelling: 'warning'
};

const SETTLE_I18N = {
    reserved: 'settleReserved',
    settled: 'settleSettled',
    released: 'settleReleased'
};

const SETTLE_TAG_TYPES = {
    reserved: 'warning',
    settled: 'success',
    released: 'default'
};

export default {
    name: 'BatchView',

    props: {
        detail: {
            type: Object,
            default: null
        },
        loading: {
            type: Boolean,
            default: false
        }
    },

    computed: {
        requestCounts() {
            return (this.detail && this.detail.request_counts) || {};
        },

        batchFiles() {
            const files = this.detail && this.detail.batch_files;
            return Array.isArray(files) ? files : [];
        },

        overReservedText() {
            const value = this.detail && this.detail.over_reserved;
            return value === null || value === undefined ? '-' : String(value);
        }
    },

    methods: {
        text(value) {
            return value === null || value === undefined || value === ''
                ? '-'
                : value;
        },

        statusLabel(status) {
            const key = STATUS_I18N[status];
            return key ? this.$t(`batchTasks.${key}`) : status || '-';
        },

        statusTagType(status) {
            return STATUS_TAG_TYPES[status] || 'default';
        },

        settleLabel(status) {
            const key = SETTLE_I18N[status];
            return key ? this.$t(`batchTasks.${key}`) : status || '-';
        },

        settleTagType(status) {
            return SETTLE_TAG_TYPES[status] || 'default';
        },

        formatBytes(bytes) {
            if (bytes === null || bytes === undefined || bytes === 0) {
                return '0 B';
            }
            const units = ['B', 'KB', 'MB', 'GB'];
            const idx = Math.min(
                units.length - 1,
                Math.floor(Math.log(bytes) / Math.log(1024))
            );
            const value = bytes / Math.pow(1024, idx);
            return (idx === 0 ? value : value.toFixed(2)) + ' ' + units[idx];
        }
    }
};
</script>

<style lang="less" scoped>
.batch-view {
    .batch-view-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
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

        .panel-body ul.clearFloat.detail-row-block {
            align-items: flex-start;
        }

        .detail-row-block {
            .title {
                padding-top: 8px;
            }
        }
    }

    .batch-help-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        border: 1px solid #2d8cf0;
        border-radius: 50%;
        color: #2d8cf0;
        font-size: 11px;
        font-style: normal;
        line-height: 1;
        margin-left: 4px;
        cursor: help;
        vertical-align: middle;
    }

    .empty-text {
        color: #999;
    }

    .mapping-table {
        width: auto;
        min-width: 560px;
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
            white-space: nowrap;
        }

        td {
            color: #333;
            background: #fff;
        }
    }
}
</style>