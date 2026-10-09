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
  <div class="settings-form">
    <Form
      ref="formData"
      :model="formData"
      :rules="ruleValidate"
      label-position="top"
    >
      <FormItem :label="$t('aiContext.triggerRatioLabel')" prop="trigger_ratio">
        <InputNumber
          v-model="formData.trigger_ratio"
          :min="0"
          :max="1"
          :step="0.01"
          style="width: 220px;"
        />
      </FormItem>

      <FormItem :label="$t('aiContext.keepLatestImagesLabel')" prop="keep_latest_images">
        <InputNumber
          v-model="formData.keep_latest_images"
          :min="0"
          :step="1"
          style="width: 220px;"
        />
      </FormItem>

      <FormItem :label="$t('aiContext.toolResultMaxCharsLabel')" prop="tool_result_max_chars">
        <InputNumber
          v-model="formData.tool_result_max_chars"
          :min="0"
          :step="1"
          style="width: 220px;"
        />
      </FormItem>

      <FormItem :label="$t('aiContext.thinkingPolicyLabel')" prop="thinking_policy">
        <Select v-model="formData.thinking_policy" transfer style="width: 220px;">
          <Option value="trim-all-but-last">
            {{ $t('aiContext.thinkingTrimAllButLast') }}
          </Option>
          <Option value="keep">
            {{ $t('aiContext.thinkingKeep') }}
          </Option>
        </Select>
      </FormItem>

      <FormItem :label="$t('aiContext.charsPerTokenLabel')" prop="chars_per_token">
        <InputNumber
          v-model="formData.chars_per_token"
          :min="1"
          :step="1"
          style="width: 220px;"
        />
      </FormItem>

      <FormItem :label="$t('aiContext.imageTokenEstimateLabel')" prop="image_token_estimate">
        <InputNumber
          v-model="formData.image_token_estimate"
          :min="0"
          :step="1"
          style="width: 220px;"
        />
      </FormItem>

      <FormItem :label="$t('aiContext.rewriteStrengthLabel')" prop="rewrite_strength">
        <Select v-model="formData.rewrite_strength" transfer style="width: 220px;">
          <Option value="lite">
            {{ $t('aiContext.rewriteLite') }}
          </Option>
          <Option value="full">
            {{ $t('aiContext.rewriteFull') }}
          </Option>
        </Select>
      </FormItem>

      <FormItem :label="$t('aiContext.protectedSurvivalRateLabel')" prop="protected_survival_rate">
        <InputNumber
          v-model="formData.protected_survival_rate"
          :min="0"
          :max="1"
          :step="0.01"
          style="width: 220px;"
        />
      </FormItem>
    </Form>
  </div>
</template>

<script>
import { cloneDeep } from 'lodash';

export const DEFAULT_SETTINGS = {
  trigger_ratio: 0.7,
  keep_latest_images: 2,
  tool_result_max_chars: 2000,
  thinking_policy: 'trim-all-but-last',
  chars_per_token: 4,
  image_token_estimate: 1200,
  rewrite: { strength: 'lite', protected_survival_rate: 0.95 }
};

function buildFormData(settings) {
  const src = settings || {};
  const rewrite = src.rewrite || {};
  const pick = (key) =>
    src[key] === null || src[key] === undefined ? DEFAULT_SETTINGS[key] : Number(src[key]);
  return {
    trigger_ratio: pick('trigger_ratio'),
    keep_latest_images: pick('keep_latest_images'),
    tool_result_max_chars: pick('tool_result_max_chars'),
    thinking_policy: src.thinking_policy || DEFAULT_SETTINGS.thinking_policy,
    chars_per_token: pick('chars_per_token'),
    image_token_estimate: pick('image_token_estimate'),
    rewrite_strength: rewrite.strength || DEFAULT_SETTINGS.rewrite.strength,
    protected_survival_rate:
      rewrite.protected_survival_rate === null || rewrite.protected_survival_rate === undefined
        ? DEFAULT_SETTINGS.rewrite.protected_survival_rate
        : Number(rewrite.protected_survival_rate)
  };
}

export default {
  name: 'SettingsForm',

  props: {
    settings: {
      type: Object,
      default: null
    }
  },

  data() {
    const num = value => (value === '' || value === null || value === undefined ? NaN : Number(value));

    return {
      formData: buildFormData(cloneDeep(this.settings)),
      ruleValidate: {
        trigger_ratio: [
          {
            required: true,
            validator: (rule, value, callback) => {
              const v = num(value);
              if (isNaN(v) || v <= 0 || v > 1) {
                callback(new Error(this.$t('aiContext.tipTriggerRatio')));
                return;
              }
              callback();
            },
            trigger: 'change'
          }
        ],
        keep_latest_images: [
          {
            required: true,
            validator: (rule, value, callback) => {
              const v = num(value);
              if (isNaN(v) || v < 0) {
                callback(new Error(this.$t('aiContext.tipKeepLatestImages')));
                return;
              }
              callback();
            },
            trigger: 'change'
          }
        ],
        tool_result_max_chars: [
          {
            required: true,
            validator: (rule, value, callback) => {
              const v = num(value);
              if (isNaN(v) || v < 0) {
                callback(new Error(this.$t('aiContext.tipToolResultMaxChars')));
                return;
              }
              callback();
            },
            trigger: 'change'
          }
        ],
        thinking_policy: [
          {
            required: true,
            validator: (rule, value, callback) => {
              if (['trim-all-but-last', 'keep'].indexOf(value) === -1) {
                callback(new Error(this.$t('aiContext.tipThinkingPolicy')));
                return;
              }
              callback();
            },
            trigger: 'change'
          }
        ],
        chars_per_token: [
          {
            required: true,
            validator: (rule, value, callback) => {
              const v = num(value);
              if (isNaN(v) || v < 1) {
                callback(new Error(this.$t('aiContext.tipCharsPerToken')));
                return;
              }
              callback();
            },
            trigger: 'change'
          }
        ],
        image_token_estimate: [
          {
            required: true,
            validator: (rule, value, callback) => {
              const v = num(value);
              if (isNaN(v) || v < 0) {
                callback(new Error(this.$t('aiContext.tipImageTokenEstimate')));
                return;
              }
              callback();
            },
            trigger: 'change'
          }
        ],
        rewrite_strength: [
          {
            required: true,
            validator: (rule, value, callback) => {
              if (['lite', 'full'].indexOf(value) === -1) {
                callback(new Error(this.$t('aiContext.tipRewriteStrength')));
                return;
              }
              callback();
            },
            trigger: 'change'
          }
        ],
        protected_survival_rate: [
          {
            required: true,
            validator: (rule, value, callback) => {
              const v = num(value);
              if (isNaN(v) || v <= 0 || v > 1) {
                callback(new Error(this.$t('aiContext.tipProtectedSurvivalRate')));
                return;
              }
              callback();
            },
            trigger: 'change'
          }
        ]
      }
    };
  },

  methods: {
    handleSubmit() {
      this.$refs.formData.validate(valid => {
        if (!valid) {
          this.$Message.error(this.$t('com.tipValidateError'));
          return;
        }
        this.$emit('submit', {
          trigger_ratio: Number(this.formData.trigger_ratio),
          keep_latest_images: Number(this.formData.keep_latest_images),
          tool_result_max_chars: Number(this.formData.tool_result_max_chars),
          thinking_policy: this.formData.thinking_policy,
          chars_per_token: Number(this.formData.chars_per_token),
          image_token_estimate: Number(this.formData.image_token_estimate),
          rewrite: {
            strength: this.formData.rewrite_strength,
            protected_survival_rate: Number(this.formData.protected_survival_rate)
          }
        });
      });
    }
  }
};
</script>