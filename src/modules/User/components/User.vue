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
        <Button v-has class="add-button" type="primary" size="small" @click="onAdd">{{
            $t('com.createX', { obj: $t('user.name') })
        }}</Button>
        <Drawer
            v-model="isHiden"
            :title="
                handleType === 'create'
                    ? $t('com.createX', { obj: $t('user.name') })
                    : $t('user.changePassword')
            "
            width="30"
            :mask-closable="false"
        >
            <CreateUser
                v-if="isHiden && handleType === 'create'"
                :legacyRoleApi="roleApiLegacy"
                @submit="submitData"
            />
            <UpdatePassword
                v-if="isHiden && handleType === 'updatePassword'"
                :currentData="currentData"
                @submit="submitPassword"
                @cancel="isHiden = false"
            />
        </Drawer>
        <Drawer
            v-model="roleDrawerVisible"
            :title="$t('user.changeRole')"
            width="30"
            :mask-closable="false"
        >
            <Form ref="roleForm" :model="roleForm" label-position="top">
                <FormItem :label="$t('com.userName')">
                    <Input v-model="roleForm.user_name" disabled />
                </FormItem>
                <FormItem :label="$t('user.role')">
                    <div v-if="isBuiltinAdmin">{{ $t('user.tipRoleFixedBuiltin') }}</div>
                    <RadioGroup v-else v-model="roleForm.role">
                        <Radio label="system_admin">{{ $t('com.sysAdmin') }}</Radio>
                        <Radio label="system_admin_readonly">{{
                            $t('com.sysAdminReadonly')
                        }}</Radio>
                    </RadioGroup>
                </FormItem>
            </Form>
            <div class="drawer-footer">
                <Button size="small" type="primary" @click="submitRole">{{
                    $t('com.submit')
                }}</Button>
                <Button size="small" @click="roleDrawerVisible = false">{{
                    $t('com.cancel')
                }}</Button>
            </div>
        </Drawer>
        <pageTable ref="pageTable" :tableData="tableData" :columns="columns" :loading="loading" />
    </div>
</template>

<script>
import pageTable from '@/components/table/pageTable';
import CreateUser from './CreateUser.vue';
import UpdatePassword from './UpdatePassword.vue';
import { resolveRole, isLegacyRoleApi, ROLE_SYSTEM_ADMIN } from '@/utils/role';
export default {
    components: {
        pageTable,
        CreateUser,
        UpdatePassword
    },
    mounted() {
        this.getUserList();
    },
    data() {
        const that = this;
        return {
            loading: false,
            isHiden: false,
            handleType: '',
            currentData: {},
            roleDrawerVisible: false,
            // 列表来自 0.10 后端（只有 is_admin）时改走旧的角色/创建接口
            roleApiLegacy: false,
            roleForm: {
                user_name: '',
                role: 'system_admin'
            },
            tableData: [],
            associatedUseList: [],
            columns: [
                {
                    key: 'user_name',
                    title: this.$t('user.name'),
                    searchable: true,
                    sortable: 'custom'
                },
                {
                    key: 'role',
                    title: this.$t('user.role'),
                    searchable: true,
                    searchType: 'select',
                    searchFilters: [
                        { label: this.$t('com.sysAdmin'), value: 'system_admin' },
                        { label: this.$t('com.sysAdminReadonly'), value: 'system_admin_readonly' }
                    ],
                    render(h, params) {
                        return h('span', that.roleLabel(resolveRole(params.row)));
                    }
                },
                {
                    key: 'action',
                    title: this.$t('com.operation'),
                    render(h, params) {
                        return h('div', [
                            h(
                                'Button',
                                {
                                    props: {
                                        type: 'primary',
                                        size: 'small'
                                    },
                                    directives: [{ name: 'has' }],
                                    style: {
                                        marginRight: '10px'
                                    },
                                    on: {
                                        click: () => {
                                            that.onChangeRole(params);
                                        }
                                    }
                                },
                                that.$t('user.changeRole')
                            ),
                            h(
                                'Button',
                                {
                                    props: {
                                        type: 'primary',
                                        size: 'small'
                                    },
                                    directives: [{ name: 'has' }],
                                    style: {
                                        marginRight: '10px'
                                    },
                                    on: {
                                        click: () => {
                                            that.onUpdatePassword(params);
                                        }
                                    }
                                },
                                that.$t('user.changePassword')
                            ),
                            h(
                                'Button',
                                {
                                    props: {
                                        type: 'error',
                                        size: 'small'
                                    },
                                    directives: [{ name: 'has' }],
                                    on: {
                                        click: () => {
                                            that.onDel(params);
                                        }
                                    }
                                },
                                that.$t('com.del')
                            )
                        ]);
                    }
                }
            ]
        };
    },
    computed: {
        isBuiltinAdmin() {
            return String((this.roleForm && this.roleForm.user_name) || '').toLowerCase() === 'admin';
        }
    },
    methods: {
        roleLabel(role) {
            if (role === 'system_admin_readonly') {
                return this.$t('com.sysAdminReadonly');
            }
            if (role === 'system_admin') {
                return this.$t('com.sysAdmin');
            }
            return this.$t('com.ordinaryUser');
        },
        onChangeRole(params) {
            this.roleForm = {
                user_name: params.row.user_name,
                role: resolveRole(params.row) || ROLE_SYSTEM_ADMIN
            };
            this.roleDrawerVisible = true;
        },
        submitRole() {
            if (this.isBuiltinAdmin) {
                this.$Message.error({ content: this.$t('user.tipRoleFixedBuiltin') });
                return;
            }
            if (!this.roleForm.role) {
                this.$Message.error({ content: this.$t('user.tipSelectRole') });
                return;
            }
            // 0.10 后端只有 is_admin（仅支持 true），无法设置只读角色
            if (this.roleApiLegacy && this.roleForm.role !== ROLE_SYSTEM_ADMIN) {
                this.$Message.error({ content: this.$t('user.tipRoleReadonlyUpgrade') });
                return;
            }
            const legacy = this.roleApiLegacy;
            this.$request({
                url: this.$urlFormat(
                    legacy ? 'auth/users/{user_name}/is_admin' : 'auth/users/{user_name}/role',
                    {
                        user_name: this.roleForm.user_name
                    }
                ),
                method: 'patch',
                data: legacy ? { is_admin: true } : { role: this.roleForm.role }
            }).then(data => {
                if (data.status === 200) {
                    this.$Message.success({ content: this.$t('com.tipEditSuccX', { obj: this.$t('user.role') }) });
                    this.roleDrawerVisible = false;
                    this.getUserList();
                }
            });
        },
        submitPassword(data, self) {
            this.upsertPassWord(data, self);
        },
        upsertPassWord(data, self) {
            let tmpData = {};
            if (self) {
                tmpData = {
                    old_password: data.old_password,
                    password: data.new_password
                };
            } else {
                tmpData = {
                    password: data.new_password
                };
            }
            this.$request({
                url: this.$urlFormat('auth/users/{user_name}/passwd', {
                    user_name: data.user_name
                }),
                method: 'patch',
                data: tmpData
            }).then(data => {
                if (data.status === 200) {
                    this.$Message.success({
                        content: this.$t('com.tipEditSuccX', { obj: this.$t('com.password') })
                    });
                    this.isHiden = false;
                    if (self) {
                        this.$Modal.warning({
                            title: this.$t('com.tips'),
                            content: this.$t('user.tipPasswordModified'),
                            onOk: () => {
                                location.href = `${window.location.protocol}//${window.location.host}/login`;
                            }
                        });
                    }
                }
            });
        },
        onDel(params) {
            this.$Modal.confirm({
                title: this.$t('com.informationTips'),
                content:
                    this.$t('com.confirmDelX', { obj: this.$t('user.name') }) +
                    params.row.user_name +
                    '?',
                onOk: () => {
                    this.onDelAdminUser(params.row.user_name);
                }
            });
        },
        onDelAdminUser(name) {
            // 当前登录用户名：优先 store，其次 localStorage（与 request 拦截器同源）。
            // 原实现只用 store 且未判空——user 为 null 时 `user.name` 抛错并被 then 静默吞掉，
            // 表现为「自删成功但没有提示、也不退出」（覆盖缺口清单 #86）。
            const currentUserName = (() => {
                const storeUser = this.$store.getUser();
                if (storeUser && storeUser.name) {
                    return String(storeUser.name);
                }
                try {
                    const lsUser = JSON.parse(
                        localStorage.getItem('user') || '{}'
                    );
                    return String((lsUser && lsUser.name) || '');
                } catch (e) {
                    return '';
                }
            })();
            this.$request({
                url: this.$urlFormat('auth/users/{user_name}', {
                    user_name: name
                }),
                method: 'delete'
            }).then(data => {
                if (!data || data.status !== 200) {
                    return;
                }
                const isSelf =
                    currentUserName !== '' &&
                    currentUserName.toLowerCase() ===
                        String(name).toLowerCase();
                if (isSelf) {
                    // iView Modal 单实例：删除确认刚关闭时立刻弹 error 会被吞掉，
                    // 先 remove 再在 nextTick 弹出（#86 实测）
                    setTimeout(() => {
                        this.$Modal.remove();
                        this.$Modal.error({
                            loading: true,
                            title: this.$t('com.informationTips'),
                            content: this.$t('user.tipUserDel'),
                            onOk: () => {
                                this.$Modal.remove();
                                try {
                                    localStorage.removeItem('user');
                                    localStorage.removeItem('token');
                                } catch (e) {
                                    /* ignore */
                                }
                                this.$store.state.user = null;
                                location.href = `${window.location.protocol}//${window.location.host}/login`;
                            }
                        });
                    }, 400);
                } else {
                    this.getUserList();
                }
            });
        },
        submitData(data) {
            if (data) {
                this.onAddAdminUser(data);
            }
        },
        onAddAdminUser(data) {
            // 0.10 后端不认 role，按旧契约只下发 is_admin（仅系统管理员可选）
            const payload = this.roleApiLegacy
                ? {
                      user_name: data.user_name,
                      password: data.password,
                      is_admin: data.role === ROLE_SYSTEM_ADMIN
                  }
                : data;
            this.$request({
                url: 'auth/users',
                method: 'post',
                data: payload
            }).then(data => {
                if (data.status === 200) {
                    this.$Message.success({ content: this.$t('com.tipAddSucc') });
                    this.isHiden = false;
                    this.getUserList();
                }
            });
        },
        getUserList() {
            this.loading = true;
            this.$request({
                url: 'auth/users',
                method: 'get'
            })
                .then(data => {
                    if (data.status === 200) {
                        this.tableData = data.data.Data;
                        this.roleApiLegacy = isLegacyRoleApi(this.tableData);
                    }
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        onAdd() {
            this.isHiden = true;
            this.handleType = 'create';
        },
        onUpdatePassword(params) {
            this.isHiden = true;
            this.handleType = 'updatePassword';
            this.currentData = params.row;
        }
    }
};
</script>

<style lang="less" scoped></style>
