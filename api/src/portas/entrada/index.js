// Porta de entrada (seção 9.1). Aceita três mensagens: novo pedido, pedido
// cancelado e pedido pronto. Quem chama (cadastro manual, simulador ou um
// conector futuro) não importa: todos passam pelas mesmas funções.
const { validarNovoPedido } = require('./contrato');
const { ErroNegocio } = require('../../erros');
const pedidos = require('../../servicos/pedidos');

async function novoPedido(dados) {
  const { erros, pedido } = validarNovoPedido(dados);
  if (erros.length > 0) throw new ErroNegocio(422, 'Pedido fora do contrato', erros);
  return pedidos.registrarPedido(pedido);
}

// A origem precisa bater com a do pedido: uma fonte não mexe em pedidos de outra.
async function pedidoCancelado(id, origem) {
  await pedidos.garantirOrigem(id, origem);
  return pedidos.cancelarPedido(id);
}

async function pedidoPronto(id, origem) {
  await pedidos.garantirOrigem(id, origem);
  return pedidos.marcarPronto(id, true);
}

module.exports = { novoPedido, pedidoCancelado, pedidoPronto };
