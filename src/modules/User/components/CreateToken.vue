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
/**
* Copyright (c) 2021 The BFE Authors.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
<template>
    <div>
        <Form ref="formData" :model="formData" :rules="ruleValidate" label-position="top">
            <FormItem :label="$t('com.name')" prop="name">
                <Input
                    v-model="formData.name"
                    type="text"
                    :placeholder="$t('com.tipEnterX', { obj: $t('com.name') })"
                    class="com-create-input"
                    :maxlength="64"
                />
            </FormItem>
            <FormItem :label="$t('user.role')" prop="scope">
                <RadioGroup v-model="formData.scope">
                    <Radio label="System">{{ $t('user.system') }}</Radio>
                    <Radio label="SystemReadonly">{{ $t('user.systemReadonly') }}</Radio>
                    <Radio label="Support">{{ $t('user.support') }}</Radio>
                </RadioGroup>
            </FormItem>
            <FormItem class="drawer-footer">
                <Button size="small" type="primary" @click="onSubmit('formData')">
                    {{ $t('com.submit') }}
                </Button>
                <Button size="small" @click="handleReset('formData')">
                    {{ $t('com.reset') }}
                </Button>
            </FormItem>
        </Form>
    </div>
</template>

<script>
import { TokenNameRegCheck } from '@/utils/const';
export default {
    data() {
        const validateName = (rule, value, callback) => {
            if (value === '') {
                callback(new Error(this.$t('com.tipEnterX', { obj: this.$t('com.name') })));
                return;
            }
            if (!TokenNameRegCheck(value)) {
                callback(new Error(this.$t('user.tipTokenNameRule')));
                return;
            }
            callback();
        };
        return {
            formData: {
                name: '',
                scope: ''
            },
            ruleValidate: {
                name: [{ required: true, validator: validateName, trigger: 'blur' }],
                scope: [
                    {
                        required: true,
                        message: this.$t('com.tipSelectX', { obj: this.$t('user.role') }),
                        trigger: 'change'
                    }
                ]
            }
        };
    },
    methods: {
        onSubmit(name) {
            this.$refs[name].validate(valid => {
                if (valid) {
                    this.$emit('submitData', this.formData);
                }
            });
        },
        handleReset(name) {
            this.$refs[name].resetFields();
        }
    }
};
</script>

<style lang="scss" scoped></style>
