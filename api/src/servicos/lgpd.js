// RN20 / RNF10: apaga nome, telefone e endereço do cliente depois do prazo.
// Só mexe em pedidos encerrados: um pedido ainda na rua precisa do endereço.
const { Pedido, Sequelize } = require('../models');
const { STATUS_PEDIDO } = require('../nucleo/constantes');
const { obterConfiguracao } = require('./configuracao');

const { Op } = Sequelize;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

async function apagarDadosVencidos(agora = new Date()) {
  const config = await obterConfiguracao();
  const limite = new Date(agora.getTime() - config.prazoRetencaoDias * MS_POR_DIA);
  const [quantidade] = await Pedido.update(
    { clienteNome: null, clienteTelefone: null, endereco: null, dadosClienteApagadosEm: agora },
    {
      where: {
        horarioPedido: { [Op.lt]: limite },
        dadosClienteApagadosEm: null,
        status: {
          [Op.in]: [
            STATUS_PEDIDO.ENTREGUE,
            STATUS_PEDIDO.CANCELADO,
            STATUS_PEDIDO.PENDENTE_CONFIRMACAO,
          ],
        },
      },
    },
  );
  return quantidade;
}

module.exports = { apagarDadosVencidos };
