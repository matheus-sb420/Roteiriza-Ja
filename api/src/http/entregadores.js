const { Router } = require('express');
const entregadores = require('../servicos/entregadores');

const router = Router();

router.get('/', async (req, res) => {
  res.json(await entregadores.listarEntregadores());
});

router.post('/', async (req, res) => {
  res.status(201).json(await entregadores.criarEntregador(req.body));
});

router.post('/:id/pin', async (req, res) => {
  res.json(await entregadores.trocarPin(Number(req.params.id)));
});

router.patch('/:id', async (req, res) => {
  res.json(await entregadores.alterarSituacao(Number(req.params.id), req.body.situacao));
});

module.exports = router;
