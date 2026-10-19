// Cálculos geográficos em linha reta (RN19). Pontos são { latitude, longitude }.

const RAIO_TERRA_KM = 6371;

const paraRadianos = (graus) => (graus * Math.PI) / 180;
const paraGraus = (radianos) => (radianos * 180) / Math.PI;

// Distância em linha reta pela fórmula de haversine.
function distanciaKm(a, b) {
  const dLat = paraRadianos(b.latitude - a.latitude);
  const dLon = paraRadianos(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(paraRadianos(a.latitude)) * Math.cos(paraRadianos(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

// Rumo de "origem" até "destino", em graus de 0 a 360, a partir do norte e no
// sentido horário (0 = norte, 90 = leste). É o ângulo usado nas fatias (RN10).
function rumoGraus(origem, destino) {
  const lat1 = paraRadianos(origem.latitude);
  const lat2 = paraRadianos(destino.latitude);
  const dLon = paraRadianos(destino.longitude - origem.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (paraGraus(Math.atan2(y, x)) + 360) % 360;
}

// Ponto que fica a "distancia" km de "origem", no rumo informado.
// Usado para desenhar as linhas das fatias e para montar cenários de teste.
function pontoADistancia(origem, distancia, rumo) {
  const d = distancia / RAIO_TERRA_KM;
  const r = paraRadianos(rumo);
  const lat1 = paraRadianos(origem.latitude);
  const lon1 = paraRadianos(origem.longitude);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(r));
  const lon2 =
    lon1 + Math.atan2(Math.sin(r) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { latitude: paraGraus(lat2), longitude: paraGraus(lon2) };
}

module.exports = { distanciaKm, rumoGraus, pontoADistancia };
