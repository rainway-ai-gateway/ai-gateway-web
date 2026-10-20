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
  <div class="bfe-login">
    <div class="bfe-login-hearder">
      <p class="text">{{ brandingTitle }}</p>
    </div>
    <div class="login-wrap">
      <div class="title">{{ $t('login.userLogin') }}</div>
      <Form ref="formData" :model="formData" :rules="ruleInline">
        <FormItem prop="user" class="user_title">
          <Input
            v-model="formData.user"
            type="text"
            :placeholder="$t('com.tipEnterX', { obj: $t('com.userName') })"
            size="large"
          >
            <Icon type="ios-person-outline" slot="prepend"></Icon>
          </Input>
        </FormItem>
        <FormItem prop="password">
          <Input
            v-model="formData.password"
            type="password"
            :placeholder="$t('com.tipEnterX', { obj: $t('com.password') })"
            size="large"
          >
            <Icon type="ios-lock-outline" slot="prepend"></Icon>
          </Input>
        </FormItem>
        <FormItem>
          <Button
            v-preventReClick
            type="primary"
            class="user_login_btn"
            @click="handleSubmit('formData')"
            >{{ $t('login.name') }}</Button
          >
        </FormItem>
      </Form>
    </div>
    <footer class="version">
      {{ $t('com.currentVersion') }} V{{ Version }}
    </footer>
  </div>
</template>
<script>
import { getBrandingTitle } from '@/utils/branding';
export default {
    name: 'loginpassword',
    computed: {
        brandingTitle() {
            return getBrandingTitle(this.$i18n.locale);
        }
    },
    data() {
        return {
            formData: {
                user: '',
                password: '',
                code: ''
            },
            ruleInline: {
                user: [
                    {
                        required: true,
                        message: this.$t('com.tipEnterX', { obj: this.$t('com.userName') }),
                        trigger: 'blur'
                    }
                ],
                password: [
                    {
                        required: true,
                        message: this.$t('com.tipEnterX', { obj: this.$t('com.password') }),
                        trigger: 'blur'
                    }
                ],
            }
        };
    },
    methods: {
        goLogin(data) {
            this.$store.setUserData(data);
            this.$router.push({
                name: 'product.home'
            });
        },
        handleSubmit(name) {
            this.$refs[name].validate(valid => {
                if (valid) {
                    const body = {
                        user_name: this.formData.user,
                        password: this.formData.password
                    };
                    this.$request({
                        url: 'auth/session-keys',
                        method: 'post',
                        data: body,
                        withoutAuth: true
                    }).then(data => {
                        if (data.status === 200) {
                            this.goLogin(data.data.Data);
                        } else {
                            this.$Message.error(data.data.ErrMsg || this.$t('login.loginFailed'));
                        }
                    }).catch(error => {
                        if (error.response && error.response.data && error.response.data.ErrMsg) {
                            this.$Message.error(error.response.data.ErrMsg);
                        } else {
                            this.$Message.error(this.$t('login.loginFailed'));
                        }
                    });
                } else {
                    this.$Message.error({
                        content: this.$t('com.tipValidateError')
                    });
                }
            });
        }
    }
};
</script>
<style lang="less" scoped>
.text{
    width: 240px;
    margin-left: 20px;
    text-align: center;
    color: white;
    background: #1a1a1ade;
    font-size: 18px;
    white-space: nowrap;
}
</style>
