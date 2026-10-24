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
      <FormItem :label="$t('route.ruleName')" prop="name">
        <Input
          v-model="formData.name"
          :placeholder="$t('aiCache.namePlaceholder')"
        />
      </FormItem>

      <FormItem :label="$t('route.expression')" prop="cond">
        <Expression
          :expression="formData.cond"
          :hide-groups="['response']"
          @expressionChanged="onExpressionChanged"
        />
      </FormItem>

      <FormItem :label="$t('aiCache.colStrategy')" prop="cache_key_strategy">
        <Select v-model="formData.cache_key_strategy" style="width: 100%;">
          <Option value="lastQuestion">
            {{ $t('aiCache.strategyLastQuestion') }}
          </Option>
          <Option value="allQuestions">
            {{ $t('aiCache.strategyAllQuestions') }}
          </Option>
          <Option value="disabled">
            {{ $t('aiCache.strategyDisabled') }}
          </Option>
        </Select>
        <p v-if="formData.cache_key_strategy === 'disabled'" class="strategy-hint">
          {{ $t('aiCache.strategyDisabledHint') }}
        </p>
      </FormItem>

      <FormItem :label="$t('aiCache.ttlLabel')" prop="cache_ttl">
        <InputNumber
          v-model="formData.cache_ttl"
          :min="0"
          placeholder="0"
          style="width: 100%;"
        />
      </FormItem>

      <FormItem :label="$t('aiCache.maxBodyLabel')" prop="max_body_bytes">
        <InputNumber
          v-model="formData.max_body_bytes"
          :min="1"
          placeholder="1048576"
          style="width: 100%;"
        />
      </FormItem>

      <FormItem :label="$t('aiCache.maxValueLabel')" prop="max_value_bytes">
        <InputNumber
          v-model="formData.max_value_bytes"
          :min="1"
          placeholder="1048576"
          style="width: 100%;"
        />
      </FormItem>

      <FormItem :label="$t('aiCache.semanticLabel')" prop="enable_semantic_cache">
        <i-switch v-model="formData.enable_semantic_cache" />
        <span class="semantic-hint">{{ $t('aiCache.semanticSwitchHint') }}</span>
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

const DEFAULT_STRATEGY = 'lastQuestion';
const DEFAULT_BYTES = 1048576;

function buildDefaultRule() {
  return {
    name: '',
    cond: '',
    cache_key_strategy: DEFAULT_STRATEGY,
    cache_ttl: 0,
    max_body_bytes: DEFAULT_BYTES,
    max_value_bytes: DEFAULT_BYTES,
    enable_semantic_cache: false
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
    const validateName = (rule, value, callback) => {
      const name = String(value || '').trim();
      if (!name) {
        callback(new Error(this.$t('aiCache.tipNameRequired')));
        return;
      }
      if (name.length > 128) {
        callback(new Error(this.$t('aiCache.tipNameLength')));
        return;
      }
      callback();
    };

    const validateCond = (rule, value, callback) => {
      if (this.formData.condErrmsg) {
        callback(new Error(this.formData.condErrmsg));
        return;
      }
      if (!value) {
        callback(new Error(this.$t('aiCache.tipCondRequired')));
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
        name: [
          {
            required: true,
            validator: validateName,
            trigger: 'blur'
          }
        ],
        cond: [
          {
            required: true,
            validator: validateCond,
            trigger: 'change'
          }
        ],
        cache_ttl: [
          {
            validator: (rule, value, callback) => {
              if (value === '' || value === null || value === undefined) {
                callback(new Error(this.$t('aiCache.tipTtlNegative')));
                return;
              }
              if (Number(value) < 0) {
                callback(new Error(this.$t('aiCache.tipTtlNegative')));
                return;
              }
              callback();
            },
            trigger: 'change'
          }
        ],
        max_body_bytes: [
          {
            validator: (rule, value, callback) => {
              if (value === '' || value === null || value === undefined || Number(value) <= 0) {
                callback(new Error(this.$t('aiCache.tipMaxBodyPositive')));
                return;
              }
              callback();
            },
            trigger: 'change'
          }
        ],
        max_value_bytes: [
          {
            validator: (rule, value, callback) => {
              if (value === '' || value === null || value === undefined || Number(value) <= 0) {
                callback(new Error(this.$t('aiCache.tipMaxValuePositive')));
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
        this.$emit('submit', {
          name: (this.formData.name || '').trim(),
          cond: this.formData.cond,
          cache_key_strategy: this.formData.cache_key_strategy || DEFAULT_STRATEGY,
          cache_ttl: Number(this.formData.cache_ttl) || 0,
          max_body_bytes: Number(this.formData.max_body_bytes),
          max_value_bytes: Number(this.formData.max_value_bytes),
          enable_semantic_cache: !!this.formData.enable_semantic_cache
        });
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

<style lang="less" scoped>
.strategy-hint {
  color: #fabc04;
  font-size: 12px;
  line-height: 1.6;
  margin-top: 6px;
}

.semantic-hint {
  color: #999;
  font-size: 12px;
  margin-left: 8px;
}
</style>