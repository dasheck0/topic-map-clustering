export interface TextEmbeddingDto {
    rows: TextEmbeddingRowDto[];
    titles: string[];
}

export interface TextEmbeddingRowDto {
    'Text embedding': TextEmbeddingItemDto;
}

export interface TextEmbeddingItemDto {
    shape: number[];
    data: number[];
}

export interface ScatterChartDataDto {
    labels: string[];
    datasets: ScatterChartDatasetDto[];
}

export interface ScatterChartDatasetDto {
    label: string;
    backgroundColor?: string;
    data: ScatterChartDataPointDto[];
}

export interface ScatterChartDataPointDto {
    x: number;
    y: number;
}

export interface ClusteredTextDto {
    clusters: ClusterDto[];
}

export interface ClusterDto {
    color: string;
    name: string;
    tags: string[];
    points: PointDto[];
}

export interface PointDto {
    title: string;
    x: number;
    y: number;
}