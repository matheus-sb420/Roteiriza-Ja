require('dotenv').config({ quiet: true });

module.exports = {
  porta: Number(process.env.PORT) || 3000,
  // Segredo para assinar os tokens de login. Troque em produção.
  segredoJwt: process.env.JWT_SEGREDO || 'troque-este-segredo',
  // Chave que as fontes de pedidos (simulador, conectores) enviam no
  // cabeçalho "x-chave-fonte" para usar a porta de entrada.
  chaveFontes: process.env.CHAVE_FONTES || 'chave-de-desenvolvimento',
};
