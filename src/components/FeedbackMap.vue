<template>
  <div class="feedback-map">
    <scatter-chart :chartData="chartData" :options="options" :styles="styles" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import ScatterChart from './ScatterChart.vue';

export default Vue.extend({
  components: { ScatterChart },
  props: ['chartData', 'onClick'],
  data() {
    return {
      styles: {
        height: '100%',
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        height: 500,
        legend: {
          display: true,
        },
        tooltips: {
          callbacks: {
            title: function (item: any, data: any) {
              return data.labels[item.index];
            },
          },
        },
        scales: {
          xAxes: [
            {
              gridLines: {
                display: false,
              },
            },
          ],
        },
        onClick: (event: any, point: any) => {
          const clickedPoint = point[0];
          const datasetIndex = clickedPoint?._datasetIndex;
          const index = clickedPoint?._index;

          this.onClick?.(datasetIndex, index);
        },
      },
    };
  },
});
</script>

<style lang="scss" scoped>
.feedback-map {
}
</style>