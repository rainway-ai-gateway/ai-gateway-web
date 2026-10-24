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
    <Form ref="formItem" :model="formData" :rules="ruleValidate" label-position="top">
        <FormItem :label="$t('com.userName')" prop="user_name">
            <Input
                v-model="formData.user_name"
                type="text"
                :placeholder="$t('com.tipRequiredX', { obj: $t('com.userName') })"
                class="com-create-input"
                disabled
            />
        </FormItem>
        <FormItem v-if="isSelf" :label="$t('user.oldPassword')" prop="old_password">
            <Input
                v-model="formData.old_password"
                type="password"
                autocomplete="off"
                :placeholder="$t('com.tipEnterX', { obj: $t('user.oldPassword') })"
                class="com-create-input"
            />
        </FormItem>
        <FormItem :label="$t('user.newPassword')" prop="new_password">
            <Input
                v-model="formData.new_password"
                type="password"
                autocomplete="off"
                :placeholder="$t('user.passwordPlaceholder')"
                class="com-create-input"
            />
        </FormItem>
        <FormItem :label="$t('user.confirmPassword')" prop="confirmPass">
            <Input
                v-model="formData.confirmPass"
                type="password"
                :placeholder="$t('user.tipConfirmPasswordRule')"
                class="com-create-input"
            />
        </FormItem>
        <FormItem class="drawer-footer">
            <Button size="small" type="primary" @click="submit('formItem')">
                {{ $t('com.submit') }}
            </Button>
            <Button size="small" @click="$emit('cancel')">
                {{ $t('com.cancel') }}
            </Button>
        </FormItem>
    </Form>
</template>
<script>
import { PasswordRegCheck } from '@/utils/const';
export default {
    name: 'updatePassword',

    computed: {
        userData() {
            return this.$store.getUser();
        },
        isSelf() {
            return this.formData.user_name === this.userData.name;
        }
    },

    props: {
        currentData: {
            type: Object,
            required: true
        }
    },
    watch: {
        currentData: {
            handler(v) {
                this.formData.user_name = v.user_name;
            },
            immediate: true
        }
    },

    data() {
        const validateOldPass = (rule, value, callback) => {
            if (!this.isSelf) {
                callback();
            }
            if (value === '') {
                callback(new Error(this.$t('com.tipEnterX', { obj: this.$t('user.oldPassword') })));
                return;
            }
            callback();
        };
        const validateNewPass = (rule, value, callback) => {
            if (value === '') {
                callback(new Error(this.$t('com.tipEnterX', { obj: this.$t('user.newPassword') })));
                return;
            }
            if (!PasswordRegCheck(value, this.formData.user_name)) {
                const byteLength = new TextEncoder().encode(value).length;
                if (byteLength < 8 || byteLength > 72) {
                    callback(new Error(this.$t('user.tipPasswordLength')));
                    return;
                }
                if (/\s/.test(value)) {
                    callback(new Error(this.$t('user.tipPasswordWhitespace')));
                    return;
                }
                callback(new Error(this.$t('user.tipPasswordUserName')));
                return;
            }
            if (this.formData.confirmPass !== '') {
                this.$refs.formItem.validateField('confirmPass');
            }
            callback();
        };
        const validatePassCheck = (rule, value, callback) => {
            if (value === '') {
                callback(new Error(this.$t('user.tipConfirmPasswordRule')));
                return;
            }
            if (value !== this.formData.new_password) {
                callback(new Error(this.$t('user.tipConfirmError')));
                return;
            }
            callback();
        };

        return {
            formData: {
                user_name: '',
                old_password: '',
                new_password: '',
                confirmPass: ''
            },
            ruleValidate: {
                user_name: [{ required: true, trigger: 'blur' }],
                new_password: [{ required: true, validator: validateNewPass, trigger: 'change' }],
                old_password: [{ required: true, validator: validateOldPass, trigger: 'change' }],
                confirmPass: [{ required: true, validator: validatePassCheck, trigger: 'change' }]
            }
        };
    },
    methods: {
        submit(name) {
            this.$refs[name].validate(valid => {
                if (valid) {
                    this.$emit('submit', this.formData, this.isSelf);
                }
            });
        }
    }
};
</script>
