const { sequelize, Pedido } = require('../src/models');
const { apagarDadosVencidos } = require('../src/servicos/lgpd');
const { app, request, limparBanco, tokenAdmin, pedidoContrato, comChave } = require('./apoio/banco');

let token;
const admin = (req) => req.set('Authorization', `Bearer ${token}`);

beforeEach(async () => {
  await limparBanco();
  token = await tokenAdmin();
});

afterAll(() => sequelize.close());

describe('login do administrador (RF01)', () => {
  it('recusa senha errada', async () => {
    const r = await request(app).post('/auth/login').send({ usuario: 'admin', senha: 'x' });
    expect(r.status).toBe(401);
  });

  it('rotas do despacho exigem login', async () => {
    expect((await request(app).get('/api/pedidos')).status).toBe(401);
  });
});

describe('porta de entrada (RF02)', () => {
  it('exige a chave da fonte', async () => {
    const r = await request(app).post('/entrada/pedidos').send(pedidoContrato());
    expect(r.status).toBe(401);
  });

  it('recebe um pedido válido e devolve o ID interno com o setor', async () => {
    const r = await comChave(request(app).post('/entrada/pedidos')).send(pedidoContrato({ km: 3, rumo: 45 }));
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ anel: 2, fatia: 'NE', foraDaArea: false });
    const gravado = await Pedido.findByPk(r.body.id);
    expect(gravado.status).toBe('em_preparo');
    expect(gravado.origem).toBe('SIMULADOR');
  });

  it('recusa pedido fora do contrato com a lista de erros', async () => {
    const r = await comChave(request(app).post('/entrada/pedidos')).send(pedidoContrato({ latitude: null }));
    expect(r.status).toBe(422);
    expect(r.body.detalhes.length).toBeGreaterThan(0);
  });

  it('"pedido pronto" e "pedido cancelado" só valem para a mesma origem', async () => {
    const { body } = await comChave(request(app).post('/entrada/pedidos')).send(pedidoContrato());
    const outra = await comChave(request(app).post(`/entrada/pedidos/${body.id}/pronto`)).send({ origem: 'IFOOD' });
    expect(outra.status).toBe(403);

    const pronto = await comChave(request(app).post(`/entrada/pedidos/${body.id}/pronto`)).send({ origem: 'SIMULADOR' });
    expect(pronto.status).toBe(204);
    expect((await Pedido.findByPk(body.id)).status).toBe('pronto');

    const cancelado = await comChave(request(app).post(`/entrada/pedidos/${body.id}/cancelado`)).send({ origem: 'simulador' });
    expect(cancelado.status).toBe(204);
    expect((await Pedido.findByPk(body.id)).status).toBe('cancelado');
  });

  it('informa às fontes a configuração pública', async () => {
    const r = await comChave(request(app).get('/entrada/configuracao'));
    expect(r.body).toEqual({
      latitudePizzaria: -22.9099,
      longitudePizzaria: -47.0526,
      raioMaximoKm: 8,
      modoDemonstracao: true,
    });
  });
});

describe('pedidos no despacho', () => {
  it('cadastro manual usa a origem MANUAL (RF03)', async () => {
    const r = await admin(request(app).post('/api/pedidos')).send(pedidoContrato({ origem: 'IFOOD' }));
    expect(r.status).toBe(201);
    expect((await Pedido.findByPk(r.body.id)).origem).toBe('MANUAL');
  });

  it('lista os pedidos ativos ordenados pela folga, com classificação (RF05)', async () => {
    const criar = (dados) => comChave(request(app).post('/entrada/pedidos')).send(pedidoContrato(dados));
    await criar({ codigoExibicao: 'NORMAL', minutos: 60, km: 1 });
    await criar({ codigoExibicao: 'ATRASADO', minutos: 5, km: 1 });
    await criar({ codigoExibicao: 'CRITICO', minutos: 18, km: 1 });
    const cancelado = await criar({ codigoExibicao: 'CANCELADO' });
    await comChave(request(app).post(`/entrada/pedidos/${cancelado.body.id}/cancelado`)).send({ origem: 'SIMULADOR' });

    const r = await admin(request(app).get('/api/pedidos'));
    expect(r.body.map((p) => p.codigoExibicao)).toEqual(['ATRASADO', 'CRITICO', 'NORMAL']);
    expect(r.body.map((p) => p.classificacao)).toEqual(['atrasado', 'critico', 'normal']);
    expect(r.body[0]).toHaveProperty('folga');
    expect(r.body[0]).not.toHaveProperty('localizador');
  });

  it('marca e desmarca como pronto (RF07)', async () => {
    const { body } = await comChave(request(app).post('/entrada/pedidos')).send(pedidoContrato());
    await admin(request(app).post(`/api/pedidos/${body.id}/pronto`)).send({ pronto: true });
    let pedido = await Pedido.findByPk(body.id);
    expect(pedido.status).toBe('pronto');
    expect(pedido.horarioPronto).not.toBeNull();

    await admin(request(app).post(`/api/pedidos/${body.id}/pronto`)).send({ pronto: false });
    pedido = await Pedido.findByPk(body.id);
    expect(pedido.status).toBe('em_preparo');
    expect(pedido.horarioPronto).toBeNull();
  });
});

describe('configuração (RF16)', () => {
  it('atualiza e recalcula o setor dos pedidos abertos quando a pizzaria muda', async () => {
    const { body } = await comChave(request(app).post('/entrada/pedidos')).send(pedidoContrato({ km: 3, rumo: 45 }));
    const pedido = await Pedido.findByPk(body.id);

    const r = await admin(request(app).put('/api/configuracao')).send({
      latitudePizzaria: pedido.latitude,
      longitudePizzaria: pedido.longitude,
      limiteCriticoMin: 5,
    });
    expect(r.status).toBe(200);
    expect(r.body.limiteCriticoMin).toBe(5);
    expect((await Pedido.findByPk(body.id)).anel).toBe(1);
  });

  it('recusa raio acima de 12 km', async () => {
    const r = await admin(request(app).put('/api/configuracao')).send({ raioMaximoKm: 20 });
    expect(r.status).toBe(422);
  });
});

describe('entregadores (RF15, RN21)', () => {
  it('cadastra com PIN de 4 dígitos, sem devolver o hash', async () => {
    const r = await admin(request(app).post('/api/entregadores')).send({ nome: 'João', telefone: '(19) 98888-7777' });
    expect(r.status).toBe(201);
    expect(r.body.pin).toMatch(/^\d{4}$/);
    expect(r.body.entregador.telefone).toBe('19988887777');
    expect(r.body.entregador).not.toHaveProperty('pinHash');

    const lista = await admin(request(app).get('/api/entregadores'));
    expect(lista.body).toHaveLength(1);
    expect(lista.body[0]).not.toHaveProperty('pinHash');
  });

  it('troca o PIN e altera a situação', async () => {
    const { body } = await admin(request(app).post('/api/entregadores')).send({ nome: 'João', telefone: '19988887777' });
    const pin = await admin(request(app).post(`/api/entregadores/${body.entregador.id}/pin`));
    expect(pin.body.pin).toMatch(/^\d{4}$/);

    const fora = await admin(request(app).patch(`/api/entregadores/${body.entregador.id}`)).send({ situacao: 'fora_de_servico' });
    expect(fora.body.situacao).toBe('fora_de_servico');

    const invalida = await admin(request(app).patch(`/api/entregadores/${body.entregador.id}`)).send({ situacao: 'em_rota' });
    expect(invalida.status).toBe(422);
  });

  it('não aceita telefone repetido', async () => {
    await admin(request(app).post('/api/entregadores')).send({ nome: 'João', telefone: '19988887777' });
    const r = await admin(request(app).post('/api/entregadores')).send({ nome: 'Zé', telefone: '19988887777' });
    expect(r.status).toBe(409);
  });
});

describe('LGPD (RN20)', () => {
  it('apaga os dados do cliente de pedidos encerrados após o prazo', async () => {
    const { body } = await comChave(request(app).post('/entrada/pedidos')).send(pedidoContrato());
    await Pedido.update({ status: 'entregue' }, { where: { id: body.id } });
    const daqui31Dias = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);

    expect(await apagarDadosVencidos(new Date())).toBe(0);
    expect(await apagarDadosVencidos(daqui31Dias)).toBe(1);

    const pedido = await Pedido.findByPk(body.id);
    expect(pedido.clienteNome).toBeNull();
    expect(pedido.endereco).toBeNull();
    expect(pedido.dadosClienteApagadosEm).not.toBeNull();
  });
});
