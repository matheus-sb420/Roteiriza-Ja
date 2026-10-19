// Ponto a uma distância (km) e rumo (graus a partir do norte) de uma origem.
// Mesma fórmula da API (api/src/nucleo/geo.js), usada aqui só para desenhar.
const RAIO_TERRA_KM = 6371;
const rad = (g) => (g * Math.PI) / 180;
const graus = (r) => (r * 180) / Math.PI;

export function pontoADistancia([lat, lon], distancia, rumo) {
  const d = distancia / RAIO_TERRA_KM;
  const r = rad(rumo);
  const lat1 = rad(lat);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(r));
  const lon2 =
    rad(lon) + Math.atan2(Math.sin(r) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [graus(lat2), graus(lon2)];
}
