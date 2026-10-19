const { Router } = require('express');
const { obterConfiguracao, atualizarConfiguracao } = require('../servicos/configuracao');

const router = Router();

router.get('/', async (req, res) => {
  res.json(await obterConfiguracao());
});

router.put('/', async (req, res) => {
  res.json(await atualizarConfiguracao(req.body));
});

module.exports = router;
