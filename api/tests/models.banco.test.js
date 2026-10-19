const {
  sequelize,
  Configuracao,
  Entregador,
  Pedido,
  Rota,
  Parada,
} = require('../src/models');
const { STATUS_PEDIDO, STATUS_ROTA, ORIGEM_ROTA, TIPO_ENTREGA } = require('../src/nucleo/constantes');

function dadosPedido(extra = {}) {
  return {
    plataforma: 'iFood',
    codigoExibicao: '4821',
    origem: 'MANUAL',
    clienteNome: 'Maria',
    clienteTelefone: '(19) 99999-0000',
    endereco: 'Rua X, 100, Taquaral',
    latitude: -22.88,
    longitude: -47.05,
    horarioPedido: new Date('2026-10-23T23:05:00Z'),
    horarioPrometido: new Date('2026-10-23T23:55:00Z'),
    tipoEntrega: TIPO_ENTREGA.PROPRIA,
    exigeCodigo: true,
    ...extra,
  };
}

beforeEach(async () => {
  await sequelize.query(
    'TRUNCATE paradas, rotas, pedidos, entregadores, configuracoes RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await sequelize.close();
});

describe('Pedido', () => {
  it('nasce "em preparo" e com ID interno próprio, mesmo com código repetido (RN01)', async () => {
    const a = await Pedido.create(dadosPedido());
    const b = await Pedido.create(dadosPedido());
    expect(a.status).toBe(STATUS_PEDIDO.EM_PREPARO);
    expect(a.id).not.toBe(b.id);
    expect(a.codigoExibicao).toBe(b.codigoExibicao);
  });

  it('não é aceito sem coordenadas (RN03)', async () => {
    await expect(Pedido.create(dadosPedido({ latitude: null }))).rejects.toThrow();
  });

  it('rejeita status fora da lista, no model e no banco', async () => {
    await expect(Pedido.create(dadosPedido({ status: 'voando' }))).rejects.toThrow();

    const pedido = await Pedido.create(dadosPedido());
    await expect(
      sequelize.query("UPDATE pedidos SET status = 'voando' WHERE id = :id", {
        replacements: { id: pedido.id },
      }),
    ).rejects.toThrow(/pedidos_status_check/);
  });

  it('não tem coluna para o código do cliente (RN22)', () => {
    const colunas = Object.keys(Pedido.getAttributes());
    expect(colunas.some((c) => /codigoCliente|codigoEntrega/i.test(c))).toBe(false);
  });
});

describe('Entregador', () => {
  it('não devolve o hash do PIN nas consultas comuns', async () => {
    await Entregador.create({ nome: 'João', telefone: '19988887777', pinHash: 'hash-qualquer' });
    const comum = await Entregador.findOne();
    const comPin = await Entregador.scope('comPin').findOne();
    expect(comum.pinHash).toBeUndefined();
    expect(comPin.pinHash).toBe('hash-qualquer');
  });

  it('não permite dois entregadores com o mesmo telefone', async () => {
    await Entregador.create({ nome: 'João', telefone: '19988887777', pinHash: 'x' });
    await expect(
      Entregador.create({ nome: 'Outro', telefone: '19988887777', pinHash: 'y' }),
    ).rejects.toThrow();
  });
});

describe('Rota e paradas', () => {
  it('guarda os pedidos na ordem das paradas', async () => {
    const entregador = await Entregador.create({ nome: 'João', telefone: '1', pinHash: 'x' });
    const p1 = await Pedido.create(dadosPedido());
    const p2 = await Pedido.create(dadosPedido({ codigoExibicao: '1234' }));
    const rota = await Rota.create({ origem: ORIGEM_ROTA.SUGERIDA, entregadorId: entregador.id });
    await Parada.bulkCreate([
      { rotaId: rota.id, pedidoId: p2.id, ordem: 1 },
      { rotaId: rota.id, pedidoId: p1.id, ordem: 2 },
    ]);

    const carregada = await Rota.findByPk(rota.id, {
      include: [
        { model: Entregador, as: 'entregador' },
        { model: Parada, as: 'paradas', include: [{ model: Pedido, as: 'pedido' }] },
      ],
      order: [[{ model: Parada, as: 'paradas' }, 'ordem', 'ASC']],
    });

    expect(carregada.status).toBe(STATUS_ROTA.EM_MONTAGEM);
    expect(carregada.entregador.nome).toBe('João');
    expect(carregada.paradas.map((p) => p.pedido.codigoExibicao)).toEqual(['1234', '4821']);
  });

  it('não repete o mesmo pedido na mesma rota', async () => {
    const pedido = await Pedido.create(dadosPedido());
    const rota = await Rota.create({ origem: ORIGEM_ROTA.MANUAL });
    await Parada.create({ rotaId: rota.id, pedidoId: pedido.id, ordem: 1 });
    await expect(Parada.create({ rotaId: rota.id, pedidoId: pedido.id, ordem: 2 })).rejects.toThrow();
  });

  it('desfazer a rota apaga as paradas e mantém os pedidos com o mesmo status (RN17)', async () => {
    const pedido = await Pedido.create(dadosPedido({ status: STATUS_PEDIDO.PRONTO }));
    const rota = await Rota.create({ origem: ORIGEM_ROTA.MANUAL });
    await Parada.create({ rotaId: rota.id, pedidoId: pedido.id, ordem: 1 });

    await rota.destroy();

    expect(await Parada.count()).toBe(0);
    const recarregado = await Pedido.findByPk(pedido.id);
    expect(recarregado.status).toBe(STATUS_PEDIDO.PRONTO);
  });
});

describe('Configuracao', () => {
  const base = {
    enderecoPizzaria: 'Pizzaria',
    latitudePizzaria: -22.9,
    longitudePizzaria: -47.05,
  };

  it('usa os valores padrão dos requisitos', async () => {
    const config = await Configuracao.create(base);
    expect(config.limiteCriticoMin).toBe(10);
    expect(config.raioMaximoKm).toBe(8);
    expect(config.modoDemonstracao).toBe(true);
  });

  it('não aceita raio maior que 12 km (RN09)', async () => {
    await expect(Configuracao.create({ ...base, raioMaximoKm: 14 })).rejects.toThrow();
  });

  it('exige um tempo para cada anel dentro do raio', async () => {
    await expect(
      Configuracao.create({ ...base, raioMaximoKm: 12, temposPorAnelMin: [10, 15] }),
    ).rejects.toThrow(/um tempo para cada anel/);
  });
});
