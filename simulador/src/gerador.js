// Gera pedidos no formato do contrato da porta de entrada (seção 9.2).
const crypto = require('node:crypto');
const PONTOS = require('./pontos');

const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Heitor', 'Isabela', 'João',
  'Larissa', 'Marcos', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sofia', 'Thiago', 'Vitória', 'Wagner'];

// Cada plataforma tem o seu formato de código de exibição (Apêndice A.1).
const PLATAFORMAS = {
  ifood: { nome: 'iFood', digitos: 4, exigeCodigo: true },
  food99: { nome: '99Food', digitos: 6, exigeCodigo: true },
  outras: { nome: 'Outra', digitos: 3, exigeCodigo: false },
};

const PARAMETROS_PADRAO = {
  pedidosPorHora: 40,
  distribuicao: { ifood: 60, food99: 30, outras: 10 }, // em %
  prazoMinimoMin: 40,
  prazoMaximoMin: 60,
  entregaPlataformaPct: 5, // % dos pedidos do 99Food entregues pela plataforma
  autoPronto: false,
  preparoMinimoMin: 10,
  preparoMaximoMin: 25,
  cancelamentoPct: 0,
  foraDoAr: false,
};

const RAIO_TERRA_KM = 6371;
const rad = (g) => (g * Math.PI) / 180;

function distanciaKm(a, b) {
  const h =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

const inteiroEntre = (min, max, sortear) => Math.floor(min + sortear() * (max - min + 1));
const digitos = (n, sortear) => Array.from({ length: n }, () => Math.floor(sortear() * 10)).join('');
const escolher = (lista, sortear) => lista[Math.floor(sortear() * lista.length)];

function sortearPlataforma(distribuicao, sortear) {
  const total = Object.values(distribuicao).reduce((a, b) => a + b, 0);
  let alvo = sortear() * total;
  for (const [chave, peso] of Object.entries(distribuicao)) {
    alvo -= peso;
    if (alvo < 0) return chave;
  }
  return Object.keys(distribuicao)[0];
}

// Só pontos dentro do raio de entrega da pizzaria.
function pontosDentroDoRaio(config) {
  const centro = { latitude: config.latitudePizzaria, longitude: config.longitudePizzaria };
  return PONTOS.filter((p) => distanciaKm(centro, p) <= config.raioMaximoKm);
}

// Devolve { contrato, segredo }: o contrato vai para a API; o segredo (código
// do cliente e horários simulados) fica só no simulador.
function gerarPedido(parametros, config, agora = new Date(), sortear = Math.random) {
  const pontos = pontosDentroDoRaio(config);
  if (pontos.length === 0) throw new Error('Nenhum ponto de Campinas dentro do raio configurado');

  const chave = sortearPlataforma(parametros.distribuicao, sortear);
  const plataforma = PLATAFORMAS[chave];
  const ponto = escolher(pontos, sortear);
  // Espalha até ~150 m em volta do ponto para os pinos não ficarem empilhados.
  const espalhar = () => (sortear() - 0.5) * 0.0028;
  const prazo = inteiroEntre(parametros.prazoMinimoMin, parametros.prazoMaximoMin, sortear);
  const entregaPlataforma = chave === 'food99' && sortear() * 100 < parametros.entregaPlataformaPct;

  const contrato = {
    plataforma: plataforma.nome,
    codigoExibicao: digitos(plataforma.digitos, sortear),
    origem: 'SIMULADOR',
    endereco: `${ponto.rua}, ${inteiroEntre(10, 2500, sortear)} - ${ponto.bairro}`,
    clienteNome: escolher(NOMES, sortear),
    clienteTelefone: `19 9${digitos(8, sortear)}`,
    latitude: ponto.latitude + espalhar(),
    longitude: ponto.longitude + espalhar(),
    horarioPedido: agora.toISOString(),
    horarioPrometido: new Date(agora.getTime() + prazo * 60000).toISOString(),
    tipoEntrega: entregaPlataforma ? 'plataforma' : 'propria',
    exigeCodigo: plataforma.exigeCodigo,
    localizador: crypto.randomUUID(),
  };

  const preparo = inteiroEntre(parametros.preparoMinimoMin, parametros.preparoMaximoMin, sortear);
  const segredo = {
    codigoCliente: digitos(4, sortear),
    prontoEm: new Date(agora.getTime() + preparo * 60000),
    // Se for cancelar, cancela entre 3 e 10 minutos depois do pedido.
    cancelarEm:
      sortear() * 100 < parametros.cancelamentoPct
        ? new Date(agora.getTime() + inteiroEntre(3, 10, sortear) * 60000)
        : null,
  };

  return { contrato, segredo };
}

module.exports = { PLATAFORMAS, PARAMETROS_PADRAO, distanciaKm, pontosDentroDoRaio, gerarPedido, sortearPlataforma };
