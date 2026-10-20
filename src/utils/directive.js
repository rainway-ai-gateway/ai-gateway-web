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
import Vue from 'vue';
import store from './store';

const preventReClick = Vue.directive('preventReClick', {
    inserted: function (el, binding) {
        el.addEventListener('click', () => {
            if (!el.disabled) {
                el.disabled = true;
                setTimeout(() => {
                    el.disabled = false;
                }, binding.value || 2000);
            }

        });
    }
});

// 只读管理员视角：v-has 用于隐藏写操作元素（新增/编辑/删除/改密/重置配额等）。
// 通过添加 CSS 类（.v-has-hidden 使用 display:none !important）隐藏，
// 避免与 v-show 写入的内联 display 相互覆盖。
const HIDDEN_CLASS = 'v-has-hidden';
// 同一个名字再落一份**属性**标记，作为隐藏兜底（原因为何必须兜底见 applyHas 注释）
const HIDDEN_ATTR = 'v-has-hidden';

/**
 * 应用/撤销只读隐藏标记。
 *
 * 为什么 class 之外还要落一个属性：被隐藏的元素若**自身还有响应式 class**
 * （典型是 iView Button：它的根节点 `:class="classes"` 由 props 计算），
 * 那么当该组件因 props 变化而重渲染时，Vue 的 class 模块会**整串重写 class 属性**
 * （`updateClass` → `el.setAttribute('class', cls)`），把我们这里命令式加上的
 * `v-has-hidden` 抹掉；而父级这一轮不会再 patch，指令钩子也就不会再执行，
 * 结果就是写按钮在只读视角下露出。属性不归 Vue 的 class 模块管，
 * 因此 `[v-has-hidden]` 能稳定兜住（CSS 同时匹配类与属性）。
 *
 * 实测（2026-10-17）：只读态筛选批量任务列表，行内「取消」按钮由终态变体
 * 切到非终态变体时 class 被抹掉；同轮未变体的行则保留——正是上述时序。
 */
function applyHas(el) {
    if (store.isReadonly()) {
        el.classList.add(HIDDEN_CLASS);
        el.setAttribute(HIDDEN_ATTR, '');
    } else {
        el.classList.remove(HIDDEN_CLASS);
        el.removeAttribute(HIDDEN_ATTR);
    }
}

const has = Vue.directive('has', {
    inserted: applyHas,
    update: applyHas,
});

export default { preventReClick, has };
