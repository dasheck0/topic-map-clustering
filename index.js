import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import * as fs from 'fs';
import parse from 'csv-parse/lib/sync.js';
import { UMAP } from 'umap-js';
import nodeplot from 'nodeplotlib';
import { point, featureCollection } from '@turf/turf';
import * as clustersDbscan from '@turf/clusters-dbscan';
import lodash from 'lodash';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import { Corpus } from "tiny-tfidf";
import { stopWords } from './stopwords.js';

const url = process.env.URL;
const token = process.env.TOKEN;

const getTextEmbeddings = async (texts) => {
    // commented this, so that it works without access to peltarion API for demo purpose

    // const data = {
    //     rows: texts.map(text => ({ question: text })),
    // };

    // try {
    //     return await axios({
    //         method: 'post',
    //         maxContentLength: Infinity,
    //         maxBodyLength: Infinity,
    //         url,
    //         data,
    //         headers: {
    //             'Authorization': `Bearer ${token}`,
    //             'Content-Type': 'application/json'
    //         }
    //     });
    // } catch (error) {
    //     console.log(error);
    // }

    console.log("Downloading data. Might take a while");
    const url = 'https://dasheck0-public.s3.eu-central-1.amazonaws.com/text_embeddings2.json';
    const { data } = await axios.get(url);
    console.log("Downloaded data");

    return { data };
};

const convertResponseToVector = (data) => {
    return data.rows.map(row => row['Text embedding'].data);
};

const convertVectorsToClusterableData = (vectors, titles) => {
    const collection = featureCollection(vectors.map((vector, index) => point(vector, { title: titles[index] })));
    return collection;
};

(async () => {
    // configurations

    const inputFilePath = './input.csv';
    const maxCount = 1000;

    // prepare directories
    console.log("Preparing directories");
    rimraf.sync('./clusters');
    mkdirp.sync('./clusters');

    // load data
    console.log("Loading data");
    const csvDataAsString = fs.readFileSync(inputFilePath, 'utf8');
    const records = parse(csvDataAsString, { columns: true, skip_empty_lines: true, trim: true, delimiter: ',' });
    const titles = records.map(record => record['text']).slice(0, maxCount);

    const { data } = await getTextEmbeddings(titles);
    // fs.writeFileSync('./text_embeddings.json', JSON.stringify(data));

    // convert data from API to vectors
    console.log("Converting data from API to vectors");
    const convertedData = convertResponseToVector(data).slice(0, maxCount);

    // shape vector with 2 compoents to plot data on a 2D plane
    console.log("Shaping vectors");
    const umap = new UMAP({ nComponents: 2 });
    const embeddings = umap.fit(convertedData);

    // plot data
    console.log("Plotting data");
    const plotData = [{
        x: embeddings.map(xy => xy[0]),
        y: embeddings.map(xy => xy[1]),
        text: titles.slice(0, maxCount),
        mode: 'markers',
        type: 'scatter'
    }];

    nodeplot.plot(plotData);

    // run dbscan cluster 
    console.log("Running dbscan");
    const clusterableData = convertVectorsToClusterableData(embeddings, titles);
    const clustered = clustersDbscan.default(clusterableData, 35);

    // analyse cluster and write them to file system as json
    console.log("Analysing clusters");
    const clusters = lodash.groupBy(clustered.features, 'properties.cluster');
    const keys = Object.keys(clusters);

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const fileKey = key === 'undefined' ? 'noise' : key;
        const features = clusters[key];

        const corpus = new Corpus(
            features.map((_, index) => `document${index}`),
            features.map(feature => feature.properties.title).filter(title => !!title),
            false,
            stopWords.de
        );

        // get top terms using tf-idf
        const topTerms = lodash.uniqBy(lodash.flatten(features.map((_, index) => corpus.getTopTermsForDocument(`document${index}`).map(term => ({ term: term[0].toLowerCase(), value: term[1] })))), 'term');
        const result = {
            terms: lodash.orderBy(topTerms, ['value'], ['asc']).slice(0, 5),
            features
        };

        fs.writeFileSync(`./clusters/cluster_${fileKey}.json`, JSON.stringify(result, null, 2));
    }
})();