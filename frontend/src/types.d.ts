// frontend/src/types.d.ts

// Definición para que TypeScript entienda la estructura de datos que GeoJSON espera.
// Usamos los tipos que proporciona la librería 'geojson'.
declare module 'geojson' {
    interface GeoJsonProperties {
        id: string;
        nombre: string;
        area: number;
        precio: number;
        estado: 'disponible' | 'en_negociacion' | 'ocupado';
        giro: string;
        imagen: string;
        [key: string]: any;
    }

    interface Geometry {
        type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | 'GeometryCollection';
        coordinates: any;
    }

    interface Feature<G extends Geometry | null = Geometry, P = GeoJsonProperties> {
        type: 'Feature';
        geometry: G;
        properties: P;
        id?: string | number;
    }

    interface FeatureCollection<G extends Geometry | null = Geometry, P = GeoJsonProperties> {
        type: 'FeatureCollection';
        features: Array<Feature<G, P>>;
    }
}