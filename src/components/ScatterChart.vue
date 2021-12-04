<script lang="ts">
import Vue from 'vue';
import { Scatter, mixins } from 'vue-chartjs';
const { reactiveProp } = mixins;

export default Vue.extend<any, any, any, any>({
  extends: Scatter,
  mixins: [reactiveProp],
  props: ['options'],
  mounted() {
    this.renderChart(this.chartData, this.options);
  },
});
</script>
