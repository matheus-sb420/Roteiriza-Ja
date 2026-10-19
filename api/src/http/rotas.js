// Rotas de entrega (não confundir com as rotas HTTP do Express).
const { Router } = require('express');
const rotas = require('../servicos/rotas');

const router = Router();

router.get('/', async (req, res) => {
  res.json(await rotas.listarRotasAbertas());
});

router.post('/sugestoes', async (req, res) => {
  res.json(await rotas.sugerir(req.body.limite));
});

router.post('/', async (req, res) => {
  res.status(201).json(await rotas.criarRota(req.body));
});

router.put('/:id/paradas', async (req, res) => {
  res.json(await rotas.atualizarParadas(Number(req.params.id), req.body.pedidoIds));
});

router.delete('/:id', async (req, res) => {
  await rotas.desfazerRota(Number(req.params.id));
  res.status(204).end();
});

router.post('/:id/despachar', async (req, res) => {
  res.json(await rotas.despachar(Number(req.params.id), req.body));
});

router.post('/:id/concluir', async (req, res) => {
  res.json(await rotas.concluirManualmente(Number(req.params.id)));
});

module.exports = router;
