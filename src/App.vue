<template>
  <div id="app" class="container p-5">
    <div class="row">
      <div class="col-4">
        <div class="d-flex flex-column align-items-stretch text-start">
          <div class="h1">Sandbox</div>
          <div>
            This is a proof of concept finding semantic clusters in data done for the Peltarion AI acellerator cohort
            #3. The goal is to detect semnantic clusters in data. See
            <a href="https://github.com/dasheck0/topic-map-clustering" target="_blank">
              https://github.com/dasheck0/topic-map-clustering
            </a>
            for more information. When clusters are build click on a point to see detailed information about the
            cluster.
          </div>
          <div class="h3 mt-5">Options:</div>
          <div>Max distance of points in cluster:</div>
          <vue-slider class="mt-2" v-model="clusterDistance" :min="0" :max="200" :interval="1" />
        </div>
      </div>
      <div class="col">
        <div class="chart">
          <feedback-map :chartData="chartData" v-if="chartData" :onClick="onPointClick" />
          <div class="loader" v-else>
            <div class="spinner-border" role="status">
              <span class="sr-only"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row mt-5" v-if="currentCluster">
      <div class="col justify-content-start text-start">
        <h3>Clusters</h3>
        <h5>Tags</h5>
        <div class="d-flex flex-row flex-wrap">
          <div class="" v-for="(tag, index) in currentCluster.tags.slice(0, 20)" :key="index">
            <span class="badge bg-primary p-2 me-1 mb-1">{{ tag.term }}</span>
          </div>
        </div>

        <div class="h5 mt-4">Sentiment</div>
        The average comparative is {{ getAverageSentiment(currentCluster) }} and therefore
        {{ getSentimentFromComparative(getAverageSentiment(currentCluster)) }}.

        <div class="d-flex"></div>

        <div class="h5 mt-4">Entries</div>
        <div class="list-group">
          <div
            :class="
              'd-flex flex-row justify-content-between list-group-item list-group-item-action list-group-item' +
              (index % 2 ? '-primary' : '')
            "
            v-for="(point, index) in currentCluster.points"
            :key="index"
          >
            <div class="">
              {{ point.title }}
            </div>
            <div class="ms-4 d-flex flex-column justify-content-start align-items-end">
              Sentiment:
              <span class="badge bg-secondary">{{ getSentimentFromComparative(point.sentiment.comparative) }}</span>
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
      this.currentCluster = this.newCluster?.clusters[datasetIndex];
    },
    cluster(distance: number) {
      if (this.allCluster) {
        this.newCluster = DataHandler.cluster(this.allCluster, distance);
      }
    },
    getSentimentFromComparative(comparative: number): string {
      if (comparative > 1 / 3) {
        return 'positive';
      } else if (comparative < -1 / 3) {
        return 'negative';
      } else {
        return 'neutral';
      }
    },
    getAverageSentiment(cluster: ClusterDto): number {
      return (
        cluster.points.map((point) => point.sentiment.comparative).reduce((a, b) => a + b, 0) / cluster.points.length
      );
    },
  },
  async mounted() {
    const dataHandler = new DataHandler();
    this.allCluster = await dataHandler.loadDataFromUrl(
      'https://dasheck0-public.s3.eu-central-1.amazonaws.com/text_embeddings_g_hgx_babbage.json'
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
.chart {
  height: 500px;
  border: 1px solid lightgray;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart > .loader {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>

<style lang="scss" scoped>
</style>
