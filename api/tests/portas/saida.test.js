const http = require('node:http');
const saida = require('../../src/portas/saida');

// Uma "fonte" de mentira que registra o que recebeu.
let servidor;
const recebidas = [];
let respostaValidacao = { status: 200, corpo: { valido: true } };

beforeAll(async () => {
  servidor = http.createServer((req, res) => {
    let corpo = '';
    req.on('data', (parte) => (corpo += parte));
    req.on('end', () => {
      recebidas.push({ caminho: req.url, corpo: JSON.parse(corpo) });
      const r = req.url === '/saida/validar-codigo' ? respostaValidacao : { status: 204 };
      res.writeHead(r.status, { 'Content-Type': 'application/json' });
      res.end(r.corpo ? JSON.stringify(r.corpo) : undefined);
    });
  });
  await new Promise((ok) => servidor.listen(0, ok));
  process.env.FONTE_URL_TESTE = `http://localhost:${servidor.address().port}`;
});

afterAll(() => {
  delete process.env.FONTE_URL_TESTE;
  servidor.close();
});

beforeEach(() => {
  recebidas.length = 0;
});

const pedido = { id: 7, origem: 'TESTE', localizador: 'LOC-7', codigoExibicao: '4821' };

describe('porta de saída (seção 9.3)', () => {
  it('avisa a fonte do pedido que ele saiu e que foi entregue', async () => {
    await saida.pedidoEmRota(pedido);
    await saida.pedidoEntregue(pedido);
    expect(recebidas).toEqual([
      { caminho: '/saida/em-rota', corpo: { pedidoId: 7, localizador: 'LOC-7', codigoExibicao: '4821' } },
      { caminho: '/saida/entregue', corpo: { pedidoId: 7, localizador: 'LOC-7', codigoExibicao: '4821' } },
    ]);
  });

  it('envia localizador e código para validação e devolve a resposta da fonte', async () => {
    respostaValidacao = { status: 200, corpo: { valido: true } };
    expect(await saida.validarCodigo(pedido, '1234')).toBe('valido');
    expect(recebidas[0].corpo).toMatchObject({ localizador: 'LOC-7', codigo: '1234' });

    respostaValidacao = { status: 200, corpo: { valido: false } };
    expect(await saida.validarCodigo(pedido, '0000')).toBe('invalido');
  });

  it('fonte com erro conta como sem resposta (RN24)', async () => {
    respostaValidacao = { status: 503 };
    expect(await saida.validarCodigo(pedido, '1234')).toBe('sem_resposta');
  });

  it('origem sem endereço configurado não recebe mensagens e não valida código', async () => {
    const manual = { ...pedido, origem: 'MANUAL' };
    await saida.pedidoEmRota(manual);
    expect(recebidas).toHaveLength(0);
    expect(await saida.validarCodigo(manual, '1234')).toBe('sem_resposta');
  });

  it('usa o limite de 10 segundos do RNF07', () => {
    expect(saida.TEMPO_LIMITE_MS).toBe(10000);
  });
});
