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
  <div class="sweep-view">
    <div class="sv-row">
      <span class="sv-label">{{ $t('security.taskId') }}</span>
      <span class="sv-value">{{ detail.task_id || '-' }}</span>
    </div>
    <div class="sv-row">
      <span class="sv-label">{{ $t('security.status') }}</span>
      <span class="sv-value">
        <Tag :color="statusInfo.color">{{ statusInfo.text }}</Tag>
        <span v-if="isRunning" class="sv-polling">{{
          $t('security.polling')
        }}</span>
      </span>
    </div>
    <div class="sv-row">
      <span class="sv-label">{{ $t('security.mode') }}</span>
      <span class="sv-value">{{ modeLabel }}</span>
    </div>
    <div class="sv-row">
      <span class="sv-label">{{ $t('security.dryRunLabel') }}</span>
      <span class="sv-value">{{
        detail.dry_run ? $t('security.dryRunYes') : $t('security.dryRunNo')
      }}</span>
    </div>
    <div class="sv-row">
      <span class="sv-label">{{ $t('security.scope') }}</span>
      <span class="sv-value">{{ scopeLabel }}</span>
    </div>
    <div class="sv-row">
      <span class="sv-label">{{ $t('security.createdBy') }}</span>
      <span class="sv-value">{{ detail.created_by || '-' }}</span>
    </div>
    <div class="sv-row">
      <span class="sv-label">{{ $t('security.activeKeyId') }}</span>
      <span class="sv-value">{{ activeKeyId }}</span>
    </div>
    <div class="sv-row">
      <span class="sv-label">{{ $t('security.startEndTime') }}</span>
      <span class="sv-value"
        >{{ detail.started_at || '-' }} / {{ detail.finished_at || '-' }}</span
      >
    </div>
    <div class="sv-row">
      <span class="sv-label">{{ $t('security.duration') }}</span>
      <span class="sv-value">{{ durationText }}</span>
    </div>

    <div
      v-for="table in summaryTables"
      :key="table.key"
      class="sv-summary-block"
    >
      <div class="sv-summary-title">{{ table.title }}</div>
      <template v-if="table.nums">
        <div class="sv-summary-nums">
          <span
            >{{ $t('security.scanned') }}：<b>{{
              table.nums.scanned
            }}</b></span
          >
          <span
            >{{ $t('security.rewritten') }}：<b>{{
              table.nums.rewritten
            }}</b></span
          >
          <span
            >{{ $t('security.skipped') }}：<b>{{ table.nums.skipped }}</b></span
          >
        </div>
        <Progress :percent="table.nums.percent" :stroke-width="8" />
      </template>
      <div v-else class="sv-empty">{{ $t('security.summaryRunning') }}</div>
    </div>

    <div v-if="detail.error === 'dry_run'" class="sv-note">
      {{ $t('security.dryRunNote') }}
    </div>
    <Alert
      v-else-if="detail.error"
      type="error"
      show-icon
      class="sv-error"
      >{{ $t('security.error') }}：{{ detail.error }}</Alert
    >
  </div>
</template>

<script>
const MODE_LABELS = {
    reencrypt: 'modeReencrypt',
    decrypt: 'modeDecrypt'
};

const SCOPE_LABELS = {
    all: 'scopeAll',
    providers: 'scopeProviders',
    api_keys: 'scopeApiKeys'
};

export default {
    name: 'SweepView',

    props: {
        detail: {
            type: Object,
            default: () => ({})
        }
    },

    computed: {
        isRunning() {
            return this.detail.status === 'running';
        },

        statusInfo() {
            const status = this.detail.status;
            if (status === 'running') {
                return {
                    color: 'primary',
                    text: this.$t('security.statusRunning')
                };
            }
            if (status === 'succeeded') {
                return {
                    color: 'success',
                    text: this.$t('security.statusSucceeded')
                };
            }
            return { color: 'error', text: this.$t('security.statusFailed') };
        },

        modeLabel() {
            const key = MODE_LABELS[this.detail.mode];
            return key ? this.$t('security.' + key) : this.detail.mode || '-';
        },

        scopeLabel() {
            const key = SCOPE_LABELS[this.detail.scope];
            return key ? this.$t('security.' + key) : this.detail.scope || '-';
        },

        activeKeyId() {
            return this.detail.active_key_id != null
                ? this.detail.active_key_id
                : '-';
        },

        // running 时耗时未落库，显示 '-'（不得把 duration_ms=0 误显示为耗时 0）
        durationText() {
            if (this.isRunning) return '-';
            return this.$t('security.durationMs', {
                ms: this.detail.duration_ms || 0
            });
        },

        // 按 scope 只渲染对应统计表；running（summary 为空）时给出占位
        summaryTables() {
            const scope = this.detail.scope;
            const summary = this.detail.summary || {};
            const tables = [];
            if (scope !== 'api_keys') {
                tables.push({
                    key: 'providers',
                    title: this.$t('security.providersSummary'),
                    raw: summary.providers
                });
            }
            if (scope !== 'providers') {
                tables.push({
                    key: 'api_keys',
                    title: this.$t('security.apiKeysSummary'),
                    raw: summary.api_keys
                });
            }
            return tables.map(t =>
                Object.assign({}, t, {
                    nums: t.raw ? this.buildSummary(t.raw) : null
                })
            );
        }
    },

    methods: {
        buildSummary(raw) {
            const data = raw || {};
            const scanned = data.scanned || 0;
            const rewritten = data.rewritten || 0;
            const skipped = data.skipped || 0;
            const total = scanned + skipped;
            const percent =
                total > 0
                    ? Math.min(100, Math.round((scanned / total) * 100))
                    : 0;
            return { scanned, rewritten, skipped, total, percent };
        }
    }
};
</script>

<style lang="less" scoped>
.sweep-view {
    .sv-row {
        display: flex;
        gap: 8px;
        color: #515a6e;
        font-size: 13px;
        margin-bottom: 8px;
    }

    .sv-label {
        color: #808695;
        min-width: 110px;
    }

    .sv-value {
        word-break: break-all;
    }

    .sv-polling {
        color: #2d8cf0;
        font-size: 12px;
        margin-left: 8px;
    }

    .sv-summary-block {
        border: 1px solid #e8eaec;
        border-radius: 4px;
        padding: 12px;
        margin-top: 8px;
    }

    .sv-summary-title {
        font-weight: 600;
        color: #17233d;
        margin-bottom: 8px;
    }

    .sv-summary-nums {
        display: flex;
        gap: 16px;
        color: #515a6e;
        font-size: 13px;
        margin-bottom: 6px;
    }

    .sv-empty {
        color: #808695;
        font-size: 13px;
    }

    .sv-note {
        color: #2d8cf0;
        background: #f0faff;
        border: 1px solid #aed0ee;
        border-radius: 4px;
        padding: 8px 12px;
        margin-top: 8px;
        font-size: 13px;
    }

    .sv-error {
        margin-top: 8px;
    }
}
</style>