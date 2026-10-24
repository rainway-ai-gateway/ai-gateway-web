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
  <div class="cursor-pager">
    <Button size="small" :disabled="!hasPrev || loading" @click="$emit('first')">
      {{ $t('com.firstPage') }}
    </Button>
    <Button
      size="small"
      :disabled="!hasPrev || loading"
      @click="$emit('prev')"
    >
      {{ $t('com.prevPage') }}
    </Button>
    <span class="cursor-pager-info">{{ $t('com.pageIndicator', { page: pageIndex }) }}</span>
    <span class="cursor-pager-info">{{ $t('com.pageCount', { count: pageCount }) }}</span>
    <Button
      class="cursor-pager-next"
      size="small"
      :disabled="!hasNext || loading"
      @click="$emit('next')"
    >
      {{ $t('com.nextPage') }}
    </Button>
  </div>
</template>

<script>
/**
 * 主键游标分页控件：适用于「cursor + limit + next_cursor」型接口。
 * 接口不返回总条数，因此只提供「首页 / 上一页 / 下一页」与「第 N 页 · 本页 M 条」，
 * 不提供页码跳转与总数（需要页码分页请改用 pageTable 的 serverPagination）。
 */
export default {
    name: 'CursorPager',
    props: {
        hasPrev: {
            type: Boolean,
            default: false
        },
        hasNext: {
            type: Boolean,
            default: false
        },
        // 当前页号（首页为 1）
        pageIndex: {
            type: Number,
            default: 1
        },
        // 当前页实际条数
        pageCount: {
            type: Number,
            default: 0
        },
        // 请求中：禁用全部按钮，避免连点造成游标错乱
        loading: {
            type: Boolean,
            default: false
        }
    }
};
</script>

<style lang="less" scoped>
.cursor-pager {
    display: flex;
    align-items: center;
    justify-content: flex-start;

    .ivu-btn + .ivu-btn {
        margin-left: 8px;
    }
}

.cursor-pager-info {
    margin-left: 12px;
    color: #808695;
    font-size: 12px;
}

// 「下一页」与左侧页码/条数之间留出与其它元素一致的呼吸间距
.cursor-pager-next {
    margin-left: 16px;
}
</style>