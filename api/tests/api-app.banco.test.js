jest.mock('../src/portas/saida', () => ({
  ...jest.requireActual('../src/portas/saida'),
  pedidoEmRota: jest.fn(),
  pedidoEntregue: jest.fn(),
  validarCodigo: jest.fn(),
}));

const portaSaida = require('../src/portas/saida');
const { sequelize, Pedido, Entregador, Rota, Parada } = require('../src/models');
const { app, request, limparBanco, tokenAdmin, pedidoContrato, comChave } = require('./apoio/banco');

let tokenAdm;
const admin = (req) => req.set('Authorization', `Bearer ${tokenAdm}`);

// Monta o cenário: entregador com uma rota despachada contendo os pedidos.
async function rotaDespachada(pedidos, telefone = '19988887777') {
  const { body } = await admin(request(app).post('/api/entregadores')).send({ nome: 'João', telefone });
  const ids = [];
  for (const dados of pedidos) {
    const r = await comChave(request(app).post('/entrada/pedidos')).send(pedidoContrato(dados));
    await admin(request(app).post(`/api/pedidos/${r.body.id}/pronto`)).send({ pronto: true });
    ids.push(r.body.id);
  }
  const { body: rota } = await admin(request(app).post('/api/rotas')).send({ pedidoIds: ids });
  await admin(request(app).post(`/api/rotas/${rota.id}/despachar`)).send({ entregadorId: body.entregador.id });
  const login = await request(app).post('/app/login').send({ telefone, pin: body.pin });
  return { ids, rotaId: rota.id, entregadorId: body.entregador.id, token: login.body.token };
}

const confirmar = (token, pedidoId, codigo) =>
  request(app).post(`/app/paradas/${pedidoId}/confirmar`).set('Authorization', `Bearer ${token}`).send({ codigo });

beforeEach(async () => {
  jest.clearAllMocks();
  await limparBanco();
  tokenAdm = await tokenAdmin();
});

afterAll(() => sequelize.close());

describe('login do entregador (RF22)', () => {
  it('entra com telefone e PIN e recusa PIN errado', async () => {
    const { body } = await admin(request(app).post('/api/entregadores')).send({ nome: 'João', telefone: '19988887777' });
    const ok = await request(app).post('/app/login').send({ telefone: '(19) 98888-7777', pin: body.pin });
    expect(ok.status).toBe(200);
    expect(ok.body.nome).toBe('João');

    const errado = await request(app).post('/app/login').send({ telefone: '19988887777', pin: 'xxxx' });
    expect(errado.status).toBe(401);
  });

  it('token de entregador não abre o despacho', async () => {
    const { token } = await rotaDespachada([{}]);
    const r = await request(app).get('/api/pedidos').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });
});

describe('minha rota (RF23, RN27)', () => {
  it('mostra as paradas na ordem e a parada atual', async () => {
    const { ids, token } = await rotaDespachada([{ km: 1 }, { km: 3 }]);
    const r = await request(app).get('/app/rota').set('Authorization', `Bearer ${token}`);
    expect(r.body.rota.paradas.map((p) => p.pedidoId)).toEqual(ids);
    expect(r.body.paradaAtualId).toBe(ids[0]);
    expect(r.body.rota.paradas[0]).toMatchObject({ endereco: 'Rua X, 100', tentativasRestantes: 3 });
    expect(r.body.rota.paradas[0]).not.toHaveProperty('localizador');
  });

  it('o entregador não vê nem confirma a rota de outro', async () => {
    const primeiro = await rotaDespachada([{}]);
    const segundo = await rotaDespachada([{}], '19911112222');
    const r = await request(app).get('/app/rota').set('Authorization', `Bearer ${segundo.token}`);
    expect(r.body.rota.id).toBe(segundo.rotaId);
    expect((await confirmar(segundo.token, primeiro.ids[0], '1234')).status).toBe(404);
  });

  it('sem rota despachada devolve rota nula', async () => {
    const { body } = await admin(request(app).post('/api/entregadores')).send({ nome: 'Zé', telefone: '19933334444' });
    const login = await request(app).post('/app/login').send({ telefone: '19933334444', pin: body.pin });
    const r = await request(app).get('/app/rota').set('Authorization', `Bearer ${login.body.token}`);
    expect(r.body).toEqual({ rota: null });
  });
});

describe('confirmar entrega (UC13)', () => {
  it('código válido: entregue, fonte avisada e próxima parada (RN22)', async () => {
    portaSaida.validarCodigo.mockResolvedValue('valido');
    const { ids, token } = await rotaDespachada([{ km: 1 }, { km: 3 }]);

    const r = await confirmar(token, ids[0], '1234');
    expect(r.body).toEqual({ resultado: 'entregue', rotaConcluida: false });
    expect(portaSaida.validarCodigo).toHaveBeenCalledWith(expect.objectContaining({ id: ids[0] }), '1234');
    expect(portaSaida.pedidoEntregue).toHaveBeenCalledTimes(1);

    const pedido = await Pedido.findByPk(ids[0]);
    expect(pedido.status).toBe('entregue');
    expect(pedido.horarioEntrega).not.toBeNull();

    const rota = await request(app).get('/app/rota').set('Authorization', `Bearer ${token}`);
    expect(rota.body.paradaAtualId).toBe(ids[1]);
  });

  it('pedido sem código é confirmado com o botão "Entregue" (RN23)', async () => {
    const { ids, token } = await rotaDespachada([{ exigeCodigo: false }]);
    const r = await confirmar(token, ids[0]);
    expect(r.body.resultado).toBe('entregue');
    expect(portaSaida.validarCodigo).not.toHaveBeenCalled();
  });

  it('exige o código quando a plataforma pede', async () => {
    const { ids, token } = await rotaDespachada([{}]);
    expect((await confirmar(token, ids[0], '')).status).toBe(422);
  });

  it('três códigos inválidos deixam o pedido pendente de confirmação (RN24)', async () => {
    portaSaida.validarCodigo.mockResolvedValue('invalido');
    const { ids, token } = await rotaDespachada([{ km: 1 }, { km: 3 }]);

    expect((await confirmar(token, ids[0], '1111')).body).toMatchObject({ resultado: 'codigo_invalido', tentativasRestantes: 2 });
    expect((await confirmar(token, ids[0], '2222')).body).toMatchObject({ resultado: 'codigo_invalido', tentativasRestantes: 1 });
    expect((await confirmar(token, ids[0], '3333')).body).toMatchObject({ resultado: 'pendente' });

    expect((await Pedido.findByPk(ids[0])).status).toBe('pendente_confirmacao');
    const rota = await request(app).get('/app/rota').set('Authorization', `Bearer ${token}`);
    expect(rota.body.paradaAtualId).toBe(ids[1]);
  });

  it('fonte sem resposta deixa o pedido pendente na hora (RN24)', async () => {
    portaSaida.validarCodigo.mockResolvedValue('sem_resposta');
    const { ids, token } = await rotaDespachada([{}, {}]);
    const r = await confirmar(token, ids[0], '1234');
    expect(r.body).toMatchObject({ resultado: 'pendente', motivo: 'sem_resposta' });
  });

  it('a rota é concluída sozinha quando a última parada é resolvida (RN26)', async () => {
    portaSaida.validarCodigo.mockResolvedValueOnce('valido').mockResolvedValueOnce('sem_resposta');
    const { ids, token, rotaId, entregadorId } = await rotaDespachada([{ km: 1 }, { km: 3 }]);

    expect((await confirmar(token, ids[0], '1234')).body.rotaConcluida).toBe(false);
    expect((await confirmar(token, ids[1], '1234')).body.rotaConcluida).toBe(true);

    expect((await Rota.findByPk(rotaId)).status).toBe('concluida');
    expect((await Entregador.findByPk(entregadorId)).situacao).toBe('disponivel');
    const rota = await request(app).get('/app/rota').set('Authorization', `Bearer ${token}`);
    expect(rota.body.rota).toBeNull();
  });

  it('não confirma duas vezes a mesma entrega', async () => {
    portaSaida.validarCodigo.mockResolvedValue('valido');
    const { ids, token } = await rotaDespachada([{}, {}]);
    await confirmar(token, ids[0], '1234');
    expect((await confirmar(token, ids[0], '1234')).status).toBe(409);
  });

  it('o código digitado não é gravado em lugar nenhum (RN22)', async () => {
    portaSaida.validarCodigo.mockResolvedValue('invalido');
    const { ids, token } = await rotaDespachada([{}]);
    await confirmar(token, ids[0], '987654');
    const [linhas] = await sequelize.query(
      "SELECT * FROM pedidos p JOIN paradas pa ON pa.pedido_id = p.id WHERE CAST(row_to_json(p) AS text) LIKE '%987654%' OR CAST(row_to_json(pa) AS text) LIKE '%987654%'",
    );
    expect(linhas).toHaveLength(0);
    expect(await Parada.count()).toBe(1);
  });
});
