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

function applyHas(el) {
    if (store.isReadonly()) {
        el.classList.add(HIDDEN_CLASS);
    } else {
        el.classList.remove(HIDDEN_CLASS);
    }
}

const has = Vue.directive('has', {
    inserted: applyHas,
    update: applyHas,
});

export default { preventReClick, has };
