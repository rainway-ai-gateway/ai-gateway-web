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
        <div>
            <Form ref="formItem" :model="formItem" :rules="ruleValidate" label-position="top">
                <FormItem :label="$t('com.userName')" prop="user_name">
                    <Input
                        v-model="formItem.user_name"
                        type="text"
                        :placeholder="$t('com.tipEnterX', { obj: $t('com.userName') })"
                        class="com-create-input"
                        :maxlength="64"
                    />
                </FormItem>
                <FormItem :label="$t('com.password')" prop="password">
                    <Input
                        v-model="formItem.password"
                        type="password"
                        autocomplete="new-password"
                        :placeholder="$t('com.tipEnterX', { obj: $t('com.password') })"
                        class="com-create-input"
                    />
                </FormItem>
                <FormItem :label="$t('user.confirmPassword')" prop="confirmPass">
                    <Input
                        v-model="formItem.confirmPass"
                        type="password"
                        :placeholder="$t('user.tipConfirmPasswordRule')"
                        class="com-create-input"
                    />
                </FormItem>
                <FormItem :label="$t('user.role')" prop="role">
                    <RadioGroup v-model="formItem.role">
                        <Radio label="system_admin">{{ $t('com.sysAdmin') }}</Radio>
                        <Radio label="system_admin_readonly">{{
                            $t('com.sysAdminReadonly')
                        }}</Radio>
                    </RadioGroup>
                </FormItem>
            </Form>
            <div class="drawer-footer">
                <Button size="small" type="primary" @click="submitAdminUser('formItem')">{{
                    $t('com.create')
                }}</Button>
                <Button size="small" class="com-create-btn" @click="handleReset('formItem')">{{
                    $t('com.reset')
                }}</Button>
            </div>
        </div>
    </div>
</template>

<script>
import { UserNameRegCheck, PasswordRegCheck } from '@/utils/const';
const RESERVED_USER_NAMES = ['admin', 'root', 'system'];
export default {
    name: 'instancePools',
    data() {
        const validatePass = (rule, value, callback) => {
            if (value === '') {
                callback(new Error(this.$t('com.tipEnterX', { obj: this.$t('com.password') })));
                return;
            }
            if (!PasswordRegCheck(value, this.formItem.user_name)) {
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
            if (this.formItem.confirmPass !== '') {
                this.$refs.formItem.validateField('confirmPass');
            }
            callback();
        };
        const validatePassCheck = (rule, value, callback) => {
            if (value === '') {
                callback(new Error(this.$t('user.tipConfirmPasswordRule')));
                return;
            }
            if (value !== this.formItem.password) {
                callback(new Error(this.$t('user.tipConfirmError')));
                return;
            }
            callback();
        };
        const validateName = (rule, value, callback) => {
            if (value === '') {
                callback(new Error(this.$t('com.tipEnterX', { obj: this.$t('com.userName') })));
                return;
            }
            if (RESERVED_USER_NAMES.includes(String(value).trim().toLowerCase())) {
                callback(new Error(this.$t('user.tipReservedUserName')));
                return;
            }
            if (!UserNameRegCheck(value)) {
                callback(new Error(this.$t('user.tipNameRule')));
                return;
            }
            callback();
        };
        return {
            formItem: {
                user_name: '',
                password: '',
                confirmPass: '',
                role: 'system_admin'
            },
            ruleValidate: {
                user_name: [{ required: true, validator: validateName, trigger: 'blur' }],
                password: [{ required: true, validator: validatePass, trigger: 'blur' }],
                confirmPass: [{ required: true, validator: validatePassCheck, trigger: 'blur' }],
                role: [
                    {
                        required: true,
                        message: this.$t('user.tipSelectRole'),
                        trigger: 'change'
                    }
                ]
            }
        };
    },
    methods: {
        submitAdminUser(name) {
            this.$refs[name].validate(valid => {
                if (valid) {
                    this.$emit('submit', this.formItem);
                }
            });
        },
        handleReset(name) {
            this.$refs[name].resetFields();
        }
    }
};
</script>
