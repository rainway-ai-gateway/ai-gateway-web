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
    <div class="bfe-sidebar">
        <div class="header">
            <p class="text">{{ brandingTitle }}</p>
        </div>

        <div class="Menu">
            <sidebar-nav></sidebar-nav>
        </div>
    </div>
</template>
<script>
import sidebarNav from './sidebarNav';
import { getBrandingTitle } from '@/utils/branding';
export default {
    name: 'sidebar',

    components: {
        'sidebar-nav': sidebarNav
    },
    computed: {
        brandingTitle() {
            return getBrandingTitle(this.$i18n.locale);
        }
    },
    data() {
        return {
            openNames: []
        };
    },
    methods: {}
};
</script>
<style lang="less" scoped>

</style>
