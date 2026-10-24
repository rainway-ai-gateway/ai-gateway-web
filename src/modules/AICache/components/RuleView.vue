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
      <span class="info-label">{{ $t('route.expression') }}</span>
      <span class="info-value expression-value">{{ rule.cond || '-' }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiCache.colStrategy') }}</span>
      <span class="info-value">{{ strategyLabel }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiCache.colTtl') }}</span>
      <span class="info-value">{{ ttlText }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiCache.colMaxBody') }}</span>
      <span class="info-value">{{ bodyText }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiCache.colMaxValue') }}</span>
      <span class="info-value">{{ valueText }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiCache.colSemantic') }}</span>
      <span class="info-value">{{ semanticText }}</span>
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
    strategyLabel() {
      const map = {
        lastQuestion: this.$t('aiCache.strategyLastQuestion'),
        allQuestions: this.$t('aiCache.strategyAllQuestions'),
        disabled: this.$t('aiCache.strategyDisabled')
      };
      const strategy = this.rule.cache_key_strategy;
      return map[strategy] || strategy || '-';
    },

    ttlText() {
      const value = this.rule.cache_ttl;
      if (value === null || value === undefined) {
        return '-';
      }
      return Number(value) === 0
        ? this.$t('aiCache.ttlNever')
        : this.$t('aiCache.ttlSecondsText', { value });
    },

    bodyText() {
      return this.formatBytes(this.rule.max_body_bytes);
    },

    valueText() {
      return this.formatBytes(this.rule.max_value_bytes);
    },

    semanticText() {
      const enabled = this.rule.enable_semantic_cache
        ? this.$t('aiCache.semanticOn')
        : this.$t('aiCache.semanticOff');
      return this.rule.cache_key_strategy === 'disabled'
        ? enabled + this.$t('aiCache.semanticIgnoreSuffix')
        : enabled;
    }
  },

  methods: {
    formatBytes(value) {
      if (value === null || value === undefined) {
        return '-';
      }
      return this.$t('aiCache.bytesText', { value });
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
</style>