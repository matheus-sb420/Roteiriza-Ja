// Folga e classificação de urgência (seção 4.6, RN07 e RN08).
const { calcularSetor } = require('./setor');

const CLASSIFICACAO = Object.freeze({
  ATRASADO: 'atrasado',
  CRITICO: 'critico',
  NORMAL: 'normal',
});

const MS_POR_MINUTO = 60 * 1000;

// Tempo médio de trajeto do anel. Para pedidos fora da área (anel além da
// lista configurada) usa o tempo do último anel.
function tempoDoAnel(anel, config) {
  const tempos = config.temposPorAnelMin;
  return tempos[Math.min(anel, tempos.length) - 1];
}

// folga = horário prometido − (agora + tempo médio do anel), em minutos inteiros.
// Arredonda para baixo: 30 segundos de atraso já contam como −1 min.
function calcularFolga(horarioPrometido, anel, agora, config) {
  const minutosAtePrometido = (new Date(horarioPrometido) - new Date(agora)) / MS_POR_MINUTO;
  return Math.floor(minutosAtePrometido - tempoDoAnel(anel, config));
}

// Atrasado se negativa; crítico de 0 até o limite; normal acima disso.
function classificar(folga, limiteCriticoMin) {
  if (folga < 0) return CLASSIFICACAO.ATRASADO;
  if (folga <= limiteCriticoMin) return CLASSIFICACAO.CRITICO;
  return CLASSIFICACAO.NORMAL;
}

// Junta setor, folga e classificação de um pedido num só objeto.
function avaliarPedido(pedido, agora, config) {
  const setor = calcularSetor(pedido, config);
  const folga = calcularFolga(pedido.horarioPrometido, setor.anel, agora, config);
  return { ...setor, folga, classificacao: classificar(folga, config.limiteCriticoMin) };
}

module.exports = { CLASSIFICACAO, tempoDoAnel, calcularFolga, classificar, avaliarPedido };
