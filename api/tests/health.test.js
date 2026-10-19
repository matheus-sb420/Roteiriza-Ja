const request = require('supertest');
const { criarApp } = require('../src/app');

describe('GET /health', () => {
  it('responde que a API está no ar', async () => {
    const resposta = await request(criarApp()).get('/health');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });
});
