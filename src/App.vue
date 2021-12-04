<template>
  <div id="app" class="container p-5">
    <div class="row">
      <div class="col-4">
        <vue-slider v-model="clusterDistance" :min="0" :max="100" :interval="0.5" />
      </div>
      <div class="col">
        <div class="chart">
          <feedback-map :chartData="chartData" v-if="chartData" :onClick="onPointClick" />
          <span v-else>Loading</span>
        </div>
      </div>
    </div>
    <div class="row mt-5">
      <div v-if="currentCluster">
        {{ currentCluster.tags }}

        <div v-for="(point, index) in currentCluster.points" :key="index">
          <div class="point">
            <div class="point-info">
              <div class="point-info-title">
                <span>{{ point.title }}</span>
              </div>
              <div class="point-info-description">
                <span>{{ point.x }}, {{ point.y }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  newCluster?: ClusteredTextDto;
  clusterDistance: number;
  currentCluster?: ClusterDto;
}

export default Vue.extend({
  components: {
    FeedbackMap,
    VueSlider,
  },
  data(): AppData {
    return {
      allCluster: undefined,
      newCluster: undefined,
      clusterDistance: 2,
      currentCluster: undefined,
    };
  },
  watch: {
    clusterDistance: function (newDistance: number) {
      if (this.allCluster) {
        this.cluster(newDistance);
      }
    },
  },
  computed: {
    chartData(): ScatterChartDataDto | undefined {
      if (this.newCluster) {
        return {
          labels: [],
          datasets: this.newCluster.clusters.map((cluster: ClusterDto) => ({
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
  methods: {
    onPointClick(datasetIndex: number, index: number) {
      const cluster = this.newCluster.clusters[datasetIndex];
      const point = cluster.points[index];

      this.currentCluster = cluster;
    },
    cluster(distance: number) {
      if (this.allCluster) {
        this.newCluster = DataHandler.cluster(this.allCluster, distance);
      }
    },
  },
  async mounted() {
    const dataHandler = new DataHandler();
    this.allCluster = await dataHandler.loadDataFromUrl(
      'https://dasheck0-public.s3.eu-central-1.amazonaws.com/text_embeddings3.json'
    );

    this.cluster(this.clusterDistance);
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
