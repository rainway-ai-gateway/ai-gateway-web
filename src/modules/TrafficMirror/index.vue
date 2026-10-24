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
  <div class="traffic-mirror">
    <div class="route-editor-header">
      <div class="route-owner-label">
        {{ $t('trafficMirror.pageTitle') }}
      </div>
      <div class="route-header-actions">
        <Button
          v-show="mode === 'edit'"
          v-has
          size="small"
          type="primary"
          @click="onAddRule"
        >
          {{ $t('trafficMirror.addRule') }}
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
      :tableData="tableRules"
      :loading="loading"
      :draggable="mode === 'edit'"
      @dragDrop="onRuleDragDrop"
    />

    <div v-if="mode === 'edit'" class="drag-tip">
      {{ $t('trafficMirror.dragToChangeOrder') }}
    </div>

    <Drawer
      v-model="viewVisible"
      :title="$t('trafficMirror.viewTitle')"
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
        :clusters="clusters"
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

export default {
  name: 'TrafficMirror',

  components: {
    pageTable,
    RuleForm,
    RuleView
  },

  data() {
    const that = this;
    return {
      loading: false,
      submitting: false,
      rules: [],
      clusters: [],
      originalRows: null,
      mode: 'view',
      viewVisible: false,
      formVisible: false,
      formMode: 'add',
      currentRule: null,
      currentRuleIndex: -1,
      ruleColumns: that.buildRuleColumns()
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
        ? this.$t('trafficMirror.editTitle')
        : this.$t('trafficMirror.addTitle');
    },

    tableRules() {
      return (this.rules || []).map(rule => ({
        ...rule,
        _removeHeadersText: this.removeHeadersText(rule.remove_headers)
      }));
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
        content: this.$t('trafficMirror.exitConfirm'),
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
          title: that.$t('trafficMirror.colCond'),
          key: 'cond',
          minWidth: 240,
          sortable: 'custom',
          searchable: true,
          render(h, params) {
            return h('span', params.row.cond || '-');
          }
        },
        {
          title: that.$t('trafficMirror.colCluster'),
          key: 'mirror_cluster',
          minWidth: 160,
          sortable: 'custom',
          searchable: true,
          render(h, params) {
            return h('span', params.row.mirror_cluster || '-');
          }
        },
        {
          title: that.$t('trafficMirror.colPercentage'),
          key: 'percentage',
          minWidth: 110,
          sortable: 'custom',
          render(h, params) {
            const value = params.row.percentage;
            return h(
              'span',
              value === null || value === undefined
                ? '-'
                : that.$t('trafficMirror.percentageText', { value })
            );
          }
        },
        {
          title: that.$t('trafficMirror.colRemoveHeaders'),
          key: '_removeHeadersText',
          minWidth: 200,
          sortable: 'custom',
          render(h, params) {
            return h('span', params.row._removeHeadersText);
          }
        },
        {
          title: that.$t('trafficMirror.colPathRewrite'),
          key: 'path_rewrite',
          minWidth: 160,
          sortable: 'custom',
          render(h, params) {
            return h('span', params.row.path_rewrite || '-');
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

    removeHeadersText(removeHeaders) {
      if (removeHeaders === null || removeHeaders === undefined) {
        return this.$t('trafficMirror.viewHeadersDefault');
      }
      if (Array.isArray(removeHeaders) && removeHeaders.length === 0) {
        return this.$t('trafficMirror.viewHeadersNone');
      }
      return (removeHeaders || []).join(', ');
    },

    fetchRules() {
      this.loading = true;
      this.$request({
        url: 'traffic-mirror-rules',
        method: 'get',
        openapi: true,
        unneedTips: true
      })
        .then(res => {
          if (res && res.status === 200) {
            const data = res.data.Data || {};
            this.rules = data.rules || [];
          } else {
            this.$Message.error(this.$t('trafficMirror.loadFailed'));
          }
        })
        .catch(() => {
          this.$Message.error(this.$t('trafficMirror.loadFailed'));
        })
        .finally(() => {
          this.loading = false;
        });
    },

    fetchClusters() {
      this.$request({
        url: 'clusters',
        method: 'get',
        openapi: true,
        unneedTips: true
      }).then(res => {
        if (res && res.status === 200) {
          const data = res.data.Data || [];
          this.clusters = (data || []).map(cluster => ({ name: cluster.name }));
        }
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
          content: this.$t('trafficMirror.exitConfirm'),
          onOk: () => {
            this.performExitEditMode();
            this.$Message.info(this.$t('trafficMirror.exitDone'));
          },
          onCancel: () => {
            this.$Message.info(this.$t('trafficMirror.exitCancelled'));
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
        content: this.$t('trafficMirror.deleteConfirm'),
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
      const nameDuplicated = this.rules.some((rule, index) => {
        if (index === excludeIndex) {
          return false;
        }
        return rule.name === data.name;
      });
      if (nameDuplicated) {
        this.$Message.error(this.$t('trafficMirror.tipNameDuplicate'));
        return;
      }

      const condDuplicated = this.rules.some((rule, index) => {
        if (index === excludeIndex) {
          return false;
        }
        return rule.cond === data.cond;
      });
      if (condDuplicated) {
        this.$Message.error(this.$t('trafficMirror.tipCondDuplicate'));
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
          ? this.$t('trafficMirror.addSuccess')
          : this.$t('trafficMirror.saveSuccess')
      );
    },

    submitRules() {
      const names = (this.rules || []).map(rule => rule.name).filter(Boolean);
      const uniqueNames = [...new Set(names)];
      if (names.length !== uniqueNames.length) {
        this.$Message.error(this.$t('trafficMirror.tipNameDuplicate'));
        return;
      }

      const conds = (this.rules || []).map(rule => rule.cond).filter(Boolean);
      const uniqueConds = [...new Set(conds)];
      if (conds.length !== uniqueConds.length) {
        this.$Message.error(this.$t('trafficMirror.tipCondDuplicate'));
        return;
      }

      this.submitting = true;
      this.$request({
        url: 'traffic-mirror-rules',
        method: 'put',
        data: { rules: this.buildPayload() },
        openapi: true
      })
        .then(res => {
          if (res && res.status === 200) {
            this.$Message.success(this.$t('trafficMirror.submitSuccess'));
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
    }
  },

  mounted() {
    this.fetchClusters();
    this.fetchRules();
  }
};
</script>

<style lang="less" scoped>
.traffic-mirror {
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

  .drag-tip {
    margin-top: 8px;
    color: #808695;
    font-size: 12px;
  }
}
</style>