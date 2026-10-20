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
  <div class="rule-view">
    <div class="info-row">
      <span class="info-label">{{ $t('route.ruleName') }}</span>
      <span class="info-value">{{ rule.name || '-' }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('trafficMirror.colCond') }}</span>
      <span class="info-value expression-value">{{ rule.cond || '-' }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('trafficMirror.colCluster') }}</span>
      <span class="info-value">{{ rule.mirror_cluster || '-' }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('trafficMirror.colPercentage') }}</span>
      <span class="info-value">{{ percentageText }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('trafficMirror.colRemoveHeaders') }}</span>
      <span class="info-value">{{ headerViewText }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('trafficMirror.setHeadersLabel') }}</span>
      <span class="info-value">
        <template v-if="setHeadersView.length">
          <div
            v-for="(item, index) in setHeadersView"
            :key="`h-${index}`"
            class="list-line"
          >
            {{ item.key }}：{{ item.value }}
          </div>
        </template>
        <span v-else class="empty-text">{{ $t('trafficMirror.emptyText') }}</span>
      </span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('trafficMirror.colBodyRewrites') }}</span>
      <span class="info-value">
        <template v-if="bodyRewritesView.length">
          <div
            v-for="(item, index) in bodyRewritesView"
            :key="`b-${index}`"
            class="list-line"
          >
            {{ item.path }} → {{ item.value }}
          </div>
        </template>
        <span v-else class="empty-text">{{ $t('trafficMirror.emptyText') }}</span>
      </span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('trafficMirror.colPathRewrite') }}</span>
      <span class="info-value">{{ rule.path_rewrite || '-' }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RuleView',

  props: {
    rule: {
      type: Object,
      required: true
    }
  },

  computed: {
    percentageText() {
      const value = this.rule.percentage;
      return this.$t('trafficMirror.percentageText', {
        value: value === null || value === undefined ? 100 : value
      });
    },

    headerMode() {
      const removeHeaders = this.rule.remove_headers;
      if (removeHeaders === null || removeHeaders === undefined) {
        return 'default';
      }
      if (Array.isArray(removeHeaders) && removeHeaders.length === 0) {
        return 'none';
      }
      return 'custom';
    },

    headerViewText() {
      if (this.headerMode === 'none') {
        return this.$t('trafficMirror.viewHeadersNone');
      }
      if (this.headerMode === 'custom') {
        return (this.rule.remove_headers || []).join(', ');
      }
      return this.$t('trafficMirror.viewHeadersDefault');
    },

    setHeadersView() {
      const map = this.rule.set_headers || {};
      return Object.keys(map).map(key => ({ key, value: map[key] }));
    },

    bodyRewritesView() {
      return this.rule.body_rewrites || [];
    }
  }
};
</script>

<style lang="less" scoped>
.info-row {
  display: flex;
  padding: 8px 0;
  line-height: 24px;
}

.info-label {
  width: 120px;
  flex-shrink: 0;
  color: #808695;
}

.info-value {
  flex: 1;
  color: #17233d;
  word-break: break-all;

  &.expression-value {
    font-family: monospace;
  }
}

.list-line {
  line-height: 24px;
}

.empty-text {
  color: #999;
}
</style>