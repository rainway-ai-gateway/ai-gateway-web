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
  <div class="question-form">
    <Form
      ref="questionForm"
      :model="formData"
      :rules="ruleValidate"
      label-position="top"
    >
      <FormItem
        :label="$t('intentConfig.nameLabel')"
        prop="name"
      >
        <Input
          v-model="formData.name"
          :placeholder="$t('intentConfig.namePlaceholder')"
        />
      </FormItem>

      <FormItem :label="$t('intentConfig.typeLabel')">
        <Select
          v-model="formData.type"
          style="width: 220px;"
          @on-change="onTypeChange"
        >
          <Option value="choice">
            {{ $t('intentConfig.typeChoice') }}
          </Option>
          <Option value="score">
            {{ $t('intentConfig.typeScore') }}
          </Option>
        </Select>
      </FormItem>

      <FormItem
        :label="$t('intentConfig.instructionsLabel')"
        prop="instructions"
      >
        <Input
          v-model="formData.instructions"
          type="textarea"
          :rows="3"
          :placeholder="$t('intentConfig.instructionsPlaceholder')"
        />
      </FormItem>

      <FormItem :label="optionLabel">
        <div
          v-for="(item, index) in optionList"
          :key="`o-${index}`"
          class="ic-item-row"
        >
          <Input
            v-model="item.name"
            :placeholder="optionNamePlaceholder"
            style="flex: 1;"
          />
          <Input
            v-model="item.description"
            :placeholder="optionDescPlaceholder"
            style="flex: 2;"
          />
          <Button type="error" size="small" @click="removeOption(index)">
            {{ $t('com.del') }}
          </Button>
        </div>
        <div v-if="!optionList.length" class="ic-list-empty">
          {{ emptyOptionText }}
        </div>
        <div style="margin-top: 8px;">
          <Button size="small" @click="addOption">
            {{ addOptionText }}
          </Button>
        </div>
      </FormItem>

      <FormItem :label="$t('intentConfig.minConfidenceOverrideLabel')">
        <InputNumber
          v-model="formData.min_confidence"
          :min="0"
          :max="1"
          :step="0.01"
          :placeholder="$t('intentConfig.minConfidenceOverridePlaceholder')"
          style="width: 220px;"
        />
      </FormItem>

      <FormItem class="com-btn-box drawer-footer">
        <Button type="primary" size="small" @click="handleSubmit">
          {{ $t('com.save') }}
        </Button>
        <Button size="small" style="margin-left: 8px;" @click="onCancel">
          {{ $t('com.cancel') }}
        </Button>
      </FormItem>
    </Form>
  </div>
</template>

<script>
import { cloneDeep } from 'lodash';

export default {
  name: 'QuestionForm',

  props: {
    question: {
      type: Object,
      default: null
    },
    maxOptions: {
      type: Number,
      default: 10
    }
  },

  data() {
    const validateName = (rule, value, callback) => {
      const name = String(value || '').trim();
      if (!name) {
        callback(new Error(this.$t('intentConfig.tipQuestionNameRequired')));
        return;
      }
      if (name.length > 64) {
        callback(new Error(this.$t('intentConfig.tipQuestionNameTooLong')));
        return;
      }
      callback();
    };

    const validateInstructions = (rule, value, callback) => {
      const instructions = String(value || '').trim();
      if (!instructions) {
        callback(new Error(this.$t('intentConfig.tipInstructionsRequired')));
        return;
      }
      callback();
    };

    return {
      formData: this.buildFormData(this.question),
      ruleValidate: {
        name: [
          {
            required: true,
            validator: validateName,
            trigger: 'blur'
          }
        ],
        instructions: [
          {
            required: true,
            validator: validateInstructions,
            trigger: 'blur'
          }
        ]
      }
    };
  },

  computed: {
    optionList() {
      return this.formData.type === 'choice'
        ? this.formData.criteria
        : this.formData.levels;
    },

    optionLabel() {
      return this.formData.type === 'choice'
        ? this.$t('intentConfig.criteriaLabel')
        : this.$t('intentConfig.levelsLabel');
    },

    optionNamePlaceholder() {
      return this.formData.type === 'choice'
        ? this.$t('intentConfig.optionNamePlaceholder')
        : this.$t('intentConfig.levelNamePlaceholder');
    },

    optionDescPlaceholder() {
      return this.formData.type === 'choice'
        ? this.$t('intentConfig.optionDescPlaceholder')
        : this.$t('intentConfig.levelDescPlaceholder');
    },

    addOptionText() {
      return this.formData.type === 'choice'
        ? this.$t('intentConfig.addOption')
        : this.$t('intentConfig.addLevel');
    },

    emptyOptionText() {
      return this.formData.type === 'choice'
        ? this.$t('intentConfig.emptyOptions')
        : this.$t('intentConfig.emptyLevels');
    }
  },

  methods: {
    buildFormData(question) {
      const type = question && question.type === 'score' ? 'score' : 'choice';
      return {
        name: (question && question.name) || '',
        type,
        instructions: (question && question.instructions) || '',
        criteria: type === 'choice' ? cloneDeep((question && question.criteria) || []) : [],
        levels: type === 'score' ? cloneDeep((question && question.levels) || []) : [],
        min_confidence:
          question && question.min_confidence !== null && question.min_confidence !== undefined
            ? question.min_confidence
            : null
      };
    },

    onTypeChange(type) {
      if (type === 'choice') {
        this.formData.levels = [];
        if (!this.formData.criteria) {
          this.formData.criteria = [];
        }
      } else {
        this.formData.criteria = [];
        if (!this.formData.levels) {
          this.formData.levels = [];
        }
      }
    },

    addOption() {
      const list = this.optionList;
      if (list.length >= this.maxOptions) {
        this.$Message.error(
          this.$t('intentConfig.tipMaxOptions', { max: this.maxOptions })
        );
        return;
      }
      list.push({ name: '', description: '' });
    },

    removeOption(index) {
      this.optionList.splice(index, 1);
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

    onCancel() {
      this.$emit('cancel');
    },

    handleSubmit() {
      this.$refs.questionForm.validate(valid => {
        if (!valid) {
          this.$Message.error(this.$t('com.tipValidateError'));
          return;
        }

        if (this.formData.type !== 'choice' && this.formData.type !== 'score') {
          this.$Message.error(this.$t('intentConfig.tipTypeInvalid'));
          return;
        }

        const optionError = this.validateOptions(this.formData);
        if (optionError) {
          this.$Message.error(optionError);
          return;
        }

        const overrideError = this.validateOverride(this.formData.min_confidence);
        if (overrideError) {
          this.$Message.error(overrideError);
          return;
        }

        const isChoice = this.formData.type === 'choice';
        const options = this.optionList;
        this.$emit('submit', {
          name: (this.formData.name || '').trim(),
          type: this.formData.type,
          instructions: (this.formData.instructions || '').trim(),
          criteria: isChoice
            ? options.map(item => ({
              name: String(item.name || '').trim(),
              description: String(item.description || '').trim()
            }))
            : [],
          levels: isChoice
            ? []
            : options.map(item => ({
              name: String(item.name || '').trim(),
              description: String(item.description || '').trim()
            })),
          min_confidence:
            this.formData.min_confidence === null ||
            this.formData.min_confidence === undefined ||
            this.formData.min_confidence === ''
              ? null
              : Number(this.formData.min_confidence)
        });
      });
    }
  }
};
</script>

<style lang="less" scoped>
.ic-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.ic-list-empty {
  color: #808695;
  font-size: 12px;
  padding: 8px 0;
}
</style>