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
  <div class="rule-form">
    <Form
      ref="formData"
      :model="formData"
      :rules="ruleValidate"
      label-position="top"
    >
      <FormItem :label="$t('aiContext.condLabel')" prop="cond">
        <Expression
          :expression="formData.cond"
          :hide-groups="['response']"
          @expressionChanged="onExpressionChanged"
        />
      </FormItem>

      <FormItem :label="$t('aiContext.modeLabel')" prop="mode">
        <Select v-model="formData.mode" style="width: 100%;">
          <Option value="off">
            {{ $t('aiContext.modeOff') }}
          </Option>
          <Option value="conservative">
            {{ $t('aiContext.modeConservative') }}
          </Option>
          <Option value="balanced">
            {{ $t('aiContext.modeBalanced') }}
          </Option>
          <Option value="aggressive">
            {{ $t('aiContext.modeAggressive') }}
          </Option>
        </Select>
      </FormItem>

      <FormItem :label="$t('aiContext.maxTokensLabel')" prop="max_context_tokens">
        <InputNumber
          v-model="formData.max_context_tokens"
          :min="0"
          :step="1"
          placeholder="0"
          style="width: 100%;"
        />
      </FormItem>

      <FormItem :label="$t('aiContext.reserveTokensLabel')" prop="reserve_tokens">
        <InputNumber
          v-model="formData.reserve_tokens"
          :min="0"
          :step="1"
          placeholder="0"
          style="width: 100%;"
        />
      </FormItem>

      <FormItem class="com-btn-box drawer-footer">
        <Button type="primary" size="small" @click="handleSubmit">
          {{ $t('com.localSave') }}
        </Button>
        <Button size="small" style="margin-left: 8px;" @click="handleReset">
          {{ $t('com.reset') }}
        </Button>
      </FormItem>
    </Form>
  </div>
</template>

<script>
import Expression from '@/components/Expression';
import { cloneDeep } from 'lodash';

const MODES = ['off', 'conservative', 'balanced', 'aggressive'];

function buildDefaultRule() {
  return {
    cond: '',
    mode: 'off',
    max_context_tokens: null,
    reserve_tokens: null
  };
}

export default {
  name: 'RuleForm',

  components: { Expression },

  props: {
    rule: {
      type: Object,
      default: null
    }
  },

  data() {
    const validateCond = (rule, value, callback) => {
      if (this.formData.condErrmsg) {
        callback(new Error(this.formData.condErrmsg));
        return;
      }
      if (!value) {
        callback(new Error(this.$t('aiContext.tipCondRequired')));
        return;
      }
      callback();
    };

    const validateMode = (rule, value, callback) => {
      if (MODES.indexOf(value) === -1) {
        callback(new Error(this.$t('aiContext.tipModeInvalid')));
        return;
      }
      callback();
    };

    const validateNonNegative = (rule, value, callback, tipKey) => {
      if (value === '' || value === null || value === undefined) {
        callback();
        return;
      }
      if (Number(value) < 0) {
        callback(new Error(this.$t(tipKey)));
        return;
      }
      callback();
    };

    return {
      formData: {
        ...buildDefaultRule(),
        ...(cloneDeep(this.rule) || {}),
        condErrmsg: ''
      },
      ruleValidate: {
        cond: [
          {
            required: true,
            validator: validateCond,
            trigger: 'change'
          }
        ],
        mode: [
          {
            required: true,
            validator: validateMode,
            trigger: 'change'
          }
        ],
        max_context_tokens: [
          {
            validator: (rule, value, callback) =>
              validateNonNegative(rule, value, callback, 'aiContext.tipMaxTokensNegative'),
            trigger: 'change'
          }
        ],
        reserve_tokens: [
          {
            validator: (rule, value, callback) =>
              validateNonNegative(rule, value, callback, 'aiContext.tipReserveTokensNegative'),
            trigger: 'change'
          }
        ]
      }
    };
  },

  methods: {
    onExpressionChanged(data) {
      this.formData.cond = data.expression;
      this.formData.condErrmsg = data.errmsg || '';
      this.$refs.formData.validateField('cond');
    },

    handleSubmit() {
      this.$refs.formData.validate(valid => {
        if (!valid) {
          this.$Message.error(this.$t('com.tipValidateError'));
          return;
        }
        const data = {
          cond: this.formData.cond,
          mode: this.formData.mode
        };
        const maxTokens = Number(this.formData.max_context_tokens);
        const reserveTokens = Number(this.formData.reserve_tokens);
        if (maxTokens > 0) {
          data.max_context_tokens = maxTokens;
        }
        if (reserveTokens > 0) {
          data.reserve_tokens = reserveTokens;
        }
        this.$emit('submit', data);
      });
    },

    handleReset() {
      this.$refs.formData.resetFields();
      this.formData = {
        ...buildDefaultRule(),
        ...(cloneDeep(this.rule) || {}),
        condErrmsg: ''
      };
    }
  }
};
</script>