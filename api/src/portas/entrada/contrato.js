// Contrato do pedido (seção 9.2). Toda mensagem "novo pedido" passa por aqui
// antes de chegar ao núcleo, venha de onde vier.
const { TIPO_ENTREGA } = require('../../nucleo/constantes');

const textoPreenchido = (v) => typeof v === 'string' && v.trim() !== '';
const dataValida = (v) => v !== undefined && v !== null && v !== '' && !Number.isNaN(new Date(v).getTime());
const numeroEntre = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

// Devolve { erros: [...], pedido } com o pedido já normalizado.
function validarNovoPedido(dados) {
  const d = dados || {};
  const erros = [];

  for (const campo of ['plataforma', 'codigoExibicao', 'origem', 'endereco', 'clienteNome']) {
    if (!textoPreenchido(d[campo])) erros.push(`${campo} é obrigatório`);
  }

  // RN03: sem coordenadas o pedido não é aceito.
  if (!numeroEntre(d.latitude, -90, 90) || !numeroEntre(d.longitude, -180, 180)) {
    erros.push('latitude e longitude são obrigatórias e devem ser números válidos');
  }

  if (!dataValida(d.horarioPedido)) erros.push('horarioPedido deve ser uma data válida');
  if (!dataValida(d.horarioPrometido)) erros.push('horarioPrometido deve ser uma data válida');
  if (dataValida(d.horarioPedido) && dataValida(d.horarioPrometido)) {
    if (new Date(d.horarioPrometido) <= new Date(d.horarioPedido)) {
      erros.push('horarioPrometido deve ser depois de horarioPedido');
    }
  }

  if (!Object.values(TIPO_ENTREGA).includes(d.tipoEntrega)) {
    erros.push(`tipoEntrega deve ser ${Object.values(TIPO_ENTREGA).join(' ou ')}`);
  }
  if (typeof d.exigeCodigo !== 'boolean') erros.push('exigeCodigo deve ser true ou false');

  for (const campo of ['localizador', 'clienteTelefone']) {
    if (d[campo] !== undefined && d[campo] !== null && typeof d[campo] !== 'string') {
      erros.push(`${campo} deve ser texto`);
    }
  }

  if (erros.length > 0) return { erros, pedido: null };

  return {
    erros,
    pedido: {
      plataforma: d.plataforma.trim(),
      codigoExibicao: d.codigoExibicao.trim(),
      // RN02: a origem é guardada em maiúsculas (SIMULADOR, MANUAL, IFOOD…).
      origem: d.origem.trim().toUpperCase(),
      endereco: d.endereco.trim(),
      clienteNome: d.clienteNome.trim(),
      clienteTelefone: d.clienteTelefone || null,
      latitude: d.latitude,
      longitude: d.longitude,
      horarioPedido: new Date(d.horarioPedido),
      horarioPrometido: new Date(d.horarioPrometido),
      tipoEntrega: d.tipoEntrega,
      exigeCodigo: d.exigeCodigo,
      localizador: d.localizador || null,
    },
  };
}

module.exports = { validarNovoPedido };
