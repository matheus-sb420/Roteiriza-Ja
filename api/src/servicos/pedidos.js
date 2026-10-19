// Casos de uso do pedido: registrar, listar com urgência, marcar pronto e cancelar.
const { Sequelize, Pedido, Parada, Rota } = require('../models');
const { STATUS_PEDIDO, STATUS_ROTA } = require('../nucleo/constantes');
const { calcularSetor } = require('../nucleo/setor');
const { avaliarPedido } = require('../nucleo/folga');
const { obterConfiguracao } = require('./configuracao');
const { ErroNegocio, naoEncontrado } = require('../erros');

const { Op } = Sequelize;

const STATUS_ATIVOS = [
  STATUS_PEDIDO.EM_PREPARO,
  STATUS_PEDIDO.PRONTO,
  STATUS_PEDIDO.EM_ROTA,
  STATUS_PEDIDO.PENDENTE_CONFIRMACAO,
];

async function buscarPedido(id, opcoes = {}) {
  const pedido = await Pedido.findByPk(id, opcoes);
  if (!pedido) throw naoEncontrado('Pedido');
  return pedido;
}

// Recebe um pedido já validado pela porta de entrada e grava com o setor calculado.
async function registrarPedido(dados) {
  const config = await obterConfiguracao();
  const { anel, fatia, foraDaArea } = calcularSetor(dados, config);
  const pedido = await Pedido.create({ ...dados, anel, fatia });
  return { id: pedido.id, anel, fatia, foraDaArea };
}

async function garantirOrigem(id, origem) {
  const pedido = await buscarPedido(id);
  if (!origem || pedido.origem !== String(origem).toUpperCase()) {
    throw new ErroNegocio(403, 'Este pedido não pertence a esta fonte');
  }
}

// Parada do pedido numa rota ainda não concluída (RN15: no máximo uma).
async function paradaAberta(pedidoId, transacao) {
  return Parada.findOne({
    where: { pedidoId },
    include: [
      { model: Rota, as: 'rota', where: { status: { [Op.ne]: STATUS_ROTA.CONCLUIDA } } },
    ],
    transaction: transacao,
  });
}

// Formato usado pelas telas: dados do pedido + setor, folga e classificação.
function apresentarPedido(pedido, config, agora, rotaId = null) {
  const avaliacao = avaliarPedido(pedido, agora, config);
  return {
    id: pedido.id,
    plataforma: pedido.plataforma,
    codigoExibicao: pedido.codigoExibicao,
    origem: pedido.origem,
    clienteNome: pedido.clienteNome,
    endereco: pedido.endereco,
    latitude: pedido.latitude,
    longitude: pedido.longitude,
    horarioPedido: pedido.horarioPedido,
    horarioPrometido: pedido.horarioPrometido,
    horarioPronto: pedido.horarioPronto,
    tipoEntrega: pedido.tipoEntrega,
    exigeCodigo: pedido.exigeCodigo,
    status: pedido.status,
    motivoProblema: pedido.motivoProblema,
    anel: avaliacao.anel,
    fatia: avaliacao.fatia,
    distanciaKm: Number(avaliacao.distanciaKm.toFixed(2)),
    foraDaArea: avaliacao.foraDaArea,
    folga: avaliacao.folga,
    classificacao: avaliacao.classificacao,
    rotaId,
  };
}

// RF05: pedidos ativos ordenados pela folga, com a rota aberta de cada um.
async function listarPedidosAtivos(agora = new Date()) {
  const config = await obterConfiguracao();
  const pedidos = await Pedido.findAll({
    where: { status: { [Op.in]: STATUS_ATIVOS } },
    include: [
      {
        model: Parada,
        as: 'paradas',
        required: false,
        include: [
          { model: Rota, as: 'rota', where: { status: { [Op.ne]: STATUS_ROTA.CONCLUIDA } } },
        ],
      },
    ],
  });

  return pedidos
    // Pendentes já resolvidos com um motivo (RN25) saem da lista.
    .filter((p) => !(p.status === STATUS_PEDIDO.PENDENTE_CONFIRMACAO && p.motivoProblema))
    .map((p) => {
      const parada = p.paradas.find((pa) => pa.rota);
      return apresentarPedido(p, config, agora, parada ? parada.rotaId : null);
    })
    .sort((a, b) => a.folga - b.folga || new Date(a.horarioPedido) - new Date(b.horarioPedido));
}

// RF07: marcar e desmarcar como pronto. Só faz sentido antes de o pedido sair.
async function marcarPronto(id, pronto, agora = new Date()) {
  const pedido = await buscarPedido(id);
  const permitido = [STATUS_PEDIDO.EM_PREPARO, STATUS_PEDIDO.PRONTO];
  if (!permitido.includes(pedido.status)) {
    throw new ErroNegocio(409, `Pedido está "${pedido.status}" e não pode mudar de pronto`);
  }
  await pedido.update(
    pronto
      ? { status: STATUS_PEDIDO.PRONTO, horarioPronto: pedido.horarioPronto || agora }
      : { status: STATUS_PEDIDO.EM_PREPARO, horarioPronto: null },
  );
  return pedido;
}

// RN18: o pedido cancelado sai do mapa. (A retirada de rotas entra junto com as rotas.)
async function cancelarPedido(id) {
  const pedido = await buscarPedido(id);
  if ([STATUS_PEDIDO.ENTREGUE, STATUS_PEDIDO.CANCELADO].includes(pedido.status)) {
    throw new ErroNegocio(409, `Pedido já está "${pedido.status}"`);
  }
  await pedido.update({ status: STATUS_PEDIDO.CANCELADO });
  return pedido;
}

module.exports = {
  STATUS_ATIVOS,
  buscarPedido,
  registrarPedido,
  garantirOrigem,
  paradaAberta,
  apresentarPedido,
  listarPedidosAtivos,
  marcarPronto,
  cancelarPedido,
};
