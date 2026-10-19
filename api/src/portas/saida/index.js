// Porta de saída (seção 9.3). Envia à fonte de cada pedido três mensagens:
// "pedido em rota", "pedido entregue" e "validar código".
//
// O endereço de cada fonte vem do .env, pela origem do pedido:
//   FONTE_URL_<ORIGEM>=http://...   (ex.: FONTE_URL_IFOOD=...)
// Assim o núcleo nunca precisa saber quem está do outro lado (RNF11).
// Origem sem URL configurada (ex.: MANUAL) simplesmente não recebe mensagens.

// RNF07: acima de 10 s a fonte é considerada sem resposta.
const TEMPO_LIMITE_MS = 10 * 1000;

const RESULTADO_VALIDACAO = Object.freeze({
  VALIDO: 'valido',
  INVALIDO: 'invalido',
  SEM_RESPOSTA: 'sem_resposta',
});

function urlDaFonte(origem) {
  return process.env[`FONTE_URL_${origem}`] || null;
}

async function enviar(pedido, caminho, corpo) {
  const url = urlDaFonte(pedido.origem);
  if (!url) return null;
  const resposta = await fetch(`${url}${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  if (!resposta.ok) throw new Error(`Fonte respondeu ${resposta.status}`);
  return resposta;
}

const identificacao = (pedido) => ({
  pedidoId: pedido.id,
  localizador: pedido.localizador,
  codigoExibicao: pedido.codigoExibicao,
});

// Avisos de status não podem travar o despacho: uma falha só fica no log.
async function avisar(pedido, caminho) {
  try {
    await enviar(pedido, caminho, identificacao(pedido));
  } catch (erro) {
    console.error(`Porta de saída: falha ao avisar ${caminho} do pedido ${pedido.id}: ${erro.message}`);
  }
}

const pedidoEmRota = (pedido) => avisar(pedido, '/saida/em-rota');
const pedidoEntregue = (pedido) => avisar(pedido, '/saida/entregue');

// Pergunta e resposta: leva o localizador e o código digitado; a fonte diz se
// é válido. O código não é guardado em lugar nenhum (RN22).
async function validarCodigo(pedido, codigo) {
  try {
    const resposta = await enviar(pedido, '/saida/validar-codigo', { ...identificacao(pedido), codigo });
    if (!resposta) return RESULTADO_VALIDACAO.SEM_RESPOSTA;
    const { valido } = await resposta.json();
    return valido === true ? RESULTADO_VALIDACAO.VALIDO : RESULTADO_VALIDACAO.INVALIDO;
  } catch {
    return RESULTADO_VALIDACAO.SEM_RESPOSTA;
  }
}

module.exports = { RESULTADO_VALIDACAO, TEMPO_LIMITE_MS, pedidoEmRota, pedidoEntregue, validarCodigo };
