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
  <div class="ai-cache">
    <Tabs v-model="activeTab" :animated="false">
      <TabPane :label="$t('aiCache.tabRules')" name="rules">
        <div class="route-editor-header">
          <div class="route-owner-label">
            {{ $t('aiCache.pageTitle') }}
          </div>
          <div class="route-header-actions">
            <Button
              v-show="mode === 'edit'"
              v-has
              size="small"
              type="primary"
              @click="onAddRule"
            >
              {{ $t('aiCache.addRule') }}
            </Button>
          </div>
          <div v-has class="route-header-submit">
            <template v-if="mode === 'view'">
              <Button size="small" type="primary" @click="enterEditMode">
                {{ $t('route.enterEditMode') }}
              </Button>
            </template>
            <template v-else>
              <Button size="small" @click="exitEditMode">
                {{ $t('route.exitEditMode') }}
              </Button>
              <Button
                size="small"
                type="success"
                :loading="submitting"
                :disabled="!isDirty"
                @click="submitRules"
              >
                {{ $t('com.submitAndEffect') }}
              </Button>
            </template>
          </div>
        </div>

        <pageTable
          ref="ruleTable"
          :columns="ruleColumns"
          :tableData="rules"
          :loading="loading"
          :draggable="mode === 'edit'"
          @dragDrop="onRuleDragDrop"
        />

        <div v-if="mode === 'edit'" class="drag-tip">
          {{ $t('aiCache.dragToChangeOrder') }}
        </div>
      </TabPane>

      <TabPane :label="$t('aiCache.tabSemantic')" name="semantic">
        <div class="route-editor-header">
          <div class="route-owner-label">
            {{ $t('aiCache.semanticSubtitle') }}
          </div>
          <div v-has class="route-header-submit">
            <template v-if="semanticMode === 'view'">
              <Button size="small" type="primary" @click="enterSemanticEditMode">
                {{ $t('com.edit') }}
              </Button>
            </template>
            <template v-else>
              <Button size="small" @click="cancelSemanticEditMode">
                {{ $t('com.cancel') }}
              </Button>
              <Button
                size="small"
                type="success"
                :loading="submittingSemantic"
                @click="saveSemantic"
              >
                {{ $t('com.save') }}
              </Button>
            </template>
          </div>
        </div>

        <Card :title="$t('aiCache.semanticCardTitle')" class="form-card">
          <div v-if="semanticMode === 'view'" class="semantic-view">
            <div class="info-row">
              <span class="info-label">{{ $t('aiCache.viewTopK') }}</span>
              <span class="info-value">{{ semantic.top_k }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('aiCache.viewThreshold') }}</span>
              <span class="info-value">{{ semantic.threshold }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('aiCache.viewThresholdRelation') }}</span>
              <span class="info-value">{{ relationLabel(semantic.threshold_relation) }}</span>
            </div>
          </div>

          <Form
            v-else
            ref="semanticForm"
            :model="semanticForm"
            :rules="semanticRules"
            label-position="top"
          >
            <FormItem :label="$t('aiCache.topKLabel')" prop="top_k">
              <InputNumber
                v-model="semanticForm.top_k"
                :min="1"
                :max="10"
                :step="1"
                style="width: 220px;"
              />
            </FormItem>

            <FormItem :label="$t('aiCache.thresholdLabel')" prop="threshold">
              <InputNumber
                v-model="semanticForm.threshold"
                :min="0"
                :max="2"
                :step="0.01"
                style="width: 220px;"
              />
            </FormItem>

            <FormItem :label="$t('aiCache.thresholdRelationLabel')" prop="threshold_relation">
              <Select v-model="semanticForm.threshold_relation" transfer style="width: 220px;">
                <Option value="lt">
                  {{ $t('aiCache.relationLt') }}
                </Option>
                <Option value="lte">
                  {{ $t('aiCache.relationLte') }}
                </Option>
                <Option value="gt">
                  {{ $t('aiCache.relationGt') }}
                </Option>
                <Option value="gte">
                  {{ $t('aiCache.relationGte') }}
                </Option>
              </Select>
            </FormItem>
          </Form>
        </Card>
      </TabPane>
    </Tabs>

    <Drawer
      v-model="viewVisible"
      :title="$t('aiCache.viewTitle')"
      :width="60"
      :mask-closable="true"
      @on-close="currentRule = null"
    >
      <RuleView
        v-if="viewVisible && currentRule"
        :rule="currentRule"
      />
    </Drawer>

    <Drawer
      v-model="formVisible"
      :title="formTitle"
      :width="60"
      :mask-closable="false"
    >
      <RuleForm
        v-if="formVisible"
        :rule="currentRule"
        @submit="onFormSubmit"
      />
    </Drawer>
  </div>
</template>

<script>
import pageTable from '@/components/table/pageTable';
import RuleForm from './components/RuleForm.vue';
import RuleView from './components/RuleView.vue';
import { cloneDeep } from 'lodash';

const RELATIONS = ['lt', 'lte', 'gt', 'gte'];

const DEFAULT_SEMANTIC = {
  top_k: 1,
  threshold: 0.15,
  threshold_relation: 'lt'
};

export default {
  name: 'AICache',

  components: {
    pageTable,
    RuleForm,
    RuleView
  },

  data() {
    const that = this;
    const validInt = (min, max, tipKey) => (rule, value, callback) => {
      const v = Number(value);
      if (
        value === '' ||
        value === null ||
        value === undefined ||
        isNaN(v) ||
        !Number.isInteger(v) ||
        v < min ||
        v > max
      ) {
        callback(new Error(this.$t(tipKey)));
        return;
      }
      callback();
    };
    const validFloat = (min, max, tipKey) => (rule, value, callback) => {
      const v = Number(value);
      if (value === '' || value === null || value === undefined || isNaN(v) || v < min || v > max) {
        callback(new Error(this.$t(tipKey)));
        return;
      }
      callback();
    };
    return {
      activeTab: 'rules',
      loading: false,
      submitting: false,
      rules: [],
      originalRows: null,
      mode: 'view',
      viewVisible: false,
      formVisible: false,
      formMode: 'add',
      currentRule: null,
      currentRuleIndex: -1,
      ruleColumns: that.buildRuleColumns(),
      submittingSemantic: false,
      semantic: cloneDeep(DEFAULT_SEMANTIC),
      semanticForm: cloneDeep(DEFAULT_SEMANTIC),
      semanticMode: 'view',
      semanticRules: {
        top_k: [
          {
            required: true,
            validator: validInt(1, 10, 'aiCache.tipTopKRange'),
            trigger: 'change'
          }
        ],
        threshold: [
          {
            required: true,
            validator: validFloat(0, 2, 'aiCache.tipThresholdRange'),
            trigger: 'change'
          }
        ],
        threshold_relation: [
          {
            required: true,
            validator: (rule, value, callback) => {
              if (RELATIONS.indexOf(value) === -1) {
                callback(new Error(this.$t('aiCache.tipRelationInvalid')));
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

  computed: {
    isDirty() {
      if (this.mode !== 'edit' || this.originalRows === null) {
        return false;
      }
      return JSON.stringify(this.rules) !== JSON.stringify(this.originalRows);
    },

    formTitle() {
      return this.formMode === 'edit'
        ? this.$t('aiCache.editTitle')
        : this.$t('aiCache.addTitle');
    }
  },

  watch: {
    mode() {
      this.ruleColumns = this.buildRuleColumns();
    }
  },

  beforeRouteLeave(to, from, next) {
    if (this.mode === 'edit' && this.isDirty) {
      this.$Modal.confirm({
        title: this.$t('com.informationTips'),
        content: this.$t('aiCache.exitConfirm'),
        onOk: () => next(),
        onCancel: () => next(false)
      });
      return;
    }
    next();
  },

  methods: {
    buildRuleColumns() {
      const that = this;
      return [
        {
          title: that.$t('route.ruleName'),
          key: 'name',
          minWidth: 160,
          sortable: 'custom',
          searchable: true,
          render(h, params) {
            return h('span', params.row.name || '-');
          }
        },
        {
          title: that.$t('route.expression'),
          key: 'cond',
          minWidth: 260,
          sortable: 'custom',
          searchable: true,
          render(h, params) {
            return h('span', params.row.cond || '-');
          }
        },
        {
          title: that.$t('aiCache.colStrategy'),
          key: 'cache_key_strategy',
          minWidth: 180,
          sortable: 'custom',
          searchable: true,
          searchType: 'select',
          searchFilters: [
            { label: 'lastQuestion', value: 'lastQuestion' },
            { label: 'allQuestions', value: 'allQuestions' },
            { label: 'disabled', value: 'disabled' }
          ],
          render(h, params) {
            const strategy = params.row.cache_key_strategy;
            const label = that.strategyLabel(strategy);
            return h(
              'Tag',
              { props: { color: strategy === 'disabled' ? 'warning' : 'primary' } },
              label
            );
          }
        },
        {
          title: that.$t('aiCache.colTtl'),
          key: 'cache_ttl',
          minWidth: 130,
          sortable: 'custom',
          render(h, params) {
            return h('span', that.formatTtl(params.row.cache_ttl));
          }
        },
        {
          title: that.$t('aiCache.colMaxBody'),
          key: 'max_body_bytes',
          minWidth: 130,
          sortable: 'custom',
          render(h, params) {
            return h('span', that.formatBytes(params.row.max_body_bytes));
          }
        },
        {
          title: that.$t('aiCache.colMaxValue'),
          key: 'max_value_bytes',
          minWidth: 130,
          sortable: 'custom',
          render(h, params) {
            return h('span', that.formatBytes(params.row.max_value_bytes));
          }
        },
        {
          title: that.$t('aiCache.colSemantic'),
          key: 'enable_semantic_cache',
          minWidth: 110,
          render(h, params) {
            const enabled = !!params.row.enable_semantic_cache;
            return h(
              'Tag',
              { props: { color: enabled ? 'success' : 'default' } },
              enabled ? that.$t('aiCache.semanticOn') : that.$t('aiCache.semanticOff')
            );
          }
        },
        {
          title: that.$t('com.operation'),
          key: 'action',
          width: 220,
          render(h, params) {
            const row = params.row;
            if (that.mode === 'view') {
              return h(
                'Button',
                {
                  props: { size: 'small', type: 'primary' },
                  on: { click: () => that.onViewRule(row) }
                },
                that.$t('com.see')
              );
            }
            return h('div', [
              h(
                'Button',
                {
                  props: { size: 'small', type: 'primary' },
                  directives: [{ name: 'has' }],
                  style: { marginRight: '8px' },
                  on: { click: () => that.onEditRule(row) }
                },
                that.$t('com.edit')
              ),
              h(
                'Button',
                {
                  props: { size: 'small', type: 'error' },
                  directives: [{ name: 'has' }],
                  on: { click: () => that.onDeleteRule(row) }
                },
                that.$t('com.del')
              )
            ]);
          }
        }
      ];
    },

    strategyLabel(strategy) {
      const map = {
        lastQuestion: this.$t('aiCache.strategyLastQuestion'),
        allQuestions: this.$t('aiCache.strategyAllQuestions'),
        disabled: this.$t('aiCache.strategyDisabled')
      };
      return map[strategy] || strategy || '-';
    },

    relationLabel(relation) {
      const map = {
        lt: this.$t('aiCache.relationLt'),
        lte: this.$t('aiCache.relationLte'),
        gt: this.$t('aiCache.relationGt'),
        gte: this.$t('aiCache.relationGte')
      };
      return map[relation] || relation || '-';
    },

    formatTtl(value) {
      if (value === null || value === undefined) {
        return '-';
      }
      return Number(value) === 0
        ? this.$t('aiCache.ttlNever')
        : this.$t('aiCache.ttlSecondsText', { value });
    },

    formatBytes(value) {
      if (value === null || value === undefined) {
        return '-';
      }
      return this.$t('aiCache.bytesText', { value });
    },

    fetchRules() {
      this.loading = true;
      this.$request({
        url: 'ai-cache-rules',
        method: 'get',
        openapi: true,
        unneedTips: true
      })
        .then(res => {
          if (res && res.status === 200) {
            const data = res.data.Data || {};
            this.rules = data.rules || [];
          } else {
            this.$Message.error(this.$t('aiCache.loadFailed'));
          }
        })
        .catch(() => {
          this.$Message.error(this.$t('aiCache.loadFailed'));
        })
        .finally(() => {
          this.loading = false;
        });
    },

    fetchSemantic() {
      this.$request({
        url: 'ai-cache-semantic-settings',
        method: 'get',
        openapi: true,
        unneedTips: true
      })
        .then(res => {
          if (res && res.status === 200) {
            const data = res.data.Data || {};
            this.semantic = {
              ...cloneDeep(DEFAULT_SEMANTIC),
              top_k: data.top_k !== undefined && data.top_k !== null ? data.top_k : DEFAULT_SEMANTIC.top_k,
              threshold:
                data.threshold !== undefined && data.threshold !== null
                  ? data.threshold
                  : DEFAULT_SEMANTIC.threshold,
              threshold_relation: data.threshold_relation || DEFAULT_SEMANTIC.threshold_relation
            };
          } else {
            this.$Message.error(this.$t('aiCache.semanticLoadFailed'));
          }
        })
        .catch(() => {
          this.$Message.error(this.$t('aiCache.semanticLoadFailed'));
        });
    },

    findRowIndex(row) {
      if (!row) {
        return -1;
      }
      return this.rules.findIndex(item => item.name === row.name);
    },

    enterEditMode() {
      this.mode = 'edit';
      this.originalRows = cloneDeep(this.rules);
    },

    exitEditMode() {
      if (this.isDirty) {
        this.$Modal.confirm({
          title: this.$t('com.informationTips'),
          content: this.$t('aiCache.exitConfirm'),
          onOk: () => {
            this.performExitEditMode();
            this.$Message.info(this.$t('aiCache.exitDone'));
          },
          onCancel: () => {
            this.$Message.info(this.$t('aiCache.exitCancelled'));
          }
        });
        return;
      }
      this.performExitEditMode();
    },

    performExitEditMode() {
      this.mode = 'view';
      if (this.originalRows) {
        this.rules = cloneDeep(this.originalRows);
      }
      this.originalRows = null;
      this.fetchRules();
    },

    onAddRule() {
      this.currentRuleIndex = -1;
      this.currentRule = null;
      this.formMode = 'add';
      this.formVisible = true;
    },

    onEditRule(row) {
      const index = this.findRowIndex(row);
      if (index < 0) {
        return;
      }
      this.currentRuleIndex = index;
      this.currentRule = cloneDeep(this.rules[index]);
      this.formMode = 'edit';
      this.formVisible = true;
    },

    onViewRule(row) {
      const index = this.findRowIndex(row);
      if (index < 0) {
        return;
      }
      this.currentRule = cloneDeep(this.rules[index]);
      this.viewVisible = true;
    },

    onDeleteRule(row) {
      this.$Modal.confirm({
        title: this.$t('com.informationTips'),
        content: this.$t('aiCache.deleteConfirm'),
        onOk: () => {
          const index = this.findRowIndex(row);
          if (index >= 0) {
            this.rules.splice(index, 1);
          }
          this.$Message.success(this.$t('com.tipDelSucc'));
        },
        onCancel: () => {
          this.$Message.info(this.$t('com.tipCancelDel'));
        }
      });
    },

    onRuleDragDrop(startIndex, endIndex) {
      if (startIndex === endIndex) {
        return;
      }
      const rules = cloneDeep(this.rules);
      const [moved] = rules.splice(startIndex, 1);
      rules.splice(endIndex, 0, moved);
      this.rules = rules;
    },

    onFormSubmit(data) {
      const excludeIndex = this.formMode === 'edit' ? this.currentRuleIndex : -1;
      const duplicated = this.rules.some((rule, index) => {
        if (index === excludeIndex) {
          return false;
        }
        return rule.name === data.name;
      });
      if (duplicated) {
        this.$Message.error(this.$t('aiCache.tipNameDuplicate'));
        return;
      }

      if (this.formMode === 'add') {
        this.rules.unshift(data);
      } else if (this.currentRuleIndex >= 0) {
        this.rules.splice(this.currentRuleIndex, 1, data);
      }
      this.formVisible = false;
      this.$Message.success(
        this.formMode === 'add'
          ? this.$t('aiCache.addSuccess')
          : this.$t('aiCache.saveSuccess')
      );
    },

    submitRules() {
      const names = (this.rules || []).map(rule => rule.name).filter(Boolean);
      const uniqueNames = [...new Set(names)];
      if (names.length !== uniqueNames.length) {
        this.$Message.error(this.$t('aiCache.tipNameDuplicate'));
        return;
      }

      this.submitting = true;
      this.$request({
        url: 'ai-cache-rules',
        method: 'put',
        data: { rules: this.buildPayload() },
        openapi: true
      })
        .then(res => {
          if (res && res.status === 200) {
            this.$Message.success(this.$t('aiCache.submitSuccess'));
            this.originalRows = null;
            this.mode = 'view';
            this.fetchRules();
          } else {
            this.$Message.error(this.$t('com.tipSubmitFailed'));
          }
        })
        .catch(() => {
          this.$Message.error(this.$t('com.tipSubmitFailed'));
        })
        .finally(() => {
          this.submitting = false;
        });
    },

    buildPayload() {
      return this.rules.map(rule => {
        const clean = cloneDeep(rule);
        delete clean.created_at;
        delete clean.updated_at;
        return clean;
      });
    },

    enterSemanticEditMode() {
      this.semanticForm = cloneDeep(this.semantic);
      this.semanticMode = 'edit';
    },

    cancelSemanticEditMode() {
      this.semanticForm = cloneDeep(this.semantic);
      this.semanticMode = 'view';
    },

    saveSemantic() {
      if (!this.$refs.semanticForm) {
        return;
      }
      this.$refs.semanticForm.validate(valid => {
        if (!valid) {
          this.$Message.error(this.$t('com.tipValidateError'));
          return;
        }
        this.submitSemantic();
      });
    },

    submitSemantic() {
      this.submittingSemantic = true;
      this.$request({
        url: 'ai-cache-semantic-settings',
        method: 'put',
        data: {
          top_k: Number(this.semanticForm.top_k),
          threshold: Number(this.semanticForm.threshold),
          threshold_relation: this.semanticForm.threshold_relation
        },
        openapi: true
      })
        .then(res => {
          if (res && res.status === 200) {
            this.$Message.success(this.$t('aiCache.semanticSaveSuccess'));
            this.semanticMode = 'view';
            this.fetchSemantic();
          } else {
            this.$Message.error(this.$t('com.tipSubmitFailed'));
          }
        })
        .catch(() => {
          this.$Message.error(this.$t('com.tipSubmitFailed'));
        })
        .finally(() => {
          this.submittingSemantic = false;
        });
    }
  },

  mounted() {
    this.fetchRules();
    this.fetchSemantic();
  }
};
</script>

<style lang="less" scoped>
.ai-cache {
  .route-editor-header {
    position: relative;
    margin-bottom: 16px;
  }

  .route-owner-label {
    color: #515a6e;
    font-size: 14px;
    margin-bottom: 12px;
  }

  .route-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .route-header-submit {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

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

  .drag-tip {
    margin-top: 8px;
    color: #808695;
    font-size: 12px;
  }
}
</style>