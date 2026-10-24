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
    <div class="expression">
        <div v-for="item in expressionConfig" :key="item.id || item.name" class="expression-item">
            <div v-if="item.buttons && item.buttons.length > 0" class="expression-item-box">
                <div class="title">{{ item.name }}:</div>
                <div class="expression-item-body">
                    <Tooltip
                        placement="top"
                        class="content"
                        v-for="ele in item.buttons"
                        :key="ele.name"
                        theme="light"
                        :transfer="true"
                        :disabled="!ele.description && !ele.example"
                    >
                        <div slot="content" class="expression-content">
                            <p class="vars-expression-title">
                                {{ ele.description }}
                            </p>
                            <div
                                v-html="ele.example"
                                class="vars-expression-name"
                            ></div>
                        </div>
                        <div
                    @click="onBtnClick(ele)"
                    :class="['vars-expression-show', { 'readonly': readonly }]"
                >
                    {{ ele.name }}
                </div>
                    </Tooltip>
                </div>
            </div>
        </div>
        <Input
            v-model="localExpression"
            type="textarea"
            :rows="6"
            class="expression"
            :disabled="readonly"
            @on-change="changeExpression"
        />
    </div>
</template>
<script>
import { controller, connController } from './ExpressionConfig';
export default {
    name: 'Expression',
    props: {
        expression: {
            type: String,
            default: ''
        },
        vars: {
            type: Array,
            default: function () {
                return [];
            }
        },
        type: {
            type: String,
            default: 'controller'
        },
        readonly: {
            type: Boolean,
            default: false
        },
        // Group ids of controller palette to hide, e.g. ['response'] for
        // request-phase rule forms where response primitives never match.
        hideGroups: {
            type: Array,
            default: function () {
                return [];
            }
        }
    },
    computed: {
        conditionVars() {
            if (!this.vars) {
                return [];
            }
            return this.vars.map(item => {
                return {
                    name: '$' + item.name,
                    expression: '$' + item.name
                };
            });
        },
        expressionConfig() {
            if (this.type === 'controller') {
                return controller(this.conditionVars).filter(
                    item => !this.hideGroups.includes(item.id)
                );
            }
            return connController;
        }
    },
    watch: {
        expression: {
            handler(newVal) {
                this.localExpression = newVal;
            },
            immediate: true
        }
    },
    data() {
        return {
            localExpression: ''
        };
    },
    methods: {
        changeExpression() {
            if (this.localExpression === '') {
                this.$emit('expressionChanged', {
                    expression: '',
                    vars: this.vars,
                    errmsg: this.$t('com.tipNotEmptyX', { obj: this.$t('route.expression') })
                });
                return;
            }
            let that = this;
            this.$request({
                url: 'expression/verify',
                method: 'patch',
                unneedTips: true,
                data: {
                    expression: that.localExpression,
                    vars: that.vars
                }
            }).then(rsp => {
                let errmsg = '';
                if (rsp.status !== 200) {
                    errmsg = rsp.ErrMsg;
                    if (rsp.data) {
                        errmsg = rsp.data.message;
                    }
                }
                this.$emit('expressionChanged', {
                    expression: that.localExpression,
                    vars: that.vars,
                    errmsg
                });
            });
        },
        onBtnClick(data) {
            if (this.readonly) {
                return;
            }
            this.localExpression += data.expression;
            this.changeExpression();
        }
    }
};
</script>
<style lang="less" scoped>
.expression-item {
    background: #ffffff;
    .expression-item-box {
        display: flex;
        align-items: center;
        justify-content: left;
        flex-direction: row;
        border-bottom: 1px solid #eee;
        .title {
            color: #333;
            margin-right: 5px;
            min-width: 140px;
            flex-shrink: 0;
            text-align: right;
            line-height: 25px;
            font-weight: 500;
            font-size: 15px;
            white-space: nowrap;
        }
        .content {
            .vars-expression-show {
                border: 2px solid #eee;
                border-radius: 3px;
                margin: 3px;
                padding: 0 5px;
                cursor: pointer;
                box-sizing: border-box;
                line-height: 21px;
                &:hover {
                    border-color: red;
                }
                &.readonly {
                    cursor: not-allowed;
                    color: #999;
                    background: #f5f5f5;
                    &:hover {
                        border-color: #eee;
                    }
                }
            }
        }
    }
}
/deep/ .ivu-input {
    background-color: black;
    color: #ffffff;
}
</style>
<style lang="less">
/* Tooltip content is moved to document.body by iview's v-transfer-dom, so the
   scoped styles above (and any .expression-item ancestor requirement) can never
   match it; these must stay unscoped. theme="light" tooltips are only used by
   this component, so the inner width override stays local in practice. */
.ivu-tooltip-light .ivu-tooltip-inner {
    max-width: 560px;
    white-space: normal;
}
.expression-content {
    max-width: 536px;
}
.vars-expression-title {
    word-break: break-all;
    border: 1px solid #666;
    border-radius: 5px;
    padding: 5px;
    background: #eeeeee61;
}
.vars-expression-name {
    padding: 15px 5px 5px;
    p {
        word-break: break-all;
        border: 1px solid #666;
        border-radius: 5px;
        padding: 5px;
        background: #eee;
    }
}
</style>
