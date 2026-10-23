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
          :disabled="readonly"
          :placeholder="$t('route.ruleNamePlaceholder')"
        />
      </FormItem>

      <FormItem :label="$t('route.expression')" prop="cond">
        <Expression
          :expression="formData.cond"
          :readonly="readonly"
          :hide-groups="['response']"
          @expressionChanged="onExpressionChanged"
        />
      </FormItem>

      <div class="section-title required">
        <span class="required-mark">*</span>
        {{ $t('route.targetClusterAndModel') }}
      </div>
      <div
        v-for="(target, index) in formData.targets"
        :key="`target-${index}`"
        class="dynamic-row target-row"
      >
        <Row :gutter="8" type="flex" align="middle">
          <Col span="2" class="field-label">{{ $t('route.cluster') }}</Col>
          <Col span="5">
            <FormItem
              :prop="`targets.${index}.cluster_name`"
              :rules="targetClusterRules"
              class="inline-form-item"
            >
              <Select
                v-model="target.cluster_name"
                :disabled="readonly"
                :placeholder="$t('route.selectTargetCluster')"
                filterable
                @on-change="onTargetClusterChange(index)"
              >
                <Option
                  v-for="cluster in getClusters(index, 'target')"
                  :key="cluster.name"
                  :value="cluster.name"
                  :label="cluster.name"
                />
              </Select>
            </FormItem>
          </Col>
          <Col span="2" class="field-label">{{ $t('route.model') }}</Col>
          <Col span="9">
            <FormItem
              :prop="`targets.${index}.model`"
              :rules="targetModelRules"
              class="inline-form-item"
            >
              <Select
                v-model="target.model"
                :disabled="readonly"
                :placeholder="$t('route.modelTransparent')"
                filterable
                allow-create
                clearable
              >
                <Option
                  v-for="model in getModelsByCluster(target.cluster_name, index, 'target')"
                  :key="model"
                  :value="model"
                  :label="model"
                />
              </Select>
            </FormItem>
          </Col>
          <Col span="2" class="field-label">{{ $t('route.weight') }}</Col>
          <Col span="2">
            <FormItem
              :prop="`targets.${index}.weight`"
              :rules="targetweightRules"
              class="inline-form-item"
            >
              <InputNumber
                v-model="target.weight"
                :disabled="readonly"
                :min="0"
                :max="100"
                :placeholder="$t('route.weight')"
                style="width: 100%;"
              />
            </FormItem>
          </Col>
          <Col span="2" class="delete-col">
            <Button
              v-if="!readonly && formData.targets.length > 1"
              class="delete-btn"
              size="small"
              @click="removeTarget(index)"
            >
              {{ $t('com.del') }}
            </Button>
          </Col>
        </Row>
      </div>
      <div v-if="!readonly" class="add-btn-row">
        <Button size="small" class="add-btn" @click="addTarget">
          + {{ $t('route.addTarget') }}
        </Button>
      </div>
      <p v-if="!readonly && weightError" class="weight-error">
        {{ $t('route.weightSumError') }}
      </p>

      <div class="section-title">
        {{ $t('route.fallbackClusterAndModel') }}
      </div>
      <p v-if="!(formData.fallbacks || []).length" class="no-backup-tip">
        {{ $t('route.noBackup') }}
      </p>
      <div
        v-for="(fallback, index) in formData.fallbacks"
        :key="`fallback-${index}`"
        class="dynamic-row fallback-row"
      >
        <Row :gutter="8" type="flex" align="middle">
          <Col span="2" class="field-label">{{ $t('route.cluster') }}</Col>
          <Col span="7">
            <FormItem
              :prop="`fallbacks.${index}.cluster_name`"
              :rules="fallbackClusterRules"
              class="inline-form-item"
            >
              <Select
                v-model="fallback.cluster_name"
                :disabled="readonly"
                :placeholder="$t('route.selectTargetCluster')"
                filterable
                @on-change="onFallbackClusterChange(index)"
              >
                <Option
                  v-for="cluster in getClusters(index, 'fallback')"
                  :key="cluster.name"
                  :value="cluster.name"
                  :label="cluster.name"
                />
              </Select>
            </FormItem>
          </Col>
          <Col span="2" class="field-label">{{ $t('route.model') }}</Col>
          <Col span="11">
            <FormItem
              :prop="`fallbacks.${index}.model`"
              :rules="fallbackModelRules"
              class="inline-form-item"
            >
              <Select
                v-model="fallback.model"
                :disabled="readonly"
                :placeholder="$t('route.modelTransparent')"
                filterable
                allow-create
                clearable
              >
                <Option
                  v-for="model in getModelsByCluster(fallback.cluster_name, index, 'fallback')"
                  :key="model"
                  :value="model"
                  :label="model"
                />
              </Select>
            </FormItem>
          </Col>
          <Col span="2" class="delete-col">
            <Button
              v-if="!readonly"
              class="delete-btn"
              size="small"
              @click="removeFallback(index)"
            >
              {{ $t('com.del') }}
            </Button>
          </Col>
        </Row>
      </div>
      <div v-if="!readonly" class="add-btn-row">
        <Button size="small" class="add-btn" @click="addFallback">
          + {{ $t('route.addFallback') }}
        </Button>
      </div>

      <FormItem class="com-btn-box drawer-footer">
        <Button
          v-if="!readonly"
          type="primary"
          size="small"
          @click="handleSubmit"
        >
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

const defaultTarget = { cluster_name: '', model: '', weight: 0 };
const defaultFallback = { cluster_name: '', model: '' };

export default {
  name: 'RuleForm',

  components: { Expression },

  props: {
    rule: {
      type: Object,
      required: true
    },
    clusters: {
      type: Array,
      default() {
        return [];
      }
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },

  data() {
    const validateCond = (rule, value, callback) => {
      if (this.formData.condErrmsg) {
        callback(new Error(this.formData.condErrmsg));
        return;
      }
      if (!value) {
        callback(new Error(this.$t('com.tipNotEmptyX', { obj: this.$t('route.expression') })));
        return;
      }
      callback();
    };

    return {
      formData: {
        ...cloneDeep(this.rule),
        condErrmsg: ''
      },
      weightError: false,
      modelServices: [],
      targetClusterRules: [
        {
          required: true,
          message: this.$t('com.tipNotEmptyX', { obj: this.$t('route.cluster') }),
          trigger: 'change'
        }
      ],
      fallbackClusterRules: [
        {
          required: true,
          message: this.$t('com.tipNotEmptyX', { obj: this.$t('route.cluster') }),
          trigger: 'change'
        }
      ],
      targetweightRules: [
        {
          validator: (rule, value, callback) => {
            if (value === '' || value === null || value === undefined) {
              callback(new Error(this.$t('com.tipNotEmptyX', { obj: this.$t('route.weight') })));
              return;
            }
            const num = Number(value);
            if (Number.isNaN(num) || num < 0 || num > 100) {
              callback(new Error(this.$t('route.weightRangeError')));
              return;
            }
            callback();
          },
          trigger: 'change'
        }
      ],
      targetModelRules: [
        {
          validator: this.validateTargetModelUnique,
          trigger: 'change'
        }
      ],
      fallbackModelRules: [
        {
          validator: this.validateFallbackModelUnique,
          trigger: 'change'
        }
      ],
      ruleValidate: {
        name: [
          {
            required: true,
            message: this.$t('com.tipNotEmptyX', { obj: this.$t('route.ruleName') }),
            trigger: 'blur'
          },
          {
            min: 1,
            max: 64,
            message: this.$t('route.ruleNameLengthError'),
            trigger: 'blur'
          },
          {
            pattern: /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,62}[a-zA-Z0-9])?$/,
            message: this.$t('route.ruleNameFormatError'),
            trigger: 'blur'
          }
        ],
        cond: [
          {
            required: true,
            validator: validateCond,
            trigger: 'change'
          }
        ]
      }
    };
  },

  watch: {
    rule: {
      handler(newVal) {
        const data = cloneDeep(newVal) || {};
        if (!data.fallbacks) {
          data.fallbacks = [];
        }
        this.formData = {
          ...data,
          condErrmsg: ''
        };
      },
      deep: true,
      immediate: true
    }
  },

  mounted() {
    this.fetchModelServices();
  },

  methods: {
    onExpressionChanged(data) {
      this.formData.cond = data.expression;
      this.formData.condErrmsg = data.errmsg || '';
      this.$refs.formData.validateField('cond');
    },

    addTarget() {
      this.formData.targets.push(cloneDeep(defaultTarget));
    },

    removeTarget(index) {
      this.formData.targets.splice(index, 1);
    },

    addFallback() {
      if (!Array.isArray(this.formData.fallbacks)) {
        this.$set(this.formData, 'fallbacks', []);
      }
      this.formData.fallbacks.push(cloneDeep(defaultFallback));
    },

    removeFallback(index) {
      this.formData.fallbacks.splice(index, 1);
    },

    validateweight() {
      const sum = (this.formData.targets || []).reduce((acc, t) => acc + (Number(t.weight) || 0), 0);
      this.weightError = sum !== 100;
      return !this.weightError;
    },

    validateDuplicate() {
      const targets = this.formData.targets || [];
      const targetKeys = targets.map(t => `${t.cluster_name || ''}|${t.model || ''}`);
      const targetDup = targetKeys.find((key, idx) => targetKeys.indexOf(key) !== idx);
      if (targetDup) {
        this.$Message.error(this.$t('route.targetDuplicate'));
        return false;
      }
      return true;
    },

    validateFallbackDuplicate() {
      const fallbacks = this.formData.fallbacks || [];
      const fallbackKeys = fallbacks.map(f => `${f.cluster_name || ''}|${f.model || ''}`);
      const fallbackDup = fallbackKeys.find((key, idx) => fallbackKeys.indexOf(key) !== idx);
      if (fallbackDup) {
        this.$Message.error(this.$t('route.fallbackDuplicate'));
        return false;
      }
      return true;
    },

    getClusters(/* currentIndex, type */) {
      // Allow selecting the same cluster for multiple targets as long as (cluster_name, model) is unique
      return this.clusters || [];
    },

    getModelsByCluster(clusterName) {
      if (!clusterName) return [];
      const service = (this.modelServices || []).find(s => s.cluster_name === clusterName);
      return service && service.models ? service.models : [];
    },

    fetchModelServices() {
      this.$request({
        url: 'clusters',
        method: 'get',
        openapi: true
      }).then(data => {
        if (data.status === 200) {
          const clusters = data.data.Data || [];
          this.modelServices = clusters
            .filter(cluster => cluster.llm_config && cluster.llm_config.models && cluster.llm_config.models.length > 0)
            .map(cluster => ({
              cluster_name: cluster.name,
              models: cluster.llm_config.models
            }));
        }
      }).catch(() => {
        this.modelServices = [];
      });
    },

    onTargetClusterChange(index) {
      const target = this.formData.targets[index];
      if (target) {
        target.model = '';
      }
    },

    onFallbackClusterChange(index) {
      const fallback = this.formData.fallbacks[index];
      if (fallback) {
        fallback.model = '';
      }
    },

    getTargetModelIndex(field) {
      const match = field.match(/targets\.(\d+)\.model/);
      return match ? parseInt(match[1], 10) : -1;
    },

    getFallbackModelIndex(field) {
      const match = field.match(/fallbacks\.(\d+)\.model/);
      return match ? parseInt(match[1], 10) : -1;
    },

    // 仅列表内重复会走这里：targets / fallbacks 各自去重，互不比较（issue #128）
    getDuplicateErrorMessage(clusterName, model, currentType) {
      const modelText = model || this.$t('route.modelTransparent') || '-';
      const msgKey = currentType === 'target' ? 'route.targetDuplicate' : 'route.fallbackDuplicate';
      return `${this.$t(msgKey)}：${clusterName} / ${modelText}`;
    },

    validateTargetModelUnique(rule, value, callback) {
      const index = this.getTargetModelIndex(rule.field);
      if (index < 0) {
        callback();
        return;
      }
      const current = this.formData.targets[index];
      if (!current || !current.cluster_name) {
        callback();
        return;
      }
      const currentKey = `${current.cluster_name}|${value || ''}`;

      // 与其他目标比较
      const duplicateTarget = this.formData.targets.find((item, idx) => {
        if (idx === index) return false;
        if (!item.cluster_name) return false;
        return `${item.cluster_name}|${item.model || ''}` === currentKey;
      });
      if (duplicateTarget) {
        callback(new Error(this.getDuplicateErrorMessage(duplicateTarget.cluster_name, duplicateTarget.model, 'target')));
        return;
      }

      // 与备用集群不做跨列表比较：targets / fallbacks 各自列表内去重即可（issue #128）

      callback();
    },

    validateFallbackModelUnique(rule, value, callback) {
      const index = this.getFallbackModelIndex(rule.field);
      if (index < 0) {
        callback();
        return;
      }
      const current = this.formData.fallbacks[index];
      if (!current || !current.cluster_name) {
        callback();
        return;
      }
      const currentKey = `${current.cluster_name}|${value || ''}`;

      // 与其他备用比较
      const duplicateFallback = this.formData.fallbacks.find((item, idx) => {
        if (idx === index) return false;
        if (!item.cluster_name) return false;
        return `${item.cluster_name}|${item.model || ''}` === currentKey;
      });
      if (duplicateFallback) {
        callback(new Error(this.getDuplicateErrorMessage(duplicateFallback.cluster_name, duplicateFallback.model, 'fallback')));
        return;
      }

      // 与目标集群不做跨列表比较：targets / fallbacks 各自列表内去重即可（issue #128）

      callback();
    },

    handleSubmit() {
      this.$refs.formData.validate(valid => {
        if (!valid) {
          this.$Message.error(this.$t('com.tipValidateError'));
          return;
        }
        if (!this.validateweight()) {
          this.$Message.error(this.$t('route.weightSumError'));
          return;
        }
        if (!this.validateDuplicate()) {
          return;
        }
        if (!this.validateFallbackDuplicate()) {
          return;
        }
        if (!this.formData.targets || this.formData.targets.length === 0) {
          this.$Message.error(this.$t('route.targetAtLeastOne'));
          return;
        }
        const result = cloneDeep(this.formData);
        delete result.condErrmsg;
        if (!Array.isArray(result.fallbacks)) {
          result.fallbacks = [];
        }
        this.$emit('submit', result);
      });
    },

    handleReset() {
      this.$refs.formData.resetFields();
      const data = cloneDeep(this.rule) || {};
      if (!data.fallbacks) {
        data.fallbacks = [];
      }
      this.formData = {
        ...data,
        condErrmsg: ''
      };
    }
  }
};
</script>

<style lang="less" scoped>
.rule-form {
  .section-title {
    font-weight: bold;
    margin-bottom: 8px;

    &.required {
      .required-mark {
        color: #ed4014;
        margin-right: 4px;
      }
    }
  }

  .dynamic-row {
    margin-bottom: 24px;
  }

  .inline-form-item {
    margin-bottom: 0;
  }

  .target-row,
  .fallback-row {
    .field-label {
      text-align: right;
      line-height: 32px;
      padding-right: 4px;
      white-space: nowrap;
    }

    .delete-col {
      text-align: right;

      .delete-btn {
        background-color: #ffccc7;
        border-color: #ffccc7;
        color: #a8071a;

        &:hover {
          background-color: #ffa39e;
          border-color: #ffa39e;
        }
      }
    }
  }

  .add-btn-row {
    margin-top: 18px;
    margin-bottom: 8px;
    padding-left: calc(2 / 24 * 100% + 4px);

    .add-btn {
      background: #fff;
      border: 1px solid #dcdee2;
      color: #515a6e;
    }
  }

  .weight-error {
    color: #ed4014;
    margin-top: 8px;
  }

  .no-backup-tip {
    color: #999;
    font-size: 14px;
    margin-bottom: 8px;
  }

  .footer-divider {
    border-top: 1px solid #e8eaec;
    margin-top: 24px;
    margin-bottom: 16px;
  }

  .footer-bar {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
