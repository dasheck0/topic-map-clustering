<template>
  <div id="app">
    <div class="chart">
      <feedback-map :chartData="chartData" v-if="chartData" />
      <span v-else>Loading</span>
    </div>

    <vue-slider v-model="clusterDistance" :min="0" :max="100" :interval="0.5" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import VueSlider from 'vue-slider-component';
import 'vue-slider-component/theme/antd.css';
import FeedbackMap from './components/FeedbackMap.vue';
import DataHandler from './data';
import { ScatterChartDataDto, ClusteredTextDto, ClusterDto } from './data/data.dto';

interface AppData {
  chartData?: ScatterChartDataDto;
  allCluster?: ClusteredTextDto;
  clusterDistance: number;
}

export default Vue.extend({
  components: {
    FeedbackMap,
    VueSlider,
  },
  data(): AppData {
    return {
      allCluster: undefined,
      clusterDistance: 2,
    };
  },
  watch: {
    clusterDistance: function (newDistance: number) {
      if (this.allCluster) {
        this.allCluster = DataHandler.cluster(this.allCluster, newDistance);
      }
    },
  },
  computed: {
    chartData(): ScatterChartDataDto | undefined {
      if (this.allCluster) {
        //return DataHandler.cluster(this.chartData, this.clusterDistance);
        return {
          labels: [],
          datasets: this.allCluster.clusters.map((cluster: ClusterDto) => ({
            label: cluster.name,
            backgroundColor: cluster.color,
            data: cluster.points.map((point) => ({
              x: point.x,
              y: point.y,
            })),
          })),
        };
      }
    },
  },
  async mounted() {
    const dataHandler = new DataHandler();
    this.allCluster = await dataHandler.loadDataFromUrl(
      'https://dasheck0-public.s3.eu-central-1.amazonaws.com/text_embeddings3.json'
    );

    console.log('this', this.allCluster);
  },
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
</style>
