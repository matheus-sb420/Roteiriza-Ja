const express = require('express');
const cors = require('cors');

// Monta o app Express sem abrir porta, para os testes usarem o mesmo app.
function criarApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

module.exports = { criarApp };
