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
          :placeholder="$t('trafficMirror.namePlaceholder')"
        />
      </FormItem>

      <FormItem :label="$t('trafficMirror.condLabel')" prop="cond">
        <Expression
          :expression="formData.cond"
          :hide-groups="['response']"
          @expressionChanged="onExpressionChanged"
        />
      </FormItem>

      <FormItem :label="$t('trafficMirror.clusterLabel')" prop="mirror_cluster">
        <Select
          v-model="formData.mirror_cluster"
          :placeholder="$t('trafficMirror.clusterPlaceholder')"
          style="width: 100%;"
        >
          <Option
            v-for="cluster in clusters"
            :key="cluster.name"
            :value="cluster.name"
          >
            {{ cluster.name }}
          </Option>
        </Select>
      </FormItem>

      <FormItem :label="$t('trafficMirror.percentageLabel')" prop="percentage">
        <InputNumber
          v-model="formData.percentage"
          :min="0"
          :max="100"
          placeholder="100"
          style="width: 100%;"
        />
      </FormItem>

      <FormItem :label="$t('trafficMirror.headerLabel')">
        <Select v-model="formData.headerMode" style="width: 100%;">
          <Option value="default">
            {{ $t('trafficMirror.headerModeDefault') }}
          </Option>
          <Option value="none">
            {{ $t('trafficMirror.headerModeNone') }}
          </Option>
          <Option value="custom">
            {{ $t('trafficMirror.headerModeCustom') }}
          </Option>
        </Select>
        <Input
          v-if="formData.headerMode === 'custom'"
          v-model="formData.removeHeadersText"
          :placeholder="$t('trafficMirror.headerCustomPlaceholder')"
          style="margin-top: 8px;"
        />
      </FormItem>

      <FormItem :label="$t('trafficMirror.setHeadersLabel')">
        <div
          v-for="(item, index) in formData.setHeaders"
          :key="`h-${index}`"
          class="tm-kv-row"
        >
          <Input
            v-model="item.key"
            :placeholder="$t('trafficMirror.headerKeyPlaceholder')"
            style="flex: 1;"
          />
          <Input
            v-model="item.value"
            :placeholder="$t('trafficMirror.headerValuePlaceholder')"
            style="flex: 1;"
          />
          <Button
            type="error"
            size="small"
            @click="removeSetHeader(index)"
          >
            {{ $t('com.del') }}
          </Button>
        </div>
        <div v-if="!formData.setHeaders.length" class="list-empty">
          {{ $t('trafficMirror.emptyHeaders') }}
        </div>
        <div style="margin-top: 8px;">
          <Button size="small" @click="addSetHeader">
            {{ $t('trafficMirror.addHeader') }}
          </Button>
        </div>
      </FormItem>

      <FormItem :label="$t('trafficMirror.bodyRewritesLabel')">
        <div
          v-for="(item, index) in formData.bodyRewrites"
          :key="`b-${index}`"
          class="tm-body-row"
        >
          <Select v-model="item.path" style="max-width: 180px;">
            <Option value="model">model</Option>
          </Select>
          <Input
            v-model="item.value"
            :placeholder="$t('trafficMirror.bodyValuePlaceholder')"
            style="flex: 1;"
          />
          <Button
            type="error"
            size="small"
            @click="removeBodyRewrite(index)"
          >
            {{ $t('com.del') }}
          </Button>
        </div>
        <div v-if="!formData.bodyRewrites.length" class="list-empty">
          {{ $t('trafficMirror.emptyBodyRewrites') }}
        </div>
        <div style="margin-top: 8px;">
          <Button size="small" @click="addBodyRewrite">
            {{ $t('trafficMirror.addBodyRewrite') }}
          </Button>
        </div>
      </FormItem>

      <FormItem :label="$t('trafficMirror.pathRewriteLabel')" prop="path_rewrite">
        <Input
          v-model="formData.path_rewrite"
          :placeholder="$t('trafficMirror.pathRewritePlaceholder')"
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

function headerModeOf(row) {
  if (!row || row.remove_headers === null || row.remove_headers === undefined) {
    return 'default';
  }
  if (Array.isArray(row.remove_headers) && row.remove_headers.length === 0) {
    return 'none';
  }
  return 'custom';
}

export default {
  name: 'RuleForm',

  components: { Expression },

  props: {
    rule: {
      type: Object,
      default: null
    },
    clusters: {
      type: Array,
      default() {
        return [];
      }
    }
  },

  data() {
    const validateName = (rule, value, callback) => {
      const name = String(value || '').trim();
      if (!name) {
        callback(new Error(this.$t('trafficMirror.tipNameRequired')));
        return;
      }
      if (name.length > 128) {
        callback(new Error(this.$t('trafficMirror.tipNameLength')));
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
        callback(new Error(this.$t('trafficMirror.tipCondRequired')));
        return;
      }
      callback();
    };

    return {
      formData: this.buildFormData(cloneDeep(this.rule) || null),
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
        mirror_cluster: [
          {
            required: true,
            message: this.$t('trafficMirror.tipClusterRequired'),
            trigger: 'change'
          }
        ],
        percentage: [
          {
            validator: (rule, value, callback) => {
              if (value === '' || value === null || value === undefined) {
                callback(new Error(this.$t('trafficMirror.tipPercentageRange')));
                return;
              }
              const num = Number(value);
              if (isNaN(num) || num < 0 || num > 100) {
                callback(new Error(this.$t('trafficMirror.tipPercentageRange')));
                return;
              }
              callback();
            },
            trigger: 'change'
          }
        ],
        path_rewrite: [
          {
            validator: (rule, value, callback) => {
              const text = (value || '').trim();
              if (text && text.charAt(0) !== '/') {
                callback(new Error(this.$t('trafficMirror.tipPathRewriteSlash')));
                return;
              }
              callback();
            },
            trigger: 'blur'
          }
        ]
      }
    };
  },

  methods: {
    buildFormData(row) {
      const headerMode = headerModeOf(row);
      return {
        name: row ? row.name || '' : '',
        cond: row ? row.cond || '' : '',
        mirror_cluster:
          row && row.mirror_cluster
            ? row.mirror_cluster
            : (this.clusters[0] && this.clusters[0].name) || '',
        percentage: row && row.percentage !== null && row.percentage !== undefined
          ? row.percentage
          : 100,
        headerMode,
        removeHeadersText:
          headerMode === 'custom' ? (row.remove_headers || []).join(',') : '',
        setHeaders: Object.keys((row && row.set_headers) || {}).map(key => ({
          key,
          value: row.set_headers[key]
        })),
        bodyRewrites: cloneDeep((row && row.body_rewrites) || []),
        path_rewrite: row ? row.path_rewrite || '' : '',
        condErrmsg: ''
      };
    },

    onExpressionChanged(data) {
      this.formData.cond = data.expression;
      this.formData.condErrmsg = data.errmsg || '';
      this.$refs.formData.validateField('cond');
    },

    addSetHeader() {
      this.formData.setHeaders.push({ key: '', value: '' });
    },

    removeSetHeader(index) {
      this.formData.setHeaders.splice(index, 1);
    },

    addBodyRewrite() {
      this.formData.bodyRewrites.push({ path: 'model', value: '' });
    },

    removeBodyRewrite(index) {
      this.formData.bodyRewrites.splice(index, 1);
    },

    buildSetHeaders() {
      const map = {};
      this.formData.setHeaders.forEach(item => {
        map[String(item.key).trim()] = String(item.value).trim();
      });
      return map;
    },

    handleSubmit() {
      this.$refs.formData.validate(valid => {
        if (!valid) {
          this.$Message.error(this.$t('com.tipValidateError'));
          return;
        }

        const headerInvalid = this.formData.setHeaders.some(
          item => !String(item.key || '').trim() || !String(item.value || '').trim()
        );
        if (headerInvalid) {
          this.$Message.error(this.$t('trafficMirror.tipHeaderKvRequired'));
          return;
        }

        const bodyInvalid = this.formData.bodyRewrites.some(
          item => !String(item.value || '').trim()
        );
        if (bodyInvalid) {
          this.$Message.error(this.$t('trafficMirror.tipBodyValueRequired'));
          return;
        }

        const data = {
          name: (this.formData.name || '').trim(),
          cond: this.formData.cond,
          mirror_cluster: this.formData.mirror_cluster,
          percentage: Number(this.formData.percentage),
          set_headers: this.buildSetHeaders(),
          body_rewrites: this.formData.bodyRewrites.map(item => ({
            path: item.path,
            value: String(item.value).trim()
          })),
          path_rewrite: (this.formData.path_rewrite || '').trim()
        };

        if (this.formData.headerMode === 'none') {
          data.remove_headers = [];
        } else if (this.formData.headerMode === 'custom') {
          const list = (this.formData.removeHeadersText || '')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
          if (!list.length) {
            this.$Message.error(this.$t('trafficMirror.tipRemoveHeadersEmpty'));
            return;
          }
          data.remove_headers = list;
        }

        this.$emit('submit', data);
      });
    },

    handleReset() {
      this.$refs.formData.resetFields();
      this.formData = this.buildFormData(cloneDeep(this.rule) || null);
    }
  }
};
</script>

<style lang="less" scoped>
.tm-kv-row,
.tm-body-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.list-empty {
  color: #808695;
  font-size: 12px;
  padding: 8px 0;
}
</style>