/// <reference types="vite/client" />
/// <reference path="./types.d.ts" />  // <-- Nueva línea

// Sobreescribimos la importación de JSON para usar el tipo que acabamos de definir
declare module "*.json" {
  const value: GeoJSON.FeatureCollection;
  export default value;
}