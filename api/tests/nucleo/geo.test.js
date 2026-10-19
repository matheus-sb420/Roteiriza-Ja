const { distanciaKm, rumoGraus, pontoADistancia } = require('../../src/nucleo/geo');

const centro = { latitude: -22.9099, longitude: -47.0526 };

describe('geo', () => {
  it('distância de um ponto a ele mesmo é zero', () => {
    expect(distanciaKm(centro, centro)).toBe(0);
  });

  it('1 grau de latitude vale cerca de 111 km', () => {
    const norte = { latitude: centro.latitude + 1, longitude: centro.longitude };
    expect(distanciaKm(centro, norte)).toBeCloseTo(111.2, 0);
  });

  it.each([
    [0, 'norte'],
    [90, 'leste'],
    [180, 'sul'],
    [270, 'oeste'],
  ])('rumo de %i° (%s) volta o mesmo ângulo', (rumo) => {
    const ponto = pontoADistancia(centro, 3, rumo);
    expect(rumoGraus(centro, ponto)).toBeCloseTo(rumo, 1);
    expect(distanciaKm(centro, ponto)).toBeCloseTo(3, 5);
  });
});
