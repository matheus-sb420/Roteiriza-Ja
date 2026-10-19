// Servidor do simulador de pedidos (Apêndice A).
//
// Imita as plataformas de delivery: envia pedidos pela porta de entrada da API
// e recebe, aqui, as mensagens da porta de saída. Nunca importa código da
// pasta "api" nem acessa o banco; por isso pode ser apagado sem afetar o resto.
const http = require('node:http');
const { Simulador } = require('./simulador');
const pagina = require('./pagina');

try {
  process.loadEnvFile();
} catch {
  // sem .env: usa os valores padrão abaixo
}

const porta = Number(process.env.PORT) || 4000;
const INTERVALO_MS = 5000;

const simulador = new Simulador({
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  chaveFonte: process.env.CHAVE_FONTES || 'chave-de-desenvolvimento',
});

function lerCorpo(req) {
  return new Promise((ok) => {
    let corpo = '';
    req.on('data', (parte) => (corpo += parte));
    req.on('end', () => {
      try {
        ok(corpo ? JSON.parse(corpo) : {});
      } catch {
        ok({});
      }
    });
  });
}

function responder(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(dados === undefined ? '' : JSON.stringify(dados));
}

const rotas = {
  'GET /': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(pagina);
  },
  'GET /health': (req, res) => responder(res, 200, { status: 'ok' }),
  'GET /estado': (req, res) => responder(res, 200, simulador.estado()),

  'POST /iniciar': (req, res) => {
    simulador.rodando = true;
    responder(res, 200, { rodando: true });
  },
  'POST /parar': (req, res) => {
    simulador.rodando = false;
    responder(res, 200, { rodando: false });
  },
  'POST /parametros': async (req, res, corpo) => {
    Object.assign(simulador.parametros, corpo);
    responder(res, 200, simulador.parametros);
  },
  'POST /lote': async (req, res, corpo) => {
    const quantidade = Math.min(Math.max(Number(corpo.quantidade) || 1, 1), 50);
    responder(res, 201, await simulador.gerarLote(quantidade));
  },

  // Porta de saída da API → simulador.
  'POST /saida/em-rota': (req, res, corpo) => {
    simulador.pedidoEmRota(corpo);
    responder(res, 204);
  },
  'POST /saida/entregue': (req, res, corpo) => {
    simulador.pedidoEntregue(corpo);
    responder(res, 204);
  },
  'POST /saida/validar-codigo': (req, res, corpo) => {
    const resposta = simulador.validarCodigo(corpo);
    if (resposta === null) return responder(res, 503, { erro: 'Plataforma fora do ar' });
    return responder(res, 200, resposta);
  },
};

const servidor = http.createServer(async (req, res) => {
  const caminho = req.url.split('?')[0];
  const pronto = caminho.match(/^\/pedidos\/(\d+)\/pronto$/);
  try {
    if (req.method === 'POST' && pronto) {
      await simulador.marcarPronto(Number(pronto[1]));
      return responder(res, 204);
    }
    const rota = rotas[`${req.method} ${caminho}`];
    if (!rota) return responder(res, 404, { erro: 'Não encontrado' });
    return await rota(req, res, req.method === 'POST' ? await lerCorpo(req) : {});
  } catch (erro) {
    return responder(res, 409, { erro: erro.message });
  }
});

async function passo() {
  try {
    await simulador.passo(INTERVALO_MS);
  } catch (erro) {
    simulador.modoDemonstracao = null;
    simulador.anotar(`API indisponível: ${erro.message}`);
  }
}

servidor.listen(porta, () => {
  console.log(`Simulador rodando em http://localhost:${porta}`);
  passo();
  setInterval(passo, INTERVALO_MS);
});
