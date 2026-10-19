const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Simulador } = require('../src/simulador');

// API de mentira: registra as chamadas e responde como a porta de entrada.
function apiFalsa({ modoDemonstracao = true } = {}) {
  const chamadas = [];
  let proximoId = 1;
  const buscar = async (url, opcoes) => {
    const caminho = url.replace('http://api', '');
    chamadas.push({ caminho, metodo: opcoes.method, cabecalhos: opcoes.headers, corpo: opcoes.body && JSON.parse(opcoes.body) });
    const json = (status, dados) => ({ ok: status < 400, status, json: async () => dados });
    if (caminho === '/entrada/configuracao') {
      return json(200, { latitudePizzaria: -22.9099, longitudePizzaria: -47.0526, raioMaximoKm: 8, modoDemonstracao });
    }
    if (caminho === '/entrada/pedidos') return json(201, { id: proximoId++, foraDaArea: false });
    return json(204);
  };
  return { chamadas, buscar };
}

const novoSimulador = (api) => new Simulador({ apiUrl: 'http://api', chaveFonte: 'chave', buscar: api.buscar });

test('envia pedidos pela porta de entrada com a chave da fonte', async () => {
  const api = apiFalsa();
  const sim = novoSimulador(api);
  await sim.gerarLote(3);
  const envios = api.chamadas.filter((c) => c.caminho === '/entrada/pedidos');
  assert.equal(envios.length, 3);
  assert.equal(envios[0].cabecalhos['x-chave-fonte'], 'chave');
  assert.equal(envios[0].corpo.origem, 'SIMULADOR');
  assert.equal(sim.pedidos.size, 3);
});

test('não gera pedidos com o modo demonstração desligado (RF18)', async () => {
  const api = apiFalsa({ modoDemonstracao: false });
  const sim = novoSimulador(api);
  sim.rodando = true;
  sim.parametros.pedidosPorHora = 100000;
  await sim.passo(5000);
  await assert.rejects(sim.gerarLote(1), /desligado/);
  assert.equal(sim.pedidos.size, 0);
});

test('gera pedidos no ritmo configurado quando está rodando', async () => {
  const api = apiFalsa();
  const sim = novoSimulador(api);
  sim.rodando = true;
  sim.parametros.pedidosPorHora = 3600; // 1 por segundo → 5 a cada passo de 5 s
  await sim.passo(5000);
  assert.ok(sim.pedidos.size >= 5 && sim.pedidos.size <= 6);
});

test('marca "pronto" sozinho pela mensagem da porta de entrada, se ligado', async () => {
  const api = apiFalsa();
  const sim = novoSimulador(api);
  sim.parametros.autoPronto = true;
  sim.parametros.pedidosPorHora = 0;
  sim.rodando = true;
  const [pedido] = await sim.gerarLote(1);
  await sim.passo(5000, new Date(pedido.prontoEm.getTime() + 1000));
  assert.ok(api.chamadas.some((c) => c.caminho === `/entrada/pedidos/${pedido.id}/pronto` && c.corpo.origem === 'SIMULADOR'));
  assert.equal(pedido.status, 'pronto');
});

test('cancela pedidos quando sorteado', async () => {
  const api = apiFalsa();
  const sim = novoSimulador(api);
  sim.parametros.cancelamentoPct = 100;
  sim.parametros.pedidosPorHora = 0;
  sim.rodando = true;
  const [pedido] = await sim.gerarLote(1);
  await sim.passo(5000, new Date(pedido.cancelarEm.getTime() + 1000));
  assert.equal(pedido.status, 'cancelado');
});

test('responde à validação do código como uma plataforma', async () => {
  const sim = novoSimulador(apiFalsa());
  const [pedido] = await sim.gerarLote(1);
  assert.deepEqual(sim.validarCodigo({ pedidoId: pedido.id, codigo: pedido.codigoCliente }), { valido: true });
  assert.deepEqual(sim.validarCodigo({ pedidoId: pedido.id, codigo: 'errado' }), { valido: false });
  assert.deepEqual(sim.validarCodigo({ pedidoId: 999, codigo: '1234' }), { valido: false });
});

test('"plataforma fora do ar" não responde à validação (RN24)', async () => {
  const sim = novoSimulador(apiFalsa());
  const [pedido] = await sim.gerarLote(1);
  sim.parametros.foraDoAr = true;
  assert.equal(sim.validarCodigo({ pedidoId: pedido.id, codigo: pedido.codigoCliente }), null);
});

test('acompanha "em rota" e "entregue" vindos da porta de saída', async () => {
  const sim = novoSimulador(apiFalsa());
  const [pedido] = await sim.gerarLote(1);
  sim.pedidoEmRota({ pedidoId: pedido.id });
  assert.equal(pedido.status, 'em_rota');
  sim.pedidoEntregue({ pedidoId: pedido.id });
  assert.equal(pedido.status, 'entregue');
});
