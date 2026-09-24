<template>
  <div class="report-overview">
    <!-- Skeleton Loading -->
    <template v-if="loading && !overviewData">
      <div class="metric-cards">
        <div class="metric-card skeleton" v-for="i in 5" :key="'s-m-' + i">
          <div class="skeleton-label"></div>
          <div class="skeleton-value"></div>
        </div>
      </div>
      <div class="chart-grid">
        <div class="chart-card chart-full" v-for="i in 3" :key="'s-c-' + i">
          <div class="skeleton-title"></div>
          <div class="skeleton-chart"></div>
        </div>
        <div class="chart-card" v-for="i in 2" :key="'s-cc-' + i">
          <div class="skeleton-title"></div>
          <div class="skeleton-chart"></div>
        </div>
      </div>
    </template>

    <!-- Metric Cards -->
    <div class="metric-cards" v-if="overviewData">
      <div class="metric-card">
        <div class="metric-label">{{ $t('report.requestTotal') }}</div>
        <div class="metric-value">{{ fmtNum(overviewData.request_total) }}</div>
      </div>
      <div class="metric-card error">
        <div class="metric-label">{{ $t('report.errorTotal') }}</div>
        <div class="metric-value">{{ fmtNum(overviewData.error_total) }}</div>
        <div class="metric-sub">{{ $t('report.errorRate') }}: {{ fmtPercent(overviewData.error_rate) }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">{{ $t('report.tokenUsage') }}</div>
        <div class="metric-value">{{ fmtNum(overviewData.total_tokens) }}</div>
        <div class="metric-sub">{{ $t('report.tokenInOut', { input: fmtNum(overviewData.input_tokens), output: fmtNum(overviewData.output_tokens) }) }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">{{ $t('report.avgLatency') }}</div>
        <div class="metric-value">{{ fmtMs(overviewData.latency_avg_ms) }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">{{ $t('report.cost') }}</div>
        <div class="metric-value" v-if="overviewData.cost && overviewData.cost.length">{{ fmtNum(overviewData.cost[0].value) }}<span class="metric-currency">{{ overviewData.cost[0].currency }}</span></div>
        <div class="metric-value" v-else>-</div>
        <div class="metric-sub" v-for="c in (overviewData.cost || []).slice(1)" :key="c.currency">
          {{ c.currency }}: {{ fmtNum(c.value) }}
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="report-empty" v-if="!loading && !overviewData">
      <Icon type="ios-analytics" size="48" color="#c5c8ce" />
      <p>{{ $t('report.noData') }}</p>
    </div>

    <!-- Charts -->
    <div class="chart-grid" v-if="!loading && overviewData">
      <div class="chart-card chart-full">
        <h4>{{ $t('report.qpsTimeseries') }}</h4>
        <div class="chart-box tall">
          <Echarts v-if="qpsOption.series" :option="qpsOption" height="100%" />
          <div v-else class="chart-empty">{{ $t('report.noData') }}</div>
        </div>
      </div>
      <div class="chart-card">
        <h4>{{ $t('report.tokenTimeseries') }}</h4>
        <div class="chart-box">
          <Echarts v-if="tokensOption.series" :option="tokensOption" height="100%" />
          <div v-else class="chart-empty">{{ $t('report.noData') }}</div>
        </div>
      </div>
      <div class="chart-card">
        <h4>{{ $t('report.latencyTimeseries') }}</h4>
        <div class="chart-box">
          <Echarts v-if="latencyOption.series" :option="latencyOption" height="100%" />
          <div v-else class="chart-empty">{{ $t('report.noData') }}</div>
        </div>
      </div>
      <div class="chart-card">
        <h4>{{ $t('report.modelRanking') }}</h4>
        <div class="chart-box tall">
          <Echarts v-if="modelRankingOption.series" :option="modelRankingOption" height="100%" />
          <div v-else class="chart-empty">{{ $t('report.noData') }}</div>
        </div>
      </div>
      <div class="chart-card">
        <h4>{{ $t('report.providerDist') }}</h4>
        <div class="chart-box">
          <Echarts v-if="providerDistOption.series" :option="providerDistOption" height="100%" />
          <div v-else class="chart-empty">{{ $t('report.noData') }}</div>
        </div>
      </div>
      <div class="chart-card">
        <h4>{{ $t('report.statusDist') }}</h4>
        <div class="chart-box">
          <Echarts v-if="statusDistOption.series" :option="statusDistOption" height="100%" />
          <div v-else class="chart-empty">{{ $t('report.noData') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Echarts from '@/components/Echarts';

export default {
  name: 'ReportOverview',

  components: { Echarts },

  props: {
    helpers: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      loading: false,
      overviewData: null,
      timeseriesData: {},
      rankingData: {},
      distData: {},
      providerDistData: null
    };
  },

  computed: {
    fmtNum() { return this.helpers.fmtNum; },
    fmtPercent() { return this.helpers.fmtPercent; },
    fmtMs() { return this.helpers.fmtMs; },
    formatTs() { return this.helpers.formatTs; },

    qpsOption() {
      const series = (this.timeseriesData.qps || {}).series || [];
      if (!series.length) return {};
      return this.chartOptionsLine(
        series.map(p => this.formatTs(p.time)),
        [{ name: 'QPS', data: series.map(p => p.value) }],
        'req/s'
      );
    },

    tokensOption() {
      const series = (this.timeseriesData.tokens || {}).series || [];
      if (!series.length) return {};
      return this.chartOptionsLine(
        series.map(p => this.formatTs(p.time)),
        [
          { name: this.$t('report.input'), data: series.map(p => p.input) },
          { name: this.$t('report.output'), data: series.map(p => p.output) },
          { name: this.$t('report.total'), data: series.map(p => p.total) }
        ],
        'tokens/s'
      );
    },

    latencyOption() {
      const series = (this.timeseriesData.latency || {}).series || [];
      if (!series.length) return {};
      return this.chartOptionsLine(
        series.map(p => this.formatTs(p.time)),
        [
          { name: this.$t('report.avg'), data: series.map(p => p.avg) },
          { name: this.$t('report.max'), data: series.map(p => p.max) }
        ],
        'ms'
      );
    },

    modelRankingOption() {
      const items = ((this.rankingData || {}).items || []).slice(0, 10);
      if (!items.length) return {};
      return this.chartOptionsBar(
        items.map(i => i.name),
        [{ name: this.$t('report.requestCount'), data: items.map(i => i.request_count) }],
        true
      );
    },

    providerDistOption() {
      const items = ((this.providerDistData || {}).items || []);
      if (!items.length) return {};
      return this.chartOptionsPie(
        items.map(i => ({ name: i.name, value: i.request_count }))
      );
    },

    statusDistOption() {
      const items = ((this.distData.status || {}).items || []);
      if (!items.length) return {};
      return this.chartOptionsPie(
        items.map(i => ({ name: i.name, value: i.request_count }))
      );
    }
  },

  methods: {
    load(filterParams) {
      this.loading = true;

      Promise.all([
        this.$request({ url: 'report/overview', method: 'get', params: filterParams, openapi: true }),
        this.$request({ url: 'report/timeseries', method: 'get', params: { ...filterParams, metric: 'qps' }, openapi: true }),
        this.$request({ url: 'report/timeseries', method: 'get', params: { ...filterParams, metric: 'tokens' }, openapi: true }),
        this.$request({ url: 'report/timeseries', method: 'get', params: { ...filterParams, metric: 'latency' }, openapi: true }),
        this.$request({ url: 'report/rankings', method: 'get', params: { ...filterParams, dimension: 'model', limit: 10 }, openapi: true }),
        this.$request({ url: 'report/distribution', method: 'get', params: { ...filterParams, dimension: 'status' }, openapi: true }),
        this.$request({ url: 'report/rankings', method: 'get', params: { ...filterParams, dimension: 'provider', limit: 10 }, openapi: true })
      ]).then(([overviewRes, qpsRes, tokensRes, latencyRes, rankingRes, statusRes, providerRankingRes]) => {
        if (overviewRes.status === 200) {
          this.overviewData = overviewRes.data.Data || {};
        }
        const tsData = {};
        if (qpsRes.status === 200) tsData.qps = qpsRes.data.Data || {};
        if (tokensRes.status === 200) tsData.tokens = tokensRes.data.Data || {};
        if (latencyRes.status === 200) tsData.latency = latencyRes.data.Data || {};
        this.timeseriesData = tsData;

        if (rankingRes.status === 200) {
          this.rankingData = rankingRes.data.Data || {};
        }
        if (statusRes.status === 200) {
          this.distData = { ...this.distData, status: statusRes.data.Data || {} };
        }
        if (providerRankingRes.status === 200) {
          this.providerDistData = providerRankingRes.data.Data || null;
        }
      }).catch(err => {
        console.error('Failed to load overview data:', err);
        this.$Message.error(this.$t('report.loadFailed'));
      }).finally(() => {
        this.loading = false;
      });
    },

    chartOptionsLine(xData, seriesArr, yLabel) {
      return {
        tooltip: { trigger: 'axis' },
        legend: { data: seriesArr.map(s => s.name), bottom: 0 },
        grid: { left: 60, right: 20, top: 35, bottom: 40 },
        xAxis: { type: 'category', data: xData, axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value', name: yLabel || '', nameTextStyle: { fontSize: 11 } },
        series: seriesArr.map(s => ({
          name: s.name, type: 'line', data: s.data, smooth: true, symbol: 'none'
        }))
      };
    },

    chartOptionsBar(xData, seriesArr, horizontal) {
      const opt = {
        tooltip: { trigger: 'axis' },
        grid: { left: 120, right: 30, top: 10, bottom: 30 },
        series: seriesArr.map(s => ({
          name: s.name, type: 'bar', data: s.data, barMaxWidth: 30
        }))
      };
      if (horizontal) {
        opt.xAxis = { type: 'value' };
        opt.yAxis = { type: 'category', data: xData, axisLabel: { fontSize: 11 }, inverse: true };
      } else {
        opt.xAxis = { type: 'category', data: xData, axisLabel: { fontSize: 11 } };
        opt.yAxis = { type: 'value' };
      }
      return opt;
    },

    chartOptionsPie(data) {
      return {
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { orient: 'vertical', right: 10, top: 'center', itemWidth: 10, itemHeight: 10 },
        series: [{
          type: 'pie', radius: ['40%', '70%'], center: ['40%', '50%'],
          label: { show: false }, emphasis: { label: { show: true } },
          data
        }]
      };
    }
  }
};
</script>

<style lang="less" scoped>
.report-overview {
  position: relative;
  min-height: 200px;

  .metric-cards {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .metric-card {
    background: #f8f8f9;
    border-radius: 6px;
    padding: 16px;
    text-align: center;

    &.error .metric-value { color: #ed4014; }
  }

  .metric-label {
    font-size: 13px;
    color: #808695;
    margin-bottom: 8px;
  }

  .metric-value {
    font-size: 24px;
    font-weight: 600;
    color: #17233d;
  }

  .metric-sub {
    font-size: 12px;
    color: #808695;
    margin-top: 4px;
  }

  .metric-currency {
    font-size: 12px;
    color: #808695;
    font-weight: 400;
    margin-left: 4px;
  }

  .chart-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .chart-full {
    grid-column: span 2;
  }

  .chart-card {
    background: #fff;
    border: 1px solid #e8eaec;
    border-radius: 6px;
    padding: 12px;

    h4 {
      font-size: 14px;
      color: #17233d;
      margin: 0 0 8px 0;
    }
  }

  .chart-box {
    width: 100%;
    height: 280px;

    &.tall { height: 320px; }
  }

  .chart-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #c5c8ce;
    font-size: 14px;
  }

  .spin-icon-load {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Skeleton */
  .skeleton {
    pointer-events: none;
    .skeleton-label, .skeleton-value, .skeleton-title, .skeleton-chart {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }
    .skeleton-label { height: 14px; width: 60%; margin: 0 auto 12px; }
    .skeleton-value { height: 28px; width: 40%; margin: 0 auto; }
    .skeleton-title { height: 16px; width: 120px; margin-bottom: 12px; }
    .skeleton-chart { height: 240px; }
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Empty State */
  .report-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    color: #c5c8ce;
    p { margin-top: 12px; font-size: 14px; }
  }
}
</style>