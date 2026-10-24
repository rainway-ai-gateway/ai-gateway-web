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
  <div>
    <Form
      ref="formData"
      :model="formData"
      :rules="ruleValidate"
      label-position="top"
      @submit.native.prevent
    >
      <FormItem :label="$t('entity.typeName')" prop="type_name">
        <Input
          v-model="formData.type_name"
          :disabled="!isAdd"
          :placeholder="$t('entity.typeNamePlaceholder')"
          :maxlength="32"
          show-word-limit
        ></Input>
        <p class="form-tip">{{ $t('entity.typeNameRule') }}</p>
      </FormItem>

      <FormItem :label="$t('entity.description')" prop="description">
        <Input
          v-model="formData.description"
          :placeholder="$t('entity.descriptionPlaceholder')"
          :maxlength="255"
          show-word-limit
        ></Input>
        <p class="form-tip">{{ $t('entity.typeDescriptionTip') }}</p>
      </FormItem>

      <FormItem :label="$t('entity.level')" prop="level">
        <Select v-model="formData.level" style="width: 100%;">
          <Option v-for="i in 5" :key="i" :value="i">{{ i }}</Option>
        </Select>
        <p class="form-tip">{{ $t('entity.levelTip') }}</p>
      </FormItem>

      <FormItem class="com-btn-box drawer-footer">
        <Button @click="handleCancel">{{ $t('com.cancel') }}</Button>
        <Button type="primary" @click="handleSubmit">{{ $t('com.confirm') }}</Button>
      </FormItem>
    </Form>
  </div>
</template>

<script>
import { cloneDeep } from 'lodash';
import { utf8ByteLength } from '@/utils/const';
export default {
    props: {
        currentData: {
            type: Object,
            default() {
                return {};
            }
        },
        isAdd: {
            type: Boolean,
            default: true
        }
    },
    data() {
      const that = this;
        const validateDescription = (rule, value, callback) => {
            const val = value === null || value === undefined ? '' : String(value);
            if (val === '') {
                callback();
                return;
            }
            if (utf8ByteLength(val) > 255) {
                callback(new Error(that.$t('entity.typeDescriptionLengthError')));
                return;
            }
            if (/[\x00-\x1F\x7F]/.test(val)) {
                callback(new Error(that.$t('entity.typeDescriptionControlCharsError')));
                return;
            }
            callback();
        };
        return {
            formData: {
                type_name: '',
                description: '',
                level: 1
            },
            ruleValidate: {
                type_name: [
                    { required: true, message: that.$t('entity.enterTypeName'), trigger: 'blur' },
                    { pattern: /^[a-z0-9]([a-z0-9_-]{0,30}[a-z0-9])?$/, message: that.$t('entity.typeNameFormatError'), trigger: 'blur' }
                ],
                description: [
                    { validator: validateDescription, trigger: 'blur' }
                ],
                level: [
                    { required: true, type: 'number', message: that.$t('entity.selectLevel'), trigger: 'change' }
                ]
            }
        };
    },
    watch: {
        currentData: {
            handler(val) {
                if (val && Object.keys(val).length > 0) {
                    this.formData = cloneDeep(val);
                }
            },
            immediate: true
        }
    },
    methods: {
        handleSubmit() {
            this.$refs.formData.validate(valid => {
                if (valid) {
                    this.$emit('submit', this.formData);
                }
            });
        },
        handleCancel() {
            this.$emit('cancel');
        }
    }
};
</script>

<style lang="less" scoped>
.form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
}
.form-tip {
    margin-top: 8px;
    font-size: 12px;
    color: #999;
}
</style>
