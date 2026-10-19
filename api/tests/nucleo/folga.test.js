const { calcularFolga, classificar, tempoDoAnel, avaliarPedido } = require('../../src/nucleo/folga');
const { pontoADistancia } = require('../../src/nucleo/geo');

const config = {
  latitudePizzaria: -22.9099,
  longitudePizzaria: -47.0526,
  raioMaximoKm: 8,
  temposPorAnelMin: [10, 15, 20, 25],
  limiteCriticoMin: 10,
};
const agora = new Date('2026-10-23T23:30:00Z');
const minutos = (m) => new Date(agora.getTime() + m * 60000);

describe('folga (RN07)', () => {
  it('é o horário prometido menos agora mais o tempo do anel', () => {
    // prometido daqui a 40 min, anel 2 leva 15 min → sobram 25 min.
    expect(calcularFolga(minutos(40), 2, agora, config)).toBe(25);
  });

  it('fica negativa quando não dá mais tempo', () => {
    expect(calcularFolga(minutos(8), 1, agora, config)).toBe(-2);
  });

  it('arredonda para baixo: meio minuto de atraso já é −1', () => {
    expect(calcularFolga(minutos(9.5), 1, agora, config)).toBe(-1);
  });

  it('anel além da lista usa o tempo do último anel', () => {
    expect(tempoDoAnel(6, config)).toBe(25);
  });
});

describe('classificação (RN08)', () => {
  it.each([
    [-1, 'atrasado'],
    [0, 'critico'],
    [10, 'critico'],
    [11, 'normal'],
  ])('folga %i é %s', (folga, classe) => {
    expect(classificar(folga, 10)).toBe(classe);
  });
});

describe('avaliarPedido', () => {
  it('junta setor, folga e classificação', () => {
    const ponto = pontoADistancia(
      { latitude: config.latitudePizzaria, longitude: config.longitudePizzaria },
      5,
      90,
    );
    const avaliacao = avaliarPedido({ ...ponto, horarioPrometido: minutos(25) }, agora, config);
    expect(avaliacao).toMatchObject({ anel: 3, fatia: 'L', folga: 5, classificacao: 'critico' });
  });
});
