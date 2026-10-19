// Endpoints usados pelo app do entregador.
const { Router } = require('express');
const { loginEntregador } = require('../servicos/autenticacao');
const entregas = require('../servicos/entregas');
const { exigirEntregador } = require('./middlewares');

const router = Router();

router.post('/login', async (req, res) => {
  res.json(await loginEntregador(req.body.telefone, req.body.pin));
});

router.get('/rota', exigirEntregador, async (req, res) => {
  res.json(await entregas.rotaDoEntregador(req.usuario.id));
});

router.post('/paradas/:pedidoId/confirmar', exigirEntregador, async (req, res) => {
  res.json(await entregas.confirmarEntrega(req.usuario.id, Number(req.params.pedidoId), req.body.codigo));
});

module.exports = router;
