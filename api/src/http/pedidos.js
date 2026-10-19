const { Router } = require('express');
const portaEntrada = require('../portas/entrada');
const pedidos = require('../servicos/pedidos');

const router = Router();

router.get('/', async (req, res) => {
  res.json(await pedidos.listarPedidosAtivos());
});

// RF03: cadastro manual. Passa pela mesma porta de entrada das outras fontes,
// só que com a origem MANUAL.
router.post('/', async (req, res) => {
  res.status(201).json(await portaEntrada.novoPedido({ ...req.body, origem: 'MANUAL' }));
});

router.post('/:id/pronto', async (req, res) => {
  const pronto = req.body.pronto !== false;
  await pedidos.marcarPronto(Number(req.params.id), pronto);
  res.status(204).end();
});

router.post('/:id/cancelar', async (req, res) => {
  await pedidos.cancelarPedido(Number(req.params.id));
  res.status(204).end();
});

module.exports = router;
