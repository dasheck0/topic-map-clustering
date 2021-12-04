import axios from 'axios';
import { UMAP } from 'umap-js';
import { point, featureCollection } from '@turf/turf';
import * as clustersDbscan from '@turf/clusters-dbscan';
import { groupBy } from 'lodash';
import * as randomColor from 'randomcolor';

import { ClusteredTextDto, PointDto, ScatterChartDataDto, TextEmbeddingDto } from './data.dto';

export default class DataHandler {
    constructor() {

    }

    async loadDataFromUrl(url: string): Promise<ClusteredTextDto> {
        try {
            // get text embeddings from url
            const textEmbedding = await this.loadTextEmbeddingsFromUrl(url);

            // extract shape vectors from text embeddings
            const shapes = textEmbedding.rows.map((row) => row['Text embedding'].data);

            // down size vector dimension
            const umap = new UMAP({
                nComponents: 2,
                nNeighbors: 10,
                minDist: 0.5,
                spread: 2.0,
            });
            const embeddings = umap.fit(shapes);

            return {
                clusters: [{
                    color: '#88888844',
                    name: 'All',
                    tags: [],
                    points: embeddings.map((embedding, index) => ({
                        x: embedding[0],
                        y: embedding[1],
                        title: textEmbedding.titles[index]
                    }))
                }]
            };
        } catch (error) {
            console.log(error);
            return Promise.reject(error);
        }
    }

    private async loadTextEmbeddingsFromUrl(url: string): Promise<TextEmbeddingDto> {
        try {
            const { data } = await axios.get(url);
            return data;
        } catch (error) {
            console.log(error);
            return Promise.reject(error);
        }
    }

    static cluster(data: ClusteredTextDto, distance: number): ClusteredTextDto {
        const mainCluster = data.clusters[0];

        const collection = featureCollection(mainCluster.points.map((vector: PointDto) => point([vector.x, vector.y], { title: vector.title })));
        const clusterdCollection = clustersDbscan.default(collection, distance);
        const clusters = groupBy(clusterdCollection.features, 'properties.cluster');

        const colors = randomColor({ luminosity: 'light', count: Object.keys(clusters).length, seed: 42 });
        const newClusters = Object.keys(clusters).map((key, index) => ({
            color: colors[index],
            name: key,
            tags: [],
            points: clusters[key].map((point) => ({
                x: point.geometry.coordinates[0],
                y: point.geometry.coordinates[1],
                title: point.properties.title
            }))
        }));

        return { clusters: [mainCluster, ...newClusters] };
    }
}