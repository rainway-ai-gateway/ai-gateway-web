<template>
  <div class="report-logs">
    <!-- Logs Filter -->
    <div class="logs-toolbar">
      <div class="report-filter-item">
        <label>{{ $t('report.requestedModels') }}</label>
        <i-Input v-model="requestedModels" :placeholder="$t('report.requestedModelsPlaceholder')" />
      </div>
      <div class="report-filter-item">
        <label>{{ $t('report.errOnly') }}</label>
        <Select v-model="errOnly" style="width:80px">
          <Option value="false">{{ $t('report.no') }}</Option>
          <Option value="true">{{ $t('report.yes') }}</Option>
        </Select>
      </div>
      <div class="report-filter-item">
        <label>{{ $t('report.keyword') }}</label>
        <i-Input v-model="keyword" :placeholder="$t('report.keywordPlaceholder')" />
      </div>
      <div class="report-filter-actions">
        <Button type="primary" @click="searchLogs">{{ $t('report.query') }}</Button>
      </div>
    </div>

    <!-- Detail Drawer -->
    <Drawer
      v-model="detailsDrawerVisible"
      width="40"
      :title="$t('com.detail')"
      placement="right"
      :mask-closable="false"
    >
      <div v-if="selectedRow" class="details-panel">
        <dl class="details-grid">
          <div class="detail-item">
            <dt>{{ $t('report.hostid') }}</dt>
            <dd>{{ selectedRow.hostid || '-' }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ $t('report.product') }}</dt>
            <dd>{{ selectedRow.product || '-' }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ $t('report.protocol') }}</dt>
            <dd>{{ selectedRow.ai_protocol || '-' }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ $t('report.mode') }}</dt>
            <dd>{{ selectedRow.ai_mode || '-' }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ $t('report.streamField') }}</dt>
            <dd>{{ selectedRow.ai_stream === 1 ? $t('report.yes') : $t('report.no') }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ $t('report.errCode') }}</dt>
            <dd>{{ selectedRow.err_code || '-' }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ $t('report.inputTokens') }}</dt>
            <dd>{{ fmtNum(selectedRow.ai_input_tokens) }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ $t('report.outputTokens') }}</dt>
            <dd>{{ fmtNum(selectedRow.ai_output_tokens) }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ $t('report.tpot') }}</dt>
            <dd>{{ fmtUs(selectedRow.ai_tpot_us) }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ $t('report.level1') }}</dt>
            <dd>{{ (selectedRow.level1Name || '-') + ' = ' + (selectedRow.level1 || '-') }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ $t('report.clientIp') }}</dt>
            <dd>{{ selectedRow.client_ip || '-' }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ $t('report.headerHost') }}</dt>
            <dd>{{ selectedRow.header_host || '-' }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ $t('report.originUri') }}</dt>
            <dd>{{ selectedRow.origin_uri || '-' }}</dd>
          </div>
        </dl>

        <div class="detail-json-section" v-for="f in jsonFields" :key="f">
          <div v-if="selectedRow[f] != null" class="detail-json-item">
            <div class="detail-json-header" @click="toggleJsonExpand(f + '-detail')">
              <Icon :type="expandedJson[f + '-detail'] ? 'ios-arrow-down' : 'ios-arrow-forward'" />
              <span class="detail-json-label">{{ f }}</span>
            </div>
            <div v-show="expandedJson[f + '-detail']" class="detail-json-content">
              <pre>{{ typeof selectedRow[f] === 'string' ? selectedRow[f] : JSON.stringify(selectedRow[f], null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </Drawer>

    <!-- Logs Info -->
    <div class="logs-info" v-if="logsData && logsData.total > 0">
      {{ $t('report.logsInfo', { total: logsData.total, page: logsData.page, pages: Math.ceil(logsData.total / logsData.page_size) || 1, size: logsData.page_size }) }}
    </div>

    <!-- Logs Table -->
    <pageTable
      ref="pageTable"
      :key="tableKey"
      :tableData="tableData"
      :columns="columns"
      :loading="loading"
      :serverPagination="true"
      :total="logsData ? logsData.total : 0"
      :currentPage="page"
      :pageSize="pageSize"
      @on-page-change="handlePageChange"
    />

    
  </div>
</template>

<script>
import pageTable from '@/components/table/pageTable';

export default {
  name: 'ReportLogs',

  components: {
    pageTable,
    },

  props: {
    helpers: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      loading: false,
      logsData: null,
      page: 1,
      pageSize: 20,
      requestedModels: '',
      errOnly: 'false',
      keyword: '',
      expandedJson: {},
      jsonFields: ['ai_rate_limit_hits', 'ai_auth_reject_quota_plans', 'req_headers', 'res_headers'],
      version: 0,
      detailsDrawerVisible: false,
      selectedRow: null
    };
  },

  computed: {
    fmtNum() { return this.helpers.fmtNum; },
    fmtUs() { return this.helpers.fmtUs; },
    formatTs() { return this.helpers.formatTs; },

    tableKey() {
      return `logs-${this.version}`;
    },

    tableData() {
      return (this.logsData && this.logsData.items) || [];
    },

    columns() {
      const thStyle = { fontSize: '12px' };
      const tdStyle = { fontSize: '12px' };
      const centerStyle = { ...tdStyle, textAlign: 'center' };
      const that = this;

      const cols = [
        {
          title: this.$t('report.logTime'),
          key: 'log_time',
          width: 170,
          renderHeader: (h) => h('span', { style: thStyle }, this.$t('report.logTime')),
          render: (h, params) => h('span', { style: tdStyle }, this.formatTs(params.row.log_time))
        },
        {
          title: this.$t('report.apiKey'),
          key: 'ai_apikey_id',
          width: 120,
          renderHeader: (h) => h('span', { style: thStyle }, this.$t('report.apiKey')),
          render: (h, params) => h('span', { style: tdStyle }, params.row.ai_apikey_id || '-')
        },
        {
          title: this.$t('report.requestedModel'),
          key: 'ai_requested_model',
          width: 140,
          renderHeader: (h) => h('span', { style: thStyle }, this.$t('report.requestedModel')),
          render: (h, params) => h('span', { style: tdStyle }, params.row.ai_requested_model || '-')
        },
        {
          title: this.$t('report.targetModel'),
          key: 'ai_target_model',
          width: 140,
          renderHeader: (h) => h('span', { style: thStyle }, this.$t('report.targetModel')),
          render: (h, params) => h('span', { style: tdStyle }, params.row.ai_target_model || '-')
        },
        {
          title: this.$t('report.provider'),
          key: 'ai_provider',
          width: 100,
          renderHeader: (h) => h('span', { style: thStyle }, this.$t('report.provider')),
          render: (h, params) => h('span', { style: tdStyle }, params.row.ai_provider || '-')
        },
        {
          title: this.$t('report.statusCode'),
          key: 'res_status_code',
          width: 100,
          align: 'center',
          renderHeader: (h) => h('span', { style: thStyle }, this.$t('report.statusCode')),
          render: (h, params) => {
            const code = params.row.res_status_code;
            return h('span', { style: centerStyle }, code != null ? String(code) : '-');
          }
        },
        {
          title: this.$t('report.duration'),
          key: 'all_time',
          width: 90,
          renderHeader: (h) => h('span', { style: thStyle }, this.$t('report.duration')),
          render: (h, params) => {
            const v = params.row.all_time;
            return h('span', { style: tdStyle }, v != null ? v + 'ms' : '-');
          }
        },
        {
          title: this.$t('report.tokens'),
          key: 'ai_total_tokens',
          width: 90,
          align: 'right',
          renderHeader: (h) => h('span', { style: thStyle }, this.$t('report.tokens')),
          render: (h, params) => h('span', { style: { ...tdStyle, textAlign: 'right' } }, this.fmtNum(params.row.ai_total_tokens))
        },
        {
          title: this.$t('report.ttft'),
          key: 'ai_ttft_us',
          width: 90,
          renderHeader: (h) => h('span', { style: thStyle }, this.$t('report.ttft')),
          render: (h, params) => h('span', { style: tdStyle }, this.fmtUs(params.row.ai_ttft_us))
        },
        {
          title: this.$t('report.logCost'),
          key: 'ai_cost_value',
          width: 100,
          renderHeader: (h) => h('span', { style: thStyle }, this.$t('report.logCost')),
          render: (h, params) => {
            const row = params.row;
            const val = row.ai_cost_value != null ? row.ai_cost_value + ' ' + (row.ai_cost_currency || '') : '-';
            return h('span', { style: tdStyle }, val);
          }
        },
        {
          title: this.$t('report.error'),
          key: 'err_msg',
          minWidth: 150,
          renderHeader: (h) => h('span', { style: thStyle }, this.$t('report.error')),
          render: (h, params) => {
            const msg = params.row.err_msg;
            if (!msg) return h('span', { style: tdStyle }, '-');
            const display = msg.length > 20 ? msg.substring(0, 20) + '\u2026' : msg;
            return h('span', { style: { ...tdStyle, color: '#ed4014' } }, display);
          }
        },
        {
          key: 'action',
          title: this.$t('com.operation'),
          width: 80,
          render: (h, params) => h('Button', {
            props: { type: 'primary', size: 'small' },
            on: {
              click: () => {
                that.onViewDetails(params.row);
              }
            }
          }, this.$t('com.detail'))
        }
      ];

      return cols;
    }
  },

  methods: {
    load(filterParams) {
      this.loading = true;
      const params = {
        ...filterParams,
        page: this.page,
        page_size: this.pageSize
      };
      if (this.requestedModels) params.requested_models = this.requestedModels;
      if (this.errOnly === 'true') params.err_only = true;
      if (this.keyword) params.keyword = this.keyword;

      this.$request({ url: 'report/logs', method: 'get', params, openapi: true })
        .then(res => {
          if (res.status === 200) {
            this.logsData = res.data.Data || {};
          } else {
            this.$Message.error(this.$t('report.loadFailed'));
          }
        }).catch(err => {
          console.error('Failed to load logs:', err);
          this.$Message.error(this.$t('report.loadFailed'));
        }).finally(() => {
          this.loading = false;
          this.version++;
        });
    },

    searchLogs() {
      this.page = 1;
      this.$emit('search');
    },

    onViewDetails(row) {
      this.selectedRow = row;
      this.detailsDrawerVisible = true;
    },

    handlePageChange({ page, pageSize }) {
      this.page = page;
      this.pageSize = pageSize;
      this.$emit('search');
    },

    toggleJsonExpand(key) {
      this.$set(this.expandedJson, key, !this.expandedJson[key]);
    }
  }
};
</script>

<style lang="less" scoped>
.report-logs {
  position: relative;
  min-height: 200px;

  .logs-toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
    align-items: flex-end;
  }

  .report-filter-item {
    display: flex;
    align-items: center;
    gap: 6px;

    label {
      font-size: 12px;
      color: #808695;
      white-space: nowrap;
      min-width: 70px;
      text-align: right;
    }
  }

  .report-filter-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    padding-bottom: 0;
  }

  .logs-info {
    margin-bottom: 8px;
    font-size: 13px;
    color: #808695;
  }

  
}

// Detail panel styles
.details-panel {
  padding: 0 4px;

  .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 12px;
    margin: 0;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;

    dt {
      font-size: 12px;
      color: #808695;
    }

    dd {
      font-size: 13px;
      color: #17233d;
      margin: 0;
      word-break: break-all;
    }
  }

  .detail-json-section {
    margin-top: 12px;

    .detail-json-item {
      border: 1px solid #e8eaec;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .detail-json-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      background: #f8f8f9;
      cursor: pointer;
      font-size: 12px;
      color: #2d8cf0;
      user-select: none;

      &:hover {
        background: #f0f0f1;
      }
    }

    .detail-json-label {
      font-weight: 500;
    }

    .detail-json-content {
      pre {
        margin: 0;
        padding: 12px;
        font-size: 12px;
        background: #fafafa;
        max-height: 240px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-all;
        border-top: 1px solid #e8eaec;
      }
    }
  }
}
</style>