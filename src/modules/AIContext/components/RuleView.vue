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
      <span class="info-label">{{ $t('aiContext.colCond') }}</span>
      <span class="info-value expression-value">{{ rule.cond || '-' }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiContext.colMode') }}</span>
      <span class="info-value">{{ modeLabel }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiContext.colMaxTokens') }}</span>
      <span class="info-value">{{ maxTokensText }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiContext.colReserveTokens') }}</span>
      <span class="info-value">{{ reserveTokensText }}</span>
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
    modeLabel() {
      const map = {
        off: this.$t('aiContext.modeOff'),
        conservative: this.$t('aiContext.modeConservative'),
        balanced: this.$t('aiContext.modeBalanced'),
        aggressive: this.$t('aiContext.modeAggressive')
      };
      const mode = this.rule.mode;
      return map[mode] || mode || '-';
    },

    maxTokensText() {
      return this.formatTokens(this.rule.max_context_tokens);
    },

    reserveTokensText() {
      return this.formatTokens(this.rule.reserve_tokens);
    }
  },

  methods: {
    formatTokens(value) {
      if (value === null || value === undefined || Number(value) === 0) {
        return this.$t('aiContext.tokensModelDefault');
      }
      return this.$t('aiContext.tokensText', { value });
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