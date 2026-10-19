// Porta de entrada via HTTP, para fontes externas (simulador, conectores).
const { Router } = require('express');
const portaEntrada = require('../portas/entrada');
const { obterConfiguracao } = require('../servicos/configuracao');
const { exigirChaveFonte } = require('./middlewares');

const router = Router();
router.use(exigirChaveFonte);

// Novo pedido. Responde com o ID interno, que a fonte usa nas próximas mensagens.
router.post('/pedidos', async (req, res) => {
  res.status(201).json(await portaEntrada.novoPedido(req.body));
});

router.post('/pedidos/:id/cancelado', async (req, res) => {
  await portaEntrada.pedidoCancelado(Number(req.params.id), req.body.origem);
  res.status(204).end();
});

router.post('/pedidos/:id/pronto', async (req, res) => {
  await portaEntrada.pedidoPronto(Number(req.params.id), req.body.origem);
  res.status(204).end();
});

// Dados públicos que uma fonte precisa: onde fica a pizzaria, até onde ela
// entrega e se o modo demonstração está ligado (RF18).
router.get('/configuracao', async (req, res) => {
  const c = await obterConfiguracao();
  res.json({
    latitudePizzaria: c.latitudePizzaria,
    longitudePizzaria: c.longitudePizzaria,
    raioMaximoKm: c.raioMaximoKm,
    modoDemonstracao: c.modoDemonstracao,
  });
});

module.exports = router;
