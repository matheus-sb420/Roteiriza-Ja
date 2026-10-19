// Indicadores da noite (RF19).
// "Noite" = últimas 12 horas, para não depender de onde cai a meia-noite.
const { Sequelize, Pedido, Rota, Parada } = require('../models');
const { STATUS_PEDIDO, STATUS_ROTA } = require('../nucleo/constantes');
const { CLASSIFICACAO } = require('../nucleo/folga');

const { Op } = Sequelize;
const JANELA_HORAS = 12;
const MS_POR_MINUTO = 60 * 1000;

// Contagens rápidas para o topo da tela, a partir da lista já calculada.
function indicadoresRapidos(pedidosAtivos, rotasAbertas) {
  return {
    atrasadosAgora: pedidosAtivos.filter(
      (p) => p.classificacao === CLASSIFICACAO.ATRASADO && p.status !== STATUS_PEDIDO.PENDENTE_CONFIRMACAO,
    ).length,
    rotasNaRua: rotasAbertas.filter((r) => r.status === STATUS_ROTA.DESPACHADA).length,
    entregasPendentes: pedidosAtivos.filter((p) => p.status === STATUS_PEDIDO.PENDENTE_CONFIRMACAO).length,
  };
}

async function indicadoresDaNoite(agora = new Date()) {
  const inicio = new Date(agora.getTime() - JANELA_HORAS * 60 * MS_POR_MINUTO);
  const pedidos = await Pedido.findAll({ where: { horarioPedido: { [Op.gte]: inicio } } });

  const entregues = pedidos.filter((p) => p.status === STATUS_PEDIDO.ENTREGUE);
  const rotasDespachadas = await Rota.count({ where: { horarioSaida: { [Op.gte]: inicio } } });

  // Tempo entre "pronto" e a saída da rota, pedido a pedido.
  const paradas = await Parada.findAll({
    include: [
      { model: Rota, as: 'rota', where: { horarioSaida: { [Op.gte]: inicio } } },
      { model: Pedido, as: 'pedido', where: { horarioPronto: { [Op.ne]: null } } },
    ],
  });
  const esperas = paradas.map((p) => (p.rota.horarioSaida - p.pedido.horarioPronto) / MS_POR_MINUTO);
  const media = esperas.length ? esperas.reduce((a, b) => a + b, 0) / esperas.length : null;

  return {
    desde: inicio,
    totalPedidos: pedidos.length,
    cancelados: pedidos.filter((p) => p.status === STATUS_PEDIDO.CANCELADO).length,
    entregues: entregues.length,
    entreguesComAtraso: entregues.filter((p) => p.horarioEntrega > p.horarioPrometido).length,
    rotasDespachadas,
    entregasPendentes: pedidos.filter((p) => p.status === STATUS_PEDIDO.PENDENTE_CONFIRMACAO && !p.motivoProblema)
      .length,
    tempoMedioProntoDespachoMin: media === null ? null : Math.round(media * 10) / 10,
  };
}

module.exports = { indicadoresRapidos, indicadoresDaNoite };
