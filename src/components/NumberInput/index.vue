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
  <Input
    ref="input"
    :value="text"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="onInput"
    @on-focus="onFocus"
    @on-blur="onBlur"
  />
</template>

<script>
export default {
    name: 'NumberInput',

    props: {
        value: {
            type: [String, Number],
            default: null
        },
        precision: {
            type: Number,
            default: 2
        },
        thousands: {
            type: Boolean,
            default: false
        },
        placeholder: {
            type: String,
            default: ''
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },

    data() {
        return {
            text: '',
            focused: false,
            lastEmitted: undefined
        };
    },

    watch: {
        value: {
            immediate: true,
            handler(val) {
                this.syncFromValue(val);
            }
        },
        precision() {
            this.syncFromValue(this.value, true);
        }
    },

    methods: {
        syncFromValue(val, force = false) {
            if (!force && val === this.lastEmitted) {
                return;
            }
            if (val === null || val === undefined || val === '') {
                this.text = '';
                return;
            }
            const num = Number(val);
            this.text = Number.isFinite(num) ? this.formatValue(num) : '';
        },

        // 数值 → 展示串：按 precision 补齐小数位，thousands 时整数部分加千分位
        formatValue(num) {
            const fixed = num.toFixed(this.precision);
            if (!this.thousands) {
                return fixed;
            }
            const [int, dec] = fixed.split('.');
            const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return dec === undefined ? grouped : `${grouped}.${dec}`;
        },

        // 展示串 → 去除千分位（聚焦后统一用无分隔符文本编辑）
        stripThousands(raw) {
            return this.thousands ? String(raw).replace(/,/g, '') : String(raw);
        },

        // 只保留数字与一个小数点，小数位不超过 precision
        sanitize(raw) {
            let next = this.stripThousands(raw).replace(/[^\d.]/g, '');
            const dot = next.indexOf('.');
            if (dot >= 0) {
                next =
                    next.slice(0, dot + 1) +
                    next.slice(dot + 1).replace(/\./g, '');
            }
            if (this.precision > 0 && next.indexOf('.') >= 0) {
                const [int, dec] = next.split('.');
                next = `${int}.${dec.slice(0, this.precision)}`;
            }
            return next;
        },

        // iView Input 在「模型值未变化」时不会回写 DOM（如输入非法字符被清洗掉），这里强制同步
        syncDom() {
            this.$nextTick(() => {
                const inputEl =
                    this.$refs.input &&
                    this.$refs.input.$el &&
                    this.$refs.input.$el.querySelector('input');
                if (inputEl && inputEl.value !== this.text) {
                    inputEl.value = this.text;
                }
            });
        },

        // precision=0 时文本允许出现小数点，但对外只回传取整后的值，
        // 避免「1.5」被拼成「15」这类数量级错误
        normalizeValue(value) {
            if (value === null || value === undefined) {
                return value;
            }
            return this.precision === 0 ? Math.round(value) : value;
        },

        emitValue(value) {
            value = this.normalizeValue(value);
            this.lastEmitted = value;
            this.$emit('input', value);
            this.$emit('on-change', value);
        },

        onInput(raw) {
            const cleaned = this.sanitize(raw);
            this.text = cleaned;
            if (cleaned !== raw) {
                this.syncDom();
            }
            this.emitValue(cleaned === '' ? null : Number(cleaned));
        },

        onFocus() {
            this.focused = true;
            if (this.thousands && this.text.indexOf(',') >= 0) {
                this.text = this.stripThousands(this.text);
                this.syncDom();
                this.$nextTick(() => {
                    const inputEl =
                        this.$refs.input &&
                        this.$refs.input.$el &&
                        this.$refs.input.$el.querySelector('input');
                    if (inputEl) {
                        const end = inputEl.value.length;
                        inputEl.selectionStart = inputEl.selectionEnd = end;
                    }
                });
            }
            this.$emit('on-focus');
        },

        // 失焦时补齐小数位（100 → 100.00），并把补齐后的数值回传，保证展示与模型一致
        onBlur() {
            this.focused = false;
            if (this.text === '') {
                this.emitValue(null);
                this.$emit('on-blur');
                return;
            }
            const num = Number(this.stripThousands(this.text));
            this.text = Number.isFinite(num) ? this.formatValue(num) : '';
            this.emitValue(this.text === '' ? null : num);
            this.$emit('on-blur');
        }
    }
};
</script>