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
  <div class="page-table" @scroll.capture="onTableScroll">
    <div class="searchTable">
      <Table
        v-if="needSerarchInput"
        :columns="searchColumns"
        :data="[{ title: '' }]"
        :show-header="false"
        :row-class-name="rowClassName"
      ></Table>
    </div>

    <div class="show-iView-Table">
      <Table
        :columns="columns"
        :data="pageData"
        :border="border"
        width="95%"
        :height="height"
        @on-sort-change="sortChange"
        @on-row-click="handleRowClick"
        :loading="loading"
        :class="loading ? 'show-iView-Table-list' : ''"
        :draggable="draggable"
        @on-drag-drop="onDragDrop"
      >
      </Table>
    </div>

    <el-pagination
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      :current-page.sync="showCurrentPage"
      :page-sizes="pageSizes"
      :page-size="pageSize"
      layout="sizes, prev, pager, next"
      :total="serverPagination ? total : showTableData.length"
      background
      class="page"
    ></el-pagination>
  </div>
</template>
<script>
import { cloneDeep, isEmpty } from 'lodash';
export default {
    name: 'nonePageTable',

    props: {
        columns: {
            type: Array,
            default() {
                return [];
            }
        },

        tableData: {
            type: Array,
            default() {
                return [];
            }
        },

        border: {
            type: Boolean,
            default: true
        },

        height: {
            type: Number,
            default: null
        },

        loading: {
            type: Boolean,
            default: false
        },

        currentPage: {
            type: Number,
            default: 1
        },

        pageSize: {
            type: Number,
            default: 20
        },

        pageSizes: {
            type: Array,
            default: function () {
                return [20, 30, 40, 50];
            }
        },
        total: {
            type: Number,
            default: 0
        },
        serverPagination: {
            type: Boolean,
            default: false
        },
        draggable: {
            type: Boolean,
            default: false
        }
    },

    watch: {
        columns: {
            handler(data) {
                const that = this;
                this.searchColumns = [];
                data.forEach(item => {
                    const showTitle = item.showTitle ? item.searchMsg : item.title;
                    if (item.searchable) {
                        // Support custom search control types
                        if (item.searchType === 'select' && item.searchFilters) {
                            // Dropdown search
                            this.searchColumns.push({
                                key: item.key,
                                width: item.width,
                                maxWidth: item.maxWidth,
                                minWidth: item.minWidth,
                                render(h) {
                                    return h('Select', {
                                        props: {
                                            placeholder: that.$t('com.tipSelectX', { obj: showTitle }),
                                            value: item.searchValue,
                                            clearable: true,
                                            transfer: true,
                                            maxWidth: '230px'
                                        },
                                        on: {
                                            'on-change': value => {
                                                item.searchValue = value;
                                                that.searchTable(item);
                                            },
                                            'on-clear': () => {
                                                item.searchValue = null; // Use null instead of empty string to distinguish false values
                                                that.searchTable(item);
                                            }
                                        }
                                    }, item.searchFilters.map(filter =>
                                        h('Option', { props: { value: filter.value } }, filter.label)
                                    ));
                                }
                            });
                        } else {
                            // Default input search
                            this.searchColumns.push({
                                key: item.key,
                                width: item.width,
                                maxWidth: item.maxWidth,
                                minWidth: item.minWidth,
                                render(h) {
                                    return h('Input', {
                                        props: {
                                            placeholder:
                                                that.$t('com.tipEnterX', { obj: '' }) +
                                                showTitle +
                                                that.$t('com.query'),
                                            value: item.searchValue,
                                            maxWidth: '230px'
                                        },
                                        on: {
                                            'on-change': event => {
                                                item.searchValue = event.target.value;
                                                that.searchTable(item);
                                            }
                                        }
                                    });
                                }
                            });
                        }
                        this.needSerarchInput = true;
                    } else {
                        this.searchColumns.push({
                            key: item.key,
                            width: item.width,
                            maxWidth: item.maxWidth,
                            minWidth: item.minWidth
                        });
                    }
                });
            },
            deep: true,
            immediate: true
        },

        tableData: {
            handler(data) {
                if (!data) {
                    data = [];
                }
                if (this.serverPagination) {
                    this.showTableData = cloneDeep(data);
                    this.cloneShowData = cloneDeep(data);
                    this.handlePageData(this.showTableData, this.page);
                    return;
                }
                // Clear search conditions when external data is refreshed (e.g. after add/edit submit)
                this.columns.forEach(item => {
                    if (item.searchable) {
                        item.searchValue = null;
                    }
                });
                this.searchMessage = {};
                this.filterMessage = {};
                this.showTableData = cloneDeep(data);
                this.cloneShowData = cloneDeep(data);
                if (this.page.currentPage !== 1) {
                    this.page.currentPage = 1;
                } else {
                    this.handlePageData(this.showTableData, this.page);
                }
            },
            deep: true,
            immediate: true
        },

        currentPage(val) {
            if (this.serverPagination && val !== this.page.currentPage) {
                this.page.currentPage = val;
                this.showCurrentPage = val;
            }
        },

        pageSize(val) {
            if (this.serverPagination && val !== this.page.pageSize) {
                this.page.pageSize = val;
            }
        },

        page: {
            handler(data) {
                this.handlePageData(this.showTableData, data);
            },
            deep: true
        }
    },

    mounted() {
        this.showCurrentPage = this.currentPage;
        this.page = {
            currentPage: this.currentPage,
            pageSize: this.pageSize
        };
    },

    data() {
        return {
            searchColumns: [],
            showTableData: [],
            cloneShowData: [],
            pageData: [],
            needSerarchInput: false,
            showCurrentPage: 0,
            searchMessage: {},
            filterMessage: {},
            page: {
                currentPage: 1,
                pageSize: 20
            }
        };
    },

    methods: {
        searchTable(event) {
            if (event !== 'filter-message') {
                // Boolean false is a valid search value, only empty string, null, undefined should clear
                if (event.searchValue === '' || event.searchValue === null || event.searchValue === undefined) {
                    this.$delete(this.searchMessage, event.key);
                    this.$delete(this.searchMessage, event.key + '_render_', event.render);
                } else {
                    this.$set(this.searchMessage, event.key, event.searchValue);
                    if (event.render) {
                        this.$set(this.searchMessage, event.key + '_render_', event.render);
                    }
                }
            }

            if (this.serverPagination) {
                const filters = {};
                for (let key in this.searchMessage) {
                    if (key.indexOf('_render_') === -1) {
                        filters[key] = this.searchMessage[key];
                    }
                }
                this.$emit('on-search-change', filters);
                return;
            }

            if (isEmpty(this.searchMessage) && isEmpty(this.filterMessage)) {
                this.showTableData = cloneDeep(this.tableData);
                this.cloneShowData = cloneDeep(this.showTableData);
                if (this.page.currentPage !== 1) {
                    this.page.currentPage = 1;
                } else {
                    this.handlePageData(this.showTableData, this.page);
                }
            } else {
                this.showTableData = [];
                const sourceData = this.tableData || [];
                for (let i = 0; i < sourceData.length; i++) {
                    let flag = true;
                    l: for (let key in this.searchMessage) {
                        if (key.indexOf('_render_') === -1) {
                            const searchValue = this.searchMessage[key];
                            const itemValue = sourceData[i][key];

                            // Exact match for boolean (supports strings 'true'/'false')
                            if (typeof searchValue === 'boolean' || searchValue === 'true' || searchValue === 'false') {
                                const boolValue = searchValue === 'true' || searchValue === true;
                                if (itemValue !== boolValue) {
                                    flag = false;
                                    break l;
                                } else {
                                    flag = true;
                                }
                            } else if (!this.searchMessage[key + '_render_']) {
                                // Regular string contains match
                                const item = itemValue + '';
                                if (
                                    item
                                        .toUpperCase()
                                        .indexOf(searchValue.toUpperCase()) === -1
                                ) {
                                    flag = false;
                                    break l;
                                } else {
                                    flag = true;
                                }
                            } else {
                                // Render function value match
                                const render = this.searchMessage[key + '_render_'](
                                    this.$createElement,
                                    {
                                        row: sourceData[i]
                                    }
                                );
                                const displayText = this.getRenderSearchText(render, itemValue);
                                if (
                                    displayText
                                        .toUpperCase()
                                        .indexOf(searchValue.toUpperCase()) === -1
                                ) {
                                    flag = false;
                                    break l;
                                } else {
                                    flag = true;
                                }
                            }
                        }
                    }
                    for (let key in this.filterMessage) {
                        if (this.filterMessage[key].indexOf(sourceData[i][key]) === -1) {
                            flag = false;
                            break;
                        }
                    }

                    if (flag) {
                        this.showTableData.push(sourceData[i]);
                    }
                }
                if (this.page.currentPage !== 1) {
                    this.page.currentPage = 1;
                } else {
                    this.handlePageData(this.showTableData, this.page);
                }
                this.cloneShowData = cloneDeep(this.showTableData);
            }
        },
        getRenderSearchText(render, fallbackValue) {
            const text = this.getShowTableChildren(render && render.children);
            if (text) {
                return text;
            }
            if (render && render.componentOptions && render.componentOptions.children) {
                const componentText = this.getShowTableChildren(render.componentOptions.children);
                if (componentText) {
                    return componentText;
                }
            }
            if (fallbackValue !== null && fallbackValue !== undefined) {
                return fallbackValue + '';
            }
            return '';
        },
        getShowTableChildren(node, content = []) {
            if (node == null) {
                return content.join(',').replace(/(^\s*)|(\s*$)/g, '');
            }
            const nodes = Array.isArray(node) ? node : [node];
            for (let i = 0; i < nodes.length; i++) {
                const item = nodes[i];
                if (item == null) {
                    continue;
                }
                if (typeof item === 'string' || typeof item === 'number') {
                    content.push(String(item));
                    continue;
                }
                if (item.text) {
                    content.push(item.text);
                }
                if (item.children && item.children.length > 0) {
                    this.getShowTableChildren(item.children, content);
                }
                if (item.componentOptions && item.componentOptions.children) {
                    this.getShowTableChildren(item.componentOptions.children, content);
                }
            }
            return content.join(',').replace(/(^\s*)|(\s*$)/g, '');
        },
        sortChange(data) {
            if (data.order === 'normal') {
                this.showTableData = cloneDeep(this.cloneShowData);
                if (this.page.currentPage !== 1) {
                    this.page.currentPage = 1;
                } else {
                    this.handlePageData(this.showTableData, this.page);
                }
                return;
            }
            if (data.column.customSort) {
                this.pageData = [];
                this.$nextTick(() => {
                    this.showTableData = this.$parent.customSort(
                        data,
                        cloneDeep(this.showTableData)
                    );
                });
            } else {
                const sortedData = cloneDeep(this.showTableData).sort((a, b) => {
                    return this.compareSortValues(
                        this.getSortValue(a, data.key),
                        this.getSortValue(b, data.key),
                        data.order
                    );
                });
                this.showTableData = sortedData;
            }
            if (this.page.currentPage !== 1) {
                this.page.currentPage = 1;
            } else {
                this.handlePageData(this.showTableData, this.page);
            }
        },
        getSortValue(row, key) {
            if (!row || !key) {
                return undefined;
            }
            return String(key).split('.').reduce((value, part) => {
                if (value == null) {
                    return undefined;
                }
                return value[part];
            }, row);
        },
        compareSortValues(valA, valB, order) {
            const asc = order === 'asc';
            const normalize = value => {
                if (value === null || value === undefined) {
                    return null;
                }
                if (typeof value === 'object') {
                    return null;
                }
                return value;
            };
            let a = normalize(valA);
            let b = normalize(valB);

            if (a === null && b === null) {
                return 0;
            }
            if (a === null) {
                return 1;
            }
            if (b === null) {
                return -1;
            }
            if (typeof a === 'boolean' || typeof b === 'boolean') {
                a = a === true ? 1 : 0;
                b = b === true ? 1 : 0;
                return asc ? a - b : b - a;
            }
            if (typeof a === 'number' && typeof b === 'number') {
                return asc ? a - b : b - a;
            }
            const strA = String(a);
            const strB = String(b);
            return asc ? strA.localeCompare(strB) : strB.localeCompare(strA);
        },
        filterTable(arr, key) {
            this.$delete(this.filterMessage, key);
            if (arr.length > 0) {
                this.$set(this.filterMessage, key, arr);
            }
            this.searchTable('filter-message');
        },
        rowClassName() {
            return 'iview_table_tr';
        },
        handleSizeChange(val) {
            if (this.serverPagination) {
                this.$emit('on-page-change', { page: 1, pageSize: val });
                return;
            }
            this.page.pageSize = val;
        },
        handleCurrentChange(val) {
            if (this.serverPagination) {
                this.$emit('on-page-change', { page: val, pageSize: this.page.pageSize });
                return;
            }
            this.page.currentPage = val;
        },
        handlePageData(data, page) {
            if (this.serverPagination) {
                this.pageData = data;
                this.showCurrentPage = page.currentPage;
                return;
            }
            const startIndex = (page.currentPage - 1) * page.pageSize;
            const endIndex = startIndex + page.pageSize;
            this.pageData = data.slice(startIndex, endIndex);
            this.showCurrentPage = page.currentPage;
        },
        onDragDrop(a, b) {
            const pageStartIndex = (this.page.currentPage - 1) * this.page.pageSize;
            const startIndex = pageStartIndex + parseInt(a, 10);
            const endIndex = pageStartIndex + parseInt(b, 10);
            this.$emit('dragDrop', startIndex, endIndex);
        },
        handleRowClick(row, index) {
            this.$emit('on-row-click', row, index);
        },
        // 筛选行与数据表是两个独立的 iView Table，各自带横向滚动条，这里让它们同步滚动
        onTableScroll(event) {
            const target = event.target;
            if (!target || target.scrollWidth <= target.clientWidth) {
                return;
            }
            const searchRoot = this.$el.querySelector('.searchTable');
            const tableRoot = this.$el.querySelector('.show-iView-Table');
            if (!searchRoot || !tableRoot) {
                return;
            }
            const fromSearch = searchRoot.contains(target);
            if (!fromSearch && !tableRoot.contains(target)) {
                return;
            }
            const peer = this.findHorizontalScroller(fromSearch ? tableRoot : searchRoot);
            if (peer && peer.scrollLeft !== target.scrollLeft) {
                peer.scrollLeft = target.scrollLeft;
            }
        },
        findHorizontalScroller(root) {
            const list = root.querySelectorAll('.ivu-table-body, .ivu-table-tip');
            for (let i = 0; i < list.length; i++) {
                const el = list[i];
                // 仅取可见且确实存在横向溢出的一层，排除固定列等内部滚动容器
                if (el.offsetParent !== null && el.scrollWidth > el.clientWidth) {
                    return el;
                }
            }
            return null;
        }
    }
};
</script>
<style lang="less" scoped>
.page-table {
    .page {
        margin-top: 15px;
    }
    ul {
        margin: 5px 0;
        li {
            padding: 0 3px;
        }
    }
}
</style>
<style lang="less">
.searchTable {
    .ivu-table:after {
        width: 1px;
        background-color: transparent !important;
    }
    .iview_table_tr {
        td {
            background-color: transparent;
            border: 0;
        }
    }
    .ivu-table {
        background-color: transparent;
    }
    .ivu-table-wrapper {
        border: 0px !important;
        background: transparent;
        .ivu-table-tip::after {
            width: 0;
        }
    }
    .ivu-table tr.ivu-table-row-hover td {
        background-color: transparent !important;
    }
    .ivu-table .ivu-table-cell {
        padding-left: 0 !important;
    }
}
.show-iView-Table {
    .ivu-table-wrapper {
        border-bottom: 1px solid #e7e9f0;
    }
}
.show-iView-Table-list {
    min-height: 300px;
}
</style>
