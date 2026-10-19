// Algoritmo de sugestão de rotas (seção 6).
//
// A urgência decide quem entra na rota; a distância decide a ordem das paradas.
// Cada rota começa pelo pedido mais urgente (a âncora) e é completada com
// pedidos próximos dela no mapa, até o limite N.
const { STATUS_PEDIDO, TIPO_ENTREGA } = require('./constantes');
const { avaliarPedido } = require('./folga');
const { aneisVizinhos, fatiasVizinhas } = require('./setor');

// Ordem de urgência (passo 2): menor folga primeiro; empate, o pedido mais
// antigo; persistindo o empate, o menor ID, para o resultado ser sempre o mesmo.
function compararUrgencia(a, b) {
  return (
    a.folga - b.folga ||
    new Date(a.pedido.horarioPedido) - new Date(b.pedido.horarioPedido) ||
    a.pedido.id - b.pedido.id
  );
}

// Nível de preferência de um candidato em relação à âncora (passo 4):
//   1 = mesma fatia e anel igual ou vizinho (ou ambos no anel 1, RN12)
//   2 = fatia vizinha e anel igual ou vizinho
//   null = incompatível
// A comparação é sempre com a âncora, não com os outros pedidos da rota.
function nivelDePreferencia(ancora, candidato) {
  if (ancora.anel === 1 && candidato.anel === 1) return 1;
  if (!aneisVizinhos(ancora.anel, candidato.anel)) return null;
  if (candidato.fatia === ancora.fatia) return 1;
  if (fatiasVizinhas(candidato.fatia, ancora.fatia)) return 2;
  return null;
}

// Entrada só com pedidos prontos, de entrega própria e dentro da área
// (RN04, RN05, RN11). Quem chama já retira os pedidos que estão em rotas.
function filtrarElegiveis(pedidos, agora, config) {
  return pedidos
    .filter((p) => p.status === STATUS_PEDIDO.PRONTO && p.tipoEntrega === TIPO_ENTREGA.PROPRIA)
    .map((pedido) => ({ pedido, ...avaliarPedido(pedido, agora, config) }))
    .filter((avaliado) => !avaliado.foraDaArea);
}

// pedidos: lista com id, latitude, longitude, status, tipoEntrega,
//          horarioPedido e horarioPrometido.
// limite:  N, número máximo de pedidos por rota (RN13).
// Devolve as rotas sugeridas, da âncora mais urgente para a menos urgente.
function sugerirRotas(pedidos, limite, agora, config) {
  if (!Number.isInteger(limite) || limite < 1) {
    throw new RangeError('O limite de pedidos por rota deve ser um inteiro maior ou igual a 1');
  }

  // Passos 1 e 2: avaliar e ordenar pela urgência.
  const livres = filtrarElegiveis(pedidos, agora, config).sort(compararUrgencia);
  const rotas = [];

  while (livres.length > 0) {
    // Passo 3: o mais urgente vira âncora.
    const ancora = livres.shift();
    const escolhidos = [ancora];

    // Passos 4 e 5: primeiro todos os candidatos do nível 1, depois os do
    // nível 2. Como "livres" já está em ordem de urgência, percorrer na ordem
    // escolhe os de menor folga dentro de cada nível.
    for (const nivel of [1, 2]) {
      for (const candidato of livres) {
        if (escolhidos.length >= limite) break;
        if (nivelDePreferencia(ancora, candidato) === nivel) escolhidos.push(candidato);
      }
    }

    // Passo 7: tirar os usados da lista.
    for (const usado of escolhidos.slice(1)) livres.splice(livres.indexOf(usado), 1);

    // Passo 6: paradas da mais próxima para a mais distante da pizzaria (RN14).
    const paradas = [...escolhidos].sort((a, b) => a.distanciaKm - b.distanciaKm);

    rotas.push({
      ancoraId: ancora.pedido.id,
      folgaAncora: ancora.folga,
      pedidoIds: paradas.map((p) => p.pedido.id),
      paradas: paradas.map((p) => ({
        pedidoId: p.pedido.id,
        anel: p.anel,
        fatia: p.fatia,
        folga: p.folga,
        classificacao: p.classificacao,
        distanciaKm: p.distanciaKm,
      })),
    });
  }

  return rotas;
}

module.exports = { sugerirRotas, nivelDePreferencia, compararUrgencia };
