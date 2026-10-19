const { validarNovoPedido } = require('../../src/portas/entrada/contrato');

const valido = {
  plataforma: 'iFood',
  codigoExibicao: '4821',
  origem: 'ifood',
  endereco: 'Rua X, 100, Taquaral',
  clienteNome: 'Maria',
  latitude: -22.88,
  longitude: -47.05,
  horarioPedido: '2026-10-23T23:05:00Z',
  horarioPrometido: '2026-10-23T23:55:00Z',
  tipoEntrega: 'propria',
  exigeCodigo: true,
};

describe('contrato do pedido (seção 9.2)', () => {
  it('aceita um pedido completo e normaliza a origem em maiúsculas', () => {
    const { erros, pedido } = validarNovoPedido(valido);
    expect(erros).toEqual([]);
    expect(pedido.origem).toBe('IFOOD');
    expect(pedido.horarioPedido).toBeInstanceOf(Date);
    expect(pedido.localizador).toBeNull();
  });

  it('recusa pedido sem coordenadas (RN03)', () => {
    const { erros } = validarNovoPedido({ ...valido, latitude: undefined });
    expect(erros).toContain('latitude e longitude são obrigatórias e devem ser números válidos');
  });

  it.each(['plataforma', 'codigoExibicao', 'origem', 'endereco', 'clienteNome'])(
    'recusa pedido sem %s',
    (campo) => {
      const { erros } = validarNovoPedido({ ...valido, [campo]: '  ' });
      expect(erros).toContain(`${campo} é obrigatório`);
    },
  );

  it('recusa tipo de entrega e exigeCodigo inválidos', () => {
    const { erros } = validarNovoPedido({ ...valido, tipoEntrega: 'drone', exigeCodigo: 'sim' });
    expect(erros).toHaveLength(2);
  });

  it('recusa horário prometido antes do pedido', () => {
    const { erros } = validarNovoPedido({ ...valido, horarioPrometido: '2026-10-23T23:00:00Z' });
    expect(erros).toContain('horarioPrometido deve ser depois de horarioPedido');
  });

  it('telefone e localizador são opcionais', () => {
    const { erros, pedido } = validarNovoPedido({ ...valido, clienteTelefone: '19 9999', localizador: 'LOC1' });
    expect(erros).toEqual([]);
    expect(pedido.localizador).toBe('LOC1');
  });

  it('recusa corpo vazio sem quebrar', () => {
    expect(validarNovoPedido(undefined).erros.length).toBeGreaterThan(0);
  });
});
