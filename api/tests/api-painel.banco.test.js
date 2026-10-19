const { sequelize, Pedido, Rota, Parada } = require('../src/models');
const { app, request, limparBanco, tokenAdmin, pedidoContrato, comChave } = require('./apoio/banco');

let token;
const admin = (req) => req.set('Authorization', `Bearer ${token}`);
const criarPedido = async (dados) =>
  (await comChave(request(app).post('/entrada/pedidos')).send(pedidoContrato(dados))).body.id;

beforeEach(async () => {
  await limparBanco();
  token = await tokenAdmin();
});

afterAll(() => sequelize.close());

describe('painel do despacho', () => {
  it('traz configuração, pedidos, rotas, entregadores e indicadores rápidos', async () => {
    await criarPedido({ minutos: 5, km: 1 });
    const r = await admin(request(app).get('/api/painel'));
    expect(r.status).toBe(200);
    expect(r.body.configuracao.raioMaximoKm).toBe(8);
    expect(r.body.pedidos).toHaveLength(1);
    expect(r.body.rotas).toEqual([]);
    expect(r.body.indicadores).toEqual({ atrasadosAgora: 1, rotasNaRua: 0, entregasPendentes: 0 });
  });
});

describe('pendentes (RF21, RN25)', () => {
  it('marca como entregue ou registra o motivo', async () => {
    const a = await criarPedido();
    const b = await criarPedido();
    await Pedido.update({ status: 'pendente_confirmacao' }, { where: { id: [a, b] } });

    expect((await admin(request(app).post(`/api/pedidos/${a}/resolver`)).send({ entregue: true })).status).toBe(204);
    expect((await Pedido.findByPk(a)).status).toBe('entregue');

    expect((await admin(request(app).post(`/api/pedidos/${b}/resolver`)).send({})).status).toBe(422);
    await admin(request(app).post(`/api/pedidos/${b}/resolver`)).send({ motivo: 'Cliente não atendeu' });
    expect((await Pedido.findByPk(b)).motivoProblema).toBe('Cliente não atendeu');

    const lista = await admin(request(app).get('/api/pedidos'));
    expect(lista.body).toHaveLength(0);
  });

  it('só resolve pedidos pendentes', async () => {
    const a = await criarPedido();
    const r = await admin(request(app).post(`/api/pedidos/${a}/resolver`)).send({ entregue: true });
    expect(r.status).toBe(409);
  });
});

describe('indicadores da noite (RF19)', () => {
  it('conta pedidos, atrasos, rotas e o tempo médio entre pronto e despacho', async () => {
    const agora = Date.now();
    const a = await criarPedido();
    const b = await criarPedido();
    await criarPedido();
    await Pedido.update(
      { status: 'entregue', horarioPronto: new Date(agora - 20 * 60000), horarioEntrega: new Date(agora + 99 * 60000) },
      { where: { id: a } },
    );
    await Pedido.update({ status: 'entregue', horarioPronto: new Date(agora - 10 * 60000), horarioEntrega: new Date(agora) }, { where: { id: b } });
    const rota = await Rota.create({ origem: 'manual', status: 'concluida', horarioSaida: new Date(agora) });
    await Parada.bulkCreate([
      { rotaId: rota.id, pedidoId: a, ordem: 1 },
      { rotaId: rota.id, pedidoId: b, ordem: 2 },
    ]);

    const r = await admin(request(app).get('/api/painel/indicadores'));
    expect(r.body).toMatchObject({
      totalPedidos: 3,
      entregues: 2,
      entreguesComAtraso: 1,
      rotasDespachadas: 1,
      entregasPendentes: 0,
      tempoMedioProntoDespachoMin: 15,
    });
  });
});
