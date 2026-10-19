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
  <div>
    <div class="proto-epp-summary" style="margin-bottom:16px;">
      <span style="margin-right:24px;"
        >{{ $t('eppAssignment.assignedCount')

        }}：<strong>{{ (assignData.clusters || []).length }}</strong></span
      >
      <span
        style="margin-right:24px;"
        :style="(assignData.unassigned_clusters || []).length > 0 ? 'color:#ed4014;' : ''"
        >{{ $t('eppAssignment.unassignedCount')

        }}：<strong
          >{{ (assignData.unassigned_clusters || []).length }}</strong
        ></span
      >
      <span style="margin-right:24px;"
        >{{ $t('eppAssignment.idleGroups')

        }}：<strong>{{ (assignData.idle_groups || []).length }}</strong></span
      >
    </div>

    <pageTable
      :key="tableKey"
      ref="assignTable"
      :columns="columns"
      :tableData="clusters"
      :loading="loading"
      :total="clusters.length"
      :current-page="page"
      :page-size="pageSize"
      @on-page-change="onPageChange"
      @on-search-change="onSearchChange"
    />

    <div v-if="unassigned.length" style="margin-top:16px;">
      <Card :bordered="false">
        <p slot="title" style="color:#ed4014;">
          {{ $t('eppAssignment.unassigned') }}
        </p>
        <p style="color:#ed4014;font-size:12px;margin:0 0 8px;">
          {{ $t('eppAssignment.unassignedTip') }}
        </p>
        <ul style="margin:0;padding-left:16px;">
          <li v-for="name in unassigned" :key="name">{{ name }}</li>
        </ul>
      </Card>
    </div>

    <div v-if="idle.length" style="margin-top:16px;">
      <Card :bordered="false">
        <p slot="title">{{ $t('eppAssignment.idleGroupsTitle') }}</p>
        <p style="color:#808695;font-size:12px;margin:0 0 8px;">
          {{ $t('eppAssignment.idleGroupsTip') }}
        </p>
        <ul style="margin:0;padding-left:16px;">
          <li v-for="name in idle" :key="name">{{ name }}</li>
        </ul>
      </Card>
    </div>

    <Drawer
      :title="overrideTitle"
      v-model="drawerVisible"
      :mask-closable="false"
      width="50%"
    >
      <div v-if="drawerVisible" class="epp-override-drawer">
        <div class="epp-override-body">
          <div class="ivu-row" style="margin-bottom:16px;">
            <div class="ivu-col ivu-col-span-12" style="padding:0 8px;">
              <label
                style="display:block;margin-bottom:4px;font-size:12px;color:#808695;"
                >{{
                $t('eppAssignment.selectGroup')
                }}</label
              >
              <Select v-model="overrideGroup" style="width:100%;">
                <Option
                  v-for="g in poolGroups"
                  :key="g.name"
                  :value="g.name"
                  >{{ g.name }}</Option
                >
              </Select>
            </div>
          </div>
        </div>
        <div class="com-btn-box drawer-footer">
          <Button
            type="primary"
            @click="confirmOverride"
            :loading="overrideSaving"
            >{{
            $t('eppAssignment.confirm')
            }}</Button
          >
          <Button @click="drawerVisible = false" style="margin-right:8px;">{{
            $t('eppAssignment.cancel')
          }}</Button>
        </div>
      </div>
    </Drawer>
  </div>
</template>
<script>
import pageTable from '@/components/table/pageTable';

export default {
  name: 'EppAssignments',
  components: { pageTable },
  data() {
    return {
      loading: false,
      assignData: { clusters: [], unassigned_clusters: [], idle_groups: [] },
      poolGroups: [],
      page: 1,
      pageSize: 20,
      searchParams: {},
      tableKey: 0,
      drawerVisible: false,
      overrideSaving: false,
      overrideCluster: '',
      overrideGroup: '',
    };
  },
  computed: {
    clusters() {
      return this.assignData.clusters || [];
    },
    unassigned() {
      return this.assignData.unassigned_clusters || [];
    },
    idle() {
      return this.assignData.idle_groups || [];
    },
    overrideTitle() {
      return `${this.$t('eppAssignment.override')} - ${this.overrideCluster}`;
    },
    columns() {
      return [
        {
          title: this.$t('eppAssignment.clusterName'),
          key: 'cluster',
          searchable: true,
          sortable: 'custom',
          render: (h, { row }) => {
            return h('span', row.cluster);
          },
        },
        {
          title: this.$t('eppAssignment.group'),
          key: 'group',
          sortable: 'custom',
          render: (h, { row }) => {
            return h('span', row.group || '-');
          },
        },
        {
          title: this.$t('com.operation'),
          key: 'action',
          render: (h, { row }) => {
            return h(
              'Button',
              {
                props: { type: 'primary', size: 'small' },
                directives: [{ name: 'has' }],
                on: {
                  click: () => this.openOverride(row.cluster),
                },
              },
              this.$t('eppAssignment.override'),
            );
          },
        },
      ];
    },
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    fetchData() {
      this.loading = true;
      Promise.all([this.fetchAssignments(), this.fetchPool()]).finally(() => {
        this.loading = false;
      });
    },
    fetchAssignments() {
      return this.$request({
        url: 'epp-assignments',
        method: 'get',
        openapi: true,
      })
        .then((res) => {
          if (res.status === 200) {
            this.assignData = res.data.Data || {
              clusters: [],
              unassigned_clusters: [],
              idle_groups: [],
            };
          }
        })
        .catch((err) => {
          console.error('fetch epp-assignments error:', err);
        });
    },
    fetchPool() {
      return this.$request({
        url: 'epp-pool',
        method: 'get',
        openapi: true,
        unneedTips: true,
      })
        .then((res) => {
          if (res.status === 200) {
            this.poolGroups = (res.data.Data && res.data.Data.groups) || [];
          }
        })
        .catch((err) => {
          console.error('fetch epp-pool for assignments error:', err);
        });
    },
    onPageChange(pageInfo) {
      this.page = pageInfo.page;
      this.pageSize = pageInfo.pageSize;
    },
    onSearchChange(filters) {
      this.searchParams = filters || {};
      this.page = 1;
    },
    openOverride(clusterName) {
      this.overrideCluster = clusterName;
      const cluster = (this.assignData.clusters || []).find(
        (c) => c.cluster === clusterName,
      );
      this.overrideGroup = cluster ? cluster.group || '' : '';
      this.drawerVisible = true;
    },
    confirmOverride() {
      this.overrideSaving = true;
      this.$request({
        url: this.$urlFormat('epp-assignments/{cluster}', {
          cluster: this.overrideCluster,
        }),
        method: 'put',
        openapi: true,
        data: {
          group_name: this.overrideGroup,
        },
      })
        .then((res) => {
          if (res.status === 200) {
            this.$Message.success(this.$t('eppAssignment.overrideSucc'));
            this.drawerVisible = false;
            this.fetchAssignments();
          }
        })
        .catch((err) => {
          console.error('override epp-assignment error:', err);
        })
        .finally(() => {
          this.overrideSaving = false;
        });
    },
  },
};
</script>
<style scoped>
.epp-override-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.epp-override-body {
  flex: 1;
  overflow-y: auto;
}
</style>
