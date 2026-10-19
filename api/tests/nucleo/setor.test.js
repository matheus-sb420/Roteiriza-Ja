const {
  calcularAnel,
  calcularFatia,
  calcularSetor,
  aneisVizinhos,
  fatiasVizinhas,
} = require('../../src/nucleo/setor');
const { pontoADistancia } = require('../../src/nucleo/geo');

const config = { latitudePizzaria: -22.9099, longitudePizzaria: -47.0526, raioMaximoKm: 8 };
const centro = { latitude: config.latitudePizzaria, longitude: config.longitudePizzaria };

describe('anéis (RN09)', () => {
  it.each([
    [0, 1],
    [1.99, 1],
    [2, 2],
    [3.5, 2],
    [4.1, 3],
    [11.9, 6],
  ])('%f km fica no anel %i', (km, anel) => {
    expect(calcularAnel(km)).toBe(anel);
  });
});

describe('fatias (RN10)', () => {
  it.each([
    [0, 'N'],
    [22.4, 'N'],
    [337.5, 'N'],
    [359, 'N'],
    [22.5, 'NE'],
    [45, 'NE'],
    [90, 'L'],
    [135, 'SE'],
    [180, 'S'],
    [225, 'SO'],
    [270, 'O'],
    [315, 'NO'],
    [337.4, 'NO'],
  ])('rumo %f° fica na fatia %s', (rumo, fatia) => {
    expect(calcularFatia(rumo)).toBe(fatia);
  });

  it('vizinhança é circular: N é vizinha de NO e NE, mas não de S', () => {
    expect(fatiasVizinhas('N', 'NO')).toBe(true);
    expect(fatiasVizinhas('N', 'NE')).toBe(true);
    expect(fatiasVizinhas('N', 'L')).toBe(false);
    expect(fatiasVizinhas('N', 'N')).toBe(false);
  });

  it('anel vizinho tem diferença de no máximo 1', () => {
    expect(aneisVizinhos(2, 3)).toBe(true);
    expect(aneisVizinhos(2, 2)).toBe(true);
    expect(aneisVizinhos(1, 3)).toBe(false);
  });
});

describe('calcularSetor', () => {
  it('um pedido a 3 km a nordeste fica no anel 2, fatia NE', () => {
    const setor = calcularSetor(pontoADistancia(centro, 3, 45), config);
    expect(setor).toMatchObject({ anel: 2, fatia: 'NE', foraDaArea: false });
    expect(setor.distanciaKm).toBeCloseTo(3, 5);
  });

  it('além do raio máximo fica "fora da área" (RN11)', () => {
    expect(calcularSetor(pontoADistancia(centro, 9, 180), config).foraDaArea).toBe(true);
  });
});
