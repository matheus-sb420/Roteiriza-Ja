// Tudo o que a tela de despacho precisa numa consulta só. A tela repete esta
// consulta a cada poucos segundos (RNF06) e a folga vem recalculada (RF06).
const { Router } = require('express');
const { listarPedidosAtivos } = require('../servicos/pedidos');
const { listarRotasAbertas } = require('../servicos/rotas');
const { obterConfiguracao } = require('../servicos/configuracao');
const { indicadoresRapidos, indicadoresDaNoite } = require('../servicos/indicadores');
const { Entregador } = require('../models');

const router = Router();

router.get('/', async (req, res) => {
  const agora = new Date();
  const [config, pedidos, rotas, entregadores] = await Promise.all([
    obterConfiguracao(),
    listarPedidosAtivos(agora),
    listarRotasAbertas(agora),
    Entregador.findAll({ order: [['nome', 'ASC']] }),
  ]);
  res.json({
    agora,
    configuracao: {
      latitudePizzaria: config.latitudePizzaria,
      longitudePizzaria: config.longitudePizzaria,
      raioMaximoKm: config.raioMaximoKm,
      limiteCriticoMin: config.limiteCriticoMin,
    },
    pedidos,
    rotas,
    entregadores,
    indicadores: indicadoresRapidos(pedidos, rotas),
  });
});

router.get('/indicadores', async (req, res) => {
  res.json(await indicadoresDaNoite());
});

module.exports = router;
