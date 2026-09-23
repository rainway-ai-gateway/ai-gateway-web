<template>
  <div class="report-page">
    <!-- Filter Bar -->
    <div class="report-filter-bar">
      <!-- Time Section -->
      <div class="filter-section">
        <div class="filter-section-label">{{ $t('report.timeRange') }}</div>
        <div class="filter-section-body">
          <div class="time-shortcuts">
            <Button
              v-for="opt in timeShortcuts"
              :key="opt.value"
              :type="shortcut === opt.value ? 'primary' : 'default'"
              size="small"
              @click="setShortcut(opt.value)"
            >{{ opt.label }}</Button>
          </div>
          <div class="report-filter-item">
            <DatePicker
              v-model="startTime"
              type="datetime"
              format="yyyy-MM-dd HH:mm:ss"
              :options="startDateOptions"
              :placeholder="$t('report.startTime')"
              style="width:190px"
              @on-change="onTimeChange"
              @on-ok="applyFilters"
            />
          </div>
          <span class="filter-separator">—</span>
          <div class="report-filter-item">
            <DatePicker
              v-model="endTime"
              type="datetime"
              format="yyyy-MM-dd HH:mm:ss"
              :options="endDateOptions"
              :placeholder="$t('report.endTime')"
              style="width:190px"
              @on-change="onTimeChange"
              @on-ok="applyFilters"
            />
          </div>
        </div>
      </div>

      <!-- Dimension Filters Section -->
      <div class="filter-section">
        <div class="filter-section-label">{{ $t('report.dimensions') }}</div>
        <div class="filter-section-body">
          <div class="report-filter-item">
            <label class="filter-item-label">{{ $t('report.models') }}</label>
            <Select
              v-model="filters.models"
              multiple
              filterable
              :placeholder="$t('report.modelsPlaceholder')"
              style="min-width:160px"
            >
              <Option v-for="m in modelOptions" :key="m" :value="m">{{ m }}</Option>
            </Select>
          </div>
          <div class="report-filter-item">
            <label class="filter-item-label">{{ $t('report.apikeyIds') }}</label>
            <Select
              v-model="filters.apikey_ids"
              multiple
              filterable
              :placeholder="$t('report.apikeyIdsPlaceholder')"
              style="min-width:160px"
            >
              <Option v-for="k in apikeyOptions" :key="k" :value="k">{{ k }}</Option>
            </Select>
          </div>
          <div class="report-filter-item">
            <label class="filter-item-label">{{ $t('report.providers') }}</label>
            <Select
              v-model="filters.providers"
              multiple
              filterable
              :placeholder="$t('report.providersPlaceholder')"
              style="min-width:160px"
            >
              <Option v-for="p in providerOptions" :key="p" :value="p">{{ p }}</Option>
            </Select>
          </div>
          <div class="report-filter-item">
            <label class="filter-item-label">{{ $t('report.hosts') }}</label>
            <Select
              v-model="filters.hosts"
              multiple
              filterable
              :placeholder="$t('report.hostsPlaceholder')"
              style="min-width:160px"
            >
              <Option v-for="h in hostOptions" :key="h" :value="h">{{ h }}</Option>
            </Select>
          </div>
          <div class="report-filter-item">
            <label class="filter-item-label">{{ $t('report.stream') }}</label>
            <Select
              v-model="filters.stream"
              :placeholder="$t('report.streamPlaceholder')"
              style="width:100px"
              clearable
            >
              <Option value="1">{{ $t('report.streamYes') }}</Option>
              <Option value="0">{{ $t('report.streamNo') }}</Option>
            </Select>
          </div>
          <div class="report-filter-item">
            <label class="filter-item-label">{{ $t('report.statusCodes') }}</label>
            <i-Input
              v-model="filters.status_codes"
              :placeholder="$t('report.statusCodesPlaceholder')"
              style="width:120px"
            />
          </div>
          <Button type="primary" @click="applyFilters">{{ $t('report.query') }}</Button>
          <Button @click="resetFilters">{{ $t('com.reset') }}</Button>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <Tabs v-model="activeTab" :animated="false" @on-click="onTabChange">
      <TabPane :label="$t('report.overview')" name="overview">
        <Overview ref="overview" :helpers="helpers" />
      </TabPane>
      <TabPane :label="$t('report.logs')" name="logs">
        <Logs ref="logs" :helpers="helpers" @search="onLogsSearch" />
      </TabPane>
    </Tabs>
  </div>
</template>

<script>
import Overview from './components/Overview';
import Logs from './components/Logs';

const TIME_SHORTCUTS = [
  { value: '1h', label: '1 小时', hours: 1 },
  { value: '6h', label: '6 小时', hours: 6 },
  { value: '24h', label: '24 小时', hours: 24 },
  { value: '7d', label: '7 天', hours: 168 },
];

// 与后端 ireport.MaxWindow 保持一致（7 天），超出会被拒绝
const MAX_WINDOW_MS = 7 * 24 * 3600 * 1000;

// 取某天的 0 点，DatePicker 的 disabledDate 传入的是当天 0 点，按天比较可避免边界日期被误禁用
const dayStart = date => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export default {
  name: 'Report',

  components: { Overview, Logs },

  data() {
    const now = Math.floor(Date.now() / 1000);
    return {
      activeTab: 'overview',
      shortcut: '1h',
      startTime: new Date((now - 3600) * 1000),
      endTime: new Date(now * 1000),
      filters: {
        models: [],
        apikey_ids: [],
        providers: [],
        hosts: [],
        stream: '',
        status_codes: '',
      },
      modelOptions: [],
      apikeyOptions: [],
      providerOptions: [],
      hostOptions: [],
      filterOptionsRange: null,
    };
  },

  computed: {
    timeShortcuts() {
      return TIME_SHORTCUTS;
    },

    // 起始时间：不晚于结束时间，且不早于「结束时间 - 7 天」
    startDateOptions() {
      const end = this.validDate(this.endTime);
      if (!end) return {};
      const min = new Date(end.getTime() - MAX_WINDOW_MS);
      return {
        disabledDate: date => date.getTime() < dayStart(min) || date.getTime() > dayStart(end),
      };
    },

    // 结束时间：不早于起始时间，且不晚于「起始时间 + 7 天」
    endDateOptions() {
      const start = this.validDate(this.startTime);
      if (!start) return {};
      const max = new Date(start.getTime() + MAX_WINDOW_MS);
      return {
        disabledDate: date => date.getTime() < dayStart(start) || date.getTime() > dayStart(max),
      };
    },

    helpers() {
      return {
        fmtNum: this.fmtNum,
        fmtPercent: this.fmtPercent,
        fmtMs: this.fmtMs,
        fmtUs: this.fmtUs,
        formatTs: this.formatTs,
      };
    },
  },

  mounted() {
    this.$nextTick(() => {
      this.$refs.overview && this.$refs.overview.load(this.buildFilterParams());
    });
    this.loadFilterOptions();
  },

  methods: {
    // ==================== Helpers ====================
    now() {
      return Math.floor(Date.now() / 1000);
    },

    formatTs(ts) {
      if (ts == null) return '-';
      const d = new Date(ts * 1000);
      if (isNaN(d.getTime())) return '-';
      const p = n => (n < 10 ? '0' + n : '' + n);
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    },

    fmtNum(n) {
      if (n == null) return '-';
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return String(n);
    },

    fmtPercent(ratio) {
      if (ratio == null) return '-';
      return (ratio * 100).toFixed(1) + '%';
    },

    fmtMs(ms) {
      if (ms == null) return '-';
      return Number(ms).toFixed(1) + ' ms';
    },

    fmtUs(us) {
      if (us == null) return '-';
      return (us / 1000).toFixed(1) + ' ms';
    },

    toUnixTimestamp(date) {
      if (!date) return '';
      if (date instanceof Date) {
        const time = date.getTime();
        return isNaN(time) ? '' : Math.floor(time / 1000);
      }
      return '';
    },

    validDate(value) {
      if (!value) return null;
      const date = value instanceof Date ? value : new Date(value);
      return isNaN(date.getTime()) ? null : date;
    },

    // 与后端校验对齐：起止时间必须有效、顺序正确，且跨度不超过 7 天
    validateTimeRange() {
      const start = this.validDate(this.startTime);
      const end = this.validDate(this.endTime);
      if (!start || !end || end.getTime() <= start.getTime()) {
        this.$Message.error(this.$t('report.timeRangeInvalid'));
        return false;
      }
      if (end.getTime() - start.getTime() > MAX_WINDOW_MS) {
        this.$Message.error(this.$t('report.timeRangeExceeded'));
        return false;
      }
      return true;
    },

    // ==================== Filters ====================
    buildFilterParams() {
      const params = {
        start: this.toUnixTimestamp(this.startTime),
        end: this.toUnixTimestamp(this.endTime),
      };
      if (this.filters.models.length) params.models = this.filters.models.join(',');
      if (this.filters.apikey_ids.length) params.apikey_ids = this.filters.apikey_ids.join(',');
      if (this.filters.providers.length) params.providers = this.filters.providers.join(',');
      if (this.filters.hosts.length) params.hosts = this.filters.hosts.join(',');
      if (this.filters.stream !== '' && this.filters.stream != null) params.stream = this.filters.stream;
      if (this.filters.status_codes) params.status_codes = this.filters.status_codes;
      return params;
    },

    setShortcut(val) {
      this.shortcut = val;
      const opt = TIME_SHORTCUTS.find(o => o.value === val);
      if (opt && opt.hours > 0) {
        const end = this.now();
        const start = end - opt.hours * 3600;
        this.endTime = new Date(end * 1000);
        this.startTime = new Date(start * 1000);
        this.applyFilters();
      }
    },

    // 手动修改时间后取消快捷选项选中状态，避免误导
    onTimeChange() {
      this.shortcut = '';
    },

    applyFilters() {
      if (!this.validateTimeRange()) return;
      const params = this.buildFilterParams();
      this.loadFilterOptions();
      if (this.activeTab === 'overview') {
        this.$refs.overview && this.$refs.overview.load(params);
      } else {
        this.$refs.logs && this.$refs.logs.load(params);
      }
    },

    resetFilters() {
      const end = this.now();
      const start = end - 3600;
      this.shortcut = '1h';
      this.startTime = new Date(start * 1000);
      this.endTime = new Date(end * 1000);
      this.filters = {
        models: [],
        apikey_ids: [],
        providers: [],
        hosts: [],
        stream: '',
        status_codes: '',
      };
      this.applyFilters();
    },

    onLogsSearch() {
      this.applyFilters();
    },

    // ==================== Tabs ====================
    onTabChange(name) {
      const params = this.buildFilterParams();
      if (name === 'overview') {
        this.$refs.overview && this.$refs.overview.load(params);
      } else if (name === 'logs') {
        this.$refs.logs && this.$refs.logs.load(params);
      }
    },

    // ==================== Filter Options ====================
    loadFilterOptions() {
      const start = this.toUnixTimestamp(this.startTime);
      const end = this.toUnixTimestamp(this.endTime);
      // 时间范围未变化时无需重复请求，避免分页等操作带来多余开销
      if (this.filterOptionsRange && this.filterOptionsRange.start === start && this.filterOptionsRange.end === end) return;
      this.filterOptionsRange = { start, end };

      const params = { start, end };
      const dimensions = [
        { key: 'model', field: 'modelOptions' },
        { key: 'apikey', field: 'apikeyOptions' },
        { key: 'provider', field: 'providerOptions' },
        { key: 'host', field: 'hostOptions' },
      ];
      dimensions.forEach(({ key, field }) => {
        this.$request({ url: 'report/rankings', method: 'get', params: { ...params, dimension: key, limit: 50 }, openapi: true })
          .then(res => {
            if (res.status === 200 && res.data.Data) {
              this[field] = (res.data.Data.items || []).map(i => i.name);
            }
          }).catch(() => {});
      });
    },
  },
};
</script>

<style lang="less" scoped>
.report-page {
  .report-filter-bar {
    background: #fff;
    padding: 16px;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .filter-section {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;

    &:last-of-type {
      margin-bottom: 0;
    }
  }

  .filter-section-label {
    font-size: 12px;
    color: #808695;
    white-space: nowrap;
    line-height: 32px;
    min-width: 56px;
  }

  .filter-section-body {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .time-shortcuts {
    display: flex;
    gap: 4px;
  }

  .filter-separator {
    color: #c5c8ce;
    font-size: 14px;
  }

  .report-filter-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-item-label {
    font-size: 12px;
    color: #808695;
    white-space: nowrap;
    min-width: 52px;
    text-align: right;
  }
}
</style>