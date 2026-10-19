jest.mock('../src/portas/saida', () => ({
  ...jest.requireActual('../src/portas/saida'),
  pedidoEmRota: jest.fn(),
  pedidoEntregue: jest.fn(),
}));

const portaSaida = require('../src/portas/saida');
const { sequelize, Pedido, Rota, Parada, Entregador } = require('../src/models');
const { app, request, limparBanco, tokenAdmin, pedidoContrato, comChave } = require('./apoio/banco');

let token;
const admin = (req) => req.set('Authorization', `Bearer ${token}`);

async function criarPedido(dados, { pronto = true } = {}) {
  const { body } = await comChave(request(app).post('/entrada/pedidos')).send(pedidoContrato(dados));
  if (pronto) await admin(request(app).post(`/api/pedidos/${body.id}/pronto`)).send({ pronto: true });
  return body.id;
}

async function criarEntregador(telefone = '19988887777') {
  const { body } = await admin(request(app).post('/api/entregadores')).send({ nome: 'João', telefone });
  return body.entregador.id;
}

beforeEach(async () => {
  jest.clearAllMocks();
  await limparBanco();
  token = await tokenAdmin();
});

afterAll(() => sequelize.close());

describe('sugestões (UC04)', () => {
  it('sugere só com pedidos prontos fora de rotas e não grava nada', async () => {
    const a = await criarPedido({ km: 5, rumo: 45, minutos: 15 });
    const b = await criarPedido({ km: 5.5, rumo: 45, minutos: 60 });
    await criarPedido({ km: 3, rumo: 45 }, { pronto: false });
    await criarPedido({ km: 3, rumo: 45, tipoEntrega: 'plataforma' });

    const r = await admin(request(app).post('/api/rotas/sugestoes')).send({ limite: 3 });
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(r.body[0].ancoraId).toBe(a);
    expect(r.body[0].pedidoIds).toEqual([a, b]);
    expect(r.body[0].pedidos[0]).toHaveProperty('folga');
    expect(await Rota.count()).toBe(0);
  });

  it('sem pedidos prontos devolve lista vazia (UC04 3a)', async () => {
    const r = await admin(request(app).post('/api/rotas/sugestoes')).send({ limite: 3 });
    expect(r.body).toEqual([]);
  });

  it('recusa limite inválido', async () => {
    const r = await admin(request(app).post('/api/rotas/sugestoes')).send({ limite: 0 });
    expect(r.status).toBe(422);
  });

  it('pedido já em rota não entra em novas sugestões', async () => {
    const a = await criarPedido({ km: 3 });
    await admin(request(app).post('/api/rotas')).send({ pedidoIds: [a], origem: 'sugerida' });
    const r = await admin(request(app).post('/api/rotas/sugestoes')).send({ limite: 3 });
    expect(r.body).toEqual([]);
  });
});

describe('montagem de rotas (RF10 a RF12)', () => {
  it('aceita uma sugestão e ordena as paradas pela distância (RN14)', async () => {
    const longe = await criarPedido({ km: 5 });
    const perto = await criarPedido({ km: 1 });
    const r = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [longe, perto], origem: 'sugerida' });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('em_montagem');
    expect(r.body.paradas.map((p) => p.pedido.id)).toEqual([perto, longe]);
  });

  it('rota manual aceita pedido em preparo (RN06), mas não de plataforma (RN04)', async () => {
    const emPreparo = await criarPedido({}, { pronto: false });
    const ok = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [emPreparo] });
    expect(ok.status).toBe(201);

    const plataforma = await criarPedido({ tipoEntrega: 'plataforma' });
    const recusada = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [plataforma] });
    expect(recusada.status).toBe(422);
  });

  it('um pedido fica em no máximo uma rota aberta (RN15)', async () => {
    const a = await criarPedido();
    await admin(request(app).post('/api/rotas')).send({ pedidoIds: [a] });
    const r = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [a] });
    expect(r.status).toBe(409);
  });

  it('reordena, adiciona e remove paradas antes do despacho', async () => {
    const a = await criarPedido({ km: 1 });
    const b = await criarPedido({ km: 2.5 });
    const c = await criarPedido({ km: 3 });
    const { body: rota } = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [a, b] });

    const r = await admin(request(app).put(`/api/rotas/${rota.id}/paradas`)).send({ pedidoIds: [c, a] });
    expect(r.status).toBe(200);
    expect(r.body.paradas.map((p) => [p.ordem, p.pedido.id])).toEqual([
      [1, c],
      [2, a],
    ]);
  });

  it('desfazer libera os pedidos sem mudar o status (RN17)', async () => {
    const a = await criarPedido();
    const { body: rota } = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [a] });
    expect((await admin(request(app).delete(`/api/rotas/${rota.id}`))).status).toBe(204);
    expect(await Parada.count()).toBe(0);
    expect((await Pedido.findByPk(a)).status).toBe('pronto');
  });
});

describe('despacho (RF13, RN06, RN16)', () => {
  it('despacha: pedidos em rota, entregador em rota e aviso à fonte', async () => {
    const a = await criarPedido({ km: 1 });
    const b = await criarPedido({ km: 2 });
    const entregadorId = await criarEntregador();
    const { body: rota } = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [a, b] });

    const r = await admin(request(app).post(`/api/rotas/${rota.id}/despachar`)).send({ entregadorId });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('despachada');
    expect(r.body.entregador.nome).toBe('João');
    expect(r.body.horarioSaida).not.toBeNull();
    expect((await Pedido.findByPk(a)).status).toBe('em_rota');
    expect((await Entregador.findByPk(entregadorId)).situacao).toBe('em_rota');
    expect(portaSaida.pedidoEmRota).toHaveBeenCalledTimes(2);
  });

  it('avisa sobre pedidos não prontos e só despacha com confirmação (RN06)', async () => {
    const pronto = await criarPedido();
    const emPreparo = await criarPedido({ codigoExibicao: '9999' }, { pronto: false });
    const entregadorId = await criarEntregador();
    const { body: rota } = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [pronto, emPreparo] });

    const aviso = await admin(request(app).post(`/api/rotas/${rota.id}/despachar`)).send({ entregadorId });
    expect(aviso.status).toBe(409);
    expect(aviso.body.detalhes.naoProntos).toEqual(['9999']);
    expect(aviso.body.detalhes.pedidos[0]).toHaveProperty('folga');

    const ok = await admin(request(app).post(`/api/rotas/${rota.id}/despachar`)).send({ entregadorId, confirmado: true });
    expect(ok.status).toBe(200);
  });

  it('não despacha com entregador indisponível', async () => {
    const a = await criarPedido();
    const entregadorId = await criarEntregador();
    await Entregador.update({ situacao: 'fora_de_servico' }, { where: { id: entregadorId } });
    const { body: rota } = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [a] });
    const r = await admin(request(app).post(`/api/rotas/${rota.id}/despachar`)).send({ entregadorId });
    expect(r.status).toBe(409);
  });

  it('rota despachada não pode mais ser editada nem desfeita', async () => {
    const a = await criarPedido();
    const entregadorId = await criarEntregador();
    const { body: rota } = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [a] });
    await admin(request(app).post(`/api/rotas/${rota.id}/despachar`)).send({ entregadorId });
    expect((await admin(request(app).delete(`/api/rotas/${rota.id}`))).status).toBe(409);
    expect((await admin(request(app).put(`/api/rotas/${rota.id}/paradas`)).send({ pedidoIds: [a] })).status).toBe(409);
  });

  it('conclusão manual deixa as paradas sem resposta como pendentes (RF14)', async () => {
    const a = await criarPedido();
    const entregadorId = await criarEntregador();
    const { body: rota } = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [a] });
    await admin(request(app).post(`/api/rotas/${rota.id}/despachar`)).send({ entregadorId });

    const r = await admin(request(app).post(`/api/rotas/${rota.id}/concluir`));
    expect(r.body.status).toBe('concluida');
    expect((await Pedido.findByPk(a)).status).toBe('pendente_confirmacao');
    expect((await Entregador.findByPk(entregadorId)).situacao).toBe('disponivel');
  });
});

describe('cancelamento com rotas (RN18)', () => {
  it('tira o pedido de uma rota em montagem e renumera as paradas', async () => {
    const a = await criarPedido({ km: 1 });
    const b = await criarPedido({ km: 2 });
    const { body: rota } = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [a, b] });
    await comChave(request(app).post(`/entrada/pedidos/${a}/cancelado`)).send({ origem: 'SIMULADOR' });

    const paradas = await Parada.findAll({ where: { rotaId: rota.id } });
    expect(paradas.map((p) => [p.pedidoId, p.ordem])).toEqual([[b, 1]]);
  });

  it('desfaz a rota em montagem que ficou vazia', async () => {
    const a = await criarPedido();
    await admin(request(app).post('/api/rotas')).send({ pedidoIds: [a] });
    await comChave(request(app).post(`/entrada/pedidos/${a}/cancelado`)).send({ origem: 'SIMULADOR' });
    expect(await Rota.count()).toBe(0);
  });

  it('numa rota despachada a parada fica cancelada e, se era a última, a rota termina', async () => {
    const a = await criarPedido();
    const entregadorId = await criarEntregador();
    const { body: rota } = await admin(request(app).post('/api/rotas')).send({ pedidoIds: [a] });
    await admin(request(app).post(`/api/rotas/${rota.id}/despachar`)).send({ entregadorId });

    await comChave(request(app).post(`/entrada/pedidos/${a}/cancelado`)).send({ origem: 'SIMULADOR' });

    expect(await Parada.count({ where: { rotaId: rota.id } })).toBe(1);
    expect((await Rota.findByPk(rota.id)).status).toBe('concluida');
    expect((await Entregador.findByPk(entregadorId)).situacao).toBe('disponivel');
  });
});
