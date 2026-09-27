<template>
  <div ref="chartDom" :style="{ width: '100%', height: height }"></div>
</template>

<script>
import * as echarts from 'echarts';

export default {
  name: 'Echarts',

  props: {
    option: {
      type: Object,
      default: () => ({})
    },
    height: {
      type: String,
      default: '100%'
    }
  },

  data() {
    return {
      chart: null
    };
  },

  watch: {
    option: {
      deep: true,
      handler() {
        this.renderChart();
      }
    }
  },

  mounted() {
    this.$nextTick(() => {
      this.initChart();
    });
    window.addEventListener('resize', this.handleResize);
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  },

  methods: {
    initChart() {
      if (this.chart) {
        this.chart.dispose();
      }
      const dom = this.$refs.chartDom;
      if (!dom) return;
      this.chart = echarts.init(dom);
      this.renderChart();
    },

    renderChart() {
      if (this.chart && this.option && Object.keys(this.option).length) {
        this.chart.setOption(this.option, true);
      }
    },

    handleResize() {
      if (this.chart) {
        this.chart.resize();
      }
    }
  }
};
</script>