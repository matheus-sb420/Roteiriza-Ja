const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gerarPedido, pontosDentroDoRaio, distanciaKm, PARAMETROS_PADRAO, sortearPlataforma } = require('../src/gerador');

const config = { latitudePizzaria: -22.9099, longitudePizzaria: -47.0526, raioMaximoKm: 8 };
const centro = { latitude: config.latitudePizzaria, longitude: config.longitudePizzaria };
const agora = new Date('2026-10-23T23:00:00Z');

test('gera um pedido completo no formato do contrato', () => {
  const { contrato, segredo } = gerarPedido(PARAMETROS_PADRAO, config, agora);
  for (const campo of ['plataforma', 'codigoExibicao', 'endereco', 'clienteNome', 'localizador']) {
    assert.ok(contrato[campo], `${campo} preenchido`);
  }
  assert.equal(contrato.origem, 'SIMULADOR');
  assert.equal(typeof contrato.latitude, 'number');
  assert.match(segredo.codigoCliente, /^\d{4}$/);
});

test('código de exibição segue o formato de cada plataforma', () => {
  for (let i = 0; i < 200; i++) {
    const { contrato } = gerarPedido(PARAMETROS_PADRAO, config, agora);
    if (contrato.plataforma === 'iFood') assert.match(contrato.codigoExibicao, /^\d{4}$/);
    if (contrato.plataforma === '99Food') assert.match(contrato.codigoExibicao, /^\d{6}$/);
  }
});

test('prazo prometido fica entre o mínimo e o máximo', () => {
  for (let i = 0; i < 100; i++) {
    const { contrato } = gerarPedido(PARAMETROS_PADRAO, config, agora);
    const minutos = (new Date(contrato.horarioPrometido) - agora) / 60000;
    assert.ok(minutos >= 40 && minutos <= 60, `prazo ${minutos}`);
  }
});

test('só usa pontos dentro do raio de entrega', () => {
  const perto = pontosDentroDoRaio({ ...config, raioMaximoKm: 3 });
  assert.ok(perto.length > 0);
  for (const p of perto) assert.ok(distanciaKm(centro, p) <= 3);
  for (let i = 0; i < 50; i++) {
    const { contrato } = gerarPedido(PARAMETROS_PADRAO, { ...config, raioMaximoKm: 3 }, agora);
    assert.ok(distanciaKm(centro, contrato) <= 3.3);
  }
});

test('só pedidos do 99Food podem ser entregues pela plataforma', () => {
  const parametros = { ...PARAMETROS_PADRAO, entregaPlataformaPct: 100 };
  for (let i = 0; i < 100; i++) {
    const { contrato } = gerarPedido(parametros, config, agora);
    assert.equal(contrato.tipoEntrega === 'plataforma', contrato.plataforma === '99Food');
  }
});

test('a distribuição por plataforma respeita os pesos', () => {
  const contagem = { ifood: 0, food99: 0, outras: 0 };
  for (let i = 0; i < 5000; i++) contagem[sortearPlataforma({ ifood: 60, food99: 30, outras: 10 }, Math.random)]++;
  assert.ok(Math.abs(contagem.ifood / 5000 - 0.6) < 0.04);
  assert.ok(Math.abs(contagem.outras / 5000 - 0.1) < 0.03);
});
