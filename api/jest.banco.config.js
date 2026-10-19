// Testes que precisam do PostgreSQL (banco de teste). Rodar com: npm run test:banco
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.banco.test.js'],
};
