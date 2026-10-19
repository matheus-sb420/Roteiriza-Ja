const express = require('express');
const cors = require('cors');
const { exigirAdmin, tratarErros } = require('./http/middlewares');

// Monta o app Express sem abrir porta, para os testes usarem o mesmo app.
function criarApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Porta de entrada para fontes externas (chave no cabeçalho).
  app.use('/entrada', require('./http/entrada'));

  // Sistema de despacho (login do administrador).
  app.use('/auth', require('./http/autenticacao'));
  app.use('/api/pedidos', exigirAdmin, require('./http/pedidos'));
  app.use('/api/configuracao', exigirAdmin, require('./http/configuracao'));
  app.use('/api/entregadores', exigirAdmin, require('./http/entregadores'));
  app.use('/api/rotas', exigirAdmin, require('./http/rotas'));

  app.use(tratarErros);
  return app;
}

module.exports = { criarApp };
