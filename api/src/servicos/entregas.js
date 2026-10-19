// O que o entregador faz no app: ver a própria rota e confirmar cada entrega.
const { sequelize, Pedido, Rota, Parada } = require('../models');
const { STATUS_PEDIDO, STATUS_ROTA } = require('../nucleo/constantes');
const portaSaida = require('../portas/saida');
const { concluirSeTerminou } = require('./rotas');
const { ErroNegocio } = require('../erros');

const { RESULTADO_VALIDACAO } = portaSaida;

// RN24: na terceira tentativa inválida o pedido vira pendente.
const MAXIMO_TENTATIVAS = 3;

const RESULTADO = Object.freeze({
  ENTREGUE: 'entregue',
  CODIGO_INVALIDO: 'codigo_invalido',
  PENDENTE: 'pendente',
});

// RN27: o entregador só vê a rota despachada atribuída a ele.
async function rotaDoEntregador(entregadorId) {
  const rota = await Rota.findOne({
    where: { entregadorId, status: STATUS_ROTA.DESPACHADA },
    include: [{ model: Parada, as: 'paradas', include: [{ model: Pedido, as: 'pedido' }] }],
    order: [[{ model: Parada, as: 'paradas' }, 'ordem', 'ASC']],
  });
  if (!rota) return { rota: null };

  const paradas = rota.paradas.map((parada) => ({
    ordem: parada.ordem,
    pedidoId: parada.pedido.id,
    plataforma: parada.pedido.plataforma,
    codigoExibicao: parada.pedido.codigoExibicao,
    endereco: parada.pedido.endereco,
    latitude: parada.pedido.latitude,
    longitude: parada.pedido.longitude,
    status: parada.pedido.status,
    exigeCodigo: parada.pedido.exigeCodigo,
    tentativasRestantes: MAXIMO_TENTATIVAS - parada.tentativasCodigo,
  }));
  // RF23: a parada atual é a primeira que ainda está "em rota".
  const atual = paradas.find((p) => p.status === STATUS_PEDIDO.EM_ROTA);
  return {
    rota: { id: rota.id, horarioSaida: rota.horarioSaida, paradas },
    paradaAtualId: atual ? atual.pedidoId : null,
  };
}

async function buscarParadaDoEntregador(entregadorId, pedidoId) {
  const parada = await Parada.findOne({
    where: { pedidoId },
    include: [
      { model: Rota, as: 'rota', where: { entregadorId, status: STATUS_ROTA.DESPACHADA } },
      { model: Pedido, as: 'pedido' },
    ],
  });
  if (!parada) throw new ErroNegocio(404, 'Esta entrega não está na sua rota');
  if (parada.pedido.status !== STATUS_PEDIDO.EM_ROTA) {
    throw new ErroNegocio(409, `Esta entrega já está "${parada.pedido.status}"`);
  }
  return parada;
}

// UC13: confirmar a entrega.
// - Não exige código: confirma direto (RN23).
// - Exige código: pergunta à fonte pela porta de saída (RN22). O código só
//   passa por aqui, não é gravado.
// - Três códigos inválidos ou fonte sem resposta: pendente (RN24).
async function confirmarEntrega(entregadorId, pedidoId, codigo, agora = new Date()) {
  const parada = await buscarParadaDoEntregador(entregadorId, pedidoId);
  const { pedido } = parada;

  let validacao = RESULTADO_VALIDACAO.VALIDO;
  if (pedido.exigeCodigo) {
    if (!/^\d+$/.test(String(codigo || ''))) throw new ErroNegocio(422, 'Digite o código do cliente');
    // Fora da transação: a fonte pode demorar até 10 s para responder.
    validacao = await portaSaida.validarCodigo(pedido, String(codigo));
  }

  const resposta = await sequelize.transaction(async (t) => {
    if (validacao === RESULTADO_VALIDACAO.VALIDO) {
      await pedido.update({ status: STATUS_PEDIDO.ENTREGUE, horarioEntrega: agora }, { transaction: t });
      return { resultado: RESULTADO.ENTREGUE };
    }

    if (validacao === RESULTADO_VALIDACAO.INVALIDO) {
      const tentativas = parada.tentativasCodigo + 1;
      await parada.update({ tentativasCodigo: tentativas }, { transaction: t });
      if (tentativas < MAXIMO_TENTATIVAS) {
        return { resultado: RESULTADO.CODIGO_INVALIDO, tentativasRestantes: MAXIMO_TENTATIVAS - tentativas };
      }
    }

    // Terceira tentativa inválida ou fonte sem resposta.
    await pedido.update({ status: STATUS_PEDIDO.PENDENTE_CONFIRMACAO }, { transaction: t });
    return { resultado: RESULTADO.PENDENTE, motivo: validacao };
  });

  let rotaConcluida = false;
  if (resposta.resultado !== RESULTADO.CODIGO_INVALIDO) {
    rotaConcluida = await sequelize.transaction((t) => concluirSeTerminou(parada.rotaId, t, agora));
  }
  if (resposta.resultado === RESULTADO.ENTREGUE) portaSaida.pedidoEntregue(pedido);

  return { ...resposta, rotaConcluida };
}

module.exports = { MAXIMO_TENTATIVAS, RESULTADO, rotaDoEntregador, confirmarEntrega };
