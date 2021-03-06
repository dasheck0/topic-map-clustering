import { KMeansResponseData } from './kmeans.dto';
import axios from 'axios';
import { UMAP } from 'umap-js';
import { point, featureCollection } from '@turf/turf';
import * as clustersDbscan from '@turf/clusters-dbscan';
import { groupBy, flatten, uniqBy, orderBy } from 'lodash';
import randomColor from 'randomcolor';
import stopWords from 'stopwords-en';
import Sentiment from 'sentiment';
import { Corpus } from "tiny-tfidf";
import { ClusteredTextDto, PointDto, TextEmbeddingDto, ClusterOptions, ClusterAlgorithm } from './data.dto';
import * as kmeans from 'node-kmeans';

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
                        title: textEmbedding.titles[index],
                        sentiment: new Sentiment().analyze(textEmbedding.titles[index])
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

    static async cluster(data: ClusteredTextDto, options: ClusterOptions): Promise<ClusteredTextDto> {
        switch (options.algorithm) {
            case ClusterAlgorithm.DB_SCAN:
                return DataHandler.clusterWithDBScan(data, options.distance);

            case ClusterAlgorithm.K_MEANS:
                return DataHandler.clusterWithKMeans(data, options.k);

            default:
                console.log("Options", options);
                throw new Error('Unknown cluster algorithm ' + options.algorithm);
        }
    }

    private static async clusterWithKMeans(data: ClusteredTextDto, k?: number): Promise<ClusteredTextDto> {
        if (!k || k <= 0) {
            throw new Error('k must be set and greater than 0');
        }

        const mainCluster = data.clusters[0];
        const kMeansData = mainCluster.points.map((vector: PointDto) => [vector.x, vector.y]);
        const colors = randomColor({ luminosity: 'light', count: k, seed: 42 });

        return new Promise((resolve, reject) => {
            kmeans.clusterize(kMeansData, { k }, (error: any, response: KMeansResponseData[]) => {
                if (error) {
                    reject(error);
                } else {
                    const clusters = response.map((item, index) => ({
                        color: colors[index],
                        name: `Cluster: ${index + 1}`,
                        tags: [],
                        points: item.cluster.map((point: number[], pointIndex: number) => ({
                            x: point[0],
                            y: point[1],
                            title: mainCluster.points[item.clusterInd[pointIndex]].title,
                            sentiment: mainCluster.points[item.clusterInd[pointIndex]].sentiment
                        }))
                    }));

                    resolve({ clusters });
                }
            });
        });
    }

    private static async clusterWithDBScan(data: ClusteredTextDto, distance?: number): Promise<ClusteredTextDto> {
        if (!distance) {
            throw new Error('Distance is required for DB-SCAN clustering');
        }

        const mainCluster = data.clusters[0];

        const collection = featureCollection(mainCluster.points.map((vector: PointDto) => point([vector.x, vector.y], { title: vector.title })));
        const clusterdCollection = clustersDbscan.default(collection, distance);
        const clusters = groupBy(clusterdCollection.features, 'properties.cluster');

        const colors = randomColor({ luminosity: 'light', count: Object.keys(clusters).length, seed: 42 });
        const newClusters = Object.keys(clusters).map((key, index) => {
            const cluster = clusters[key];
            const corpus = new Corpus(
                cluster.map((_, index: number) => `document_${index}`),
                cluster.map((feature) => feature.properties.title),
                false,
                stopWords
            );

            return {
                color: colors[index],
                name: key === 'undefined' ? 'Unclustered' : `Cluster: ${key}`,
                tags: orderBy(uniqBy(flatten(cluster.map((_, index) => corpus.getTopTermsForDocument(`document_${index}`).map((term: any) => ({ term: term[0].toLowerCase(), value: term[1] })))), 'term'), ['value'], ['desc']),
                points: clusters[key].map((point) => ({
                    x: point.geometry.coordinates[0],
                    y: point.geometry.coordinates[1],
                    title: point.properties.title,
                    sentiment: new Sentiment().analyze(point.properties.title)
                }))
            };
        });

        return { clusters: newClusters };
    }
}