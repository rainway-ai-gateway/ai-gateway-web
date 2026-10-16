<template>
  <div class="report-overview">
    <!-- Skeleton Loading -->
    <template v-if="loading && !overviewData">
      <div class="metric-cards">
        <div class="metric-card skeleton" v-for="i in 8" :key="'s-m-' + i">
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
      <div class="metric-card">
        <div class="metric-label">{{ $t('report.cacheHitRate') }}</div>
        <div class="metric-value">{{ fmtPercent((overviewData.cache || {}).hit_rate) }}</div>
        <div class="metric-sub">{{ $t('report.cacheHitSub', { hit: fmtNum((overviewData.cache || {}).hit_count), miss: fmtNum((overviewData.cache || {}).miss_count), skip: fmtNum((overviewData.cache || {}).skip_count) }) }}</div>
        <div class="metric-sub">{{ $t('report.cacheTokenSub', { read: fmtNum((overviewData.cache || {}).read_tokens), write: fmtNum((overviewData.cache || {}).write_tokens) }) }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">{{ $t('report.mirrorHit') }}</div>
        <div class="metric-value">{{ fmtNum((overviewData.mirror || {}).hit_count) }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">{{ $t('report.intentClassified') }}</div>
        <div class="metric-value">{{ fmtNum((overviewData.intent || {}).classified_count) }}</div>
        <div class="metric-sub">{{ $t('report.intentUnknownSub', { unknown: fmtNum((overviewData.intent || {}).unknown_count), rate: fmtPercent((overviewData.intent || {}).unknown_rate) }) }}</div>
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
        <h4>
          {{ $t('report.rankingTitle') }}
          <Select v-model="chartDims.ranking" size="small" transfer style="float:right;width:110px" @on-change="loadRanking">
            <Option v-for="o in rankingDimOptions" :key="o.value" :value="o.value">{{ o.label }}</Option>
          </Select>
        </h4>
        <div class="chart-box tall">
          <Echarts v-if="rankingOption.series" :option="rankingOption" height="100%" />
          <div v-else class="chart-empty">{{ $t('report.noData') }}</div>
        </div>
      </div>
      <div class="chart-card">
        <h4>
          {{ $t('report.shareTitle') }}
          <Select v-model="chartDims.pieProvider" size="small" transfer style="float:right;width:110px" @on-change="loadPie('pieProvider')">
            <Option v-for="o in pieDimOptions('protocol')" :key="o.value" :value="o.value">{{ o.label }}</Option>
          </Select>
        </h4>
        <div class="chart-box">
          <Echarts v-if="shareOption.series" :option="shareOption" height="100%" />
          <div v-else class="chart-empty">{{ $t('report.noData') }}</div>
        </div>
      </div>
      <div class="chart-card">
        <h4>
          {{ $t('report.distTitle') }}
          <Select v-model="chartDims.pieStatus" size="small" transfer style="float:right;width:110px" @on-change="loadPie('pieStatus')">
            <Option v-for="o in pieDimOptions('status')" :key="o.value" :value="o.value">{{ o.label }}</Option>
          </Select>
        </h4>
        <div class="chart-box">
          <Echarts v-if="distOption.series" :option="distOption" height="100%" />
          <div v-else class="chart-empty">{{ $t('report.noData') }}</div>
        </div>
      </div>
      <div class="chart-card">
        <h4>{{ $t('report.cacheTokensTimeseries') }}</h4>
        <div class="chart-box">
          <Echarts v-if="cacheTokensOption.series" :option="cacheTokensOption" height="100%" />
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
      filterParams: null,
      timeseriesData: {},
      rankingData: {},
      distData: {},
      chartDims: { ranking: 'model', pieProvider: 'protocol', pieStatus: 'status', tsSplit: '' }
    };
  },

  computed: {
    fmtNum() { return this.helpers.fmtNum; },
    fmtPercent() { return this.helpers.fmtPercent; },
    fmtMs() { return this.helpers.fmtMs; },
    formatTs() { return this.helpers.formatTs; },

    rankingDimOptions() {
      return [
        { value: 'model', label: this.$t('report.models') },
        { value: 'provider', label: this.$t('report.provider') },
        { value: 'apikey', label: this.$t('report.apikeyIds') },
        { value: 'host', label: this.$t('report.hosts') },
        { value: 'status', label: this.$t('report.statusCodes') },
        { value: 'protocol', label: this.$t('report.protocol') },
        { value: 'mode', label: this.$t('report.mode') },
        { value: 'ai_cache_status', label: this.$t('report.cacheStatus') },
        { value: 'mirror_hit', label: this.$t('report.mirrorHit') },
        { value: 'ai_intent_answer', label: this.$t('report.intentAnswer') }
      ];
    },

    qpsOption() {
      const series = (this.timeseriesData.qps || {}).series || [];
      if (!series.length) return {};
      if (this.chartDims.tsSplit) {
        const split = this.buildSplitSeries(series, ['value']);
        return this.chartOptionsLine(
          split.times.map(t => this.formatTs(t)),
          split.groups.map(g => ({ name: g.name, data: g.data[0].data })),
          'req/s'
        );
      }
      return this.chartOptionsLine(
        series.map(p => this.formatTs(p.time)),
        [{ name: 'QPS', data: series.map(p => p.value) }],
        'req/s'
      );
    },

    tokensOption() {
      const series = (this.timeseriesData.tokens || {}).series || [];
      if (!series.length) return {};
      if (this.chartDims.tsSplit) {
        const split = this.buildSplitSeries(series, ['input', 'output', 'total']);
        const fieldNames = { input: this.$t('report.input'), output: this.$t('report.output'), total: this.$t('report.total') };
        return this.chartOptionsLine(
          split.times.map(t => this.formatTs(t)),
          split.groups.flatMap(g => g.data.map((d, i) => ({
            name: g.name + ' ' + fieldNames[['input', 'output', 'total'][i]],
            data: d.data
          }))),
          'tokens/s'
        );
      }
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
      if (this.chartDims.tsSplit) {
        // 带 dimension 时接口只返回 avg/max（见 report.md §2.2）
        const split = this.buildSplitSeries(series, ['avg', 'max']);
        const fieldNames = { avg: this.$t('report.avg'), max: this.$t('report.max') };
        return this.chartOptionsLine(
          split.times.map(t => this.formatTs(t)),
          split.groups.flatMap(g => g.data.map((d, i) => ({
            name: g.name + ' ' + fieldNames[['avg', 'max'][i]],
            data: d.data
          }))),
          'ms'
        );
      }
      return this.chartOptionsLine(
        series.map(p => this.formatTs(p.time)),
        [
          { name: this.$t('report.avg'), data: series.map(p => p.avg) },
          { name: this.$t('report.max'), data: series.map(p => p.max) }
        ],
        'ms'
      );
    },

    rankingOption() {
      const items = ((this.rankingData || {}).items || []).slice(0, 10);
      if (!items.length) return {};
      return this.chartOptionsBar(
        items.map(i => this.dimBucketName(this.chartDims.ranking, i.name)),
        [{ name: this.$t('report.requestCount'), data: items.map(i => i.request_count) }],
        true
      );
    },

    shareOption() {
      const items = ((this.distData[this.chartDims.pieProvider] || {}).items || []);
      if (!items.length) return {};
      return this.chartOptionsPie(
        items.map(i => ({ name: this.dimBucketName(this.chartDims.pieProvider, i.name), value: i.request_count }))
      );
    },

    distOption() {
      const items = ((this.distData[this.chartDims.pieStatus] || {}).items || []);
      if (!items.length) return {};
      return this.chartOptionsPie(
        items.map(i => ({ name: this.dimBucketName(this.chartDims.pieStatus, i.name), value: i.request_count }))
      );
    },

    cacheTokensOption() {
      const series = (this.timeseriesData.cache_tokens || {}).series || [];
      if (!series.length) return {};
      const times = [];
      series.forEach(p => {
        if (times.indexOf(p.time) === -1) times.push(p.time);
      });
      times.sort((a, b) => a - b);
      const readMap = {};
      const writeMap = {};
      series.forEach(p => {
        if (p.kind === 'cache_read') readMap[p.time] = p.value;
        if (p.kind === 'cache_write') writeMap[p.time] = p.value;
      });
      return this.chartOptionsLine(
        times.map(t => this.formatTs(t)),
        [
          { name: 'cache_read', data: times.map(t => (readMap[t] != null ? readMap[t] : '-')) },
          { name: 'cache_write', data: times.map(t => (writeMap[t] != null ? writeMap[t] : '-')) }
        ],
        'tokens'
      );
    }
  },

  methods: {
    load(filterParams, tsSplit) {
      this.filterParams = filterParams || this.filterParams;
      if (!this.filterParams) return;
      // 拆分维度由父组件过滤栏传入，随「查询」一并生效（与过滤栏其他控件行为一致）
      if (tsSplit !== undefined) this.chartDims.tsSplit = tsSplit || '';
      this.loading = true;

      const pieDims = [this.chartDims.pieProvider];
      if (this.chartDims.pieStatus !== this.chartDims.pieProvider) pieDims.push(this.chartDims.pieStatus);

      Promise.all([
        this.$request({ url: 'report/overview', method: 'get', params: this.filterParams, openapi: true }),
        this.$request({ url: 'report/timeseries', method: 'get', params: { ...this.filterParams, metric: 'cache_tokens' }, openapi: true }),
        this.loadTs('qps'),
        this.loadTs('tokens'),
        this.loadTs('latency'),
        this.loadRanking(),
        ...pieDims.map(dim => this.loadDistribution(dim))
      ]).then(([overviewRes, cacheTokensRes]) => {
        if (overviewRes.status === 200) {
          this.overviewData = overviewRes.data.Data || {};
        }
        if (cacheTokensRes.status === 200) {
          this.$set(this.timeseriesData, 'cache_tokens', cacheTokensRes.data.Data || {});
        }
      }).catch(err => {
        console.error('Failed to load overview data:', err);
        this.$Message.error(this.$t('report.loadFailed'));
      }).finally(() => {
        this.loading = false;
      });
    },

    // ==================== Chart Dimension Drilldown ====================
    pieDimOptions(first) {
      // distribution 的 dimension 枚举见 report.md §2.4（与 rankings 不同，不含 provider/model 等）
      const opts = [
        { value: 'status', label: this.$t('report.statusCodes') },
        { value: 'protocol', label: this.$t('report.protocol') },
        { value: 'mode', label: this.$t('report.mode') },
        { value: 'stream', label: this.$t('report.stream') },
        { value: 'ai_cache_status', label: this.$t('report.cacheStatus') },
        { value: 'mirror_hit', label: this.$t('report.mirrorHit') },
        { value: 'ai_intent_answer', label: this.$t('report.intentAnswer') }
      ];
      const idx = opts.findIndex(o => o.value === first);
      if (idx > 0) opts.unshift(opts.splice(idx, 1)[0]);
      return opts;
    },

    // 维度桶名展示映射：mirror_hit 的 "0"/"1" 归一为未命中/命中，空值为未知
    dimBucketName(dim, name) {
      if (name === '' || name == null) return this.$t('report.unknownBucket');
      if (dim === 'mirror_hit') {
        if (String(name) === '1') return this.$t('report.mirrorHitYes');
        if (String(name) === '0') return this.$t('report.mirrorHitNo');
      }
      return String(name);
    },

    // 带拆分维度时各点携带 name（维度值），按 name 分组拆成多条序列
    buildSplitSeries(series, fields) {
      const groups = {};
      series.forEach(p => {
        const key = p.name == null ? '' : String(p.name);
        if (!groups[key]) groups[key] = {};
        groups[key][p.time] = p;
      });
      const times = Object.values(groups).reduce((acc, m) => {
        Object.keys(m).forEach(t => acc.add(Number(t)));
        return acc;
      }, new Set());
      const sortedTimes = Array.from(times).sort((a, b) => a - b);
      return {
        times: sortedTimes,
        groups: Object.keys(groups).map(key => ({
          name: this.dimBucketName(this.chartDims.tsSplit, key),
          data: fields.map(f => ({
            data: sortedTimes.map(t => {
              const p = groups[key][t];
              return p && p[f] != null ? p[f] : '-';
            })
          }))
        }))
      };
    },

    loadRanking() {
      if (!this.filterParams) return Promise.resolve();
      return this.$request({ url: 'report/rankings', method: 'get', params: { ...this.filterParams, dimension: this.chartDims.ranking, limit: 10 }, openapi: true })
        .then(res => {
          if (res.status === 200) this.rankingData = res.data.Data || {};
        }).catch(() => {});
    },

    loadPie(dimKey) {
      return this.loadDistribution(this.chartDims[dimKey]);
    },

    loadDistribution(dim) {
      if (!this.filterParams) return Promise.resolve();
      return this.$request({ url: 'report/distribution', method: 'get', params: { ...this.filterParams, dimension: dim }, openapi: true })
        .then(res => {
          if (res.status === 200) this.$set(this.distData, dim, res.data.Data || {});
        }).catch(() => {});
    },

    loadTs(metric) {
      if (!this.filterParams) return Promise.resolve();
      const params = { ...this.filterParams, metric };
      if (this.chartDims.tsSplit) params.dimension = this.chartDims.tsSplit;
      return this.$request({ url: 'report/timeseries', method: 'get', params, openapi: true })
        .then(res => {
          if (res.status === 200) this.$set(this.timeseriesData, metric, res.data.Data || {});
        }).catch(() => {});
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
    grid-template-columns: repeat(4, 1fr);
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
      // 容纳标题右侧浮动的维度下拉；下拉经 transfer 挂到 body，不受 overflow 裁剪
      overflow: hidden;
      line-height: 24px;
    }
  }

  .ts-split-bar {
    grid-column: span 2;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    background: #fff;
    border: 1px solid #e8eaec;
    border-radius: 6px;
    padding: 8px 12px;
  }

  .ts-split-label {
    font-size: 12px;
    color: #808695;
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