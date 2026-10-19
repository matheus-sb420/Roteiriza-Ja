const { sugerirRotas, nivelDePreferencia } = require('../../src/nucleo/sugestao');
const { pontoADistancia } = require('../../src/nucleo/geo');
const { FATIAS } = require('../../src/nucleo/constantes');

const config = {
  latitudePizzaria: -22.9099,
  longitudePizzaria: -47.0526,
  raioMaximoKm: 12,
  temposPorAnelMin: [10, 15, 20, 25, 30, 35],
  limiteCriticoMin: 10,
};
const centro = { latitude: config.latitudePizzaria, longitude: config.longitudePizzaria };
const agora = new Date('2026-10-23T23:30:00Z');
const RUMO_DA_FATIA = { N: 0, NE: 45, L: 90, SE: 135, S: 180, SO: 225, O: 270, NO: 315 };

let proximoId = 1;
// Cria um pedido pronto no anel/fatia pedidos e com a folga desejada.
// km dentro do anel: anel 1 → 1 km, anel 2 → 3 km, anel 3 → 5 km...
function pedido({ anel, fatia, folga, km, minutosDesdePedido = 20, ...extra }) {
  const distancia = km ?? anel * 2 - 1;
  const tempoAnel = config.temposPorAnelMin[anel - 1];
  return {
    id: proximoId++,
    ...pontoADistancia(centro, distancia, RUMO_DA_FATIA[fatia]),
    status: 'pronto',
    tipoEntrega: 'propria',
    horarioPedido: new Date(agora.getTime() - minutosDesdePedido * 60000),
    horarioPrometido: new Date(agora.getTime() + (folga + tempoAnel) * 60000),
    ...extra,
  };
}

beforeEach(() => {
  proximoId = 1;
});

describe('exemplo da seção 6.5 (N = 3)', () => {
  it('gera exatamente as duas rotas descritas', () => {
    const A = pedido({ anel: 3, fatia: 'NE', folga: -2, km: 5 });
    const B = pedido({ anel: 3, fatia: 'NE', folga: 15, km: 5.5 });
    const C = pedido({ anel: 2, fatia: 'L', folga: 8 });
    const D = pedido({ anel: 1, fatia: 'SO', folga: 5, km: 1.5 });
    const E = pedido({ anel: 1, fatia: 'N', folga: 20, km: 1 });

    const rotas = sugerirRotas([A, B, C, D, E], 3, agora, config);

    expect(rotas).toHaveLength(2);
    // Rota 1: âncora A; B no nível 1, C no nível 2; paradas C, A, B pela distância.
    expect(rotas[0].ancoraId).toBe(A.id);
    expect(rotas[0].pedidoIds).toEqual([C.id, A.id, B.id]);
    // Rota 2: âncora D; E compatível por estarem ambos no anel 1; E mais perto.
    expect(rotas[1].ancoraId).toBe(D.id);
    expect(rotas[1].pedidoIds).toEqual([E.id, D.id]);
  });
});

describe('cenários de teste da seção 12.3', () => {
  it('nenhum pedido normal vira âncora enquanto houver um atrasado fora de rotas', () => {
    const normal = pedido({ anel: 2, fatia: 'N', folga: 30 });
    const atrasado = pedido({ anel: 4, fatia: 'S', folga: -5 });
    const rotas = sugerirRotas([normal, atrasado], 3, agora, config);
    expect(rotas[0].ancoraId).toBe(atrasado.id);
    expect(rotas[0].folgaAncora).toBeLessThan(0);
  });

  it('pedidos em fatias opostas, fora do anel 1, nunca ficam na mesma rota', () => {
    // Muitos pedidos espalhados, gerados com sorteio de semente fixa.
    let semente = 42;
    const sortear = () => {
      semente = (semente * 1103515245 + 12345) % 2 ** 31;
      return semente / 2 ** 31;
    };
    const pedidos = Array.from({ length: 60 }, () => {
      const anel = 1 + Math.floor(sortear() * 6);
      return pedido({
        anel,
        fatia: FATIAS[Math.floor(sortear() * 8)],
        folga: Math.floor(sortear() * 40) - 10,
        km: (anel - 1) * 2 + 0.2 + sortear() * 1.6,
      });
    });

    const rotas = sugerirRotas(pedidos, 4, agora, config);

    for (const rota of rotas) {
      const foraDoAnel1 = rota.paradas.filter((p) => p.anel > 1);
      for (const a of foraDoAnel1) {
        for (const b of foraDoAnel1) {
          const distancia = Math.abs(FATIAS.indexOf(a.fatia) - FATIAS.indexOf(b.fatia));
          expect(distancia).not.toBe(4);
        }
      }
    }
  });

  it('nenhuma rota sugerida passa de N pedidos', () => {
    const pedidos = Array.from({ length: 10 }, (_, i) => pedido({ anel: 2, fatia: 'N', folga: i }));
    const rotas = sugerirRotas(pedidos, 3, agora, config);
    expect(rotas.map((r) => r.pedidoIds.length)).toEqual([3, 3, 3, 1]);
  });

  it('pedidos com entrega pela plataforma nunca aparecem em sugestões (RN04)', () => {
    const plataforma = pedido({ anel: 1, fatia: 'N', folga: -10, tipoEntrega: 'plataforma' });
    const propria = pedido({ anel: 1, fatia: 'N', folga: 10 });
    const rotas = sugerirRotas([plataforma, propria], 3, agora, config);
    expect(rotas.flatMap((r) => r.pedidoIds)).toEqual([propria.id]);
  });
});

describe('outras regras', () => {
  it('só considera pedidos prontos (RN05)', () => {
    const emPreparo = pedido({ anel: 1, fatia: 'N', folga: -10, status: 'em_preparo' });
    expect(sugerirRotas([emPreparo], 3, agora, config)).toEqual([]);
  });

  it('deixa de fora pedidos além do raio máximo (RN11)', () => {
    const longe = pedido({ anel: 6, fatia: 'N', folga: 0, km: 11 });
    expect(sugerirRotas([longe], 3, agora, { ...config, raioMaximoKm: 10 })).toEqual([]);
  });

  it('em caso de empate na folga, o pedido mais antigo vira âncora', () => {
    const novo = pedido({ anel: 2, fatia: 'N', folga: 5, minutosDesdePedido: 10 });
    const antigo = pedido({ anel: 4, fatia: 'S', folga: 5, minutosDesdePedido: 30 });
    expect(sugerirRotas([novo, antigo], 1, agora, config)[0].ancoraId).toBe(antigo.id);
  });

  it('prefere a mesma fatia (nível 1) mesmo que a fatia vizinha seja mais urgente', () => {
    const ancora = pedido({ anel: 3, fatia: 'L', folga: -5 });
    const vizinhaUrgente = pedido({ anel: 3, fatia: 'NE', folga: 0 });
    const mesmaFatia = pedido({ anel: 3, fatia: 'L', folga: 20 });
    const [rota] = sugerirRotas([ancora, vizinhaUrgente, mesmaFatia], 2, agora, config);
    expect(rota.pedidoIds.sort()).toEqual([ancora.id, mesmaFatia.id].sort());
  });

  it('dentro do mesmo nível, escolhe o de menor folga', () => {
    const ancora = pedido({ anel: 3, fatia: 'L', folga: -5 });
    const folgado = pedido({ anel: 3, fatia: 'L', folga: 30 });
    const apertado = pedido({ anel: 3, fatia: 'L', folga: 2 });
    const [rota] = sugerirRotas([ancora, folgado, apertado], 2, agora, config);
    expect(rota.pedidoIds.sort()).toEqual([ancora.id, apertado.id].sort());
  });

  it('não junta pedidos de anéis não vizinhos', () => {
    const anel2 = pedido({ anel: 2, fatia: 'N', folga: 0 });
    const anel4 = pedido({ anel: 4, fatia: 'N', folga: 1 });
    expect(sugerirRotas([anel2, anel4], 3, agora, config)).toHaveLength(2);
  });

  it('níveis de preferência', () => {
    const n = (anel, fatia) => ({ anel, fatia });
    expect(nivelDePreferencia(n(1, 'N'), n(1, 'S'))).toBe(1);
    expect(nivelDePreferencia(n(2, 'N'), n(3, 'N'))).toBe(1);
    expect(nivelDePreferencia(n(2, 'N'), n(2, 'NO'))).toBe(2);
    expect(nivelDePreferencia(n(2, 'N'), n(2, 'L'))).toBeNull();
    expect(nivelDePreferencia(n(2, 'N'), n(4, 'N'))).toBeNull();
  });

  it('recusa limite menor que 1 (RN13)', () => {
    expect(() => sugerirRotas([], 0, agora, config)).toThrow(RangeError);
  });

  it('sugere para 50 pedidos prontos em menos de 2 segundos (RNF05)', () => {
    const pedidos = Array.from({ length: 50 }, (_, i) =>
      pedido({ anel: 1 + (i % 6), fatia: FATIAS[i % 8], folga: (i % 30) - 5 }),
    );
    const inicio = performance.now();
    sugerirRotas(pedidos, 4, agora, config);
    expect(performance.now() - inicio).toBeLessThan(2000);
  });
});
