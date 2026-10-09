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
  <div class="ai-context">
    <Tabs v-model="activeTab" :animated="false">
      <TabPane :label="$t('aiContext.tabRules')" name="rules">
        <div class="route-editor-header">
          <div class="route-owner-label">
            {{ $t('aiContext.rulesSubtitle') }}
          </div>
          <div class="route-header-actions">
            <Button
              v-show="rulesMode === 'edit'"
              size="small"
              type="primary"
              @click="onAddRule"
            >
              {{ $t('aiContext.addRule') }}
            </Button>
          </div>
          <div class="route-header-submit">
            <template v-if="rulesMode === 'view'">
              <Button size="small" type="primary" @click="enterRulesEditMode">
                {{ $t('route.enterEditMode') }}
              </Button>
            </template>
            <template v-else>
              <Button size="small" @click="exitRulesEditMode">
                {{ $t('route.exitEditMode') }}
              </Button>
              <Button
                size="small"
                type="success"
                :loading="submittingRules"
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
          :loading="loadingRules"
        />
      </TabPane>

      <TabPane :label="$t('aiContext.tabSettings')" name="settings">
        <div class="route-editor-header">
          <div class="route-owner-label">
            {{ $t('aiContext.settingsSubtitle') }}
          </div>
          <div class="route-header-submit">
            <template v-if="settingsMode === 'view'">
              <Button size="small" type="primary" @click="enterSettingsEditMode">
                {{ $t('com.edit') }}
              </Button>
            </template>
            <template v-else>
              <Button size="small" @click="cancelSettingsEditMode">
                {{ $t('com.cancel') }}
              </Button>
              <Button
                size="small"
                type="success"
                :loading="submittingSettings"
                @click="saveSettings"
              >
                {{ $t('com.save') }}
              </Button>
            </template>
          </div>
        </div>

        <Card :title="$t('aiContext.settingsCardTitle')" class="form-card">
          <SettingsView v-if="settingsMode === 'view'" :settings="settings" />
          <SettingsForm
            v-else
            ref="settingsForm"
            :settings="settings"
            @submit="onSettingsSubmit"
          />
        </Card>
      </TabPane>
    </Tabs>

    <Drawer
      v-model="viewVisible"
      :title="$t('aiContext.viewTitle')"
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
import SettingsForm, { DEFAULT_SETTINGS } from './components/SettingsForm.vue';
import SettingsView from './components/SettingsView.vue';
import { cloneDeep } from 'lodash';

export default {
  name: 'AIContext',

  components: {
    pageTable,
    RuleForm,
    RuleView,
    SettingsForm,
    SettingsView
  },

  data() {
    const that = this;
    return {
      activeTab: 'rules',
      loadingRules: false,
      submittingRules: false,
      rules: [],
      originalRows: null,
      rulesMode: 'view',
      viewVisible: false,
      formVisible: false,
      formMode: 'add',
      currentRule: null,
      currentRuleIndex: -1,
      ruleColumns: that.buildRuleColumns(),
      submittingSettings: false,
      settings: cloneDeep(DEFAULT_SETTINGS),
      originalSettings: null,
      settingsMode: 'view'
    };
  },

  computed: {
    isRulesDirty() {
      if (this.rulesMode !== 'edit' || this.originalRows === null) {
        return false;
      }
      return JSON.stringify(this.rules) !== JSON.stringify(this.originalRows);
    },

    formTitle() {
      return this.formMode === 'edit'
        ? this.$t('aiContext.editTitle')
        : this.$t('aiContext.addTitle');
    }
  },

  watch: {
    rulesMode() {
      this.ruleColumns = this.buildRuleColumns();
    }
  },

  methods: {
    buildRuleColumns() {
      const that = this;
      return [
        {
          title: that.$t('aiContext.colCond'),
          key: 'cond',
          minWidth: 280,
          sortable: 'custom',
          searchable: true,
          render(h, params) {
            return h('span', params.row.cond || '-');
          }
        },
        {
          title: that.$t('aiContext.colMode'),
          key: 'mode',
          minWidth: 200,
          sortable: 'custom',
          searchable: true,
          searchType: 'select',
          searchFilters: [
            { label: 'off', value: 'off' },
            { label: 'conservative', value: 'conservative' },
            { label: 'balanced', value: 'balanced' },
            { label: 'aggressive', value: 'aggressive' }
          ],
          render(h, params) {
            const mode = params.row.mode;
            return h(
              'Tag',
              { props: { color: mode === 'off' ? 'default' : 'primary' } },
              that.modeLabel(mode)
            );
          }
        },
        {
          title: that.$t('aiContext.colMaxTokens'),
          key: 'max_context_tokens',
          minWidth: 150,
          sortable: 'custom',
          render(h, params) {
            return h('span', that.formatTokens(params.row.max_context_tokens));
          }
        },
        {
          title: that.$t('aiContext.colReserveTokens'),
          key: 'reserve_tokens',
          minWidth: 150,
          sortable: 'custom',
          render(h, params) {
            return h('span', that.formatTokens(params.row.reserve_tokens));
          }
        },
        {
          title: that.$t('com.operation'),
          key: 'action',
          width: 220,
          render(h, params) {
            const row = params.row;
            if (that.rulesMode === 'view') {
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
                  style: { marginRight: '8px' },
                  on: { click: () => that.onEditRule(row) }
                },
                that.$t('com.edit')
              ),
              h(
                'Button',
                {
                  props: { size: 'small', type: 'error' },
                  on: { click: () => that.onDeleteRule(row) }
                },
                that.$t('com.del')
              )
            ]);
          }
        }
      ];
    },

    modeLabel(mode) {
      const map = {
        off: this.$t('aiContext.modeOff'),
        conservative: this.$t('aiContext.modeConservative'),
        balanced: this.$t('aiContext.modeBalanced'),
        aggressive: this.$t('aiContext.modeAggressive')
      };
      return map[mode] || mode || '-';
    },

    formatTokens(value) {
      if (value === null || value === undefined || Number(value) === 0) {
        return this.$t('aiContext.tokensModelDefault');
      }
      return this.$t('aiContext.tokensText', { value });
    },

    fetchRules() {
      this.loadingRules = true;
      this.$request({
        url: 'ai-context-rules',
        method: 'get',
        openapi: true,
        unneedTips: true
      })
        .then(res => {
          if (res && res.status === 200) {
            const data = res.data.Data || {};
            this.rules = data.rules || [];
          } else {
            this.$Message.error(this.$t('aiContext.loadFailed'));
          }
        })
        .catch(() => {
          this.$Message.error(this.$t('aiContext.loadFailed'));
        })
        .finally(() => {
          this.loadingRules = false;
        });
    },

    fetchSettings() {
      this.$request({
        url: 'ai-context-settings',
        method: 'get',
        openapi: true,
        unneedTips: true
      })
        .then(res => {
          if (res && res.status === 200) {
            const data = res.data.Data || {};
            this.settings = {
              ...cloneDeep(DEFAULT_SETTINGS),
              ...data,
              rewrite: {
                ...DEFAULT_SETTINGS.rewrite,
                ...(data.rewrite || {})
              }
            };
          } else {
            this.$Message.error(this.$t('aiContext.settingsLoadFailed'));
          }
        })
        .catch(() => {
          this.$Message.error(this.$t('aiContext.settingsLoadFailed'));
        });
    },

    findRowIndex(row) {
      if (!row) {
        return -1;
      }
      return this.rules.findIndex(item => item.cond === row.cond);
    },

    enterRulesEditMode() {
      this.rulesMode = 'edit';
      this.originalRows = cloneDeep(this.rules);
    },

    exitRulesEditMode() {
      if (this.isRulesDirty) {
        this.$Modal.confirm({
          title: this.$t('com.informationTips'),
          content: this.$t('aiContext.exitConfirm'),
          onOk: () => {
            this.performExitRulesEditMode();
            this.$Message.info(this.$t('aiContext.exitDone'));
          },
          onCancel: () => {
            this.$Message.info(this.$t('aiContext.exitCancelled'));
          }
        });
        return;
      }
      this.performExitRulesEditMode();
    },

    performExitRulesEditMode() {
      this.rulesMode = 'view';
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
        content: this.$t('aiContext.deleteConfirm'),
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

    onFormSubmit(data) {
      const excludeIndex = this.formMode === 'edit' ? this.currentRuleIndex : -1;
      const duplicated = this.rules.some((rule, index) => {
        if (index === excludeIndex) {
          return false;
        }
        return rule.cond === data.cond;
      });
      if (duplicated) {
        this.$Message.error(this.$t('aiContext.tipCondDuplicate'));
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
          ? this.$t('aiContext.addSuccess')
          : this.$t('aiContext.saveSuccess')
      );
    },

    submitRules() {
      const conds = (this.rules || []).map(rule => rule.cond).filter(Boolean);
      const uniqueConds = [...new Set(conds)];
      if (conds.length !== uniqueConds.length) {
        this.$Message.error(this.$t('aiContext.tipCondDuplicate'));
        return;
      }

      this.submittingRules = true;
      this.$request({
        url: 'ai-context-rules',
        method: 'put',
        data: { rules: this.buildRulePayload() },
        openapi: true
      })
        .then(res => {
          if (res && res.status === 200) {
            this.$Message.success(this.$t('aiContext.submitSuccess'));
            this.originalRows = null;
            this.rulesMode = 'view';
            this.fetchRules();
          } else {
            this.$Message.error(this.$t('com.tipSubmitFailed'));
          }
        })
        .catch(() => {
          this.$Message.error(this.$t('com.tipSubmitFailed'));
        })
        .finally(() => {
          this.submittingRules = false;
        });
    },

    buildRulePayload() {
      return this.rules.map(rule => {
        const clean = cloneDeep(rule);
        delete clean.created_at;
        delete clean.updated_at;
        return clean;
      });
    },

    enterSettingsEditMode() {
      this.settingsMode = 'edit';
      this.originalSettings = cloneDeep(this.settings);
    },

    cancelSettingsEditMode() {
      this.settingsMode = 'view';
      if (this.originalSettings) {
        this.settings = cloneDeep(this.originalSettings);
      }
      this.originalSettings = null;
    },

    saveSettings() {
      if (this.$refs.settingsForm) {
        this.$refs.settingsForm.handleSubmit();
      }
    },

    onSettingsSubmit(data) {
      this.submittingSettings = true;
      this.$request({
        url: 'ai-context-settings',
        method: 'put',
        data,
        openapi: true
      })
        .then(res => {
          if (res && res.status === 200) {
            this.$Message.success(this.$t('aiContext.settingsSaveSuccess'));
            this.settingsMode = 'view';
            this.originalSettings = null;
            this.fetchSettings();
          } else {
            this.$Message.error(this.$t('com.tipSubmitFailed'));
          }
        })
        .catch(() => {
          this.$Message.error(this.$t('com.tipSubmitFailed'));
        })
        .finally(() => {
          this.submittingSettings = false;
        });
    }
  },

  mounted() {
    this.fetchRules();
    this.fetchSettings();
  }
};
</script>

<style lang="less" scoped>
.ai-context {
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
}
</style>