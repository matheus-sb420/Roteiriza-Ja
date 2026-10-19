// Casos de uso das rotas: sugerir, montar, editar, desfazer, despachar e concluir.
const { sequelize, Sequelize, Pedido, Parada, Rota, Entregador } = require('../models');
const {
  STATUS_PEDIDO,
  STATUS_ROTA,
  ORIGEM_ROTA,
  TIPO_ENTREGA,
  SITUACAO_ENTREGADOR,
} = require('../nucleo/constantes');
const { sugerirRotas } = require('../nucleo/sugestao');
const { calcularSetor } = require('../nucleo/setor');
const { obterConfiguracao } = require('./configuracao');
const { apresentarPedido } = require('./pedidos');
const portaSaida = require('../portas/saida');
const { ErroNegocio, naoEncontrado } = require('../erros');

const { Op } = Sequelize;

// Uma parada está "resolvida" quando não há mais nada a fazer nela (RN26).
const STATUS_RESOLVIDOS = [
  STATUS_PEDIDO.ENTREGUE,
  STATUS_PEDIDO.PENDENTE_CONFIRMACAO,
  STATUS_PEDIDO.CANCELADO,
];

const INCLUIR_PARADAS = [
  { model: Entregador, as: 'entregador' },
  { model: Parada, as: 'paradas', include: [{ model: Pedido, as: 'pedido' }] },
];
const ORDEM_PARADAS = [[{ model: Parada, as: 'paradas' }, 'ordem', 'ASC']];

async function buscarRota(id, transacao) {
  const rota = await Rota.findByPk(id, {
    include: INCLUIR_PARADAS,
    order: ORDEM_PARADAS,
    transaction: transacao,
  });
  if (!rota) throw naoEncontrado('Rota');
  return rota;
}

function apresentarRota(rota, config, agora) {
  return {
    id: rota.id,
    origem: rota.origem,
    status: rota.status,
    horarioSaida: rota.horarioSaida,
    horarioConclusao: rota.horarioConclusao,
    entregador: rota.entregador ? { id: rota.entregador.id, nome: rota.entregador.nome } : null,
    paradas: rota.paradas.map((parada) => ({
      ordem: parada.ordem,
      tentativasCodigo: parada.tentativasCodigo,
      pedido: apresentarPedido(parada.pedido, config, agora, rota.id),
    })),
  };
}

// Rotas em montagem e despachadas, para a lateral direita do despacho.
async function listarRotasAbertas(agora = new Date()) {
  const config = await obterConfiguracao();
  const rotas = await Rota.findAll({
    where: { status: { [Op.ne]: STATUS_ROTA.CONCLUIDA } },
    include: INCLUIR_PARADAS,
    order: [['id', 'ASC'], ...ORDEM_PARADAS],
  });
  return rotas.map((rota) => apresentarRota(rota, config, agora));
}

// IDs dos pedidos que já estão numa rota não concluída (RN15).
async function pedidosEmRotasAbertas(transacao, excetoRotaId = null) {
  const paradas = await Parada.findAll({
    attributes: ['pedidoId'],
    include: [
      {
        model: Rota,
        as: 'rota',
        attributes: [],
        where: {
          status: { [Op.ne]: STATUS_ROTA.CONCLUIDA },
          ...(excetoRotaId ? { id: { [Op.ne]: excetoRotaId } } : {}),
        },
      },
    ],
    transaction: transacao,
  });
  return new Set(paradas.map((p) => p.pedidoId));
}

// UC04 / RF09: roda o algoritmo sobre os pedidos prontos que não estão em rota.
// As sugestões não são gravadas: a próxima geração descarta as anteriores.
async function sugerir(limite, agora = new Date()) {
  const config = await obterConfiguracao();
  const ocupados = await pedidosEmRotasAbertas();
  const prontos = await Pedido.findAll({
    where: { status: STATUS_PEDIDO.PRONTO, tipoEntrega: TIPO_ENTREGA.PROPRIA },
  });
  const livres = prontos.filter((p) => !ocupados.has(p.id));

  let sugestoes;
  try {
    sugestoes = sugerirRotas(livres, Number(limite), agora, config);
  } catch (erro) {
    if (erro instanceof RangeError) throw new ErroNegocio(422, erro.message);
    throw erro;
  }

  const porId = new Map(livres.map((p) => [p.id, p]));
  return sugestoes.map((s) => ({
    ancoraId: s.ancoraId,
    pedidoIds: s.pedidoIds,
    pedidos: s.pedidoIds.map((id) => apresentarPedido(porId.get(id), config, agora)),
  }));
}

// Confere se os pedidos podem entrar numa rota em montagem.
async function validarPedidosDaRota(pedidoIds, transacao, rotaId = null) {
  if (!Array.isArray(pedidoIds) || pedidoIds.length === 0) {
    throw new ErroNegocio(422, 'Informe ao menos um pedido');
  }
  const ids = pedidoIds.map(Number);
  if (new Set(ids).size !== ids.length) throw new ErroNegocio(422, 'Pedido repetido na rota');

  const pedidos = await Pedido.findAll({ where: { id: ids }, transaction: transacao });
  if (pedidos.length !== ids.length) throw naoEncontrado('Pedido');

  const ocupados = await pedidosEmRotasAbertas(transacao, rotaId);
  for (const pedido of pedidos) {
    if (pedido.tipoEntrega === TIPO_ENTREGA.PLATAFORMA) {
      throw new ErroNegocio(422, `Pedido ${pedido.codigoExibicao} é entregue pela plataforma (RN04)`);
    }
    // RN06: rota manual aceita pedidos em preparo; o aviso vem no despacho.
    if (![STATUS_PEDIDO.EM_PREPARO, STATUS_PEDIDO.PRONTO].includes(pedido.status)) {
      throw new ErroNegocio(409, `Pedido ${pedido.codigoExibicao} está "${pedido.status}"`);
    }
    if (ocupados.has(pedido.id)) {
      throw new ErroNegocio(409, `Pedido ${pedido.codigoExibicao} já está em outra rota (RN15)`);
    }
  }
  // Devolve na mesma ordem dos IDs recebidos.
  return ids.map((id) => pedidos.find((p) => p.id === id));
}

async function gravarParadas(rotaId, pedidos, transacao) {
  await Parada.destroy({ where: { rotaId }, transaction: transacao });
  await Parada.bulkCreate(
    pedidos.map((pedido, i) => ({ rotaId, pedidoId: pedido.id, ordem: i + 1 })),
    { transaction: transacao },
  );
}

// RF10 / RF11: cria uma rota em montagem, a partir de uma sugestão aceita ou
// montada à mão. Pedidos fora da área são permitidos aqui (RN11).
async function criarRota({ pedidoIds, origem = ORIGEM_ROTA.MANUAL }) {
  if (!Object.values(ORIGEM_ROTA).includes(origem)) throw new ErroNegocio(422, 'Origem da rota inválida');
  const config = await obterConfiguracao();
  const rotaId = await sequelize.transaction(async (t) => {
    const pedidos = await validarPedidosDaRota(pedidoIds, t);
    // RN14: paradas da mais próxima para a mais distante; a atendente pode reordenar depois.
    pedidos.sort((a, b) => calcularSetor(a, config).distanciaKm - calcularSetor(b, config).distanciaKm);
    const rota = await Rota.create({ origem }, { transaction: t });
    await gravarParadas(rota.id, pedidos, t);
    return rota.id;
  });
  return apresentarRota(await buscarRota(rotaId), config, new Date());
}

function garantirEmMontagem(rota) {
  if (rota.status !== STATUS_ROTA.EM_MONTAGEM) {
    throw new ErroNegocio(409, 'Só rotas em montagem podem ser alteradas');
  }
}

// RF12: adicionar, remover e reordenar. A lista recebida já é a nova ordem.
async function atualizarParadas(rotaId, pedidoIds) {
  const config = await obterConfiguracao();
  await sequelize.transaction(async (t) => {
    const rota = await buscarRota(rotaId, t);
    garantirEmMontagem(rota);
    const pedidos = await validarPedidosDaRota(pedidoIds, t, rota.id);
    await gravarParadas(rota.id, pedidos, t);
  });
  return apresentarRota(await buscarRota(rotaId), config, new Date());
}

// RN17: desfazer uma rota em montagem libera os pedidos sem mudar o status.
async function desfazerRota(rotaId) {
  const rota = await buscarRota(rotaId);
  garantirEmMontagem(rota);
  await rota.destroy();
}

// Usado pelo cancelamento (RN18): tira o pedido de uma rota em montagem e
// renumera as outras paradas. Uma rota que fica vazia é desfeita.
async function removerParada(parada, transacao) {
  const rotaId = parada.rotaId;
  await parada.destroy({ transaction: transacao });
  const restantes = await Parada.findAll({ where: { rotaId }, order: [['ordem', 'ASC']], transaction: transacao });
  if (restantes.length === 0) {
    await Rota.destroy({ where: { id: rotaId }, transaction: transacao });
    return;
  }
  for (const [i, p] of restantes.entries()) await p.update({ ordem: i + 1 }, { transaction: transacao });
}

// RF13 / RN06 / RN16: atribui o entregador e despacha.
// Se houver pedidos ainda em preparo, devolve um aviso (409) com eles e a
// folga dos demais; a atendente decide e reenvia com "confirmado: true".
async function despachar(rotaId, { entregadorId, confirmado = false }, agora = new Date()) {
  const config = await obterConfiguracao();
  const pedidosDespachados = await sequelize.transaction(async (t) => {
    const rota = await buscarRota(rotaId, t);
    garantirEmMontagem(rota);

    const entregador = await Entregador.findByPk(entregadorId, { transaction: t });
    if (!entregador) throw naoEncontrado('Entregador');
    if (entregador.situacao !== SITUACAO_ENTREGADOR.DISPONIVEL) {
      throw new ErroNegocio(409, `${entregador.nome} não está disponível`);
    }

    const pedidos = rota.paradas.map((p) => p.pedido);
    const emPreparo = pedidos.filter((p) => p.status === STATUS_PEDIDO.EM_PREPARO);
    if (emPreparo.length > 0 && !confirmado) {
      throw new ErroNegocio(409, 'Há pedidos que ainda não estão prontos', {
        precisaConfirmar: true,
        naoProntos: emPreparo.map((p) => p.codigoExibicao),
        pedidos: pedidos.map((p) => {
          const { codigoExibicao, status, folga, classificacao } = apresentarPedido(p, config, agora);
          return { codigoExibicao, status, folga, classificacao };
        }),
      });
    }

    await Pedido.update(
      { status: STATUS_PEDIDO.EM_ROTA },
      { where: { id: pedidos.map((p) => p.id) }, transaction: t },
    );
    await rota.update(
      { status: STATUS_ROTA.DESPACHADA, entregadorId: entregador.id, horarioSaida: agora },
      { transaction: t },
    );
    await entregador.update({ situacao: SITUACAO_ENTREGADOR.EM_ROTA }, { transaction: t });
    return pedidos;
  });

  // Fora da transação: a fonte só é avisada depois que o despacho foi gravado.
  pedidosDespachados.forEach((pedido) => portaSaida.pedidoEmRota(pedido));
  return apresentarRota(await buscarRota(rotaId), config, agora);
}

// RN26: conclui a rota quando todas as paradas estão resolvidas e libera o entregador.
async function concluirSeTerminou(rotaId, transacao, agora = new Date()) {
  const rota = await buscarRota(rotaId, transacao);
  if (rota.status !== STATUS_ROTA.DESPACHADA) return false;
  if (!rota.paradas.every((p) => STATUS_RESOLVIDOS.includes(p.pedido.status))) return false;
  await fecharRota(rota, transacao, agora);
  return true;
}

async function fecharRota(rota, transacao, agora) {
  await rota.update({ status: STATUS_ROTA.CONCLUIDA, horarioConclusao: agora }, { transaction: transacao });
  if (rota.entregadorId) {
    await Entregador.update(
      { situacao: SITUACAO_ENTREGADOR.DISPONIVEL },
      { where: { id: rota.entregadorId }, transaction: transacao },
    );
  }
}

// RF14: conclusão manual pela atendente. Paradas que ficaram sem resposta
// viram "pendente de confirmação", para serem resolvidas no painel (RN25).
async function concluirManualmente(rotaId, agora = new Date()) {
  const config = await obterConfiguracao();
  await sequelize.transaction(async (t) => {
    const rota = await buscarRota(rotaId, t);
    if (rota.status !== STATUS_ROTA.DESPACHADA) {
      throw new ErroNegocio(409, 'Só rotas despachadas podem ser concluídas');
    }
    const semResposta = rota.paradas.map((p) => p.pedido).filter((p) => p.status === STATUS_PEDIDO.EM_ROTA);
    await Pedido.update(
      { status: STATUS_PEDIDO.PENDENTE_CONFIRMACAO },
      { where: { id: semResposta.map((p) => p.id) }, transaction: t },
    );
    await fecharRota(rota, t, agora);
  });
  return apresentarRota(await buscarRota(rotaId), config, agora);
}

module.exports = {
  STATUS_RESOLVIDOS,
  buscarRota,
  apresentarRota,
  listarRotasAbertas,
  sugerir,
  criarRota,
  atualizarParadas,
  desfazerRota,
  removerParada,
  despachar,
  concluirSeTerminou,
  concluirManualmente,
};
