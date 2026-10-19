// Configuração da pizzaria (RF16, RF18).
const { Configuracao, Pedido, Sequelize } = require('../models');
const { calcularSetor } = require('../nucleo/setor');
const { STATUS_PEDIDO } = require('../nucleo/constantes');
const { ErroNegocio } = require('../erros');

const CAMPOS_EDITAVEIS = [
  'enderecoPizzaria',
  'latitudePizzaria',
  'longitudePizzaria',
  'raioMaximoKm',
  'temposPorAnelMin',
  'limiteCriticoMin',
  'prazoRetencaoDias',
  'modoDemonstracao',
];

async function obterConfiguracao() {
  const config = await Configuracao.findOne({ order: [['id', 'ASC']] });
  if (!config) throw new ErroNegocio(500, 'Configuração não encontrada: rode "npm run db:seed"');
  return config;
}

async function atualizarConfiguracao(dados) {
  const config = await obterConfiguracao();
  for (const campo of CAMPOS_EDITAVEIS) {
    if (dados[campo] !== undefined) config[campo] = dados[campo];
  }
  const mudouCentro = config.changed('latitudePizzaria') || config.changed('longitudePizzaria');
  try {
    await config.save();
  } catch (erro) {
    if (erro.name === 'SequelizeValidationError') {
      throw new ErroNegocio(422, 'Configuração inválida', erro.errors.map((e) => e.message));
    }
    throw erro;
  }
  // Se a pizzaria mudou de lugar, o setor dos pedidos em aberto muda junto.
  if (mudouCentro) await recalcularSetores(config);
  return config;
}

async function recalcularSetores(config) {
  const abertos = await Pedido.findAll({
    where: {
      status: { [Sequelize.Op.notIn]: [STATUS_PEDIDO.ENTREGUE, STATUS_PEDIDO.CANCELADO] },
    },
  });
  for (const pedido of abertos) {
    const { anel, fatia } = calcularSetor(pedido, config);
    await pedido.update({ anel, fatia });
  }
}

module.exports = { obterConfiguracao, atualizarConfiguracao };
