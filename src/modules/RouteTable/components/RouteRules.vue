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
  <div class="route-rules">
    <div class="route-editor-header">
      <div class="route-owner-label">
        {{ $t('route.currentRouteTable') }}：<strong>{{ typeLabel }}</strong> /
        {{ ownerLabel }}
      </div>
      <div class="header-actions">
        <Button size="small" class="back-btn" @click="onCancel">
          <Icon type="ios-arrow-back" />
          {{ $t('com.back') }}
        </Button>
        <Button
          v-if="mode === 'view'"
          v-has
          size="small"
          type="success"
          @click="enterEditMode"
        >
          {{ $t('route.enterEditMode') }}
        </Button>
        <template v-if="mode !== 'view'">
          <Button v-has size="small" @click="exitEditMode">
            {{ $t('route.exitEditMode') }}
          </Button>
          <Button
            v-has
            size="small"
            type="primary"
            style="margin-left: 8px;"
            :loading="submitting"
            :disabled="!isDirty"
            @click="submitRules"
          >
            {{ $t('com.submitAndEffect') }}
          </Button>
        </template>
      </div>
    </div>

    <div class="enable-row">
      <span class="enable-label">{{ $t('route.routeTableEnabled') }}</span>
      <Select
        v-model="enabledValue"
        style="width: 160px;"
        :disabled="mode === 'view'"
        @on-change="onEnabledChange"
      >
        <Option value="true">{{ $t('com.enable') }}</Option>
        <Option value="false">{{ $t('com.deactivate') }}</Option>
      </Select>
    </div>

    <div class="action-bar">
      <Button
        v-show="mode === 'edit'"
        v-has
        size="small"
        type="primary"
        @click="onAddRule"
      >
        {{ $t('com.createX', { obj: $t('route.rule') }) }}
      </Button>
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
      {{ $t('route.dragToChangeOrder') }}
    </div>

    <Drawer
      v-model="viewRuleVisible"
      :title="$t('com.seeX', { obj: $t('route.rule') })"
      width="50"
      :mask-closable="true"
      @on-close="viewRule = null"
    >
      <RuleView
        v-if="viewRule"
        :rule="viewRule"
        @close="viewRuleVisible = false"
      />
    </Drawer>

    <Drawer
      v-model="ruleDrawerVisible"
      :title="ruleDrawerTitle"
      width="60"
      :mask-closable="false"
    >
      <RuleForm
        v-if="ruleDrawerVisible"
        :rule="currentRule"
        :clusters="clusters"
        :readonly="mode === 'view'"
        @submit="onRuleFormSubmit"
        @cancel="ruleDrawerVisible = false"
      />
    </Drawer>
  </div>
</template>

<script>
import pageTable from '@/components/table/pageTable';
import RuleForm from './RuleForm.vue';
import RuleView from './RuleView.vue';
import { cloneDeep } from 'lodash';

const TYPE_LABELS = {
  global: 'Global',
  entity: 'Entity',
  apikey: 'API-Key'
};

export default {
  name: 'RouteRules',

  components: {
    pageTable,
    RuleForm,
    RuleView
  },

  props: {
    type: {
      type: String,
      required: true
    },
    owner: {
      type: String,
      default: ''
    },
    ownerName: {
      type: String,
      default: ''
    },
    initialData: {
      type: Object,
      default: null
    },
    initialFilter: {
      type: String,
      default: ''
    }
  },

  data() {
    const that = this;
    return {
      loading: false,
      submitting: false,
      enabled: false,
      enabledValue: 'false',
      rules: [],
      originalRules: null,
      originalEnabled: null,
      mode: 'view',
      clusters: [],
      ruleDrawerVisible: false,
      ruleDrawerTitle: '',
      currentRule: null,
      currentRuleIndex: -1,
      viewRule: null,
      viewRuleVisible: false,
      ruleColumns: that.buildRuleColumns()
    };
  },

  computed: {
    typeLabel() {
      return TYPE_LABELS[this.type] || this.type;
    },
    ownerLabel() {
      if (this.type === 'global') return 'Global';
      return this.ownerName || this.owner || '-';
    },
    isDirty() {
      if (this.mode !== 'edit' || this.originalRules === null) {
        return false;
      }
      if (this.enabled !== this.originalEnabled) {
        return true;
      }
      return JSON.stringify(this.rules) !== JSON.stringify(this.originalRules);
    }
  },

  watch: {
    enabled: {
      handler(val) {
        this.enabledValue = val === true ? 'true' : 'false';
      },
      immediate: true
    },
    mode() {
      this.ruleColumns = this.buildRuleColumns();
    }
  },

  methods: {
    buildRuleColumns() {
      const that = this;
      return [
        {
          title: that.$t('route.ruleName'),
          key: 'name',
          searchable: true,
          sortable: 'custom',
          render(h, params) {
            return <span>{params.row.name || '-'}</span>;
          }
        },
        {
          title: that.$t('route.expression'),
          key: 'cond',
          sortable: 'custom',
          searchable: true,
          render(h, params) {
            return <span>{params.row.cond || '-'}</span>;
          }
        },
        {
          title: that.$t('route.targetClusterAndModel'),
          key: 'targets',
          sortable: 'custom',
          searchable: true,
          render(h, params) {
            const targets = params.row.targets || [];
            return h('div', targets.map(t => {
              const text = `${t.cluster_name}/${t.model || ''}: ${t.weight}%`;
              return h('Tooltip', {
                props: { content: text, transfer: true, maxWidth: 600 },
                style: 'display: block; width: 100%; margin-bottom: 4px;'
              }, [
                h('Tag', {
                  key: `${t.cluster_name}-${t.model}`,
                  style: 'max-width: calc(100% - 5px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;'
                }, text)
              ]);
            }));
          }
        },
        {
          title: that.$t('route.fallbackClusterAndModel'),
          key: 'fallbacks',
          sortable: 'custom',
          searchable: true,
          render(h, params) {
            const fallbacks = params.row.fallbacks || [];
            if (!fallbacks.length) {
              return <span>-</span>;
            }
            return h('div', fallbacks.map(f => {
              const text = `${f.cluster_name}/${f.model || ''}`;
              return h('Tooltip', {
                props: { content: text, transfer: true, maxWidth: 600 },
                style: 'display: block; width: 100%; margin-bottom: 4px;'
              }, [
                h('Tag', {
                  key: `${f.cluster_name}-${f.model}`,
                  style: 'max-width: calc(100% - 5px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;'
                }, text)
              ]);
            }));
          }
        },
        {
          title: that.$t('com.operation'),
          key: 'operation',
          width: 220,
          render(h, params) {
            const row = params.row;
            if (that.mode === 'view') {
              return h('Button', {
                props: { size: 'small', type: 'primary' },
                on: { click: () => that.onViewRule(row) }
              }, that.$t('com.see'));
            }
            return h('div', [
              h('Button', {
                props: { size: 'small', type: 'success' },
                directives: [{ name: 'has' }],
                style: { marginRight: '8px' },
                on: { click: () => that.onCopyRule(row.index) }
              }, that.$t('com.copy')),
              h('Button', {
                props: { size: 'small', type: 'primary' },
                directives: [{ name: 'has' }],
                style: { marginRight: '8px' },
                on: { click: () => that.onEditRule(row, row.index) }
              }, that.$t('com.edit')),
              h('Button', {
                props: { size: 'small', type: 'error' },
                directives: [{ name: 'has' }],
                on: { click: () => that.onDeleteRule(row.index) }
              }, that.$t('com.del'))
            ]);
          }
        }
      ];
    },

    fetchClusters() {
      this.$request({
        url: 'clusters',
        method: 'get',
        openapi: true
      })
        .then(res => {
          if (res.status === 200) {
            const data = res.data.Data || [];
            this.clusters = data.map(cluster => ({
              name: cluster.name,
              models: (cluster.llm_config && cluster.llm_config.models) || []
            }));
          }
        })
        .catch(err => {
          console.error('获取集群列表失败:', err);
        });
    },

    fetchRules() {
      this.loading = true;
      if (this.type === 'global') {
        this.$request({
          url: 'global-route-rules',
          method: 'get',
          openapi: true
        })
          .then(res => {
            if (res.status === 200) {
              const data = res.data.Data || { enabled: false, rules: [] };
              this.enabled = data.enabled === true;
              this.rules = data.rules || [];
              this.refreshRuleIndex();
              this.applyInitialFilter();
            } else {
              this.$Message.error(this.$t('route.loadFailed'));
            }
          })
          .catch(err => {
            console.error('加载 Global 路由规则失败:', err);
            this.$Message.error(this.$t('route.loadFailed'));
          })
          .finally(() => {
            this.loading = false;
          });
        return;
      }
      const url = this.type === 'entity' ? `entities/${this.owner}` : `api-keys/${this.owner}`;
      this.$request({
        url: url,
        method: 'get',
        openapi: true
      })
        .then(res => {
          if (res.status === 200) {
            const data = res.data.Data || {};
            const routeRules = data.route_rules || { enabled: false, rules: [] };
            this.enabled = routeRules.enabled === true;
            this.rules = routeRules.rules || [];
            this.refreshRuleIndex();
            this.applyInitialFilter();
          } else {
            this.$Message.error(this.$t('route.loadFailed'));
          }
        })
        .catch(err => {
          console.error('加载路由规则失败:', err);
          this.$Message.error(this.$t('route.loadFailed'));
        })
        .finally(() => {
          this.loading = false;
        });
    },

    refreshRuleIndex() {
      this.rules = this.rules.map((rule, index) => ({ ...rule, index }));
    },

    applyInitialFilter() {
      if (!this.initialFilter) {
        return;
      }
      const column = this.ruleColumns.find(item => item.key === 'name');
      if (!column) {
        return;
      }
      // pageTable 的 tableData watcher 会清空 searchValue，需在其执行后再预置
      this.$nextTick(() => {
        column.searchValue = this.initialFilter;
        this.$nextTick(() => {
          if (this.$refs.ruleTable) {
            this.$refs.ruleTable.searchTable(column);
          }
        });
      });
    },

    enterEditMode() {
      this.mode = 'edit';
      this.originalRules = cloneDeep(this.rules);
      this.originalEnabled = this.enabled;
    },

    exitEditMode() {
      if (this.isDirty) {
        this.$Modal.confirm({
          title: this.$t('com.informationTips'),
          content: this.$t('route.tipUnsavedLeave'),
          onOk: () => {
            this.performExitEditMode();
          }
        });
        return;
      }
      this.performExitEditMode();
    },

    performExitEditMode() {
      this.mode = 'view';
      if (this.originalRules) {
        this.rules = cloneDeep(this.originalRules);
        this.originalRules = null;
        this.refreshRuleIndex();
      }
      if (this.originalEnabled !== null) {
        this.enabled = this.originalEnabled;
        this.originalEnabled = null;
      }
      this.fetchRules();
    },

    onAddRule() {
      this.currentRuleIndex = -1;
      this.currentRule = {
        name: '',
        cond: '',
        targets: [{ cluster_name: '', model: '', weight: 100 }],
        fallbacks: []
      };
      this.ruleDrawerTitle = this.$t('com.createX', { obj: this.$t('route.rule') });
      this.ruleDrawerVisible = true;
    },

    onEditRule(rule, index) {
      this.currentRuleIndex = index;
      this.currentRule = cloneDeep(rule);
      this.ruleDrawerTitle = this.$t('com.editX', { obj: this.$t('route.rule') });
      this.ruleDrawerVisible = true;
    },

    onViewRule(rule) {
      this.viewRule = cloneDeep(rule);
      this.viewRuleVisible = true;
    },

    onDeleteRule(index) {
      this.rules.splice(index, 1);
      this.refreshRuleIndex();
    },

    onRuleDragDrop(startIndex, endIndex) {
      if (startIndex === endIndex) {
        return;
      }
      const rules = cloneDeep(this.rules);
      const [moved] = rules.splice(startIndex, 1);
      rules.splice(endIndex, 0, moved);
      this.rules = rules;
      this.refreshRuleIndex();
    },

    onCopyRule(index) {
      const source = this.rules[index];
      const clone = cloneDeep(source);
      delete clone.index;
      delete clone._index;
      delete clone._rowKey;
      const name = source.name || '';
      let seq = 1;
      let newName;
      do {
        const suffix = seq === 1 ? '-copy' : `-copy${seq}`;
        newName = `${name.substring(0, 64 - suffix.length)}${suffix}`;
        seq += 1;
      } while (this.rules.some(rule => rule.name === newName));
      clone.name = newName;
      this.rules.splice(index + 1, 0, clone);
      this.refreshRuleIndex();
    },

    onRuleFormSubmit(rule) {
      if (this.mode === 'view') {
        this.ruleDrawerVisible = false;
        return;
      }
      if (this.currentRuleIndex === -1) {
        this.rules.push(rule);
      } else {
        this.rules.splice(this.currentRuleIndex, 1, rule);
      }
      this.refreshRuleIndex();
      this.ruleDrawerVisible = false;
    },

    submitRules() {
      const ruleNames = (this.rules || []).map(rule => rule.name).filter(Boolean);
      const uniqueNames = [...new Set(ruleNames)];
      if (ruleNames.length !== uniqueNames.length) {
        this.$Message.error(this.$t('route.ruleNameDuplicate'));
        return;
      }

      this.submitting = true;
      const payload = this.buildPayload();
      this.$request({
        url: this.getUpdateUrl(),
        method: this.getUpdateMethod(),
        data: payload,
        openapi: true
      })
        .then(res => {
          if (res.status === 200) {
            this.$Message.success({
              content: this.$t('com.tipSubmitSucc')
            });
            this.originalRules = null;
            this.mode = 'view';
            this.$emit('submit');
          } else {
            this.$Message.error(this.$t('com.tipSubmitFailed'));
          }
        })
        .catch(err => {
          console.error('提交路由规则失败:', err);
          this.$Message.error(this.$t('com.tipSubmitFailed'));
        })
        .finally(() => {
          this.submitting = false;
        });
    },

    buildPayload() {
      const rules = this.rules.map(rule => {
        const clean = cloneDeep(rule);
        delete clean.index;
        delete clean._index;
        delete clean._rowKey;
        if (!Array.isArray(clean.fallbacks)) {
          clean.fallbacks = [];
        }
        return clean;
      });
      if (this.type === 'global') {
        return { enabled: this.enabled, rules };
      }
      return { route_rules: { enabled: this.enabled, rules } };
    },

    getUpdateUrl() {
      if (this.type === 'global') {
        return 'global-route-rules';
      }
      return this.type === 'entity' ? `entities/${this.owner}` : `api-keys/${this.owner}`;
    },

    getUpdateMethod() {
      return this.type === 'global' ? 'put' : 'patch';
    },

    onEnabledChange(val) {
      this.enabled = val === 'true';
    },

    onCancel() {
      this.$emit('close');
    }
  },

  mounted() {
    this.fetchClusters();
    if (this.initialData) {
      this.enabled = this.initialData.enabled === true;
      this.rules = cloneDeep(this.initialData.rules || []);
      this.refreshRuleIndex();
    } else {
      this.fetchRules();
    }
  }
};
</script>

<style lang="less" scoped>
.route-rules {
  // Tooltip 外层为 inline-block 且宽度随内容收缩，导致内部标签
  // max-width:100% 循环解析失效、溢出单元格被裁剪贴边；约束到单元格宽度
  .ivu-table-cell .ivu-tooltip {
    max-width: 100%;
  }

  .route-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    .header-actions {
      .back-btn {
        margin-right: 8px;
      }
    }
  }

  .route-owner-label {
    color: #515a6e;
    font-size: 14px;
  }

  .enable-row {
    display: flex;
    align-items: center;
    margin-bottom: 16px;

    .enable-label {
      margin-right: 8px;
    }
  }

  .action-bar {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-bottom: 16px;
  }

  .drag-tip {
    margin-top: 8px;
    color: #808695;
    font-size: 12px;
  }

  .submit-bar {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
