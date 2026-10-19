const { criarApp } = require('./app');
const { porta } = require('./config/env');

criarApp().listen(porta, () => {
  console.log(`API rodando em http://localhost:${porta}`);
});
