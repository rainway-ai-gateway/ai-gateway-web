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
  <div class="question-view">
    <div class="info-row">
      <span class="info-label">{{ $t('intentConfig.colName') }}</span>
      <span class="info-value">{{ question.name || '-' }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('intentConfig.colType') }}</span>
      <span class="info-value">{{ typeLabel }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('intentConfig.colInstructions') }}</span>
      <span class="info-value">{{ question.instructions || '-' }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ optionLabel }}</span>
      <span class="info-value">
        <template v-if="options.length">
          <div
            v-for="(item, index) in options"
            :key="`o-${index}`"
            class="list-line"
          >
            {{ item.name }}<template v-if="item.description">：{{ item.description }}</template>
          </div>
        </template>
        <span v-else class="empty-text">{{ emptyOptionText }}</span>
      </span>
    </div>
    <div class="info-row">
      <span class="info-label">{{ $t('intentConfig.colMinConfidence') }}</span>
      <span class="info-value">{{ minConfidenceText }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'QuestionView',

  props: {
    question: {
      type: Object,
      required: true
    },
    globalMinConfidence: {
      type: Number,
      default: 0.6
    }
  },

  computed: {
    typeLabel() {
      if (this.question.type === 'choice') {
        return this.$t('intentConfig.typeChoice');
      }
      if (this.question.type === 'score') {
        return this.$t('intentConfig.typeScore');
      }
      return this.question.type || '-';
    },

    options() {
      return this.question.type === 'choice'
        ? this.question.criteria || []
        : this.question.levels || [];
    },

    optionLabel() {
      return this.question.type === 'choice'
        ? this.$t('intentConfig.colCriteria')
        : this.$t('intentConfig.colLevels');
    },

    emptyOptionText() {
      return this.question.type === 'choice'
        ? this.$t('intentConfig.emptyOptions')
        : this.$t('intentConfig.emptyLevels');
    },

    minConfidenceText() {
      const value = this.question.min_confidence;
      if (value === null || value === undefined || value === '') {
        return this.$t('intentConfig.useGlobalThreshold', {
          value: this.globalMinConfidence
        });
      }
      return String(value);
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
}

.list-line {
  line-height: 24px;
}

.empty-text {
  color: #999;
}
</style>