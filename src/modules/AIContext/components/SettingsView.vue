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
  <div class="settings-view">
    <div class="info-row">
      <span class="info-label">{{ $t('aiContext.viewTriggerRatio') }}</span>
      <span class="info-value">{{ settings.trigger_ratio }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiContext.viewKeepLatestImages') }}</span>
      <span class="info-value">
        {{ settings.keep_latest_images }}
        <span v-if="Number(settings.keep_latest_images) === 0">{{ $t('aiContext.keepImagesNone') }}</span>
      </span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiContext.viewToolResultMaxChars') }}</span>
      <span class="info-value">
        {{ settings.tool_result_max_chars }}
        <span v-if="Number(settings.tool_result_max_chars) === 0">{{ $t('aiContext.toolResultNoTruncate') }}</span>
      </span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiContext.viewThinkingPolicy') }}</span>
      <span class="info-value">{{ thinkingLabel }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiContext.viewCharsPerToken') }}</span>
      <span class="info-value">{{ settings.chars_per_token }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiContext.viewImageTokenEstimate') }}</span>
      <span class="info-value">{{ settings.image_token_estimate }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiContext.viewRewriteStrength') }}</span>
      <span class="info-value">{{ rewriteStrengthLabel }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('aiContext.viewProtectedSurvivalRate') }}</span>
      <span class="info-value">{{ rewrite.protected_survival_rate }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SettingsView',

  props: {
    settings: {
      type: Object,
      required: true
    }
  },

  computed: {
    rewrite() {
      return this.settings.rewrite || {};
    },

    thinkingLabel() {
      const map = {
        'trim-all-but-last': this.$t('aiContext.thinkingTrimAllButLast'),
        keep: this.$t('aiContext.thinkingKeep')
      };
      const policy = this.settings.thinking_policy;
      return map[policy] || policy || '-';
    },

    rewriteStrengthLabel() {
      const map = {
        lite: this.$t('aiContext.rewriteLite'),
        full: this.$t('aiContext.rewriteFull')
      };
      const strength = this.rewrite.strength;
      return map[strength] || strength || '-';
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
  width: 300px;
  flex-shrink: 0;
  color: #808695;
}

.info-value {
  flex: 1;
  color: #17233d;
  word-break: break-all;
}
</style>