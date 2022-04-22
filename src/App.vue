<template>
  <div id="app">
    <nav class="navbar navbar-expand bg-dark px-5">
      <ul class="navbar-nav">
        <li class="nav-item">
          <a class="nav-link" href="#/">Sandbox</a>
        </li>
      </ul>
    </nav>

    <div class="container-fluid p-5">
      <div class="row">
        <div class="col-4">
          <div class="d-flex flex-column align-items-stretch text-start">
            <div class="h1">Sandbox</div>
            <div>
              This is a proof of concept finding semantic clusters in data done for the
              Peltarion AI acellerator cohort #3. The goal is to detect semnantic clusters
              in data. See
              <a href="https://github.com/dasheck0/topic-map-clustering" target="_blank">
                https://github.com/dasheck0/topic-map-clustering
              </a>
              for more information. When clusters are build click on a point to see
              detailed information about the cluster.
            </div>
            <div class="h3 mt-5">Options:</div>

            <div class="mt-2 mb-4">
              <div>Cluster algorithm:</div>
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="radio"
                  :value="algorithms.K_MEANS"
                  id="kmeans"
                  v-model="currentClusterAlgorithm"
                  :checked="currentClusterAlgorithm === algorithms.K_MEANS"
                />
                <label class="form-check-label" for="kmeans"> K-Means </label>
              </div>
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="radio"
                  :value="algorithms.DB_SCAN"
                  id="dbscan"
                  v-model="currentClusterAlgorithm"
                  :checked="currentClusterAlgorithm === algorithms.DB_SCAN"
                />
                <label class="form-check-label" for="dbscan"> DB Scan </label>
              </div>
            </div>

            <div v-if="currentClusterAlgorithm === algorithms.K_MEANS">
              <div>Number of clusters:</div>
              <vue-slider class="mt-2" v-model="k" :min="3" :max="20" :interval="1" />
            </div>

            <div v-if="currentClusterAlgorithm === algorithms.DB_SCAN">
              <div>Max distance of points in cluster:</div>
              <vue-slider
                class="mt-2"
                v-model="clusterDistance"
                :min="0"
                :max="200"
                :interval="1"
              />
            </div>
          </div>
        </div>
        <div class="col">
          <div class="chart">
            <feedback-map
              :chartData="chartData"
              v-if="chartData"
              :onClick="onPointClick"
            />
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
            <div
              class=""
              v-for="(tag, index) in currentCluster.tags.slice(0, 20)"
              :key="index"
            >
              <span class="badge bg-primary p-2 me-1 mb-1">{{ tag.term }}</span>
            </div>
          </div>

          <div class="h5 mt-4">Sentiment</div>
          The average comparative is {{ getAverageSentiment(currentCluster) }} and
          therefore
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
                <span class="badge bg-secondary">{{
                  getSentimentFromComparative(point.sentiment.comparative)
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import VueSlider from "vue-slider-component";
import "vue-slider-component/theme/antd.css";
import FeedbackMap from "./components/FeedbackMap.vue";
import DataHandler from "./data";
import {
  ScatterChartDataDto,
  ClusteredTextDto,
  ClusterDto,
  ClusterAlgorithm,
  ClusterOptions,
} from "./data/data.dto";

interface AppData {
  chartData?: ScatterChartDataDto;
  allCluster?: ClusteredTextDto;
  newCluster?: ClusteredTextDto;
  clusterDistance: number;
  currentCluster?: ClusterDto;
  currentClusterAlgorithm: ClusterAlgorithm;
  k: number;
  algorithms: typeof ClusterAlgorithm;
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
      currentClusterAlgorithm: ClusterAlgorithm.K_MEANS,
      k: 5,
      algorithms: ClusterAlgorithm,
    };
  },
  watch: {
    clusterDistance: function (newDistance: number) {
      if (this.allCluster && this.currentClusterAlgorithm === ClusterAlgorithm.DB_SCAN) {
        this.cluster({ distance: newDistance, algorithm: ClusterAlgorithm.DB_SCAN });
      }
    },
    k: function (newK: number) {
      if (this.allCluster && this.currentClusterAlgorithm === ClusterAlgorithm.K_MEANS) {
        this.cluster({ k: newK, algorithm: ClusterAlgorithm.K_MEANS });
      }
    },
    currentClusterAlgorithm: function (newAlgorithm: ClusterAlgorithm) {
      if (this.allCluster) {
        this.cluster({
          algorithm: newAlgorithm,
          k: this.k,
          distance: this.clusterDistance,
        });
      }
    },
  },
  computed: {
    chartData(): ScatterChartDataDto | undefined {
      if (this.newCluster) {
        console.log("new cluster", this.newCluster);

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
    async cluster(options: ClusterOptions) {
      if (this.allCluster) {
        this.newCluster = await DataHandler.cluster(this.allCluster, options);
      }
    },
    getSentimentFromComparative(comparative: number): string {
      if (comparative > 1 / 3) {
        return "positive";
      } else if (comparative < -1 / 3) {
        return "negative";
      } else {
        return "neutral";
      }
    },
    getAverageSentiment(cluster: ClusterDto): number {
      return (
        cluster.points
          .map((point) => point.sentiment.comparative)
          .reduce((a, b) => a + b, 0) / cluster.points.length
      );
    },
  },
  async mounted() {
    const dataHandler = new DataHandler();
    this.allCluster = await dataHandler.loadDataFromUrl(
      "https://dasheck0-public.s3.eu-central-1.amazonaws.com/text_embeddings_g_hgx_babbage.json"
    );

    await this.cluster({ k: this.k, algorithm: ClusterAlgorithm.K_MEANS });
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
.nav-link {
  color: white;
}
</style>
