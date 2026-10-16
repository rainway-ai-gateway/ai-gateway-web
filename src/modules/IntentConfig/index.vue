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
  <div class="intent-config">
    <div class="ic-header">
      <div class="ic-desc">
        {{ $t('intentConfig.pageDesc') }}
      </div>
      <div v-has class="ic-actions">
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
            @click="saveConfig"
          >
            {{ $t('intentConfig.saveAndPublish') }}
          </Button>
        </template>
      </div>
    </div>

    <Alert v-if="!published" type="info" show-icon class="ic-unpublished-tip">
      {{ $t('intentConfig.unpublishedHint') }}
    </Alert>

    <Card :title="$t('intentConfig.globalCardTitle')" class="form-card ic-card">
      <Form label-position="top">
        <FormItem :label="$t('intentConfig.minConfidenceLabel')">
          <span v-if="mode === 'view'" class="ic-global-value">
            {{ minConfidence }}
          </span>
          <InputNumber
            v-else
            v-model="minConfidence"
            :min="0"
            :max="1"
            :step="0.01"
            placeholder="0.6"
            style="width: 220px;"
          />
        </FormItem>
      </Form>
    </Card>

    <Card
      :title="$t('intentConfig.questionsCardTitle', {
        count: questions.length,
        max: maxQuestions
      })"
      class="form-card ic-card"
    >
      <div v-show="mode === 'edit'" v-has class="ic-list-toolbar">
        <Button type="primary" size="small" @click="onAddQuestion">
          {{ $t('intentConfig.addQuestion') }}
        </Button>
      </div>
      <pageTable
        ref="questionTable"
        :columns="questionColumns"
        :tableData="questions"
        :loading="loading"
      />
    </Card>

    <Drawer
      v-model="viewVisible"
      :title="$t('intentConfig.viewTitle')"
      :width="60"
      :mask-closable="true"
      @on-close="currentQuestion = null"
    >
      <QuestionView
        v-if="viewVisible && currentQuestion"
        :question="currentQuestion"
        :global-min-confidence="minConfidence"
      />
    </Drawer>

    <Drawer
      v-model="formVisible"
      :title="formTitle"
      :width="60"
      :mask-closable="false"
    >
      <QuestionForm
        v-if="formVisible"
        :question="currentQuestion"
        :max-options="maxOptions"
        @submit="onQuestionSubmit"
        @cancel="formVisible = false"
      />
    </Drawer>
  </div>
</template>

<script>
import pageTable from '@/components/table/pageTable';
import QuestionForm from './components/QuestionForm.vue';
import QuestionView from './components/QuestionView.vue';
import { cloneDeep } from 'lodash';

let uidSeed = 0;

function nextUid() {
  uidSeed += 1;
  return `iq-${Date.now()}-${uidSeed}`;
}

function normalizeOptions(raw) {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map(item => {
      if (item && typeof item === 'object') {
        return {
          name: item.name || '',
          description: item.description || ''
        };
      }
      return { name: item === null || item === undefined ? '' : String(item), description: '' };
    });
  }
  if (typeof raw === 'object') {
    return Object.keys(raw).map(key => ({
      name: key,
      description: raw[key] === null || raw[key] === undefined ? '' : String(raw[key])
    }));
  }
  return [];
}

export default {
  name: 'IntentConfig',

  components: {
    pageTable,
    QuestionForm,
    QuestionView
  },

  data() {
    const that = this;
    return {
      loading: false,
      submitting: false,
      published: false,
      mode: 'view',
      minConfidence: 0.6,
      questions: [],
      originalMinConfidence: 0.6,
      originalQuestions: [],
      maxQuestions: 10,
      maxOptions: 10,
      viewVisible: false,
      formVisible: false,
      formMode: 'add',
      currentQuestion: null,
      questionColumns: that.buildQuestionColumns()
    };
  },

  computed: {
    formTitle() {
      return this.formMode === 'edit'
        ? this.$t('intentConfig.editTitle')
        : this.$t('intentConfig.addTitle');
    },

    isDirty() {
      if (this.mode !== 'edit') {
        return false;
      }
      return (
        JSON.stringify({
          min: this.minConfidence,
          questions: this.questions
        }) !==
        JSON.stringify({
          min: this.originalMinConfidence,
          questions: this.originalQuestions
        })
      );
    }
  },

  watch: {
    mode() {
      this.questionColumns = this.buildQuestionColumns();
    }
  },

  methods: {
    buildQuestionColumns() {
      const that = this;
      return [
        {
          title: that.$t('intentConfig.colName'),
          key: 'name',
          minWidth: 180,
          render(h, params) {
            return h('span', params.row.name || '-');
          }
        },
        {
          title: that.$t('intentConfig.colType'),
          key: 'type',
          width: 160,
          render(h, params) {
            const type = params.row.type;
            return h(
              'Tag',
              { props: { color: type === 'score' ? 'success' : 'primary' } },
              that.typeLabel(type)
            );
          }
        },
        {
          title: that.$t('intentConfig.colInstructions'),
          key: 'instructions',
          minWidth: 320,
          render(h, params) {
            return h('span', params.row.instructions || '-');
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
                  on: { click: () => that.onViewQuestion(row) }
                },
                that.$t('com.see')
              );
            }
            return h('div', [
              h(
                'Button',
                {
                  props: { size: 'small',type: 'success' },
                  directives: [{ name: 'has' }],
                  style: { marginRight: '8px' },
                  on: { click: () => that.onEditQuestion(row) }
                },
                that.$t('com.edit')
              ),
              h(
                'Button',
                {
                  props: { size: 'small', type: 'error' },
                  directives: [{ name: 'has' }],
                  on: { click: () => that.onDeleteQuestion(row) }
                },
                that.$t('com.del')
              )
            ]);
          }
        }
      ];
    },
    typeLabel(type) {
      if (type === 'choice') {
        return this.$t('intentConfig.typeChoice');
      }
      if (type === 'score') {
        return this.$t('intentConfig.typeScore');
      }
      return type || '-';
    },

    normalizeQuestion(raw) {
      const type = raw.type === 'score' ? 'score' : 'choice';
      return {
        _uid: nextUid(),
        name: raw.name || '',
        type,
        instructions: raw.instructions || '',
        criteria: type === 'choice' ? normalizeOptions(raw.criteria) : [],
        levels: type === 'score' ? normalizeOptions(raw.levels) : [],
        min_confidence:
          raw.min_confidence === null || raw.min_confidence === undefined
            ? null
            : Number(raw.min_confidence)
      };
    },

    fetchConfig() {
      this.loading = true;
      return this.$request({
        url: 'intent-config',
        method: 'get',
        openapi: true,
        unneedTips: true
      })
        .then(res => {
          if (res && res.status === 200) {
            const data = res.data.Data || {};
            this.published = true;
            this.minConfidence =
              data.min_confidence === null || data.min_confidence === undefined
                ? 0.6
                : Number(data.min_confidence);
            this.questions = (data.questions || []).map(question =>
              this.normalizeQuestion(question)
            );
            this.originalMinConfidence = this.minConfidence;
            this.originalQuestions = cloneDeep(this.questions);
          } else if (res && res.status === 404) {
            this.published = false;
            this.minConfidence = 0.6;
            this.questions = [];
            this.originalMinConfidence = 0.6;
            this.originalQuestions = [];
          } else {
            this.$Message.error(this.$t('intentConfig.loadFailed'));
          }
        })
        .catch(() => {
          this.$Message.error(this.$t('intentConfig.loadFailed'));
        })
        .finally(() => {
          this.loading = false;
        });
    },

    enterEditMode() {
      this.mode = 'edit';
      this.originalMinConfidence = this.minConfidence;
      this.originalQuestions = cloneDeep(this.questions);
    },

    exitEditMode() {
      if (this.isDirty) {
        this.$Modal.confirm({
          title: this.$t('com.informationTips'),
          content: this.$t('intentConfig.exitConfirm'),
          onOk: () => {
            this.performExitEditMode();
            this.$Message.info(this.$t('intentConfig.exitDone'));
          },
          onCancel: () => {
            this.$Message.info(this.$t('intentConfig.exitCancelled'));
          }
        });
        return;
      }
      this.performExitEditMode();
    },

    performExitEditMode() {
      this.mode = 'view';
      this.minConfidence = this.originalMinConfidence;
      this.questions = cloneDeep(this.originalQuestions);
      this.fetchConfig();
    },

    findQuestionIndex(row) {
      if (!row) {
        return -1;
      }
      return this.questions.findIndex(item => item._uid === row._uid);
    },

    onAddQuestion() {
      if (this.questions.length >= this.maxQuestions) {
        this.$Message.error(
          this.$t('intentConfig.tipMaxQuestionsAdd', { max: this.maxQuestions })
        );
        return;
      }
      this.formMode = 'add';
      this.currentQuestion = null;
      this.formVisible = true;
    },

    onEditQuestion(row) {
      const index = this.findQuestionIndex(row);
      if (index < 0) {
        return;
      }
      this.formMode = 'edit';
      this.currentQuestion = cloneDeep(this.questions[index]);
      this.formVisible = true;
    },

    onViewQuestion(row) {
      const index = this.findQuestionIndex(row);
      if (index < 0) {
        return;
      }
      this.currentQuestion = cloneDeep(this.questions[index]);
      this.viewVisible = true;
    },

    onDeleteQuestion(row) {
      this.$Modal.confirm({
        title: this.$t('com.informationTips'),
        content: this.$t('intentConfig.deleteConfirm'),
        onOk: () => {
          const index = this.findQuestionIndex(row);
          if (index >= 0) {
            this.questions.splice(index, 1);
          }
          this.$Message.success(this.$t('intentConfig.deleteDone'));
        },
        onCancel: () => {
          this.$Message.info(this.$t('com.tipCancelDel'));
        }
      });
    },

    validateOptions(question) {
      const isChoice = question.type === 'choice';
      const options = isChoice ? question.criteria || [] : question.levels || [];
      if (!options.length || options.length > this.maxOptions) {
        return isChoice
          ? this.$t('intentConfig.tipCriteriaCount', { max: this.maxOptions })
          : this.$t('intentConfig.tipLevelsCount', { max: this.maxOptions });
      }
      const names = [];
      for (let i = 0; i < options.length; i++) {
        const name = String(options[i].name || '').trim();
        if (!name) {
          return isChoice
            ? this.$t('intentConfig.tipOptionNameRequired')
            : this.$t('intentConfig.tipLevelNameRequired');
        }
        if (isChoice && name.indexOf('|') !== -1) {
          return this.$t('intentConfig.tipOptionNameNoPipe');
        }
        names.push(name);
      }
      if ([...new Set(names)].length !== names.length) {
        return isChoice
          ? this.$t('intentConfig.tipOptionNameDuplicate')
          : this.$t('intentConfig.tipLevelNameDuplicate');
      }
      return '';
    },

    validateOverride(value) {
      if (value === null || value === undefined || value === '') {
        return '';
      }
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 1) {
        return this.$t('intentConfig.tipOverrideRange');
      }
      return '';
    },

    onQuestionSubmit(data) {
      const name = (data.name || '').trim();
      const editUid =
        this.formMode === 'edit' && this.currentQuestion ? this.currentQuestion._uid : '';
      const duplicated = this.questions.some(question => {
        if (editUid && question._uid === editUid) {
          return false;
        }
        return (question.name || '').trim() === name;
      });
      if (duplicated) {
        this.$Message.error(this.$t('intentConfig.tipQuestionNameDuplicate'));
        return;
      }

      const item = Object.assign({}, data, { _uid: editUid || nextUid() });
      const index = editUid
        ? this.questions.findIndex(question => question._uid === editUid)
        : -1;
      if (index >= 0) {
        this.questions.splice(index, 1, item);
      } else {
        this.questions.push(item);
      }

      this.formVisible = false;
      this.$Message.success(
        this.formMode === 'add'
          ? this.$t('intentConfig.addDone')
          : this.$t('intentConfig.savedDone')
      );
    },

    validateAll() {
      const minConfidence = Number(this.minConfidence);
      if (
        this.minConfidence === null ||
        this.minConfidence === undefined ||
        this.minConfidence === '' ||
        isNaN(minConfidence) ||
        minConfidence < 0 ||
        minConfidence > 1
      ) {
        return this.$t('intentConfig.tipMinConfidence');
      }
      if (this.questions.length > this.maxQuestions) {
        return this.$t('intentConfig.tipMaxQuestions', { max: this.maxQuestions });
      }
      const names = [];
      for (let i = 0; i < this.questions.length; i++) {
        const question = this.questions[i];
        const name = (question.name || '').trim();
        if (!name) {
          return this.$t('intentConfig.tipQuestionNameRequired');
        }
        if (names.indexOf(name) !== -1) {
          return this.$t('intentConfig.tipQuestionNameDuplicate');
        }
        names.push(name);
        if (question.type !== 'choice' && question.type !== 'score') {
          return this.$t('intentConfig.tipTypeInvalid');
        }
        const optionError = this.validateOptions(question);
        if (optionError) {
          return optionError;
        }
        if (!(question.instructions || '').trim()) {
          return this.$t('intentConfig.tipInstructionsRequired');
        }
        const overrideError = this.validateOverride(question.min_confidence);
        if (overrideError) {
          return overrideError;
        }
      }
      return '';
    },

    buildQuestionPayload(question) {
      const item = {
        name: (question.name || '').trim(),
        type: question.type,
        instructions: (question.instructions || '').trim()
      };
      if (question.type === 'choice') {
        const criteria = {};
        (question.criteria || []).forEach(option => {
          criteria[String(option.name || '').trim()] = String(option.description || '').trim();
        });
        item.criteria = criteria;
      } else {
        item.levels = (question.levels || []).map(option => ({
          name: String(option.name || '').trim(),
          description: String(option.description || '').trim()
        }));
      }
      if (question.min_confidence !== null && question.min_confidence !== undefined) {
        item.min_confidence = Number(question.min_confidence);
      }
      return item;
    },

    saveConfig() {
      const error = this.validateAll();
      if (error) {
        this.$Message.error(error);
        return;
      }

      const payload = {
        min_confidence: Number(this.minConfidence),
        questions: this.questions.map(question => this.buildQuestionPayload(question))
      };

      this.submitting = true;
      this.$request({
        url: 'intent-config',
        method: 'put',
        data: payload,
        openapi: true
      })
        .then(res => {
          if (res && res.status === 200) {
            this.$Message.success(this.$t('intentConfig.publishSuccess'));
            this.mode = 'view';
            this.fetchConfig();
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
    }
  },

  mounted() {
    this.fetchConfig().then(() => {
      if (!this.published) {
        this.enterEditMode();
      }
    });
  }
};
</script>

<style lang="less" scoped>
.intent-config {
  /deep/ .page-table .page {
    display: none;
  }

  .ic-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .ic-desc {
    color: #515a6e;
    font-size: 14px;
  }

  .ic-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ic-unpublished-tip {
    margin-bottom: 16px;
  }

  .ic-global-value {
    color: #17233d;
    line-height: 32px;
  }

  .ic-card {
    margin-bottom: 16px;
  }

  .ic-list-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin-bottom: 12px;
  }
}
</style>