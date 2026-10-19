// Setor do pedido: anel e fatia (seção 4.5, RN09 a RN12).
const { FATIAS } = require('./constantes');
const { distanciaKm, rumoGraus } = require('./geo');

const LARGURA_ANEL_KM = 2;
const GRAUS_POR_FATIA = 360 / FATIAS.length; // 45°

function centroDaPizzaria(config) {
  return { latitude: config.latitudePizzaria, longitude: config.longitudePizzaria };
}

// Anel 1 = 0 a 2 km, anel 2 = 2 a 4 km, e assim por diante.
function calcularAnel(distancia) {
  return Math.floor(distancia / LARGURA_ANEL_KM) + 1;
}

// A fatia N vai de 337,5° a 22,5°: somar meia fatia antes de dividir faz o
// norte cair no índice 0 sem caso especial.
function calcularFatia(rumo) {
  const indice = Math.floor(((rumo + GRAUS_POR_FATIA / 2) % 360) / GRAUS_POR_FATIA);
  return FATIAS[indice];
}

function calcularSetor(ponto, config) {
  const centro = centroDaPizzaria(config);
  const distancia = distanciaKm(centro, ponto);
  return {
    distanciaKm: distancia,
    anel: calcularAnel(distancia),
    fatia: calcularFatia(rumoGraus(centro, ponto)),
    // RN11: além do raio máximo, o pedido fica "fora da área".
    foraDaArea: distancia > config.raioMaximoKm,
  };
}

// Anel vizinho: diferença de no máximo 1 (o mesmo anel também conta).
function aneisVizinhos(a, b) {
  return Math.abs(a - b) <= 1;
}

// Fatia vizinha: imediatamente ao lado, considerando o círculo (N é vizinha de NO e NE).
function fatiasVizinhas(a, b) {
  const distancia = Math.abs(FATIAS.indexOf(a) - FATIAS.indexOf(b));
  return distancia === 1 || distancia === FATIAS.length - 1;
}

module.exports = {
  LARGURA_ANEL_KM,
  centroDaPizzaria,
  calcularAnel,
  calcularFatia,
  calcularSetor,
  aneisVizinhos,
  fatiasVizinhas,
};
