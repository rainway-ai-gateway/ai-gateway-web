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
  <div class="duration-input">
    <Input
      v-if="!rawMode"
      ref="combo"
      v-model="numText"
      class="duration-input-combo"
      @on-change="onNumInput"
    >
      <Select
        slot="append"
        :value="unit"
        class="duration-input-unit"
        @on-change="onUnitChange"
      >
        <Option value="ms">ms</Option>
        <Option value="s">s</Option>
        <Option value="m">m</Option>
      </Select>
    </Input>
    <Input
      v-else
      v-model="rawText"
      class="duration-input-raw"
      @on-change="onRawInput"
    />
  </div>
</template>

<script>
// Go duration 输入控件：v-model 绑定 duration 字符串（如 "500ms"/"2s"/"1m30s"）。
// 常规值拆成 数字 + 单位(ms/s/m)，以 iView 复合输入框（Input append Select）呈现；
// 无法拆分的组合写法（如 1m30s）回退为原始文本框。
const SIMPLE_RE = /^\+?(\d+(?:\.\d*)?|\.\d+)(ns|us|µs|ms|s|m|h)$/;
const UNIT_MS = {
    ns: 1e-6,
    us: 1e-3,
    'µs': 1e-3,
    ms: 1,
    s: 1000,
    m: 60000,
    h: 3600000
};

export default {
    name: 'DurationInput',

    props: {
        value: {
            type: [String, Number],
            default: ''
        },
        defaultUnit: {
            type: String,
            default: 's'
        }
    },

    data() {
        return {
            numText: '',
            unit: this.defaultUnit,
            rawMode: false,
            rawText: '',
            syncing: false,
            lastEmitted: ''
        };
    },

    watch: {
        value: {
            immediate: true,
            handler(val) {
                const str = val == null ? '' : String(val);
                // 自身 emit 的回灌（父组件写回 prop）不重新归一化：
                // 否则正在输入的小数点会被解析掉（"1." → "1"，继续输入变成 "15"）。
                // 空串例外：用于退出组合写法回退态，保留当前单位。
                if (str === this.lastEmitted) {
                    if (str !== '') {
                        return;
                    }
                    this.rawMode = false;
                    this.numText = '';
                    return;
                }
                this.syncing = true;
                if (str === '') {
                    this.rawMode = false;
                    this.numText = '';
                    this.unit = this.defaultUnit;
                } else {
                    const m = SIMPLE_RE.exec(str);
                    if (!m) {
                        this.rawMode = true;
                        this.rawText = str;
                    } else {
                        this.rawMode = false;
                        this.rawText = '';
                        this.unit = this.normalizeUnit(parseFloat(m[1]), m[2]);
                        const num =
                            this.unit === m[2]
                                ? parseFloat(m[1])
                                : this.convertNum(parseFloat(m[1]), m[2], this.unit);
                        this.numText = this.trimNum(num);
                    }
                }
                this.$nextTick(() => {
                    this.syncing = false;
                });
            }
        }
    },

    methods: {
        // 展示单位归一化到 ms/s/m：不足 1s 用 ms，不足 1m 用 s，否则用 m
        normalizeUnit(num, unit) {
            if (['ms', 's', 'm'].includes(unit)) {
                return unit;
            }
            const total = num * UNIT_MS[unit];
            if (total < 1000) return 'ms';
            if (total < 60000) return 's';
            return 'm';
        },

        convertNum(num, fromUnit, toUnit) {
            return (num * UNIT_MS[fromUnit]) / UNIT_MS[toUnit];
        },

        // 换算/归一化后的数值去掉多余小数位，避免 1s→m 出现 0.016666666666666666
        trimNum(num) {
            return String(Number(num.toFixed(6)));
        },

        // 输入过滤：仅保留数字与小数点
        onNumInput() {
            const cleaned = this.numText.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
            if (cleaned !== this.numText) {
                this.numText = cleaned;
                // iView Input 在「模型值未变化」时不会回写 DOM（如输入 "-" 后被清洗回空串），
                // 这里强制同步，避免输入框残留非法字符
                this.$nextTick(() => {
                    const inputEl =
                        this.$refs.combo &&
                        this.$refs.combo.$el &&
                        this.$refs.combo.$el.querySelector('input');
                    if (inputEl && inputEl.value !== this.numText) {
                        inputEl.value = this.numText;
                    }
                });
            }
            this.emitValue();
        },

        // 切换单位时换算数值，保持物理时长不变（500ms → s = 0.5s），避免单位误解造成数量级跳变
        onUnitChange(newUnit) {
            const num = parseFloat(this.numText);
            if (Number.isFinite(num)) {
                this.numText = this.trimNum(this.convertNum(num, this.unit, newUnit));
            }
            this.unit = newUnit;
            this.emitValue();
        },

        onRawInput() {
            this.lastEmitted = this.rawText;
            this.$emit('input', this.rawText);
        },

        emitValue() {
            if (this.syncing || this.rawMode) {
                return;
            }
            // 空输入 = 未设置，提交空串（由表单按默认值补齐）；
            // 非空输入一律原样提交（如 0 → "0s"），交由 duration 校验报错，不静默替换为默认值
            const next = this.numText === '' ? '' : `${this.numText}${this.unit}`;
            this.lastEmitted = next;
            this.$emit('input', next);
        }
    }
};
</script>

<style lang="less" scoped>
.duration-input {
    width: 100%;

    /deep/ .duration-input-combo {
        .ivu-input-group-append {
            padding: 0;
            background: #2d8cf0;
            border-color: #2d8cf0;
        }

        .duration-input-unit {
            width: 64px;

            .ivu-select-selection {
                border: none;
                background: transparent;
            }

            .ivu-select-placeholder,
            .ivu-select-selected-value {
                color: #fff;
            }

            .ivu-select-arrow {
                color: #fff;
            }
        }
    }

    .duration-input-raw {
        width: 100%;
    }
}
</style>
